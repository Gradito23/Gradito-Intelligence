import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { PERMISSION_RESOURCES, permissionKey } from '@/lib/permissionMeta';
import { useRolePermissions, useSaveAllPermissions } from '@/hooks/useRolePermissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';

function buildInitialMatrix(roles, serverMatrix) {
  const draft = {};
  for (const role of roles) {
    if (role.is_system && role.name === 'admin') {
      const allKeys = new Set();
      for (const res of PERMISSION_RESOURCES) {
        for (const action of res.actions) {
          allKeys.add(permissionKey(res.key, action));
        }
      }
      draft[role.id] = allKeys;
    } else {
      draft[role.id] = new Set(serverMatrix[role.id] ?? []);
    }
  }
  return draft;
}

export default function PermissionsMatrix() {
  const { data, isLoading, error } = useRolePermissions();
  const saveAll = useSaveAllPermissions();
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);

  const roles = data?.roles ?? [];
  const serverMatrix = data?.matrix ?? {};

  useEffect(() => {
    if (data && !dirty) {
      setDraft(buildInitialMatrix(roles, serverMatrix));
    }
  }, [data, roles, serverMatrix, dirty]);

  const isAdminRole = (roleId) => {
    const role = roles.find((r) => r.id === roleId);
    return role?.is_system && role?.name === 'admin';
  };

  const togglePermission = (roleId, key, checked) => {
    if (isAdminRole(roleId)) return;
    setDraft((prev) => {
      const next = { ...prev };
      const set = new Set(next[roleId] ?? []);
      if (checked) set.add(key);
      else set.delete(key);
      next[roleId] = set;
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    if (!draft) return;
    const payload = {};
    for (const [roleId, set] of Object.entries(draft)) {
      payload[roleId] = set;
    }
    try {
      await saveAll.mutateAsync(payload);
      toast({ title: 'Permissions saved' });
      setDirty(false);
    } catch (err) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    }
  };

  const rows = useMemo(() => {
    return PERMISSION_RESOURCES.flatMap((res) =>
      res.actions.map((action) => ({
        resource: res,
        action,
        key: permissionKey(res.key, action),
      })),
    );
  }, []);

  if (isLoading || !draft) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">Failed to load permissions: {error.message}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-heading text-xl font-semibold text-navy">Permissions</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Role × resource × action matrix. Admin role is read-only.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!dirty || saveAll.isPending}
          size="sm"
          className="bg-navy hover:bg-navy/90 text-white"
        >
          {saveAll.isPending ? (
            <Loader2 size={14} className="mr-1.5 animate-spin" />
          ) : (
            <Save size={14} className="mr-1.5" />
          )}
          Save changes
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px]">Resource</TableHead>
              <TableHead className="w-20">Action</TableHead>
              {roles.map((role) => (
                <TableHead key={role.id} className="text-center min-w-[100px]">
                  <div className="flex flex-col items-center gap-1">
                    <span className="capitalize">{role.name.replace(/_/g, ' ')}</span>
                    {role.is_system && <Badge variant="secondary" className="text-[10px]">System</Badge>}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ resource, action, key }) => (
              <TableRow key={key}>
                <TableCell className="font-medium text-sm">{resource.label}</TableCell>
                <TableCell className="text-sm capitalize text-muted-foreground">{action}</TableCell>
                {roles.map((role) => {
                  const adminLocked = isAdminRole(role.id);
                  const checked = draft[role.id]?.has(key) ?? false;
                  return (
                    <TableCell key={role.id} className="text-center">
                      <Checkbox
                        checked={checked}
                        disabled={adminLocked}
                        onCheckedChange={(val) => togglePermission(role.id, key, Boolean(val))}
                        aria-label={`${role.name} ${resource.key} ${action}`}
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
