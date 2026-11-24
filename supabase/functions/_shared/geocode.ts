/**
 * Optional forward geocoding (Nominatim). Set GEOCODING_USER_AGENT for production ToS compliance.
 */

export type GeoPoint = { lat: number; lng: number; displayName?: string; name?: string };

const FILLER_WORDS = new Set(['the', 'and', 'for', 'zip', 'usa', 'area', 'keys']);

function encodeQuery(q: string): string {
  return encodeURIComponent(q.trim());
}

function answerText(hit: { display_name?: unknown; address?: { postcode?: unknown } }): string {
  const name = typeof hit.display_name === 'string' ? hit.display_name : '';
  const postcode = typeof hit.address?.postcode === 'string' ? hit.address.postcode : '';
  if (postcode && !name.includes(postcode)) return `${name} ${postcode}`.trim();
  return name;
}

/** True when the geocoder's place name shares a real word with the query, or the same ZIP. */
export function geocodeHitMatchesQuery(query: string, displayName: string | null | undefined): boolean {
  const answer = displayName || '';
  const zips = query.match(/\b\d{5}\b/g) || [];
  if (zips.some((zip) => answer.includes(zip))) return true;

  const words = (text: string) =>
    (text.toLowerCase().match(/[a-z]{3,}/g) || []).filter((word) => !FILLER_WORDS.has(word));
  const wanted = new Set(words(query));
  if (!wanted.size) return false;
  return words(answer).some((word) => wanted.has(word));
}

export async function geocodeAddress(query: string): Promise<GeoPoint | null> {
  const q = query?.trim();
  if (!q || q.length < 3) return null;

  const userAgent = Deno.env.get('GEOCODING_USER_AGENT') || 'GraditoIntelligence/1.0';
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodeQuery(q)}`;

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
    const name = typeof hit.name === 'string' ? hit.name.trim() : '';
    return { lat, lng, displayName: answerText(hit), name: name || undefined };
  } catch {
    return null;
  }
}

function longestPlaceWord(text: string): string | null {
  const words = (text.toLowerCase().match(/[a-z]{6,}/g) || []).filter((word) => !FILLER_WORDS.has(word));
  if (!words.length) return null;
  return words.reduce((best, word) => (word.length > best.length ? word : best));
}

function resultNameIsWord(point: GeoPoint, word: string): boolean {
  return (point.name || '').trim().toLowerCase() === word.toLowerCase();
}

function waitForNominatim() {
  return new Promise((resolve) => setTimeout(resolve, 1100));
}

/** A line already rewritten for Nominatim. Any hit is kept. */
export async function geocodePreparedPlaceLine(line: string | null | undefined): Promise<GeoPoint | null> {
  const q = line?.trim();
  if (!q) return null;
  await waitForNominatim();
  return geocodeAddress(q);
}

export type ServiceAreaGeocode = { point: GeoPoint; query: string };

/** Full line first. If that is not a place, one query for the longest word already in the line. */
export async function geocodeServiceAreaName(areaName: string): Promise<ServiceAreaGeocode | null> {
  const q = areaName?.trim();
  if (!q) return null;

  const direct = await geocodeAddress(q);
  if (direct && geocodeHitMatchesQuery(q, direct.displayName)) return { point: direct, query: q };

  const placeWord = longestPlaceWord(q);
  if (placeWord) {
    await waitForNominatim();
    const town = await geocodeAddress(placeWord);
    if (town && resultNameIsWord(town, placeWord)) return { point: town, query: placeWord };
    return null;
  }

  const zip = q.match(/\b\d{5}\b/)?.[0];
  if (!zip) return null;
  await waitForNominatim();
  const zipPoint = await geocodeAddress(zip);
  if (zipPoint && (zipPoint.displayName || '').includes(zip)) return { point: zipPoint, query: zip };
  return null;
}

export async function geocodeChefCity(city: string | null | undefined, state: string | null | undefined): Promise<GeoPoint | null> {
  const parts = [city, state, 'USA'].filter((x) => x?.trim()).join(', ');
  if (!parts) return null;
  return geocodeAddress(parts);
}