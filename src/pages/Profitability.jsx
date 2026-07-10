import React, { useMemo, useState } from 'react';
import { startOfMonth, endOfMonth, startOfYear, subMonths, parseISO, isWithinInterval } from 'date-fns';
import { useEvents, useEventChefs, useChefs, useCommissionLines, useTeamMembers } from '@/hooks/useAppData';
import { computeEventPnL } from '@/lib/profitability';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ProfitSummaryCards from '@/components/reports/ProfitSummaryCards';
import ProfitByChef from '@/components/reports/ProfitByChef';
import ProfitByDimension from '@/components/reports/ProfitByDimension';
import CommissionsByRep from '@/components/reports/CommissionsByRep';
import CommissionsByEvent from '@/components/reports/CommissionsByEvent';
import FoodBeverageSection from '@/components/reports/FoodBeverageSection';

import { format } from 'date-fns';

const PERIODS = [
  { value: 'this_month',   label: 'This Month' },
  { value: 'last_month',   label: 'Last Month' },
  { value: 'last_3',       label: 'Last 3 Months' },
  { value: 'ytd',          label: 'Year to Date' },
  { value: 'all',          label: 'All Time' },
];

function getPeriodRange(period) {
  const now = new Date();
  if (period === 'this_month') return { start: startOfMonth(now), end: endOfMonth(now) };
  if (period === 'last_month') { const d = subMonths(now, 1); return { start: startOfMonth(d), end: endOfMonth(d) }; }
  if (period === 'last_3')    return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
  if (period === 'ytd')       return { start: startOfYear(now), end: endOfMonth(now) };
  return null; // all time
}

export default function Profitability() {
  const [period, setPeriod] = useState('this_month');

  const { data: events }          = useEvents();
  const { data: eventChefs }      = useEventChefs();
  const { data: chefs }           = useChefs();
  const { data: commissionLines } = useCommissionLines();
  const { data: teamMembers }     = useTeamMembers();

  const range = getPeriodRange(period);

  const filteredEvents = useMemo(() =>
    events.filter(e => {
      if (!range) return true;
      try {
        const d = parseISO(e.date);
        return isWithinInterval(d, range);
      } catch { return false; }
    }),
  [events, range, period]);

  // Build pnlRows — one per event with full P&L + event reference
  const pnlRows = useMemo(() =>
    filteredEvents.map(event => ({
      event,
      ...computeEventPnL(event, eventChefs),
    })),
  [filteredEvents, eventChefs]);

  // Filter commission lines to events in period
  const filteredEventIds = useMemo(() => new Set(filteredEvents.map(e => e.id)), [filteredEvents]);
  const filteredCommLines = useMemo(() =>
    commissionLines.filter(l => filteredEventIds.has(l.event_id)),
  [commissionLines, filteredEventIds]);

  // EventChefs for events in period only
  const eventChefsFiltered = useMemo(() =>
    eventChefs.filter(ec => filteredEventIds.has(ec.event_id)),
  [eventChefs, filteredEventIds]);

  const isSingleMonth = period === 'this_month' || period === 'last_month';

  const periodLabel = useMemo(() => {
    const now = new Date();
    if (period === 'this_month') return format(now, 'MMMM yyyy');
    if (period === 'last_month') return format(subMonths(now, 1), 'MMMM yyyy');
    if (period === 'last_3') return `${format(subMonths(now, 2), 'MMM yyyy')} – ${format(now, 'MMM yyyy')}`;
    if (period === 'ytd') return `YTD ${format(now, 'yyyy')}`;
    return 'All Time';
  }, [period]);

  const periodKey = useMemo(() => {
    const now = new Date();
    if (period === 'this_month') return format(now, 'yyyy-MM');
    if (period === 'last_month') return format(subMonths(now, 1), 'yyyy-MM');
    if (period === 'last_3') return `${format(subMonths(now, 2), 'yyyy-MM')}_to_${format(now, 'yyyy-MM')}`;
    if (period === 'ytd') return `${format(now, 'yyyy')}-ytd`;
    return 'all';
  }, [period]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">Profitability</h1>
          <p className="text-muted-foreground mt-1">Financial truth — net profit, margins, commissions</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-44 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <ProfitSummaryCards
        pnlRows={pnlRows}
        commissionLines={filteredCommLines}
        isSingleMonth={isSingleMonth}
      />

      <Tabs defaultValue="chef">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="chef">By Chef</TabsTrigger>
          <TabsTrigger value="type">By Event Type</TabsTrigger>
          <TabsTrigger value="area">By Area</TabsTrigger>
          <TabsTrigger value="comm_rep">Commissions by Rep</TabsTrigger>
          <TabsTrigger value="comm_event">Commissions by Event</TabsTrigger>
          <TabsTrigger value="fb">Food & Beverage</TabsTrigger>
        </TabsList>

        <TabsContent value="chef">
          <ProfitByChef pnlRows={pnlRows} chefs={chefs} eventChefsFiltered={eventChefsFiltered} />
        </TabsContent>

        <TabsContent value="type">
          <ProfitByDimension pnlRows={pnlRows} dimension="event_type" label="Net Profit by Event Type" />
        </TabsContent>

        <TabsContent value="area">
          <ProfitByDimension pnlRows={pnlRows} dimension="service_area" label="Net Profit by Service Area (worst margin first)" worstFirst />
        </TabsContent>

        <TabsContent value="comm_rep">
          <CommissionsByRep commissionLines={filteredCommLines} teamMembers={teamMembers} periodLabel={periodLabel} periodKey={periodKey} />
        </TabsContent>

        <TabsContent value="comm_event">
          <CommissionsByEvent pnlRows={pnlRows} commissionLines={filteredCommLines} />
        </TabsContent>

        <TabsContent value="fb">
          <FoodBeverageSection pnlRows={pnlRows} />
        </TabsContent>
      </Tabs>
    </div>
  );
}