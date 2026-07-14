import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { permissionKey } from '@/lib/permissionMeta';

export const ROLE_PERMISSIONS_QUERY_KEY = ['role-permissions'];

async function fetchRolePermissions() {
  const [rolesResult, permsResult] = await Promise.all([
    supabase.from('app_roles').select('id, name, is_system').order('is_system', { ascending: false }).order('name'),
    supabase.from('role_permissions').select('id, role_id, resource, action'),
  ]);

  if (rolesResult.error) throw rolesResult.error;
  if (permsResult.error) throw permsResult.error;

  const matrix = {};
  for (const perm of permsResult.data ?? []) {
    const key = permissionKey(perm.resource, perm.action);
    if (!matrix[perm.role_id]) matrix[perm.role_id] = new Set();
    matrix[perm.role_id].add(key);
  }

  return {
    roles: rolesResult.data ?? [],
    permissions: permsResult.data ?? [],
    matrix,
  };
}

export function useRolePermissions() {
  return useQuery({
    queryKey: ROLE_PERMISSIONS_QUERY_KEY,
    queryFn: fetchRolePermissions,
  });
}

export function useSaveRolePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roleId, permissionKeys }) => {
      const { data: role, error: roleError } = await supabase
        .from('app_roles')
        .select('is_system, name')
        .eq('id', roleId)
        .single();
      if (roleError) throw roleError;
      if (role.is_system && role.name === 'admin') {
        throw new Error('Admin role permissions cannot be modified');
      }

      const { error: deleteError } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId);
      if (deleteError) throw deleteError;

      const rows = permissionKeys.map((key) => {
        const [resource, action] = key.split(':');
        return { role_id: roleId, resource, action };
      });

      if (rows.length > 0) {
        const { error: insertError } = await supabase
          .from('role_permissions')
          .insert(rows);
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLE_PERMISSIONS_QUERY_KEY });
    },
  });
}

export function useSaveAllPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rolePermissionsMap) => {
      for (const [roleId, permissionKeys] of Object.entries(rolePermissionsMap)) {
        const { data: role, error: roleError } = await supabase
          .from('app_roles')
          .select('is_system, name')
          .eq('id', roleId)
          .single();
        if (roleError) throw roleError;
        if (role.is_system && role.name === 'admin') continue;

        const { error: deleteError } = await supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', roleId);
        if (deleteError) throw deleteError;

        const rows = [...permissionKeys].map((key) => {
          const [resource, action] = key.split(':');
          return { role_id: roleId, resource, action };
        });

        if (rows.length > 0) {
          const { error: insertError } = await supabase
            .from('role_permissions')
            .insert(rows);
          if (insertError) throw insertError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLE_PERMISSIONS_QUERY_KEY });
    },
  });
}
