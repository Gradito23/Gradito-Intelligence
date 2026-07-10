import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/hooks/useAppData';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function FoodBeverageSection({ pnlRows }) {
  const totals = useMemo(() => ({
    foodRevenue: pnlRows.reduce((s, r) => s + (r.event.food_revenue || 0), 0),
    foodBudget:  pnlRows.reduce((s, r) => s + (r.event.chef_food_budget || 0), 0),
    foodProfit:  pnlRows.reduce((s, r) => s + r.foodProfitability, 0),
    bevRevenue:  pnlRows.reduce((s, r) => s + (r.event.beverage_revenue || 0), 0),
    bevCost:     pnlRows.reduce((s, r) => s + (r.event.beverage_cost || 0), 0),
    bevProfit:   pnlRows.reduce((s, r) => s + r.beverageProfitability, 0),
  }), [pnlRows]);

  const varianceRows = useMemo(() =>
    pnlRows
      .filter(r => (r.event.food_cost_actual || 0) > 0)
      .map(r => ({
        event: r.event,
        budget: r.event.chef_food_budget || 0,
        actual: r.event.food_cost_actual || 0,
        variance: (r.event.chef_food_budget || 0) - (r.event.food_cost_actual || 0),
      }))
      .sort((a, b) => a.variance - b.variance),
  [pnlRows]);

  const summaryData = [
    { name: 'Food Rev', foodRev: totals.foodRevenue, foodBudget: totals.foodBudget, foodProfit: totals.foodProfit },
    { name: 'Beverage', bevRev: totals.bevRevenue, bevCost: totals.bevCost, bevProfit: totals.bevProfit },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">Food & Beverage Profitability</h4>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={summaryData}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={v => formatCurrency(v)} />
            <Bar dataKey="foodRev" fill="#14213D" radius={[4,4,0,0]} name="Food Revenue" />
            <Bar dataKey="foodBudget" fill="#B8924F" radius={[4,4,0,0]} name="Food Budget" />
            <Bar dataKey="foodProfit" fill="#10B981" radius={[4,4,0,0]} name="Food Profit" />
            <Bar dataKey="bevRev" fill="#3B82F6" radius={[4,4,0,0]} name="Bev Revenue" />
            <Bar dataKey="bevCost" fill="#F59E0B" radius={[4,4,0,0]} name="Bev Cost" />
            <Bar dataKey="bevProfit" fill="#8B5CF6" radius={[4,4,0,0]} name="Bev Profit" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Card className="p-4 space-y-1.5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Food</p>
          <div className="flex justify-between"><span className="text-muted-foreground">Revenue</span><span className="font-medium">{formatCurrency(totals.foodRevenue)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Chef Budget</span><span className="font-medium">{formatCurrency(totals.foodBudget)}</span></div>
          <div className="flex justify-between border-t pt-1.5"><span className="font-medium">Profitability</span><span className={`font-heading font-bold ${totals.foodProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(totals.foodProfit)}</span></div>
        </Card>
        <Card className="p-4 space-y-1.5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Beverage</p>
          <div className="flex justify-between"><span className="text-muted-foreground">Revenue</span><span className="font-medium">{formatCurrency(totals.bevRevenue)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Cost</span><span className="font-medium">{formatCurrency(totals.bevCost)}</span></div>
          <div className="flex justify-between border-t pt-1.5"><span className="font-medium">Profitability</span><span className={`font-heading font-bold ${totals.bevProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(totals.bevProfit)}</span></div>
        </Card>
      </div>

      {varianceRows.length > 0 && (
        <div>
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Food Variance (events with actuals)</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium text-muted-foreground">Event</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Budget</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actual</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Over / Under</th>
                </tr>
              </thead>
              <tbody>
                {varianceRows.map(r => (
                  <tr key={r.event.id} className="border-b hover:bg-muted/30">
                    <td className="p-3">
                      <p className="font-medium">{r.event.client_name}</p>
                      <p className="text-xs text-muted-foreground">{r.event.date}</p>
                    </td>
                    <td className="p-3 text-right">{formatCurrency(r.budget)}</td>
                    <td className="p-3 text-right">{formatCurrency(r.actual)}</td>
                    <td className={`p-3 text-right font-medium ${r.variance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {r.variance >= 0 ? '+' : ''}{formatCurrency(r.variance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {varianceRows.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">No events with food_cost_actual recorded in this period.</p>
      )}
    </div>
  );
}