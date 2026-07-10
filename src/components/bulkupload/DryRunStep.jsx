import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Download, Loader2 } from 'lucide-react';

export default function DryRunStep({ flowType, dryRunResult, onBack, onCommit, committing, onDownloadFlagged }) {
  const { merged, mergeLog, flagged, totalRows } = dryRunResult;

  const stats = flowType === 'chefs'
    ? [
        { label: 'Total rows processed', value: totalRows, color: 'text-foreground' },
        { label: 'Unique chefs', value: merged.length, color: 'text-emerald-600' },
        { label: 'Multi-area merges', value: mergeLog?.length || 0, color: 'text-blue-600' },
        { label: 'Flagged for review', value: flagged.length, color: 'text-amber-600' },
      ]
    : [
        { label: 'Total rows', value: totalRows, color: 'text-foreground' },
        { label: 'Events to create', value: merged.length, color: 'text-emerald-600' },
        { label: 'Rows with warnings', value: flagged.length, color: 'text-amber-600' },
        { label: 'Chef links missing', value: merged.filter(d => d.head_chef_name && !d._head_chef_id).length, color: 'text-red-600' },
      ];

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <Card key={s.label} className="p-4 text-center">
            <p className={`text-2xl font-bold font-heading ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Multi-area merges (chefs only) */}
      {flowType === 'chefs' && mergeLog?.length > 0 && (
        <Card className="p-4">
          <h3 className="font-medium mb-3 text-sm">Multi-area merges — same chef found on multiple sheets</h3>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {mergeLog.map((m, i) => (
              <div key={i} className="text-xs text-muted-foreground flex gap-2">
                <span className="font-medium text-foreground">{m.name}</span>
                <span>+ {m.newArea}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Flagged rows */}
      {flagged.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500" /> Flagged rows ({flagged.length})
            </h3>
            <Button variant="outline" size="sm" onClick={onDownloadFlagged}>
              <Download size={14} className="mr-1" /> Download report
            </Button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {flagged.map((d, i) => (
              <div key={i} className="text-xs border border-amber-200 bg-amber-50 rounded p-2">
                <span className="font-medium">
                  {flowType === 'chefs' ? `${d.first_name} ${d.last_name}` : (d.client_name || `Row ${i + 1}`)}
                </span>
                {flowType === 'chefs' && (
                  <span className="text-muted-foreground ml-2">({(d.home_areas || []).join(', ')})</span>
                )}
                <div className="text-amber-700 mt-0.5">{(d._warnings || []).join(' · ')}</div>
                {d.notes && <div className="text-muted-foreground mt-0.5 italic">{d.notes}</div>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Preview table */}
      <Card className="p-4">
        <h3 className="font-medium text-sm mb-3">Preview (first 10 records)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                {flowType === 'chefs'
                  ? ['Name', 'Email', 'Phone', 'Areas', 'Menu', 'Bio', 'Status'].map(h => (
                      <th key={h} className="text-left p-2 font-medium text-muted-foreground">{h}</th>
                    ))
                  : ['Client', 'Date', 'Area', 'Head Chef', 'Revenue', 'Status'].map(h => (
                      <th key={h} className="text-left p-2 font-medium text-muted-foreground">{h}</th>
                    ))}
              </tr>
            </thead>
            <tbody>
              {merged.slice(0, 10).map((d, i) => (
                <tr key={i} className={`border-b ${d.status === 'Flagged' || d._warnings?.length ? 'bg-amber-50' : ''}`}>
                  {flowType === 'chefs' ? (
                    <>
                      <td className="p-2 font-medium">{d.first_name} {d.last_name}</td>
                      <td className="p-2 text-muted-foreground">{d.email || '—'}</td>
                      <td className="p-2 text-muted-foreground">{d.phone || '—'}</td>
                      <td className="p-2">{(d.home_areas || []).join(', ')}</td>
                      <td className="p-2">{d.menu_url ? '✓' : '—'}</td>
                      <td className="p-2">{d.bio_url ? '✓' : '—'}</td>
                      <td className="p-2">
                        <Badge className={d.status === 'Flagged' ? 'bg-amber-100 text-amber-800 border-0' : 'bg-emerald-100 text-emerald-800 border-0'}>
                          {d.status}
                        </Badge>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-2 font-medium">{d.client_name || '—'}</td>
                      <td className="p-2 text-muted-foreground">{d.date || '—'}</td>
                      <td className="p-2 text-muted-foreground">{d.service_area || '—'}</td>
                      <td className="p-2">{d.head_chef_name || '—'}</td>
                      <td className="p-2">{d.client_revenue ? `$${d.client_revenue.toLocaleString()}` : '—'}</td>
                      <td className="p-2">
                        <Badge className={d._warnings?.length ? 'bg-amber-100 text-amber-800 border-0' : 'bg-emerald-100 text-emerald-800 border-0'}>
                          {d._warnings?.length ? 'Flagged' : d.status || 'Confirmed'}
                        </Badge>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button className="bg-gold hover:bg-gold/80 text-white" onClick={onCommit} disabled={committing}>
          {committing
            ? <><Loader2 size={16} className="animate-spin mr-2" /> Importing…</>
            : `Commit Import — ${merged.length} ${flowType === 'chefs' ? 'chefs' : 'events'}`}
        </Button>
      </div>
    </div>
  );
}