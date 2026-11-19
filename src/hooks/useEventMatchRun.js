import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { useChefs, useEvents, useEventChefs, useClients, useServiceAreas } from '@/hooks/useAppData';
import { computeMatchLists, persistMatchRun, polishMatchReasons, buildMatchContext } from '@/lib/runChefMatch';
import { matchCriteriaFromEvent } from '@/lib/matchCriteriaFromEvent';
import { resultsFromSuggested } from '@/lib/chefMatchScore';

export const EVENT_MATCH_RUN_KEY = 'event_match_run';

async function fetchLatestEventMatchRun(eventId) {
  if (!eventId) return null;
  const { data, error } = await supabase
    .from('match_runs')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function useEventMatchRun(eventId, { enabled = true } = {}) {
  const queryClient = useQueryClient();
  const { data: chefs = [] } = useChefs();
  const { data: events = [] } = useEvents();
  const { data: eventChefs = [] } = useEventChefs();
  const { data: clients = [] } = useClients();
  const { data: serviceAreas = [] } = useServiceAreas();

  const query = useQuery({
    queryKey: [EVENT_MATCH_RUN_KEY, eventId],
    queryFn: () => fetchLatestEventMatchRun(eventId),
    enabled: Boolean(eventId) && enabled,
  });

  const invalidate = () => {
    if (!eventId) return;
    queryClient.invalidateQueries({ queryKey: [EVENT_MATCH_RUN_KEY, eventId] });
    queryClient.invalidateQueries({ queryKey: ['matchRuns'] });
  };

  const runEventMatch = async (event, { jobSnapshot = null, polish = true } = {}) => {
    const eventIdResolved = event?.id || eventId;
    if (!eventIdResolved || !event) throw new Error('Event is required');

    const chefsForEvent = eventChefs.filter((ec) => ec.event_id === eventIdResolved);
    const criteria = matchCriteriaFromEvent(event, { jobSnapshot, eventChefsForEvent: chefsForEvent });
    if (!criteria) throw new Error('Could not build match criteria');

    const context = buildMatchContext({ events, eventChefs, clients, serviceAreas });
    const { finalResults, sousList } = computeMatchLists(chefs, criteria, context);

    if (polish && finalResults.length > 0) {
      await polishMatchReasons(finalResults, criteria);
    }

    await persistMatchRun({
      criteria,
      finalResults,
      transcriptExcerpt: '',
      eventId: eventIdResolved,
      matchSource: 'event',
    });

    invalidate();
    return { criteria, finalResults, sousList, needsSous: (criteria.guest_count || 0) >= 15 };
  };

  const hydrateFromRun = (run) => {
    if (!run?.extracted_criteria) return null;
    const crit = run.extracted_criteria;
    const rebuilt = resultsFromSuggested(run.suggested_chefs, chefs, crit);
    const needsSous = (crit.guest_count || 0) >= 15;
    const sousList = needsSous
      ? []
      : [];
    return { criteria: crit, results: rebuilt, sousList, run };
  };

  return {
    latestRun: query.data ?? null,
    isLoadingRun: query.isLoading,
    refetchRun: query.refetch,
    invalidate,
    runEventMatch,
    hydrateFromRun,
    chefs,
    events,
    eventChefs,
    clients,
  };
}