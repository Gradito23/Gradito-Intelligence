import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTeamMembers } from '@/hooks/useAppData';
import { UserPlus } from 'lucide-react';

const EMPTY_ADD = { first_name: '', last_name: '', email: '', roles: [] };

export default function ManageTeamModal({ open, onClose }) {
  const queryClient = useQueryClient();
  const { data: teamMembers } = useTeamMembers();
  const [addForm, setAddForm] = useState(EMPTY_ADD);
  const [saving, setSaving] = useState(false);

  const toggleRole = (role) => {
    setAddForm(prev => ({
      ...prev,
      roles: prev.roles.includes(role) ? prev.roles.filter(r => r !== role) : [...prev.roles, role],
    }));
  };

  const handleAdd = async () => {
    if (!addForm.first_name.trim()) return;
    setSaving(true);
    await base44.entities.TeamMember.create({ ...addForm, active: true });
    queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
    setAddForm(EMPTY_ADD);
    setSaving(false);
  };

  const toggleActive = async (member) => {
    await base44.entities.TeamMember.update(member.id, { active: !member.active });
    queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Manage Team Members</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing members */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {teamMembers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No team members yet</p>
            )}
            {teamMembers.map(m => (
              <div key={m.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-card">
                <div>
                  <p className="text-sm font-medium">{m.first_name} {m.last_name}</p>
                  {m.email && <p className="text-xs text-muted-foreground">{m.email}</p>}
                  <div className="flex gap-1 mt-1">
                    {(m.roles || []).map(r => (
                      <Badge key={r} variant="outline" className="text-xs px-1.5 py-0">{r}</Badge>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => toggleActive(m)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    m.active
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200'
                      : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                  }`}
                >
                  {m.active ? 'Active' : 'Inactive'}
                </button>
              </div>
            ))}
          </div>

          {/* Add form */}
          <div className="pt-3 border-t space-y-2.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Add Team Member</p>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="First name *"
                value={addForm.first_name}
                onChange={e => setAddForm(p => ({ ...p, first_name: e.target.value }))}
                className="h-8 text-sm"
              />
              <Input
                placeholder="Last name"
                value={addForm.last_name}
                onChange={e => setAddForm(p => ({ ...p, last_name: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <Input
              placeholder="Email (optional)"
              value={addForm.email}
              onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))}
              className="h-8 text-sm"
            />
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Roles</p>
              <div className="flex gap-2">
                {['Closer', 'Facilitator'].map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      addForm.roles.includes(role)
                        ? 'bg-navy text-white border-navy'
                        : 'border-border text-muted-foreground hover:border-navy hover:text-foreground'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
            <Button
              onClick={handleAdd}
              disabled={!addForm.first_name.trim() || saving}
              size="sm"
              className="w-full bg-navy hover:bg-navy/90 text-white h-8 text-xs"
            >
              <UserPlus size={13} className="mr-1.5" />
              {saving ? 'Adding…' : 'Add Member'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}