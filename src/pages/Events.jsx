import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useEventChefs, useClients, useChefs, formatCurrency } from '@/hooks/useAppData';
import {
  useEventsLedger,
  useEventPipelineStats,
  useEventLedgerStats,
  invalidateEventsLedger,
} from '@/hooks/useEventsLedger';
import { useQueryClient } from '@tanstack/react-query';
import StatCard from '@/components/ui/StatCard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import EventDetailPanel from '@/components/events/EventDetailPanel';
import CreateEventModal from '@/components/events/CreateEventModal';
import { Calendar, DollarSign, TrendingUp, Users, Plus, CalendarPlus, RefreshCw, Loader2 } from 'lucide-react';
import {
  usePerfectVenueIntegration,
  usePerfectVenueSync,
  formatPerfectVenueSyncToast,
  perfectVenueSyncToastTitle,
} from '@/hooks/usePerfectVenueIntegration';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SERVICE_AREAS } from '@/lib/constants';
import {
  ACTIVE_PIPELINE_STATUSES,
  EVENT_SOURCE_LABELS,
  EVENT_STATUS_COLORS,
  EVENT_STATUS_OPTIONS,
} from '@/lib/eventStatuses';
import { toast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/AuthContext';
import PerfectVenueSyncHistory from '@/components/events/PerfectVenueSyncHistory';

function formatEventDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 1971) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const LEDGER_VIEWS = [
  { id: 'active', label: 'Active pipeline' },
  { id: 'all', label: 'All events' },
  { id: 'archive', label: 'Archive' },
];

