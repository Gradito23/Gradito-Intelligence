import React from 'react';
import { Plug } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function IntegrationsComingSoon() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-xl font-semibold text-navy flex items-center gap-2">
          <Plug className="h-5 w-5" />
          Integrations
          <Badge variant="secondary">Coming Soon</Badge>
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Connect external services to Gradito Chef Intelligence
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading">SMTP / Resend</CardTitle>
          <CardDescription>
            Transactional email for user invites, password resets, and notifications.
            Configuration will be available here in Phase 5.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Planned integrations: Resend SMTP, future webhook connectors.
        </CardContent>
      </Card>
    </div>
  );
}
