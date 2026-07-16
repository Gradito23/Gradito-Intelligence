import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import CopyableValue from '@/components/admin/CopyableValue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import {
  APP_URL,
  getGoogleCloudCredentialsUrl,
  getSupabaseCallbackUrl,
  getSupabaseGoogleProviderUrl,
  getSupabaseProjectRef,
  GOOGLE_PHASE_STEPS,
  SUPABASE_PHASE_STEPS,
} from '@/lib/googleSsoSetupMeta';

function WorksheetField({ id, label, value, onChange }) {
  const handleCopy = async () => {
    if (!value.trim()) {
      toast({ title: 'Nothing to copy', description: `Enter ${label} first`, variant: 'destructive' });
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: 'Copied to clipboard', description: label });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Paste ${label} from Google`}
          className="font-mono text-sm"
          autoComplete="off"
        />
        <Button type="button" variant="outline" onClick={handleCopy} className="shrink-0">
          Copy
        </Button>
      </div>
    </div>
  );
}

export default function GoogleSSOSetupGuide() {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => () => {
    setClientId('');
    setClientSecret('');
  }, []);

  const callbackUrl = useMemo(() => getSupabaseCallbackUrl(), []);
  const projectRef = useMemo(() => getSupabaseProjectRef(), []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Phase 1 — Google Cloud</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" size="sm" asChild>
            <a href={getGoogleCloudCredentialsUrl()} target="_blank" rel="noopener noreferrer">
              Open Google Cloud Console
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </a>
          </Button>

          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
            {GOOGLE_PHASE_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          <div className="space-y-4 pt-1">
            <CopyableValue
              label="Authorized JavaScript origins"
              value={APP_URL}
            />
            <CopyableValue
              label="Authorized redirect URIs"
              value={callbackUrl}
              description="Use the Supabase callback URL, not your app login page."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Phase 2 — Supabase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" size="sm" asChild>
            <a href={getSupabaseGoogleProviderUrl(projectRef)} target="_blank" rel="noopener noreferrer">
              Open Supabase Google provider
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </a>
          </Button>

          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
            {SUPABASE_PHASE_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          <div className="rounded-lg border border-dashed p-4 space-y-4">
            <p className="text-xs text-muted-foreground">
              Temporary worksheet — not saved by Gradito.
            </p>
            <WorksheetField
              id="google-client-id"
              label="Client ID"
              value={clientId}
              onChange={setClientId}
            />
            <WorksheetField
              id="google-client-secret"
              label="Client Secret"
              value={clientSecret}
              onChange={setClientSecret}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
