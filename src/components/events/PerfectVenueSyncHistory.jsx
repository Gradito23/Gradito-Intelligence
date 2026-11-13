import React from 'react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { usePerfectVenueSyncRuns } from '@/hooks/usePerfectVenueIntegration';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export default function PerfectVenueSyncHistory() {
  const { data, isLoading, isError, error } = usePerfectVenueSyncRuns(true);
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
          {runs.map((run) => (
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
                        : ''
                  }`}
                >
                  {run.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">{run.inserted ?? 0}</TableCell>
              <TableCell className="text-right tabular-nums">{run.updated ?? 0}</TableCell>
              <TableCell className="text-xs text-destructive max-w-[200px] truncate" title={run.error_message || ''}>
                {run.error_message || '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
