import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight, Info } from 'lucide-react';

const EVENT_ROLE_OPTIONS = [
  { value: 'booking_id', label: 'Booking / Event ID' },
  { value: 'date', label: 'Date' },
  { value: 'service_area', label: 'Service Area' },
  { value: 'client_name', label: 'Client Name' },
  { value: 'event_type', label: 'Event Type' },
  { value: 'experience_type', label: 'Experience Type' },
  { value: 'cuisines_served', label: 'Cuisines Served' },
  { value: 'guest_count', label: 'Guest Count' },
  { value: 'client_revenue', label: 'Client Revenue ($)' },
  { value: 'status', label: 'Status' },
  { value: 'head_chef_name', label: 'Head Chef Name' },
  { value: 'head_chef_fee', label: 'Head Chef Fee ($)' },
  { value: 'sous_chef_name', label: 'Sous Chef Name' },
  { value: 'sous_chef_fee', label: 'Sous Chef Fee ($)' },
  { value: 'notes', label: 'Notes' },
  { value: 'ignore', label: '— Ignore —' },
];

const OPTIONAL_COLS = [
  'Booking / Event ID',
  'Event Type',
  'Experience Type',
  'Cuisines Served',
  'Guest Count',
  'Client Revenue ($)',
  'Status',
  'Head Chef Name',
  'Head Chef Fee ($)',
  'Sous Chef Name',
  'Sous Chef Fee ($)',
  'Notes',
];

export default function EventMapStep({ workbook, sheetMappings, setSheetMappings, onBack, onNext }) {
  // Events usually have one sheet — show first sheet's mapping
  const sheetName = workbook.SheetNames[0];
  const mapping = sheetMappings[sheetName];
  if (!mapping) return null;

  const { dataRows, colRoles, headerRow } = mapping;
  const numCols = Math.max(dataRows[0]?.length || 0, headerRow?.length || 0);
  const previewRows = dataRows.slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 bg-secondary/50 rounded-lg text-sm text-muted-foreground">
        <Info size={16} className="shrink-0 mt-0.5" />
        <span>
          Headers were auto-matched from the first row. Confirm or correct the role for each column.
          If your file has one row per chef assignment (not per event), add a Booking ID column so rows can be grouped.
        </span>
      </div>

      <Card className="p-4 bg-secondary/30 border-border space-y-3">
        <div className="flex items-start gap-2">
          <Info size={14} className="text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-xs space-y-2">
            <p className="font-medium text-foreground">Required: Date, Service Area, Client Name</p>
            <p className="text-muted-foreground">
              Optional columns you can map: {OPTIONAL_COLS.join(', ')}
            </p>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden p-4 space-y-4">
        <h3 className="font-medium text-sm">{sheetName} — {dataRows.length} rows</h3>
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse w-full">
            <thead>
              <tr>
                {Array.from({ length: numCols }, (_, i) => (
                  <th key={i} className="p-2 border border-border bg-secondary/50 min-w-[150px]">
                    <div className="text-muted-foreground mb-1 truncate">
                      {headerRow?.[i] != null ? String(headerRow[i]).slice(0, 30) : `Col ${i + 1}`}
                    </div>
                    <Select
                      value={colRoles[i] || 'ignore'}
                      onValueChange={val => setSheetMappings(prev => ({
                        ...prev,
                        [sheetName]: {
                          ...prev[sheetName],
                          colRoles: { ...prev[sheetName].colRoles, [i]: val === 'ignore' ? undefined : val },
                        },
                      }))}
                    >
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EVENT_ROLE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, ri) => (
                <tr key={ri} className="hover:bg-secondary/20">
                  {Array.from({ length: numCols }, (_, ci) => (
                    <td key={ci} className="p-2 border border-border text-muted-foreground truncate max-w-[180px]">
                      {row[ci] != null ? String(row[ci]).slice(0, 60) : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {workbook.SheetNames.length > 1 && (
        <p className="text-xs text-muted-foreground">Note: Only the first sheet is used for event imports.</p>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button className="bg-navy hover:bg-navy/90 text-white" onClick={onNext}>
          Preview Import <ChevronRight size={16} className="ml-1" />
        </Button>
      </div>
    </div>
  );
}