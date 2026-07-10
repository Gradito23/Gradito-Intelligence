import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useSaveCustomSmtp, useTestCustomSmtp } from '@/hooks/useEmailIntegration';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';

const GMAIL_PRESET = {
  smtp_host: 'smtp.gmail.com',
  smtp_port: 587,
  encryption: 'tls',
};

const DEFAULT_FROM_NAME = 'Gradito';

function inferProviderLabel(host) {
  if (!host) return 'smtp';
  if (host.includes('gmail')) return 'gmail';
  return host.split('.')[0] || 'smtp';
}

export default function CustomSmtpForm({ open, onOpenChange, config, onSaved }) {
  const { user } = useAuth();
  const saveMutation = useSaveCustomSmtp();
  const testMutation = useTestCustomSmtp();

  const [smtpHost, setSmtpHost] = useState(GMAIL_PRESET.smtp_host);
  const [smtpPort, setSmtpPort] = useState(String(GMAIL_PRESET.smtp_port));
  const [encryption, setEncryption] = useState(GMAIL_PRESET.encryption);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [fromName, setFromName] = useState(DEFAULT_FROM_NAME);
  const [fromEmail, setFromEmail] = useState('');
  const [testTo, setTestTo] = useState(user?.email ?? '');

  const isEdit = Boolean(config?.id);
  const hasSavedPassword = isEdit && Boolean(config?.password_masked) && !isChangingPassword;

  useEffect(() => {
    if (!open) return;
    if (config) {
      setSmtpHost(config.smtp_host ?? GMAIL_PRESET.smtp_host);
      setSmtpPort(String(config.smtp_port ?? GMAIL_PRESET.smtp_port));
      setEncryption(config.encryption ?? 'tls');
      setUsername(config.username ?? '');
      setPassword('');
      setIsChangingPassword(false);
      setFromName(config.from_name ?? DEFAULT_FROM_NAME);
      setFromEmail(config.from_email ?? '');
    } else {
      setSmtpHost(GMAIL_PRESET.smtp_host);
      setSmtpPort(String(GMAIL_PRESET.smtp_port));
      setEncryption(GMAIL_PRESET.encryption);
      setUsername('');
      setPassword('');
      setIsChangingPassword(false);
      setFromName(DEFAULT_FROM_NAME);
      setFromEmail('');
    }
    setTestTo(user?.email ?? '');
  }, [open, config, user?.email]);

  const buildPayload = () => ({
    id: config?.id,
    smtp_host: smtpHost.trim(),
    smtp_port: Number(smtpPort),
    encryption,
    username: username.trim(),
    password: password.trim() || undefined,
    from_name: fromName.trim() || DEFAULT_FROM_NAME,
    from_email: fromEmail.trim(),
  });

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await saveMutation.mutateAsync(buildPayload());
      toast({ title: isEdit ? 'SMTP config updated' : 'SMTP config saved' });
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleTest = async () => {
    try {
      await testMutation.mutateAsync({
        ...buildPayload(),
        test_to: testTo,
      });
      toast({ title: 'Test email sent', description: 'Check the recipient inbox.' });
    } catch (err) {
      toast({
        title: 'Test failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const applyGmailPreset = () => {
    setSmtpHost(GMAIL_PRESET.smtp_host);
    setSmtpPort(String(GMAIL_PRESET.smtp_port));
    setEncryption(GMAIL_PRESET.encryption);
  };

  const handleEncryptionChange = (value) => {
    setEncryption(value);
    if (value === 'ssl') {
      setSmtpPort('465');
    } else {
      setSmtpPort('587');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit SMTP configuration' : 'Add SMTP configuration'}</DialogTitle>
          <DialogDescription>
            {inferProviderLabel(smtpHost) === 'gmail'
              ? 'Use a Google App Password (Google Account → Security → App passwords).'
              : 'Enter your SMTP server details.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <Alert>
            <AlertTitle>Supabase Edge SMTP ports</AlertTitle>
            <AlertDescription>
              Ports 25, 465, and 587 (including Gmail) are blocked on Supabase Edge Functions.
              Use a provider with an alternate port (e.g. Mailgun 2525, AWS SES 2587), or use{' '}
              <strong>Resend API</strong> for Gmail/domain email instead.
            </AlertDescription>
          </Alert>

          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={applyGmailPreset}>
              Use Gmail preset
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="smtp-host">SMTP host</Label>
              <Input
                id="smtp-host"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.gmail.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="smtp-port">Port</Label>
              <Input
                id="smtp-port"
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Encryption</Label>
              <Select value={encryption} onValueChange={handleEncryptionChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tls">TLS (587)</SelectItem>
                  <SelectItem value="ssl">SSL (465)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                TLS (587) uses STARTTLS; SSL (465) uses direct TLS.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="smtp-username">Username</Label>
            <Input
              id="smtp-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="you@gmail.com"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="smtp-password">Password</Label>
            {hasSavedPassword && !password ? (
              <div className="flex items-center gap-2">
                <div className="h-9 flex-1 flex items-center px-3 rounded-md border border-input bg-muted/30 text-sm tracking-widest">
                  {config.password_masked}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setIsChangingPassword(true)}>
                  Change
                </Button>
              </div>
            ) : (
              <Input
                id="smtp-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEdit ? 'Enter new password' : 'App password'}
                autoComplete="off"
                required={!isEdit}
              />
            )}
            <p className="text-xs text-muted-foreground">
              Gmail: create an App Password in Google Account → Security → App passwords.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="from-name">From name</Label>
              <Input
                id="from-name"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="from-email">From email</Label>
              <Input
                id="from-email"
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="border-t pt-4 space-y-1.5">
            <Label htmlFor="test-to-smtp">Test recipient</Label>
            <Input
              id="test-to-smtp"
              type="email"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
            />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={testMutation.isPending || !testTo}
              onClick={handleTest}
            >
              {testMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send test email
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
