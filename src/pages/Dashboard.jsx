import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval, format } from 'date-fns';
import {
  ChefHat,
  Calendar,
  BarChart3,
  Settings,
  ArrowRight,
  DollarSign,
  ClipboardList,
  Sparkles,
  AlertCircle,
  TrendingUp,
  Percent,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { checkPermission } from '@/lib/permissionMeta';
import {
  useChefs,
  useEvents,
  useEventChefs,
  useCommissionLines,
  useChefIntakeRequests,
  formatCurrency,
} from '@/hooks/useAppData';
import { computeEventPnL } from '@/lib/profitability';
import StatCard from '@/components/ui/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const QUICK_LINKS = [
  { path: '/chefs', label: 'Chefs', description: 'Roster and chef profiles', icon: ChefHat, permission: { resource: 'chefs', action: 'read' } },
  { path: '/intake-requests', label: 'Intake Requests', description: 'Approve chef submissions', icon: ClipboardList, permission: { resource: 'intake', action: 'read' } },
  { path: '/events', label: 'Events', description: 'Events and assignments', icon: Calendar, permission: { resource: 'events', action: 'read' } },
  { path: '/match', label: 'Chef Match', description: 'Shortlist chefs from a transcript', icon: Sparkles, permission: { resource: 'chefs', action: 'read' } },
  { path: '/reports', label: 'Reports', description: 'Analytics by area and cuisine', icon: BarChart3, permission: { resource: 'reports', action: 'read' } },
  { path: '/profitability', label: 'Profitability', description: 'Margins and commissions', icon: DollarSign, permission: { resource: 'reports', action: 'read' } },
];

