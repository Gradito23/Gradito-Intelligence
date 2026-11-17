import { createServiceClient, jsonResponse } from './auth.ts';
import {
  extractCounterpartyFromWebhook,
  extractIdsFromEnvelope,
  applyMessagingOptOutByPhone,
  extractMessageBody,
  extractTranscriptBody,
  isSmsOptOutKeyword,
  normalizeE164,
  resolveChefIdByPhone,
  resolveProspectIdByPhone,
} from './quo.ts';

function decodeSigningKey(secret: string): Uint8Array {
  const trimmed = secret.trim();
  const raw = trimmed.startsWith('whsec_') ? trimmed.slice(6) : trimmed;
  try {
    const binary = atob(raw);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return new TextEncoder().encode(raw);
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacSha256Base64(keyBytes: Uint8Array, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  let binary = '';
  const bytes = new Uint8Array(sig);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export async function verifyQuoWebhookSignature(
  rawBody: string,
  headers: Headers,
  signingSecret: string,
): Promise<boolean> {
  if (!signingSecret.trim()) {
    console.error('Quo webhook: missing signing secret');
    return false;
  }
  const webhookId = headers.get('webhook-id')?.trim();
  const timestamp = headers.get('webhook-timestamp')?.trim();
  const signatureHeader = headers.get('webhook-signature')?.trim();
  if (!webhookId || !timestamp || !signatureHeader) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 60 * 30) return false;

  const signedPayload = `${webhookId}.${timestamp}.${rawBody}`;
  const keyBytes = decodeSigningKey(signingSecret);
  const expected = await hmacSha256Base64(keyBytes, signedPayload);

  const entries = signatureHeader.split(/\s+/).filter((e) => e.startsWith('v1,'));
  for (const entry of entries) {
    const provided = entry.slice(3);
    if (timingSafeEqual(provided, expected)) return true;
  }
  return false;
}

type InsertEventInput = {
  channel: 'sms' | 'call_transcript';
  direction: 'inbound' | 'outbound';
  webhookDeliveryId: string;
  envelope: Record<string, unknown>;
};

export async function insertQuoCommunicationFromWebhook(input: InsertEventInput): Promise<Response> {
  const adminClient = createServiceClient();
  const { channel, direction, webhookDeliveryId, envelope } = input;

  const { data: existing } = await adminClient
    .from('quo_communication_events')
    .select('id')
    .eq('webhook_delivery_id', webhookDeliveryId)
    .maybeSingle();

  if (existing?.id) {
    return jsonResponse({ ok: true, duplicate: true });
  }

  const counterparty = extractCounterpartyFromWebhook(envelope);
  const counterpartyE164 = normalizeE164(counterparty);
  const chefId = await resolveChefIdByPhone(adminClient, counterpartyE164);
  const prospectId = await resolveProspectIdByPhone(adminClient, counterpartyE164);

  const ids = extractIdsFromEnvelope(envelope);
  const bodyText = channel === 'call_transcript'
    ? extractTranscriptBody(envelope)
    : extractMessageBody(envelope);

  const data = envelope.data as Record<string, unknown> | undefined;
  const payload = {
    resource: data?.resource ?? {},
    context: data?.context ?? {},
    type: envelope.type,
    apiVersion: envelope.apiVersion,
  };

  const { error } = await adminClient.from('quo_communication_events').insert({
    chef_id: chefId,
    prospect_id: prospectId,
    channel,
    direction,
    quo_conversation_id: ids.quo_conversation_id,
    quo_message_id: channel === 'sms' ? ids.quo_message_id : null,
    quo_call_id: channel === 'call_transcript' ? ids.quo_call_id : null,
    counterparty_phone_e164: counterpartyE164,
    body_text: bodyText || null,
    payload,
    webhook_delivery_id: webhookDeliveryId,
    occurred_at: ids.occurred_at,
  });

  if (error) {
    if (error.code === '23505') {
      return jsonResponse({ ok: true, duplicate: true });
    }
    console.error('quo webhook insert:', error.message);
    return jsonResponse({ error: 'Failed to persist event' }, 500);
  }

  if (
    channel === 'sms'
    && direction === 'inbound'
    && isSmsOptOutKeyword(bodyText)
    && counterpartyE164
  ) {
    await applyMessagingOptOutByPhone(adminClient, counterpartyE164);
  }

  return jsonResponse({ ok: true });
}

export async function handleQuoWebhookRequest(
  req: Request,
  signingSecretEnvKey: string,
  channel: 'sms' | 'call_transcript',
  acceptedTypes: string[],
): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const secret = Deno.env.get(signingSecretEnvKey)?.trim() || '';
  const rawBody = await req.text();

  const valid = await verifyQuoWebhookSignature(rawBody, req.headers, secret);
  if (!valid) {
    return jsonResponse({ error: 'Invalid signature' }, 401);
  }

  const webhookDeliveryId = req.headers.get('webhook-id')?.trim();
  if (!webhookDeliveryId) {
    return jsonResponse({ error: 'Missing webhook-id' }, 400);
  }

  let envelope: Record<string, unknown>;
  try {
    envelope = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    console.warn('quo webhook: invalid JSON');
    return jsonResponse({ ok: true, ignored: true });
  }

  const type = typeof envelope.type === 'string' ? envelope.type : '';
  if (!acceptedTypes.includes(type)) {
    return jsonResponse({ ok: true, ignored: true, type });
  }

  const direction = type === 'message.delivered' || type === 'message.failed' || type === 'message.undelivered'
    ? 'outbound'
    : 'inbound';

  return insertQuoCommunicationFromWebhook({
    channel,
    direction,
    webhookDeliveryId,
    envelope,
  });
}