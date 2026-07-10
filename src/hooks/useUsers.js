import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/api/supabaseClient';

export const USERS_QUERY_KEY = ['manage-users'];

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

export async function invokeManageUsers(body) {
  const { data, error } = await supabase.functions.invoke('manage-users', {
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

export function useUsers() {
  return useQuery({
    queryKey: USERS_QUERY_KEY,
    queryFn: () => invokeManageUsers({ action: 'list' }),
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, role_id }) => invokeManageUsers({ action: 'invite', email, role_id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY }),
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ user_id, role_id }) => invokeManageUsers({ action: 'update_role', user_id, role_id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY }),
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (user_id) => invokeManageUsers({ action: 'deactivate', user_id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY }),
  });
}

export function useReactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (user_id) => invokeManageUsers({ action: 'reactivate', user_id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY }),
  });
}

export function useResendInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (user_id) => invokeManageUsers({ action: 'resend_invite', user_id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (user_id) => invokeManageUsers({ action: 'delete', user_id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY }),
  });
}

export function useRoleDeleteCheck() {
  return useMutation({
    mutationFn: (role_id) => invokeManageUsers({ action: 'role_delete_check', role_id }),
  });
}
