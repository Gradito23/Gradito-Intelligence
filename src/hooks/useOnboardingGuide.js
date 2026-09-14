import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export const ONBOARDING_GUIDE_QUERY_KEY = ['onboardingGuide'];

export function useOnboardingGuide() {
  return useQuery({
    queryKey: ONBOARDING_GUIDE_QUERY_KEY,
    queryFn: () => base44.entities.OnboardingGuide.get(),
    retry: false,
    staleTime: 60_000,
  });
}

export function useSaveOnboardingGuide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => base44.entities.OnboardingGuide.update(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(ONBOARDING_GUIDE_QUERY_KEY, data);
    },
  });
}
