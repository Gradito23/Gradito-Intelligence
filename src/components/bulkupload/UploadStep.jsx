import React, { useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Info, Download } from 'lucide-react';
import { downloadChefTemplate, downloadEventTemplate } from './importUtils';

export default function UploadStep({ flowType, onFile }) {
  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  return (
    <Card className="p-8 space-y-4">
      <div
        className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-gold transition-colors"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
      >
        <Upload size={40} className="mx-auto mb-4 text-muted-foreground" />
        <p className="font-heading font-semibold text-lg mb-1">Drop your {flowType === 'chefs' ? 'chef workbook' : 'PerfectVenue export'} here</p>
        <p className="text-muted-foreground text-sm">
          {flowType === 'chefs'
            ? 'Supports .xlsx and .xls — one sheet per Service Area'
            : 'Supports .xlsx, .xls, and .csv — one row per event or per chef assignment'}
        </p>
        <Button className="mt-4 bg-navy hover:bg-navy/90 text-white" onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
          Choose file
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={e => { if (e.target.files[0]) onFile(e.target.files[0]); }}
      />
      <div className="flex items-start gap-2 p-3 bg-secondary/50 rounded-lg text-sm text-muted-foreground">
        <Info size={16} className="shrink-0 mt-0.5" />
        <span>
          {flowType === 'chefs'
            ? 'Column order is auto-detected per sheet. Canva links are identified by URL content. You can override mappings in the next step.'
            : 'Headers are auto-matched. You can correct mappings before committing. Nothing is written until you click Commit Import.'}
        </span>
      </div>

      {/* Required columns */}
      <div className="p-4 rounded-lg border border-border bg-card/50 space-y-3">
        <h3 className="font-semibold text-sm text-foreground">Required columns</h3>
        {flowType === 'chefs' ? (
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-gold font-bold mt-0.5">•</span>
              <span><strong>First Name</strong> — Chef's first name</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gold font-bold mt-0.5">•</span>
              <span><strong>Last Name</strong> — Chef's last name</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gold font-bold mt-0.5">•</span>
              <span><strong>Service Area</strong> — Area where chef is available (one per sheet name)</span>
            </li>
          </ul>
        ) : (
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-gold font-bold mt-0.5">•</span>
              <span><strong>Date</strong> — Event date (YYYY-MM-DD format)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gold font-bold mt-0.5">•</span>
              <span><strong>Service Area</strong> — Area where event takes place</span>
            </li>
          </ul>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => flowType === 'chefs' ? downloadChefTemplate() : downloadEventTemplate()}
        >
          <Download size={14} className="mr-1.5" />
          Download template
        </Button>
      </div>
    </Card>
  );
}