import React, { useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/hooks/useAppData';
import { useEvents } from '@/hooks/useAppData';
import { Lock, Unlock, TrendingUp, TrendingDown, Users2, Info, Plus, X, AlertTriangle } from 'lucide-react';
import { computeCommission, COMMISSION_RATES, LEAD_TYPES, normalizeFacilitators, runWorkedExamples } from '@/lib/commissionUtils';

const NONE = '__none__';

function Toggle({ on, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!on)}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none ${on ? 'bg-gold' : 'bg-muted'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}

export default function EventAttribution({ draft, update, teamMembers, netProfit, onManageTeam, onFinalize, onReopen }) {
  const { data: events } = useEvents();

  useEffect(() => { runWorkedExamples(); }, []);

  const closers   = teamMembers.filter(m => m.active !== false && (m.roles || []).includes('Closer'));
  const facMembers = teamMembers.filter(m => m.active !== false && (m.roles || []).includes('Facilitator'));
  const allActive  = teamMembers.filter(m => m.active !== false);

  // Normalize facilitators array (migrate legacy facilitator_id)
  const facilitators = useMemo(() => normalizeFacilitators(draft), [draft.facilitators, draft.facilitator_id]);

  const updateFacilitators = (newFacs) => update('facilitators', newFacs);

  const addFacilitator = () => {
    if (facilitators.length === 0) {
      updateFacilitators([{ team_member_id: '', split_pct: 100 }]);
      return;
    }
    const sum = facilitators.reduce((s, f) => s + (Number(f.split_pct) || 0), 0);
    const remaining = Math.max(0, roundPct(100 - sum));
    updateFacilitators([...facilitators, { team_member_id: '', split_pct: remaining }]);
  };

  const removeFacilitator = (idx) => {
    let next = facilitators.filter((_, i) => i !== idx);
    if (next.length === 1) {
      next = [{ ...next[0], split_pct: 100 }];
    }
    updateFacilitators(next);
  };

  const updateFacRow = (idx, field, val) => {
    let next = facilitators.map((f, i) => i === idx ? { ...f, [field]: val } : f);
    if (field === 'split_pct' && next.length === 1) {
      next = [{ ...next[0], split_pct: 100 }];
    }
    updateFacilitators(next);
  };

  const splitSum = facilitators.reduce((s, f) => s + (Number(f.split_pct) || 0), 0);
  const splitWarning = facilitators.length > 1 && Math.abs(splitSum - 100) > 0.01;

  function roundPct(n) {
    return Math.round(n * 100) / 100;
  }

  const hasSplitSource = !!(draft.source_rep_id && draft.source_rep_id !== draft.closer_id);
  const isFinalized    = draft.commission_status === 'Finalized';

  const isRepeatClient = useMemo(() => {
    if (!draft.client_id) return false;
    return events.some(e => e.client_id === draft.client_id && e.id !== draft.id);
  }, [draft.client_id, draft.id, events]);

  const handleLeadTypeChange = (val) => {
    update('lead_type', val);
    if (val === 'House Account' && isRepeatClient && !draft.repeat_client_bonus) {
      update('repeat_client_bonus', true);
    } else if (val !== 'House Account') {
      update('repeat_client_bonus', false);
    }
  };

  const comm = useMemo(
    () => computeCommission({ ...draft, facilitators }, netProfit, teamMembers),
    [draft, facilitators, netProfit, teamMembers]
  );

  const isProfit = comm.finalNetProfit >= 0;
  const currentRates = draft.lead_type ? COMMISSION_RATES[draft.lead_type] : null;

  return (
    <div className="space-y-4">
      {/* ── Attribution card ── */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Attribution</h4>
          <button
            type="button"
            onClick={onManageTeam}
            className="text-xs text-gold hover:text-gold/80 flex items-center gap-1 transition-colors"
          >
            <Users2 size={12} /> Manage team
          </button>
        </div>

        {/* Lead Type */}
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Lead Type</label>
          <Select value={draft.lead_type || NONE} onValueChange={v => handleLeadTypeChange(v === NONE ? '' : v)} disabled={isFinalized}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Select…</SelectItem>
              {LEAD_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          {currentRates && (
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              Rates: Sales {currentRates.closerPct}% · Execution {currentRates.facPct}%
            </p>
          )}
        </div>

        {/* Sales Specialist (Closer) */}
        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            Sales Specialist <span className="text-muted-foreground/50">(Closer)</span>
          </label>
          <Select
            value={draft.closer_id || NONE}
            onValueChange={v => update('closer_id', v === NONE ? '' : v)}
            disabled={isFinalized}
          >
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Select…</SelectItem>
              {closers.map(m => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name || ''}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Execution Specialists (Facilitators) — repeatable rows */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-muted-foreground">
              Execution Specialist(s) <span className="text-muted-foreground/50">(Facilitator)</span>
            </label>
            {!isFinalized && (
              <button
                type="button"
                onClick={addFacilitator}
                className="text-xs text-gold hover:text-gold/80 flex items-center gap-0.5 transition-colors"
              >
                <Plus size={11} /> Add
              </button>
            )}
          </div>

          <div className="space-y-2">
            {facilitators.map((f, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Select
                  value={f.team_member_id || NONE}
                  onValueChange={v => updateFacRow(idx, 'team_member_id', v === NONE ? '' : v)}
                  disabled={isFinalized}
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
                  disabled={isFinalized || facilitators.length === 1}
                  className="w-16 h-8 text-sm"
                  placeholder="100"
                />
                <span className="text-xs text-muted-foreground shrink-0">%</span>
                {!isFinalized && (
                  <button
                    type="button"
                    onClick={() => removeFacilitator(idx)}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            ))}

            {facilitators.length === 0 && !isFinalized && (
              <button
                type="button"
                onClick={addFacilitator}
                className="w-full h-8 border border-dashed border-border rounded-md text-xs text-muted-foreground hover:border-gold hover:text-gold transition-colors"
              >
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

        {/* Source Rep */}
        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            Referral Source <span className="font-normal text-muted-foreground/50">(optional — if different from sales specialist)</span>
          </label>
          <div className="flex gap-2">
            <Select value={draft.source_rep_id || NONE} onValueChange={v => update('source_rep_id', v === NONE ? null : v)} disabled={isFinalized}>
              <SelectTrigger className="h-8 text-sm flex-1"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {allActive.map(m => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name || ''}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasSplitSource && (
              <div className="flex items-center gap-1.5 shrink-0">
                <Input
                  type="number"
                  value={draft.source_split_pct ?? 40}
                  onChange={e => update('source_split_pct', Number(e.target.value) || 40)}
                  disabled={isFinalized}
                  className="w-16 h-8 text-sm"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">% source</span>
              </div>
            )}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-2 pt-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Repeat Client Bonus <span className="text-gold font-medium">+$100</span></p>
              {isRepeatClient && draft.lead_type === 'House Account' && (
                <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                  <Info size={10} /> Repeat client detected — bonus auto-suggested
                </p>
              )}
            </div>
            <Toggle on={!!draft.repeat_client_bonus} onChange={v => update('repeat_client_bonus', v)} disabled={isFinalized} />
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Apply Min Floor <span className="font-medium">($50 closer)</span></p>
              <p className="text-xs text-muted-foreground/60">Manual override for uncontrollable margin erosion</p>
            </div>
            <Toggle on={!!draft.apply_min_floor} onChange={v => update('apply_min_floor', v)} disabled={isFinalized} />
          </div>
        </div>
      </Card>

      {/* ── Commission card ── */}
      <Card className={`p-4 space-y-3 ${
        isFinalized
          ? 'border-amber-300 bg-amber-50/30'
          : isProfit
            ? 'bg-emerald-50/40 border-emerald-200'
            : 'bg-red-50/40 border-red-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isFinalized && <Lock size={13} className="text-amber-600" />}
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Commission</h4>
            {isFinalized && (
              <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-300 px-1.5 py-0">Locked</Badge>
            )}
          </div>
          {!comm.incomplete && !comm.splitInvalid && (
            isFinalized ? (
              <Button size="sm" variant="ghost" className="h-6 text-xs text-muted-foreground hover:text-foreground" onClick={onReopen}>
                <Unlock size={11} className="mr-1" /> Reopen
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="h-6 text-xs" onClick={onFinalize}>
                <Lock size={11} className="mr-1" /> Finalize
              </Button>
            )
          )}
        </div>

        {comm.incomplete ? (
          <p className="text-sm text-muted-foreground text-center py-3 italic">
            Set lead type and specialists to calculate commission
          </p>
        ) : (
          <>
            {comm.splitInvalid && (
              <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                <AlertTriangle size={11} /> Fix facilitator split %s (must total 100%) before finalizing
              </div>
            )}
            {/* Commissionable Profit */}
            <div className="flex justify-between text-xs text-muted-foreground pb-1.5 border-b border-border/40">
              <span>Commissionable Profit</span>
              <span className="font-medium text-foreground">{formatCurrency(netProfit)}</span>
            </div>

            {/* Itemized lines */}
            <div className="space-y-1.5">
              {comm.lines.map((line, i) => {
                const isExec = line.role === 'Facilitator';
                const effectivePct = isExec
                  ? `${line.rate_pct}% × ${line.split_pct}%`
                  : `${line.rate_pct}%`;
                const roleLabel = line.role === 'Closer'
                  ? 'Sales Specialist (Closer)'
                  : line.role === 'Facilitator'
                    ? 'Execution Specialist (Facilitator)'
                    : 'Referral Source';
                return (
                  <div key={i} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-sm font-medium">{line.team_member_name}</span>
                      <p className="text-[11px] text-muted-foreground">{roleLabel} · {effectivePct}</p>
                    </div>
                    <span className="text-sm font-medium shrink-0">{formatCurrency(line.amount)}</span>
                  </div>
                );
              })}
            </div>

            {/* Execution subtotal if multiple facilitators */}
            {comm.lines.filter(l => l.role === 'Facilitator').length > 1 && (
              <div className="flex justify-between text-xs text-muted-foreground border-t border-border/30 pt-1.5">
                <span>Execution Subtotal</span>
                <span className="font-medium text-foreground">{formatCurrency(comm.facAmount)}</span>
              </div>
            )}

            <div className="pt-2 border-t border-border/50 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Commission</span>
                <span className="font-medium">{formatCurrency(comm.totalCommission)}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <div className="flex items-center gap-1.5">
                  {isProfit
                    ? <TrendingUp size={13} className="text-emerald-600" />
                    : <TrendingDown size={13} className="text-red-500" />
                  }
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Net Profit after Commission</span>
                </div>
                <span className={`font-heading text-xl font-bold ${isProfit ? 'text-emerald-700' : 'text-red-600'}`}>
                  {formatCurrency(comm.finalNetProfit)}
                </span>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}