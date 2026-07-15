import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { backfillIntegrationSecrets, resolveSecret } from './crypto.ts';
import { loadResendSettings, sendResendEmail } from './resend.ts';
import { CustomSmtpConfig, sendCustomSmtpEmail } from './smtp.ts';

export type EmailProvider = 'resend' | 'custom_smtp';

export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  emailType?: string;
};

export async function getActiveProvider(
  adminClient: SupabaseClient,
): Promise<EmailProvider> {
  const { data, error } = await adminClient
    .from('email_provider_settings')
    .select('active_provider')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw error;
  return (data?.active_provider as EmailProvider) ?? 'resend';
}

export async function loadActiveCustomSmtpConfig(
  adminClient: SupabaseClient,
): Promise<CustomSmtpConfig | null> {
  await backfillIntegrationSecrets(adminClient);

  const { data, error } = await adminClient
    .from('custom_smtp_configs')
    .select('*')
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const password = await resolveSecret(adminClient, {
    encrypted: data.encrypted_password,
    iv: data.password_iv,
    legacyPlaintext: data.password,
  });

  return {
    ...(data as CustomSmtpConfig),
    password,
  };
}

export async function logEmail(
  adminClient: SupabaseClient,
  entry: {
    email_type: string;
    recipient: string;
    provider: EmailProvider;
    custom_smtp_config_id?: string | null;
    status: 'sent' | 'failed';
    error_message?: string | null;
    subject?: string | null;
  },
) {
  const { error } = await adminClient.from('email_logs').insert(entry);
  if (error) console.error('Failed to log email:', error.message);
}

export async function sendEmail(
  adminClient: SupabaseClient,
  params: SendEmailParams,
): Promise<{ provider: EmailProvider; messageId?: string }> {
  const emailType = params.emailType ?? 'notification';
  const provider = await getActiveProvider(adminClient);

  if (provider === 'resend') {
    const settings = await loadResendSettings(adminClient);
    if (!settings?.enabled || !settings.api_key?.trim() || !settings.from_email?.trim()) {
      const err = 'Resend is not configured or enabled';
      await logEmail(adminClient, {
        email_type: emailType,
        recipient: params.to,
        provider: 'resend',
        status: 'failed',
        error_message: err,
        subject: params.subject,
      });
      throw new Error(err);
    }

    try {
      const result = await sendResendEmail(settings, params);
      await logEmail(adminClient, {
        email_type: emailType,
        recipient: params.to,
        provider: 'resend',
        status: 'sent',
        subject: params.subject,
      });
      return { provider: 'resend', messageId: result.messageId };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Send failed';
      await logEmail(adminClient, {
        email_type: emailType,
        recipient: params.to,
        provider: 'resend',
        status: 'failed',
        error_message: message,
        subject: params.subject,
      });
      throw err;
    }
  }

  const config = await loadActiveCustomSmtpConfig(adminClient);
  if (!config) {
    const err = 'No active Custom SMTP configuration';
    await logEmail(adminClient, {
      email_type: emailType,
      recipient: params.to,
      provider: 'custom_smtp',
      status: 'failed',
      error_message: err,
      subject: params.subject,
    });
    throw new Error(err);
  }

  try {
    await sendCustomSmtpEmail(config, params);
    await logEmail(adminClient, {
      email_type: emailType,
      recipient: params.to,
      provider: 'custom_smtp',
      custom_smtp_config_id: config.id,
      status: 'sent',
      subject: params.subject,
    });
    return { provider: 'custom_smtp' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Send failed';
    await logEmail(adminClient, {
      email_type: emailType,
      recipient: params.to,
      provider: 'custom_smtp',
      custom_smtp_config_id: config.id,
      status: 'failed',
      error_message: message,
      subject: params.subject,
    });
    throw err;
  }
}

export type EmailAnalytics = {
  today: number;
  week: number;
  month: number;
  success_rate: number;
  by_type: Record<string, number>;
  by_provider: Record<string, number>;
  recent_logs: Array<{
    id: string;
    email_type: string;
    recipient: string;
    provider: string;
    status: string;
    error_message: string | null;
    subject: string | null;
    created_at: string;
  }>;
};

export async function buildEmailAnalytics(
  adminClient: SupabaseClient,
  logLimit = 20,
): Promise<EmailAnalytics> {
  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const { data: monthLogs, error } = await adminClient
    .from('email_logs')
    .select('id, email_type, recipient, provider, status, error_message, subject, created_at')
    .gte('created_at', monthAgo.toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;

  const logs = monthLogs ?? [];
  const today = logs.filter((l) => new Date(l.created_at) >= startOfDay).length;
  const week = logs.filter((l) => new Date(l.created_at) >= weekAgo).length;
  const month = logs.length;

  const sentCount = logs.filter((l) => l.status === 'sent').length;
  const success_rate = month > 0 ? Math.round((sentCount / month) * 100) : 100;

  const by_type: Record<string, number> = {};
  const by_provider: Record<string, number> = {};
  for (const log of logs) {
    by_type[log.email_type] = (by_type[log.email_type] ?? 0) + 1;
    by_provider[log.provider] = (by_provider[log.provider] ?? 0) + 1;
  }

  const { data: recentLogs, error: recentError } = await adminClient
    .from('email_logs')
    .select('id, email_type, recipient, provider, status, error_message, subject, created_at')
    .order('created_at', { ascending: false })
    .limit(logLimit);

  if (recentError) throw recentError;

  return {
    today,
    week,
    month,
    success_rate,
    by_type,
    by_provider,
    recent_logs: recentLogs ?? [],
  };
}
