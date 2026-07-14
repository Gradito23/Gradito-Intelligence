import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, Info, CheckCircle, Plus, X, TrendingUp, TrendingDown, Lock } from 'lucide-react';
import { formatCurrency } from '@/hooks/useAppData';
import { computePnL } from '@/lib/pnlUtils';
import { computeCommission, LEAD_TYPES, COMMISSION_RATES, normalizeFacilitators } from '@/lib/commissionUtils';

const NONE = '__none__';

function NumField({ label, value, onChange, highlight, hint }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-0.5">{label}</label>
      {hint && <p className="text-xs text-muted-foreground/60 mb-1 leading-tight">{hint}</p>}
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
        <Input type="number" step="0.01" value={value ?? ''} onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className={`pl-6 h-8 text-sm ${highlight ? 'border-amber-400 bg-amber-50' : ''}`} />
      </div>
    </div>
  );
}

export default function InvoiceDraftCard({ draft, index, onChange, serviceAreas, teamMembers = [] }) {
  const [expanded, setExpanded] = useState(true);

  const pnl = useMemo(() => {
    const chefPay = (draft.head_chef_fee || 0) + (draft.sous_chef_fee || 0);
    return computePnL(draft, chefPay);
  }, [draft]);

  // Client Total vs Invoice Grand Total check
  const grandTotal = draft.invoice_grand_total || 0;
  const clientTotalMatch = grandTotal > 0 && Math.abs(pnl.clientTotal - grandTotal) < 0.05;
  const clientTotalMismatch = grandTotal > 0 && !clientTotalMatch;

  const update = (field, val) => onChange(index, { ...draft, [field]: val });
  const headMatched = !!draft.head_chef_id;
  const sousMatched = !!draft.sous_chef_id || !draft.sous_chef_name;
  const criticalWarnings = (draft._warnings || []).filter(w => !w.includes('lead_type'));

  return (
    <Card className={`overflow-hidden ${criticalWarnings.length > 0 ? 'border-amber-300' : 'border-emerald-200'}`}>
      <div
        className={`px-5 py-4 flex items-start justify-between cursor-pointer ${criticalWarnings.length > 0 ? 'bg-amber-50' : 'bg-emerald-50/60'}`}
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-heading font-semibold text-base">{draft.client_name || `Invoice ${index + 1}`}</span>
              {draft.invoice_number && <Badge variant="outline" className="text-xs font-mono">{draft.invoice_number}</Badge>}
              <Badge variant="outline" className="text-xs">{draft.date || 'No date'}</Badge>
              <Badge variant="outline" className="text-xs">{draft.service_area || 'No area'}</Badge>
              {grandTotal > 0 && (
                clientTotalMatch
                  ? <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Total ✓</Badge>
                  : <Badge className="bg-red-100 text-red-700 border-0 text-xs">Total mismatch</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              {draft.head_chef_name && <span className={headMatched ? 'text-emerald-600' : 'text-red-500'}>Head: {draft.head_chef_name} {headMatched ? '✓' : '✗'}</span>}
              {draft.sous_chef_name && <span className={sousMatched ? 'text-emerald-600' : 'text-red-500'}>Sous: {draft.sous_chef_name} {sousMatched ? '✓' : '✗'}</span>}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0 ml-4">
          <p className="text-xs text-muted-foreground">Gross Profit</p>
          <p className={`font-heading font-bold text-lg ${pnl.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(pnl.grossProfit)}</p>
          <p className="text-xs text-muted-foreground">{pnl.grossMarginPct.toFixed(1)}% margin</p>
        </div>
      </div>

      {expanded && (
        <div className="p-5 space-y-5">
          {criticalWarnings.length > 0 && (
            <div className="space-y-1.5">
              {criticalWarnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  <AlertTriangle size={12} className="shrink-0 mt-0.5" />{w}
                </div>
              ))}
            </div>
          )}
          {clientTotalMismatch && (
            <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              <AlertTriangle size={12} className="shrink-0 mt-0.5" />
              Client Total ({formatCurrency(pnl.clientTotal)}) ≠ Invoice Grand Total ({formatCurrency(grandTotal)}) — difference: {formatCurrency(Math.abs(pnl.clientTotal - grandTotal))}. Check charges above.
            </div>
          )}
          {(draft._assumptions || []).length > 0 && (
            <div className="space-y-1.5">
              {draft._assumptions.map((a, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2">
                  <Info size={12} className="shrink-0 mt-0.5" />{a}
                </div>
              ))}
            </div>
          )}

          {/* Core fields */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Date</label>
              <Input type="date" value={draft.date || ''} onChange={e => update('date', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Service Area</label>
              <Input value={draft.service_area || ''} onChange={e => update('service_area', e.target.value)} className="h-8 text-sm" list={`areas-${index}`} />
              <datalist id={`areas-${index}`}>{serviceAreas.map(sa => <option key={sa.id} value={sa.name} />)}</datalist>
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
                  {['Private', 'Corporate', 'Wedding'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Guests</label>
              <Input type="number" value={draft.guest_count || ''} onChange={e => update('guest_count', parseInt(e.target.value) || null)} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Invoice #</label>
              <Input value={draft.invoice_number || ''} onChange={e => update('invoice_number', e.target.value)} className="h-8 text-sm font-mono" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Invoice Grand Total</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                <Input type="number" step="0.01" value={draft.invoice_grand_total || ''} onChange={e => update('invoice_grand_total', parseFloat(e.target.value) || 0)} className="pl-6 h-8 text-sm" />
              </div>
            </div>
          </div>

          {/* Client Charges */}
          <div>
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">Client Charges</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <NumField label="Experience / Chef Fee" value={draft.experience_fee} onChange={v => update('experience_fee', v)} />
              <NumField label="Food / Menu Charges" value={draft.food_revenue} onChange={v => update('food_revenue', v)} />
              <NumField label="Beverage Program" value={draft.beverage_revenue} onChange={v => update('beverage_revenue', v)} />
              <NumField label="Servers / Bartenders / FOH" value={draft.staffing_revenue} onChange={v => update('staffing_revenue', v)} />
              <NumField label="Rentals" value={draft.rental_revenue} onChange={v => update('rental_revenue', v)} />
              <NumField label="Travel Expenses" value={draft.travel_revenue} onChange={v => update('travel_revenue', v)} />
              <NumField label="Florals" value={draft.florals_revenue} onChange={v => update('florals_revenue', v)} />
              <NumField label="Printed Menus" value={draft.printed_menus_revenue} onChange={v => update('printed_menus_revenue', v)} />
              <NumField label="Other Charges" value={draft.other_revenue} onChange={v => update('other_revenue', v)} />
              <NumField label="Discount (−)" value={draft.discount} onChange={v => update('discount', v)} />
              <NumField label="Admin Fee ($)" value={draft.admin_fee} onChange={v => update('admin_fee', v)} />
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span>Billable Revenue: <strong className="text-foreground">{formatCurrency(pnl.billableRevenue)}</strong></span>
              <span>·</span>
              <span>Client Total (incl. excluded): <strong className={clientTotalMismatch ? 'text-red-600' : 'text-foreground'}>{formatCurrency(pnl.clientTotal)}</strong></span>
              {clientTotalMatch && <CheckCircle size={12} className="text-emerald-600" />}
            </div>
          </div>

          {/* Excluded Charges */}
          <div>
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Excluded Charges</h4>
            <p className="text-xs text-muted-foreground/70 mb-3">Collected but not Gradito profit — not included in Billable Revenue</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <NumField label="Gratuity" value={draft.gratuity} onChange={v => update('gratuity', v)} />
              <NumField label="CC Processing Fee" value={draft.cc_processing} onChange={v => update('cc_processing', v)} />
              <NumField label="Sales Tax" value={draft.sales_tax} onChange={v => update('sales_tax', v)} />
            </div>
          </div>

          {/* Event Costs */}
          <div>
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Event Costs</h4>
            <p className="text-xs text-muted-foreground/70 mb-3">Not on invoice — enter manually.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <NumField label="Food Budget" value={draft.chef_food_budget} onChange={v => update('chef_food_budget', v)} />
              <NumField label="Head Chef Fee" value={draft.head_chef_fee} onChange={v => update('head_chef_fee', v)} />
              <NumField label="Sous Chef Fee" value={draft.sous_chef_fee} onChange={v => update('sous_chef_fee', v)} />
              <NumField label="Servers / Bartenders / FOH" value={draft.staffing_cost} onChange={v => update('staffing_cost', v)} />
              <NumField label="Beverage Cost" value={draft.beverage_cost} onChange={v => update('beverage_cost', v)} />
              <NumField label="Travel Expenses" value={draft.other_travel_cost} onChange={v => update('other_travel_cost', v)} />
              <NumField label="Florals" value={draft.florals_cost} onChange={v => update('florals_cost', v)} />
              <NumField label="Printed Menus" value={draft.printed_menus_cost} onChange={v => update('printed_menus_cost', v)} />
              <NumField label="Rentals" value={draft.rental_cost} onChange={v => update('rental_cost', v)} />
              <NumField label="Delivery" value={draft.delivery_cost} onChange={v => update('delivery_cost', v)} />
              <NumField label="Other Costs" value={draft.other_expenses} onChange={v => update('other_expenses', v)} />
            </div>
          </div>

          {/* Live P&L Preview */}
          <div className="bg-secondary/40 rounded-xl p-4">
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">Live P&L Preview</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              {[
                { label: 'Billable Revenue', val: pnl.billableRevenue },
                { label: 'Excluded Charges', val: pnl.excludedCharges, muted: true },
                { label: 'Client Total', val: pnl.clientTotal, muted: true },
                { label: 'Total Costs', val: pnl.totalEventCosts },
                { label: 'Gross Profit', val: pnl.grossProfit, bold: true, color: pnl.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600' },
                { label: 'Gross Margin', text: `${pnl.grossMarginPct.toFixed(1)}%`, bold: true, color: pnl.grossMarginPct >= 30 ? 'text-emerald-600' : pnl.grossMarginPct >= 15 ? 'text-amber-600' : 'text-red-600' },
                { label: 'Invoice Total (ref)', val: grandTotal, muted: true },
                { label: 'Total Match', text: grandTotal > 0 ? (clientTotalMatch ? '✓ Match' : '✗ Mismatch') : '—', bold: false, color: grandTotal > 0 ? (clientTotalMatch ? 'text-emerald-600' : 'text-red-600') : '' },
              ].map((row, i) => (
                <div key={i} className={`p-2 rounded-lg bg-card ${row.bold ? 'ring-1 ring-border' : ''}`}>
                  <p className="text-xs text-muted-foreground">{row.label}</p>
                  <p className={`font-medium text-sm mt-0.5 ${row.color || ''} ${row.muted ? 'text-muted-foreground' : ''}`}>
                    {row.text || formatCurrency(row.val || 0)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Chef matching */}
          <div className="flex flex-wrap gap-3">
            {draft.head_chef_name && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${headMatched ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                {headMatched ? <CheckCircle2 size={14} className="text-emerald-600" /> : <AlertTriangle size={14} className="text-red-500" />}
                <span>Head: <strong>{draft.head_chef_name}</strong></span>
                <Badge className={headMatched ? 'bg-emerald-100 text-emerald-700 border-0 text-xs' : 'bg-red-100 text-red-700 border-0 text-xs'}>{headMatched ? 'Matched' : 'Not found'}</Badge>
                <span className="text-muted-foreground">{formatCurrency(draft.head_chef_fee || 0)}</span>
              </div>
            )}
            {draft.sous_chef_name && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${sousMatched ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                {sousMatched ? <CheckCircle2 size={14} className="text-emerald-600" /> : <AlertTriangle size={14} className="text-red-500" />}
                <span>Sous: <strong>{draft.sous_chef_name}</strong></span>
                <Badge className={sousMatched ? 'bg-emerald-100 text-emerald-700 border-0 text-xs' : 'bg-red-100 text-red-700 border-0 text-xs'}>{sousMatched ? 'Matched' : 'Not found'}</Badge>
                <span className="text-muted-foreground">{formatCurrency(draft.sous_chef_fee || 0)}</span>
              </div>
            )}
          </div>

          {/* ── Commissions ── */}
          <CommissionSection draft={draft} update={update} teamMembers={teamMembers} pnl={pnl} />

          {/* ── Payments preview ── */}
          <PaymentsPreview draft={draft} update={update} />
        </div>
      )}
    </Card>
  );
}

// ── Commission section ─────────────────────────────────────────────────────────
function CommissionSection({ draft, update, teamMembers, pnl }) {
  const closers   = teamMembers.filter(m => m.active !== false && (m.roles || []).includes('Closer'));
  const facMembers = teamMembers.filter(m => m.active !== false && (m.roles || []).includes('Facilitator'));
  const allActive  = teamMembers.filter(m => m.active !== false);

  const facilitators = useMemo(() => normalizeFacilitators(draft), [draft.facilitators, draft.facilitator_id]);

  const updateFacilitators = (facs) => update('facilitators', facs);

  const addFacilitator = () => {
    if (facilitators.length === 0) {
      updateFacilitators([{ team_member_id: '', split_pct: 100 }]);
      return;
    }
    const sum = facilitators.reduce((s, f) => s + (Number(f.split_pct) || 0), 0);
    const remaining = Math.max(0, Math.round((100 - sum) * 100) / 100);
    updateFacilitators([...facilitators, { team_member_id: '', split_pct: remaining }]);
  };

  const removeFacilitator = (idx) => {
    let next = facilitators.filter((_, i) => i !== idx);
    if (next.length === 1) next = [{ ...next[0], split_pct: 100 }];
    updateFacilitators(next);
  };

  const updateFacRow = (idx, field, val) => {
    let next = facilitators.map((f, i) => i === idx ? { ...f, [field]: val } : f);
    if (field === 'split_pct' && next.length === 1) next = [{ ...next[0], split_pct: 100 }];
    updateFacilitators(next);
  };

  const splitSum = facilitators.reduce((s, f) => s + (Number(f.split_pct) || 0), 0);
  const splitWarning = facilitators.length > 1 && Math.abs(splitSum - 100) > 0.01;

  const hasSplitSource = !!(draft.source_rep_id && draft.source_rep_id !== draft.closer_id);
  const currentRates = draft.lead_type ? COMMISSION_RATES[draft.lead_type] : null;

  const comm = useMemo(
    () => computeCommission({ ...draft, facilitators }, pnl.commissionableProfit, teamMembers),
    [draft, facilitators, pnl.commissionableProfit, teamMembers]
  );

  const isProfit = comm.finalNetProfit >= 0;

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Commissions</h4>

      {/* Attribution fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Lead Type</label>
          <Select value={draft.lead_type || NONE} onValueChange={v => update('lead_type', v === NONE ? '' : v)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Select…</SelectItem>
              {LEAD_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          {currentRates && <p className="text-xs text-muted-foreground/70 mt-0.5">Sales {currentRates.closerPct}% · Execution {currentRates.facPct}%</p>}
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Sales Specialist</label>
          <Select value={draft.closer_id || NONE} onValueChange={v => update('closer_id', v === NONE ? '' : v)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Select…</SelectItem>
              {closers.map(m => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name || ''}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Execution Specialists */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-muted-foreground">Execution Specialist(s)</label>
          <button type="button" onClick={addFacilitator} className="text-xs text-gold hover:text-gold/80 flex items-center gap-0.5">
            <Plus size={11} /> Add
          </button>
        </div>
        <div className="space-y-2">
          {facilitators.map((f, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Select
                value={f.team_member_id || NONE}
                onValueChange={v => updateFacRow(idx, 'team_member_id', v === NONE ? '' : v)}
              >
                <SelectTrigger className="h-8 text-sm flex-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Select…</SelectItem>
                  {facMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name || ''}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={facilitators.length === 1 ? 100 : (f.split_pct ?? '')}
                onChange={e => updateFacRow(idx, 'split_pct', Number(e.target.value) || 0)}
                disabled={facilitators.length === 1}
                className="w-16 h-8 text-sm"
                placeholder="100"
              />
              <span className="text-xs text-muted-foreground shrink-0">%</span>
              <button type="button" onClick={() => removeFacilitator(idx)} className="text-muted-foreground hover:text-destructive shrink-0"><X size={13} /></button>
            </div>
          ))}
          {facilitators.length === 0 && (
            <button type="button" onClick={addFacilitator} className="w-full h-8 border border-dashed border-border rounded-md text-xs text-muted-foreground hover:border-gold hover:text-gold transition-colors">
              + Add execution specialist
            </button>
          )}
        </div>
        {splitWarning && (
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
            <AlertTriangle size={11} /> Split %s sum to {splitSum.toFixed(0)}% (should be 100%)
          </div>
        )}
      </div>

      {/* Referral Source */}
      <div>
        <label className="text-xs text-muted-foreground block mb-1">Referral Source <span className="text-muted-foreground/50">(optional)</span></label>
        <div className="flex gap-2">
          <Select value={draft.source_rep_id || NONE} onValueChange={v => update('source_rep_id', v === NONE ? null : v)}>
            <SelectTrigger className="h-8 text-sm flex-1"><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>None</SelectItem>
              {allActive.map(m => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name || ''}</SelectItem>)}
            </SelectContent>
          </Select>
          {hasSplitSource && (
            <div className="flex items-center gap-1.5 shrink-0">
              <Input type="number" value={draft.source_split_pct ?? 40} onChange={e => update('source_split_pct', Number(e.target.value) || 40)} className="w-16 h-8 text-sm" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">% source</span>
            </div>
          )}
        </div>
      </div>

      {/* Commission preview */}
      <div className={`rounded-lg p-3 space-y-2 ${isProfit ? 'bg-emerald-50/60 border border-emerald-200' : 'bg-red-50/60 border border-red-200'}`}>
        {comm.incomplete ? (
          <p className="text-xs text-muted-foreground italic text-center py-1">Set lead type and specialists to calculate commission</p>
        ) : (
          <>
            {comm.splitInvalid && (
              <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                <AlertTriangle size={11} /> Facilitator split %s must total 100%
              </div>
            )}
            <div className="flex justify-between text-xs text-muted-foreground border-b border-border/40 pb-1.5">
              <span>Commissionable Profit</span>
              <span className="font-medium text-foreground">{formatCurrency(pnl.commissionableProfit)}</span>
            </div>
            <div className="space-y-1">
              {comm.lines.map((line, i) => (
                <div key={i} className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-sm font-medium">{line.team_member_name}</span>
                    <p className="text-[11px] text-muted-foreground">{line.role} · {line.rate_pct}%</p>
                  </div>
                  <span className="text-sm font-medium shrink-0">{formatCurrency(line.amount)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm border-t border-border/40 pt-1.5">
              <span className="text-muted-foreground">Total Commission</span>
              <span className="font-medium">{formatCurrency(comm.totalCommission)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <div className="flex items-center gap-1.5">
                {isProfit ? <TrendingUp size={13} className="text-emerald-600" /> : <TrendingDown size={13} className="text-red-500" />}
                <span className="text-xs text-muted-foreground">Net after commission</span>
              </div>
              <span className={`font-heading text-base font-bold ${isProfit ? 'text-emerald-700' : 'text-red-600'}`}>{formatCurrency(comm.finalNetProfit)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Payments preview ───────────────────────────────────────────────────────────
function PaymentsPreview({ draft }) {
  // Show chef payment obligations based on chef fees entered above
  const chefRows = [];
  if (draft.head_chef_name) chefRows.push({ label: draft.head_chef_name, sublabel: 'Head Chef', amount: draft.head_chef_fee || 0 });
  if (draft.sous_chef_name) chefRows.push({ label: draft.sous_chef_name, sublabel: 'Sous Chef', amount: draft.sous_chef_fee || 0 });

  if (chefRows.length === 0) return null;

  return (
    <div className="border-t border-border pt-4">
      <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Payments</h4>
      <p className="text-xs text-muted-foreground/70 mb-3">All obligations default to Unpaid — mark as paid after the event.</p>
      <div className="space-y-2">
        {chefRows.map((row, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
            <div>
              <p className="text-sm font-medium">{row.label}</p>
              <p className="text-xs text-muted-foreground">{row.sublabel}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium tabular-nums">{formatCurrency(row.amount)}</span>
              <span className="text-xs text-muted-foreground bg-secondary rounded px-1.5 py-0.5">Unpaid</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground/60 mt-2 italic">Commission obligations generated on Confirm.</p>
    </div>
  );
}