import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useChefIntakeRequests } from '@/hooks/useAppData';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import ChefAvatar from '@/components/ui/ChefAvatar';
import {
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Loader2,
  Inbox,
} from 'lucide-react';

const FILTERS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

const STATUS_BADGE = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
};

function formatList(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return '—';
  return arr.join(', ');
}

function chefPayloadFromRequest(req) {
  const p = req.payload || {};
  return {
    first_name: req.first_name,
    last_name: req.last_name,
    email: req.email || p.email || undefined,
    mobile: req.mobile || p.mobile || undefined,
    photo_url: req.photo_url || p.photo_url || undefined,
    menu_url: p.menu_url || undefined,
    bio_url: p.bio_url || undefined,
    roles_available: p.roles_available || 'Head',
    travel_policy: p.travel_policy || 'Home only',
    default_travel_fee: p.default_travel_fee ?? 0,
    max_solo_guests: p.max_solo_guests ?? 12,
    equipment_notes: p.equipment_notes || undefined,
    signature_experiences: p.signature_experiences || undefined,
    home_areas: p.home_areas || [],
    cuisines: p.cuisines || [],
    experience_types: p.experience_types || [],
    dietary_specialties: p.dietary_specialties || [],
    languages: p.languages || [],
    blackout_holidays: p.blackout_holidays || [],
    blackout_dates: p.blackout_dates || [],
    availability_notes: p.availability_notes || undefined,
    notes: p.notes || undefined,
    quality_rating: 3,
    profile_status: 'Complete',
    status: 'Active',
    travel_fees: [],
  };
}

