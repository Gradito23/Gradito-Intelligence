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
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { toast } from '@/components/ui/use-toast';
import ChefAvatar from '@/components/ui/ChefAvatar';
import IntakeRequestDetail from '@/components/intake/IntakeRequestDetail';
import {
  Check,
  X,
  ChevronRight,
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
  const maxGuest = p.max_guest_count ?? p.max_solo_guests ?? 12;
  return {
    first_name: req.first_name,
    last_name: req.last_name,
    preferred_name: p.preferred_name || undefined,
    email: req.email || p.email || undefined,
    mobile: req.mobile || p.mobile || undefined,
    photo_url: req.photo_url || p.photo_url || undefined,
    city: p.city || undefined,
    state: p.state || undefined,
    home_airport: p.home_airport || undefined,
    has_vehicle: typeof p.has_vehicle === 'boolean' ? p.has_vehicle : undefined,
    current_position: p.current_position || undefined,
    current_company: p.current_company || undefined,
    years_cooking: p.years_cooking ?? undefined,
    awards: p.awards || undefined,
    resume_url: p.resume_url || undefined,
    menu_url: p.menu_url || undefined,
    bio_url: p.bio_url || undefined,
    roles_available: p.roles_available || 'Head',
    travel_policy: p.travel_policy || 'Home only',
    default_travel_fee: p.default_travel_fee ?? 0,
    max_solo_guests: maxGuest,
    max_guest_count: maxGuest,
    commercial_kitchen_access: p.commercial_kitchen_access || undefined,
    own_kitchen_max_guests: p.own_kitchen_max_guests ?? undefined,
    starting_event_fee_usd: p.starting_event_fee_usd ?? undefined,
    starting_fee_flexible: p.starting_fee_flexible || undefined,
    expected_compensation_usd: p.expected_compensation_usd ?? undefined,
    travel_distance: p.travel_distance || undefined,
    has_passport: typeof p.has_passport === 'boolean' ? p.has_passport : undefined,
    ideal_events_per_period: p.ideal_events_per_period ?? undefined,
    preferred_event_days: p.preferred_event_days || [],
    lead_time: p.lead_time || undefined,
    opportunity_preferences: p.opportunity_preferences || [],
    instagram_url: p.instagram_url || undefined,
    tiktok_url: p.tiktok_url || undefined,
    linkedin_url: p.linkedin_url || undefined,
    youtube_url: p.youtube_url || undefined,
    website_url: p.website_url || undefined,
    newsletter_url: p.newsletter_url || undefined,
    social_follower_band: p.social_follower_band || undefined,
    media_history: p.media_history || undefined,
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
    notes: p.notes || p.professional_bio || undefined,
    talent_profile: p.talent_profile || {},
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
  const [detailRequest, setDetailRequest] = useState(null);
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
      if (detailRequest?.id === req.id) setDetailRequest(null);
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
      if (detailRequest?.id === req.id) setDetailRequest(null);
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
            const payload = req.payload || {};
            const fullName = `${req.first_name} ${req.last_name}`;
            const location = [payload.city, payload.state].filter(Boolean).join(', ')
              || formatList(payload.home_areas);
            const submitted = new Date(req.created_date || req.created_at).toLocaleDateString();
            const busy = busyId === req.id;
            const selected = detailRequest?.id === req.id;

            return (
              <Card
                key={req.id}
                className={`overflow-hidden transition-colors ${selected ? 'ring-2 ring-navy/30' : ''}`}
              >
                <button
                  type="button"
                  className="w-full p-4 flex items-center gap-3 text-left hover:bg-secondary/30 transition-colors"
                  onClick={() => setDetailRequest(req)}
                >
                  <ChefAvatar photoUrl={req.photo_url} name={fullName} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{fullName}</p>
                      <Badge className={`text-xs border-0 ${STATUS_BADGE[req.status] || ''}`}>
                        {req.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {req.email || 'No email'} · {location || '—'} · {submitted}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {req.status === 'pending' && canWrite && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white hidden sm:inline-flex"
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
                          className="text-red-700 border-red-200 hover:bg-red-50 hidden sm:inline-flex"
                          disabled={busy}
                          onClick={() => { setRejectTarget(req); setRejectReason(''); }}
                        >
                          <X size={14} className="mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    <ChevronRight size={18} className="text-muted-foreground" />
                  </div>
                </button>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet
        open={!!detailRequest}
        onOpenChange={(open) => { if (!open) setDetailRequest(null); }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl p-0 flex flex-col gap-0"
        >
          {detailRequest && (
            <>
              <div className="bg-navy text-white p-5 shrink-0">
                <SheetHeader className="space-y-3 text-left">
                  <div className="flex items-start gap-3 pr-6">
                    <ChefAvatar
                      photoUrl={detailRequest.photo_url}
                      name={`${detailRequest.first_name} ${detailRequest.last_name}`}
                      size="lg"
                    />
                    <div className="min-w-0">
                      <SheetTitle className="text-white font-heading text-xl">
                        {detailRequest.first_name} {detailRequest.last_name}
                      </SheetTitle>
                      <p className="text-white/70 text-sm mt-1 truncate">
                        {detailRequest.email || 'No email'}
                      </p>
                      <Badge className={`mt-2 text-xs border-0 ${STATUS_BADGE[detailRequest.status] || ''}`}>
                        {detailRequest.status}
                      </Badge>
                    </div>
                  </div>
                </SheetHeader>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                <IntakeRequestDetail request={detailRequest} />
                {detailRequest.status !== 'pending' && (
                  <div className="text-xs text-muted-foreground mt-4 pt-3 border-t">
                    Reviewed{' '}
                    {detailRequest.reviewed_at
                      ? new Date(detailRequest.reviewed_at).toLocaleString()
                      : '—'}
                    {detailRequest.rejection_reason && (
                      <p className="mt-1 text-red-700">Reason: {detailRequest.rejection_reason}</p>
                    )}
                  </div>
                )}
              </div>

              {detailRequest.status === 'pending' && canWrite && (
                <SheetFooter className="shrink-0 border-t p-4 gap-2 sm:flex-row sm:justify-stretch">
                  <Button
                    type="button"
                    variant="outline"
                    className="text-red-700 border-red-200 hover:bg-red-50 flex-1"
                    disabled={busyId === detailRequest.id}
                    onClick={() => {
                      setRejectTarget(detailRequest);
                      setRejectReason('');
                    }}
                  >
                    <X size={14} className="mr-1" />
                    Reject
                  </Button>
                  <Button
                    type="button"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
                    disabled={busyId === detailRequest.id}
                    onClick={async () => {
                      await handleApprove(detailRequest);
                    }}
                  >
                    {busyId === detailRequest.id ? (
                      <Loader2 size={14} className="animate-spin mr-1" />
                    ) : (
                      <Check size={14} className="mr-1" />
                    )}
                    Approve & add to roster
                  </Button>
                </SheetFooter>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

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
