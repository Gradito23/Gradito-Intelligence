import { supabase } from '@/api/supabaseClient';

function finiteCoord(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function searchNominatim(query) {
  const q = String(query || '').trim();
  if (!q) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(q)}`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) return null;
  const rows = await response.json();
  const hit = Array.isArray(rows) ? rows[0] : null;
  const lat = finiteCoord(hit?.lat);
  const lng = finiteCoord(hit?.lon);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

/** Server search first. If that misses and a query was saved, one browser search, then store the point. */
export async function resolveServiceAreaPoint(serviceAreaId) {
  if (!serviceAreaId) return null;

  let lookedUp = null;
  try {
    const { data, error } = await supabase.functions.invoke('geo-resolve', {
      body: { service_area_id: serviceAreaId },
    });
    if (!error) lookedUp = data;
  } catch {
    lookedUp = null;
  }

  const serverLat = finiteCoord(lookedUp?.geo_lat);
  const serverLng = finiteCoord(lookedUp?.geo_lng);
  if (serverLat != null && serverLng != null) return { lat: serverLat, lng: serverLng };

  const geoQuery = typeof lookedUp?.geo_query === 'string' ? lookedUp.geo_query.trim() : '';
  if (!geoQuery) return null;

  const found = await searchNominatim(geoQuery).catch(() => null);
  if (!found) return null;

  try {
    const { data, error } = await supabase.functions.invoke('geo-resolve', {
      body: { service_area_id: serviceAreaId, geo_lat: found.lat, geo_lng: found.lng },
    });
    if (!error) {
      const savedLat = finiteCoord(data?.geo_lat);
      const savedLng = finiteCoord(data?.geo_lng);
      if (savedLat != null && savedLng != null) return { lat: savedLat, lng: savedLng };
    }
  } catch {
    // The point was found. The next lookup can store it.
  }
  return found;
}
