import { base44 } from '@/api/base44Client';
import { rankHeadChefs, rankSousChefs, suggestedChefsPayload } from '@/lib/chefMatchScore';
import { staffingContextFromCriteria } from '@/lib/matchCriteriaFromEvent';

export async function polishMatchReasons(results, criteria) {
  await Promise.all(
    (results || []).map(async (result) => {
      const localReason = result.reason;
      try {
        const aiReason = await base44.integrations.Core.InvokeLLM({
          prompt: `Write a one-sentence explanation (max 20 words) for why Chef ${result.chef.first_name} ${result.chef.last_name} is a good match for this event.
Chef details: ${result.chef.quality_rating}★, cuisines: ${(result.chef.cuisines || []).join(', ')}, home areas: ${(result.chef.home_areas || []).join(', ')}, specialties: ${result.chef.signature_experiences || 'none'}
Event criteria: area ${criteria.service_area || 'any'}, cuisines: ${(criteria.cuisines || []).join(', ')}, guests: ${criteria.guest_count || 'TBD'}, type: ${criteria.event_type || 'any'}
Base reason: ${localReason}
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
  };
  return base44.entities.MatchRun.create(payload);
}