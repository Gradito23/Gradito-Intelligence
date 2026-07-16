import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

export default function CopyableValue({ label, value, multiline = false, description }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({ title: 'Copied to clipboard', description: label });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="shrink-0 h-8">
          {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {multiline ? (
        <pre className="rounded-md border bg-muted/40 px-3 py-2 text-xs font-mono whitespace-pre-wrap break-all text-foreground">
          {value}
        </pre>
      ) : (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs font-mono break-all text-foreground">
          {value}
        </div>
      )}
    </div>
  );
}
