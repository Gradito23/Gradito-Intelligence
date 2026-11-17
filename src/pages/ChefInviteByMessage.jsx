import React, { useMemo, useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useChefs, useChefInviteProspects } from '@/hooks/useAppData';
import { useQuoIntegrationStatus, useSendQuoMessage } from '@/hooks/useQuoIntegration';
import {
  useEmailIntegrationStatus,
  useSendIntakeInviteEmail,
} from '@/hooks/useEmailIntegration';
import { findChefByIdentity, findProspectByIdentity } from '@/lib/chefDedupe';
import ProspectInviteSidePanel from '@/components/invite/ProspectInviteSidePanel';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  canSelectProspectForInvite,
  canSendProspectEmail,
  canSendProspectSms,
  deriveProspectInviteStatus,
  DEFAULT_CHEF_INTAKE_INVITE_EMAIL_BODY,
  DEFAULT_CHEF_INTAKE_INVITE_EMAIL_SUBJECT,
  DEFAULT_CHEF_INTAKE_INVITE_TEMPLATE,
  getIntakeLink,
  inviteStatusLabel,
  renderChefInviteEmailHtml,
  renderChefInviteEmailSubject,
  renderChefInviteTemplate,
} from '@/lib/chefInviteMessage';
import {
  useChefInviteMessageSettings,
  useSaveChefInviteMessageSettings,
} from '@/hooks/useChefInviteMessageSettings';
import { MessageSquare, Loader2, Send, Mail, AlertCircle, Plus } from 'lucide-react';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'not_invited', label: 'Not invited' },
  { value: 'invited', label: 'Invited' },
  { value: 'joined', label: 'Joined' },
  { value: 'no_phone', label: 'No phone' },
  { value: 'no_email', label: 'No email' },
];

