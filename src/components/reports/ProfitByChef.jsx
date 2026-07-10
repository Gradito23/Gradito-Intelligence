import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/hooks/useAppData';
import ChefAvatar from '@/components/ui/ChefAvatar';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const CHART_COLORS = ['#14213D', '#B8924F', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#EF4444'];

export default function ProfitByChef({ pnlRows, chefs, eventChefsFiltered }) {
  const rows = useMemo(() => {
    return chefs.map(chef => {
      const allAssignments = eventChefsFiltered.filter(ec => ec.chef_id === chef.id);
      const headAssignments = allAssignments.filter(ec => ec.role === 'Head');
      const eventsWorked = new Set(allAssignments.map(ec => ec.event_id)).size;
      const totalEarnings = allAssignments.reduce((s, ec) => s + (ec.fee || 0) + (ec.travel_fee_applied || 0), 0);

      // Head-only attribution to avoid double-counting
      const headEventIds = new Set(headAssignments.map(ec => ec.event_id));
      const netProfitGenerated = pnlRows
        .filter(r => headEventIds.has(r.event.id))
        .reduce((s, r) => s + r.netProfit, 0);

      const headRevenue = pnlRows
        .filter(r => headEventIds.has(r.event.id))
        .reduce((s, r) => s + r.totalClientSpend, 0);
      const avgMarginPct = headRevenue > 0 ? (netProfitGenerated / headRevenue) * 100 : 0;

      return { chef, eventsWorked, totalEarnings, netProfitGenerated, avgMarginPct, headEventCount: headEventIds.size };
    }).filter(r => r.eventsWorked > 0).sort((a, b) => b.netProfitGenerated - a.netProfitGenerated);
  }, [pnlRows, chefs, eventChefsFiltered]);

  if (rows.length === 0) return <p className="text-sm text-muted-foreground py-8 text-center">No chef data for this period.</p>;

  const chartData = rows.slice(0, 10).map(r => ({
    name: `${r.chef.first_name} ${(r.chef.last_name || '')[0] || ''}.`,
    profit: r.netProfitGenerated,
    earnings: r.totalEarnings,
  }));

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">Net Profit Generated (Head-Chef Events)</h4>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={v => formatCurrency(v)} />
            <Bar dataKey="profit" fill="#14213D" radius={[4, 4, 0, 0]} name="Net Profit" />
            <Bar dataKey="earnings" fill="#B8924F" radius={[4, 4, 0, 0]} name="Chef Earnings" />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground mt-2">* Profit attributed to Head chef only to avoid double-counting on multi-chef events.</p>
      </Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3 font-medium text-muted-foreground">Chef</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Events</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Earnings</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Net Profit (Head)</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Avg Margin</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.chef.id} className="border-b hover:bg-muted/30">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <ChefAvatar photoUrl={r.chef.photo_url} name={`${r.chef.first_name} ${r.chef.last_name || ''}`} size="xs" />
                    <span className="font-medium">{r.chef.first_name} {r.chef.last_name}</span>
                  </div>
                </td>
                <td className="p-3 text-right">{r.eventsWorked}</td>
                <td className="p-3 text-right">{formatCurrency(r.totalEarnings)}</td>
                <td className={`p-3 text-right font-medium ${r.netProfitGenerated >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(r.netProfitGenerated)}</td>
                <td className="p-3 text-right text-muted-foreground">{r.avgMarginPct.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}