import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import InvoiceDraftCard from './InvoiceDraftCard';
import { formatCurrency } from '@/hooks/useAppData';
import { computePnL } from '@/lib/pnlUtils';

export default function InvoiceDryRunStep({ drafts, onDraftChange, onBack, onCommit, committing, chefs, serviceAreas, teamMembers }) {
  const criticalCount = drafts.filter(d => (d._warnings || []).filter(w => !w.includes('lead_type')).length > 0 || !d.date || !d.service_area).length;

  const totalNetProfit = drafts.reduce((s, d) => {
    return s + computePnL(d, (d.head_chef_fee || 0) + (d.sous_chef_fee || 0)).netProfit;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 text-center"><p className="text-2xl font-bold font-heading">{drafts.length}</p><p className="text-xs text-muted-foreground mt-1">Invoices parsed</p></Card>
        <Card className="p-4 text-center"><p className="text-2xl font-bold font-heading text-emerald-600">{drafts.length - criticalCount}</p><p className="text-xs text-muted-foreground mt-1">Ready to commit</p></Card>
        <Card className="p-4 text-center"><p className="text-2xl font-bold font-heading text-amber-600">{criticalCount}</p><p className="text-xs text-muted-foreground mt-1">Need attention</p></Card>
        <Card className="p-4 text-center"><p className="text-2xl font-bold font-heading text-emerald-600">{formatCurrency(totalNetProfit)}</p><p className="text-xs text-muted-foreground mt-1">Batch net profit</p></Card>
      </div>

      {criticalCount > 0 ? (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          <AlertTriangle size={15} className="shrink-0" />
          <span><strong>{criticalCount} invoice{criticalCount !== 1 ? 's' : ''}</strong> have warnings. You can still commit — unmatched chefs will be skipped and attribution can be set later in the event panel.</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
          <CheckCircle2 size={15} className="shrink-0" />
          <span>All <strong>{drafts.length}</strong> invoices look good. Review fields below then click Commit.</span>
        </div>
      )}

      <div className="space-y-4">
        {drafts.map((draft, i) => (
          <InvoiceDraftCard key={i} draft={draft} index={i} onChange={onDraftChange} chefs={chefs} serviceAreas={serviceAreas} teamMembers={teamMembers || []} />
        ))}
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} disabled={committing}>Back</Button>
        <Button className="bg-gold hover:bg-gold/80 text-white" onClick={onCommit} disabled={committing || drafts.length === 0}>
          {committing
            ? <><Loader2 size={15} className="animate-spin mr-2" /> Committing…</>
            : `Commit Import — ${drafts.length} event${drafts.length !== 1 ? 's' : ''}`}
        </Button>
      </div>
    </div>
  );
}