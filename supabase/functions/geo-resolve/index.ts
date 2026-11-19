import { corsHeaders, createServiceClient, jsonResponse, requireAuth } from '../_shared/auth.ts';
import { geocodeChefCity } from '../_shared/geocode.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json().catch(() => ({}));
    const chefId = typeof body.chef_id === 'string' ? body.chef_id : null;
    if (!chefId) return jsonResponse({ error: 'chef_id required' }, 400);

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