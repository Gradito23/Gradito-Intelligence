import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SECRET_MASK } from './auth.ts';
import {
  backfillIntegrationSecrets,
  hasStoredSecret,
  packSecret,
  resolveSecret,
} from './crypto.ts';
import {
  EmailInlineAttachment,
  resolveEmailAttachments,
} from './emailBrandAssets.ts';

export type { EmailInlineAttachment };

export type ResendSettings = {
  id: number;
  api_key: string;
  from_email: string | null;
  from_name: string | null;
  enabled: boolean;
  updated_at: string;
  updated_by: string | null;
  encrypted_api_key?: string | null;
  api_key_iv?: string | null;
  dek_version?: number | null;
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
  await backfillIntegrationSecrets(adminClient);

  const { data, error } = await adminClient
    .from('integration_resend_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const apiKey = await resolveSecret(adminClient, {
    encrypted: data.encrypted_api_key,
    iv: data.api_key_iv,
    legacyPlaintext: data.api_key,
  });

  return {
    ...(data as ResendSettings),
    api_key: apiKey,
  };
}

export function toSafeResendSettings(row: ResendSettings | null): SafeResendSettings {
  const hasKey = hasStoredSecret({
    encrypted: row?.encrypted_api_key,
    legacyPlaintext: row?.api_key,
  }) || Boolean(row?.api_key?.trim());
  return {
    from_email: row?.from_email ?? null,
    from_name: row?.from_name ?? null,
    enabled: row?.enabled ?? false,
    configured: hasKey && Boolean(row?.from_email?.trim()),
    api_key_masked: hasKey ? SECRET_MASK : '',
    updated_at: row?.updated_at ?? null,
  };
}

export async function packResendApiKey(
  adminClient: SupabaseClient,
  apiKey: string,
): Promise<{
  api_key: string;
  encrypted_api_key: string;
  api_key_iv: string;
  dek_version: number;
}> {
  const packed = await packSecret(adminClient, apiKey);
  return {
    api_key: '',
    encrypted_api_key: packed.encrypted,
    api_key_iv: packed.iv,
    dek_version: packed.dekVersion,
  };
}

export async function sendResendEmail(
  settings: ResendSettings,
  params: { to: string; subject: string; html: string; attachments?: EmailInlineAttachment[] },
): Promise<{ messageId: string }> {
  const fromName = settings.from_name?.trim() || 'Gradito';
  const fromEmail = settings.from_email?.trim();
  if (!fromEmail) throw new Error('Sender email is not configured');
  if (!settings.api_key?.trim()) throw new Error('API key is not configured');

  const attachments = resolveEmailAttachments(params.html, params.attachments);

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
      ...(attachments.length > 0
        ? {
            attachments: attachments.map((a) => ({
              filename: a.filename,
              content: a.contentBase64,
              content_id: a.contentId,
              content_type: a.contentType,
            })),
          }
        : {}),
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    const message = data?.message || data?.error || 'Failed to send email';
    throw new Error(message);
  }

  return { messageId: data.id as string };
}
