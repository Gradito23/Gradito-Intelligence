import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ChefAvatar from '@/components/ui/ChefAvatar';
import GoldStars from '@/components/ui/GoldStars';
import { formatCurrency } from '@/hooks/useAppData';
import { CheckCircle2, Circle, Plus, X } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const VENDOR_TYPES = [
  'Staffing Agency', 'Server', 'Bartender', 'Sommelier',
  'Rental Company', 'Florist', 'Delivery Provider', 'Other',
];

function computeTravelFee(chef, area) {
  if (!area || !chef) return 0;
  if ((chef.home_areas || []).includes(area)) return 0;
  const override = (chef.travel_fees || []).find(t => t.service_area === area);
  if (override) return override.fee;
  if (chef.travel_policy === 'Anywhere') return chef.default_travel_fee || 0;
  return 0;
}

function PaymentRow({ label, sublabel, amount, paymentStatus, paidDate, onToggle, onDateChange, loading }) {
  const isPaid = paymentStatus === 'Paid';
  return (
    <div className={`flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0 ${isPaid ? 'opacity-70' : ''}`}>
      <button
        onClick={onToggle}
        disabled={loading}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        title={isPaid ? 'Mark Unpaid' : 'Mark Paid'}
      >
        {isPaid
          ? <CheckCircle2 size={18} className="text-emerald-600" />
          : <Circle size={18} className="text-muted-foreground" />
        }
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isPaid ? 'line-through text-muted-foreground' : ''}`}>{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-medium tabular-nums">{formatCurrency(amount || 0)}</span>
        {isPaid ? (
          <span className="text-xs text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">Paid</span>
        ) : (
          <span className="text-xs text-muted-foreground bg-secondary rounded px-1.5 py-0.5">Unpaid</span>
        )}
      </div>
      {isPaid && (
        <Input
          type="date"
          value={paidDate || ''}
          onChange={e => onDateChange(e.target.value)}
          className="h-7 text-xs w-32"
        />
      )}
    </div>
  );
}

export default function EventPayments({ event, chefs = [], assignments, commissionLines }) {
  const queryClient = useQueryClient();
  const [vendors, setVendors] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [toggling, setToggling] = useState({});
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [newVendor, setNewVendor] = useState({ vendor_name: '', vendor_type: 'Other', amount_owed: '' });
  const [savingVendor, setSavingVendor] = useState(false);
  const [showAddChef, setShowAddChef] = useState(false);
  const [chefSearch, setChefSearch] = useState('');
  const [newChefRole, setNewChefRole] = useState('Head');
  const [newChefFee, setNewChefFee] = useState('');
  const [selectedChefId, setSelectedChefId] = useState(null);
  const [savingChef, setSavingChef] = useState(false);
  const [removingChef, setRemovingChef] = useState({});

  const eventId = event?.id;
  const eventAssignments = assignments || [];
  const assignedChefIds = useMemo(
    () => new Set(eventAssignments.map(ec => ec.chef_id)),
    [eventAssignments]
  );

  const defaultRole = eventAssignments.some(ec => ec.role === 'Head') ? 'Sous' : 'Head';

  const eligibleChefs = useMemo(() => {
    const q = chefSearch.trim().toLowerCase();
    return (chefs || []).filter(c => {
      if (c.archived) return false;
      if (assignedChefIds.has(c.id)) return false;
      if (!q) return true;
      return `${c.first_name} ${c.last_name}`.toLowerCase().includes(q);
    });
  }, [chefs, assignedChefIds, chefSearch]);

  const selectedChef = useMemo(
    () => (chefs || []).find(c => c.id === selectedChefId) || null,
    [chefs, selectedChefId]
  );
  const selectedTravel = computeTravelFee(selectedChef, event?.service_area);

  useEffect(() => {
    if (!eventId) return;
    setLoadingVendors(true);
    base44.entities.EventVendor.filter({ event_id: eventId })
      .then(setVendors)
      .finally(() => setLoadingVendors(false));
  }, [eventId]);

  useEffect(() => {
    if (showAddChef) setNewChefRole(defaultRole);
  }, [showAddChef, defaultRole]);

  // ── Chef payment toggles ──────────────────────────────────────────────────
  const toggleChefPayment = async (ec) => {
    const key = `chef-${ec.id}`;
    setToggling(p => ({ ...p, [key]: true }));
    const isPaid = ec.payment_status === 'Paid';
    const newStatus = isPaid ? 'Unpaid' : 'Paid';
    const paidDate = isPaid ? null : new Date().toISOString().split('T')[0];
    await base44.entities.EventChef.update(ec.id, { payment_status: newStatus, paid_date: paidDate });
    await base44.entities.ActivityLog.create({
      actor: 'Team', action: 'Updated', entity_type: 'Event',
      entity_label: event.client_name,
      summary: `Marked ${ec.chef_name}'s chef payment ${newStatus}`,
    });
    queryClient.invalidateQueries({ queryKey: ['eventChefs'] });
    queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    setToggling(p => ({ ...p, [key]: false }));
  };

  const updateChefPaidDate = async (ec, date) => {
    await base44.entities.EventChef.update(ec.id, { paid_date: date });
    queryClient.invalidateQueries({ queryKey: ['eventChefs'] });
  };

  const resetAddChefForm = () => {
    setShowAddChef(false);
    setChefSearch('');
    setSelectedChefId(null);
    setNewChefFee('');
    setNewChefRole(defaultRole);
  };

  const addChef = async () => {
    if (!selectedChef) return;
    setSavingChef(true);
    const chefName = `${selectedChef.first_name} ${selectedChef.last_name}`;
    try {
      await base44.entities.EventChef.create({
        event_id: eventId,
        chef_id: selectedChef.id,
        chef_name: chefName,
        role: newChefRole,
        fee: Number(newChefFee) || 0,
        travel_fee_applied: selectedTravel,
        payment_status: 'Unpaid',
      });
      await base44.entities.ActivityLog.create({
        actor: 'Team', action: 'Updated', entity_type: 'Event',
        entity_label: event.client_name,
        summary: `Assigned ${chefName} as ${newChefRole} chef`,
      });
      queryClient.invalidateQueries({ queryKey: ['eventChefs'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
      resetAddChefForm();
      toast({ title: `${chefName} added as ${newChefRole}` });
    } catch (err) {
      toast({ title: 'Failed to add chef', description: err.message, variant: 'destructive' });
    } finally {
      setSavingChef(false);
    }
  };

  const deleteChef = async (ec) => {
    if (eventAssignments.length <= 1) {
      toast({ title: 'At least one chef must remain assigned.' });
      return;
    }
    setRemovingChef(p => ({ ...p, [ec.id]: true }));
    try {
      await base44.entities.EventChef.delete(ec.id);
      await base44.entities.ActivityLog.create({
        actor: 'Team', action: 'Updated', entity_type: 'Event',
        entity_label: event.client_name,
        summary: `Removed ${ec.chef_name} (${ec.role}) from event`,
      });
      queryClient.invalidateQueries({ queryKey: ['eventChefs'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
      toast({ title: `${ec.chef_name} removed` });
    } catch (err) {
      toast({ title: 'Failed to remove chef', description: err.message, variant: 'destructive' });
    } finally {
      setRemovingChef(p => ({ ...p, [ec.id]: false }));
    }
  };

  // ── Commission payment toggles ────────────────────────────────────────────
  const toggleCommissionPayment = async (cl) => {
    const key = `comm-${cl.id}`;
    setToggling(p => ({ ...p, [key]: true }));
    const isPaid = cl.payment_status === 'Paid';
    const newStatus = isPaid ? 'Unpaid' : 'Paid';
    const paidDate = isPaid ? null : new Date().toISOString().split('T')[0];
    await base44.entities.CommissionLine.update(cl.id, { payment_status: newStatus, paid_date: paidDate });
    await base44.entities.ActivityLog.create({
      actor: 'Team', action: 'Updated', entity_type: 'Event',
      entity_label: event.client_name,
      summary: `Marked ${cl.team_member_name}'s commission ${newStatus}`,
    });
    queryClient.invalidateQueries({ queryKey: ['commissionLines'] });
    queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    setToggling(p => ({ ...p, [key]: false }));
  };

  const updateCommPaidDate = async (cl, date) => {
    await base44.entities.CommissionLine.update(cl.id, { paid_date: date });
    queryClient.invalidateQueries({ queryKey: ['commissionLines'] });
  };

  // ── Vendor payment toggles ────────────────────────────────────────────────
  const toggleVendorPayment = async (v) => {
    const key = `vendor-${v.id}`;
    setToggling(p => ({ ...p, [key]: true }));
    const isPaid = v.payment_status === 'Paid';
    const newStatus = isPaid ? 'Unpaid' : 'Paid';
    const paidDate = isPaid ? null : new Date().toISOString().split('T')[0];
    const updated = { ...v, payment_status: newStatus, paid_date: paidDate };
    await base44.entities.EventVendor.update(v.id, { payment_status: newStatus, paid_date: paidDate });
    await base44.entities.ActivityLog.create({
      actor: 'Team', action: 'Updated', entity_type: 'Event',
      entity_label: event.client_name,
      summary: `Marked ${v.vendor_name}'s vendor payment ${newStatus}`,
    });
    setVendors(prev => prev.map(x => x.id === v.id ? updated : x));
    setToggling(p => ({ ...p, [key]: false }));
  };

  const updateVendorPaidDate = async (v, date) => {
    await base44.entities.EventVendor.update(v.id, { paid_date: date });
    setVendors(prev => prev.map(x => x.id === v.id ? { ...x, paid_date: date } : x));
  };

  const deleteVendor = async (v) => {
    await base44.entities.EventVendor.delete(v.id);
    setVendors(prev => prev.filter(x => x.id !== v.id));
  };

  const addVendor = async () => {
    if (!newVendor.vendor_name.trim()) return;
    setSavingVendor(true);
    const created = await base44.entities.EventVendor.create({
      event_id: eventId,
      vendor_name: newVendor.vendor_name.trim(),
      vendor_type: newVendor.vendor_type,
      amount_owed: Number(newVendor.amount_owed) || 0,
      payment_status: 'Unpaid',
    });
    setVendors(prev => [...prev, created]);
    setNewVendor({ vendor_name: '', vendor_type: 'Other', amount_owed: '' });
    setShowAddVendor(false);
    setSavingVendor(false);
    toast({ title: `Vendor ${newVendor.vendor_name} added` });
  };

  // ── Payment summary ───────────────────────────────────────────────────────
  const eventCommLines = (commissionLines || []).filter(cl => cl.event_id === eventId);

  const summary = useMemo(() => {
    let totalOwed = 0, totalPaid = 0;

    eventAssignments.forEach(ec => {
      const amt = (ec.fee || 0) + (ec.travel_fee_applied || 0);
      totalOwed += amt;
      if (ec.payment_status === 'Paid') totalPaid += amt;
    });

    eventCommLines.forEach(cl => {
      totalOwed += cl.amount || 0;
      if (cl.payment_status === 'Paid') totalPaid += cl.amount || 0;
    });

    vendors.forEach(v => {
      totalOwed += v.amount_owed || 0;
      if (v.payment_status === 'Paid') totalPaid += v.amount_owed || 0;
    });

    const outstanding = totalOwed - totalPaid;
    const fullyPaid = totalOwed > 0 && outstanding === 0;

    return { totalOwed, totalPaid, outstanding, fullyPaid };
  }, [eventAssignments, eventCommLines, vendors]);

  const closerLines = eventCommLines.filter(cl => cl.role === 'Closer');
  const facLines    = eventCommLines.filter(cl => cl.role === 'Facilitator');
  const canRemoveChef = eventAssignments.length > 1;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Payments</h4>
        <Badge className={summary.fullyPaid
          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
          : 'bg-amber-100 text-amber-800 border-amber-300'
        }>
          {summary.fullyPaid ? 'Fully Paid' : 'Outstanding Payments'}
        </Badge>
      </div>

      {/* Payment summary bar */}
      <div className="grid grid-cols-3 gap-2 text-center bg-secondary/40 rounded-lg p-2.5">
        <div>
          <p className="text-xs text-muted-foreground">Total Owed</p>
          <p className="text-sm font-heading font-bold">{formatCurrency(summary.totalOwed)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Paid</p>
          <p className="text-sm font-heading font-bold text-emerald-700">{formatCurrency(summary.totalPaid)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Outstanding</p>
          <p className={`text-sm font-heading font-bold ${summary.outstanding > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
            {formatCurrency(summary.outstanding)}
          </p>
        </div>
      </div>

      {/* Chef Payments */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold mb-1.5">Chef Payments</p>
        {eventAssignments.map(ec => (
          <div key={ec.id} className="flex items-center gap-1">
            <div className="flex-1">
              <PaymentRow
                label={ec.chef_name}
                sublabel={ec.role + (ec.travel_fee_applied > 0 ? ` · +${formatCurrency(ec.travel_fee_applied)} travel` : '')}
                amount={(ec.fee || 0) + (ec.travel_fee_applied || 0)}
                paymentStatus={ec.payment_status || 'Unpaid'}
                paidDate={ec.paid_date}
                onToggle={() => toggleChefPayment(ec)}
                onDateChange={date => updateChefPaidDate(ec, date)}
                loading={toggling[`chef-${ec.id}`]}
              />
            </div>
            {canRemoveChef && (
              <button
                onClick={() => deleteChef(ec)}
                disabled={removingChef[ec.id]}
                className="shrink-0 text-muted-foreground hover:text-destructive transition-colors p-1 disabled:opacity-50"
                title="Remove chef"
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}

        {showAddChef ? (
          <div className="border border-border rounded-lg p-3 space-y-2.5 bg-secondary/20 mt-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Add Chef</p>
              <button onClick={resetAddChefForm}><X size={13} /></button>
            </div>
            {!selectedChef ? (
              <>
                <Input
                  placeholder="Search chefs…"
                  value={chefSearch}
                  onChange={e => setChefSearch(e.target.value)}
                  className="h-8 text-sm"
                  autoFocus
                />
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {eligibleChefs.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      {(chefs || []).length === 0 ? 'No chefs in the system yet.' : 'No chefs match your search.'}
                    </p>
                  )}
                  {eligibleChefs.map(c => {
                    const tf = computeTravelFee(c, event?.service_area);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedChefId(c.id)}
                        className="w-full flex items-center gap-3 p-2 rounded hover:bg-secondary transition-colors text-left"
                      >
                        <ChefAvatar photoUrl={c.photo_url} name={`${c.first_name} ${c.last_name}`} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{c.first_name} {c.last_name}</p>
                          <div className="flex items-center gap-2">
                            <GoldStars rating={c.quality_rating} size={10} />
                            {tf > 0 && <span className="text-xs text-amber-600">+{formatCurrency(tf)} travel</span>}
                            {tf === 0 && event?.service_area && <span className="text-xs text-emerald-600">Home area</span>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 p-2 rounded bg-secondary/40">
                  <ChefAvatar photoUrl={selectedChef.photo_url} name={`${selectedChef.first_name} ${selectedChef.last_name}`} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{selectedChef.first_name} {selectedChef.last_name}</p>
                    {selectedTravel > 0 && (
                      <p className="text-xs text-amber-600">+{formatCurrency(selectedTravel)} travel</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedChefId(null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Change
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={newChefRole} onValueChange={setNewChefRole}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Head">Head</SelectItem>
                      <SelectItem value="Sous">Sous</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Fee $"
                    value={newChefFee}
                    onChange={e => setNewChefFee(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={addChef}
                    disabled={savingChef || !selectedChef}
                    className="h-7 text-xs bg-gold hover:bg-gold/80 text-white"
                  >
                    {savingChef ? 'Adding…' : 'Add'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={resetAddChefForm} className="h-7 text-xs">Cancel</Button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowAddChef(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1.5"
          >
            <Plus size={13} /> Add Chef
          </button>
        )}
      </div>

      {/* Sales Specialist Commissions */}
      {closerLines.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold mb-1.5">Sales Specialist Commission</p>
          {closerLines.map(cl => (
            <PaymentRow
              key={cl.id}
              label={cl.team_member_name}
              sublabel={`${cl.rate_pct}% closer · ${formatCurrency(cl.basis || 0)} basis`}
              amount={cl.amount}
              paymentStatus={cl.payment_status || 'Unpaid'}
              paidDate={cl.paid_date}
              onToggle={() => toggleCommissionPayment(cl)}
              onDateChange={date => updateCommPaidDate(cl, date)}
              loading={toggling[`comm-${cl.id}`]}
            />
          ))}
        </div>
      )}

      {/* Execution Specialist Commissions */}
      {facLines.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold mb-1.5">Execution Specialist Commission</p>
          {facLines.map(cl => (
            <PaymentRow
              key={cl.id}
              label={cl.team_member_name}
              sublabel={`${cl.rate_pct}% facilitator${cl.split_pct < 100 ? ` · ${cl.split_pct}% split` : ''} · ${formatCurrency(cl.basis || 0)} basis`}
              amount={cl.amount}
              paymentStatus={cl.payment_status || 'Unpaid'}
              paidDate={cl.paid_date}
              onToggle={() => toggleCommissionPayment(cl)}
              onDateChange={date => updateCommPaidDate(cl, date)}
              loading={toggling[`comm-${cl.id}`]}
            />
          ))}
        </div>
      )}

      {/* Vendors */}
      {vendors.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold mb-1.5">Vendors</p>
          {vendors.map(v => (
            <div key={v.id} className="flex items-center gap-1">
              <div className="flex-1">
                <PaymentRow
                  label={v.vendor_name}
                  sublabel={v.vendor_type}
                  amount={v.amount_owed}
                  paymentStatus={v.payment_status || 'Unpaid'}
                  paidDate={v.paid_date}
                  onToggle={() => toggleVendorPayment(v)}
                  onDateChange={date => updateVendorPaidDate(v, date)}
                  loading={toggling[`vendor-${v.id}`]}
                />
              </div>
              <button
                onClick={() => deleteVendor(v)}
                className="shrink-0 text-muted-foreground hover:text-destructive transition-colors p-1"
                title="Remove vendor"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Vendor */}
      {showAddVendor ? (
        <div className="border border-border rounded-lg p-3 space-y-2.5 bg-secondary/20">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Add Vendor</p>
            <button onClick={() => setShowAddVendor(false)}><X size={13} /></button>
          </div>
          <Input
            placeholder="Vendor name"
            value={newVendor.vendor_name}
            onChange={e => setNewVendor(p => ({ ...p, vendor_name: e.target.value }))}
            className="h-8 text-sm"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <Select value={newVendor.vendor_type} onValueChange={v => setNewVendor(p => ({ ...p, vendor_type: v }))}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{VENDOR_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Amount $"
              value={newVendor.amount_owed}
              onChange={e => setNewVendor(p => ({ ...p, amount_owed: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addVendor} disabled={savingVendor || !newVendor.vendor_name.trim()} className="h-7 text-xs bg-gold hover:bg-gold/80 text-white">
              {savingVendor ? 'Adding…' : 'Add'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowAddVendor(false)} className="h-7 text-xs">Cancel</Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddVendor(true)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus size={13} /> Add Vendor
        </button>
      )}

      {eventAssignments.length === 0 && eventCommLines.length === 0 && vendors.length === 0 && !loadingVendors && !showAddChef && (
        <p className="text-xs text-muted-foreground/60 italic text-center py-2">No payment obligations yet — assign chefs and set commissions first.</p>
      )}
    </Card>
  );
}