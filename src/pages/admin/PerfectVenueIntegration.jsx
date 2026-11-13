import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, Loader2, RefreshCw, Unplug } from 'lucide-react';
import {
  usePerfectVenueDisconnect,
  usePerfectVenueIntegration,
  usePerfectVenueAuthorizeUrl,
  usePerfectVenueSync,
  useSavePerfectVenueCredentials,
  formatPerfectVenueSyncToast,
} from '@/hooks/usePerfectVenueIntegration';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';

const SECRET_MASK = '*************';

export default function PerfectVenueIntegration() {
  const { data, isLoading, isError, error } = usePerfectVenueIntegration();
  const saveMutation = useSavePerfectVenueCredentials();
  const authorizeMutation = usePerfectVenueAuthorizeUrl();
  const syncMutation = usePerfectVenueSync();
  const disconnectMutation = usePerfectVenueDisconnect();

  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [isChangingSecret, setIsChangingSecret] = useState(false);

  useEffect(() => {
    if (!data) return;
    setClientId(data.client_id_display || '');
    setIsChangingSecret(!data.client_configured);
    setClientSecret('');
  }, [data]);

  const handleSaveCredentials = async (e) => {
    e.preventDefault();
    try {
      await saveMutation.mutateAsync({
        client_id: clientId.trim() || undefined,
        client_secret: clientSecret || (isChangingSecret ? '' : SECRET_MASK),
      });
      setClientSecret('');
      setIsChangingSecret(false);
      toast({ title: 'Credentials saved' });
    } catch (err) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleConnect = async () => {
    try {
      if (!data?.client_configured) {
        toast({
          title: 'Save credentials first',
          description: 'Enter client ID and secret before connecting.',
          variant: 'destructive',
        });
        return;
      }
      const { authorize_url } = await authorizeMutation.mutateAsync();
      if (authorize_url) window.location.href = authorize_url;
    } catch (err) {
      toast({ title: 'Connect failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleSync = async (mode) => {
    try {
      const result = await syncMutation.mutateAsync(mode);
      toast({
        title: 'Sync complete',
        description: formatPerfectVenueSyncToast(result),
      });
    } catch (err) {
      toast({ title: 'Sync failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectMutation.mutateAsync();
      toast({ title: 'Disconnected from Perfect Venue' });
    } catch (err) {
      toast({ title: 'Disconnect failed', description: err.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-destructive">Failed to load: {error.message}</p>;
  }

  const venues = data?.venues ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/admin/integrations">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Integrations
        </Link>
      </Button>

      <div>
        <h2 className="font-heading text-xl font-semibold text-navy flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Perfect Venue
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          OAuth sync for events. CRM fields on PV-linked rows refresh on sync; P&amp;L stays in Gradito.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading">OAuth app credentials</CardTitle>
          <CardDescription>
            Client secret is encrypted at rest. Callback: https://ai.gradito.com/oauth/perfect-venue/callback
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveCredentials} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pv-client-id">Client ID</Label>
              <Input
                id="pv-client-id"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="font-mono text-sm"
                placeholder="From Perfect Venue Developer settings"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pv-client-secret">Client secret</Label>
              {data?.client_configured && !isChangingSecret ? (
                <div className="flex items-center gap-2">
                  <Input value={data.client_secret_masked} readOnly className="font-mono text-sm" />
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsChangingSecret(true)}>
                    Change
                  </Button>
                </div>
              ) : (
                <Input
                  id="pv-client-secret"
                  type="password"
                  autoComplete="off"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  className="font-mono text-sm"
                />
              )}
            </div>
            <Button type="submit" disabled={saveMutation.isPending} className="bg-navy hover:bg-navy/90 text-white">
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save credentials'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading">Connection</CardTitle>
          <CardDescription>
            {data?.connected
              ? `Connected · scopes: ${data.scopes || '—'}`
              : 'Not connected — authorize with a Perfect Venue user who can access your venues.'}
            {data?.last_sync_at && (
              <span className="block mt-1">Last sync: {format(new Date(data.last_sync_at), 'PPp')}</span>
            )}
            {data?.last_sync_error && (
              <span className="block mt-1 text-destructive">{data.last_sync_error}</span>
            )}
            <span className="block mt-2 text-muted-foreground">
              Full sync backfills all venues from Perfect Venue (may run in several short steps). Incremental syncs only
              events changed since the last successful sync (PV <code className="text-xs">updated_at</code>). Sync history
              shows live In/Up while a run is in progress.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {!data?.connected ? (
            <Button onClick={handleConnect} disabled={authorizeMutation.isPending}>
              {authorizeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Connect Perfect Venue'}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => handleSync('incremental')}
                disabled={syncMutation.isPending}
              >
                {syncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                Sync now (incremental)
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSync('full')}
                disabled={syncMutation.isPending}
              >
                Full sync
              </Button>
              <Button variant="ghost" onClick={handleDisconnect} disabled={disconnectMutation.isPending}>
                <Unplug className="h-4 w-4 mr-1" />
                Disconnect
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {venues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-heading">Venues</CardTitle>
            <CardDescription>From last Perfect Venue venues list</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Timezone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {venues.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.name || '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{v.id}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{v.timezone || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
