import { corsHeaders, createServiceClient, jsonResponse, requireAuth } from '../_shared/auth.ts';
import { backfillIntegrationSecrets, resolveSecret } from '../_shared/crypto.ts';
import { geocodeChefCity, geocodePreparedPlaceLine, geocodeServiceAreaName } from '../_shared/geocode.ts';

const NOMINATIM_REWRITE_PROMPT = `Nominatim, the OpenStreetMap geocoder, already failed on this text. Rewrite it into the one place a Nominatim search will find.
Return JSON only: {"query":"<one place line, or empty>"}
Drop venue names, houses, parentheses, and filler. Do not return the original line.
Keep the town, city, state, or country that is already meant by the text, and add the state or country Nominatim needs.
Examples: "NJ" -> "New Jersey, USA". "The Bronx" -> "The Bronx, New York, USA". "Oslo" -> "Oslo, Norway". "The Moorings, Islamorada (the Keys)" -> "Islamorada, Florida, USA". "Amagansett at a private home" -> "Amagansett, New York, USA".
If the text is not a place, return {"query":""}.
Location:`;

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

async function rewriteLocationForNominatim(
  adminClient: ReturnType<typeof createServiceClient>,
  location: string,
): Promise<string | null> {
  const openai = await loadOpenAI(adminClient);
  if (!openai) return null;

  const modelLower = openai.model.toLowerCase();
  const omitTemperature = /^o[0-9]/.test(modelLower) || modelLower.startsWith('gpt-5');
  const payload: Record<string, unknown> = {
    model: openai.model,
    messages: [
      {
        role: 'system',
        content: 'You rewrite locations for the Nominatim geocoder. Respond with JSON only.',
      },
      {
        role: 'user',
        content: `${NOMINATIM_REWRITE_PROMPT}\n${location}`,
      },
    ],
    response_format: { type: 'json_object' },
  };
  if (!omitTemperature) payload.temperature = 0.2;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openai.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const completion = await response.json().catch(() => ({}));
  if (!response.ok) return null;
  const content = completion?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) return null;
  try {
    const parsed = JSON.parse(content);
    const query = typeof parsed?.query === 'string' ? parsed.query.trim() : '';
    return query || null;
  } catch {
    return null;
  }
}

async function resolveServiceArea(
  adminClient: ReturnType<typeof createServiceClient>,
  serviceAreaId: string,
) {
  const { data: area, error } = await adminClient
    .from('service_areas')
    .select('id, name, centroid_lat, centroid_lng')
    .eq('id', serviceAreaId)
    .maybeSingle();
  if (error) throw error;
  if (!area) return jsonResponse({ error: 'Service area not found' }, 404);

  if (area.centroid_lat != null && area.centroid_lng != null) {
    return jsonResponse({
      ok: true,
      skipped: true,
      reason: 'already_has_coordinates',
      geo_lat: area.centroid_lat,
      geo_lng: area.centroid_lng,
    });
  }

  const name = typeof area.name === 'string' ? area.name.trim() : '';
  let point = name ? await geocodeServiceAreaName(name) : null;
  if (!point && name) {
    try {
      const aiLine = await rewriteLocationForNominatim(adminClient, name);
      if (aiLine) point = await geocodePreparedPlaceLine(aiLine);
    } catch {
      point = null;
    }
  }
  if (!point) {
    return jsonResponse({ ok: true, skipped: true, reason: 'no_geocode_result' });
  }

  const { error: upErr } = await adminClient.from('service_areas').update({
    centroid_lat: point.lat,
    centroid_lng: point.lng,
  }).eq('id', serviceAreaId);
  if (upErr) throw upErr;

  return jsonResponse({ ok: true, geo_lat: point.lat, geo_lng: point.lng });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json().catch(() => ({}));
    const serviceAreaId = typeof body.service_area_id === 'string' ? body.service_area_id : null;
    if (serviceAreaId) return await resolveServiceArea(auth.adminClient, serviceAreaId);

    const chefId = typeof body.chef_id === 'string' ? body.chef_id : null;
    if (!chefId) return jsonResponse({ error: 'chef_id or service_area_id required' }, 400);

    const { data: chef, error } = await auth.adminClient
      .from('chefs')
      .select('id, city, state, geo_lat, geo_lng')
      .eq('id', chefId)
      .maybeSingle();
    if (error) throw error;
    if (!chef) return jsonResponse({ error: 'Chef not found' }, 404);

    const point = await geocodeChefCity(chef.city, chef.state);
    if (!point) {
      return jsonResponse({ ok: true, skipped: true, reason: 'no_geocode_result' });
    }

    const { error: upErr } = await auth.adminClient.from('chefs').update({
      geo_lat: point.lat,
      geo_lng: point.lng,
      geo_source: 'geocode_city',
    }).eq('id', chefId);
    if (upErr) throw upErr;

    return jsonResponse({ ok: true, geo_lat: point.lat, geo_lng: point.lng });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return jsonResponse({ error: message }, 500);
  }
});