import { createServiceClient } from './auth.ts';
import {
  backfillIntegrationSecrets,
  hasStoredSecret,
  packSecret,
  resolveSecret,
} from './crypto.ts';

export const QUO_API_VERSION = '2026-03-30';
export const QUO_API_BASE = 'https://api.quo.com';

export type QuoSettings = {
  id: number;
  api_key: string;
  enabled: boolean;
  last_test_at: string | null;
  last_test_summary: string | null;
  updated_at: string;
  encrypted_api_key?: string | null;
  api_key_iv?: string | null;
  dek_version?: number | null;
};

export type QuoEnvConfig = {
  phoneNumberId: string;
  phoneNumberE164: string;
};

export function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, '');
}

/** Normalize to E.164 with US default when 10 digits. */
export function normalizeE164(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  const raw = phone.trim();
  if (/^\+[1-9]\d{1,14}$/.test(raw)) return raw;
  const digits = digitsOnly(raw);
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
}

export function phonesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const da = digitsOnly(a || '');
  const db = digitsOnly(b || '');
  if (!da || !db) return false;
  if (da === db) return true;
  if (da.length === 10 && db.length === 11 && db.endsWith(da)) return true;
  if (db.length === 10 && da.length === 11 && da.endsWith(db)) return true;
  return false;
}

export function getQuoEnvConfig(): QuoEnvConfig {
  return {
    phoneNumberId: Deno.env.get('QUO_PHONE_NUMBER_ID')?.trim() || '',
    phoneNumberE164: Deno.env.get('QUO_PHONE_NUMBER_E164')?.trim() || '',
  };
}

export function maskPhoneLabel(e164: string | null | undefined): string {
  if (!e164?.trim()) return 'not configured';
  const d = digitsOnly(e164);
  if (d.length < 4) return '***';
  return `…${d.slice(-4)}`;
}

async function packQuoApiKey(
  adminClient: ReturnType<typeof createServiceClient>,
  apiKey: string,
) {
  const packed = await packSecret(adminClient, apiKey);
  return {
    api_key: '',
    encrypted_api_key: packed.encrypted,
    api_key_iv: packed.iv,
    dek_version: packed.dekVersion,
  };
}

export async function loadQuoSettings(
  adminClient: ReturnType<typeof createServiceClient>,
): Promise<QuoSettings | null> {
  await backfillIntegrationSecrets(adminClient);

  const { data, error } = await adminClient
    .from('integration_quo_settings')
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

  return { ...data, api_key: apiKey };
}

export async function packQuoApiKeyForSave(
  adminClient: ReturnType<typeof createServiceClient>,
  apiKey: string,
) {
  return packQuoApiKey(adminClient, apiKey);
}

export function quoConfigured(settings: QuoSettings | null): boolean {
  if (!settings) return false;
  return hasStoredSecret({
    encrypted: settings.encrypted_api_key,
    legacyPlaintext: settings.api_key,
  }) || Boolean(settings.api_key?.trim());
}

