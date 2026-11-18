import { getChefKPIs } from '@/hooks/useAppData';
import {
  buildAreaIndex,
  compareGeoRank,
  computeTravelFee,
  distanceKmForChef,
  evaluateGeoEligibility,
  isChefLocal,
  isUnavailableOnDate,
  passesMaxTravelCap,
  resolveKnownAreaName,
} from '@/lib/geoMatch';

function getAreaIndex(context) {
  if (context?.areaIndex instanceof Map) return context.areaIndex;
  return buildAreaIndex(context?.serviceAreas || []);
}

function normalizeCriteriaArea(criteria, areaIndex) {
  if (!criteria?.service_area) return criteria;
  const resolved = resolveKnownAreaName(criteria.service_area, areaIndex);
  if (resolved && resolved !== criteria.service_area) {
    return { ...criteria, service_area: resolved };
  }
  return criteria;
}

function computeTalentScore(chef, criteria, context, travelFee) {
  const { events = [], eventChefs = [], clients = [] } = context || {};
  let score = 0;
  const reasons = [];
  const factors = [];

  const wantedCuisines = criteria.cuisines || [];
  const matchedCuisines = wantedCuisines.filter((c) => (chef.cuisines || []).includes(c));
  if (wantedCuisines.length > 0 && matchedCuisines.length > 0) {
    const pts = Math.round(25 * (matchedCuisines.length / wantedCuisines.length));
    score += pts;
    reasons.push(matchedCuisines.join(' + '));
    factors.push({ code: 'cuisine', points: pts, label: matchedCuisines.join(' + ') });
  }

  const qualPts = (chef.quality_rating || 3) * 5;
  score += qualPts;
  reasons.push(`${chef.quality_rating}★`);
  factors.push({ code: 'quality', points: qualPts, label: `${chef.quality_rating}★` });

  if (criteria.experience_type && (chef.experience_types || []).includes(criteria.experience_type)) {
    score += 10;
    reasons.push(criteria.experience_type.toLowerCase());
    factors.push({ code: 'experience', points: 10, label: criteria.experience_type });
  }

  if (criteria.budget) {
    const estCost = 3500 + travelFee;
    if (estCost <= criteria.budget) {
      score += 5;
      factors.push({ code: 'budget', points: 5, label: 'within budget' });
    } else {
      score -= 10;
      factors.push({ code: 'budget', points: -10, label: 'over budget est.' });
    }
  }

  if (criteria.client_name) {
    const client = clients.find((c) => c.name.toLowerCase().includes(criteria.client_name.toLowerCase()));
    if (client) {
      const clientEventIds = events.filter((e) => e.client_id === client.id).map((e) => e.id);
      const workedTogether = eventChefs.filter(
        (ec) => ec.chef_id === chef.id && clientEventIds.includes(ec.event_id),
      );
      if (workedTogether.length > 0) {
        score += 15;
        const lbl = `${workedTogether.length} prior events with this client`;
        reasons.push(lbl);
        factors.push({ code: 'client_history', points: 15, label: lbl });
      }
    }
  }

  const kpis = getChefKPIs(chef, events, eventChefs);
  if (kpis.eventsCount > 0) {
    const pts = Math.min(kpis.eventsCount * 2, 10);
    score += pts;
    factors.push({ code: 'experience_roster', points: pts, label: `${kpis.eventsCount} events` });
  }

  if (criteria.dietary && (chef.dietary_specialties || []).some((d) => d.toLowerCase().includes(criteria.dietary.toLowerCase()))) {
    score += 5;
    reasons.push('dietary match');
    factors.push({ code: 'dietary', points: 5, label: 'dietary match' });
  }

  if (kpis.eventsCount < 3) {
    score += 3;
    factors.push({ code: 'new_chef', points: 3, label: 'building track record' });
  }

  score = Math.min(Math.round(score), 100);

  return {
    talentScore: score,
    score,
    reason: reasons.join(' · '),
    factors,
  };
}

