import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { X, Save, Trash2, AlertTriangle } from 'lucide-react';
import ChefAvatar from '@/components/ui/ChefAvatar';
import GoldStars from '@/components/ui/GoldStars';
import { formatCurrency, useTeamMembers, useCommissionLines } from '@/hooks/useAppData';
import { CUISINES, SERVICE_AREAS, EXPERIENCE_TYPES } from '@/lib/constants';
import { toast } from '@/components/ui/use-toast';
import { computePnL } from '@/lib/pnlUtils';
import { computeCommission, normalizeFacilitators } from '@/lib/commissionUtils';
import { resolveClientByName } from '@/lib/resolveClient';
import EventPnL from './EventPnL';
import EventAttribution from './EventAttribution';
import EventSummary from './EventSummary';
import ManageTeamModal from './ManageTeamModal';
import EventPayments from './EventPayments';

function ChipPicker({ label, selected, options, onChange }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => {
          const active = selected.includes(opt);
          return (
            <button key={opt} type="button" onClick={() => onChange(active ? selected.filter(s => s !== opt) : [...selected, opt])}
              className={`text-xs px-2 py-1 rounded-full border transition-all ${active ? 'bg-navy text-white border-navy' : 'bg-background text-muted-foreground border-border hover:border-navy hover:text-foreground'}`}>
              {active && <X size={10} className="inline mr-1" />}
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function EventDetailPanel({ event, chefs, eventChefs, open, onClose }) {
  const queryClient = useQueryClient();
  const { data: teamMembers } = useTeamMembers();
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editedFields, setEditedFields] = useState(new Set());
  const [showTeamModal, setShowTeamModal] = useState(false);

  useEffect(() => {
    if (event) {
      setDraft({ ...event });
      setDirty(false);
      setEditedFields(new Set());
    }
  }, [event?.id]);

  const update = (field, value) => {
    setDraft(prev => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const markEdited  = (field) => setEditedFields(prev => new Set([...prev, field]));
  const clearEdited = (field) => setEditedFields(prev => { const s = new Set(prev); s.delete(field); return s; });

  const assignments = event ? eventChefs.filter(ec => ec.event_id === event.id).map(ec => ({
    ...ec,
    chef: chefs.find(c => c.id === ec.chef_id),
  })) : [];

  const chefPay = useMemo(
    () => assignments.reduce((s, a) => s + (a.fee || 0) + (a.travel_fee_applied || 0), 0),
    [assignments]
  );

  const { data: commissionLinesData } = useCommissionLines();
  const commissionOwed = useMemo(() => {
    if (!event || !commissionLinesData) return 0;
    return commissionLinesData
      .filter(cl => cl.event_id === event.id)
      .reduce((s, cl) => s + (cl.amount || 0), 0);
  }, [event?.id, commissionLinesData]);

  // Compute pnl with commissionOwed from saved lines (for Net Profit display)
  const pnl  = useMemo(() => draft ? computePnL(draft, chefPay, commissionOwed) : null, [draft, chefPay, commissionOwed]);
  // Compute commission from current draft (includes unsaved facilitator changes)
  const facilitators = useMemo(() => normalizeFacilitators(draft || {}), [draft?.facilitators, draft?.facilitator_id]);
  const comm = useMemo(
    () => (draft && pnl) ? computeCommission({ ...draft, facilitators }, pnl.commissionableProfit, teamMembers) : null,
    [draft, facilitators, pnl, teamMembers]
  );

  // ── Persist commission lines ───────────────────────────────────────────────
  const persistCommissionLines = async (eventId, lines, lineStatus, eventLabel) => {
    const existing = await base44.entities.CommissionLine.filter({ event_id: eventId });
    for (const line of existing) {
      await base44.entities.CommissionLine.delete(line.id);
    }
    for (const line of lines) {
      if (line.amount === 0 && lineStatus === 'Pending') continue;
      await base44.entities.CommissionLine.create({
        event_id: eventId,
        event_label: eventLabel,
        team_member_id: line.team_member_id,
        team_member_name: line.team_member_name,
        role: line.role,
        rate_pct: line.rate_pct,
        split_pct: line.split_pct ?? 100,
        basis: pnl?.commissionableProfit || 0,
        amount: line.amount,
        status: lineStatus,
      });
    }
  };

  const save = async () => {
    if (!dirty || !draft) return;
    if (!draft.perfect_venue_id || !draft.client_name || !draft.date) {
      toast({ title: 'Perfect Venue ID, client name, and date are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
    const computed_client_revenue = pnl ? pnl.clientTotal : (Number(draft.client_revenue) || 0);

    let clientId = draft.client_id || null;
    const nameChanged = String(draft.client_name || '').trim() !== String(event.client_name || '').trim();
    if (!clientId || nameChanged) {
      const client = await resolveClientByName(draft.client_name, { eventType: draft.event_type });
      clientId = client?.id || null;
    }

    await base44.entities.Event.update(event.id, {
      ...draft,
      client_id:             clientId || undefined,
      client_name:           String(draft.client_name || '').trim(),
      guest_count:           Number(draft.guest_count) || 0,
      experience_fee:        Number(draft.experience_fee) || 0,
      food_revenue:          Number(draft.food_revenue) || 0,
      beverage_revenue:      Number(draft.beverage_revenue) || 0,
      staffing_revenue:      Number(draft.staffing_revenue) || 0,
      rental_revenue:        Number(draft.rental_revenue) || 0,
      travel_revenue:        Number(draft.travel_revenue) || 0,
      florals_revenue:       Number(draft.florals_revenue) || 0,
      printed_menus_revenue: Number(draft.printed_menus_revenue) || 0,
      other_revenue:         Number(draft.other_revenue) || 0,
      discount:              Number(draft.discount) || 0,
      admin_fee:             Number(draft.admin_fee) || 0,
      gratuity:              Number(draft.gratuity) || 0,
      cc_processing:         Number(draft.cc_processing) || 0,
      sales_tax:             Number(draft.sales_tax) || 0,
      chef_food_budget:      Number(draft.chef_food_budget) || 0,
      staffing_cost:         Number(draft.staffing_cost) || 0,
      beverage_cost:         Number(draft.beverage_cost) || 0,
      rental_cost:           Number(draft.rental_cost) || 0,
      other_travel_cost:     Number(draft.other_travel_cost) || 0,
      florals_cost:          Number(draft.florals_cost) || 0,
      printed_menus_cost:    Number(draft.printed_menus_cost) || 0,
      delivery_cost:         Number(draft.delivery_cost) || 0,
      other_expenses:        Number(draft.other_expenses) || 0,
      source_split_pct:      Number(draft.source_split_pct) || 40,
      facilitators:          facilitators,
      client_revenue:        computed_client_revenue,
    });

    // Persist commission lines when Pending (Finalized lines are written separately)
    if (draft.commission_status !== 'Finalized' && comm && !comm.incomplete && comm.lines.length > 0) {
      const label = `${draft.client_name} – ${draft.date}`;
      await persistCommissionLines(event.id, comm.lines, 'Pending', label);
      await base44.entities.ActivityLog.create({
        actor: 'Team', action: 'Updated', entity_type: 'Event',
        entity_label: draft.client_name,
        summary: `Updated commissions for ${draft.client_name}`,
      });
    }

    await base44.entities.ActivityLog.create({
      actor: 'Team', action: 'Updated', entity_type: 'Event',
      entity_label: draft.client_name,
      summary: `Updated event for ${draft.client_name} on ${draft.date}`,
    });
    queryClient.invalidateQueries({ queryKey: ['events'] });
    queryClient.invalidateQueries({ queryKey: ['clients'] });
    queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    queryClient.invalidateQueries({ queryKey: ['commissionLines'] });
    toast({ title: `Event for ${draft.client_name} updated` });
    setDirty(false);
    } catch (err) {
      toast({
        title: 'Failed to update event',
        description: err.message || 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!comm || comm.incomplete || comm.splitInvalid) {
      toast({
        title: comm?.splitInvalid
          ? 'Facilitator split %s must total 100% before finalizing'
          : 'Set lead type and specialists before finalizing',
        variant: 'destructive',
      });
      return;
    }
    const label = `${draft.client_name} – ${draft.date}`;
    await persistCommissionLines(event.id, comm.lines, 'Finalized', label);
    await base44.entities.Event.update(event.id, { commission_status: 'Finalized' });
    await base44.entities.ActivityLog.create({
      actor: 'Team', action: 'Updated', entity_type: 'Event',
      entity_label: draft.client_name,
      summary: `Finalized commissions for ${draft.client_name}`,
    });
    setDraft(prev => ({ ...prev, commission_status: 'Finalized' }));
    queryClient.invalidateQueries({ queryKey: ['events', 'commissionLines', 'activityLogs'] });
    toast({ title: 'Commissions finalized and locked' });
  };

  const handleReopen = async () => {
    await base44.entities.Event.update(event.id, { commission_status: 'Pending' });
    setDraft(prev => ({ ...prev, commission_status: 'Pending' }));
    setDirty(true);
    queryClient.invalidateQueries({ queryKey: ['events'] });
    toast({ title: 'Commissions reopened' });
  };

  const handleClose = () => {
    if (dirty) {
      if (window.confirm('Save changes before closing?')) {
        save().then(onClose);
      } else {
        setDirty(false);
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleDelete = async () => {
    await base44.entities.Event.delete(event.id);
    await base44.entities.ActivityLog.create({
      actor: 'Team', action: 'Deleted', entity_type: 'Event',
      entity_label: event.client_name,
      summary: `Deleted event for ${event.client_name} on ${event.date}`,
    });
    queryClient.invalidateQueries({ queryKey: ['events'] });
    toast({ title: `Event deleted` });
    onClose();
  };

  if (!draft) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0 flex flex-col" onEscapeKeyDown={handleClose}>
          {/* Header */}
          <div className="bg-navy px-5 pt-5 pb-4 text-white shrink-0">
            <SheetHeader className="p-0 mb-1">
              <SheetTitle className="text-white font-heading text-xl">{draft.client_name || 'Event'}</SheetTitle>
            </SheetHeader>
            {draft.perfect_venue_id && (
              <p className="text-white/60 text-xs font-mono mb-2">{draft.perfect_venue_id}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Select value={draft.status} onValueChange={v => update('status', v)}>
                <SelectTrigger className="h-7 text-xs w-auto bg-white/10 border-white/20 text-white px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Badge className="bg-white/10 text-white border-white/20 text-xs">{draft.event_type}</Badge>
              <Badge className="bg-white/10 text-white border-white/20 text-xs">{draft.service_area}</Badge>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-4">
            {/* Event Summary snapshot */}
            <EventSummary
              pnl={pnl}
              comm={comm}
              teamMembers={teamMembers}
              event={event}
              assignments={assignments}
              commissionLines={commissionLinesData}
            />

            {/* Core fields */}
            <Card className="p-4 space-y-3">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Event Details</h4>
              {/* Perfect Venue ID — prominent */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Perfect Venue ID *</label>
                <Input
                  value={draft.perfect_venue_id || ''}
                  onChange={e => update('perfect_venue_id', e.target.value)}
                  className={`h-8 text-sm font-mono ${!draft.perfect_venue_id ? 'border-amber-400 focus:ring-amber-400' : ''}`}
                  placeholder="e.g. PV-1440"
                />
                {!draft.perfect_venue_id && (
                  <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1"><AlertTriangle size={10} /> Required — blocks save</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Date</label>
                  <Input type="date" value={draft.date || ''} onChange={e => update('date', e.target.value)} className="h-8 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Area</label>
                  <Select value={draft.service_area} onValueChange={v => update('service_area', v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{SERVICE_AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Client Name</label>
                  <Input value={draft.client_name || ''} onChange={e => update('client_name', e.target.value)} className="h-8 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Event Type</label>
                  <Select value={draft.event_type} onValueChange={v => update('event_type', v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Private">Private</SelectItem>
                      <SelectItem value="Corporate">Corporate</SelectItem>
                      <SelectItem value="Wedding">Wedding</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Guest Count</label>
                  <Input type="number" value={draft.guest_count || ''} onChange={e => update('guest_count', e.target.value)} className="h-8 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Experience Type</label>
                  <Select value={draft.experience_type || ''} onValueChange={v => update('experience_type', v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>{EXPERIENCE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* P&L */}
            <EventPnL
              draft={draft}
              update={update}
              editedFields={editedFields}
              markEdited={markEdited}
              clearEdited={clearEdited}
              chefPay={chefPay}
              commissionOwed={commissionOwed}
            />

            {/* Attribution + Commission */}
            <EventAttribution
              draft={{ ...draft, facilitators }}
              update={update}
              teamMembers={teamMembers}
              netProfit={pnl?.commissionableProfit || 0}
              onManageTeam={() => setShowTeamModal(true)}
              onFinalize={handleFinalize}
              onReopen={handleReopen}
            />

            {/* Payments */}
            <EventPayments
              event={event}
              chefs={chefs}
              assignments={assignments}
              commissionLines={commissionLinesData}
            />

            {/* Cuisines */}
            <Card className="p-4">
              <ChipPicker label="Cuisines Served" selected={draft.cuisines_served || []} options={CUISINES} onChange={v => update('cuisines_served', v)} />
            </Card>

            {/* Chef team */}
            {assignments.length > 0 && (
              <Card className="p-4">
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">Chef Team</h4>
                <div className="space-y-2">
                  {assignments.map(a => (
                    <div key={a.id} className="flex items-center gap-3">
                      <ChefAvatar photoUrl={a.chef?.photo_url} name={a.chef_name} size="sm" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{a.chef_name}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{a.role}</Badge>
                          {a.chef && <GoldStars rating={a.chef.quality_rating} size={10} />}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-medium">{formatCurrency(a.fee || 0)}</p>
                        {a.travel_fee_applied > 0 && <p className="text-xs text-muted-foreground">+{formatCurrency(a.travel_fee_applied)} travel</p>}
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Payouts</span>
                    <span className="font-heading font-bold">{formatCurrency(chefPay)}</span>
                  </div>
                </div>
              </Card>
            )}

            {/* Notes */}
            <Card className="p-4">
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-2">Notes</label>
              <Textarea value={draft.notes || ''} onChange={e => update('notes', e.target.value)} className="text-sm resize-none" rows={3} />
            </Card>

            {/* Delete */}
            <div className="pb-4">
              {!showDeleteConfirm ? (
                <button onClick={() => setShowDeleteConfirm(true)} className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1">
                  <Trash2 size={12} /> Delete this event
                </button>
              ) : (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium text-destructive flex items-center gap-2"><AlertTriangle size={14} /> Delete event for {draft.client_name}?</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="destructive" onClick={handleDelete} className="h-7 text-xs">Yes, delete</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowDeleteConfirm(false)} className="h-7 text-xs">Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sticky save bar */}
          {dirty && (
            <div className="sticky bottom-0 bg-card border-t p-3 flex items-center justify-between shadow-lg shrink-0">
              <p className="text-xs text-muted-foreground">Unsaved changes</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setDraft({ ...event }); setDirty(false); setEditedFields(new Set()); }} className="h-8 text-xs">Discard</Button>
                <Button size="sm" onClick={save} disabled={saving} className="h-8 text-xs bg-gold hover:bg-gold/80 text-white">
                  {saving ? 'Saving…' : <><Save size={12} className="mr-1" />Save changes</>}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ManageTeamModal open={showTeamModal} onClose={() => setShowTeamModal(false)} />
    </>
  );
}