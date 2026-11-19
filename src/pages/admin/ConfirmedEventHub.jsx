import React, { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { toAppRows } from '@/infrastructure/supabase/rowMapper';
import { useEventChefs, formatCurrency } from '@/hooks/useAppData';
import { useEventJobPage } from '@/hooks/useEventJobPage';
import { useEventMatchRun } from '@/hooks/useEventMatchRun';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useJobApplications } from '@/hooks/useJobChefInvitations';
import { JOB_PAGE_STATUS_STYLES, publicJobUrl } from '@/lib/eventJobPage';
import { EVENT_STATUS_COLORS } from '@/lib/eventStatuses';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeft, Calendar, ExternalLink, Loader2 } from 'lucide-react';

async function fetchEventById(eventId) {
  const { data, error } = await supabase.from('events').select('*').eq('id', eventId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const rows = toAppRows([data]);
  return rows[0] ?? null;
}

function formatEventDate(value) {
  if (!value) return '—';
  try {
    const d = parseISO(String(value).slice(0, 10));
    return format(d, 'MMM d, yyyy');
  } catch {
    return String(value);
  }
}

const TAB_IDS = new Set(['overview', 'job', 'match', 'applications', 'staffing']);

function embedOne(value) {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function ApplicantPortalLabel({ row }) {
  const chef = embedOne(row.matched_chef);
  if (row.matched_chef_id) {
    const name = [chef?.first_name, chef?.last_name].filter(Boolean).join(' ');
    return (
      <Link to="/chefs" className="text-sm font-medium underline">
        Existing chef{name ? ` · ${name}` : ''}
      </Link>
    );
  }
  const intake = embedOne(row.matched_intake);
  if (row.matched_intake_request_id) {
    const status = intake?.status || 'unknown';
    return (
      <Link to="/intake-requests" className="text-sm font-medium underline capitalize">
        Intake · {status}
      </Link>
    );
  }
  return <span className="text-sm text-muted-foreground">New applicant</span>;
}

function noticeSummary(emailStatus, smsStatus) {
  return `Email ${emailStatus || 'skipped'} · SMS ${smsStatus || 'skipped'}`;
}

export default function ConfirmedEventHub() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const defaultTab = TAB_IDS.has(tabParam) ? tabParam : 'overview';

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['admin', 'confirmed_event', eventId],
    queryFn: () => fetchEventById(eventId),
    enabled: Boolean(eventId),
  });

  const { jobPage, invalidate: invalidateJobPage } = useEventJobPage(eventId, { enabled: Boolean(eventId) });
  const { latestRun, isLoadingRun } = useEventMatchRun(eventId, { enabled: Boolean(eventId) });
  const { data: allEventChefs = [] } = useEventChefs();

  const staffing = useMemo(
    () => allEventChefs.filter((ec) => ec.event_id === eventId),
    [allEventChefs, eventId],
  );

  const [applicationFilter, setApplicationFilter] = useState('pending');
  const [acceptingId, setAcceptingId] = useState(null);
  const { applications, isLoading: applicationsLoading, acceptApplication } = useJobApplications(jobPage?.id, {
    enabled: Boolean(jobPage?.id),
  });

  const onAcceptApplication = async (applicationId) => {
    setAcceptingId(applicationId);
    try {
      const result = await acceptApplication(applicationId);
      if (result?.already_accepted) {
        toast({ title: 'Already accepted', description: 'This application was accepted earlier.' });
        return;
      }
      toast({
        title: 'Application accepted',
        description: noticeSummary(result?.acceptance_email_status, result?.acceptance_sms_status),
      });
    } catch (err) {
      toast({
        title: 'Could not accept application',
        description: err instanceof Error ? err.message : 'Accept failed',
        variant: 'destructive',
      });
    } finally {
      setAcceptingId(null);
    }
  };
  const filteredApplications = useMemo(() => {
    if (applicationFilter === 'all') return applications;
    return applications.filter((a) => a.status === applicationFilter);
  }, [applications, applicationFilter]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/job-pages">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Job Pages
          </Link>
        </Button>
        <Card className="p-8 text-center text-muted-foreground">
          Event not found or you do not have access.
        </Card>
      </div>
    );
  }

  const cuisines = Array.isArray(event.cuisines_served) ? event.cuisines_served.join(', ') : '—';
  const jobStatus = jobPage?.status;
  const matchWhen = latestRun?.created_at
    ? format(new Date(latestRun.created_at), 'MMM d, yyyy h:mm a')
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" className="px-0 h-auto" asChild>
            <Link to="/admin/job-pages">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Job Pages
            </Link>
          </Button>
          <div>
            <h2 className="font-heading text-xl font-semibold text-navy flex flex-wrap items-center gap-2">
              {event.client_name || 'Event'}
              <Badge className={`text-xs border-0 ${EVENT_STATUS_COLORS.Confirmed || ''}`}>
                {event.status}
              </Badge>
            </h2>
            <p className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0" />
              {formatEventDate(event.date)}
              {event.service_area && <span>· {event.service_area}</span>}
              {event.experience_type && <span>· {event.experience_type}</span>}
              {event.guest_count != null && <span>· {event.guest_count} guests</span>}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/events', { state: { openEventId: eventId } })}
        >
          Open in Events
        </Button>
      </div>

      <Tabs key={`${eventId}-${defaultTab}`} defaultValue={defaultTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="job">Public job</TabsTrigger>
          <TabsTrigger value="match">Chef match</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="staffing">Staffing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <Card className="p-4">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground text-xs uppercase tracking-wide">Client</dt>
                <dd className="font-medium">{event.client_name || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs uppercase tracking-wide">Event type</dt>
                <dd>{event.event_type || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs uppercase tracking-wide">Perfect Venue ID</dt>
                <dd className="font-mono text-xs break-all">{event.perfect_venue_id || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs uppercase tracking-wide">Client revenue</dt>
                <dd>{formatCurrency(event.client_revenue || 0)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground text-xs uppercase tracking-wide">Cuisines</dt>
                <dd>{cuisines}</dd>
              </div>
              {event.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground text-xs uppercase tracking-wide">Notes</dt>
                  <dd className="text-muted-foreground whitespace-pre-wrap line-clamp-6">{event.notes}</dd>
                </div>
              )}
            </dl>
          </Card>
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Public job page</p>
              {jobPage ? (
                <Badge variant="outline" className={`text-xs border ${JOB_PAGE_STATUS_STYLES[jobStatus] || ''}`}>
                  {jobStatus}
                </Badge>
              ) : (
                <p className="text-sm text-muted-foreground">No job page yet</p>
              )}
              {jobPage?.generation_error && (
                <p className="text-xs text-amber-700 mt-2">{jobPage.generation_error}</p>
              )}
            </Card>
            <Card className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Last chef match</p>
              {isLoadingRun ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : matchWhen ? (
                <p className="text-sm">
                  {matchWhen}
                  {latestRun?.suggested_chefs?.length
                    ? ` · ${latestRun.suggested_chefs.length} chefs`
                    : ''}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No match run yet</p>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="job" className="mt-4 space-y-4">
          <Card className="p-4">
            <EventJobPageActions
              eventId={event.id}
              jobPage={jobPage}
              variant="card"
              onUpdated={invalidateJobPage}
            />
          </Card>
          {jobPage?.status === 'published' && jobPage.id && (
            <Button variant="outline" size="sm" asChild>
              <a href={publicJobUrl(jobPage.id)} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" />
                Preview public page
              </a>
            </Button>
          )}
        </TabsContent>

        <TabsContent value="match" className="mt-4">
          <Card className="p-4">
            <EventChefMatchPanel
              key={event.id}
              event={event}
              jobPage={jobPage}
              jobSnapshot={jobPage?.source_snapshot}
            />
          </Card>
        </TabsContent>

        <TabsContent value="applications" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'pending', label: 'Pending' },
              { id: 'ignored', label: 'Ignored' },
              { id: 'reviewed', label: 'Reviewed' },
              { id: 'accepted', label: 'Accepted' },
              { id: 'all', label: 'All' },
            ].map((f) => (
              <Button
                key={f.id}
                type="button"
                size="sm"
                variant={applicationFilter === f.id ? 'default' : 'outline'}
                onClick={() => setApplicationFilter(f.id)}
              >
                {f.label}
              </Button>
            ))}
          </div>
          <Card className="overflow-hidden">
            {!jobPage?.id ? (
              <p className="p-6 text-sm text-muted-foreground">Generate a job page to collect applications.</p>
            ) : applicationsLoading ? (
              <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading applications…
              </div>
            ) : filteredApplications.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No applications in this filter.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Attestation</TableHead>
                    <TableHead>Portal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        {row.first_name}
                        {' '}
                        {row.last_name}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.email && <div>{row.email}</div>}
                        {row.phone && <div className="text-muted-foreground">{row.phone}</div>}
                      </TableCell>
                      <TableCell>{row.intake_attestation ? 'Yes' : 'No'}</TableCell>
                      <TableCell>
                        <ApplicantPortalLabel row={row} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {row.created_at ? format(new Date(row.created_at), 'MMM d, yyyy h:mm a') : '—'}
                      </TableCell>
                      <TableCell>
                        {row.status === 'accepted' ? (
                          <p className="text-xs text-muted-foreground whitespace-nowrap">
                            {noticeSummary(row.acceptance_email_status, row.acceptance_sms_status)}
                          </p>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            disabled={acceptingId === row.id}
                            onClick={() => onAcceptApplication(row.id)}
                          >
                            {acceptingId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accept'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="staffing" className="mt-4">
          <Card className="overflow-hidden">
            {staffing.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No chefs assigned on this event yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Chef</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffing.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.role}</TableCell>
                      <TableCell className="font-medium">{row.chef_name || '—'}</TableCell>
                      <TableCell>{formatCurrency(row.fee || 0)}</TableCell>
                      <TableCell>{row.payment_status || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}