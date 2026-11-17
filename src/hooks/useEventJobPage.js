import { format } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { EVENT_JOB_PAGE_QUERY_KEY, normalizeEventJobPage } from '@/lib/eventJobPage';

export function upcomingConfirmedDateFilter() {
  const today = format(new Date(), 'yyyy-MM-dd');
  return `date.is.null,date.gte.${today}`;
}

const JOB_PAGE_SELECT = `
  id,
  event_id,
  status,
  generation_error,
  published_at,
  ai_content,
  source_snapshot,
  updated_at
`;

async function fetchEventJobPage(eventId) {
  if (!eventId) return null;
  const { data, error } = await supabase
    .from('event_job_pages')
    .select(JOB_PAGE_SELECT)
    .eq('event_id', eventId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function useEventJobPage(eventId, { enabled = true } = {}) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: [...EVENT_JOB_PAGE_QUERY_KEY, eventId],
    queryFn: () => fetchEventJobPage(eventId),
    enabled: Boolean(eventId) && enabled,
  });

  const invalidate = () => {
    if (!eventId) return;
    queryClient.invalidateQueries({ queryKey: [...EVENT_JOB_PAGE_QUERY_KEY, eventId] });
  };

  return { ...query, jobPage: query.data ?? null, invalidate };
}

export async function fetchConfirmedEventsJobHub() {
  const { data, error } = await supabase
    .from('events')
    .select(`
      id,
      date,
      client_name,
      service_area,
      event_type,
      experience_type,
      guest_count,
      status,
      event_job_pages (
        id,
        status,
        generation_error,
        published_at,
        ai_content,
        source_snapshot,
        updated_at
      )
    `)
    .eq('status', 'Confirmed')
    .or(upcomingConfirmedDateFilter())
    .order('date', { ascending: false, nullsFirst: false })
    .order('client_name', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    jobPage: normalizeEventJobPage(row.event_job_pages),
  }));
}