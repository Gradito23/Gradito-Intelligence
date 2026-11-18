import { base44 } from '@/api/base44Client';
import { rankHeadChefs, rankSousChefs, suggestedChefsPayload } from '@/lib/chefMatchScore';
import { staffingContextFromCriteria } from '@/lib/matchCriteriaFromEvent';
import { buildAreaIndex, MATCH_SCORING_VERSION } from '@/lib/geoMatch';

export function buildMatchContext({ events, eventChefs, clients, serviceAreas } = {}) {
  return {
    events: events || [],
    eventChefs: eventChefs || [],
    clients: clients || [],
    serviceAreas: serviceAreas || [],
    areaIndex: buildAreaIndex(serviceAreas || []),
  };
}

export async function polishMatchReasons(results, criteria) {
  await Promise.all(
    (results || []).map(async (result) => {
      const localReason = result.reason;
      try {
        const geoNote = result.isLocal
          ? `Local to ${criteria.service_area || 'event area'}.`
          : (result.distanceKm != null ? `About ${result.distanceKm} km from event.` : 'Traveling to event area.');
        const aiReason = await base44.integrations.Core.InvokeLLM({
          prompt: `Write one short sentence (max 20 words) why this chef fits the event. Do NOT contradict these facts.
Chef: ${result.chef.first_name} ${result.chef.last_name}, ${result.chef.quality_rating}★, cuisines: ${(result.chef.cuisines || []).join(', ')}
Event: ${criteria.service_area || 'any'}, guests ${criteria.guest_count || 'TBD'}
Geo (must respect): ${geoNote}
Talent factors: ${localReason}
Travel fee: $${result.travelFee}`,
        });
        result.reason = typeof aiReason === 'string' && aiReason.trim() ? aiReason.trim() : localReason;
      } catch {
        result.reason = localReason;
      }
    }),
  );
}

export function computeMatchLists(chefs, criteria, context) {
  const finalResults = rankHeadChefs(chefs, criteria, context, { limit: 5 });
  const needsSous = (criteria.guest_count || 0) >= 15;
  const sousList = needsSous ? rankSousChefs(chefs, criteria, context, { limit: 3 }) : [];
  return { finalResults, sousList, needsSous };
}

export async function persistMatchRun({
  criteria,
  finalResults,
  transcriptExcerpt = '',
  eventId = null,
  matchSource = 'transcript',
}) {
  const staffing_context = staffingContextFromCriteria(criteria);
  const { _staffing, ...criteriaStored } = criteria;
  const payload = {
    client_name: criteria.client_name || '',
    transcript_excerpt: transcriptExcerpt,
    extracted_criteria: criteriaStored,
    suggested_chefs: suggestedChefsPayload(finalResults),
    event_id: eventId || undefined,
    match_source: matchSource,
    staffing_context,
    scoring_version: MATCH_SCORING_VERSION,
  };
  return base44.entities.MatchRun.create(payload);
}