import React from 'react';
import { Loader2, Mail, Server } from 'lucide-react';
import { useEmailIntegration, useSetActiveEmailProvider } from '@/hooks/useEmailIntegration';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

function ProviderOption({ selected, title, description, icon: Icon, onClick, disabled, disabledReason }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled && disabledReason ? disabledReason : undefined}
      className={cn(
        'flex flex-1 min-w-[200px] items-start gap-3 rounded-lg border p-4 text-left transition-colors',
        selected
          ? 'border-gold bg-gold/5 ring-1 ring-gold/40'
          : 'border-border hover:border-muted-foreground/40 hover:bg-muted/30',
        disabled && 'opacity-60 cursor-not-allowed',
      )}
    >
      <div
        className={cn(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
          selected ? 'border-gold bg-gold' : 'border-muted-foreground/50',
        )}
      >
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2 font-medium text-sm">
          <Icon className="h-4 w-4 text-gold" />
          {title}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}

export default function EmailProviderSelector() {
  const { data, isLoading } = useEmailIntegration();
  const setProvider = useSetActiveEmailProvider();

  const activeProvider = data?.active_provider ?? 'resend';
  const resend = data?.resend;
  const activeCustom = data?.active_custom_smtp;

  const customConfigCount = data?.custom_smtp_configs?.length ?? 0;
  const canSelectCustomSmtp = customConfigCount > 0;

  const resendDescription = resend?.configured
    ? `API + ${resend.from_email ?? 'verified domain'}`
    : 'API key + verified domain';

  const customDescription = activeCustom
    ? `${activeCustom.smtp_host}:${activeCustom.smtp_port}`
    : data?.custom_smtp_configs?.length
      ? `${data.custom_smtp_configs.length} saved config(s)`
      : 'Add a Gmail or SMTP config';

  const handleSelect = async (provider) => {
    if (provider === activeProvider || setProvider.isPending) return;
    try {
      const result = await setProvider.mutateAsync(provider);
      if (result?.warning) {
        toast({ title: 'Provider updated', description: result.warning });
      } else {
        toast({
          title: 'Active provider updated',
          description: provider === 'resend' ? 'Resend API is now active.' : 'Custom SMTP is now active.',
        });
      }
    } catch (err) {
      toast({
        title: 'Could not switch provider',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-heading">Active email provider</CardTitle>
        <CardDescription>
          Enabling one automatically disables the other. App emails route to the active provider only.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading providers…
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <ProviderOption
              selected={activeProvider === 'resend'}
              title="Resend API"
              description={resendDescription}
              icon={Mail}
              onClick={() => handleSelect('resend')}
              disabled={setProvider.isPending}
            />
            <ProviderOption
              selected={activeProvider === 'custom_smtp'}
              title="Custom SMTP"
              description={customDescription}
              icon={Server}
              onClick={() => handleSelect('custom_smtp')}
              disabled={setProvider.isPending || !canSelectCustomSmtp}
              disabledReason={!canSelectCustomSmtp ? 'Add a configuration below first' : undefined}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
