import React from 'react';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/hooks/useAppData';
import { TrendingUp, TrendingDown, DollarSign, Percent, Users, Calendar, Coins } from 'lucide-react';

const BENCHMARKS = {
  avgEventProfit: 1500,
  monthlyBreakEven: 28000,
  monthlyHealthy: 36000,
  eventsBreakEven: 24,
  eventsTarget: 30,
};

function StatCard({ label, value, sub, color = 'default', icon: IconComp, progress }) {
  const Icon = IconComp;
  const colors = {
    default: 'text-foreground',
    emerald: 'text-emerald-600',
    red: 'text-red-500',
    gold: 'text-gold',
    blue: 'text-blue-600',
  };
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">{label}</p>
          <p className={`font-heading text-2xl font-bold ${colors[color]}`}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          {progress && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{progress.label}</span>
                <span>{Math.round(progress.pct)}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${progress.pct >= 100 ? 'bg-emerald-500' : progress.pct >= 70 ? 'bg-gold' : 'bg-red-400'}`}
                  style={{ width: `${Math.min(100, progress.pct)}%` }}
                />
              </div>
            </div>
          )}
        </div>
        {Icon && <Icon size={18} className="text-muted-foreground/40 mt-0.5 shrink-0" />}
      </div>
    </Card>
  );
}

export default function ProfitSummaryCards({ pnlRows, commissionLines, isSingleMonth }) {
  const totalBillable  = pnlRows.reduce((s, r) => s + (r.billableRevenue || 0), 0);
  const totalClientTotal = pnlRows.reduce((s, r) => s + (r.clientTotal || 0), 0);
  const totalGrossProfit = pnlRows.reduce((s, r) => s + (r.grossProfit || 0), 0);
  const totalNetProfit = pnlRows.reduce((s, r) => s + (r.netProfit || 0), 0);
  const grossMarginPct = totalBillable > 0 ? (totalGrossProfit / totalBillable) * 100 : 0;
  const netMarginPct   = totalBillable > 0 ? (totalNetProfit / totalBillable) * 100 : 0;
  const eventCount     = pnlRows.length;

  const pendingComm   = commissionLines.filter(l => l.status === 'Pending').reduce((s, l) => s + (l.amount || 0), 0);
  const finalizedComm = commissionLines.filter(l => l.status === 'Finalized').reduce((s, l) => s + (l.amount || 0), 0);
  const totalComm     = pendingComm + finalizedComm;

  const profitColor = totalNetProfit >= 0 ? 'emerald' : 'red';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      <StatCard
        label="Billable Revenue"
        value={formatCurrency(totalBillable)}
        sub={`Client Total ${formatCurrency(totalClientTotal)} (incl. excluded)`}
        icon={DollarSign}
      />
      <StatCard
        label="Gross Profit"
        value={formatCurrency(totalGrossProfit)}
        sub={`${grossMarginPct.toFixed(1)}% gross margin`}
        color={totalGrossProfit >= 0 ? 'emerald' : 'red'}
        icon={TrendingUp}
      />
      <StatCard
        label="Net Profit"
        value={formatCurrency(totalNetProfit)}
        sub={`${netMarginPct.toFixed(1)}% net margin (after commissions)`}
        color={profitColor}
        icon={totalNetProfit >= 0 ? TrendingUp : TrendingDown}
        progress={isSingleMonth ? {
          label: `vs ${formatCurrency(BENCHMARKS.monthlyBreakEven)} break-even`,
          pct: BENCHMARKS.monthlyBreakEven > 0 ? (totalNetProfit / BENCHMARKS.monthlyBreakEven) * 100 : 0,
        } : null}
      />
      <StatCard
        label="Events"
        value={eventCount}
        sub={isSingleMonth ? `Break-even ${BENCHMARKS.eventsBreakEven} · Target ${BENCHMARKS.eventsTarget}` : 'in period'}
        icon={Calendar}
        progress={isSingleMonth ? {
          label: `vs ${BENCHMARKS.eventsTarget} target`,
          pct: BENCHMARKS.eventsTarget > 0 ? (eventCount / BENCHMARKS.eventsTarget) * 100 : 0,
        } : null}
      />
      <StatCard
        label="Commissions Owed"
        value={formatCurrency(totalComm)}
        sub={`${formatCurrency(pendingComm)} pending · ${formatCurrency(finalizedComm)} finalized`}
        icon={Coins}
        color="blue"
      />
    </div>
  );
}