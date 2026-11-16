import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  invokePerfectVenueIntegration,
  PERFECT_VENUE_QUERY_KEY,
  PERFECT_VENUE_SYNC_RUNS_KEY,
} from '@/hooks/usePerfectVenueIntegration';
import { invalidateEventsLedger } from '@/hooks/useEventsLedger';

const TICK_INTERVAL_MS = 45_000;

async function runSyncTick() {
  return invokePerfectVenueIntegration({ action: 'sync_events_tick' });
}

/**
 * While sync_in_progress, call sync_events_tick on an interval (admin session).
 * Complements pg_cron when Vault/pg_net is misconfigured.
 */
export function usePerfectVenueBackgroundSyncDriver({ enabled = false, syncInProgress = false } = {}) {
  const queryClient = useQueryClient();
  const inFlightRef = useRef(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!enabled || !syncInProgress) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return undefined;
    }

    const tick = async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const result = await runSyncTick();
        if (result && !result.idle) {
          queryClient.invalidateQueries({ queryKey: PERFECT_VENUE_QUERY_KEY });
          queryClient.invalidateQueries({ queryKey: PERFECT_VENUE_SYNC_RUNS_KEY });
          invalidateEventsLedger(queryClient);
        }
      } catch (err) {
        console.warn('Perfect Venue sync tick:', err?.message || err);
      } finally {
        inFlightRef.current = false;
      }
    };

    tick();
    intervalRef.current = setInterval(tick, TICK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [enabled, syncInProgress, queryClient]);
}

export { runSyncTick };