export default function IntakeRequests() {
  const { data: requests = [], isLoading } = useChefIntakeRequests();
  const queryClient = useQueryClient();
  const { user, hasPermission } = useAuth();
  const canWrite = hasPermission('intake', 'write');

  const [filter, setFilter] = useState('pending');
  const [expandedId, setExpandedId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const counts = useMemo(() => ({
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  }), [requests]);

  const filtered = useMemo(() => {
    if (filter === 'all') return requests;
    return requests.filter((r) => r.status === filter);
  }, [requests, filter]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['chefIntakeRequests'] });
    queryClient.invalidateQueries({ queryKey: ['chefs'] });
  };

  const handleApprove = async (req) => {
    if (!canWrite || req.status !== 'pending') return;
    setBusyId(req.id);
    try {
      const chef = await base44.entities.Chef.create(chefPayloadFromRequest(req));
      await base44.entities.ChefIntakeRequest.update(req.id, {
        status: 'approved',
        chef_id: chef.id,
        reviewed_by: user?.id || null,
        reviewed_at: new Date().toISOString(),
      });
      try {
        await base44.entities.ActivityLog.create({
          actor: user?.display_name || user?.email || 'Ops',
          action: 'Approved',
          entity_type: 'Intake',
          entity_label: `${req.first_name} ${req.last_name}`,
          summary: `Approved intake for ${req.first_name} ${req.last_name} → chef roster`,
        });
      } catch { /* ignore */ }
      toast({ title: 'Approved', description: `${req.first_name} ${req.last_name} added to Chefs.` });
      invalidate();
    } catch (err) {
      toast({
        title: 'Approve failed',
        description: err.message || 'Could not approve request.',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget || !canWrite) return;
    const req = rejectTarget;
    setBusyId(req.id);
    try {
      await base44.entities.ChefIntakeRequest.update(req.id, {
        status: 'rejected',
        rejection_reason: rejectReason.trim() || null,
        reviewed_by: user?.id || null,
        reviewed_at: new Date().toISOString(),
      });
      try {
        await base44.entities.ActivityLog.create({
          actor: user?.display_name || user?.email || 'Ops',
          action: 'Rejected',
          entity_type: 'Intake',
          entity_label: `${req.first_name} ${req.last_name}`,
          summary: `Rejected intake for ${req.first_name} ${req.last_name}${rejectReason.trim() ? `: ${rejectReason.trim()}` : ''}`,
        });
      } catch { /* ignore */ }
      toast({ title: 'Rejected', description: `${req.first_name} ${req.last_name} was rejected.` });
      setRejectTarget(null);
      setRejectReason('');
      invalidate();
    } catch (err) {
      toast({
        title: 'Reject failed',
        description: err.message || 'Could not reject request.',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold">Intake Requests</h1>
          <p className="text-muted-foreground mt-1">
            Review chef self-submissions before they join the roster
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <Button
              key={f.key}
              type="button"
              size="sm"
              variant={filter === f.key ? 'default' : 'outline'}
              className={filter === f.key ? 'bg-navy hover:bg-navy/90 text-white' : ''}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending</p>
          <p className="font-heading text-2xl font-bold text-amber-700">{counts.pending}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Approved</p>
          <p className="font-heading text-2xl font-bold text-emerald-700">{counts.approved}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Rejected</p>
          <p className="font-heading text-2xl font-bold text-red-700">{counts.rejected}</p>
        </Card>
      </div>

      {isLoading ? (
        <Card className="p-10 flex justify-center">
          <Loader2 className="animate-spin text-muted-foreground" />
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <Inbox size={40} className="mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="font-medium">No {filter === 'all' ? '' : filter} requests</p>
          <p className="text-sm text-muted-foreground mt-1">
            New submissions from the public intake form will appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((req) => {
            const expanded = expandedId === req.id;
            const payload = req.payload || {};
            const fullName = `${req.first_name} ${req.last_name}`;
            const areas = formatList(payload.home_areas);
            const submitted = new Date(req.created_date || req.created_at).toLocaleDateString();
            const busy = busyId === req.id;

            return (
              <Card key={req.id} className="overflow-hidden">
                <div className="p-4 flex flex-wrap items-center gap-3 justify-between">
                  <button
                    type="button"
                    className="flex items-center gap-3 text-left min-w-0 flex-1"
                    onClick={() => setExpandedId(expanded ? null : req.id)}
                  >
                    <ChefAvatar photoUrl={req.photo_url} name={fullName} size="md" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{fullName}</p>
                        <Badge className={`text-xs border-0 ${STATUS_BADGE[req.status] || ''}`}>
                          {req.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {req.email || 'No email'} · {areas} · {submitted}
                      </p>
                    </div>
                    {expanded ? <ChevronUp size={16} className="shrink-0" /> : <ChevronDown size={16} className="shrink-0" />}
                  </button>

                  {req.status === 'pending' && canWrite && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={busy}
                        onClick={() => handleApprove(req)}
                      >
                        {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} className="mr-1" />}
                        Approve
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-red-700 border-red-200 hover:bg-red-50"
                        disabled={busy}
                        onClick={() => { setRejectTarget(req); setRejectReason(''); }}
                      >
                        <X size={14} className="mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>

                {expanded && (
                  <div className="border-t px-4 py-4 bg-secondary/10 space-y-3 text-sm">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-medium uppercase text-muted-foreground">Contact</p>
                        <p>{req.email || '—'}</p>
                        <p>{req.mobile || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase text-muted-foreground">Role / Travel</p>
                        <p>{payload.roles_available || '—'} · {payload.travel_policy || '—'}</p>
                        <p>Max solo guests: {payload.max_solo_guests ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase text-muted-foreground">Home areas</p>
                        <p>{formatList(payload.home_areas)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase text-muted-foreground">Cuisines</p>
                        <p>{formatList(payload.cuisines)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase text-muted-foreground">Experience types</p>
                        <p>{formatList(payload.experience_types)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase text-muted-foreground">Dietary / Languages</p>
                        <p>{formatList(payload.dietary_specialties)}</p>
                        <p>{formatList(payload.languages)}</p>
                      </div>
                    </div>
                    {(payload.menu_url || payload.bio_url) && (
                      <div>
                        <p className="text-xs font-medium uppercase text-muted-foreground mb-1">Links</p>
                        {payload.menu_url && (
                          <a href={payload.menu_url} target="_blank" rel="noreferrer" className="text-navy underline block truncate">
                            Menu
                          </a>
                        )}
                        {payload.bio_url && (
                          <p className="whitespace-pre-wrap text-muted-foreground break-all">{payload.bio_url}</p>
                        )}
                      </div>
                    )}
                    {payload.notes && (
                      <div>
                        <p className="text-xs font-medium uppercase text-muted-foreground">Bio / notes</p>
                        <p className="whitespace-pre-wrap">{payload.notes}</p>
                      </div>
                    )}
                    {payload.signature_experiences && (
                      <div>
                        <p className="text-xs font-medium uppercase text-muted-foreground">Signature experiences</p>
                        <p className="whitespace-pre-wrap">{payload.signature_experiences}</p>
                      </div>
                    )}
                    {req.status !== 'pending' && (
                      <div className="text-xs text-muted-foreground pt-2 border-t">
                        Reviewed {req.reviewed_at ? new Date(req.reviewed_at).toLocaleString() : '—'}
                        {req.rejection_reason && (
                          <p className="mt-1 text-red-700">Reason: {req.rejection_reason}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) setRejectTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject intake request</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {rejectTarget
              ? `Reject ${rejectTarget.first_name} ${rejectTarget.last_name}? They will not be added to the chef roster.`
              : ''}
          </p>
          <div>
            <Label>Reason (optional)</Label>
            <Textarea
              className="mt-1"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. incomplete profile, duplicate…"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={!!busyId}
              onClick={handleRejectConfirm}
            >
              {busyId ? <Loader2 size={14} className="animate-spin mr-1" /> : <ClipboardList size={14} className="mr-1" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
