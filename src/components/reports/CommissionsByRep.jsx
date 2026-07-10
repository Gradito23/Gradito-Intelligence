import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, useEvents } from '@/hooks/useAppData';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { FileSpreadsheet, FileText } from 'lucide-react';
import PayoutStatement from './PayoutStatement';
import { exportPayoutsXlsx } from '@/lib/exportPayouts';

function buildRows(commissionLines, teamMembers) {
  const map = {};
  commissionLines.forEach(line => {
    const id = line.team_member_id;
    if (!map[id]) {
      const member = teamMembers.find(m => m.id === id);
      map[id] = {
        id,
        name: member ? `${member.first_name} ${member.last_name || ''}`.trim() : (line.team_member_name || 'Unknown'),
        events: new Set(),
        total: 0,
        pending: 0,
        finalized: 0,
        byRole: {},
      };
    }
    map[id].events.add(line.event_id);
    map[id].total += line.amount || 0;
    if (line.status === 'Pending')   map[id].pending   += line.amount || 0;
    if (line.status === 'Finalized') map[id].finalized += line.amount || 0;
    const role = line.role || 'Other';
    map[id].byRole[role] = (map[id].byRole[role] || 0) + (line.amount || 0);
  });
  return Object.values(map)
    .map(r => ({ ...r, eventCount: r.events.size }))
    .sort((a, b) => b.total - a.total);
}

export default function CommissionsByRep({ commissionLines, teamMembers, periodLabel, periodKey }) {
  const [finalizedOnly, setFinalizedOnly] = useState(false);
  const [showStatement, setShowStatement] = useState(false);
  const { data: events } = useEvents();

  const activeLines = useMemo(
    () => finalizedOnly ? commissionLines.filter(l => l.status === 'Finalized') : commissionLines,
    [commissionLines, finalizedOnly]
  );

  const rows = useMemo(() => buildRows(activeLines, teamMembers), [activeLines, teamMembers]);

  if (rows.length === 0 && commissionLines.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No commission data for this period.</p>;
  }

  const handleExport = () => {
    exportPayoutsXlsx({
      rows,
      commissionLines: activeLines,
      events,
      periodLabel,
      periodKey,
      finalizedOnly,
    });
  };

  return (
    <>
      {showStatement && (
        <PayoutStatement
          rows={rows}
          commissionLines={activeLines}
          events={events}
          periodLabel={periodLabel}
          onClose={() => setShowStatement(false)}
        />
      )}

      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1 text-sm">
            <button
              type="button"
              onClick={() => setFinalizedOnly(false)}
              className={`px-3 py-1.5 rounded-md transition-colors font-medium ${!finalizedOnly ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFinalizedOnly(true)}
              className={`px-3 py-1.5 rounded-md transition-colors font-medium ${finalizedOnly ? 'bg-card shadow text-emerald-600' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Finalized only
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowStatement(true)}>
              <FileText size={15} /> View Payout Statement
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
              <FileSpreadsheet size={15} /> Export (.xlsx)
            </Button>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No finalized commissions for this period.</p>
        ) : (
          <>
            <Card className="p-4">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">
                Commission by Rep {finalizedOnly && <span className="text-emerald-600">(Finalized only)</span>}
              </h4>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={rows.map(r => ({ name: r.name.split(' ')[0], pending: r.pending, finalized: r.finalized }))}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v.toFixed(0)}`} />
                  <Tooltip formatter={v => formatCurrency(v)} />
                  <Bar dataKey="finalized" fill="#10B981" radius={[0, 0, 0, 0]} name="Finalized" stackId="a" />
                  <Bar dataKey="pending" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Pending" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium text-muted-foreground">Rep</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Events</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Total Commission</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Pending</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Payable Now</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">By Role</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{r.name}</td>
                      <td className="p-3 text-right">{r.eventCount}</td>
                      <td className="p-3 text-right font-heading font-bold">{formatCurrency(r.total)}</td>
                      <td className="p-3 text-right text-amber-600">{formatCurrency(r.pending)}</td>
                      <td className="p-3 text-right text-emerald-600 font-medium">{formatCurrency(r.finalized)}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(r.byRole).map(([role, amt]) => (
                            <Badge key={role} variant="outline" className="text-xs">{role}: {formatCurrency(amt)}</Badge>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}