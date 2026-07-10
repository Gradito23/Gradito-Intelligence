import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/api/supabaseClient';

export const OPENAI_INTEGRATION_QUERY_KEY = ['integration-openai'];

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

export async function invokeOpenAIIntegration(body) {
  const { data, error } = await supabase.functions.invoke('integration-openai', {
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

export function useOpenAIIntegration() {
  return useQuery({
    queryKey: OPENAI_INTEGRATION_QUERY_KEY,
    queryFn: () => invokeOpenAIIntegration({ action: 'get' }),
  });
}

export function useSaveOpenAISettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => invokeOpenAIIntegration({ action: 'save_settings', ...payload }),
    onSuccess: (data) => {
      queryClient.setQueryData(OPENAI_INTEGRATION_QUERY_KEY, data);
    },
  });
}

export function useTestOpenAIConnection() {
  return useMutation({
    mutationFn: () => invokeOpenAIIntegration({ action: 'test_connection' }),
  });
}

export function useSyncOpenAIModels() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => invokeOpenAIIntegration({ action: 'sync_models' }),
    onSuccess: (data) => {
      queryClient.setQueryData(OPENAI_INTEGRATION_QUERY_KEY, data);
    },
  });
}

export function useSetOpenAIDefaultModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (model_id) => invokeOpenAIIntegration({ action: 'set_default_model', model_id }),
    onSuccess: (data) => {
      queryClient.setQueryData(OPENAI_INTEGRATION_QUERY_KEY, data);
    },
  });
}
