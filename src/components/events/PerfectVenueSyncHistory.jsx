import React from 'react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { usePerfectVenueIntegration, usePerfectVenueSyncRuns } from '@/hooks/usePerfectVenueIntegration';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const STALE_RUNNING_MS = 3 * 60 * 1000;

function isStaleRunningRun(run) {
  if (run.status !== 'running') return false;
  const ref = run.heartbeat_at || run.started_at;
  if (!ref) return false;
  return Date.now() - new Date(ref).getTime() > STALE_RUNNING_MS;
}

function SyncInProgressBanner({ progress }) {
  if (!progress) return null;
  const venueNum = Math.min(progress.venue_index + 1, progress.total_venues || 1);
  const total = progress.total_venues || 0;
  return (
    <Card className="p-4 border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/30">
      <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
        Sync in progress
        {' '}
        <span className="font-normal text-amber-900/90 dark:text-amber-200/90">
          (
          {progress.mode}
          )
          :
          {' '}
          venue
          {' '}
          {venueNum}
          /
          {total}
          ,
          {' '}
          {progress.events_fetched ?? 0}
          {' '}
          fetched,
          {' '}
          {progress.inserted ?? 0}
          {' '}
          in,
          {' '}
          {progress.updated ?? 0}
          {' '}
          updated
        </span>
      </p>
      <p className="text-xs text-amber-900/70 dark:text-amber-300/80 mt-1">
        Background ticks run about every minute until this job finishes.
      </p>
    </Card>
  );
}

export default function PerfectVenueSyncHistory() {
  const { data: status } = usePerfectVenueIntegration({ enabled: true, pollWhileSyncing: true });
  const { data, isLoading, isError, error } = usePerfectVenueSyncRuns(true, {
    refetchInterval: (query) => {
      const runs = query.state.data?.runs ?? [];
      const hasRunning = runs.some((r) => r.status === 'running');
      return hasRunning ? 5000 : false;
    },
  });
  const runs = data?.runs ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-destructive py-8">{error.message}</p>;
  }

  if (!runs.length) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        No Perfect Venue sync runs yet. Connect in Admin → Integrations → Perfect Venue, then use
        {' '}
        <strong className="font-medium text-foreground">Sync Perfect Venue</strong>
        {' '}
        on this page or sync from the integration settings.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <SyncInProgressBanner progress={status?.sync_in_progress ? status.checkpoint_progress : null} />
      <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Started</TableHead>
            <TableHead>Finished</TableHead>
            <TableHead>Trigger</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">In</TableHead>
            <TableHead className="text-right">Up</TableHead>
            <TableHead>Error</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => {
            const stale = isStaleRunningRun(run);
            return (
            <TableRow key={run.id}>
              <TableCell className="text-xs whitespace-nowrap">
                {run.started_at ? format(new Date(run.started_at), 'PPp') : '—'}
              </TableCell>
              <TableCell className="text-xs whitespace-nowrap">
                {run.finished_at ? format(new Date(run.finished_at), 'PPp') : '—'}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs capitalize">{run.sync_trigger}</Badge>
              </TableCell>
              <TableCell className="text-xs capitalize">{run.mode}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    run.status === 'success'
                      ? 'border-emerald-300 text-emerald-800'
                      : run.status === 'failed'
                        ? 'border-red-300 text-red-800'
                        : stale
                          ? 'border-amber-300 text-amber-900'
                          : ''
                  }`}
                >
                  {stale ? 'running (stale)' : run.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">{run.inserted ?? 0}</TableCell>
              <TableCell className="text-right tabular-nums">{run.updated ?? 0}</TableCell>
              <TableCell className="text-xs text-destructive max-w-[200px] truncate" title={run.error_message || ''}>
                {run.error_message || '—'}
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
    </div>
  );
}
