import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  Loader2, Mail, Shield, User, UserPlus, UserX, RefreshCw, KeyRound, Trash2,
} from 'lucide-react';
import GoogleIcon from '@/components/GoogleIcon';
import { useAuth } from '@/lib/AuthContext';
import { useAppRoles } from '@/hooks/useAppRoles';
import {
  useUsers,
  useInviteUser,
  useUpdateUserRole,
  useDeactivateUser,
  useReactivateUser,
  useResendInvite,
  useDeleteUser,
} from '@/hooks/useUsers';
import { usePermission } from '@/hooks/usePermission';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/use-toast';

const STATUS_STYLES = {
  active: 'border-green-500/40 text-green-700 bg-green-50',
  invited: 'border-amber-500/40 text-amber-700 bg-amber-50',
  deactivated: 'border-red-500/40 text-red-700 bg-red-50',
};

function getInitials(user) {
  if (user.display_name) {
    const parts = user.display_name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (user.email) return user.email.slice(0, 2).toUpperCase();
  return 'U';
}

function InviteDialog({ open, onClose, roles, onInvited }) {
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const invite = useInviteUser();

  const defaultRoleId = roles.find((r) => r.name === 'user')?.id ?? roles[0]?.id ?? '';

  const handleInvite = async () => {
    if (!email.trim() || !roleId) return;
    try {
      await invite.mutateAsync({ email: email.trim(), role_id: roleId || defaultRoleId });
      toast({ title: `Invite sent to ${email.trim()}` });
      setEmail('');
      setRoleId('');
      onInvited();
      onClose();
    } catch (err) {
      toast({ title: 'Invite failed', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">Invite User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-1">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-1">Email *</label>
            <Input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9"
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-1">Role</label>
            <Select value={roleId || defaultRoleId} onValueChange={setRoleId}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            An invite email will be sent via your configured Email integration (Resend or SMTP).
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose} size="sm">Cancel</Button>
            <Button
              onClick={handleInvite}
              disabled={!email.trim() || invite.isPending}
              size="sm"
              className="bg-navy hover:bg-navy/90 text-white"
            >
              <UserPlus size={13} className="mr-1.5" />
              {invite.isPending ? 'Sending…' : 'Send Invite'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LoginMethodIcons({ hasGoogle, hasPassword }) {
  return (
    <div className="flex items-center gap-1.5">
      {hasGoogle && <GoogleIcon className="w-3.5 h-3.5" title="Google" />}
      {hasPassword && <KeyRound size={14} className="text-muted-foreground" title="Password" />}
      {!hasGoogle && !hasPassword && <span className="text-xs text-muted-foreground">—</span>}
    </div>
  );
}

export default function UsersList() {
  const { user: currentUser } = useAuth();
  const canWrite = usePermission('users', 'write');
  const { data, isLoading, error } = useUsers();
  const { data: roles = [] } = useAppRoles();
  const updateRole = useUpdateUserRole();
  const deactivate = useDeactivateUser();
  const reactivate = useReactivateUser();
  const resendInvite = useResendInvite();
  const deleteUser = useDeleteUser();

  const [showInvite, setShowInvite] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const users = data?.users ?? [];

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q
        || u.email.toLowerCase().includes(q)
        || (u.display_name ?? '').toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [users, search, statusFilter]);

  const handleRoleChange = async (userId, roleId) => {
    setUpdatingId(userId);
    try {
      await updateRole.mutateAsync({ user_id: userId, role_id: roleId });
      toast({ title: 'Role updated' });
    } catch (err) {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    } finally {
      setUpdatingId(null);
    }
  };

  const runConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, userId } = confirmAction;
    try {
      if (type === 'deactivate') await deactivate.mutateAsync(userId);
      else if (type === 'reactivate') await reactivate.mutateAsync(userId);
      else if (type === 'resend') await resendInvite.mutateAsync(userId);
      else if (type === 'delete') await deleteUser.mutateAsync(userId);
      toast({
        title: type === 'deactivate' ? 'User deactivated'
          : type === 'reactivate' ? 'User reactivated'
          : type === 'delete' ? 'User deleted'
          : 'Invite resent',
      });
    } catch (err) {
      toast({ title: 'Action failed', description: err.message, variant: 'destructive' });
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
    return (
      <p className="text-sm text-destructive">Failed to load users: {error.message}</p>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-heading text-xl font-semibold text-navy">Users</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage login accounts. Separate from Team Members (commission reps).
          </p>
        </div>
        {canWrite && (
          <Button
            onClick={() => setShowInvite(true)}
            size="sm"
            className="bg-navy hover:bg-navy/90 text-white"
          >
            <UserPlus size={14} className="mr-1.5" />
            Invite User
          </Button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs h-9"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="invited">Invited</SelectItem>
            <SelectItem value="deactivated">Deactivated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No users found.</p>
        )}
        {filtered.map((u) => {
          const isAdmin = u.role === 'admin';
          const isCurrentUser = currentUser?.id === u.id;
          const isDeactivated = u.status === 'deactivated';
          const isInvited = u.status === 'invited';

          return (
            <Card key={u.id} className="p-4 flex items-center gap-4 flex-wrap">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={u.avatar_url ?? undefined} />
                <AvatarFallback className="bg-navy/10 text-xs">
                  {isAdmin ? <Shield size={14} className="text-gold" /> : getInitials(u)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {u.display_name || '—'}
                  {isCurrentUser && <span className="ml-2 text-xs text-muted-foreground font-normal">(you)</span>}
                </p>
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  <Mail size={11} />
                  {u.email}
                </p>
                {u.last_login_at && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Last login: {format(new Date(u.last_login_at), 'PPp')}
                  </p>
                )}
              </div>

              <LoginMethodIcons hasGoogle={u.has_google} hasPassword={u.has_password} />

              <Badge variant="outline" className={`text-xs capitalize ${STATUS_STYLES[u.status] ?? ''}`}>
                {u.status}
              </Badge>

              {canWrite ? (
                <Select
                  value={u.role_id ?? ''}
                  onValueChange={(val) => handleRoleChange(u.id, val)}
                  disabled={isCurrentUser || updatingId === u.id || isDeactivated}
                >
                  <SelectTrigger className="h-8 text-xs w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline" className="text-xs capitalize">{u.role}</Badge>
              )}

              {canWrite && !isCurrentUser && (
                <div className="flex gap-1 shrink-0">
                  {isInvited && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setConfirmAction({
                        type: 'resend',
                        userId: u.id,
                        title: 'Resend invite?',
                        description: `Send a new invitation email to ${u.email}?`,
                        confirmLabel: 'Resend',
                      })}
                    >
                      <RefreshCw size={12} className="mr-1" />
                      Resend
                    </Button>
                  )}
                  {isDeactivated ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setConfirmAction({
                        type: 'reactivate',
                        userId: u.id,
                        title: 'Reactivate user?',
                        description: `Restore access for ${u.email}?`,
                        confirmLabel: 'Reactivate',
                      })}
                    >
                      <User size={12} className="mr-1" />
                      Reactivate
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs text-destructive hover:text-destructive"
                      onClick={() => setConfirmAction({
                        type: 'deactivate',
                        userId: u.id,
                        title: 'Deactivate user?',
                        description: `Deactivate ${u.email}? They will lose access immediately.`,
                        confirmLabel: 'Deactivate',
                        variant: 'destructive',
                      })}
                    >
                      <UserX size={12} className="mr-1" />
                      Deactivate
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs text-destructive hover:text-destructive"
                    onClick={() => setConfirmAction({
                      type: 'delete',
                      userId: u.id,
                      title: 'Delete user permanently?',
                      description: `Permanently delete ${u.email}? This removes the user from the database and cannot be undone.`,
                      confirmLabel: 'Delete',
                      variant: 'destructive',
                    })}
                  >
                    <Trash2 size={12} className="mr-1" />
                    Delete
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <InviteDialog
        open={showInvite}
        onClose={() => setShowInvite(false)}
        roles={roles}
        onInvited={() => {}}
      />

      <ConfirmDialog
        open={Boolean(confirmAction)}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={confirmAction?.title}
        description={confirmAction?.description}
        confirmLabel={confirmAction?.confirmLabel}
        variant={confirmAction?.variant}
        loading={deactivate.isPending || reactivate.isPending || resendInvite.isPending || deleteUser.isPending}
        onConfirm={runConfirmAction}
      />
    </div>
  );
}
