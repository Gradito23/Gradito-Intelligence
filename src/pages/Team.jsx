import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTeamMembers } from '@/hooks/useAppData';
import { UserPlus, Pencil, Trash2, Check, X, AlertTriangle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const EMPTY_FORM = { first_name: '', last_name: '', email: '', roles: [] };

function RoleToggle({ roles, onChange }) {
  const toggle = (role) =>
    onChange(roles.includes(role) ? roles.filter(r => r !== role) : [...roles, role]);
  return (
    <div className="flex gap-2">
      {['Closer', 'Facilitator'].map(role => (
        <button
          key={role}
          type="button"
          onClick={() => toggle(role)}
          className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
            roles.includes(role)
              ? 'bg-navy text-white border-navy'
              : 'border-border text-muted-foreground hover:border-navy hover:text-foreground'
          }`}
        >
          {role}
        </button>
      ))}
    </div>
  );
}

function MemberCard({ member, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...member });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.first_name.trim()) return;
    setSaving(true);
    await onSave(member.id, form);
    setSaving(false);
    setEditing(false);
  };

  const handleCancel = () => {
    setForm({ ...member });
    setEditing(false);
    setConfirmDelete(false);
  };

  if (editing) {
    return (
      <Card className="p-4 space-y-3 border-navy/30">
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="First name *" value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} className="h-8 text-sm" />
          <Input placeholder="Last name" value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} className="h-8 text-sm" />
        </div>
        <Input placeholder="Email" value={form.email || ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="h-8 text-sm" />
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Roles</p>
          <RoleToggle roles={form.roles || []} onChange={roles => setForm(p => ({ ...p, roles }))} />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={!form.first_name.trim() || saving} className="h-7 text-xs bg-navy hover:bg-navy/90 text-white">
            <Check size={12} className="mr-1" />{saving ? 'Saving…' : 'Save'}
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel} className="h-7 text-xs">
            <X size={12} className="mr-1" />Cancel
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{member.first_name} {member.last_name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${
              member.active
                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                : 'bg-secondary text-muted-foreground border-border'
            }`}>
              {member.active ? 'Active' : 'Inactive'}
            </span>
          </div>
          {member.email && <p className="text-xs text-muted-foreground mt-0.5">{member.email}</p>}
          <div className="flex gap-1 mt-2 flex-wrap">
            {(member.roles || []).length > 0
              ? (member.roles || []).map(r => <Badge key={r} variant="outline" className="text-xs px-1.5 py-0">{r}</Badge>)
              : <span className="text-xs text-muted-foreground italic">No roles assigned</span>
            }
          </div>
        </div>
        <div className="flex gap-1 ml-2">
          <button onClick={() => setEditing(true)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div className="mt-3 bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-2">
          <p className="text-xs font-medium text-destructive flex items-center gap-1.5">
            <AlertTriangle size={12} /> Delete {member.first_name} {member.last_name}?
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={() => onDelete(member.id)} className="h-7 text-xs">Delete</Button>
            <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)} className="h-7 text-xs">Cancel</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function Team() {
  const queryClient = useQueryClient();
  const { data: teamMembers } = useTeamMembers();
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['teamMembers'] });

  const logActivity = (action, name, summary) =>
    base44.entities.ActivityLog.create({ actor: 'Team', action, entity_type: 'TeamMember', entity_label: name, summary });

  const handleAdd = async () => {
    if (!addForm.first_name.trim()) return;
    setSaving(true);

    // Prevent duplicate by email
    if (addForm.email.trim()) {
      const existing = teamMembers.find(m => m.email?.toLowerCase() === addForm.email.trim().toLowerCase());
      if (existing) {
        await base44.entities.TeamMember.update(existing.id, { ...addForm });
        await logActivity('Updated', `${addForm.first_name} ${addForm.last_name}`, `Updated team member ${addForm.first_name} ${addForm.last_name} (email match)`);
        invalidate();
        setAddForm(EMPTY_FORM);
        setSaving(false);
        toast({ title: `Updated existing member ${addForm.first_name} ${addForm.last_name}` });
        return;
      }
    }

    await base44.entities.TeamMember.create({ ...addForm, active: true });
    await logActivity('Created', `${addForm.first_name} ${addForm.last_name}`, `Added team member ${addForm.first_name} ${addForm.last_name}`);
    invalidate();
    setAddForm(EMPTY_FORM);
    setSaving(false);
    toast({ title: `Added ${addForm.first_name} ${addForm.last_name}` });
  };

  const handleSave = async (id, form) => {
    await base44.entities.TeamMember.update(id, form);
    await logActivity('Updated', `${form.first_name} ${form.last_name}`, `Updated team member ${form.first_name} ${form.last_name}`);
    invalidate();
    toast({ title: `Saved ${form.first_name} ${form.last_name}` });
  };

  const handleDelete = async (id) => {
    const member = teamMembers.find(m => m.id === id);
    await base44.entities.TeamMember.delete(id);
    await logActivity('Deleted', `${member?.first_name} ${member?.last_name}`, `Deleted team member ${member?.first_name} ${member?.last_name}`);
    invalidate();
    toast({ title: `Deleted ${member?.first_name} ${member?.last_name}` });
  };

  const active = (teamMembers || []).filter(m => m.active !== false);
  const inactive = (teamMembers || []).filter(m => m.active === false);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-navy">Team Members</h1>
        <p className="text-sm text-muted-foreground mt-1">Sales Specialists (Closers) and Execution Specialists (Facilitators) for commission attribution.</p>
      </div>

      {/* Add form */}
      <Card className="p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add Team Member</p>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="First name *" value={addForm.first_name} onChange={e => setAddForm(p => ({ ...p, first_name: e.target.value }))} className="h-8 text-sm" />
          <Input placeholder="Last name" value={addForm.last_name} onChange={e => setAddForm(p => ({ ...p, last_name: e.target.value }))} className="h-8 text-sm" />
        </div>
        <Input placeholder="Email (optional — used to prevent duplicates)" value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} className="h-8 text-sm" />
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Roles</p>
          <RoleToggle roles={addForm.roles} onChange={roles => setAddForm(p => ({ ...p, roles }))} />
        </div>
        <Button onClick={handleAdd} disabled={!addForm.first_name.trim() || saving} size="sm" className="bg-navy hover:bg-navy/90 text-white h-8 text-xs">
          <UserPlus size={13} className="mr-1.5" />
          {saving ? 'Saving…' : 'Add Member'}
        </Button>
      </Card>

      {/* Active members */}
      {active.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Active ({active.length})</p>
          {active.map(m => (
            <MemberCard key={m.id} member={m} onSave={handleSave} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Inactive members */}
      {inactive.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Inactive ({inactive.length})</p>
          {inactive.map(m => (
            <MemberCard key={m.id} member={m} onSave={handleSave} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {(teamMembers || []).length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No team members yet. Add your first one above.</p>
      )}
    </div>
  );
}