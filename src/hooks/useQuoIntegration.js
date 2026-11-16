import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/api/supabaseClient';

export const QUO_INTEGRATION_QUERY_KEY = ['integration-quo'];
export const QUO_STATUS_QUERY_KEY = ['integration-quo', 'status'];

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

export async function invokeQuoIntegration(body) {
  const { data, error } = await supabase.functions.invoke('integration-quo', {
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

export function useQuoIntegration() {
  return useQuery({
    queryKey: QUO_INTEGRATION_QUERY_KEY,
    queryFn: () => invokeQuoIntegration({ action: 'get' }),
  });
}

export function useQuoIntegrationStatus() {
  return useQuery({
    queryKey: QUO_STATUS_QUERY_KEY,
    queryFn: () => invokeQuoIntegration({ action: 'get_status' }),
    staleTime: 60_000,
  });
}

export function useSaveQuoSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => invokeQuoIntegration({ action: 'save_settings', ...payload }),
    onSuccess: (data) => {
      queryClient.setQueryData(QUO_INTEGRATION_QUERY_KEY, data);
      queryClient.invalidateQueries({ queryKey: QUO_STATUS_QUERY_KEY });
    },
  });
}

export function useTestQuoConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => invokeQuoIntegration({ action: 'test_connection' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUO_INTEGRATION_QUERY_KEY });
    },
  });
}

export function useSendQuoMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => invokeQuoIntegration({ action: 'send_message', ...payload }),
    onSuccess: (_data, variables) => {
      if (variables?.chef_id) {
        queryClient.invalidateQueries({ queryKey: ['quo-communication-events', variables.chef_id] });
      }
      if (variables?.prospect_id) {
        queryClient.invalidateQueries({ queryKey: ['chefInviteProspects'] });
      }
      if (variables?.mark_intake_invite) {
        queryClient.invalidateQueries({ queryKey: ['chefInviteProspects'] });
      }
    },
  });
}