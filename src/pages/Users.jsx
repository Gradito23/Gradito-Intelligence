import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserPlus, Shield, User } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });
}

function InviteDialog({ open, onClose, onInvited }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [saving, setSaving] = useState(false);

  const handleInvite = async () => {
    if (!email.trim()) return;
    setSaving(true);
    await base44.users.inviteUser(email.trim(), role);
    setSaving(false);
    setEmail('');
    setRole('user');
    onInvited();
    onClose();
    toast({ title: `Invite sent to ${email.trim()}` });
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
              onChange={e => setEmail(e.target.value)}
              className="h-9"
              onKeyDown={e => e.key === 'Enter' && handleInvite()}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-1">Role</label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User — normal access</SelectItem>
                <SelectItem value="admin">Admin — full access</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Base44 will send an invite email. The user sets their own password on first login.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose} size="sm">Cancel</Button>
            <Button
              onClick={handleInvite}
              disabled={!email.trim() || saving}
              size="sm"
              className="bg-navy hover:bg-navy/90 text-white"
            >
              <UserPlus size={13} className="mr-1.5" />
              {saving ? 'Sending…' : 'Send Invite'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Users() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { data: users } = useUsers();
  const [showInvite, setShowInvite] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  // Block non-admins
  if (currentUser && currentUser.role !== 'admin') {
    return <Navigate to="/chefs" replace />;
  }

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingId(userId);
    await base44.entities.User.update(userId, { role: newRole });
    queryClient.invalidateQueries({ queryKey: ['users'] });
    setUpdatingId(null);
    toast({ title: 'Role updated' });
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-navy">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage who can log into this app. Separate from Team Members (commission reps).
          </p>
        </div>
        <Button
          onClick={() => setShowInvite(true)}
          size="sm"
          className="bg-navy hover:bg-navy/90 text-white"
        >
          <UserPlus size={14} className="mr-1.5" />
          Invite User
        </Button>
      </div>

      <div className="space-y-2">
        {(users || []).length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No users found.</p>
        )}
        {(users || []).map(u => {
          const isAdmin = u.role === 'admin';
          const isCurrentUser = currentUser?.id === u.id;
          return (
            <Card key={u.id} className="p-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-full bg-navy/10 flex items-center justify-center shrink-0">
                {isAdmin
                  ? <Shield size={16} className="text-gold" />
                  : <User size={16} className="text-muted-foreground" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {u.full_name || '—'}
                  {isCurrentUser && <span className="ml-2 text-xs text-muted-foreground font-normal">(you)</span>}
                </p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
              <div className="shrink-0">
                <Select
                  value={u.role || 'user'}
                  onValueChange={val => handleRoleChange(u.id, val)}
                  disabled={isCurrentUser || updatingId === u.id}
                >
                  <SelectTrigger className="h-8 text-xs w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Badge
                variant="outline"
                className={`text-xs shrink-0 ${isAdmin ? 'border-gold/50 text-gold bg-gold/5' : 'text-muted-foreground'}`}
              >
                {isAdmin ? 'Admin' : 'User'}
              </Badge>
            </Card>
          );
        })}
      </div>

      <InviteDialog
        open={showInvite}
        onClose={() => setShowInvite(false)}
        onInvited={() => queryClient.invalidateQueries({ queryKey: ['users'] })}
      />
    </div>
  );
}