import {
  corsHeaders,
  createServiceClient,
  jsonResponse,
  requireAdmin,
  requireAuth,
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

async function handleInvokeLlm(
  body: Record<string, unknown>,
  adminClient: ReturnType<typeof createServiceClient>,
) {
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) {
    return jsonResponse({ error: 'prompt is required' }, 400);
  }

  const settings = await loadSettings(adminClient);
  const apiKey = settings?.api_key?.trim();
  if (!apiKey) {
    return jsonResponse({ error: 'OpenAI is not configured. Set an API key under Admin → Integrations → OpenAI.' }, 400);
  }
  if (!settings?.enabled) {
    return jsonResponse({ error: 'OpenAI integration is disabled. Enable it under Admin → Integrations → OpenAI.' }, 400);
  }

  const model = settings.default_model_id?.trim() || 'gpt-4o-mini';
  const wantsJson = body.response_json_schema != null && typeof body.response_json_schema === 'object';

  // Reasoning models (o1/o3/o4, gpt-5*) often reject custom temperature.
  const modelLower = model.toLowerCase();
  const omitTemperature = /^o[0-9]/.test(modelLower) || modelLower.startsWith('gpt-5');

  const messages: Array<{ role: string; content: string }> = [
    {
      role: 'system',
      content: wantsJson
        ? 'You are a careful assistant. Respond with a single valid JSON object only — no markdown fences, no commentary.'
        : 'You are a concise assistant. Follow the user instructions exactly.',
    },
    {
      role: 'user',
      content: wantsJson
        ? `${prompt}\n\nJSON schema to follow:\n${JSON.stringify(body.response_json_schema)}`
        : prompt,
    },
  ];

  const buildPayload = (includeTemperature: boolean): Record<string, unknown> => {
    const payload: Record<string, unknown> = { model, messages };
    if (includeTemperature) payload.temperature = 0.2;
    if (wantsJson) payload.response_format = { type: 'json_object' };
    return payload;
  };

  const callCompletions = async (payload: Record<string, unknown>) => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const completion = await response.json().catch(() => ({}));
    return { response, completion };
  };

  let { response, completion } = await callCompletions(buildPayload(!omitTemperature));

  // Safety net: retry once without temperature if the model rejects it.
  if (
    !response.ok
    && !omitTemperature
    && typeof completion?.error?.message === 'string'
    && /temperature/i.test(completion.error.message)
  ) {
    ({ response, completion } = await callCompletions(buildPayload(false)));
  }

  if (!response.ok) {
    const message = typeof completion?.error?.message === 'string'
      ? completion.error.message
      : `OpenAI API error (${response.status})`;
    return jsonResponse({ error: message }, 400);
  }

  const content = completion?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    return jsonResponse({ error: 'OpenAI returned an empty response' }, 502);
  }

  if (wantsJson) {
    try {
      const parsed = JSON.parse(content);
      return jsonResponse({ result: parsed });
    } catch {
      return jsonResponse({ error: 'OpenAI returned invalid JSON' }, 502);
    }
  }

  return jsonResponse({ result: content.trim() });
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

    if (action === 'invoke_llm') {
      const authResult = await requireAuth(req);
      if (authResult.error) return authResult.error;
      return handleInvokeLlm(body, authResult.adminClient);
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
