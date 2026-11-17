import React, { useCallback, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import EventJobPageActions from '@/components/events/EventJobPageActions';
import EventChefMatchPanel from '@/components/match/EventChefMatchPanel';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { fetchConfirmedEventsJobHub, upcomingConfirmedDateFilter } from '@/hooks/useEventJobPage';
import {
  CONFIRMED_EVENTS_JOB_HUB_KEY,
  JOB_HUB_FILTERS,
  JOB_PAGE_STATUS_STYLES,
  invokeEventJob,
  matchesJobHubFilter,
} from '@/lib/eventJobPage';
import { useAuth } from '@/lib/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { Briefcase, Loader2, RefreshCw, Search, Sparkles, UserSearch } from 'lucide-react';

const BULK_CONCURRENCY = 3;

function formatEventDate(value) {
  if (!value) return '—';
  try {
    const d = parseISO(String(value).slice(0, 10));
    return format(d, 'MMM d, yyyy');
  } catch {
    return String(value);
  }
}

function jobStatusLabel(jobPage) {
  if (!jobPage) return '—';
  if (jobPage.status === 'published') return 'Live';
  if (jobPage.status === 'draft' && jobPage.generation_error) return 'Failed';
  if (jobPage.status === 'draft') return 'Draft';
  return jobPage.status;
}

async function runBatched(items, worker, concurrency) {
  let ok = 0;
  let failed = 0;
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const results = await Promise.allSettled(chunk.map(worker));
    for (const r of results) {
      if (r.status === 'fulfilled') ok += 1;
      else failed += 1;
    }
  }
  return { ok, failed };
}

export default function JobPages() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('events', 'write');
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [hubFilter, setHubFilter] = useState('all');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [matchEvent, setMatchEvent] = useState(null);

  const hubQueryKey = useMemo(
    () => [...CONFIRMED_EVENTS_JOB_HUB_KEY, upcomingConfirmedDateFilter()],
    [],
  );

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: hubQueryKey,
    queryFn: fetchConfirmedEventsJobHub,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (!matchesJobHubFilter(row.jobPage, hubFilter)) return false;
      if (!q) return true;
      const title = String(row.jobPage?.ai_content?.title || '').toLowerCase();
      const client = String(row.client_name || '').toLowerCase();
      const area = String(row.service_area || '').toLowerCase();
      const exp = String(row.experience_type || '').toLowerCase();
      const type = String(row.event_type || '').toLowerCase();
      const jobId = String(row.jobPage?.id || '').toLowerCase();
      return (
        title.includes(q)
        || client.includes(q)
        || area.includes(q)
        || exp.includes(q)
        || type.includes(q)
        || jobId.includes(q)
      );
    });
  }, [rows, search, hubFilter]);

  const missingInView = useMemo(
    () => filtered.filter((row) => !row.jobPage),
    [filtered],
  );

  const runBulkGenerate = useCallback(async () => {
    if (!canWrite || missingInView.length === 0) return;
    setBulkBusy(true);
    try {
      const { ok, failed } = await runBatched(
        missingInView,
        (row) => invokeEventJob({ action: 'generate', event_id: row.id }),
        BULK_CONCURRENCY,
      );
      await queryClient.invalidateQueries({ queryKey: CONFIRMED_EVENTS_JOB_HUB_KEY });
      toast({
        title: 'Bulk generation finished',
        description: `${ok} succeeded, ${failed} failed (${missingInView.length} targeted).`,
        variant: failed > 0 ? 'destructive' : undefined,
      });
    } catch (err) {
      toast({
        title: 'Bulk generation failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBulkBusy(false);
    }
  }, [canWrite, missingInView, queryClient]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-semibold text-navy flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Job pages
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Upcoming and undated Confirmed events only—past dates are hidden. Public chef recruitment links
          (chef-safe, AI copy) at /job/&#123;id&#125;.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Existing Confirmed events are not auto-generated retroactively—use Generate all missing or confirm again.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search client, area, type, title, or job id…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={hubFilter} onValueChange={setHubFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            {JOB_HUB_FILTERS.map((f) => (
              <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="default"
          size="sm"
          disabled={!canWrite || bulkBusy || missingInView.length === 0}
          onClick={runBulkGenerate}
        >
          {bulkBusy ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Generate all missing (AI)
          {missingInView.length > 0 ? ` (${missingInView.length})` : ''}
        </Button>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading || bulkBusy}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Experience</TableHead>
              <TableHead>Public title</TableHead>
              <TableHead>Job</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  No upcoming Confirmed events match this filter.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((row) => {
              const jobPage = row.jobPage;
              const title = jobPage?.ai_content?.title || '—';
              const statusKey = jobPage?.status;
              return (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-sm">{formatEventDate(row.date)}</TableCell>
                  <TableCell className="text-sm font-medium max-w-[160px]">
                    <span className="truncate block" title={row.client_name || ''}>
                      {row.client_name || '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{row.service_area || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.event_type || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.experience_type || '—'}</TableCell>
                  <TableCell className="max-w-[200px]">
                    <div className="truncate text-sm font-medium" title={title}>{title}</div>
                    {jobPage?.generation_error && (
                      <p className="text-xs text-amber-700 mt-1 truncate" title={jobPage.generation_error}>
                        {jobPage.generation_error}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {statusKey ? (
                      <Badge variant="outline" className={`text-xs border ${JOB_PAGE_STATUS_STYLES[statusKey] || ''}`}>
                        {jobStatusLabel(jobPage)}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Missing</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-0.5 flex-wrap">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        title="Match chefs"
                        onClick={() => setMatchEvent(row)}
                      >
                        <UserSearch className="h-4 w-4" />
                      </Button>
                      <EventJobPageActions
                        eventId={row.id}
                        jobPage={jobPage}
                        variant="inline"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {!isLoading && filtered.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {filtered.length.toLocaleString()}
          {' '}
          upcoming or undated Confirmed event
          {filtered.length === 1 ? '' : 's'}
          {hubFilter !== 'all' || search.trim() ? ' matching filters' : ''}
        </p>
      )}

      <Sheet open={Boolean(matchEvent)} onOpenChange={(open) => !open && setMatchEvent(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              Match chefs
              {matchEvent?.client_name ? ` — ${matchEvent.client_name}` : ''}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {matchEvent && (
              <EventChefMatchPanel
                key={matchEvent.id}
                event={matchEvent}
                jobSnapshot={matchEvent.jobPage?.source_snapshot}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}