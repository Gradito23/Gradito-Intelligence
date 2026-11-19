import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useChefs, useChefIntakeRequests, useChefInviteProspects } from '@/hooks/useAppData';
import { chefPayloadFromIntakeRequest } from '@/lib/chefIntakeMerge';
import { findChefByIdentity, findProspectByIdentity } from '@/lib/chefDedupe';
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
import { supabase } from '@/api/supabaseClient';
import { FunctionsHttpError } from '@supabase/supabase-js';
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

export default function IntakeRequests() {
  const { data: requests = [], isLoading } = useChefIntakeRequests();
  const { data: inviteProspects = [] } = useChefInviteProspects();
  const { data: chefs = [] } = useChefs();
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
    queryClient.invalidateQueries({ queryKey: ['chefInviteProspects'] });
  };

  async function sendApprovalWelcome(intakeRequestId) {
    const { data, error } = await supabase.functions.invoke('chef-intake-approve-notify', {
      body: { intake_request_id: intakeRequestId },
    });
    if (error) {
      let message = error.message;
      if (error instanceof FunctionsHttpError) {
        try {
          const body = await error.context.json();
          if (body?.error) message = body.error;
        } catch {
          /* ignore */
        }
      }
      throw new Error(message);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  }

  function approvalNotifySummary(notify) {
    if (!notify) return null;
    const parts = [];
    if (notify.email?.status === 'sent') parts.push('welcome email sent');
    else if (notify.email?.status === 'failed') parts.push('email failed');
    else if (notify.email?.reason === 'no_email') parts.push('no email on file');
    if (notify.sms?.status === 'sent') parts.push('SMS sent');
    else if (notify.sms?.status === 'failed') parts.push('SMS failed');
    else if (notify.sms?.reason === 'no_phone') parts.push('no phone for SMS');
    else if (notify.sms?.reason === 'messaging_opt_out') parts.push('SMS skipped (opt-out)');
    else if (notify.sms?.reason === 'quo_not_configured') parts.push('SMS skipped (Quo off)');
    return parts.length ? parts.join(' · ') : null;
  }

  const handleApprove = async (req) => {
    if (!canWrite || req.status !== 'pending') return;
    setBusyId(req.id);
    try {
      const payload = chefPayloadFromIntakeRequest(req);
      const identity = { email: req.email || req.payload?.email, mobile: req.mobile || req.payload?.mobile };
      const roster = chefs.length ? chefs : (queryClient.getQueryData(['chefs']) || []);
      let chef = null;

      if (req.prospect_id) {
        const prospect = await base44.entities.ChefInviteProspect.get(req.prospect_id);
        if (prospect?.chef_id) {
          chef = await base44.entities.Chef.get(prospect.chef_id);
        }
      }

      if (!chef) {
        chef = findChefByIdentity(roster, identity);
      }

      if (chef?.id) {
        await base44.entities.Chef.update(chef.id, payload);
        chef = { ...chef, id: chef.id };
      } else {
        chef = await base44.entities.Chef.create(payload);
      }

      await base44.entities.ChefIntakeRequest.update(req.id, {
        status: 'approved',
        chef_id: chef.id,
        reviewed_by: user?.id || null,
        reviewed_at: new Date().toISOString(),
      });

      let prospectId = req.prospect_id;
      if (!prospectId) {
        const match = findProspectByIdentity(inviteProspects, identity);
        prospectId = match?.id;
      }
      if (prospectId) {
        await base44.entities.ChefInviteProspect.update(prospectId, {
          chef_id: chef.id,
          status: 'joined',
          intake_request_id: req.id,
        });
      }
      try {
        await base44.entities.ActivityLog.create({
          actor: user?.display_name || user?.email || 'Ops',
          action: 'Approved',
          entity_type: 'Intake',
          entity_label: `${req.first_name} ${req.last_name}`,
          summary: `Approved intake for ${req.first_name} ${req.last_name} → chef roster`,
        });
      } catch { /* ignore */ }
      let notifyDescription = `${req.first_name} ${req.last_name} added to Chefs.`;
      let notifyVariant = 'default';
      try {
        const notify = await sendApprovalWelcome(req.id);
        const summary = approvalNotifySummary(notify);
        if (summary) notifyDescription += ` ${summary}.`;
      } catch (notifyErr) {
        notifyDescription += ` Welcome message could not be sent: ${notifyErr instanceof Error ? notifyErr.message : 'Unknown error'}.`;
        notifyVariant = 'destructive';
      }
      toast({
        title: 'Approved',
        description: notifyDescription,
        variant: notifyVariant === 'destructive' ? 'destructive' : undefined,
      });
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
