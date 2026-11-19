import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { invokeEventJob } from '@/lib/eventJobPage';

export const EVENT_JOB_CHEF_INVITATIONS_KEY = ['event_job_chef_invitations'];

function invitationsQueryKey(jobPageId) {
  return [...EVENT_JOB_CHEF_INVITATIONS_KEY, jobPageId];
}

async function fetchInvitations(jobPageId) {
  const { data, error } = await supabase
    .from('event_job_chef_invitations')
    .select('*')
    .eq('event_job_page_id', jobPageId);
  if (error) throw error;
  return data ?? [];
}

export function useJobChefInvitations(jobPageId, { enabled = true } = {}) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: invitationsQueryKey(jobPageId),
    queryFn: () => fetchInvitations(jobPageId),
    enabled: Boolean(jobPageId) && enabled,
  });

  const byChefId = {};
  for (const row of query.data ?? []) {
    byChefId[row.chef_id] = row;
  }

  const invalidate = () => {
    if (jobPageId) {
      queryClient.invalidateQueries({ queryKey: invitationsQueryKey(jobPageId) });
    }
  };

  const sendInvites = async ({ eventId, chefIds, channels }) => {
    const data = await invokeEventJob({
      action: 'send_chef_invites',
      event_id: eventId,
      job_page_id: jobPageId,
      chef_ids: chefIds,
      channels,
    });
    invalidate();
    return data?.invitations ?? [];
  };

  return {
    invitations: query.data ?? [],
    invitationByChefId: byChefId,
    isLoading: query.isLoading,
    error: query.error,
    invalidate,
    sendInvites,
  };
}

export const EVENT_JOB_APPLICATIONS_KEY = ['event_job_applications'];

function applicationsQueryKey(jobPageId) {
  return [...EVENT_JOB_APPLICATIONS_KEY, jobPageId];
}

const APPLICATION_SELECT = `
  *,
  matched_chef:chefs!matched_chef_id ( id, first_name, last_name ),
  matched_intake:chef_intake_requests!matched_intake_request_id ( id, status )
`;

async function fetchApplications(jobPageId) {
  const { data, error } = await supabase
    .from('event_job_applications')
    .select(APPLICATION_SELECT)
    .eq('event_job_page_id', jobPageId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export function useJobApplications(jobPageId, { enabled = true } = {}) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: applicationsQueryKey(jobPageId),
    queryFn: () => fetchApplications(jobPageId),
    enabled: Boolean(jobPageId) && enabled,
  });

  const invalidate = () => {
    if (jobPageId) {
      queryClient.invalidateQueries({ queryKey: applicationsQueryKey(jobPageId) });
    }
  };

  const acceptApplication = async (applicationId) => {
    const data = await invokeEventJob({
      action: 'accept_application',
      application_id: applicationId,
    });
    invalidate();
    return data;
  };

  return {
    applications: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    invalidate,
    acceptApplication,
  };
}