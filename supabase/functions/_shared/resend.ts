import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type SmtpSettings = {
  id: number;
  provider: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  api_key: string;
  from_email: string | null;
  from_name: string | null;
  enabled: boolean;
  updated_at: string;
  updated_by: string | null;
};

export type SafeSmtpSettings = {
  provider: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  from_email: string | null;
  from_name: string | null;
  enabled: boolean;
  configured: boolean;
  api_key_masked: string;
  updated_at: string | null;
  updated_by: string | null;
};

const API_KEY_MASK = '*************';

export function toSafeSettings(row: SmtpSettings | null): SafeSmtpSettings {
  const hasKey = Boolean(row?.api_key?.trim());
  return {
    provider: row?.provider ?? 'resend',
    smtp_host: row?.smtp_host ?? 'smtp.resend.com',
    smtp_port: row?.smtp_port ?? 465,
    smtp_username: row?.smtp_username ?? 'resend',
    from_email: row?.from_email ?? null,
    from_name: row?.from_name ?? null,
    enabled: row?.enabled ?? false,
    configured: hasKey && Boolean(row?.from_email?.trim()),
    api_key_masked: hasKey ? API_KEY_MASK : '',
    updated_at: row?.updated_at ?? null,
    updated_by: row?.updated_by ?? null,
  };
}

export async function loadSmtpSettings(
  adminClient: SupabaseClient,
): Promise<SmtpSettings | null> {
  const { data, error } = await adminClient
    .from('integration_smtp_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw error;
  return data as SmtpSettings | null;
}

export async function sendResendEmail(
  settings: SmtpSettings,
  params: { to: string; subject: string; html: string },
): Promise<{ messageId: string }> {
  const fromName = settings.from_name?.trim() || 'Gradito';
  const fromEmail = settings.from_email?.trim();
  if (!fromEmail) {
    throw new Error('From email is not configured');
  }
  if (!settings.api_key?.trim()) {
    throw new Error('API key is not configured');
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.api_key.trim()}`,
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    const message = data?.message || data?.error || 'Failed to send email';
    throw new Error(message);
  }

  return { messageId: data.id as string };
}

export function createServiceClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient(supabaseUrl, serviceRoleKey);
}
