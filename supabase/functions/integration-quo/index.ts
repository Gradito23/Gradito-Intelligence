import {
  corsHeaders,
  createServiceClient,
  jsonResponse,
  requireAdmin,
  requireAuth,
  SECRET_MASK,
} from '../_shared/auth.ts';

type AdminClient = ReturnType<typeof createServiceClient>;
import { backfillIntegrationSecrets } from '../_shared/crypto.ts';
import {
  getQuoEnvConfig,
  loadQuoSettings,
  maskPhoneLabel,
  normalizeE164,
  packQuoApiKeyForSave,
  quoConfigured,
  quoJson,
  quoSendTextMessage,
  type QuoSettings,
} from '../_shared/quo.ts';

function keepExistingSecret(input: string): boolean {
  return !input || input === SECRET_MASK;
}

function toSafeSettings(settings: QuoSettings | null) {
  if (!settings) {
    return {
      configured: false,
      enabled: false,
      api_key_masked: '',
      last_test_at: null,
      last_test_summary: null,
      updated_at: null,
    };
  }
  const configured = quoConfigured(settings);
  return {
    configured,
    enabled: settings.enabled,
    api_key_masked: configured ? SECRET_MASK : '',
    last_test_at: settings.last_test_at,
    last_test_summary: settings.last_test_summary,
    updated_at: settings.updated_at,
  };
}

function toPublicStatus(settings: QuoSettings | null) {
  const safe = toSafeSettings(settings);
  return {
    configured: safe.configured,
    enabled: safe.enabled && safe.configured,
    last_test_summary: safe.last_test_summary,
  };
}

async function handleGet(adminClient: AdminClient) {
  const settings = await loadQuoSettings(adminClient);
  return jsonResponse(toSafeSettings(settings));
}

async function handleGetStatus(adminClient: AdminClient) {
  const settings = await loadQuoSettings(adminClient);
  return jsonResponse(toPublicStatus(settings));
}

async function handleSaveSettings(
  body: Record<string, unknown>,
  user: { id: string },
  adminClient: AdminClient,
) {
  const apiKeyInput = typeof body.api_key === 'string' ? body.api_key.trim() : '';
  const enabledInput = typeof body.enabled === 'boolean' ? body.enabled : undefined;

  const existing = await loadQuoSettings(adminClient);
  const apiKey = keepExistingSecret(apiKeyInput) ? (existing?.api_key?.trim() || '') : apiKeyInput;
  if (!apiKey) {
    return jsonResponse({ error: 'API key is required' }, 400);
  }

  const enabled = enabledInput ?? Boolean(apiKey);
  const secretFields = await packQuoApiKeyForSave(adminClient, apiKey);

  const { data, error } = await adminClient
    .from('integration_quo_settings')
    .upsert({
      id: 1,
      ...secretFields,
      enabled,
      updated_by: user.id,
    })
    .select('*')
    .single();

  if (error) throw error;
  return jsonResponse(toSafeSettings({ ...data, api_key: apiKey }));
}

function formatA2pSummary(a2p: Record<string, unknown> | null, statusCode: number): string {
  if (statusCode === 404) return 'A2P: no registration on file (404)';
  if (!a2p) return 'A2P: unavailable';
  const status = typeof a2p.status === 'string' ? a2p.status : 'unknown';
  const brand = typeof a2p.brandName === 'string' ? a2p.brandName : null;
  return brand ? `A2P: ${status} (${brand})` : `A2P: ${status}`;
}

