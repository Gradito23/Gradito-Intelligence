import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/api/supabaseClient';

const QUERY_KEY = ['integration-smtp'];

async function parseFunctionError(error) {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body?.error) return body.error;
    } catch {
      // ignore JSON parse errors
    }
  }
  return error.message || 'Request failed';
}

async function invokeIntegrationSmtp(body) {
  const { data, error } = await supabase.functions.invoke('integration-smtp', {
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

export function useSmtpIntegration() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => invokeIntegrationSmtp({ action: 'get' }),
  });
}

export function useSaveSmtpIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => invokeIntegrationSmtp({ action: 'save', ...payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useTestSmtpIntegration() {
  return useMutation({
    mutationFn: (testTo) => invokeIntegrationSmtp({ action: 'test', test_to: testTo }),
  });
}
