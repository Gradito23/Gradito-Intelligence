import React from 'react';
import { Plug } from 'lucide-react';
import SmtpIntegrationCard from '@/components/admin/SmtpIntegrationCard';

export default function Integrations() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-semibold text-navy flex items-center gap-2">
          <Plug className="h-5 w-5" />
          Integrations
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Connect external services to Gradito Chef Intelligence
        </p>
      </div>
      <SmtpIntegrationCard />
    </div>
  );
}
