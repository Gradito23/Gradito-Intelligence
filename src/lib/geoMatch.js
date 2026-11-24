import { inferHomeAreasFromCity } from './cityToHomeArea.js';
import { maxTravelKmFromChef } from './travelDistanceKm.js';

export const MATCH_SCORING_VERSION = 'geo-v1';

const SAME_REGION_KM = 50;

export function normalizeAreaName(name) {
  return String(name || '').trim().toLowerCase();
}

export function buildAreaIndex(serviceAreas) {
  const byName = new Map();
  for (const sa of serviceAreas || []) {
    if (sa?.name) byName.set(normalizeAreaName(sa.name), sa);
  }
  return byName;
}

export function resolveKnownAreaName(rawArea, areaIndex) {
  if (!rawArea?.trim()) return null;
  const key = normalizeAreaName(rawArea);
  if (areaIndex.has(key)) return areaIndex.get(key).name;
  for (const [k, sa] of areaIndex) {
    if (k.includes(key) || key.includes(k)) return sa.name;
  }
  return rawArea.trim();
}

export function effectiveHomeAreas(chef) {
  const home = (chef?.home_areas || []).filter(Boolean);
  if (home.length) return home;
  return inferHomeAreasFromCity(chef?.city, chef?.state);
}

export function isChefLocal(chef, eventArea) {
  if (!eventArea) return false;
  const key = normalizeAreaName(eventArea);
  return effectiveHomeAreas(chef).some((h) => normalizeAreaName(h) === key);
}

export function computeTravelFee(chef, eventArea) {
  if (!eventArea || isChefLocal(chef, eventArea)) return 0;
  const override = (chef.travel_fees || []).find(
    (t) => normalizeAreaName(t.service_area) === normalizeAreaName(eventArea),
  );
  if (override) return override.fee || 0;
  if (chef.travel_policy === 'Anywhere') return chef.default_travel_fee || 0;
  return 0;
}

export function evaluateGeoEligibility(chef, eventArea) {
  if (!eventArea) {
    return { eligible: true, reason: null };
  }
  if (isChefLocal(chef, eventArea)) return { eligible: true, reason: null };

  if (chef.travel_policy === 'Home only') {
    return { eligible: false, reason: 'Cannot travel to area' };
  }
  if (chef.travel_policy === 'Select areas') {
    const inList = (chef.travel_fees || []).some(
      (t) => normalizeAreaName(t.service_area) === normalizeAreaName(eventArea),
    );
    if (!inList) return { eligible: false, reason: 'Area not in travel list' };
  }
  return { eligible: true, reason: null };
}

function pointFromArea(areaName, areaIndex) {
  const sa = areaIndex.get(normalizeAreaName(areaName));
  const lat = sa?.centroid_lat;
  const lng = sa?.centroid_lng;
  if (lat != null && lng != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    return { lat: Number(lat), lng: Number(lng) };
  }
  return null;
}

function chefGeoPoint(chef, areaIndex) {
  if (chef.geo_lat != null && chef.geo_lng != null) {
    return { lat: Number(chef.geo_lat), lng: Number(chef.geo_lng) };
  }
  for (const h of effectiveHomeAreas(chef)) {
    const p = pointFromArea(h, areaIndex);
    if (p) return p;
  }
  return null;
}

function eventGeoPoint(criteria, areaIndex) {
  const area = criteria?.service_area;
  return area ? pointFromArea(area, areaIndex) : null;
}

export function haversineKm(a, b) {
  if (!a || !b) return null;
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 10) / 10;
}

export function distanceKmForChef(chef, criteria, areaIndex) {
  const eventArea = criteria?.service_area;
  if (!eventArea) return 0;
  if (isChefLocal(chef, eventArea)) return 0;

  const chefPoint = chefGeoPoint(chef, areaIndex);
  const eventPoint = eventGeoPoint(criteria, areaIndex) || pointFromArea(eventArea, areaIndex);
  if (chefPoint && eventPoint) {
    const km = haversineKm(chefPoint, eventPoint);
    if (km != null) return km;
  }

  const eventSa = areaIndex.get(normalizeAreaName(eventArea));
  for (const h of effectiveHomeAreas(chef)) {
    const homeSa = areaIndex.get(normalizeAreaName(h));
    if (homeSa?.region && eventSa?.region && homeSa.region === eventSa.region) {
      return SAME_REGION_KM;
    }
  }
  return null;
}

export function passesMaxTravelCap(chef, distanceKm) {
  const max = maxTravelKmFromChef(chef);
  if (max == null) return true;
  if (chef.travel_policy === 'Home only') return true;
  return distanceKm <= max;
}

export function isUnavailableOnDate(chef, isoDate) {
  if (!isoDate || !chef) return false;
  const day = String(isoDate).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const blackouts = chef.blackout_dates;
  if (!Array.isArray(blackouts)) return false;
  return blackouts.some((b) => {
    if (!b) return false;
    if (typeof b === 'string') return b.slice(0, 10) === day;
    if (typeof b === 'object' && b.date) return String(b.date).slice(0, 10) === day;
    return false;
  });
}

function distanceSortKey(km) {
  return km == null || Number.isNaN(km) ? Number.POSITIVE_INFINITY : km;
}

export function compareGeoRank(a, b) {
  const localA = a.isLocal ? 1 : 0;
  const localB = b.isLocal ? 1 : 0;
  if (localB !== localA) return localB - localA;
  const distA = distanceSortKey(a.distanceKm);
  const distB = distanceSortKey(b.distanceKm);
  if (distA !== distB) return distA - distB;
  return (b.talentScore ?? b.score ?? 0) - (a.talentScore ?? a.score ?? 0);
}
