import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/api/supabaseClient';

export const PERFECT_VENUE_QUERY_KEY = ['integration-perfect-venue'];
export const PERFECT_VENUE_SYNC_RUNS_KEY = ['integration-perfect-venue', 'sync-runs'];

async function parseFunctionError(error) {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body?.error) return body.error;
    } catch {
      // fall through
    }
  }
  return error?.message || 'Request failed';
}

export async function invokePerfectVenueIntegration(body) {
  const { data, error } = await supabase.functions.invoke('integration-perfect-venue', {
    method: 'POST',
    body,
  });

  if (error) {
    throw new Error(await parseFunctionError(error));
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

export function usePerfectVenueIntegration({ enabled = true } = {}) {
  return useQuery({
    queryKey: PERFECT_VENUE_QUERY_KEY,
    queryFn: () => invokePerfectVenueIntegration({ action: 'get_status' }),
    enabled,
  });
}

export function usePerfectVenueSyncRuns(enabled = true, queryOptions = {}) {
  return useQuery({
    queryKey: PERFECT_VENUE_SYNC_RUNS_KEY,
    queryFn: () => invokePerfectVenueIntegration({ action: 'list_sync_runs', limit: 50 }),
    enabled,
    ...queryOptions,
  });
}

export function useSavePerfectVenueCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => invokePerfectVenueIntegration({ action: 'save_credentials', ...payload }),
    onSuccess: (data) => {
      queryClient.setQueryData(PERFECT_VENUE_QUERY_KEY, data);
    },
  });
}

export function usePerfectVenueAuthorizeUrl() {
  return useMutation({
    mutationFn: () => invokePerfectVenueIntegration({ action: 'get_authorize_url' }),
  });
}

export function usePerfectVenueExchangeCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, state }) => invokePerfectVenueIntegration({ action: 'exchange_code', code, state }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERFECT_VENUE_QUERY_KEY });
    },
  });
}

export function usePerfectVenueDisconnect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => invokePerfectVenueIntegration({ action: 'disconnect' }),
    onSuccess: (data) => {
      queryClient.setQueryData(PERFECT_VENUE_QUERY_KEY, data);
    },
  });
}

/** User-facing summary after a PV sync (insert/updated/fetched + source filter hint). */
export function formatPerfectVenueSyncToast(result) {
  const inserted = result?.inserted ?? 0;
  const updated = result?.updated ?? 0;
  const fetched = result?.events_fetched ?? inserted + updated;
  if (result?.backgroundCompleting || result?.partial) {
    return (
      `Sync started: ${inserted} inserted, ${updated} updated so far (${fetched} fetched). ` +
      'Finishing in the background (~2 min ticks)—watch Events → Sync history. ' +
      'Filter Source = Perfect Venue on Events.'
    );
  }
  const parts = [
    `${inserted} inserted, ${updated} updated`,
    fetched !== inserted + updated ? `(${fetched} fetched from Perfect Venue)` : `(${fetched} fetched)`,
  ];
  return `${parts.join(' ')}. Events totals include all sources—filter Source = Perfect Venue on the Events page.`;
}

export function perfectVenueSyncToastTitle(result) {
  if (result?.backgroundCompleting || result?.partial) return 'Sync started';
  return 'Sync complete';
}

const PV_SYNC_MAX_CONTINUE = 3;
const PV_SYNC_CONTINUE_DELAY_MS = 400;

async function runPerfectVenueSyncWithContinue(mode) {
  let continueSync = false;
  let aggregated = null;
  for (let attempt = 0; attempt < PV_SYNC_MAX_CONTINUE; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, PV_SYNC_CONTINUE_DELAY_MS));
    }
    const result = await invokePerfectVenueIntegration({
      action: 'sync_events',
      mode,
      continue: continueSync,
    });
    aggregated = result;
    if (!result.partial || !result.continue) break;
    continueSync = true;
  }
  if (aggregated?.partial && aggregated?.continue) {
    return { ...aggregated, backgroundCompleting: true };
  }
  return aggregated;
}

export function usePerfectVenueSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mode = 'incremental') => runPerfectVenueSyncWithContinue(mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERFECT_VENUE_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PERFECT_VENUE_SYNC_RUNS_KEY });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
