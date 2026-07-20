import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/hooks/useAppData';
import { ChevronDown, ChevronRight, Printer, X } from 'lucide-react';

const STATUS_PILL = {
  Finalized: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Pending: 'bg-amber-100 text-amber-700 border-amber-200',
  Forfeited: 'bg-muted text-muted-foreground border-border',
};

function RepCard({ rep, lines }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border rounded-xl overflow-hidden print:break-inside-avoid">
      <div className="bg-secondary/40 px-5 py-4 flex items-start justify-between gap-4">
        <div>
          <p className="font-heading text-lg font-bold text-navy">{rep.name}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.keys(rep.byRole).map(role => (
              <Badge key={role} variant="outline" className="text-xs">{role}</Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{rep.eventCount} event{rep.eventCount !== 1 ? 's' : ''}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Payable Now</p>
          <p className="font-heading text-2xl font-bold text-emerald-600">{formatCurrency(rep.finalized)}</p>
          {rep.pending > 0 && (
            <p className="text-xs text-amber-600 mt-0.5">+ {formatCurrency(rep.pending)} pending</p>
          )}
        </div>
      </div>

      {/* Role breakdown */}
      <div className="px-5 py-3 border-t grid grid-cols-3 gap-3 text-sm bg-card">
        {['Closer', 'Facilitator', 'Source Rep'].map(role => (
          <div key={role}>
            <p className="text-xs text-muted-foreground">{role}</p>
            <p className="font-medium">{formatCurrency(rep.byRole[role] || 0)}</p>
          </div>
        ))}
      </div>

      {/* Expandable line items */}
      <div className="border-t">
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center gap-2 px-5 py-2.5 text-xs text-muted-foreground hover:bg-muted/30 transition-colors print:hidden"
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {expanded ? 'Hide' : 'Show'} line items ({lines.length})
        </button>
        {/* Always show in print */}
        <div className={`${expanded ? '' : 'hidden'} print:block`}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/40 border-t border-b">
                  <th className="text-left px-5 py-2 font-medium text-muted-foreground">Event</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Lead Type</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Role</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">Basis</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">Rate</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {lines.map(l => (
                  <tr key={l.id} className="border-b hover:bg-muted/20">
                    <td className="px-5 py-2">
                      <p className="font-medium">{l.event?.client_name || l.event_label}</p>
                      <p className="text-muted-foreground">{l.event?.date || ''}</p>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{l.event?.lead_type || '—'}</td>
                    <td className="px-3 py-2">{l.role}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(l.basis || 0)}</td>
                    <td className="px-3 py-2 text-right">{l.rate_pct ? `${l.rate_pct}%` : '—'}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatCurrency(l.amount || 0)}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full border ${STATUS_PILL[l.status] || ''}`}>{l.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PayoutStatement({ rows, commissionLines, events, periodLabel, onClose }) {
  const totalFinalized = rows.reduce((s, r) => s + r.finalized, 0);
  const totalPending   = rows.reduce((s, r) => s + r.pending, 0);
  const generatedDate  = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Join lines with event data
  const enrichedLines = (repId) =>
    commissionLines
      .filter(l => l.team_member_id === repId)
      .map(l => ({ ...l, event: events.find(e => e.id === l.event_id) }))
      .sort((a, b) => (a.event?.date || '').localeCompare(b.event?.date || ''));

  if (rows.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden">
        <div className="bg-card rounded-xl p-8 text-center max-w-sm">
          <p className="text-muted-foreground">No commission data for this period.</p>
          <Button className="mt-4" variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Print CSS */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #payout-statement-print { display: block !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>

      {/* Overlay (screen only) */}
      <div className="fixed inset-0 z-50 bg-black/40 print:hidden" onClick={onClose} />

      {/* Modal */}
      <div id="payout-statement-print" className="fixed inset-0 z-50 overflow-y-auto print:static print:inset-auto print:overflow-visible">
        <div className="min-h-full flex items-start justify-center p-4 print:p-0">
          <div className="w-full max-w-3xl bg-card rounded-2xl shadow-2xl my-8 print:shadow-none print:rounded-none print:my-0">

            {/* Header */}
            <div className="bg-navy text-white px-8 py-6 rounded-t-2xl print:rounded-none">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/50 mb-1">Gradito Intelligence</p>
                  <h1 className="font-display text-3xl font-bold">Payout Statement</h1>
                  <p className="text-white/70 mt-1">{periodLabel} · Generated {generatedDate}</p>
                </div>
                <button type="button" onClick={onClose} className="text-white/60 hover:text-white print:hidden">
                  <X size={20} />
                </button>
              </div>

              <div className="flex gap-8 mt-5">
                <div>
                  <p className="text-xs text-white/50 uppercase tracking-wider">Payable Now (Finalized)</p>
                  <p className="font-display text-2xl font-bold text-emerald-400">{formatCurrency(totalFinalized)}</p>
                </div>
                <div>
                  <p className="text-xs text-white/50 uppercase tracking-wider">Pending (Forecast)</p>
                  <p className="font-display text-2xl font-bold text-amber-400">{formatCurrency(totalPending)}</p>
                </div>
                <div>
                  <p className="text-xs text-white/50 uppercase tracking-wider">Total</p>
                  <p className="font-display text-2xl font-bold">{formatCurrency(totalFinalized + totalPending)}</p>
                </div>
              </div>
            </div>

            {/* Rep cards */}
            <div className="p-6 space-y-4">
              {rows.map(rep => (
                <RepCard key={rep.id} rep={rep} lines={enrichedLines(rep.id)} />
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6">
              <p className="text-xs text-muted-foreground border-t pt-4">
                * Amounts reflect commissions as computed per current rules at time of event save. Pending lines are forecast only and subject to finalization. Forfeiture and multiplier rules (if any) are applied manually.
              </p>
            </div>

            {/* Print button */}
            <div className="px-6 pb-6 flex justify-end print:hidden">
              <Button onClick={() => window.print()} className="gap-2 bg-navy text-white hover:bg-navy/90">
                <Printer size={16} /> Print / Save PDF
              </Button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}