import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { AlertCircle, Info, Loader2, Mail, X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import {
  useSaveSmtpIntegration,
  useSmtpIntegration,
  useTestSmtpIntegration,
} from '@/hooks/useSmtpIntegration';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';

const RESEND_DOMAINS_URL = 'https://resend.com/domains';
const DEFAULT_FROM_NAME = 'Gradito';
const DEFAULT_SMTP_PORT = 465;

function isDomainVerificationError(message) {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes('domain is not verified')
    || lower.includes('domain mismatch')
    || lower.includes('verify your domain')
    || lower.includes('verify a domain')
    || lower.includes('resend.com/domains')
    || lower.includes('403')
  );
}

export default function SmtpIntegrationCard() {
  const { user } = useAuth();
  const { data: settings, isLoading, isError, error } = useSmtpIntegration();
  const saveMutation = useSaveSmtpIntegration();
  const testMutation = useTestSmtpIntegration();

  const [senderEmail, setSenderEmail] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isChangingKey, setIsChangingKey] = useState(false);
  const [testTo, setTestTo] = useState(user?.email ?? '');
  const [testError, setTestError] = useState(null);

  useEffect(() => {
    if (!settings) return;
    setSenderEmail(settings.from_email ?? '');
    setIsChangingKey(!settings.configured);
    setApiKey('');
  }, [settings]);

  useEffect(() => {
    if (user?.email && !testTo) {
      setTestTo(user.email);
    }
  }, [user?.email, testTo]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await saveMutation.mutateAsync({
        smtp_port: DEFAULT_SMTP_PORT,
        from_email: senderEmail,
        from_name: DEFAULT_FROM_NAME,
        api_key: apiKey || undefined,
      });
      setApiKey('');
      setIsChangingKey(false);
      toast({ title: 'Email settings saved' });
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleTest = async () => {
    setTestError(null);
    try {
      const result = await testMutation.mutateAsync(testTo);
      toast({
        title: 'Test email sent',
        description: result.message_id
          ? `Message ID: ${result.message_id}`
          : 'Check the recipient inbox.',
      });
    } catch (err) {
      setTestError(err.message);
      toast({
        title: 'Test failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full max-w-md" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-destructive">
          Failed to load email settings: {error?.message}
        </CardContent>
      </Card>
    );
  }

  const configured = settings?.configured;
  const showApiKeyInput = !configured || isChangingKey;
  const showDomainHint = isDomainVerificationError(testError);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Mail className="h-5 w-5 text-gold" />
              Resend Email
            </CardTitle>
            <CardDescription className="mt-1">
              API key + sender email on a verified domain. Used for invites and app emails.
            </CardDescription>
          </div>
          <Badge variant={configured ? 'default' : 'secondary'}>
            {configured ? 'Connected' : 'Not configured'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>One-time domain setup</AlertTitle>
            <AlertDescription>
              Verify your domain at{' '}
              <a
                href={RESEND_DOMAINS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                resend.com/domains
              </a>
              , add the DNS records, then use a sender email on that verified domain (e.g.{' '}
              <code className="text-xs">noreply@mail.yourdomain.com</code>). Emails display as{' '}
              <strong>{DEFAULT_FROM_NAME}</strong> by default.
            </AlertDescription>
          </Alert>

          <div className="space-y-1.5">
            <Label htmlFor="api-key">API Key</Label>
            {showApiKeyInput ? (
              <Input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Resend API key (re_...)"
                autoComplete="off"
              />
            ) : (
              <div className="flex items-center gap-2">
                <div className="h-9 flex-1 flex items-center px-3 rounded-md border border-input bg-muted/30 text-sm tracking-widest">
                  {settings.api_key_masked}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsChangingKey(true);
                    setApiKey('');
                  }}
                >
                  Change
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {configured && !isChangingKey
                ? 'Leave blank on save to keep the existing key.'
                : 'Create an API key in the Resend dashboard with sending access.'}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sender-email">
              Sender email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="sender-email"
              type="email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              placeholder="noreply@mail.yourdomain.com"
              required
            />
            <p className="text-xs text-muted-foreground">
              Required by Resend. Must be on a domain marked Verified in{' '}
              <a
                href={RESEND_DOMAINS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                Resend Domains
              </a>
              .
            </p>
          </div>

          {settings?.updated_at && (
            <p className="text-xs text-muted-foreground">
              Last updated {format(new Date(settings.updated_at), 'PPpp')}
            </p>
          )}

          <div className="border-t pt-4 space-y-1.5">
            <Label htmlFor="test-to">Test recipient</Label>
            <Input
              id="test-to"
              type="email"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder="you@example.com"
            />
            <p className="text-xs text-muted-foreground">Not saved — for test sends only.</p>
          </div>

          {testError && (
            <Alert variant="destructive" className="relative">
              <AlertCircle className="h-4 w-4" />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => setTestError(null)}
                aria-label="Dismiss error"
              >
                <X className="h-4 w-4" />
              </Button>
              <AlertTitle>{showDomainHint ? 'Domain not verified' : 'Test send failed'}</AlertTitle>
              <AlertDescription className="pr-8">
                <p>{testError}</p>
                {showDomainHint && (
                  <p className="mt-2">
                    Verify your domain at{' '}
                    <a
                      href={RESEND_DOMAINS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2"
                    >
                      resend.com/domains
                    </a>
                    , then set Sender email to an address on that verified domain and try again.
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={!configured || testMutation.isPending || !testTo}
              onClick={handleTest}
            >
              {testMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test email
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
