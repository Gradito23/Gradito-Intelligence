import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import ChefAvatar from '@/components/ui/ChefAvatar';
import GoldStars from '@/components/ui/GoldStars';
import { formatCurrency } from '@/hooks/useAppData';
import { CUISINES, EXPERIENCE_TYPES, SERVICE_AREAS } from '@/lib/constants';
import { AlertTriangle, Plus, X, TrendingUp, TrendingDown, Users, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import {
  PACKAGE_TYPES, MENU_TIERS,
  calcExperienceFee, calcFoodRevenue,
  computePnL,
} from '@/lib/pnlUtils';
import { useTeamMembers } from '@/hooks/useAppData';
import { computeCommission, LEAD_TYPES, COMMISSION_RATES } from '@/lib/commissionUtils';

function ChipPicker({ label, selected, options, onChange }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-1.5 mt-1.5">
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

function ChefSlot({ role, assignment, chefs, area, onAdd, onRemove, onFeeChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const eligibleChefs = chefs.filter(c => {
    if (c.archived) return false;
    const nameMatch = search === '' || `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase());
    if (!nameMatch) return false;
    // Show all active chefs if no roles_available set; otherwise filter by role
    if (!c.roles_available) return true;
    if (role === 'Head') return c.roles_available === 'Head' || c.roles_available === 'Both';
    return c.roles_available === 'Sous' || c.roles_available === 'Both';
  });

  const computedTravel = (chef) => {
    if (!area || !chef) return 0;
    if ((chef.home_areas || []).includes(area)) return 0;
    const override = (chef.travel_fees || []).find(t => t.service_area === area);
    if (override) return override.fee;
    if (chef.travel_policy === 'Anywhere') return chef.default_travel_fee || 0;
    return 0;
  };

  const selectChef = (chef) => {
    const tf = computedTravel(chef);
    onAdd({ chef_id: chef.id, chef_name: `${chef.first_name} ${chef.last_name}`, role, fee: 0, travel_fee_applied: tf, _chefObj: chef });
    setOpen(false);
    setSearch('');
  };

  if (assignment) {
    const chef = assignment._chefObj;
    return (
      <Card className="p-3 flex items-center gap-3">
        <ChefAvatar photoUrl={chef?.photo_url} name={assignment.chef_name} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{assignment.chef_name}</p>
          {chef && <GoldStars rating={chef.quality_rating} size={11} />}
          {assignment.travel_fee_applied > 0 && (
            <p className="text-xs text-amber-600">+{formatCurrency(assignment.travel_fee_applied)} travel</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Fee $</span>
          <Input type="number" value={assignment.fee || ''} onChange={e => onFeeChange(Number(e.target.value))} className="w-20 h-7 text-sm" />
          <button onClick={onRemove} className="text-muted-foreground hover:text-destructive transition-colors"><X size={14} /></button>
        </div>
      </Card>
    );
  }

  return (
    <div>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)}
          className="w-full border-2 border-dashed border-border rounded-lg p-3 text-sm text-muted-foreground hover:border-navy hover:text-foreground transition-all flex items-center justify-center gap-2">
          <Plus size={14} /> Add {role} Chef
        </button>
      ) : (
        <div className="border rounded-lg p-3 space-y-2 bg-secondary/20">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Select {role} Chef</p>
            <button type="button" onClick={() => { setOpen(false); setSearch(''); }}><X size={14} /></button>
          </div>
          <Input
            placeholder="Search chefs…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-7 text-sm"
            autoFocus
          />
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {eligibleChefs.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                {chefs.length === 0 ? 'No chefs in the system yet.' : 'No chefs match your search.'}
              </p>
            )}
            {eligibleChefs.map(c => {
              const tf = computedTravel(c);
              return (
                <button key={c.id} type="button" onClick={() => selectChef(c)}
                  className="w-full flex items-center gap-3 p-2 rounded hover:bg-secondary transition-colors text-left">
                  <ChefAvatar photoUrl={c.photo_url} name={`${c.first_name} ${c.last_name}`} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{c.first_name} {c.last_name}</p>
                    <div className="flex items-center gap-2">
                      <GoldStars rating={c.quality_rating} size={10} />
                      {tf > 0 && <span className="text-xs text-amber-600">+{formatCurrency(tf)} travel</span>}
                      {tf === 0 && area && <span className="text-xs text-emerald-600">Home area</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const EMPTY_FORM = {
  date: '', service_area: '', client_name: '', perfect_venue_id: '',  event_type: 'Private',
  experience_type: '', cuisines_served: [], guest_count: '', status: 'Confirmed', notes: '',
  package_type: '', menu_tier: '',
  experience_fee: 0, food_revenue: 0, beverage_revenue: 0, staffing_revenue: 0,
  rental_revenue: 0, travel_revenue: 0, florals_revenue: 0, printed_menus_revenue: 0,
  other_revenue: 0, discount: 0, admin_fee: 0,
  gratuity: 0, cc_processing: 0, sales_tax: 0,
  chef_food_budget: 0, food_cost_actual: 0,
  staffing_cost: 0, beverage_cost: 0, rental_cost: 0,
  other_travel_cost: 0, florals_cost: 0, printed_menus_cost: 0,
  delivery_cost: 0, other_expenses: 0,
  lead_type: '', closer_id: '', facilitator_id: '', source_rep_id: null,
  source_split_pct: 40, repeat_client_bonus: false, apply_min_floor: false,
  commission_status: 'Pending',
};

export default function CreateEventModal({
  open,
  onClose,
  chefs,
  clients,
  eventChefs,
  prefillChef,
  prefillSous,
  prefillCriteria,
}) {
  const queryClient = useQueryClient();
  const { data: teamMembers } = useTeamMembers();
  const [form, setForm] = useState(EMPTY_FORM);
  const [headChef, setHeadChef] = useState(null);
  const [sousChef, setSousChef] = useState(null);
  const [saving, setSaving] = useState(false);
  const [revCostsOpen, setRevCostsOpen] = useState(false);
  const [editedFields, setEditedFields] = useState(new Set());

  useEffect(() => {
    if (open) {
      const nextForm = { ...EMPTY_FORM };
      if (prefillCriteria && typeof prefillCriteria === 'object') {
        if (prefillCriteria.client_name) nextForm.client_name = prefillCriteria.client_name;
        if (prefillCriteria.service_area) nextForm.service_area = prefillCriteria.service_area;
        if (prefillCriteria.guest_count != null && prefillCriteria.guest_count !== '') {
          nextForm.guest_count = prefillCriteria.guest_count;
        }
        if (prefillCriteria.event_type) nextForm.event_type = prefillCriteria.event_type;
        if (prefillCriteria.experience_type) nextForm.experience_type = prefillCriteria.experience_type;
        if (Array.isArray(prefillCriteria.cuisines) && prefillCriteria.cuisines.length) {
          nextForm.cuisines_served = prefillCriteria.cuisines;
        }
        // Only apply date when it looks like YYYY-MM-DD
        if (typeof prefillCriteria.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(prefillCriteria.date)) {
          nextForm.date = prefillCriteria.date.slice(0, 10);
        }
      }
      setForm(nextForm);
      setRevCostsOpen(false);
      setEditedFields(new Set());

      const toAssignment = (chef, role) => {
        if (!chef) return null;
        const area = nextForm.service_area;
        let travelFee = 0;
        if (area && !(chef.home_areas || []).includes(area)) {
          const override = (chef.travel_fees || []).find((t) => t.service_area === area);
          if (override) travelFee = override.fee;
          else if (chef.travel_policy === 'Anywhere') travelFee = chef.default_travel_fee || 0;
        }
        return {
          chef_id: chef.id,
          chef_name: `${chef.first_name} ${chef.last_name}`,
          role,
          fee: 0,
          travel_fee_applied: travelFee,
          _chefObj: chef,
        };
      };

      if (prefillChef) {
        const chef = chefs.find((c) => c.id === prefillChef.id) || prefillChef;
        setHeadChef(toAssignment(chef, 'Head'));
      } else {
        setHeadChef(null);
      }

      if (prefillSous) {
        const chef = chefs.find((c) => c.id === prefillSous.id) || prefillSous;
        setSousChef(toAssignment(chef, 'Sous'));
      } else {
        setSousChef(null);
      }
    }
  }, [open, prefillChef, prefillSous, prefillCriteria, chefs]);

  const f = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const markEdited   = (field) => setEditedFields(prev => new Set([...prev, field]));
  const clearEdited  = (field) => setEditedFields(prev => { const s = new Set(prev); s.delete(field); return s; });

  const guests = Number(form.guest_count) || 0;

  const handlePackageChange = (val) => {
    f('package_type', val);
    const newFee = calcExperienceFee(val, guests);
    if (newFee != null && !editedFields.has('experience_fee')) f('experience_fee', newFee);
    const newFood = calcFoodRevenue(val, form.menu_tier, guests);
    if (newFood != null && !editedFields.has('food_revenue')) f('food_revenue', newFood);
  };

  const handleMenuTierChange = (val) => {
    f('menu_tier', val);
    const newFood = calcFoodRevenue(form.package_type, val, guests);
    if (newFood != null && !editedFields.has('food_revenue')) f('food_revenue', newFood);
  };

  const handleGuestCountChange = (val) => {
    f('guest_count', val);
    const g = Number(val) || 0;
    if (!editedFields.has('experience_fee')) {
      const newFee = calcExperienceFee(form.package_type, g);
      if (newFee != null) f('experience_fee', newFee);
    }
    if (!editedFields.has('food_revenue')) {
      const newFood = calcFoodRevenue(form.package_type, form.menu_tier, g);
      if (newFood != null) f('food_revenue', newFood);
    }
  };

  const totalPayouts = useMemo(() => {
    let total = 0;
    if (headChef) total += (headChef.fee || 0) + (headChef.travel_fee_applied || 0);
    if (sousChef) total += (sousChef.fee || 0) + (sousChef.travel_fee_applied || 0);
    return total;
  }, [headChef, sousChef]);

  const pnl = useMemo(() => computePnL(form, totalPayouts), [form, totalPayouts]);
  const isProfit = pnl.netProfit >= 0;
  const needsSous = guests >= 15;

  const handleSave = async () => {
    if (!form.perfect_venue_id || !form.date || !form.client_name) {
      toast({ title: 'Perfect Venue ID, date, and client name are required', variant: 'destructive' });
      return;
    }
    if (!form.service_area) {
      toast({ title: 'Please select a service area', variant: 'destructive' });
      return;
    }
    if (needsSous && !sousChef) {
      if (!window.confirm('Guest count ≥ 15 usually requires a sous chef. Save without one?')) return;
    }
    setSaving(true);
    const event = await base44.entities.Event.create({
      ...form,
      guest_count:           Number(form.guest_count) || 0,
      experience_fee:        Number(form.experience_fee) || 0,
      food_revenue:          Number(form.food_revenue) || 0,
      beverage_revenue:      Number(form.beverage_revenue) || 0,
      staffing_revenue:      Number(form.staffing_revenue) || 0,
      rental_revenue:        Number(form.rental_revenue) || 0,
      travel_revenue:        Number(form.travel_revenue) || 0,
      florals_revenue:       Number(form.florals_revenue) || 0,
      printed_menus_revenue: Number(form.printed_menus_revenue) || 0,
      other_revenue:         Number(form.other_revenue) || 0,
      discount:              Number(form.discount) || 0,
      admin_fee:             Number(form.admin_fee) || 0,
      gratuity:              Number(form.gratuity) || 0,
      cc_processing:         Number(form.cc_processing) || 0,
      sales_tax:             Number(form.sales_tax) || 0,
      chef_food_budget:      Number(form.chef_food_budget) || 0,
      food_cost_actual:      Number(form.food_cost_actual) || 0,
      staffing_cost:         Number(form.staffing_cost) || 0,
      beverage_cost:         Number(form.beverage_cost) || 0,
      rental_cost:           Number(form.rental_cost) || 0,
      other_travel_cost:     Number(form.other_travel_cost) || 0,
      florals_cost:          Number(form.florals_cost) || 0,
      printed_menus_cost:    Number(form.printed_menus_cost) || 0,
      delivery_cost:         Number(form.delivery_cost) || 0,
      other_expenses:        Number(form.other_expenses) || 0,
      source_split_pct:      Number(form.source_split_pct) || 40,
      client_revenue:        pnl.clientTotal,
      commission_status:     'Pending',
    });

    if (!event?.id) {
      toast({ title: 'Failed to create event', variant: 'destructive' });
      setSaving(false);
      return;
    }

    if (headChef) {
      await base44.entities.EventChef.create({ event_id: event.id, chef_id: headChef.chef_id, chef_name: headChef.chef_name, role: 'Head', fee: headChef.fee, travel_fee_applied: headChef.travel_fee_applied });
    }
    if (sousChef) {
      await base44.entities.EventChef.create({ event_id: event.id, chef_id: sousChef.chef_id, chef_name: sousChef.chef_name, role: 'Sous', fee: sousChef.fee, travel_fee_applied: sousChef.travel_fee_applied });
    }
    await base44.entities.ActivityLog.create({
      actor: 'Team', action: 'Created', entity_type: 'Event', entity_label: form.client_name,
      summary: `Created event for ${form.client_name} on ${form.date} in ${form.service_area}`,
    });
    queryClient.invalidateQueries({ queryKey: ['events'] });
    queryClient.invalidateQueries({ queryKey: ['eventChefs'] });
    queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    toast({ title: `Event for ${form.client_name} created` });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">New Event</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Perfect Venue ID */}
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Perfect Venue ID *</Label>
            <Input value={form.perfect_venue_id} onChange={e => f('perfect_venue_id', e.target.value)} className="mt-1" placeholder="e.g. PV-1440" />
            <p className="text-xs text-muted-foreground/60 mt-0.5">Canonical ID across PerfectVenue, QuickBooks, Square & Novo</p>
          </div>

          {/* Core fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Date *</Label>
              <Input type="date" value={form.date} onChange={e => f('date', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Service Area *</Label>
              <Select value={form.service_area} onValueChange={v => f('service_area', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select area" /></SelectTrigger>
                <SelectContent>{SERVICE_AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Client Name *</Label>
              <Input value={form.client_name} onChange={e => f('client_name', e.target.value)} className="mt-1" placeholder="Acme Corp" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Event Type</Label>
              <Select value={form.event_type} onValueChange={v => f('event_type', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Private">Private</SelectItem>
                  <SelectItem value="Corporate">Corporate</SelectItem>
                  <SelectItem value="Wedding">Wedding</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Guest Count</Label>
              <Input type="number" value={form.guest_count} onChange={e => handleGuestCountChange(e.target.value)} className="mt-1" placeholder="12" />
              {needsSous && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <AlertTriangle size={11} /> Sous chef recommended at 15+
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Experience Type</Label>
              <Select value={form.experience_type} onValueChange={v => f('experience_type', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{EXPERIENCE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Package & Menu — drive auto-pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Package Type</Label>
              <Select value={form.package_type} onValueChange={handlePackageChange}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{PACKAGE_TYPES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Menu Tier</Label>
              <Select value={form.menu_tier} onValueChange={handleMenuTierChange}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{MENU_TIERS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Live Net Profit card */}
          {(pnl.billableRevenue > 0 || totalPayouts > 0) && (
            <Card className={`p-3 flex items-center justify-between ${isProfit ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-2">
                {isProfit ? <TrendingUp size={16} className="text-emerald-600" /> : <TrendingDown size={16} className="text-red-500" />}
                <span className="text-sm font-medium">Live Margin</span>
              </div>
              <div className="text-right text-sm">
                <p className={`font-heading font-bold ${isProfit ? 'text-emerald-700' : 'text-red-600'}`}>{formatCurrency(pnl.grossProfit)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(pnl.billableRevenue)} billable · {formatCurrency(totalPayouts)} payouts · {pnl.grossMarginPct.toFixed(1)}%
                </p>
              </div>
            </Card>
          )}

          {/* Chef slots */}
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground block mb-2">Chef Team</Label>
            <div className="space-y-2">
              <ChefSlot role="Head" assignment={headChef} chefs={chefs} area={form.service_area}
                onAdd={setHeadChef} onRemove={() => setHeadChef(null)} onFeeChange={fee => setHeadChef(prev => ({ ...prev, fee }))} />
              {(needsSous || sousChef) && (
                <div>
                  {needsSous && !sousChef && (
                    <div className="flex items-center gap-2 mb-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <Users size={13} /> <span>15+ guests — add a sous chef</span>
                    </div>
                  )}
                  <ChefSlot role="Sous" assignment={sousChef} chefs={chefs} area={form.service_area}
                    onAdd={setSousChef} onRemove={() => setSousChef(null)} onFeeChange={fee => setSousChef(prev => ({ ...prev, fee }))} />
                </div>
              )}
            </div>
          </div>

          {/* Cuisines */}
          <ChipPicker label="Cuisines Served" selected={form.cuisines_served} options={CUISINES} onChange={v => f('cuisines_served', v)} />

          {/* Collapsible Revenue & Costs */}
          <div className="border border-border rounded-lg">
            <button
              type="button"
              onClick={() => setRevCostsOpen(p => !p)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-secondary/30 transition-colors rounded-lg"
            >
              <span className="flex items-center gap-2 text-muted-foreground">
                Revenue & Costs <span className="text-xs font-normal">(optional)</span>
              </span>
              {revCostsOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </button>
            {revCostsOpen && (
              <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                {/* Attribution */}
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Attribution</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Lead Type</Label>
                      <Select value={form.lead_type} onValueChange={v => f('lead_type', v)}>
                        <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>{LEAD_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Source Split %</Label>
                      <Input type="number" value={form.source_split_pct} onChange={e => f('source_split_pct', Number(e.target.value))} className="mt-1 h-8 text-sm" placeholder="40" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Closer</Label>
                      <Select value={form.closer_id} onValueChange={v => f('closer_id', v)}>
                        <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>{teamMembers.filter(m => m.active !== false && (m.roles||[]).includes('Closer')).map(m => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name||''}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Facilitator</Label>
                      <Select value={form.facilitator_id} onValueChange={v => f('facilitator_id', v)}>
                        <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>{teamMembers.filter(m => m.active !== false && (m.roles||[]).includes('Facilitator')).map(m => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name||''}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Client Charges */}
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Client Charges</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Experience Fee ($)', 'experience_fee'],
                      ['Food / Menu Charges ($)', 'food_revenue'],
                      ['Beverage Program ($)', 'beverage_revenue'],
                      ['Servers / Bartenders / FOH ($)', 'staffing_revenue'],
                      ['Rentals ($)', 'rental_revenue'],
                      ['Travel Expenses ($)', 'travel_revenue'],
                      ['Florals ($)', 'florals_revenue'],
                      ['Printed Menus ($)', 'printed_menus_revenue'],
                      ['Other Charges ($)', 'other_revenue'],
                      ['Discount (−$)', 'discount'],
                      ['Admin Fee ($)', 'admin_fee'],
                    ].map(([label, field]) => (
                      <div key={field}>
                        <Label className="text-xs text-muted-foreground">{label}</Label>
                        <Input type="number" value={form[field] || ''} onChange={e => {
                          f(field, Number(e.target.value) || 0);
                          markEdited(field);
                        }} className="mt-1 h-8 text-sm" placeholder="0" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Excluded Charges */}
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Excluded Charges</p>
                  <p className="text-xs text-muted-foreground/70 mb-2">Collected but not Gradito profit</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Gratuity ($)', 'gratuity'],
                      ['CC Processing ($)', 'cc_processing'],
                      ['Sales Tax ($)', 'sales_tax'],
                    ].map(([label, field]) => (
                      <div key={field}>
                        <Label className="text-xs text-muted-foreground">{label}</Label>
                        <Input type="number" value={form[field] || ''} onChange={e => f(field, Number(e.target.value) || 0)} className="mt-1 h-8 text-sm" placeholder="0" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Event Costs */}
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Event Costs</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Food Budget ($)', 'chef_food_budget'],
                      ['Servers / Bartenders / FOH ($)', 'staffing_cost'],
                      ['Beverage Costs ($)', 'beverage_cost'],
                      ['Rentals ($)', 'rental_cost'],
                      ['Travel Expenses ($)', 'other_travel_cost'],
                      ['Florals ($)', 'florals_cost'],
                      ['Printed Menus ($)', 'printed_menus_cost'],
                      ['Delivery ($)', 'delivery_cost'],
                      ['Other Costs ($)', 'other_expenses'],
                    ].map(([label, field]) => (
                      <div key={field}>
                        <Label className="text-xs text-muted-foreground">{label}</Label>
                        <Input type="number" value={form[field] || ''} onChange={e => f(field, Number(e.target.value) || 0)} className="mt-1 h-8 text-sm" placeholder="0" />
                      </div>
                    ))}
                  </div>
                </div>


              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
              <Select value={form.status} onValueChange={v => f('status', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Notes</Label>
            <Textarea value={form.notes} onChange={e => f('notes', e.target.value)} className="mt-1 resize-none" rows={2} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-gold hover:bg-gold/80 text-white">
            {saving ? 'Creating…' : 'Create Event'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}