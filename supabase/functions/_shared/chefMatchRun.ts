/**
 * Server-side chef match (mirrors client geo-v1 rules).
 */

export const MATCH_SCORING_VERSION = 'geo-v1';

type ChefRow = Record<string, unknown>;
type AreaRow = { name: string; region?: string | null; centroid_lat?: number | null; centroid_lng?: number | null };

function normalizeArea(name: unknown): string {
  return String(name || '').trim().toLowerCase();
}

function buildIndex(areas: AreaRow[]) {
  return new Map(areas.map((a) => [normalizeArea(a.name), a]));
}

function homeAreas(chef: ChefRow): string[] {
  const h = chef.home_areas;
  return Array.isArray(h) ? h.filter((x) => typeof x === 'string') : [];
}

function isLocal(chef: ChefRow, eventArea: string | null): boolean {
  if (!eventArea) return false;
  const k = normalizeArea(eventArea);
  return homeAreas(chef).some((h) => normalizeArea(h) === k);
}

function geoEligible(chef: ChefRow, eventArea: string | null): boolean {
  if (!eventArea) return true;
  if (isLocal(chef, eventArea)) return true;
  if (chef.travel_policy === 'Home only') return false;
  if (chef.travel_policy === 'Select areas') {
    const fees = (chef.travel_fees as { service_area?: string }[]) || [];
    return fees.some((t) => normalizeArea(t.service_area) === normalizeArea(eventArea));
  }
  return true;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 10) / 10;
}

function chefPoint(chef: ChefRow, idx: Map<string, AreaRow>): { lat: number; lng: number } | null {
  if (chef.geo_lat != null && chef.geo_lng != null) {
    return { lat: Number(chef.geo_lat), lng: Number(chef.geo_lng) };
  }
  for (const h of homeAreas(chef)) {
    const sa = idx.get(normalizeArea(h));
    if (sa?.centroid_lat != null && sa?.centroid_lng != null) {
      return { lat: Number(sa.centroid_lat), lng: Number(sa.centroid_lng) };
    }
  }
  return null;
}

function distanceKm(chef: ChefRow, eventArea: string | null, eventLat: number | null, eventLng: number | null, idx: Map<string, AreaRow>): number {
  if (!eventArea || isLocal(chef, eventArea)) return 0;
  const cp = chefPoint(chef, idx);
  let ep: { lat: number; lng: number } | null = null;
  if (eventLat != null && eventLng != null) ep = { lat: eventLat, lng: eventLng };
  else {
    const sa = idx.get(normalizeArea(eventArea));
    if (sa?.centroid_lat != null && sa?.centroid_lng != null) {
      ep = { lat: Number(sa.centroid_lat), lng: Number(sa.centroid_lng) };
    }
  }
  if (cp && ep) return haversineKm(cp, ep);
  const eventSa = idx.get(normalizeArea(eventArea));
  for (const h of homeAreas(chef)) {
    const homeSa = idx.get(normalizeArea(h));
    if (homeSa?.region && eventSa?.region && homeSa.region === eventSa.region) return 50;
  }
  return 500;
}

function talentScore(chef: ChefRow, criteria: Record<string, unknown>): number {
  let score = (Number(chef.quality_rating) || 3) * 5;
  const wanted = (criteria.cuisines as string[]) || [];
  const have = (chef.cuisines as string[]) || [];
  const matched = wanted.filter((c) => have.includes(c));
  if (wanted.length && matched.length) {
    score += 25 * (matched.length / wanted.length);
  }
  return Math.min(Math.round(score), 100);
}

export async function runServerChefMatch(
  adminClient: ReturnType<typeof import('./auth.ts').createServiceClient>,
  options: { eventId?: string | null; criteria?: Record<string, unknown> | null; limit?: number },
) {
  const limit = Math.min(Math.max(Number(options.limit) || 5, 1), 20);

  const [{ data: chefs }, { data: areas }] = await Promise.all([
    adminClient.from('chefs').select('*').eq('archived', false).limit(500),
    adminClient.from('service_areas').select('name, region, centroid_lat, centroid_lng'),
  ]);

  const idx = buildIndex(areas ?? []);
  let criteria = options.criteria;
  let eventLat: number | null = null;
  let eventLng: number | null = null;

  if (options.eventId) {
    const { data: event, error } = await adminClient.from('events').select('*').eq('id', options.eventId).maybeSingle();
    if (error) throw error;
    if (!event) throw new Error('Event not found');
    criteria = {
      client_name: event.client_name,
      service_area: event.service_area,
      date: event.date,
      cuisines: event.cuisines_served,
      guest_count: event.guest_count,
      budget: Number(event.chef_food_budget) || Number(event.experience_fee) || null,
      event_type: event.event_type,
      experience_type: event.experience_type,
      event_geo: event.geo_lat != null ? { lat: event.geo_lat, lng: event.geo_lng } : null,
    };
    eventLat = event.geo_lat != null ? Number(event.geo_lat) : null;
    eventLng = event.geo_lng != null ? Number(event.geo_lng) : null;
  }

  if (!criteria) throw new Error('criteria or event_id required');
  const eventArea = typeof criteria.service_area === 'string' ? criteria.service_area : null;

  const scored = (chefs ?? [])
    .filter((c) => c.roles_available === 'Head' || c.roles_available === 'Both')
    .map((chef) => {
      const eligible = geoEligible(chef, eventArea);
      if (!eligible) {
        return { chef_id: chef.id, eligible: false, score: -1 };
      }
      const local = isLocal(chef, eventArea);
      const dist = distanceKm(chef, eventArea, eventLat, eventLng, idx);
      const talent = talentScore(chef, criteria);
      return {
        chef_id: chef.id,
        eligible: true,
        is_local: local,
        distance_km: local ? 0 : dist,
        geo_band: local ? 0 : 1,
        score: talent,
        talent_score: talent,
      };
    })
    .filter((r) => r.eligible)
    .sort((a, b) => {
      const localA = a.is_local ? 1 : 0;
      const localB = b.is_local ? 1 : 0;
      if (localB !== localA) return localB - localA;
      return (a.distance_km ?? 0) - (b.distance_km ?? 0) || (b.score ?? 0) - (a.score ?? 0);
    })
    .slice(0, limit);

  return {
    ok: true,
    scoring_version: MATCH_SCORING_VERSION,
    criteria,
    suggested_chefs: scored,
  };
}