function todayIsoDate() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const isAdmin = user?.role === 'admin';
  const displayName = user?.display_name || user?.email?.split('@')[0] || 'there';

  const { data: chefs = [], isLoading: loadingChefs } = useChefs();
  const { data: events = [], isLoading: loadingEvents } = useEvents();
  const { data: eventChefs = [], isLoading: loadingEventChefs } = useEventChefs();
  const { data: commissionLines = [], isLoading: loadingComm } = useCommissionLines();
  const { data: intakeRequests = [], isLoading: loadingIntake } = useChefIntakeRequests();

  const canReadIntake = hasPermission('intake', 'read');
  const canReadReports = hasPermission('reports', 'read');
  const canReadChefs = hasPermission('chefs', 'read');
  const canReadEvents = hasPermission('events', 'read');

  const loading = loadingChefs || loadingEvents || (canReadIntake && loadingIntake);
  const loadingPnL = loadingEvents || loadingEventChefs || loadingComm;
  const dash = loading ? '—' : null;
  const pnlDash = loadingPnL ? '—' : null;

  const stats = useMemo(() => {
    const year = new Date().getFullYear();
    const activeChefs = chefs.filter((c) => !c.archived);
    const ytdEvents = events.filter((e) => {
      if (!e.date) return false;
      return String(e.date).slice(0, 4) === String(year);
    });
    const revenueYtd = ytdEvents.reduce((sum, e) => sum + (Number(e.client_revenue) || 0), 0);
    const pendingIntake = intakeRequests.filter((r) => r.status === 'pending').length;
    const incompleteProfiles = activeChefs.filter((c) => c.profile_status !== 'Complete').length;
    return {
      activeChefs: activeChefs.length,
      eventsYtd: ytdEvents.length,
      revenueYtd,
      pendingIntake,
      incompleteProfiles,
    };
  }, [chefs, events, intakeRequests]);

  const thisMonthPnL = useMemo(() => {
    if (!canReadReports) return null;
    const now = new Date();
    const range = { start: startOfMonth(now), end: endOfMonth(now) };
    const monthEvents = events.filter((e) => {
      if (!e.date) return false;
      try {
        return isWithinInterval(parseISO(e.date), range);
      } catch {
        return false;
      }
    });
    const eventIds = new Set(monthEvents.map((e) => e.id));
    const pnlRows = monthEvents.map((event) => computeEventPnL(event, eventChefs, commissionLines));
    const billable = pnlRows.reduce((s, r) => s + (r.billableRevenue || 0), 0);
    const gross = pnlRows.reduce((s, r) => s + (r.grossProfit || 0), 0);
    const net = pnlRows.reduce((s, r) => s + (r.netProfit || 0), 0);
    const marginPct = billable > 0 ? (net / billable) * 100 : 0;
    const pendingComm = commissionLines
      .filter((l) => eventIds.has(l.event_id) && l.status === 'Pending')
      .reduce((s, l) => s + (Number(l.amount) || 0), 0);
    return {
      billable,
      gross,
      net,
      marginPct,
      pendingComm,
      eventCount: monthEvents.length,
      monthLabel: format(now, 'MMMM yyyy'),
    };
  }, [canReadReports, events, eventChefs, commissionLines]);

  const upcomingEvents = useMemo(() => {
    const today = todayIsoDate();
    return events
      .filter((e) => e.date && String(e.date).slice(0, 10) >= today)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .slice(0, 8);
  }, [events]);

  const quickLinks = QUICK_LINKS.filter((link) => checkPermission(hasPermission, link.permission));

  const attentionItems = [];
  if (canReadIntake && stats.pendingIntake > 0) {
    attentionItems.push({
      key: 'intake',
      label: `${stats.pendingIntake} pending intake request${stats.pendingIntake === 1 ? '' : 's'}`,
      to: '/intake-requests',
    });
  }
  if (canReadChefs && stats.incompleteProfiles > 0) {
    attentionItems.push({
      key: 'profiles',
      label: `${stats.incompleteProfiles} incomplete chef profile${stats.incompleteProfiles === 1 ? '' : 's'}`,
      to: '/chefs',
    });
  }
  if (canReadChefs) {
    attentionItems.push({
      key: 'match',
      label: 'Run Chef Match',
      to: '/match',
    });
  }

  const revenueNav = canReadReports ? '/profitability' : '/events';
  const netPositive = thisMonthPnL && thisMonthPnL.net >= 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-navy">
          Welcome back, {displayName}
        </h1>
        <p className="text-muted-foreground mt-1">
          Gradito operations overview
        </p>
      </div>

      <div className={`grid gap-4 sm:grid-cols-2 ${canReadIntake ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        <StatCard
          title="Active Chefs"
          value={dash ?? stats.activeChefs}
          icon={ChefHat}
          onClick={canReadChefs ? () => navigate('/chefs') : undefined}
        />
        <StatCard
          title="Events YTD"
          value={dash ?? stats.eventsYtd}
          icon={Calendar}
          onClick={canReadEvents ? () => navigate('/events') : undefined}
        />
        <StatCard
          title="Revenue YTD"
          value={dash ?? formatCurrency(stats.revenueYtd)}
          subtitle="Client revenue"
          icon={TrendingUp}
          accent
          onClick={canReadEvents || canReadReports ? () => navigate(revenueNav) : undefined}
        />
        {canReadIntake && (
          <StatCard
            title="Pending Intake"
            value={dash ?? stats.pendingIntake}
            icon={ClipboardList}
            onClick={() => navigate('/intake-requests')}
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="font-heading text-lg">Upcoming events</CardTitle>
              <CardDescription>Next events from today onward</CardDescription>
            </div>
            {canReadEvents && (
              <Button asChild variant="ghost" size="sm" className="text-navy">
                <Link to="/events">View all</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {loadingEvents ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Loading events…</p>
            ) : upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No upcoming events</p>
            ) : (
              <ul className="divide-y divide-border">
                {upcomingEvents.map((e) => (
                  <li key={e.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{e.client_name || 'Untitled event'}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {e.date ? new Date(e.date).toLocaleDateString() : '—'}
                        {e.service_area ? ` · ${e.service_area}` : ''}
                      </p>
                    </div>
                    {e.status && (
                      <Badge variant="secondary" className="shrink-0 text-xs">{e.status}</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <AlertCircle size={18} className="text-gold" />
              Needs attention
            </CardTitle>
            <CardDescription>Items that may need a follow-up</CardDescription>
          </CardHeader>
          <CardContent>
            {attentionItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">All clear for now</p>
            ) : (
              <ul className="space-y-2">
                {attentionItems.map((item) => (
                  <li key={item.key}>
                    <Link
                      to={item.to}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-secondary/40 transition-colors"
                    >
                      <span>{item.label}</span>
                      <ArrowRight size={14} className="text-muted-foreground shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {canReadReports && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <DollarSign size={18} className="text-gold" />
                Profitability — This Month
              </CardTitle>
              <CardDescription>
                {thisMonthPnL?.monthLabel || format(new Date(), 'MMMM yyyy')} · same math as Profitability
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-navy shrink-0">
              <Link to="/profitability">
                Open full view <ArrowRight size={14} className="ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Billable Rev"
                value={pnlDash ?? formatCurrency(thisMonthPnL.billable)}
                icon={DollarSign}
              />
              <StatCard
                title="Gross Profit"
                value={pnlDash ?? formatCurrency(thisMonthPnL.gross)}
                icon={TrendingUp}
              />
              <Card className="p-5 bg-card">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Net Profit</p>
                    <p className={`text-2xl font-heading font-bold ${
                      pnlDash ? 'text-foreground' : netPositive ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {pnlDash ?? formatCurrency(thisMonthPnL.net)}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-secondary">
                    <TrendingUp size={18} className="text-muted-foreground" />
                  </div>
                </div>
              </Card>
              <StatCard
                title="Net Margin"
                value={pnlDash ?? `${thisMonthPnL.marginPct.toFixed(1)}%`}
                icon={Percent}
                accent
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Commission owed (pending):{' '}
              <span className="font-medium text-foreground">
                {pnlDash ?? formatCurrency(thisMonthPnL.pendingComm)}
              </span>
              {' · '}
              {pnlDash ?? thisMonthPnL.eventCount} events this month
            </p>
          </CardContent>
        </Card>
      )}

      {quickLinks.length > 0 && (
        <div>
          <h2 className="font-heading text-lg font-semibold mb-3">Quick links</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickLinks.map(({ path, label, description, icon: Icon }) => (
              <Link key={path} to={path}>
                <Card className="hover:bg-muted/30 transition-colors h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-heading flex items-center gap-2">
                      <Icon className="h-5 w-5 text-gold" />
                      {label}
                    </CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <span className="text-sm text-primary font-medium inline-flex items-center gap-1">
                      Open <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {isAdmin && (
        <Card className="border-gold/20 bg-gold/5">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Settings className="h-5 w-5 text-gold" />
              Admin Panel
            </CardTitle>
            <CardDescription>
              System configuration, reference data, and platform operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/admin">Go to Admin Panel</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