export default function Events() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();
  const { data: eventChefs } = useEventChefs();
  const { data: clients } = useClients();
  const { data: chefs } = useChefs();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [ledgerView, setLedgerView] = useState('active');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [searchInput, setSearchInput] = useState('');
  const [filterArea, setFilterArea] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterSource, setFilterSource] = useState('all');

  const { data: pvStatus } = usePerfectVenueIntegration({ enabled: isAdmin, pollWhileSyncing: isAdmin });
  const pvSyncMutation = usePerfectVenueSync();
  const pvConnected = !!pvStatus?.connected;
  const pvSyncDisabled = !pvConnected || pvSyncMutation.isPending;

  const handlePerfectVenueSync = async () => {
    if (!pvConnected) return;
    try {
      const result = await pvSyncMutation.mutateAsync('incremental');
      toast({
        title: perfectVenueSyncToastTitle(result),
        description: formatPerfectVenueSyncToast(result),
      });
    } catch (err) {
      toast({ title: 'Sync failed', description: err.message, variant: 'destructive' });
    }
  };

  const perfectVenueSyncButton = (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Button
              type="button"
              variant="outline"
              disabled={pvSyncDisabled}
              onClick={handlePerfectVenueSync}
            >
              {pvSyncMutation.isPending ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <RefreshCw size={16} className="mr-2" />
              )}
              Sync Perfect Venue
            </Button>
          </span>
        </TooltipTrigger>
        {!pvConnected && (
          <TooltipContent>
            Connect in Admin → Integrations → Perfect Venue
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );

  const ledgerFilters = {
    service_area: filterArea,
    status: filterStatus,
    event_type: filterType,
    event_source: filterSource,
  };

  useEffect(() => {
    setPage(1);
  }, [ledgerView, filterArea, filterStatus, filterType, filterSource, searchInput, pageSize]);

  const { data: ledgerData, isLoading: ledgerLoading, isError: ledgerError } = useEventsLedger({
    view: ledgerView,
    page,
    pageSize,
    filters: ledgerFilters,
    search: searchInput,
  });
  const pipelineSource = filterSource === 'all' ? 'all' : filterSource;
  const { data: pipelineStats } = useEventPipelineStats({ eventSource: pipelineSource });
  const { data: ledgerSummary, isError: ledgerSummaryError } = useEventLedgerStats();

  const ledgerEvents = ledgerData?.rows ?? [];
  const totalCount = ledgerData?.totalCount ?? 0;
  const pageStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(page * pageSize, totalCount);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const statsUnavailable = ledgerSummaryError;
  const totalPayouts = eventChefs.reduce((s, ec) => s + (ec.fee || 0) + (ec.travel_fee_applied || 0), 0);
  const totalRevenue = statsUnavailable ? null : (ledgerSummary?.totalRevenue ?? 0);
  const margin = totalRevenue != null ? totalRevenue - totalPayouts : null;
  const ytdCount = statsUnavailable ? null : (ledgerSummary?.ytdCount ?? 0);
  const repeatRate = statsUnavailable ? null : (ledgerSummary?.repeatRate ?? 0);

  const activeChefIds = new Set(eventChefs.map(ec => ec.chef_id));
  const idleCount = chefs.length - activeChefIds.size;

  // Inline status change
  const handleStatusChange = async (event, newStatus, e) => {
    e.stopPropagation();
    await base44.entities.Event.update(event.id, { status: newStatus });
    await base44.entities.ActivityLog.create({
      actor: 'Team', action: 'Updated', entity_type: 'Event', entity_label: event.client_name,
      summary: `Changed status of ${event.client_name} event to ${newStatus}`,
    });
    invalidateEventsLedger(queryClient);
    toast({ title: `Event status → ${newStatus}` });
  };

  const eventsLedger = (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          title="Events YTD"
          value={ytdCount == null ? '—' : ytdCount}
          subtitle={statsUnavailable ? 'Stats unavailable' : undefined}
          icon={Calendar}
        />
        <StatCard
          title="Total Revenue"
          value={totalRevenue == null ? '—' : formatCurrency(totalRevenue)}
          subtitle={
            statsUnavailable
              ? 'Stats unavailable'
              : margin != null
                ? `Margin: ${formatCurrency(margin)}`
                : undefined
          }
          icon={TrendingUp}
        />
        <StatCard title="Total Payouts" value={formatCurrency(totalPayouts)} icon={DollarSign} accent />
        <StatCard
          title="Repeat-Client Rate"
          value={repeatRate == null ? '—' : `${repeatRate}%`}
          subtitle={statsUnavailable ? 'Stats unavailable' : `${idleCount} idle chefs`}
          icon={Users}
        />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {LEDGER_VIEWS.map((v) => (
          <Button
            key={v.id}
            type="button"
            size="sm"
            variant={ledgerView === v.id ? 'default' : 'outline'}
            className={ledgerView === v.id ? 'bg-navy hover:bg-navy/90 text-white' : ''}
            onClick={() => setLedgerView(v.id)}
          >
            {v.label}
            {v.id === 'active' && pipelineStats?.activeTotal != null && (
              <span className="ml-1.5 opacity-80">({pipelineStats.activeTotal})</span>
            )}
            {v.id === 'archive' && pipelineStats?.archiveTotal != null && (
              <span className="ml-1.5 opacity-80">({pipelineStats.archiveTotal})</span>
            )}
            {v.id === 'all' && pipelineStats?.allTotal != null && (
              <span className="ml-1.5 opacity-80">({pipelineStats.allTotal})</span>
            )}
          </Button>
        ))}
      </div>

      {pipelineStats?.byStatus && (
        <div className="flex flex-wrap gap-2">
          {ACTIVE_PIPELINE_STATUSES.map((status) => (
            <Badge
              key={status}
              variant="outline"
              className={`text-xs font-normal ${EVENT_STATUS_COLORS[status] || ''}`}
            >
              {status}
              {' '}
              <span className="font-semibold ml-1 tabular-nums">
                {pipelineStats.byStatus[status] ?? 0}
              </span>
            </Badge>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <Input
          className="max-w-xs"
          placeholder="Search client or event name…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <Select value={filterArea} onValueChange={setFilterArea}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Area" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Areas</SelectItem>
            {SERVICE_AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {EVENT_STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="perfect_venue">Perfect Venue</SelectItem>
            <SelectItem value="bulk_import">Bulk import</SelectItem>
            <SelectItem value="invoice_import">Invoice</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Private">Private</SelectItem>
            <SelectItem value="Corporate">Corporate</SelectItem>
            <SelectItem value="Wedding">Wedding</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {ledgerError && (
        <p className="text-sm text-destructive">Failed to load events. Try again or adjust filters.</p>
      )}

      {ledgerLoading && ledgerEvents.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      {!ledgerLoading && ledgerEvents.length > 0 ? (
        <Card className="overflow-hidden">
          <p className="text-xs text-muted-foreground px-3 py-2 border-b">
            {ledgerView === 'active' && 'Active pipeline — matches open Perfect Venue stages.'}
            {ledgerView === 'all' && `Full ledger — ${totalCount.toLocaleString()} events matching filters.`}
            {ledgerView === 'archive' && 'Cancelled and completed events.'}
            {searchInput.trim() && ` Search: “${searchInput.trim()}”.`}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-secondary/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Client</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Area</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Guests</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Revenue</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {ledgerEvents.map(event => (
                  <tr
                    key={event.id}
                    className="border-b hover:bg-secondary/30 cursor-pointer transition-colors group"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <td className="p-3 whitespace-nowrap">{formatEventDate(event.date)}</td>
                    <td className="p-3 font-medium">
                      <span>{event.client_name || '—'}</span>
                      {event.event_source && event.event_source !== 'manual' && (
                        <Badge variant="secondary" className="ml-2 text-[10px] px-1 py-0">
                          {EVENT_SOURCE_LABELS[event.event_source] || event.event_source}
                        </Badge>
                      )}
                    </td>
                    <td className="p-3">{event.service_area}</td>
                    <td className="p-3"><Badge variant="outline" className="text-xs">{event.event_type}</Badge></td>
                    <td className="p-3">{event.guest_count}</td>
                    <td className="p-3 text-right font-medium">{formatCurrency(event.client_revenue || 0)}</td>
                    {/* Inline status editor */}
                    <td className="p-3" onClick={e => e.stopPropagation()}>
                      <Select value={event.status} onValueChange={val => handleStatusChange(event, val, { stopPropagation: () => {} })}>
                        <SelectTrigger className={`h-6 w-32 text-xs border-0 ${EVENT_STATUS_COLORS[event.status] || ''}`} onClick={e => e.stopPropagation()}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EVENT_STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 border-t text-sm">
            <span className="text-muted-foreground">
              Showing
              {' '}
              {pageStart.toLocaleString()}
              –
              {pageEnd.toLocaleString()}
              {' '}
              of
              {' '}
              {totalCount.toLocaleString()}
            </span>
            <div className="flex items-center gap-2">
              <Select
                value={String(pageSize)}
                onValueChange={(val) => setPageSize(Number(val))}
              >
                <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                  <SelectItem value="100">100 / page</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || ledgerLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">
                Page
                {' '}
                {page}
                {' '}
                /
                {' '}
                {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages || ledgerLoading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      ) : !ledgerLoading && ledgerEvents.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
          <CalendarPlus size={40} className="mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="font-heading text-lg font-semibold mb-1">
            {searchInput.trim() || filterStatus !== 'all' || ledgerView !== 'all'
              ? 'No matching events'
              : 'No events yet'}
          </p>
          <p className="text-muted-foreground text-sm mb-4">
            {searchInput.trim()
              ? 'Try a different search or switch to All events.'
              : 'Log your first event or adjust filters.'}
          </p>
          {!searchInput.trim() && (
            <Button onClick={() => setShowCreateEvent(true)} className="bg-gold hover:bg-gold/80 text-white">
              <Plus size={16} className="mr-2" /> Log an event
            </Button>
          )}
        </div>
      ) : null}
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold">Events</h1>
          <p className="text-muted-foreground mt-1">Event ledger and performance tracking</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && perfectVenueSyncButton}
          <Button onClick={() => setShowCreateEvent(true)} className="bg-navy hover:bg-navy/90 text-white">
            <Plus size={16} className="mr-2" /> Create Event
          </Button>
        </div>
      </div>

      {isAdmin ? (
        <Tabs defaultValue="events">
          <TabsList>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="sync-history">Sync history</TabsTrigger>
          </TabsList>
          <TabsContent value="events" className="space-y-6 mt-4">
            {eventsLedger}
          </TabsContent>
          <TabsContent value="sync-history" className="mt-4 space-y-4">
            <div className="flex justify-end">{perfectVenueSyncButton}</div>
            <PerfectVenueSyncHistory />
          </TabsContent>
        </Tabs>
      ) : (
        eventsLedger
      )}

      <EventDetailPanel
        event={selectedEvent}
        chefs={chefs}
        eventChefs={eventChefs}
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />

      <CreateEventModal
        open={showCreateEvent}
        onClose={() => setShowCreateEvent(false)}
        chefs={chefs}
        clients={clients}
        eventChefs={eventChefs}
        prefillChef={null}
      />
    </div>
  );
}