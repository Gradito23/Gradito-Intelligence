import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight, Info } from 'lucide-react';

const COL_ROLE_OPTIONS = [
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'menu_url', label: 'Menu Link (Canva)' },
  { value: 'bio_url', label: 'Bio Link (Canva)' },
  { value: 'bio_page', label: 'Bio Page #' },
  { value: 'price_tier', label: 'Price Tier ($$$)' },
  { value: 'ignore', label: '— Ignore —' },
];

const OPTIONAL_COLS = [
  'Phone',
  'Email',
  'Menu Link (Canva)',
  'Bio Link (Canva)',
  'Bio Page #',
  'Price Tier ($$$)',
];

export default function ChefMapStep({ workbook, sheetMappings, setSheetMappings, onBack, onNext }) {
  const [expandedSheet, setExpandedSheet] = useState(workbook.SheetNames[0] || null);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Found <strong>{workbook.SheetNames.length} sheets</strong>. Review auto-detected column mappings.
        Each sheet name becomes the chef's Service Area — edit if needed.
      </p>

      <Card className="p-4 bg-secondary/30 border-border space-y-3">
        <div className="flex items-start gap-2">
          <Info size={14} className="text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-xs space-y-2">
            <p className="font-medium text-foreground">Required: First Name, Last Name</p>
            <p className="text-muted-foreground">
              Optional columns you can map: {OPTIONAL_COLS.join(', ')}
            </p>
          </div>
        </div>
      </Card>

      {workbook.SheetNames.map(sheetName => {
        const mapping = sheetMappings[sheetName];
        if (!mapping) return null;
        const { dataRows, colRoles } = mapping;
        const numCols = dataRows[0]?.length || 0;
        const previewRows = dataRows.slice(0, 3);
        const isOpen = expandedSheet === sheetName;

        return (
          <Card key={sheetName} className="overflow-hidden">
            <button
              className="w-full text-left p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors"
              onClick={() => setExpandedSheet(isOpen ? null : sheetName)}
            >
              <div className="flex items-center gap-3">
                <span className="font-medium">{sheetName}</span>
                <Badge variant="outline" className="text-xs">{dataRows.length} rows</Badge>
              </div>
              <ChevronRight size={16} className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>

            {isOpen && (
              <div className="p-4 border-t space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-32 shrink-0">Service Area:</span>
                  <input
                    className="border border-border rounded-md px-3 py-1.5 text-sm flex-1 max-w-xs bg-background"
                    value={mapping.area}
                    onChange={e => setSheetMappings(prev => ({
                      ...prev,
                      [sheetName]: { ...prev[sheetName], area: e.target.value }
                    }))}
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="text-xs border-collapse">
                    <thead>
                      <tr>
                        {Array.from({ length: numCols }, (_, i) => (
                          <th key={i} className="p-2 border border-border bg-secondary/50 min-w-[130px]">
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
                                {COL_ROLE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, ri) => (
                        <tr key={ri}>
                          {Array.from({ length: numCols }, (_, ci) => (
                            <td key={ci} className="p-2 border border-border text-muted-foreground truncate max-w-[160px]">
                              {row[ci] != null ? String(row[ci]).slice(0, 50) : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>
        );
      })}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button className="bg-navy hover:bg-navy/90 text-white" onClick={onNext}>
          Preview Import <ChevronRight size={16} className="ml-1" />
        </Button>
      </div>
    </div>
  );
}