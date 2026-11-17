import {
  corsHeaders,
  createServiceClient,
  jsonResponse,
  requireAdmin,
  requireAuth,
} from '../_shared/auth.ts';
import { backfillIntegrationSecrets, resolveSecret } from '../_shared/crypto.ts';

type ChefSafeSnapshot = {
  event_date: string | null;
  service_area: string | null;
  experience_type: string | null;
  event_type: string | null;
  cuisines_served: string[];
  guest_count: number | null;
  staffing_roles: Array<{ role: string; filled: boolean }>;
};

type JobAiContent = {
  title: string;
  hero_subtitle: string;
  summary: string;
  bullets: string[];
  requirements: string[];
};

async function loadOpenAI(adminClient: ReturnType<typeof createServiceClient>) {
  await backfillIntegrationSecrets(adminClient);
  const { data, error } = await adminClient
    .from('integration_openai_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.enabled) return null;
  const apiKey = await resolveSecret(adminClient, {
    encrypted: data.encrypted_api_key,
    iv: data.api_key_iv,
    legacyPlaintext: data.api_key,
  });
  if (!apiKey?.trim()) return null;
  const model = (data.default_model_id as string)?.trim() || 'gpt-4o-mini';
  return { apiKey, model };
}

function buildChefSafeSnapshot(
  event: Record<string, unknown>,
  eventChefs: Array<{ role: string; chef_name: string | null }>,
): ChefSafeSnapshot {
  const cuisines = Array.isArray(event.cuisines_served)
    ? (event.cuisines_served as string[]).filter(Boolean)
    : [];
  const roles = eventChefs.map((ec) => ({
    role: ec.role || 'Chef',
    filled: Boolean(ec.chef_name?.trim()),
  }));
  const guest = event.guest_count;
  return {
    event_date: event.date ? String(event.date) : null,
    service_area: event.service_area ? String(event.service_area) : null,
    experience_type: event.experience_type ? String(event.experience_type) : null,
    event_type: event.event_type ? String(event.event_type) : null,
    cuisines_served: cuisines,
    guest_count: guest != null && guest !== '' ? Number(guest) : null,
    staffing_roles: roles,
  };
}

async function callOpenAIForJob(
  apiKey: string,
  model: string,
  snapshot: ChefSafeSnapshot,
): Promise<JobAiContent> {
  const modelLower = model.toLowerCase();
  const omitTemperature = /^o[0-9]/.test(modelLower) || modelLower.startsWith('gpt-5');
  const schema = {
    title: 'string — short enticing job title for chefs',
    hero_subtitle: 'string — one line under the title',
    summary: 'string — 2-3 sentences, chef-facing',
    bullets: 'array of strings — what the chef will do',
    requirements: 'array of strings — skills or logistics, no client identity',
  };
  const messages = [
    {
      role: 'system',
      content:
        'You write chef recruitment copy for private dining events. Never mention client names, revenue, or internal business details. Respond with JSON only.',
    },
    {
      role: 'user',
      content: `Create chef job page copy from this data:\n${JSON.stringify(snapshot, null, 2)}\n\nSchema:\n${JSON.stringify(schema)}`,
    },
  ];
  const payload: Record<string, unknown> = {
    model,
    messages,
    response_format: { type: 'json_object' },
  };
  if (!omitTemperature) payload.temperature = 0.3;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const completion = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = typeof completion?.error?.message === 'string'
      ? completion.error.message
      : `OpenAI error (${response.status})`;
    throw new Error(msg);
  }
  const content = completion?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('Empty OpenAI response');
  const parsed = JSON.parse(content) as JobAiContent;
  return {
    title: String(parsed.title || 'Private chef opportunity').trim(),
    hero_subtitle: String(parsed.hero_subtitle || '').trim(),
    summary: String(parsed.summary || '').trim(),
    bullets: Array.isArray(parsed.bullets) ? parsed.bullets.map(String) : [],
    requirements: Array.isArray(parsed.requirements) ? parsed.requirements.map(String) : [],
  };
}

async function handlePublicGet(body: Record<string, unknown>) {
  const jobId = typeof body.job_id === 'string' ? body.job_id.trim() : '';
  if (!jobId) return jsonResponse({ error: 'job_id is required' }, 400);

  const adminClient = createServiceClient();
  const { data, error } = await adminClient
    .from('event_job_pages')
    .select('id, status, ai_content, source_snapshot, published_at')
    .eq('id', jobId)
    .maybeSingle();

  if (error) throw error;
  if (!data || data.status !== 'published') {
    return jsonResponse({ error: 'Job not found' }, 404);
  }

  return jsonResponse({
    id: data.id,
    ai_content: data.ai_content,
    source_snapshot: data.source_snapshot,
    published_at: data.published_at,
  });
}

