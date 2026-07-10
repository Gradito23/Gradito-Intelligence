import {
  corsHeaders,
  createServiceClient,
  jsonResponse,
  requireAdmin,
  SECRET_MASK,
} from '../_shared/auth.ts';

type OpenAIModel = {
  id: string;
  created: number;
  owned_by: string;
};

type OpenAISettings = {
  id: number;
  api_key: string;
  enabled: boolean;
  default_model_id: string | null;
  synced_models: OpenAIModel[];
  last_synced_at: string | null;
  last_sync_error: string | null;
  updated_at: string;
};

const CHAT_MODEL_PATTERN = /^(gpt-|o[0-9]|chatgpt-)/i;

async function loadSettings(adminClient: ReturnType<typeof createServiceClient>): Promise<OpenAISettings | null> {
  const { data, error } = await adminClient
    .from('integration_openai_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    synced_models: Array.isArray(data.synced_models) ? data.synced_models as OpenAIModel[] : [],
  };
}

function toSafeSettings(settings: OpenAISettings | null) {
  if (!settings) {
    return {
      configured: false,
      enabled: false,
      api_key_masked: '',
      default_model_id: null,
      synced_models: [],
      last_synced_at: null,
      last_sync_error: null,
      updated_at: null,
    };
  }

  return {
    configured: Boolean(settings.api_key?.trim()),
    enabled: settings.enabled,
    api_key_masked: settings.api_key?.trim() ? SECRET_MASK : '',
    default_model_id: settings.default_model_id,
    synced_models: settings.synced_models ?? [],
    last_synced_at: settings.last_synced_at,
    last_sync_error: settings.last_sync_error,
    updated_at: settings.updated_at,
  };
}

async function fetchOpenAIModels(apiKey: string): Promise<OpenAIModel[]> {
  const response = await fetch('https://api.openai.com/v1/models', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = typeof payload?.error?.message === 'string'
      ? payload.error.message
      : `OpenAI API error (${response.status})`;
    throw new Error(message);
  }

  const models = Array.isArray(payload?.data) ? payload.data : [];
  return models
    .filter((m: { id?: string }) => typeof m?.id === 'string' && CHAT_MODEL_PATTERN.test(m.id))
    .map((m: { id: string; created?: number; owned_by?: string }) => ({
      id: m.id,
      created: m.created ?? 0,
      owned_by: m.owned_by ?? 'unknown',
    }))
    .sort((a: OpenAIModel, b: OpenAIModel) => a.id.localeCompare(b.id));
}

async function handleGet(adminClient: ReturnType<typeof createServiceClient>) {
  const settings = await loadSettings(adminClient);
  return jsonResponse(toSafeSettings(settings));
}

async function handleSaveSettings(
  body: Record<string, unknown>,
  user: { id: string },
  adminClient: ReturnType<typeof createServiceClient>,
) {
  const apiKeyInput = typeof body.api_key === 'string' ? body.api_key.trim() : '';
  const enabledInput = typeof body.enabled === 'boolean' ? body.enabled : undefined;

  const existing = await loadSettings(adminClient);
  const apiKey = apiKeyInput || existing?.api_key?.trim() || '';
  if (!apiKey) {
    return jsonResponse({ error: 'API key is required' }, 400);
  }

  const enabled = enabledInput ?? Boolean(apiKey);

  const { data, error } = await adminClient
    .from('integration_openai_settings')
    .upsert({
      id: 1,
      api_key: apiKey,
      enabled,
      updated_by: user.id,
    })
    .select('*')
    .single();

  if (error) throw error;
  return jsonResponse(toSafeSettings({
    ...data,
    synced_models: Array.isArray(data.synced_models) ? data.synced_models : [],
  }));
}

async function handleTestConnection(adminClient: ReturnType<typeof createServiceClient>) {
  const settings = await loadSettings(adminClient);
  const apiKey = settings?.api_key?.trim();
  if (!apiKey) {
    return jsonResponse({ error: 'OpenAI is not configured' }, 400);
  }

  try {
    await fetchOpenAIModels(apiKey);
    return jsonResponse({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connection failed';
    return jsonResponse({ error: message }, 400);
  }
}

async function handleSyncModels(
  user: { id: string },
  adminClient: ReturnType<typeof createServiceClient>,
) {
  const settings = await loadSettings(adminClient);
  const apiKey = settings?.api_key?.trim();
  if (!apiKey) {
    return jsonResponse({ error: 'Save an API key before syncing models' }, 400);
  }

  try {
    const models = await fetchOpenAIModels(apiKey);
    const defaultModelId = settings?.default_model_id
      && models.some((m) => m.id === settings.default_model_id)
      ? settings.default_model_id
      : models[0]?.id ?? null;

    const { data, error } = await adminClient
      .from('integration_openai_settings')
      .upsert({
        id: 1,
        api_key: apiKey,
        enabled: settings?.enabled ?? true,
        synced_models: models,
        default_model_id: defaultModelId,
        last_synced_at: new Date().toISOString(),
        last_sync_error: null,
        updated_by: user.id,
      })
      .select('*')
      .single();

    if (error) throw error;

    return jsonResponse({
      ...toSafeSettings({
        ...data,
        synced_models: models,
      }),
      synced_count: models.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    await adminClient
      .from('integration_openai_settings')
      .upsert({
        id: 1,
        api_key: apiKey,
        last_sync_error: message,
        updated_by: user.id,
      });
    return jsonResponse({ error: message }, 400);
  }
}

async function handleSetDefaultModel(
  body: Record<string, unknown>,
  user: { id: string },
  adminClient: ReturnType<typeof createServiceClient>,
) {
  const modelId = typeof body.model_id === 'string' ? body.model_id.trim() : '';
  if (!modelId) {
    return jsonResponse({ error: 'model_id is required' }, 400);
  }

  const settings = await loadSettings(adminClient);
  const models = settings?.synced_models ?? [];
  if (!models.some((m) => m.id === modelId)) {
    return jsonResponse({ error: 'Model not found in synced list. Sync models first.' }, 400);
  }

  const { data, error } = await adminClient
    .from('integration_openai_settings')
    .upsert({
      id: 1,
      api_key: settings?.api_key ?? '',
      default_model_id: modelId,
      updated_by: user.id,
    })
    .select('*')
    .single();

  if (error) throw error;

  return jsonResponse(toSafeSettings({
    ...data,
    synced_models: Array.isArray(data.synced_models) ? data.synced_models : [],
  }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const authResult = await requireAdmin(req);
    if (authResult.error) return authResult.error;

    const { user, adminClient } = authResult;
    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : 'get';

    switch (action) {
      case 'get':
        return handleGet(adminClient);
      case 'save_settings':
        return handleSaveSettings(body, user, adminClient);
      case 'test_connection':
        return handleTestConnection(adminClient);
      case 'sync_models':
        return handleSyncModels(user, adminClient);
      case 'set_default_model':
        return handleSetDefaultModel(body, user, adminClient);
      default:
        return jsonResponse({ error: 'Unknown action' }, 400);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('integration-openai error:', message);
    return jsonResponse({ error: message }, 500);
  }
});
