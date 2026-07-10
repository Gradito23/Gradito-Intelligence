import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/hooks/useAppData';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const CHART_COLORS = ['#14213D', '#B8924F', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

// Generic breakdown by a string dimension (event_type or service_area)
export default function ProfitByDimension({ pnlRows, dimension, label, worstFirst = false }) {
  const rows = useMemo(() => {
    const map = {};
    pnlRows.forEach(r => {
      const key = r.event[dimension] || 'Unknown';
      if (!map[key]) map[key] = { key, events: 0, revenue: 0, netProfit: 0 };
      map[key].events += 1;
      map[key].revenue += (r.billableRevenue || 0);
      map[key].netProfit += (r.netProfit || 0);
    });
    return Object.values(map).map(d => ({
      ...d,
      marginPct: d.revenue > 0 ? (d.netProfit / d.revenue) * 100 : 0,
    })).sort((a, b) => worstFirst ? a.marginPct - b.marginPct : b.netProfit - a.netProfit);
  }, [pnlRows, dimension]);

  if (rows.length === 0) return <p className="text-sm text-muted-foreground py-8 text-center">No data for this period.</p>;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">{label}</h4>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={rows}>
            <XAxis dataKey="key" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={v => typeof v === 'number' ? formatCurrency(v) : v} />
            <Bar dataKey="revenue" fill="#14213D" radius={[4, 4, 0, 0]} name="Revenue" />
            <Bar dataKey="netProfit" fill="#10B981" radius={[4, 4, 0, 0]} name="Net Profit" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3 font-medium text-muted-foreground">{dimension === 'event_type' ? 'Type' : 'Area'}</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Events</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Billable Revenue</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Net Profit</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Margin %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(d => (
              <tr key={d.key} className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">{d.key}</td>
                <td className="p-3 text-right">{d.events}</td>
                <td className="p-3 text-right">{formatCurrency(d.revenue)}</td>
                <td className={`p-3 text-right font-medium ${d.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(d.netProfit)}</td>
                <td className={`p-3 text-right ${d.marginPct >= 30 ? 'text-emerald-600' : d.marginPct >= 15 ? 'text-gold' : 'text-red-500'}`}>{d.marginPct.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}