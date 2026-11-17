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
import { Loader2, Sparkles } from 'lucide-react';

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
        <Button
          type="button"
          size="sm"
          disabled={!canWrite || busy}
          onClick={onRunMatch}
          className="bg-navy hover:bg-navy/90 text-white shrink-0"
        >
          {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
          Run match
        </Button>
      </div>

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