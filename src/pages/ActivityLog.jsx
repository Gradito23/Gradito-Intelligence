import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useActivityLogs, useOnboardingGuideDeliveries } from '@/hooks/useAppData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, FileText, Search } from 'lucide-react';

const PAGE_SIZE = 50;

const ENTITY_FILTERS = ['Chef', 'Event', 'Client', 'Intake', 'UserGuide', 'TeamMember'];

const ACTION_COLORS = {
  Created: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Updated: 'bg-blue-100 text-blue-800 border-blue-200',
  Deleted: 'bg-red-100 text-red-800 border-red-200',
  Emailed: 'bg-amber-100 text-amber-800 border-amber-200',
  Approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Rejected: 'bg-red-100 text-red-800 border-red-200',
};

function formatWhen(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, 'MMM d, yyyy h:mm a');
}

function matchesQuery(haystack, query) {
  if (!query) return true;
  return String(haystack || '').toLowerCase().includes(query);
}

function inDateRange(value, from, to) {
  if (!from && !to) return true;
  if (!value) return false;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return false;
  if (from) {
    const start = new Date(`${from}T00:00:00`).getTime();
    if (time < start) return false;
  }
  if (to) {
    const end = new Date(`${to}T23:59:59`).getTime();
    if (time > end) return false;
  }
  return true;
}

function StatusBadge({ sent, opened, clicked, status }) {
  if (status === 'failed') {
    return <Badge className="bg-red-100 text-red-800 border-0 text-xs">Failed</Badge>;
  }
  if (clicked) {
    return <Badge className="bg-emerald-100 text-emerald-800 border-0 text-xs">Clicked</Badge>;
  }
  if (opened) {
    return <Badge className="bg-amber-100 text-amber-800 border-0 text-xs">Opened</Badge>;
  }
  if (sent) {
    return <Badge className="bg-blue-100 text-blue-800 border-0 text-xs">Sent</Badge>;
  }
  return <Badge variant="outline" className="text-xs">{status || '—'}</Badge>;
}

export default function ActivityLog() {
  const { data: logs = [] } = useActivityLogs();
  const { data: deliveries = [] } = useOnboardingGuideDeliveries();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [guideSearch, setGuideSearch] = useState('');
  const [guideVisible, setGuideVisible] = useState(PAGE_SIZE);

  const actions = useMemo(() => {
    const set = new Set(logs.map((l) => l.action).filter(Boolean));
    return [...set].sort();
  }, [logs]);

  const entityTypes = useMemo(() => {
    const set = new Set([...ENTITY_FILTERS, ...logs.map((l) => l.entity_type).filter(Boolean)]);
    return [...set].sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (filterType !== 'all' && log.entity_type !== filterType) return false;
      if (filterAction !== 'all' && log.action !== filterAction) return false;
      if (!inDateRange(log.created_date || log.created_at, fromDate, toDate)) return false;
      if (!q) return true;
      return (
        matchesQuery(log.actor, q)
        || matchesQuery(log.entity_label, q)
        || matchesQuery(log.summary, q)
        || matchesQuery(log.entity_type, q)
        || matchesQuery(log.action, q)
      );
    });
  }, [logs, search, filterType, filterAction, fromDate, toDate]);

  const filteredDeliveries = useMemo(() => {
    const q = guideSearch.trim().toLowerCase();
    return deliveries.filter((row) => {
      if (!q) return true;
      return matchesQuery(row.recipient_name, q) || matchesQuery(row.recipient_email, q);
    });
  }, [deliveries, guideSearch]);

  const visibleLogs = filteredLogs.slice(0, visibleCount);
  const visibleDeliveries = filteredDeliveries.slice(0, guideVisible);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Activity Log</h1>
        <p className="text-muted-foreground mt-1">Platform changes and Onboarding Guide email delivery</p>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            All activity
          </TabsTrigger>
          <TabsTrigger value="user-guide" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            User Guide
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE); }}
                placeholder="Search name, email, or summary"
                className="pl-8"
              />
            </div>
            <Select value={filterType} onValueChange={(v) => { setFilterType(v); setVisibleCount(PAGE_SIZE); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {entityTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterAction} onValueChange={(v) => { setFilterAction(v); setVisibleCount(PAGE_SIZE); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Action" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {actions.map((action) => (
                  <SelectItem key={action} value={action}>{action}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setVisibleCount(PAGE_SIZE); }} className="w-40" />
            <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setVisibleCount(PAGE_SIZE); }} className="w-40" />
          </div>

          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">When</TableHead>
                  <TableHead>Who</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatWhen(log.created_date || log.created_at)}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{log.actor || 'System'}</TableCell>
                    <TableCell>
                      <Badge className={`${ACTION_COLORS[log.action] || 'bg-muted text-foreground'} text-xs border-0`}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{log.entity_type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.entity_label || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.summary}</TableCell>
                  </TableRow>
                ))}
                {visibleLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                      No activity entries found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
          {visibleCount < filteredLogs.length && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}>
                Load more ({filteredLogs.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="user-guide" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Onboarding Guide emails sent after intake. <strong>Clicked</strong> means they opened the guide link.
            <strong> Opened</strong> is approximate (mail apps may load images without a person reading).
          </p>
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={guideSearch}
              onChange={(e) => { setGuideSearch(e.target.value); setGuideVisible(PAGE_SIZE); }}
              placeholder="Search chef name or email"
              className="pl-8"
            />
          </div>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chef name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Sent at</TableHead>
                  <TableHead>Opened</TableHead>
                  <TableHead>Clicked</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleDeliveries.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-sm font-medium">{row.recipient_name || '—'}</TableCell>
                    <TableCell className="text-sm">{row.recipient_email}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatWhen(row.sent_at || row.created_date)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {row.opened_at ? formatWhen(row.opened_at) : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {row.clicked_at ? formatWhen(row.clicked_at) : '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        sent={row.status === 'sent'}
                        opened={Boolean(row.opened_at)}
                        clicked={Boolean(row.clicked_at)}
                        status={row.status}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {visibleDeliveries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                      No User Guide emails yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
          {guideVisible < filteredDeliveries.length && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setGuideVisible((n) => n + PAGE_SIZE)}>
                Load more ({filteredDeliveries.length - guideVisible} remaining)
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
