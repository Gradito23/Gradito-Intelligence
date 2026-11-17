import React, { useCallback, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import { Briefcase, Copy, Loader2, RefreshCw, Search, Unlink } from 'lucide-react';

const STATUS_STYLES = {
  published: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  draft: 'bg-amber-100 text-amber-800 border-amber-200',
  unpublished: 'bg-slate-100 text-slate-700 border-slate-200',
};

function publicJobUrl(id) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/job/${id}`;
}

function formatDate(value) {
  if (!value) return '—';
  try {
    const d = parseISO(String(value).slice(0, 10));
    return format(d, 'MMM d, yyyy');
  } catch {
    return String(value);
  }
}

async function fetchJobPages() {
  const { data, error } = await supabase
    .from('event_job_pages')
    .select(`
      id,
      event_id,
      status,
      generation_error,
      published_at,
      created_at,
      updated_at,
      ai_content,
      source_snapshot,
      events (
        date,
        service_area,
        experience_type,
        status
      )
    `)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function invokeEventJob(body) {
  const { data, error } = await supabase.functions.invoke('event-job', { body });
  if (error) {
    let message = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const payload = await error.context.json();
        if (payload?.error) message = payload.error;
      } catch {
        /* ignore */
      }
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export default function JobPages() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ['admin', 'event_job_pages'],
    queryFn: fetchJobPages,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const title = String(row.ai_content?.title || '').toLowerCase();
      const area = String(row.source_snapshot?.service_area || row.events?.service_area || '').toLowerCase();
      const id = String(row.id).toLowerCase();
      return title.includes(q) || area.includes(q) || id.includes(q);
    });
  }, [rows, search]);

  const copyLink = useCallback(async (id) => {
    const url = publicJobUrl(id);
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied', description: url });
    } catch {
      toast({ title: 'Copy failed', description: url, variant: 'destructive' });
    }
  }, []);

  const runAction = useCallback(async (id, action, eventId) => {
    setBusyId(id);
    try {
      if (action === 'unpublish') {
        await invokeEventJob({ action: 'unpublish', job_id: id });
        toast({ title: 'Job unpublished' });
      } else {
        await invokeEventJob({ action: 'regenerate', event_id: eventId });
        toast({ title: 'Job page regenerated' });
      }
      await queryClient.invalidateQueries({ queryKey: ['admin', 'event_job_pages'] });
    } catch (err) {
      toast({
        title: 'Action failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  }, [queryClient]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-semibold text-navy flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Job pages
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Public chef job listings auto-created when events are confirmed. Links live at /job/&#123;id&#125;.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search title, area, or id…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Published</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  No job pages yet. Confirm an event to generate one.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((row) => {
              const title = row.ai_content?.title || 'Untitled job';
              const eventLabel = [
                formatDate(row.events?.date || row.source_snapshot?.event_date),
                row.source_snapshot?.service_area || row.events?.service_area,
              ].filter(Boolean).join(' · ');
              const isBusy = busyId === row.id;
              return (
                <TableRow key={row.id}>
                  <TableCell className="font-medium max-w-[220px]">
                    <div className="truncate" title={title}>{title}</div>
                    {row.generation_error && (
                      <p className="text-xs text-amber-700 mt-1 truncate" title={row.generation_error}>
                        {row.generation_error}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{eventLabel || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs border ${STATUS_STYLES[row.status] || ''}`}>
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.published_at ? format(new Date(row.published_at), 'MMM d, yyyy') : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 flex-wrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={row.status !== 'published' || isBusy}
                        onClick={() => copyLink(row.id)}
                        title="Copy public link"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => runAction(row.id, 'regenerate', row.event_id)}
                        title="Regenerate"
                      >
                        {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={row.status !== 'published' || isBusy}
                        onClick={() => runAction(row.id, 'unpublish', row.event_id)}
                        title="Unpublish"
                      >
                        <Unlink className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}