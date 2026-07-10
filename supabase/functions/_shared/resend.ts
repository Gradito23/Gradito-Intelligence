import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SECRET_MASK } from './auth.ts';

export type ResendSettings = {
  id: number;
  api_key: string;
  from_email: string | null;
  from_name: string | null;
  enabled: boolean;
  updated_at: string;
  updated_by: string | null;
};

export type SafeResendSettings = {
  from_email: string | null;
  from_name: string | null;
  enabled: boolean;
  configured: boolean;
  api_key_masked: string;
  updated_at: string | null;
};

export async function loadResendSettings(
  adminClient: SupabaseClient,
): Promise<ResendSettings | null> {
  const { data, error } = await adminClient
    .from('integration_resend_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw error;
  return data as ResendSettings | null;
}

export function toSafeResendSettings(row: ResendSettings | null): SafeResendSettings {
  const hasKey = Boolean(row?.api_key?.trim());
  return {
    from_email: row?.from_email ?? null,
    from_name: row?.from_name ?? null,
    enabled: row?.enabled ?? false,
    configured: hasKey && Boolean(row?.from_email?.trim()),
    api_key_masked: hasKey ? SECRET_MASK : '',
    updated_at: row?.updated_at ?? null,
  };
}

export async function sendResendEmail(
  settings: ResendSettings,
  params: { to: string; subject: string; html: string },
): Promise<{ messageId: string }> {
  const fromName = settings.from_name?.trim() || 'Gradito';
  const fromEmail = settings.from_email?.trim();
  if (!fromEmail) throw new Error('Sender email is not configured');
  if (!settings.api_key?.trim()) throw new Error('API key is not configured');

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
