import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ConfigRepository } from '@/infrastructure/repositories/ConfigRepository';

export function useConfig(type) {
  return useQuery({
    queryKey: ['config', type],
    queryFn: () => ConfigRepository.list(type),
    initialData: [],
  });
}

export function useConfigAdmin(type) {
  return useQuery({
    queryKey: ['config-admin', type],
    queryFn: () => ConfigRepository.listAll(type),
    initialData: [],
  });
}

export function useInvalidateConfig() {
  const queryClient = useQueryClient();
  return (type) => {
    queryClient.invalidateQueries({ queryKey: ['config', type] });
    queryClient.invalidateQueries({ queryKey: ['config-admin', type] });
  };
}
