import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/hooks/useAppData';

function MetaRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="py-1.5 border-b border-border/40 last:border-0">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
      <p className="text-sm text-foreground whitespace-pre-wrap mt-0.5">{value}</p>
    </div>
  );
}

export default function PvEventSourceCard({ event }) {
  const [open, setOpen] = useState(true);
  if (event?.event_source !== 'perfect_venue' && !event?.pv_metadata) return null;

  const meta = event?.pv_metadata ?? {};
  const times =
    meta.start_time_display && meta.end_time_display
      ? `${meta.start_time_display} – ${meta.end_time_display}`
      : meta.start_time_display || meta.end_time_display || null;

  const revenueNote =
    meta.budget != null && Number(meta.budget) !== 0
      ? `Budget (PV raw): ${formatCurrency(Number(meta.budget))}`
      : meta.amount != null && Number(meta.amount) !== 0
        ? `Amount (PV raw): ${formatCurrency(Number(meta.amount) / 100)}`
        : null;

  const customFields = Array.isArray(meta.custom_fields) ? meta.custom_fields : [];
  const unmatched = Array.isArray(meta.attribution_unmatched) ? meta.attribution_unmatched : [];

  return (
    <Card className="p-4 space-y-2 border-sky-200/80 bg-sky-50/30 dark:border-sky-900 dark:bg-sky-950/20">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-2">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          Perfect Venue source
        </span>
        <Badge variant="outline" className="text-[10px]">PV</Badge>
      </button>
      {open && (
        <div className="space-y-1 pt-1">
          <MetaRow label="Location / address" value={meta.event_address || meta.event_location_label} />
          <MetaRow label="Event time" value={times} />
          <MetaRow label="Contact" value={
            [meta.contact_email, meta.contact_phone].filter(Boolean).join(' · ') || null
          } />
          <MetaRow
            label="PV specialists"
            value={
              [meta.sales_specialist_name, meta.execution_specialist_name]
                .filter(Boolean)
                .join(' · ') || null
            }
          />
          {unmatched.length > 0 && (
            <p className="text-xs text-amber-800 dark:text-amber-200 py-1">
              Not linked to team:
              {' '}
              {unmatched.join('; ')}
            </p>
          )}
          {revenueNote && <MetaRow label="Revenue (PV)" value={revenueNote} />}
          {customFields.length > 0 && (
            <div className="pt-2 mt-2 border-t border-border/50">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
                Intake responses
              </p>
              {customFields.map((row) => (
                <MetaRow key={row.label} label={row.label} value={row.value} />
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}