export function computeMatchScore(chef, criteria, context) {
  const areaIndex = getAreaIndex(context);
  const crit = normalizeCriteriaArea(criteria, areaIndex);
  const eventArea = crit?.service_area;

  const geo = evaluateGeoEligibility(chef, eventArea);
  if (!geo.eligible) {
    return {
      eligible: false,
      score: -1,
      talentScore: 0,
      reason: geo.reason || 'Not eligible',
      travelFee: 0,
      isLocal: false,
      distanceKm: null,
      geoBand: null,
      factors: [{ code: 'geo', points: 0, label: geo.reason }],
    };
  }

  if (isUnavailableOnDate(chef, crit.date)) {
    return {
      eligible: false,
      score: -1,
      talentScore: 0,
      reason: 'Unavailable on event date',
      travelFee: 0,
      isLocal: false,
      distanceKm: null,
      geoBand: null,
      factors: [{ code: 'availability', points: 0, label: 'blackout date' }],
    };
  }

  const isLocal = isChefLocal(chef, eventArea);
  const distanceKm = distanceKmForChef(chef, crit, areaIndex);

  if (!passesMaxTravelCap(chef, distanceKm)) {
    return {
      eligible: false,
      score: -1,
      talentScore: 0,
      reason: 'Beyond travel distance preference',
      travelFee: 0,
      isLocal,
      distanceKm,
      geoBand: isLocal ? 0 : 1,
      factors: [{ code: 'travel_cap', points: 0, label: 'beyond max travel' }],
    };
  }

  const travelFee = computeTravelFee(chef, eventArea);
  const talent = computeTalentScore(chef, crit, context, travelFee);

  const geoFactors = [
    {
      code: 'geo',
      points: 0,
      label: isLocal
        ? `Local to ${eventArea}`
        : (distanceKm != null ? `~${distanceKm} km` : 'Traveler'),
    },
  ];

  return {
    eligible: true,
    ...talent,
    travelFee,
    isLocal,
    distanceKm: isLocal ? 0 : distanceKm,
    geoBand: isLocal ? 0 : 1,
    factors: [...geoFactors, ...talent.factors],
  };
}

function rankEligible(scored, criteria, context, { limit }) {
  const sorted = [...scored]
    .filter((r) => r.eligible !== false && r.score >= 0)
    .sort(compareGeoRank);

  const { events = [], eventChefs = [], clients = [] } = context || {};
  const labels = ['Top Pick', 'Value Pick', 'Wildcard'];

  const finalResults = sorted.slice(0, limit).map((r, i) => {
    let label = labels[i] || null;
    if (criteria.client_name) {
      const client = clients.find((c) => c.name.toLowerCase().includes(criteria.client_name.toLowerCase()));
      if (client) {
        const clientEventIds = events.filter((e) => e.client_id === client.id).map((e) => e.id);
        const workedTogether = eventChefs.filter(
          (ec) => ec.chef_id === r.chef.id && clientEventIds.includes(ec.event_id),
        );
        if (workedTogether.length > 0) label = 'Repeat Favorite';
      }
    }
    return { ...r, label };
  });

  const needsSous = (criteria.guest_count || 0) >= 15;
  finalResults.forEach((r) => { r.needsSous = needsSous; });
  return finalResults;
}

export function rankHeadChefs(chefs, criteria, context, { limit = 5 } = {}) {
  const headCandidates = chefs.filter(
    (c) => !c.archived && (c.roles_available === 'Head' || c.roles_available === 'Both'),
  );
  const scored = headCandidates.map((chef) => {
    const result = computeMatchScore(chef, criteria, context);
    return { chef, ...result };
  });
  return rankEligible(scored, criteria, context, { limit });
}

export function rankSousChefs(chefs, criteria, context, { limit = 3, excludeIds = [] } = {}) {
  const excluded = new Set(excludeIds);
  const scored = chefs
    .filter((c) =>
      !c.archived &&
      !excluded.has(c.id) &&
      (c.roles_available === 'Sous' || c.roles_available === 'Both'))
    .map((chef) => {
      const result = computeMatchScore(chef, criteria, context);
      return { chef, ...result, label: null, needsSous: false };
    });
  return rankEligible(scored, criteria, context, { limit });
}

export function resultsFromSuggested(suggested, chefs, criteria) {
  const needsSous = (criteria?.guest_count || 0) >= 15;
  return (suggested || [])
    .map((s, i) => {
      const chef = chefs.find((c) => c.id === s.chef_id);
      if (!chef) return null;
      return {
        chef,
        score: s.score ?? 0,
        talentScore: s.talent_score ?? s.score ?? 0,
        reason: s.reason_factors || s.reason || `${s.label || 'Suggested'} · score ${s.score ?? '—'}`,
        reasonFactors: s.reason_factors || s.reason,
        travelFee: s.travel_fee ?? 0,
        isLocal: Boolean(s.is_local),
        distanceKm: s.distance_km ?? null,
        geoBand: s.geo_band ?? null,
        scoreFactors: s.score_factors || [],
        label: s.label || (i === 0 ? 'Top Pick' : null),
        needsSous,
      };
    })
    .filter(Boolean);
}

export function suggestedChefsPayload(results) {
  return (results || []).map((r) => ({
    chef_id: r.chef.id,
    chef_name: `${r.chef.first_name} ${r.chef.last_name}`.trim(),
    score: r.score,
    talent_score: r.talentScore ?? r.score,
    label: r.label,
    reason: r.reason,
    reason_factors: r.reason,
    travel_fee: r.travelFee,
    is_local: Boolean(r.isLocal),
    distance_km: r.distanceKm,
    geo_band: r.geoBand,
    score_factors: r.factors || r.scoreFactors || [],
  }));
}
