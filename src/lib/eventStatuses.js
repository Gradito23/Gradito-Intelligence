/** Gradito event status labels (aligned with Perfect Venue pipeline mapping). */
export const EVENT_STATUS_OPTIONS = [
  'Lead',
  'Qualified',
  'Proposal Sent',
  'Balance Due',
  'Confirmed',
  'Completed',
  'Cancelled',
];

export const EVENT_STATUS_COLORS = {
  Lead: 'bg-slate-100 text-slate-800',
  Qualified: 'bg-slate-100 text-slate-700',
  'Proposal Sent': 'bg-amber-100 text-amber-800',
  'Balance Due': 'bg-orange-100 text-orange-800',
  Completed: 'bg-emerald-100 text-emerald-800',
  Confirmed: 'bg-blue-100 text-blue-800',
  Cancelled: 'bg-red-100 text-red-800',
};

export const EVENT_SOURCE_LABELS = {
  manual: 'Manual',
  perfect_venue: 'PV',
  bulk_import: 'Import',
  invoice_import: 'Invoice',
};
