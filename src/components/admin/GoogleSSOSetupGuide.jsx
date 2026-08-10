import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import CopyableValue from '@/components/admin/CopyableValue';
import {
  useGoogleSSOIntegration,
  useSaveGoogleSSOSettings,
} from '@/hooks/useGoogleSSOIntegration';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import {
  APP_URL,
  getGoogleCloudCredentialsUrl,
  getGoogleSSOStatus,
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

function GoogleSSOEnableCard() {
  const { data, isLoading, isError, error } = useGoogleSSOIntegration();
  const saveMutation = useSaveGoogleSSOSettings();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!data) return;
    setEnabled(data.enabled ?? false);
  }, [data]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await saveMutation.mutateAsync({ enabled });
      toast({
        title: enabled ? 'Google SSO enabled' : 'Google SSO disabled',
        description: enabled
          ? 'Continue with Google is available on login and register.'
          : 'Users will see a contact-administrator message instead of Google sign-in.',
      });
    } catch (err) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <Skeleton className="h-36 w-full" />;
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        Failed to load Google SSO settings: {error.message}
      </p>
    );
  }

  const statusLabel = getGoogleSSOStatus(data?.enabled);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Enable in Gradito</CardTitle>
          <Badge variant={data?.enabled ? 'default' : 'secondary'}>{statusLabel}</Badge>
        </div>
        <CardDescription>
          After Google and Supabase are configured, enable Google SSO here so login stops showing the
          unavailable modal.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="google-sso-enabled">Enable Google SSO</Label>
              <p className="text-xs text-muted-foreground">
                Marks Gradito ready; does not store Client ID or Secret.
              </p>
            </div>
            <Switch
              id="google-sso-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>
          <Button
            type="submit"
            disabled={saveMutation.isPending || enabled === Boolean(data?.enabled)}
            className="bg-navy hover:bg-navy/90 text-white"
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </form>
      </CardContent>
    </Card>
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
      <GoogleSSOEnableCard />

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
