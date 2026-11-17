import React, { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/AuthContext';
import { useEventMatchRun } from '@/hooks/useEventMatchRun';
import { matchCriteriaFromEvent } from '@/lib/matchCriteriaFromEvent';
import CriteriaChips from '@/components/match/CriteriaChips';
import MatchResultCard from '@/components/match/MatchResultCard';
import ChefDetailPanel from '@/components/chefs/ChefDetailPanel';
import { getChefKPIs } from '@/hooks/useAppData';
import { rankSousChefs } from '@/lib/chefMatchScore';
import { toast } from '@/components/ui/use-toast';
import { useJobChefInvitations } from '@/hooks/useJobChefInvitations';
import { chefCanReceiveJobEmail, chefCanReceiveJobSms } from '@/lib/jobInviteMessage';
import { Loader2, Send, Sparkles } from 'lucide-react';

function formatEventDate(value) {
  if (!value) return '—';
  try {
    return format(parseISO(String(value).slice(0, 10)), 'MMM d, yyyy');
  } catch {
    return String(value);
  }
}

export default function EventChefMatchPanel({
  event,
  jobPage = null,
  jobSnapshot = null,
  compact = false,
  className = '',
}) {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('chefs', 'write');
  const eventId = event?.id;

  const {
    latestRun,
    isLoadingRun,
    runEventMatch,
    hydrateFromRun,
    chefs,
    events,
    eventChefs,
    clients,
    invalidate,
  } = useEventMatchRun(eventId, { enabled: Boolean(eventId) });

  const [busy, setBusy] = useState(false);
  const [criteria, setCriteria] = useState(null);
  const [results, setResults] = useState(null);
  const [sousCandidates, setSousCandidates] = useState([]);
  const [selectedHeadId, setSelectedHeadId] = useState(null);
  const [selectedSousId, setSelectedSousId] = useState(null);
  const [viewChef, setViewChef] = useState(null);
  const [inviteBusyChefId, setInviteBusyChefId] = useState(null);
  const [inviteAllBusy, setInviteAllBusy] = useState(false);

  const jobPageId = jobPage?.id;
  const jobPublished = jobPage?.status === 'published';
  const {
    invitationByChefId,
    sendInvites,
  } = useJobChefInvitations(jobPageId, { enabled: Boolean(jobPageId) });

  const displayCriteria = useMemo(() => {
    if (criteria) return criteria;
    if (!event) return null;
    const chefsForEvent = eventChefs.filter((ec) => ec.event_id === event.id);
    return matchCriteriaFromEvent(event, { jobSnapshot, eventChefsForEvent: chefsForEvent });
  }, [criteria, event, eventChefs, jobSnapshot]);

  useEffect(() => {
    setCriteria(null);
    setResults(null);
    setSousCandidates([]);
    setSelectedHeadId(null);
    setSelectedSousId(null);
  }, [eventId]);

  useEffect(() => {
    if (!latestRun || results) return;
    const hydrated = hydrateFromRun(latestRun);
    if (!hydrated) return;
    setCriteria(hydrated.criteria);
    setResults(hydrated.results);
    setSelectedHeadId(hydrated.results[0]?.chef.id || null);
    const needsSous = (hydrated.criteria.guest_count || 0) >= 15;
    if (needsSous) {
      const ctx = { events, eventChefs, clients };
      setSousCandidates(rankSousChefs(chefs, hydrated.criteria, ctx, { limit: 3 }));
    }
  }, [latestRun, hydrateFromRun, chefs, events, eventChefs, clients, results]);

  const chefKPIs = useMemo(() => {
    const map = {};
    chefs.forEach((c) => { map[c.id] = getChefKPIs(c, events, eventChefs); });
    return map;
  }, [chefs, events, eventChefs]);

  const needsSousSection = (displayCriteria?.guest_count || 0) >= 15 && sousCandidates.length > 0;

  const allMatchChefs = useMemo(() => {
    const ids = new Set();
    const list = [];
    for (const r of results ?? []) {
      if (!ids.has(r.chef.id)) {
        ids.add(r.chef.id);
        list.push(r.chef);
      }
    }
    for (const r of sousCandidates ?? []) {
      if (!ids.has(r.chef.id)) {
        ids.add(r.chef.id);
        list.push(r.chef);
      }
    }
    return list;
  }, [results, sousCandidates]);

  const inviteableChefIds = useMemo(
    () => allMatchChefs
      .filter((c) => chefCanReceiveJobSms(c) || chefCanReceiveJobEmail(c))
      .map((c) => c.id),
    [allMatchChefs],
  );

  const sendChefInvite = async (chef, channels) => {
    if (!canWrite || !jobPublished || !jobPageId || !eventId) {
      toast({
        title: 'Cannot send invite',
        description: jobPublished ? 'You need write access.' : 'Publish the job page first.',
        variant: 'destructive',
      });
      return;
    }
    setInviteBusyChefId(chef.id);
    try {
      await sendInvites({ eventId, chefIds: [chef.id], channels });
      toast({
        title: 'Invitation sent',
        description: `${chef.first_name} ${chef.last_name}`,
      });
    } catch (err) {
      toast({
        title: 'Invite failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setInviteBusyChefId(null);
    }
  };

  const onInviteAllShown = async () => {
    if (!inviteableChefIds.length) {
      toast({ title: 'No chefs to invite', description: 'No phone or email on shown chefs.' });
      return;
    }
    if (!jobPublished) {
      toast({ title: 'Publish job page first', variant: 'destructive' });
      return;
    }
    setInviteAllBusy(true);
    try {
      await sendInvites({
        eventId,
        chefIds: inviteableChefIds,
        channels: ['sms', 'email'],
      });
      toast({
        title: 'Invitations sent',
        description: `${inviteableChefIds.length} chefs`,
      });
    } catch (err) {
      toast({
        title: 'Bulk invite failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setInviteAllBusy(false);
    }
  };

  const onRunMatch = async () => {
    if (!canWrite || !event) return;
    setBusy(true);
    try {
      const out = await runEventMatch(event, { jobSnapshot, polish: true });
      setCriteria(out.criteria);
      setResults(out.finalResults);
      setSousCandidates(out.sousList);
      setSelectedHeadId(out.finalResults[0]?.chef.id || null);
      setSelectedSousId(null);
      toast({ title: 'Match complete', description: `${out.finalResults.length} head chefs ranked.` });
    } catch (err) {
      toast({
        title: 'Match failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  if (!event) return null;

  const lastRunLabel = latestRun?.created_at
    ? format(new Date(latestRun.created_at), 'MMM d, yyyy h:mm a')
    : null;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-heading font-semibold text-sm">Chef shortlist</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {event.client_name || 'Event'}
            {' · '}
            {formatEventDate(event.date)}
            {event.service_area ? ` · ${event.service_area}` : ''}
          </p>
          {lastRunLabel && (
            <p className="text-xs text-muted-foreground mt-1">
              Last run:
              {' '}
              {lastRunLabel}
              {latestRun?.suggested_chefs?.length
                ? ` · ${latestRun.suggested_chefs.length} chefs`
                : ''}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {results?.length > 0 && canWrite && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={inviteAllBusy || !jobPublished || inviteableChefIds.length === 0}
              onClick={onInviteAllShown}
              title={!jobPublished ? 'Publish the public job page to send invites' : undefined}
            >
              {inviteAllBusy ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              Invite all shown
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            disabled={!canWrite || busy}
            onClick={onRunMatch}
            className="bg-navy hover:bg-navy/90 text-white"
          >
            {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            Run match
          </Button>
        </div>
      </div>

      {canWrite && results?.length > 0 && !jobPublished && (
        <p className="text-xs text-amber-700">Publish the public job page before sending job invitations.</p>
      )}

      {displayCriteria && (
        <Card className={compact ? 'p-3' : 'p-4'}>
          <p className="text-xs text-muted-foreground mb-2">Match criteria</p>
          <CriteriaChips criteria={displayCriteria} onRemove={() => {}} />
        </Card>
      )}

      {isLoadingRun && !results && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading last match…
        </div>
      )}

      {!results && !isLoadingRun && !busy && (
        <p className="text-sm text-muted-foreground">No match yet. Run match to rank roster chefs.</p>
      )}

      {results && results.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Head chef</p>
          <div className="space-y-3">
            {results.map((result, i) => (
              <MatchResultCard
                key={result.chef.id}
                result={{ ...result, needsSous: false }}
                rank={i + 1}
                selected={selectedHeadId === result.chef.id}
                selectedLabel="Selected as Head"
                onSelect={() => {
                  setSelectedHeadId(result.chef.id);
                  if (selectedSousId === result.chef.id) setSelectedSousId(null);
                }}
                onViewChef={(chef) => setViewChef(chef)}
                invitation={invitationByChefId[result.chef.id]}
                inviteBusy={inviteBusyChefId === result.chef.id}
                onSendSms={
                  canWrite && chefCanReceiveJobSms(result.chef)
                    ? (chef) => sendChefInvite(chef, ['sms'])
                    : undefined
                }
                onSendEmail={
                  canWrite && chefCanReceiveJobEmail(result.chef)
                    ? (chef) => sendChefInvite(chef, ['email'])
                    : undefined
                }
              />
            ))}
          </div>
        </section>
      )}

      {needsSousSection && (
        <section className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sous chef</p>
          <div className="space-y-3">
            {sousCandidates.map((result, i) => (
              <MatchResultCard
                key={result.chef.id}
                result={{ ...result, needsSous: false }}
                rank={i + 1}
                selected={selectedSousId === result.chef.id}
                selectedLabel="Selected as Sous"
                onSelect={() => {
                  if (selectedSousId === result.chef.id) setSelectedSousId(null);
                  else {
                    setSelectedSousId(result.chef.id);
                    if (selectedHeadId === result.chef.id) setSelectedHeadId(null);
                  }
                }}
                onViewChef={(chef) => setViewChef(chef)}
                invitation={invitationByChefId[result.chef.id]}
                inviteBusy={inviteBusyChefId === result.chef.id}
                onSendSms={
                  canWrite && chefCanReceiveJobSms(result.chef)
                    ? (chef) => sendChefInvite(chef, ['sms'])
                    : undefined
                }
                onSendEmail={
                  canWrite && chefCanReceiveJobEmail(result.chef)
                    ? (chef) => sendChefInvite(chef, ['email'])
                    : undefined
                }
              />
            ))}
          </div>
        </section>
      )}

      {latestRun?.match_source === 'event' && (
        <Badge variant="outline" className="text-xs">Saved for this event</Badge>
      )}

      <ChefDetailPanel
        chef={viewChef}
        kpis={viewChef ? chefKPIs[viewChef.id] : null}
        events={events}
        eventChefs={eventChefs}
        clients={clients}
        open={!!viewChef}
        onClose={() => setViewChef(null)}
        onCreateEvent={() => setViewChef(null)}
      />
    </div>
  );
}