import React, { useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAppRoles, useCreateRole, useUpdateRole, useDeleteRole } from '@/hooks/useAppRoles';
import { useRoleDeleteCheck } from '@/hooks/useUsers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/use-toast';

function RoleFormDialog({ open, onClose, initial, onSave, saving }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');

  React.useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setDescription(initial?.description ?? '');
    }
  }, [open, initial]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSave({ name: name.trim(), description: description.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading">{initial ? 'Edit Role' : 'Create Role'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="role-name">Name</Label>
            <Input
              id="role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. sales_manager"
              disabled={initial?.is_system}
              required
            />
            {initial?.is_system && (
              <p className="text-xs text-muted-foreground">System role names cannot be changed.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="role-desc">Description</Label>
            <Textarea
              id="role-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional description"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function RolesList() {
  const { data: roles = [], isLoading, error } = useAppRoles();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();
  const roleDeleteCheck = useRoleDeleteCheck();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (role) => {
    setEditing(role);
    setFormOpen(true);
  };

  const handleSave = async ({ name, description }) => {
    try {
      if (editing) {
        await updateRole.mutateAsync({ id: editing.id, name, description });
        toast({ title: 'Role updated' });
      } else {
        await createRole.mutateAsync({ name, description });
        toast({ title: 'Role created' });
      }
      setFormOpen(false);
    } catch (err) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteClick = async (role) => {
    try {
      const result = await roleDeleteCheck.mutateAsync(role.id);
      setDeleteDialog({
        role,
        canDelete: result.can_delete,
        reason: result.reason,
        users: result.users ?? [],
        userCount: result.user_count ?? 0,
      });
    } catch (err) {
      toast({ title: 'Check failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialog?.canDelete) return;
    try {
      await deleteRole.mutateAsync(deleteDialog.role.id);
      toast({ title: 'Role deleted' });
    } catch (err) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
      throw err;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">Failed to load roles: {error.message}</p>;
  }

  const blockedDescription = deleteDialog && !deleteDialog.canDelete ? (
    <div className="space-y-2 text-sm">
      <p>{deleteDialog.reason}</p>
      {deleteDialog.users.length > 0 && (
        <ul className="list-disc pl-5 space-y-1">
          {deleteDialog.users.map((u) => (
            <li key={u.id}>{u.display_name ? `${u.display_name} — ` : ''}{u.email}</li>
          ))}
        </ul>
      )}
    </div>
  ) : (
    deleteDialog ? `This will permanently delete the role "${deleteDialog.role.name}". This cannot be undone.` : null
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold text-navy">Roles</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create custom roles. System roles (admin, user) are protected.
          </p>
        </div>
        <Button onClick={openCreate} size="sm" className="bg-navy hover:bg-navy/90 text-white">
          <Plus size={14} className="mr-1.5" />
          Add Role
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-medium capitalize">{role.name.replace(/_/g, ' ')}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{role.description || '—'}</TableCell>
                <TableCell>{role.user_count}</TableCell>
                <TableCell>
                  {role.is_system ? (
                    <Badge variant="secondary" className="text-xs">System</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Custom</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(role)}>
                      <Pencil size={14} />
                    </Button>
                    {!role.is_system && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteClick(role)}
                        disabled={roleDeleteCheck.isPending}
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <RoleFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editing}
        onSave={handleSave}
        saving={createRole.isPending || updateRole.isPending}
      />

      <ConfirmDialog
        open={Boolean(deleteDialog)}
        onOpenChange={(open) => !open && setDeleteDialog(null)}
        title={
          deleteDialog?.canDelete
            ? `Delete role "${deleteDialog?.role?.name}"?`
            : `Cannot delete role "${deleteDialog?.role?.name}"`
        }
        description={blockedDescription}
        confirmLabel="Delete"
        variant="destructive"
        hideConfirm={deleteDialog ? !deleteDialog.canDelete : false}
        loading={deleteRole.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
