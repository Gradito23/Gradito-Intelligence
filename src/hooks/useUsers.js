import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/api/supabaseClient';

export const USERS_STATS_QUERY_KEY = ['manage-users', 'stats'];
export const USERS_LIST_QUERY_KEY = ['manage-users', 'list'];

function listQueryKey({ page, perPage, search, status }) {
  return [...USERS_LIST_QUERY_KEY, { page, perPage, search, status }];
}

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

export function useUsersStats() {
  return useQuery({
    queryKey: USERS_STATS_QUERY_KEY,
    queryFn: () => invokeManageUsers({ action: 'stats' }),
    staleTime: 60_000,
    select: (data) => data?.stats,
  });
}

export function useUsers({ page = 1, perPage = 25, search = '', status = 'all' } = {}) {
  return useQuery({
    queryKey: listQueryKey({ page, perPage, search, status }),
    queryFn: () => invokeManageUsers({
      action: 'list',
      page,
      per_page: perPage,
      search,
      status,
    }),
    placeholderData: (previous) => previous,
  });
}

function patchListCache(queryClient, listParams, updater) {
  const key = listQueryKey(listParams);
  queryClient.setQueryData(key, (old) => {
    if (!old) return old;
    return updater(old);
  });
}

function patchStatsCache(queryClient, updater) {
  queryClient.setQueryData(USERS_STATS_QUERY_KEY, (old) => {
    if (!old?.stats) return old;
    return { stats: updater(old.stats) };
  });
}

function removeUserFromList(old, userId) {
  const users = (old.users ?? []).filter((u) => u.id !== userId);
  return {
    ...old,
    users,
    total: Math.max(0, (old.total ?? users.length) - 1),
  };
}

function updateUserInList(old, userId, patch) {
  return {
    ...old,
    users: (old.users ?? []).map((u) => (u.id === userId ? { ...u, ...patch } : u)),
  };
}

export function useInviteUser(listParams = { page: 1, perPage: 25, search: '', status: 'all' }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, role_id }) => invokeManageUsers({ action: 'invite', email, role_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_STATS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: USERS_LIST_QUERY_KEY });
    },
  });
}

export function useUpdateUserRole(listParams = { page: 1, perPage: 25, search: '', status: 'all' }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ user_id, role_id }) => invokeManageUsers({ action: 'update_role', user_id, role_id }),
    onMutate: async ({ user_id, role_id }) => {
      await queryClient.cancelQueries({ queryKey: listQueryKey(listParams) });
      const previous = queryClient.getQueryData(listQueryKey(listParams));
      patchListCache(queryClient, listParams, (old) => updateUserInList(old, user_id, { role_id }));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listQueryKey(listParams), context.previous);
      }
    },
  });
}

export function useDeactivateUser(listParams = { page: 1, perPage: 25, search: '', status: 'all' }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (user_id) => invokeManageUsers({ action: 'deactivate', user_id }),
    onMutate: async (user_id) => {
      await queryClient.cancelQueries({ queryKey: listQueryKey(listParams) });
      const previousList = queryClient.getQueryData(listQueryKey(listParams));
      const previousStats = queryClient.getQueryData(USERS_STATS_QUERY_KEY);
      patchListCache(queryClient, listParams, (old) => updateUserInList(old, user_id, { status: 'deactivated' }));
      patchStatsCache(queryClient, (stats) => ({
        ...stats,
        active: Math.max(0, stats.active - 1),
        deactivated: stats.deactivated + 1,
      }));
      return { previousList, previousStats };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousList) queryClient.setQueryData(listQueryKey(listParams), context.previousList);
      if (context?.previousStats) queryClient.setQueryData(USERS_STATS_QUERY_KEY, context.previousStats);
    },
  });
}

export function useReactivateUser(listParams = { page: 1, perPage: 25, search: '', status: 'all' }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (user_id) => invokeManageUsers({ action: 'reactivate', user_id }),
    onMutate: async (user_id) => {
      await queryClient.cancelQueries({ queryKey: listQueryKey(listParams) });
      const previousList = queryClient.getQueryData(listQueryKey(listParams));
      const previousStats = queryClient.getQueryData(USERS_STATS_QUERY_KEY);
      patchListCache(queryClient, listParams, (old) => updateUserInList(old, user_id, { status: 'active' }));
      patchStatsCache(queryClient, (stats) => ({
        ...stats,
        active: stats.active + 1,
        deactivated: Math.max(0, stats.deactivated - 1),
      }));
      return { previousList, previousStats };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousList) queryClient.setQueryData(listQueryKey(listParams), context.previousList);
      if (context?.previousStats) queryClient.setQueryData(USERS_STATS_QUERY_KEY, context.previousStats);
    },
  });
}

export function useResendInvite(listParams = { page: 1, perPage: 25, search: '', status: 'all' }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (user_id) => invokeManageUsers({ action: 'resend_invite', user_id }),
  });
}

export function useDeleteUser(listParams = { page: 1, perPage: 25, search: '', status: 'all' }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (user_id) => invokeManageUsers({ action: 'delete', user_id }),
    onMutate: async (user_id) => {
      await queryClient.cancelQueries({ queryKey: listQueryKey(listParams) });
      const previousList = queryClient.getQueryData(listQueryKey(listParams));
      const previousStats = queryClient.getQueryData(USERS_STATS_QUERY_KEY);
      const removed = (previousList?.users ?? []).find((u) => u.id === user_id);

      patchListCache(queryClient, listParams, (old) => removeUserFromList(old, user_id));
      if (removed) {
        patchStatsCache(queryClient, (stats) => {
          const next = { ...stats, total: Math.max(0, stats.total - 1) };
          if (removed.status === 'active') next.active = Math.max(0, stats.active - 1);
          if (removed.status === 'invited') next.invited = Math.max(0, stats.invited - 1);
          if (removed.status === 'deactivated') next.deactivated = Math.max(0, stats.deactivated - 1);
          if (removed.role === 'admin') next.admins = Math.max(0, stats.admins - 1);
          return next;
        });
      }
      return { previousList, previousStats };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousList) queryClient.setQueryData(listQueryKey(listParams), context.previousList);
      if (context?.previousStats) queryClient.setQueryData(USERS_STATS_QUERY_KEY, context.previousStats);
    },
  });
}

export function useRoleDeleteCheck() {
  return useMutation({
    mutationFn: (role_id) => invokeManageUsers({ action: 'role_delete_check', role_id }),
  });
}
