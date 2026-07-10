import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/hooks/useAppData';
import { TrendingUp, TrendingDown } from 'lucide-react';

function SummaryRow({ label, value, valueClass, sub }) {
  return (
    <div className="flex items-start justify-between py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground leading-tight">{label}</span>
      <div className="text-right ml-4">
        <span className={`text-sm font-medium ${valueClass || ''}`}>{value}</span>
        {sub && <p className="text-xs text-muted-foreground/60">{sub}</p>}
      </div>
    </div>
  );
}

function SectionDivider({ label }) {
  return (
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold pt-2 pb-0.5">{label}</p>
  );
}

export default function EventSummary({ pnl, comm, teamMembers, event, assignments, commissionLines, vendors }) {
  if (!pnl) return null;

  const isProfit = pnl.netProfit >= 0;
  const commIncomplete = !comm || comm.incomplete;

  // Payment summary
  const eventAssignments = assignments || [];
  const eventCommLines = (commissionLines || []).filter(cl => event && cl.event_id === event.id);
  const eventVendors = vendors || [];
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
  eventVendors.forEach(v => {
    totalOwed += v.amount_owed || 0;
    if (v.payment_status === 'Paid') totalPaid += v.amount_owed || 0;
  });
  const outstanding = totalOwed - totalPaid;
  const fullyPaid = totalOwed > 0 && outstanding === 0;

  const closerLine = comm && !comm.incomplete ? comm.lines.find(l => l.role === 'Closer') : null;
  const facLines   = comm && !comm.incomplete ? comm.lines.filter(l => l.role === 'Facilitator') : [];
  const sourceRep  = comm && !comm.incomplete ? comm.lines.find(l => l.role === 'Source Rep') : null;

  return (
    <Card className={`p-4 space-y-1 ${isProfit ? 'bg-emerald-50/50 border-emerald-200' : 'bg-red-50/50 border-red-200'}`}>
      {/* PV ID prominent identifier */}
      {event?.perfect_venue_id && (
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/40">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">PV ID</span>
          <span className="font-mono text-sm font-bold text-foreground">{event.perfect_venue_id}</span>
        </div>
      )}
      {!event?.perfect_venue_id && (
        <div className="mb-2 pb-2 border-b border-amber-300/60">
          <span className="text-xs text-amber-600 font-medium">⚠ Perfect Venue ID missing</span>
        </div>
      )}
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Event Summary</h4>
        <div className="flex items-center gap-1.5">
          {isProfit ? <TrendingUp size={14} className="text-emerald-600" /> : <TrendingDown size={14} className="text-red-500" />}
          <span className={`font-heading font-bold text-base ${isProfit ? 'text-emerald-700' : 'text-red-600'}`}>
            {formatCurrency(pnl.netProfit)}
          </span>
          <span className={`text-xs ${isProfit ? 'text-emerald-600' : 'text-red-500'}`}>
            ({pnl.netMarginPct.toFixed(1)}%)
          </span>
        </div>
      </div>

      <SectionDivider label="Financials" />
      <SummaryRow label="Billable Revenue"      value={formatCurrency(pnl.billableRevenue)} />
      <SummaryRow label="Total Event Costs"     value={`−${formatCurrency(pnl.totalEventCosts)}`} />
      <SummaryRow label="Gross Profit"          value={formatCurrency(pnl.grossProfit)}
        valueClass={pnl.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600'} />
      <SummaryRow label="Commissionable Profit" value={formatCurrency(pnl.commissionableProfit)} sub="Gross − Admin Fee" />

      <SectionDivider label="Commission" />
      {commIncomplete ? (
        <p className="text-xs text-muted-foreground italic py-1">Set lead type, sales & execution specialists to calculate</p>
      ) : (
        <>
          {closerLine && (
            <SummaryRow
              label={`Sales Specialist (${closerLine.team_member_name})`}
              value={formatCurrency(closerLine.amount)}
            />
          )}
          {facLines.map((fl, i) => (
            <SummaryRow
              key={i}
              label={`Execution Specialist (${fl.team_member_name})${facLines.length > 1 ? ` · ${fl.split_pct}%` : ''}`}
              value={formatCurrency(fl.amount)}
            />
          ))}
          {sourceRep && (
            <SummaryRow label={`Referral Source (${sourceRep.team_member_name})`} value={formatCurrency(sourceRep.amount)} />
          )}
          <SummaryRow label="Total Commission Owed" value={formatCurrency(comm.totalCommission)} valueClass="font-semibold" />
        </>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-border/40 mt-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Net Profit</span>
        <div className="text-right">
          <span className={`font-heading font-bold text-lg ${isProfit ? 'text-emerald-700' : 'text-red-600'}`}>
            {formatCurrency(pnl.netProfit)}
          </span>
          <span className={`ml-1.5 text-xs ${isProfit ? 'text-emerald-600' : 'text-red-500'}`}>
            {pnl.netMarginPct.toFixed(1)}% net margin
          </span>
        </div>
      </div>

      {/* Payments snapshot */}
      {totalOwed > 0 && (
        <>
          <SectionDivider label="Payments" />
          <SummaryRow label="Total Owed" value={formatCurrency(totalOwed)} />
          <SummaryRow label="Paid" value={formatCurrency(totalPaid)} valueClass="text-emerald-700" />
          <SummaryRow label="Outstanding" value={formatCurrency(outstanding)} valueClass={outstanding > 0 ? 'text-amber-700' : 'text-emerald-700'} />
          <div className="flex items-center justify-between pt-1.5">
            <span className="text-xs text-muted-foreground">Financial Status</span>
            <Badge className={fullyPaid
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 text-xs'
              : 'bg-amber-100 text-amber-800 border-amber-300 text-xs'
            }>
              {fullyPaid ? 'Fully Paid' : 'Outstanding Payments'}
            </Badge>
          </div>
        </>
      )}
    </Card>
  );
}