function statusBadgeClass(status) {
  switch (status) {
    case 'joined':
      return 'border-emerald-300 text-emerald-800 bg-emerald-50';
    case 'invited':
      return 'border-amber-300 text-amber-900 bg-amber-50';
    case 'no_phone':
    case 'no_email':
      return 'border-border text-muted-foreground';
    default:
      return 'border-sky-300 text-sky-900 bg-sky-50';
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function AddProspectDialog({ open, onClose, chefs, prospects, onCreated }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', mobile: '', city: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.first_name?.trim() || !form.last_name?.trim()) return;
    const identity = { email: form.email, mobile: form.mobile };
    if (findChefByIdentity(chefs, identity)) {
      toast({
        title: 'Already on roster',
        description: 'This email or phone matches a live chef.',
        variant: 'destructive',
      });
      return;
    }
    if (findProspectByIdentity(prospects, identity)) {
      toast({ title: 'Prospect exists', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await base44.entities.ChefInviteProspect.create({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email?.trim() || undefined,
        mobile: form.mobile?.trim() || undefined,
        city: form.city?.trim() || undefined,
        status: 'not_invited',
        gradito_messaging_opt_in: true,
      });
      toast({ title: 'Prospect added' });
      setForm({ first_name: '', last_name: '', email: '', mobile: '', city: '' });
      onCreated();
      onClose();
    } catch (err) {
      toast({ title: 'Could not add prospect', description: err.message, variant: 'destructive' });
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
            <Label htmlFor="prospect-mobile">Mobile (SMS)</Label>
            <Input id="prospect-mobile" value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="prospect-city">City</Label>
            <Input id="prospect-city" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="e.g. Miami" />
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
  const { data: emailStatus } = useEmailIntegrationStatus();
  const sendQuo = useSendQuoMessage();
  const sendEmail = useSendIntakeInviteEmail();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('not_invited');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [activeProspectId, setActiveProspectId] = useState(null);
  const [smsTemplate, setSmsTemplate] = useState(DEFAULT_CHEF_INTAKE_INVITE_TEMPLATE);
  const [emailSubject, setEmailSubject] = useState(DEFAULT_CHEF_INTAKE_INVITE_EMAIL_SUBJECT);
  const [emailBody, setEmailBody] = useState(DEFAULT_CHEF_INTAKE_INVITE_EMAIL_BODY);
  const [bulkProgress, setBulkProgress] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const templatesHydratedRef = useRef(false);
  const lastPersistedTemplatesRef = useRef(null);

  const {
    data: inviteSettings,
    isLoading: inviteSettingsLoading,
    isError: inviteSettingsError,
  } = useChefInviteMessageSettings();
  const saveInviteSettings = useSaveChefInviteMessageSettings();

  const quoReady = quoStatus?.enabled && quoStatus?.configured;
  const emailReady = emailStatus?.enabled && emailStatus?.configured;

  useEffect(() => {
    if (inviteSettingsLoading || templatesHydratedRef.current) return;
    const sms = inviteSettings?.sms_template ?? DEFAULT_CHEF_INTAKE_INVITE_TEMPLATE;
    const subject = inviteSettings?.email_subject ?? DEFAULT_CHEF_INTAKE_INVITE_EMAIL_SUBJECT;
    const body = inviteSettings?.email_body ?? DEFAULT_CHEF_INTAKE_INVITE_EMAIL_BODY;
    setSmsTemplate(sms);
    setEmailSubject(subject);
    setEmailBody(body);
    lastPersistedTemplatesRef.current = JSON.stringify({
      sms_template: sms,
      email_subject: subject,
      email_body: body,
    });
    templatesHydratedRef.current = true;
  }, [inviteSettings, inviteSettingsLoading]);

  useEffect(() => {
    if (!templatesHydratedRef.current) return;
    const payload = {
      sms_template: smsTemplate,
      email_subject: emailSubject,
      email_body: emailBody,
    };
    const snapshot = JSON.stringify(payload);
    const timeout = setTimeout(() => {
      if (snapshot === lastPersistedTemplatesRef.current) return;
      saveInviteSettings.mutate(payload, {
        onSuccess: () => {
          lastPersistedTemplatesRef.current = snapshot;
        },
        onError: (err) => {
          toast({
            title: 'Could not save invite templates',
            description: err.message || 'Check that you have admin access.',
            variant: 'destructive',
          });
        },
      });
    }, 800);
    return () => clearTimeout(timeout);
  }, [smsTemplate, emailSubject, emailBody, saveInviteSettings]);

  const activeList = useMemo(
    () => (prospects ?? []).filter((p) => !p.archived),
    [prospects],
  );

  const enriched = useMemo(
    () => activeList.map((p) => ({
      ...p,
      inviteStatus: deriveProspectInviteStatus(p),
      displayPhone: p.mobile?.trim() || p.phone?.trim() || '',
      displayEmail: p.email?.trim() || '',
      displayCity: p.city?.trim() || '',
    })),
    [activeList],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((p) => {
      if (statusFilter !== 'all' && p.inviteStatus !== statusFilter) return false;
      if (!q) return true;
      const name = `${p.first_name} ${p.last_name}`.toLowerCase();
      return name.includes(q) || p.displayEmail.toLowerCase().includes(q) || p.displayPhone.includes(q);
    });
  }, [enriched, search, statusFilter]);

  const counts = useMemo(() => {
    const tally = { not_invited: 0, invited: 0, joined: 0, no_phone: 0, no_email: 0 };
    enriched.forEach((p) => {
      if (tally[p.inviteStatus] != null) tally[p.inviteStatus] += 1;
    });
    return tally;
  }, [enriched]);

  const activeProspect = activeProspectId
    ? enriched.find((p) => p.id === activeProspectId) ?? null
    : null;

  const canSelect = (p) => canSelectProspectForInvite(p);

  const toggleSelect = (id, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectAll = (checked) => {
    setSelectedIds(checked ? new Set(filtered.filter(canSelect).map((p) => p.id)) : new Set());
  };

  const sendSmsToProspect = async (prospect) => {
    if (!quoReady || !canSendProspectSms(prospect)) return;
    const content = renderChefInviteTemplate(smsTemplate, prospect);
    await sendQuo.mutateAsync({
      prospect_id: prospect.id,
      content,
      mark_intake_invite: true,
    });
    queryClient.invalidateQueries({ queryKey: ['chefInviteProspects'] });
    queryClient.invalidateQueries({ queryKey: ['quo-communication-events', 'prospect', prospect.id] });
  };

  const sendEmailToProspect = async (prospect) => {
    if (!emailReady || !canSendProspectEmail(prospect)) return;
    const subject = renderChefInviteEmailSubject(emailSubject, prospect);
    const html = renderChefInviteEmailHtml(emailBody, prospect);
    await sendEmail.mutateAsync({
      prospect_id: prospect.id,
      subject,
      html,
      mark_intake_invite: true,
    });
    queryClient.invalidateQueries({ queryKey: ['quo-communication-events', 'prospect', prospect.id] });
  };

  const runBulk = async (channel) => {
    const isSms = channel === 'sms';
    const targets = enriched.filter((p) => {
      if (!selectedIds.has(p.id)) return false;
      return isSms ? canSendProspectSms(p) : canSendProspectEmail(p);
    });
    if (!targets.length) {
      toast({
        title: 'No eligible prospects',
        description: isSms ? 'Selected rows need a phone number.' : 'Selected rows need an email.',
        variant: 'destructive',
      });
      return;
    }
    if (isSms && !quoReady) {
      toast({ title: 'Quo not connected', variant: 'destructive' });
      return;
    }
    if (!isSms && !emailReady) {
      toast({ title: 'Email not configured', variant: 'destructive' });
      return;
    }
    setBulkProgress({ done: 0, total: targets.length, failed: 0, channel });
    let failed = 0;
    for (let i = 0; i < targets.length; i += 1) {
      try {
        if (isSms) await sendSmsToProspect(targets[i]);
        else await sendEmailToProspect(targets[i]);
      } catch {
        failed += 1;
      }
      setBulkProgress({ done: i + 1, total: targets.length, failed, channel });
      if (i < targets.length - 1) await delay(350);
    }
    setBulkProgress(null);
    setSelectedIds(new Set());
    toast({
      title: `Bulk ${isSms ? 'SMS' : 'email'} finished`,
      description: `${targets.length - failed} sent · ${failed} failed`,
      variant: failed ? 'destructive' : 'default',
    });
  };

  if (isLoading || inviteSettingsLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (inviteSettingsError) {
    return (
      <Card className="p-6 border-amber-200 bg-amber-50/80">
        <p className="text-sm text-amber-950">
          Could not load invite templates from the database. Apply migration
          {' '}
          <code className="text-xs">20261117400000_chef_invite_message_settings.sql</code>
          {' '}
          and refresh.
        </p>
      </Card>
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
            SMS (Quo) and email (Admin → Integrations) with intake link
            {' '}
            <code className="text-xs">{getIntakeLink()}</code>
            . Templates are saved to Supabase (shared for all users).
          </p>
          {saveInviteSettings.isPending && (
            <p className="text-xs text-muted-foreground mt-1">Saving templates…</p>
          )}
          <div className="flex flex-col gap-1 mt-2">
            {!quoReady && (
              <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Connect Quo under Admin → Integrations → Communications.
              </p>
            )}
            {!emailReady && (
              <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Enable email (Resend or Custom SMTP / SendGrid) under Admin → Integrations → Email.
              </p>
            )}
          </div>
        </div>
        <Button type="button" className="bg-navy hover:bg-navy/90 text-white" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add prospect
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {['not_invited', 'invited', 'joined', 'no_phone', 'no_email'].map((key) => (
          <Card key={key} className="p-3 text-center">
            <p className="text-xs text-muted-foreground uppercase">{inviteStatusLabel(key)}</p>
            <p className="text-2xl font-semibold tabular-nums">{counts[key] ?? 0}</p>
          </Card>
        ))}
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
          variant="outline"
          disabled={selectedIds.size === 0 || bulkProgress || sendQuo.isPending}
          onClick={() => runBulk('sms')}
        >
          {bulkProgress?.channel === 'sms' ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{bulkProgress.done}/{bulkProgress.total}</>
          ) : (
            <><Send className="h-4 w-4 mr-2" />SMS ({selectedIds.size})</>
          )}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={selectedIds.size === 0 || bulkProgress || sendEmail.isPending}
          onClick={() => runBulk('email')}
        >
          {bulkProgress?.channel === 'email' ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{bulkProgress.done}/{bulkProgress.total}</>
          ) : (
            <><Mail className="h-4 w-4 mr-2" />Email ({selectedIds.size})</>
          )}
        </Button>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={filtered.length > 0 && filtered.filter(canSelect).every((p) => selectedIds.has(p.id))}
                    onCheckedChange={(v) => toggleSelectAll(!!v)}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last SMS</TableHead>
                <TableHead>Last email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">
                    No prospects match. Add a prospect to send SMS or email invites.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((prospect) => (
                <TableRow
                  key={prospect.id}
                  className={`cursor-pointer ${activeProspectId === prospect.id ? 'bg-muted/50' : ''}`}
                  onClick={() => setActiveProspectId(prospect.id)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      disabled={!canSelect(prospect)}
                      checked={selectedIds.has(prospect.id)}
                      onCheckedChange={(v) => toggleSelect(prospect.id, !!v)}
                    />
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">
                    {prospect.first_name} {prospect.last_name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{prospect.displayPhone || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{prospect.displayCity || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">{prospect.displayEmail || '—'}</TableCell>
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
                  <TableCell className="text-xs whitespace-nowrap">
                    {prospect.intake_invite_email_last_sent_at
                      ? format(new Date(prospect.intake_invite_email_last_sent_at), 'PP')
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <ProspectInviteSidePanel
          prospect={activeProspect}
          smsTemplate={smsTemplate}
          onSmsTemplateChange={setSmsTemplate}
          emailSubject={emailSubject}
          onEmailSubjectChange={setEmailSubject}
          emailBody={emailBody}
          onEmailBodyChange={setEmailBody}
          quoReady={quoReady}
          emailReady={emailReady}
          canSms={activeProspect ? canSendProspectSms(activeProspect) : false}
          canEmail={activeProspect ? canSendProspectEmail(activeProspect) : false}
          onSendSms={async () => {
            if (!activeProspect) return;
            try {
              await sendSmsToProspect(activeProspect);
              toast({ title: 'SMS sent' });
            } catch (err) {
              toast({ title: 'Send failed', description: err.message, variant: 'destructive' });
            }
          }}
          onSendEmail={async () => {
            if (!activeProspect) return;
            try {
              await sendEmailToProspect(activeProspect);
              toast({ title: 'Email sent' });
            } catch (err) {
              toast({ title: 'Send failed', description: err.message, variant: 'destructive' });
            }
          }}
          smsSending={sendQuo.isPending}
          emailSending={sendEmail.isPending}
        />
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