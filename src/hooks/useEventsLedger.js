import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { EventRepository } from '@/infrastructure/repositories/EventRepository';

const LEDGER_QUERY_KEY = 'events-ledger';
const PIPELINE_STATS_KEY = 'events-pipeline-stats';
const LEDGER_SUMMARY_KEY = 'events-ledger-summary';

function useDebouncedValue(value, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function useEventsLedger({
  view = 'active',
  page = 1,
  pageSize = 50,
  filters = {},
  search = '',
  enabled = true,
} = {}) {
  const debouncedSearch = useDebouncedValue(search, 300);
  return useQuery({
    queryKey: [LEDGER_QUERY_KEY, view, page, pageSize, filters, debouncedSearch],
    queryFn: () =>
      EventRepository.listPaged({
        view,
        page,
        pageSize,
        filters,
        search: debouncedSearch,
      }),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useEventPipelineStats({ eventSource = 'all', enabled = true } = {}) {
  return useQuery({
    queryKey: [PIPELINE_STATS_KEY, eventSource],
    queryFn: () => EventRepository.pipelineStats({ eventSource }),
    enabled,
  });
}

export function useEventLedgerStats({ enabled = true } = {}) {
  return useQuery({
    queryKey: [LEDGER_SUMMARY_KEY],
    queryFn: () => EventRepository.summaryStats(),
    enabled,
  });
}

export function invalidateEventsLedger(queryClient) {
  queryClient.invalidateQueries({ queryKey: [LEDGER_QUERY_KEY] });
  queryClient.invalidateQueries({ queryKey: [PIPELINE_STATS_KEY] });
  queryClient.invalidateQueries({ queryKey: [LEDGER_SUMMARY_KEY] });
  queryClient.invalidateQueries({ queryKey: ['events'] });
}