async function handleGenerate(
  body: Record<string, unknown>,
  adminClient: ReturnType<typeof createServiceClient>,
) {
  const eventId = typeof body.event_id === 'string' ? body.event_id.trim() : '';
  if (!eventId) return jsonResponse({ error: 'event_id is required' }, 400);

  const { data: event, error: eventErr } = await adminClient
    .from('events')
    .select('id, date, service_area, event_type, experience_type, cuisines_served, guest_count, status')
    .eq('id', eventId)
    .maybeSingle();
  if (eventErr) throw eventErr;
  if (!event) return jsonResponse({ error: 'Event not found' }, 404);
  if (event.status !== 'Confirmed') {
    return jsonResponse({ error: 'Event must be Confirmed to publish a job page' }, 400);
  }

  const { data: eventChefs } = await adminClient
    .from('event_chefs')
    .select('role, chef_name')
    .eq('event_id', eventId);

  const snapshot = buildChefSafeSnapshot(event, eventChefs ?? []);
  const openai = await loadOpenAI(adminClient);

  const templateContent: JobAiContent = {
    title: `${snapshot.experience_type || 'Private dining'} — ${snapshot.service_area || 'Gradito'}`,
    hero_subtitle: snapshot.event_date ? `Event date: ${snapshot.event_date}` : 'Gradito chef opportunity',
    summary: 'Join Gradito for an exceptional private dining experience.',
    bullets: snapshot.staffing_roles.map((r) => `${r.role}${r.filled ? ' (filled)' : ' (needed)'}`),
    requirements: ['Professional culinary experience', 'Ability to travel to the service area'],
  };

  let aiContent = templateContent;
  let generationError: string | null = null;

  if (openai) {
    try {
      aiContent = await callOpenAIForJob(openai.apiKey, openai.model, snapshot);
    } catch (err) {
      generationError = err instanceof Error ? err.message : 'AI generation failed';
      aiContent = templateContent;
    }
  } else {
    generationError = 'OpenAI not configured';
    aiContent = templateContent;
  }

  const now = new Date().toISOString();
  const status = generationError ? 'draft' : 'published';
  const row = {
    event_id: eventId,
    status,
    source_snapshot: snapshot,
    ai_content: aiContent,
    generation_error: generationError,
    published_at: status === 'published' ? now : null,
  };

  const { data: existing } = await adminClient
    .from('event_job_pages')
    .select('id')
    .eq('event_id', eventId)
    .maybeSingle();

  let jobPage;
  if (existing?.id) {
    const { data, error } = await adminClient
      .from('event_job_pages')
      .update(row)
      .eq('id', existing.id)
      .select('id, status, generation_error, published_at')
      .single();
    if (error) throw error;
    jobPage = data;
  } else {
    const { data, error } = await adminClient
      .from('event_job_pages')
      .insert(row)
      .select('id, status, generation_error, published_at')
      .single();
    if (error) throw error;
    jobPage = data;
  }

  return jsonResponse({ job_page: jobPage, ai_fallback: Boolean(generationError) });
}

async function handleUnpublish(body: Record<string, unknown>, adminClient: ReturnType<typeof createServiceClient>) {
  const jobId = typeof body.job_id === 'string' ? body.job_id.trim() : '';
  if (!jobId) return jsonResponse({ error: 'job_id is required' }, 400);
  const { error } = await adminClient
    .from('event_job_pages')
    .update({ status: 'unpublished', published_at: null })
    .eq('id', jobId);
  if (error) throw error;
  return jsonResponse({ ok: true });
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
    const action = typeof body.action === 'string' ? body.action : '';

    if (action === 'public_get') {
      return await handlePublicGet(body);
    }

    if (action === 'generate') {
      const authResult = await requireAuth(req);
      if (authResult.error) return authResult.error;
      return await handleGenerate(body, authResult.adminClient);
    }

    if (action === 'unpublish' || action === 'regenerate') {
      const authResult = await requireAdmin(req);
      if (authResult.error) return authResult.error;
      if (action === 'unpublish') {
        return await handleUnpublish(body, authResult.adminClient);
      }
      return await handleGenerate(body, authResult.adminClient);
    }

    return jsonResponse({ error: 'Unknown action' }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error';
    return jsonResponse({ error: message }, 500);
  }
});