async function handleTestConnection(
  user: { id: string },
  adminClient: AdminClient,
) {
  const settings = await loadQuoSettings(adminClient);
  const apiKey = settings?.api_key?.trim();
  if (!apiKey) {
    return jsonResponse({ error: 'Quo is not configured' }, 400);
  }

  const env = getQuoEnvConfig();
  if (!env.phoneNumberId && !env.phoneNumberE164) {
    return jsonResponse({
      error: 'Set QUO_PHONE_NUMBER_ID or QUO_PHONE_NUMBER_E164 in Supabase edge secrets.',
    }, 400);
  }

  try {
    const users = await quoJson(apiKey, '/users?limit=1');
    if (!users.ok) {
      const message = (users.raw as { message?: string })?.message || `Quo API error (${users.status})`;
      throw new Error(message);
    }

    const a2p = await quoJson<{ data?: Record<string, unknown> }>(apiKey, '/a2p-registration');
    const a2pLine = formatA2pSummary(a2p.data?.data ?? null, a2p.status);

    let senderLine = 'Sender number: not verified';
    if (env.phoneNumberId) {
      const pn = await quoJson<{ data?: { number?: string; name?: string } }>(
        apiKey,
        `/phone-numbers/${encodeURIComponent(env.phoneNumberId)}`,
      );
      if (pn.ok && pn.data?.data) {
        const number = pn.data.data.number || env.phoneNumberE164;
        senderLine = `Sender number: ${maskPhoneLabel(number)}`;
      } else {
        senderLine = 'Sender number: QUO_PHONE_NUMBER_ID not found in workspace';
      }
    } else if (env.phoneNumberE164) {
      senderLine = `Sender number: ${maskPhoneLabel(env.phoneNumberE164)}`;
    }

    const summary = `Connection OK. ${a2pLine}. ${senderLine}.`;
    const now = new Date().toISOString();

    await adminClient
      .from('integration_quo_settings')
      .update({
        last_test_at: now,
        last_test_summary: summary,
        updated_by: user.id,
      })
      .eq('id', 1);

    return jsonResponse({ ok: true, summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connection failed';
    return jsonResponse({ error: message }, 400);
  }
}

async function handleSendMessage(
  body: Record<string, unknown>,
  user: { id: string },
  adminClient: AdminClient,
) {
  const settings = await loadQuoSettings(adminClient);
  if (!settings?.enabled || !quoConfigured(settings)) {
    return jsonResponse({ error: 'Quo integration is not enabled' }, 400);
  }

  const chefId = typeof body.chef_id === 'string' ? body.chef_id.trim() : '';
  const prospectId = typeof body.prospect_id === 'string' ? body.prospect_id.trim() : '';
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  const eventId = typeof body.event_id === 'string' ? body.event_id.trim() : null;
  const toOverride = typeof body.to === 'string' ? body.to.trim() : '';
  const markIntakeInvite = body.mark_intake_invite === true;

  if (!content) return jsonResponse({ error: 'content is required' }, 400);
  if (markIntakeInvite && !prospectId) {
    return jsonResponse({ error: 'prospect_id is required for intake invite SMS' }, 400);
  }
  if (!chefId && !prospectId) {
    return jsonResponse({ error: 'chef_id or prospect_id is required' }, 400);
  }

  let toE164: string | null = null;
  if (prospectId) {
    const { data: prospect, error: prospectError } = await adminClient
      .from('chef_invite_prospects')
      .select('id, phone, mobile, archived, status')
      .eq('id', prospectId)
      .maybeSingle();

    if (prospectError) throw prospectError;
    if (!prospect || prospect.archived) {
      return jsonResponse({ error: 'Invite prospect not found' }, 404);
    }
    if (prospect.status === 'joined') {
      return jsonResponse({ error: 'Prospect has already joined' }, 400);
    }

    toE164 = normalizeE164(toOverride || prospect.mobile || prospect.phone);
  } else {
    const { data: chef, error: chefError } = await adminClient
      .from('chefs')
      .select('id, phone, mobile, archived')
      .eq('id', chefId)
      .maybeSingle();

    if (chefError) throw chefError;
    if (!chef || chef.archived) {
      return jsonResponse({ error: 'Chef not found' }, 404);
    }

    toE164 = normalizeE164(toOverride || chef.mobile || chef.phone);
  }

  if (!toE164) {
    return jsonResponse({ error: 'No valid phone or mobile number' }, 400);
  }

  const env = getQuoEnvConfig();
  const from = env.phoneNumberId || env.phoneNumberE164;
  if (!from) {
    return jsonResponse({ error: 'QUO_PHONE_NUMBER_ID or QUO_PHONE_NUMBER_E164 is not set' }, 500);
  }

  const apiKey = settings.api_key.trim();
  const sendResult = await quoSendTextMessage(apiKey, {
    content,
    from,
    to: [toE164],
  });

  if (!sendResult.ok) {
    const message = (sendResult.raw as { message?: string })?.message
      || `Quo send failed (${sendResult.status})`;
    return jsonResponse({ error: message }, 400);
  }

  const resource = (sendResult.data as { data?: Record<string, unknown> })?.data ?? {};
  const quoMessageId = typeof resource.id === 'string' ? resource.id : null;
  const quoConversationId = typeof resource.conversationId === 'string'
    ? resource.conversationId
    : null;
  const occurredAt = typeof resource.createdAt === 'string'
    ? resource.createdAt
    : new Date().toISOString();

  const { data: row, error: insertError } = await adminClient
    .from('quo_communication_events')
    .insert({
      chef_id: chefId || null,
      prospect_id: prospectId || null,
      event_id: eventId,
      channel: 'sms',
      direction: 'outbound',
      quo_conversation_id: quoConversationId,
      quo_message_id: quoMessageId,
      counterparty_phone_e164: toE164,
      body_text: content,
      payload: { resource, sent_via: 'integration-quo' },
      sent_by_profile_id: user.id,
      occurred_at: occurredAt,
    })
    .select('id, occurred_at, quo_message_id')
    .single();

  if (insertError) throw insertError;

  if (markIntakeInvite && prospectId) {
    const now = new Date().toISOString();
    await adminClient
      .from('chef_invite_prospects')
      .update({
        intake_invite_last_sent_at: now,
        status: 'invited',
      })
      .eq('id', prospectId);
  }

  return jsonResponse({
    ok: true,
    event: row,
    quo_message_id: quoMessageId,
  });
}

async function handleBackfill(adminClient: AdminClient) {
  if (!Deno.env.get('PLATFORM_KEK')?.trim()) {
    return jsonResponse({
      error: 'PLATFORM_KEK is not set. Generate with: openssl rand -base64 32 && npx supabase secrets set PLATFORM_KEK=<value>',
    }, 400);
  }
  const result = await backfillIntegrationSecrets(adminClient);
  return jsonResponse({ ok: true, ...result });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : 'get';

    if (action === 'get_status' || action === 'send_message') {
      const authResult = await requireAuth(req);
      if (authResult.error) return authResult.error;
      const { user, adminClient } = authResult;

      if (action === 'get_status') {
        return handleGetStatus(adminClient);
      }
      return handleSendMessage(body, user, adminClient);
    }

    const authResult = await requireAdmin(req);
    if (authResult.error) return authResult.error;
    const { user, adminClient } = authResult;

    switch (action) {
      case 'get':
        return handleGet(adminClient);
      case 'save_settings':
        return handleSaveSettings(body, user, adminClient);
      case 'test_connection':
        return handleTestConnection(user, adminClient);
      case 'backfill_secrets':
        return handleBackfill(adminClient);
      default:
        return jsonResponse({ error: 'Unknown action' }, 400);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('integration-quo error:', message);
    return jsonResponse({ error: message }, 500);
  }
});