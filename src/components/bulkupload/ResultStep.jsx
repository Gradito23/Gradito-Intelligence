import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

export default function ResultStep({ flowType, commitResult, onReset }) {
  return (
    <Card className="p-8 text-center space-y-4">
      <CheckCircle2 size={48} className="mx-auto text-gold" />
      <h2 className="font-heading text-2xl font-bold">Import Complete</h2>
      <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
        <div>
          <p className="text-2xl font-bold text-emerald-600">{commitResult.created}</p>
          <p className="text-xs text-muted-foreground">New {flowType === 'chefs' ? 'chefs' : 'events'} created</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-blue-600">{commitResult.merged}</p>
          <p className="text-xs text-muted-foreground">Merged / updated</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-amber-600">{commitResult.flagged}</p>
          <p className="text-xs text-muted-foreground">Flagged for review</p>
        </div>
      </div>
      {flowType === 'chefs' && (
        <p className="text-sm text-muted-foreground">
          Flagged chefs are in the roster with status "Flagged" — visit Data Health in Reports to review them.
        </p>
      )}
      {flowType === 'events' && (
        <p className="text-sm text-muted-foreground">
          Events are now in the Events roster. Flagged rows need a chef match — open Events to review.
        </p>
      )}
      {flowType === 'invoices' && (
        <p className="text-sm text-muted-foreground">
          Events created from invoices. Assign lead type and closer attribution in the Events panel. Unmatched chefs were skipped — add EventChef links manually if needed.
        </p>
      )}
      <Button className="bg-navy hover:bg-navy/90 text-white" onClick={onReset}>
        Upload another file
      </Button>
    </Card>
  );
}