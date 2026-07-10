import React from 'react';
import { format } from 'date-fns';
import { BarChart3, Loader2, RefreshCw } from 'lucide-react';
import { useEmailIntegration, useRefreshEmailAnalytics } from '@/hooks/useEmailIntegration';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function StatCard({ label, value }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <p className="text-2xl font-semibold font-heading">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function providerLabel(provider) {
  return provider === 'custom_smtp' ? 'Custom SMTP' : 'Resend API';
}

export default function EmailAnalyticsCard() {
  const { data, isLoading, isError, error } = useEmailIntegration();
  const refreshMutation = useRefreshEmailAnalytics();
  const analytics = data?.analytics;

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-destructive">
          Failed to load email analytics: {error?.message}
        </CardContent>
      </Card>
    );
  }

  const byType = Object.entries(analytics?.by_type ?? {});
  const byProvider = Object.entries(analytics?.by_provider ?? {});
  const recentLogs = analytics?.recent_logs ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-gold" />
              Email analytics
            </CardTitle>
            <CardDescription className="mt-1">
              Sends from test emails and future app emails, logged automatically.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshMutation.isPending}
          >
            {refreshMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Today" value={analytics?.today ?? 0} />
          <StatCard label="Week" value={analytics?.week ?? 0} />
          <StatCard label="Month" value={analytics?.month ?? 0} />
          <StatCard label="Success rate" value={`${analytics?.success_rate ?? 100}%`} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium mb-2">By type</p>
            {byType.length === 0 ? (
              <p className="text-muted-foreground">No sends yet</p>
            ) : (
              <ul className="space-y-1">
                {byType.map(([type, count]) => (
                  <li key={type} className="flex justify-between gap-2">
                    <span className="capitalize">{type}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="font-medium mb-2">By provider</p>
            {byProvider.length === 0 ? (
              <p className="text-muted-foreground">No sends yet</p>
            ) : (
              <ul className="space-y-1">
                {byProvider.map(([provider, count]) => (
                  <li key={provider} className="flex justify-between gap-2">
                    <span>{providerLabel(provider)}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <p className="font-medium mb-2 text-sm">Recent email logs</p>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
              No email logs yet. Send a test email to see activity here.
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), 'PP p')}
                      </TableCell>
                      <TableCell className="capitalize">{log.email_type}</TableCell>
                      <TableCell>{log.recipient}</TableCell>
                      <TableCell>{providerLabel(log.provider)}</TableCell>
                      <TableCell>
                        <Badge variant={log.status === 'sent' ? 'default' : 'destructive'}>
                          {log.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