export async function quoFetch(
  apiKey: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = path.startsWith('http') ? path : `${QUO_API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(init.headers);
  headers.set('Authorization', apiKey);
  headers.set('Quo-Api-Version', QUO_API_VERSION);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(url, { ...init, headers });
}

export async function quoJson<T = unknown>(
  apiKey: string,
  path: string,
  init: RequestInit = {},
): Promise<{ ok: boolean; status: number; data: T; raw: unknown }> {
  const response = await quoFetch(apiKey, path, init);
  const raw = await response.json().catch(() => ({}));
  return {
    ok: response.ok,
    status: response.status,
    data: raw as T,
    raw,
  };
}

export function isSmsOptOutKeyword(body: string | null | undefined): boolean {
  const normalized = (body || '').trim().toUpperCase();
  return [
    'STOP',
    'STOPALL',
    'UNSUBSCRIBE',
    'CANCEL',
    'END',
    'QUIT',
  ].includes(normalized);
}

export async function resolveProspectIdByPhone(
  adminClient: ReturnType<typeof createServiceClient>,
  counterpartyE164: string | null,
): Promise<string | null> {
  if (!counterpartyE164) return null;
  const { data: prospects, error } = await adminClient
    .from('chef_invite_prospects')
    .select('id, phone, mobile')
    .eq('archived', false);
  if (error) {
    console.error('resolveProspectIdByPhone:', error.message);
    return null;
  }
  const matches = (prospects || []).filter(
    (p) => phonesMatch(counterpartyE164, p.mobile) || phonesMatch(counterpartyE164, p.phone),
  );
  if (matches.length === 1) return matches[0].id;
  if (matches.length > 1) {
    console.warn('resolveProspectIdByPhone: multiple prospects for', counterpartyE164);
    return matches[0].id;
  }
  return null;
}

export async function applyMessagingOptOutByPhone(
  adminClient: ReturnType<typeof createServiceClient>,
  counterpartyE164: string | null,
): Promise<void> {
  if (!counterpartyE164) return;
  const now = new Date().toISOString();

  const { data: chefs } = await adminClient
    .from('chefs')
    .select('id, phone, mobile')
    .eq('archived', false);

  const chefIds = (chefs || [])
    .filter((c) => phonesMatch(counterpartyE164, c.mobile) || phonesMatch(counterpartyE164, c.phone))
  .map((c) => c.id);

  if (chefIds.length) {
    await adminClient
      .from('chefs')
      .update({ gradito_messaging_opt_in: false, gradito_messaging_opt_out_at: now })
      .in('id', chefIds);
  }

  const { data: prospects } = await adminClient
    .from('chef_invite_prospects')
    .select('id, phone, mobile')
    .eq('archived', false);

  const prospectIds = (prospects || [])
    .filter((p) => phonesMatch(counterpartyE164, p.mobile) || phonesMatch(counterpartyE164, p.phone))
    .map((p) => p.id);

  if (prospectIds.length) {
    await adminClient
      .from('chef_invite_prospects')
      .update({ gradito_messaging_opt_in: false, gradito_messaging_opt_out_at: now })
      .in('id', prospectIds);
  }
}

export async function resolveChefIdByPhone(
  adminClient: ReturnType<typeof createServiceClient>,
  counterpartyE164: string | null,
): Promise<string | null> {
  if (!counterpartyE164) return null;
  const { data: chefs, error } = await adminClient
    .from('chefs')
    .select('id, phone, mobile')
    .eq('archived', false);
  if (error) {
    console.error('resolveChefIdByPhone:', error.message);
    return null;
  }
  const matches = (chefs || []).filter(
    (c) => phonesMatch(counterpartyE164, c.mobile) || phonesMatch(counterpartyE164, c.phone),
  );
  if (matches.length === 1) return matches[0].id;
  if (matches.length > 1) {
    console.warn('resolveChefIdByPhone: multiple chefs for', counterpartyE164);
  }
  return null;
}

export type SendMessageBody = {
  content: string;
  from: string;
  to: string[];
};

export async function quoSendTextMessage(apiKey: string, body: SendMessageBody) {
  const payload = {
    content: body.content,
    from: body.from,
    to: body.to,
  };
  let result = await quoJson<{ data?: Record<string, unknown> }>(apiKey, '/messages', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (result.status === 404) {
    result = await quoJson(apiKey, '/v1/messages', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
  return result;
}

export function extractCounterpartyFromWebhook(envelope: Record<string, unknown>): string | null {
  const data = envelope.data as Record<string, unknown> | undefined;
  const resource = data?.resource as Record<string, unknown> | undefined;
  const context = data?.context as Record<string, unknown> | undefined;

  const from = normalizeE164(
    typeof resource?.from === 'string' ? resource.from
      : typeof resource?.fromNumber === 'string' ? resource.fromNumber
      : null,
  );
  const to = normalizeE164(
    typeof resource?.to === 'string' ? resource.to
      : Array.isArray(resource?.to) && typeof resource.to[0] === 'string' ? resource.to[0]
      : typeof resource?.toNumber === 'string' ? resource.toNumber
      : null,
  );

  const senderIdentifier = normalizeE164(
    typeof context?.senderIdentifier === 'string' ? context.senderIdentifier : null,
  );
  const recipientIdentifiers = Array.isArray(context?.recipientIdentifiers)
    ? (context.recipientIdentifiers as unknown[])
      .filter((id): id is string => typeof id === 'string')
      .map((id) => normalizeE164(id))
      .filter(Boolean) as string[]
    : [];
  const recipientIdentifier = recipientIdentifiers[0] ?? null;

  const participants = context?.participants as Array<{ phoneNumber?: string }> | undefined;
  if (participants?.length) {
    for (const p of participants) {
      const e164 = normalizeE164(p.phoneNumber);
      if (e164) return e164;
    }
  }

  const type = typeof envelope.type === 'string' ? envelope.type : '';
  if (type.startsWith('message.')) {
    if (type === 'message.received') {
      return senderIdentifier || from || to || recipientIdentifier;
    }
    if (type === 'message.delivered' || type === 'message.failed' || type === 'message.undelivered') {
      return recipientIdentifier || to || from || senderIdentifier;
    }
    return senderIdentifier || from || to || recipientIdentifier;
  }
  if (type.startsWith('call.')) {
    const ext = normalizeE164(
      typeof resource?.externalNumber === 'string' ? resource.externalNumber
        : typeof resource?.participantPhoneNumber === 'string' ? resource.participantPhoneNumber
        : typeof context?.externalPhoneNumber === 'string' ? context.externalPhoneNumber
        : null,
    );
    return ext || from || to;
  }
  return from || to;
}

export function extractMessageBody(envelope: Record<string, unknown>): string {
  const data = envelope.data as Record<string, unknown> | undefined;
  const resource = data?.resource as Record<string, unknown> | undefined;
  if (typeof resource?.body === 'string') return resource.body;
  if (typeof resource?.text === 'string') return resource.text;
  if (typeof resource?.content === 'string') return resource.content;
  return '';
}

export function extractTranscriptBody(envelope: Record<string, unknown>): string {
  const data = envelope.data as Record<string, unknown> | undefined;
  const resource = data?.resource as Record<string, unknown> | undefined;
  if (typeof resource?.transcript === 'string') return resource.transcript;
  if (typeof resource?.text === 'string') return resource.text;
  if (Array.isArray(resource?.segments)) {
    return (resource.segments as Array<{ text?: string }>)
      .map((s) => s.text || '')
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

export function extractIdsFromEnvelope(envelope: Record<string, unknown>) {
  const data = envelope.data as Record<string, unknown> | undefined;
  const resource = data?.resource as Record<string, unknown> | undefined;
  const context = data?.context as Record<string, unknown> | undefined;

  return {
    quo_message_id: typeof resource?.id === 'string' ? resource.id : null,
    quo_call_id: typeof resource?.callId === 'string'
      ? resource.callId
      : typeof resource?.id === 'string' ? resource.id : null,
    quo_conversation_id: typeof context?.conversationId === 'string'
      ? context.conversationId
      : typeof resource?.conversationId === 'string' ? resource.conversationId : null,
    occurred_at: typeof envelope.createdAt === 'string'
      ? envelope.createdAt
      : typeof resource?.createdAt === 'string' ? resource.createdAt : new Date().toISOString(),
  };
}