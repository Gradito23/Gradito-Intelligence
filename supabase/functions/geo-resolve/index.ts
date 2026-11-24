import { corsHeaders, createServiceClient, jsonResponse, requireAuth } from '../_shared/auth.ts';
import { geocodeChefCity, geocodeServiceAreaName } from '../_shared/geocode.ts';

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
  const point = name ? await geocodeServiceAreaName(name) : null;
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