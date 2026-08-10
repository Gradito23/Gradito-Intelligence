import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';

export const GOOGLE_SSO_INTEGRATION_QUERY_KEY = ['integration-google-sso'];

async function fetchGoogleSsoSettings() {
  const { data, error } = await supabase
    .from('integration_google_sso_settings')
    .select('id, enabled, updated_at, updated_by')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load Google SSO settings');
  }

  return {
    enabled: Boolean(data?.enabled),
    updated_at: data?.updated_at ?? null,
    updated_by: data?.updated_by ?? null,
  };
}

export function useGoogleSSOIntegration() {
  return useQuery({
    queryKey: GOOGLE_SSO_INTEGRATION_QUERY_KEY,
    queryFn: fetchGoogleSsoSettings,
  });
}

export function useSaveGoogleSSOSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ enabled }) => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw new Error(userError.message);
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('integration_google_sso_settings')
        .update({
          enabled: Boolean(enabled),
          updated_by: user.id,
        })
        .eq('id', 1)
        .select('id, enabled, updated_at, updated_by')
        .single();

      if (error) {
        throw new Error(error.message || 'Failed to save Google SSO settings');
      }

      return {
        enabled: Boolean(data?.enabled),
        updated_at: data?.updated_at ?? null,
        updated_by: data?.updated_by ?? null,
      };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(GOOGLE_SSO_INTEGRATION_QUERY_KEY, data);
    },
  });
}
