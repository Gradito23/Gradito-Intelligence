import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/hooks/useAppData';

const STATUS_COLOR = { Pending: 'bg-amber-100 text-amber-700 border-amber-200', Finalized: 'bg-emerald-100 text-emerald-700 border-emerald-200', Forfeited: 'bg-muted text-muted-foreground' };

export default function CommissionsByEvent({ pnlRows, commissionLines }) {
  const rows = useMemo(() => {
    return pnlRows.map(r => {
      const lines = commissionLines.filter(l => l.event_id === r.event.id);
      const totalComm = lines.reduce((s, l) => s + (l.amount || 0), 0);
      return { event: r.event, netProfit: r.netProfit, lines, totalComm };
    }).filter(r => r.lines.length > 0).sort((a, b) => b.totalComm - a.totalComm);
  }, [pnlRows, commissionLines]);

  if (rows.length === 0) return <p className="text-sm text-muted-foreground py-8 text-center">No commission lines for this period.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-3 font-medium text-muted-foreground">Event</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Lead Type</th>
            <th className="text-right p-3 font-medium text-muted-foreground">Net Profit</th>
            <th className="text-right p-3 font-medium text-muted-foreground">Total Commission</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Rep Breakdown</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.event.id} className="border-b hover:bg-muted/30 align-top">
              <td className="p-3">
                <p className="font-medium">{r.event.client_name}</p>
                <p className="text-xs text-muted-foreground">{r.event.date}</p>
              </td>
              <td className="p-3">
                <span className="text-xs text-muted-foreground">{r.event.lead_type || '—'}</span>
              </td>
              <td className={`p-3 text-right font-medium ${r.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(r.netProfit)}</td>
              <td className="p-3 text-right font-heading font-bold">{formatCurrency(r.totalComm)}</td>
              <td className="p-3">
                <div className="space-y-1">
                  {r.lines.map(l => (
                    <div key={l.id} className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium">{l.team_member_name}</span>
                      <Badge variant="outline" className="text-xs px-1.5 py-0">{l.role}</Badge>
                      <span className="text-xs font-heading">{formatCurrency(l.amount)}</span>
                      <span className={`text-xs px-1.5 py-0 rounded-full border ${STATUS_COLOR[l.status] || ''}`}>{l.status}</span>
                    </div>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}