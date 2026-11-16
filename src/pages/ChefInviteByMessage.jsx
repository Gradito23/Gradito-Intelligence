import React, { useMemo, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useChefs, useChefInviteProspects } from '@/hooks/useAppData';
import { useQuoIntegrationStatus, useSendQuoMessage } from '@/hooks/useQuoIntegration';
import { findChefByIdentity, findProspectByIdentity } from '@/lib/chefDedupe';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import {
  canSendProspectInvite,
  deriveProspectInviteStatus,
  estimateSmsSegments,
  getIntakeLink,
  inviteStatusLabel,
  loadStoredInviteTemplate,
  renderChefInviteTemplate,
  saveStoredInviteTemplate,
  DEFAULT_CHEF_INTAKE_INVITE_TEMPLATE,
} from '@/lib/chefInviteMessage';
import { MessageSquare, Loader2, Send, Copy, AlertCircle, Plus } from 'lucide-react';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'not_invited', label: 'Not invited' },
  { value: 'invited', label: 'Invited' },
  { value: 'joined', label: 'Joined' },
  { value: 'no_phone', label: 'No phone' },
];

function statusBadgeClass(status) {
  switch (status) {
    case 'joined':
      return 'border-emerald-300 text-emerald-800 bg-emerald-50';
    case 'invited':
      return 'border-amber-300 text-amber-900 bg-amber-50';
    case 'no_phone':
      return 'border-border text-muted-foreground';
    default:
      return 'border-sky-300 text-sky-900 bg-sky-50';
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function AddProspectDialog({ open, onClose, chefs, prospects, onCreated }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', mobile: '' });
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setForm({ first_name: '', last_name: '', email: '', mobile: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.first_name?.trim() || !form.last_name?.trim()) return;
    const identity = {
      email: form.email,
      mobile: form.mobile,
    };
    if (findChefByIdentity(chefs, identity)) {
      toast({
        title: 'Already on roster',
        description: 'This email or phone matches a live chef — they are already joined.',
        variant: 'destructive',
      });
      return;
    }
    if (findProspectByIdentity(prospects, identity)) {
      toast({
        title: 'Prospect exists',
        description: 'A matching invite prospect is already on this list.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      await base44.entities.ChefInviteProspect.create({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email?.trim() || undefined,
        mobile: form.mobile?.trim() || undefined,
        status: 'not_invited',
      });
      toast({ title: 'Prospect added', description: `${form.first_name} ${form.last_name}` });
      reset();
      onCreated();
      onClose();
    } catch (err) {
      toast({
        title: 'Could not add prospect',
        description: err.message || 'Save failed',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">Add invite prospect</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Not on the chef roster yet. We block add when email or phone matches an existing chef.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="prospect-first">First name</Label>
              <Input id="prospect-first" value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} required />
            </div>
            <div>
              <Label htmlFor="prospect-last">Last name</Label>
              <Input id="prospect-last" value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} required />
            </div>
          </div>
          <div>
            <Label htmlFor="prospect-email">Email</Label>
            <Input id="prospect-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="prospect-mobile">Mobile (for SMS)</Label>
            <Input id="prospect-mobile" value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} />
          </div>
          <Button type="submit" className="w-full bg-navy hover:bg-navy/90 text-white" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add prospect'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ChefInviteByMessage() {
  const queryClient = useQueryClient();
  const { data: chefs = [] } = useChefs();
  const { data: prospects = [], isLoading } = useChefInviteProspects();
  const { data: quoStatus } = useQuoIntegrationStatus();
  const sendQuo = useSendQuoMessage();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('not_invited');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [activeProspectId, setActiveProspectId] = useState(null);
  const [template, setTemplate] = useState(() => loadStoredInviteTemplate());
  const [bulkProgress, setBulkProgress] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const activeList = useMemo(
    () => (prospects ?? []).filter((p) => !p.archived),
    [prospects],
  );

  const enriched = useMemo(
    () => activeList.map((p) => ({
      ...p,
      inviteStatus: deriveProspectInviteStatus(p),
      displayPhone: p.mobile?.trim() || p.phone?.trim() || '',
    })),
    [activeList],
  );

  const canSend = (row) => canSendProspectInvite(row);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((p) => {
      if (statusFilter !== 'all' && p.inviteStatus !== statusFilter) return false;
      if (!q) return true;
      const name = `${p.first_name} ${p.last_name}`.toLowerCase();
      return name.includes(q) || (p.email || '').toLowerCase().includes(q) || p.displayPhone.includes(q);
    });
  }, [enriched, search, statusFilter]);

  const counts = useMemo(() => {
    const tally = { not_invited: 0, invited: 0, joined: 0, no_phone: 0 };
    enriched.forEach((p) => {
      if (tally[p.inviteStatus] != null) tally[p.inviteStatus] += 1;
    });
    return tally;
  }, [enriched]);

  const activeProspect = activeProspectId
    ? enriched.find((p) => p.id === activeProspectId) ?? null
    : null;

  const previewText = activeProspect
    ? renderChefInviteTemplate(template, activeProspect)
    : renderChefInviteTemplate(template, { first_name: 'Jane', last_name: 'Doe' });

  const messagingDisabled = !activeProspect || !canSend(activeProspect);
  const quoReady = quoStatus?.enabled && quoStatus?.configured;

  useEffect(() => {
    saveStoredInviteTemplate(template);
  }, [template]);

  const toggleSelect = (id, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(new Set(filtered.filter(canSend).map((p) => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const sendToProspect = async (prospect) => {
    if (!quoReady) {
      toast({ title: 'Quo not connected', description: 'Enable Quo under Admin → Integrations.', variant: 'destructive' });
      return;
    }
    if (!canSendProspectInvite(prospect)) return;
    const content = renderChefInviteTemplate(template, prospect);
    await sendQuo.mutateAsync({
      prospect_id: prospect.id,
      content,
      mark_intake_invite: true,
    });
    queryClient.invalidateQueries({ queryKey: ['chefInviteProspects'] });
  };

  const handleSendOne = async () => {
    if (!activeProspect || messagingDisabled) return;
    try {
      await sendToProspect(activeProspect);
      toast({ title: 'Invite sent', description: `${activeProspect.first_name} ${activeProspect.last_name}` });
    } catch (err) {
      toast({ title: 'Send failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleBulkSend = async () => {
    const targets = enriched.filter((p) => selectedIds.has(p.id) && canSend(p));
    if (!targets.length) {
      toast({ title: 'No prospects selected', description: 'Select prospects that are not joined and have a phone number.' });
      return;
    }
    if (!quoReady) {
      toast({ title: 'Quo not connected', variant: 'destructive' });
      return;
    }
    setBulkProgress({ done: 0, total: targets.length, failed: 0 });
    let failed = 0;
    for (let i = 0; i < targets.length; i += 1) {
      const prospect = targets[i];
      try {
        await sendToProspect(prospect);
      } catch {
        failed += 1;
      }
      setBulkProgress({ done: i + 1, total: targets.length, failed });
      if (i < targets.length - 1) await delay(350);
    }
    setBulkProgress(null);
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ['chefInviteProspects'] });
    toast({
      title: 'Bulk send finished',
      description: `${targets.length - failed} sent · ${failed} failed`,
      variant: failed ? 'destructive' : 'default',
    });
  };

  const handleCopy = () => {
    if (!activeProspect) return;
    navigator.clipboard.writeText(previewText);
    toast({ title: 'Message copied' });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-navy flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Invite by Message
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Mass SMS via Quo with intake link
            {' '}
            <code className="text-xs">{getIntakeLink()}</code>
          </p>
          {!quoReady && (
            <p className="text-sm text-amber-800 dark:text-amber-200 mt-2 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Connect and enable Quo in Admin → Integrations → Communications.
            </p>
          )}
        </div>
        <Button type="button" className="bg-navy hover:bg-navy/90 text-white" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add prospect
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground uppercase">Not invited</p>
          <p className="text-2xl font-semibold tabular-nums">{counts.not_invited}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground uppercase">Invited</p>
          <p className="text-2xl font-semibold tabular-nums">{counts.invited}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground uppercase">Joined</p>
          <p className="text-2xl font-semibold tabular-nums">{counts.joined}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground uppercase">No phone</p>
          <p className="text-2xl font-semibold tabular-nums">{counts.no_phone}</p>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Search prospects…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs h-9"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="sm"
          disabled={selectedIds.size === 0 || bulkProgress || sendQuo.isPending}
          onClick={handleBulkSend}
        >
          {bulkProgress ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {bulkProgress.done}/{bulkProgress.total}
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send to selected ({selectedIds.size})
            </>
          )}
        </Button>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={filtered.length > 0 && filtered.filter(canSend).every((p) => selectedIds.has(p.id))}
                    onCheckedChange={(v) => toggleSelectAll(!!v)}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last invited</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-10">
                    No prospects match this filter. Add a prospect to start sending intake SMS.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((prospect) => (
                <TableRow
                  key={prospect.id}
                  className={activeProspectId === prospect.id ? 'bg-muted/50' : ''}
                  onClick={() => setActiveProspectId(prospect.id)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      disabled={!canSend(prospect)}
                      checked={selectedIds.has(prospect.id)}
                      onCheckedChange={(v) => toggleSelect(prospect.id, !!v)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {prospect.first_name} {prospect.last_name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{prospect.displayPhone || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${statusBadgeClass(prospect.inviteStatus)}`}>
                      {inviteStatusLabel(prospect.inviteStatus)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {prospect.intake_invite_last_sent_at
                      ? format(new Date(prospect.intake_invite_last_sent_at), 'PP')
                      : '—'}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={!canSend(prospect)}
                      onClick={() => setActiveProspectId(prospect.id)}
                    >
                      Message
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card className="lg:col-span-2 p-4 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-navy">Message template</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Variables: {'{{first_name}}'}, {'{{last_name}}'}, {'{{intake_link}}'}
            </p>
          </div>
          <Textarea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            rows={8}
            className="text-sm font-mono"
            disabled={activeProspect?.inviteStatus === 'joined'}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTemplate(DEFAULT_CHEF_INTAKE_INVITE_TEMPLATE)}
          >
            Reset template
          </Button>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview</h3>
            <Card className="mt-2 p-3 bg-muted/40 text-sm whitespace-pre-wrap">{previewText}</Card>
            <p className="text-xs text-muted-foreground mt-1">
              ~{estimateSmsSegments(previewText)} SMS segment(s)
              {activeProspect && ` · ${activeProspect.first_name} ${activeProspect.last_name}`}
            </p>
          </div>

          {activeProspect?.inviteStatus === 'joined' ? (
            <p className="text-sm text-muted-foreground">
              Intake submitted or already on the roster — messaging is disabled.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="bg-navy hover:bg-navy/90 text-white"
                disabled={messagingDisabled || sendQuo.isPending || !quoReady}
                onClick={handleSendOne}
              >
                {sendQuo.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Send via Quo
              </Button>
              <Button type="button" variant="outline" disabled={!activeProspect} onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
          )}
        </Card>
      </div>

      <AddProspectDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        chefs={chefs.filter((c) => !c.archived)}
        prospects={activeList}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ['chefInviteProspects'] })}
      />
    </div>
  );
}