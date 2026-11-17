import { getChefKPIs } from '@/hooks/useAppData';

export function computeMatchScore(chef, criteria, context) {
  const { events = [], eventChefs = [], clients = [] } = context || {};
  let score = 0;
  const reasons = [];

  const area = criteria.service_area;
  if (area) {
    const isHome = (chef.home_areas || []).includes(area);
    if (!isHome) {
      if (chef.travel_policy === 'Home only') return { score: -1, reason: 'Cannot travel to area', travelFee: 0 };
      if (chef.travel_policy === 'Select areas') {
        const tf = (chef.travel_fees || []).find((t) => t.service_area === area);
        if (!tf) return { score: -1, reason: 'Area not in travel list', travelFee: 0 };
      }
    }
  }

  let travelFee = 0;
  if (area && !(chef.home_areas || []).includes(area)) {
    const override = (chef.travel_fees || []).find((t) => t.service_area === area);
    if (override) {
      travelFee = override.fee;
    } else if (chef.travel_policy === 'Anywhere') {
      travelFee = chef.default_travel_fee || 0;
    }
  }

  const wantedCuisines = criteria.cuisines || [];
  const matchedCuisines = wantedCuisines.filter((c) => (chef.cuisines || []).includes(c));
  if (wantedCuisines.length > 0 && matchedCuisines.length > 0) {
    score += 25 * (matchedCuisines.length / wantedCuisines.length);
    reasons.push(matchedCuisines.join(' + '));
  }

  score += (chef.quality_rating || 3) * 5;
  reasons.push(`${chef.quality_rating}★`);

  if (area && (chef.home_areas || []).includes(area)) {
    score += 10;
    reasons.push(`based in ${area} (event area)`);
  }

  if (criteria.experience_type && (chef.experience_types || []).includes(criteria.experience_type)) {
    score += 10;
    reasons.push(criteria.experience_type.toLowerCase());
  }

  if (criteria.budget) {
    const estCost = 3500 + travelFee;
    if (estCost <= criteria.budget) score += 5;
    else score -= 10;
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
        reasons.push(`${workedTogether.length} prior events with this client`);
      }
    }
  }

  const kpis = getChefKPIs(chef, events, eventChefs);
  if (kpis.eventsCount > 0) {
    score += Math.min(kpis.eventsCount * 2, 10);
  }

  if (criteria.dietary && (chef.dietary_specialties || []).some((d) => d.toLowerCase().includes(criteria.dietary.toLowerCase()))) {
    score += 5;
    reasons.push('dietary match');
  }

  if (kpis.eventsCount < 3) {
    score += 3;
  }

  score = Math.min(Math.round(score), 100);

  return {
    score,
    reason: reasons.join(' · '),
    travelFee,
  };
}

export function rankHeadChefs(chefs, criteria, context, { limit = 5 } = {}) {
  const headCandidates = chefs.filter(
    (c) => !c.archived && (c.roles_available === 'Head' || c.roles_available === 'Both'),
  );
  const scored = headCandidates
    .map((chef) => {
      const { score, reason, travelFee } = computeMatchScore(chef, criteria, context);
      return { chef, score, reason, travelFee };
    })
    .filter((r) => r.score >= 0)
    .sort((a, b) => b.score - a.score);

  const topPick = scored[0];
  const valuePick = scored.find((r) => r !== topPick && r.travelFee === 0);
  const wildcard = scored.find((r) => r !== topPick && r !== valuePick && r.chef.quality_rating <= 4);

  let finalResults = [topPick, valuePick, wildcard].filter(Boolean);
  for (const r of scored) {
    if (finalResults.length >= limit) break;
    if (!finalResults.includes(r)) finalResults.push(r);
  }
  finalResults = finalResults.slice(0, limit);

  const labels = ['Top Pick', 'Value Pick', 'Wildcard'];
  const { events = [], eventChefs = [], clients = [] } = context || {};
  finalResults.forEach((r, i) => {
    if (criteria.client_name) {
      const client = clients.find((c) => c.name.toLowerCase().includes(criteria.client_name.toLowerCase()));
      if (client) {
        const clientEventIds = events.filter((e) => e.client_id === client.id).map((e) => e.id);
        const workedTogether = eventChefs.filter(
          (ec) => ec.chef_id === r.chef.id && clientEventIds.includes(ec.event_id),
        );
        if (workedTogether.length > 0) {
          r.label = 'Repeat Favorite';
          return;
        }
      }
    }
    r.label = labels[i] || null;
  });

  const needsSous = (criteria.guest_count || 0) >= 15;
  finalResults.forEach((r) => { r.needsSous = needsSous; });

  return finalResults;
}

export function rankSousChefs(chefs, criteria, context, { limit = 3, excludeIds = [] } = {}) {
  const excluded = new Set(excludeIds);
  return chefs
    .filter((c) =>
      !c.archived &&
      !excluded.has(c.id) &&
      (c.roles_available === 'Sous' || c.roles_available === 'Both'))
    .map((chef) => {
      const { score, reason, travelFee } = computeMatchScore(chef, criteria, context);
      return { chef, score, reason, travelFee, label: null, needsSous: false };
    })
    .filter((r) => r.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
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
        reason: s.reason || `${s.label || 'Suggested'} · score ${s.score ?? '—'}`,
        travelFee: s.travel_fee ?? 0,
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
    label: r.label,
    reason: r.reason,
    travel_fee: r.travelFee,
  }));
}