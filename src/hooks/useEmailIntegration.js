import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/api/supabaseClient';

export const EMAIL_INTEGRATION_QUERY_KEY = ['integration-email'];

async function parseFunctionError(error) {
  if (error instanceof FunctionsHttpError) {
    const status = error.context?.status;
    try {
      const body = await error.context.json();
      if (body?.error) return body.error;
    } catch {
      if (status === 503) {
        return 'Email service timed out (often during SMTP test). Check host/port/encryption and try again.';
      }
    }
  }
  const msg = error?.message ?? '';
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return 'Could not reach the email service. It may have timed out during SMTP — try again.';
  }
  return msg || 'Request failed';
}

export async function invokeEmailIntegration(body) {
  const { data, error } = await supabase.functions.invoke('integration-email', {
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

export function useEmailIntegration() {
  return useQuery({
    queryKey: EMAIL_INTEGRATION_QUERY_KEY,
    queryFn: () => invokeEmailIntegration({ action: 'get' }),
  });
}

export function useSetActiveEmailProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (provider) => invokeEmailIntegration({ action: 'set_active_provider', provider }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMAIL_INTEGRATION_QUERY_KEY });
    },
  });
}

export function useSaveResendIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => invokeEmailIntegration({ action: 'save_resend', ...payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMAIL_INTEGRATION_QUERY_KEY });
    },
  });
}

export function useTestResendIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (testTo) => invokeEmailIntegration({ action: 'test_resend', test_to: testTo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMAIL_INTEGRATION_QUERY_KEY });
    },
  });
}

export function useSaveCustomSmtp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => invokeEmailIntegration({ action: 'save_custom_smtp', ...payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMAIL_INTEGRATION_QUERY_KEY });
    },
  });
}

export function useDeleteCustomSmtp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => invokeEmailIntegration({ action: 'delete_custom_smtp', id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMAIL_INTEGRATION_QUERY_KEY });
    },
  });
}

export function useSetActiveCustomSmtp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => invokeEmailIntegration({ action: 'set_active_custom_smtp', id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMAIL_INTEGRATION_QUERY_KEY });
    },
  });
}

export function useTestCustomSmtp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => invokeEmailIntegration({ action: 'test_custom_smtp', ...payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMAIL_INTEGRATION_QUERY_KEY });
    },
  });
}

export function useRefreshEmailAnalytics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => invokeEmailIntegration({ action: 'get' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMAIL_INTEGRATION_QUERY_KEY });
    },
  });
}
