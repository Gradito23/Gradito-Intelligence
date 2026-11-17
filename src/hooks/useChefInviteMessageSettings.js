import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export const CHEF_INVITE_MESSAGE_SETTINGS_QUERY_KEY = ['chefInviteMessageSettings'];

export function useChefInviteMessageSettings() {
  return useQuery({
    queryKey: CHEF_INVITE_MESSAGE_SETTINGS_QUERY_KEY,
    queryFn: () => base44.entities.ChefInviteMessageSettings.get(),
    staleTime: 60_000,
  });
}

export function useSaveChefInviteMessageSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => base44.entities.ChefInviteMessageSettings.update(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(CHEF_INVITE_MESSAGE_SETTINGS_QUERY_KEY, data);
    },
  });
}