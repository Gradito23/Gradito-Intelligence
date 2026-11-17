import { supabase } from '@/api/supabaseClient';
import { FunctionsHttpError } from '@supabase/supabase-js';

export const JOB_PAGE_STATUS_STYLES = {
  published: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  draft: 'bg-amber-100 text-amber-800 border-amber-200',
  unpublished: 'bg-slate-100 text-slate-700 border-slate-200',
};

export const JOB_HUB_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'missing', label: 'Missing page' },
  { id: 'draft', label: 'Draft / failed' },
  { id: 'published', label: 'Published' },
  { id: 'unpublished', label: 'Unpublished' },
];

export function publicJobUrl(jobPageId) {
  return canonicalPublicJobUrl(jobPageId);
}

export function canonicalPublicJobUrl(jobPageId) {
  const envBase = typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_URL
    ? String(import.meta.env.VITE_APP_URL).replace(/\/$/, '')
    : '';
  const origin = envBase || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${origin}/job/${jobPageId}`;
}

/** PostgREST embed may return object or one-element array. */
export function normalizeEventJobPage(embed) {
  if (!embed) return null;
  if (Array.isArray(embed)) return embed[0] ?? null;
  return embed;
}

export async function invokeEventJob(body) {
  const { data, error } = await supabase.functions.invoke('event-job', { body });
  if (error) {
    let message = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const payload = await error.context.json();
        if (payload?.error) message = payload.error;
      } catch {
        /* ignore */
      }
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export function matchesJobHubFilter(jobPage, filterId) {
  if (filterId === 'all') return true;
  if (filterId === 'missing') return !jobPage;
  if (!jobPage) return false;
  if (filterId === 'draft') return jobPage.status === 'draft';
  if (filterId === 'published') return jobPage.status === 'published';
  if (filterId === 'unpublished') return jobPage.status === 'unpublished';
  return true;
}

export const EVENT_JOB_PAGE_QUERY_KEY = ['event_job_page'];
export const CONFIRMED_EVENTS_JOB_HUB_KEY = ['admin', 'confirmed_events_job_hub'];