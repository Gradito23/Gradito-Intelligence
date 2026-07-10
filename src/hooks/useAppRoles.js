import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';

export const APP_ROLES_QUERY_KEY = ['app-roles'];

async function fetchRoles() {
  const { data, error } = await supabase
    .from('app_roles')
    .select('id, name, description, is_system, created_at')
    .order('is_system', { ascending: false })
    .order('name');

  if (error) throw error;

  const { data: counts, error: countError } = await supabase
    .from('profiles')
    .select('role_id');

  if (countError) throw countError;

  const countMap = {};
  for (const row of counts ?? []) {
    countMap[row.role_id] = (countMap[row.role_id] ?? 0) + 1;
  }

  return (data ?? []).map((role) => ({
    ...role,
    user_count: countMap[role.id] ?? 0,
  }));
}

export function useAppRoles() {
  return useQuery({
    queryKey: APP_ROLES_QUERY_KEY,
    queryFn: fetchRoles,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, description }) => {
      const trimmed = name.trim().toLowerCase().replace(/\s+/g, '_');
      const { data, error } = await supabase
        .from('app_roles')
        .insert({ name: trimmed, description: description?.trim() || null, is_system: false })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: APP_ROLES_QUERY_KEY }),
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, description }) => {
      const { data: existing, error: fetchError } = await supabase
        .from('app_roles')
        .select('is_system')
        .eq('id', id)
        .single();
      if (fetchError) throw fetchError;
      if (existing.is_system) {
        throw new Error('System roles cannot be renamed');
      }

      const trimmed = name.trim().toLowerCase().replace(/\s+/g, '_');
      const { data, error } = await supabase
        .from('app_roles')
        .update({ name: trimmed, description: description?.trim() || null })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: APP_ROLES_QUERY_KEY }),
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data: existing, error: fetchError } = await supabase
        .from('app_roles')
        .select('is_system')
        .eq('id', id)
        .single();
      if (fetchError) throw fetchError;
      if (existing.is_system) {
        throw new Error('System roles cannot be deleted');
      }

      const { count, error: countError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role_id', id);
      if (countError) throw countError;
      if ((count ?? 0) > 0) {
        throw new Error('Cannot delete role with assigned users');
      }

      const { error } = await supabase.from('app_roles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: APP_ROLES_QUERY_KEY }),
  });
}
