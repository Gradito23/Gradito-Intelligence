/**
 * Optional forward geocoding (Nominatim). Set GEOCODING_USER_AGENT for production ToS compliance.
 */

export type GeoPoint = { lat: number; lng: number };

function encodeQuery(q: string): string {
  return encodeURIComponent(q.trim());
}

export async function geocodeAddress(query: string): Promise<GeoPoint | null> {
  const q = query?.trim();
  if (!q || q.length < 3) return null;

  const userAgent = Deno.env.get('GEOCODING_USER_AGENT') || 'GraditoIntelligence/1.0';
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeQuery(q)}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json',
      },
    });
    if (!response.ok) return null;
    const rows = await response.json();
    const hit = Array.isArray(rows) ? rows[0] : null;
    if (!hit?.lat || !hit?.lon) return null;
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

export async function geocodeChefCity(city: string | null | undefined, state: string | null | undefined): Promise<GeoPoint | null> {
  const parts = [city, state, 'USA'].filter((x) => x?.trim()).join(', ');
  if (!parts) return null;
  return geocodeAddress(parts);
}