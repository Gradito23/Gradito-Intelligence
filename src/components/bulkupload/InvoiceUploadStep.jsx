import React, { useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, X, Loader2, AlertCircle, Info } from 'lucide-react';
import { base44 } from '@/api/base44Client';

async function extractPdfText(file) {
  // Upload the PDF so we can pass its URL to the LLM vision model
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  const text = await base44.integrations.Core.InvokeLLM({
    prompt: `Extract ALL text from this PerfectVenue invoice PDF exactly as it appears. Preserve every label, number, line item, fee, name, date, and section header. Output plain text only — no commentary, no formatting changes.`,
    file_urls: [file_url],
    model: 'gemini_3_flash',
  });
  return { text: typeof text === 'string' ? text : JSON.stringify(text) };
}

export default function InvoiceUploadStep({ onParsed }) {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [parsing, setParsing] = useState(false);

  const addFiles = (newFiles) => {
    const pdfs = Array.from(newFiles).filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    setFiles(prev => [...prev, ...pdfs.map(f => ({ file: f, status: 'pending', result: null, error: null }))]);
  };

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const handleDrop = (e) => { e.preventDefault(); addFiles(e.dataTransfer.files); };

  const handleParse = async () => {
    if (files.length === 0) return;
    setParsing(true);
    const updated = files.map(f => ({ ...f }));

    for (let i = 0; i < updated.length; i++) {
      if (updated[i].status === 'done') continue;
      updated[i].status = 'parsing';
      setFiles([...updated]);
      try {
        const { text } = await extractPdfText(updated[i].file);
        const response = await base44.functions.invoke('parseInvoicePdf', { pdf_text: text, file_name: updated[i].file.name });
        updated[i].status = 'done';
        updated[i].result = response.data?.parsed || response.data;
        updated[i].file_name = updated[i].file.name;
      } catch (err) {
        updated[i].status = 'error';
        updated[i].error = err.message || 'Parse failed';
      }
      setFiles([...updated]);
    }

    setParsing(false);
    const successful = updated.filter(f => f.status === 'done' && f.result);
    if (successful.length > 0) {
      onParsed(successful.map(f => ({ parsed: f.result, fileName: f.file_name || f.file.name })));
    }
  };

  const allDone = files.length > 0 && files.every(f => f.status === 'done' || f.status === 'error');

  return (
    <Card className="p-8 space-y-5">
      <div
        className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-gold transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
      >
        <FileText size={40} className="mx-auto mb-4 text-muted-foreground" />
        <p className="font-heading font-semibold text-lg mb-1">Drop PerfectVenue Invoice PDFs here</p>
        <p className="text-muted-foreground text-sm">One or more PDFs — each invoice becomes one reviewable event draft</p>
        <Button className="mt-4 bg-navy hover:bg-navy/90 text-white" onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}>
          Choose PDF(s)
        </Button>
      </div>
      <input ref={inputRef} type="file" accept=".pdf,application/pdf" multiple className="hidden"
        onChange={e => { if (e.target.files?.length) addFiles(e.target.files); }} />

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border bg-card/50">
              <FileText size={16} className="text-muted-foreground shrink-0" />
              <span className="text-sm flex-1 truncate">{f.file.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">{(f.file.size / 1024).toFixed(0)} KB</span>
              {f.status === 'pending' && <Badge variant="outline" className="text-xs shrink-0">Pending</Badge>}
              {f.status === 'parsing' && <Badge className="bg-blue-100 text-blue-700 border-0 text-xs shrink-0 gap-1"><Loader2 size={10} className="animate-spin" /> Parsing…</Badge>}
              {f.status === 'done' && <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs shrink-0">Parsed ✓</Badge>}
              {f.status === 'error' && <Badge className="bg-red-100 text-red-700 border-0 text-xs shrink-0">Error: {f.error}</Badge>}
              {f.status === 'pending' && <button type="button" onClick={() => removeFile(i)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2 p-3 bg-secondary/50 rounded-lg text-sm text-muted-foreground">
        <Info size={15} className="shrink-0 mt-0.5" />
        <span>Each PDF is parsed with AI to extract line items, chef names, and financials. You'll review every field before anything is saved — nothing is written until you click <strong>Commit Import</strong>.</span>
      </div>

      {files.length === 0 && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg text-sm text-amber-700 border border-amber-200">
          <AlertCircle size={15} className="shrink-0" />
          <span>Add at least one PerfectVenue invoice PDF to continue.</span>
        </div>
      )}

      <div className="flex justify-end">
        <Button className="bg-gold hover:bg-gold/80 text-white" onClick={handleParse} disabled={files.length === 0 || parsing || allDone}>
          {parsing
            ? <><Loader2 size={15} className="animate-spin mr-2" /> Parsing PDFs…</>
            : allDone
              ? `${files.filter(f => f.status === 'done').length} parsed — proceed to Review →`
              : `Parse ${files.length} PDF${files.length !== 1 ? 's' : ''}`}
        </Button>
      </div>
    </Card>
  );
}