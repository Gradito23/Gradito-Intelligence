import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Loader2, MessageSquare } from 'lucide-react';
import {
  useQuoIntegration,
  useSaveQuoSettings,
  useTestQuoConnection,
} from '@/hooks/useQuoIntegration';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';

export default function QuoIntegration() {
  const { data, isLoading, isError, error } = useQuoIntegration();
  const saveMutation = useSaveQuoSettings();
  const testMutation = useTestQuoConnection();

  const [apiKey, setApiKey] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [isChangingKey, setIsChangingKey] = useState(false);

  useEffect(() => {
    if (!data) return;
    setEnabled(data.enabled ?? false);
    setIsChangingKey(!data.configured);
    setApiKey('');
  }, [data]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await saveMutation.mutateAsync({
        api_key: apiKey || undefined,
        enabled,
      });
      setApiKey('');
      setIsChangingKey(false);
      toast({ title: 'Quo settings saved' });
    } catch (err) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleTest = async () => {
    try {
      if (apiKey.trim()) {
        await saveMutation.mutateAsync({ api_key: apiKey.trim(), enabled });
        setApiKey('');
        setIsChangingKey(false);
      }
      const result = await testMutation.mutateAsync();
      toast({
        title: 'Connection test',
        description: result.summary || 'OK',
      });
    } catch (err) {
      toast({ title: 'Test failed', description: err.message, variant: 'destructive' });
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
    return <p className="text-sm text-destructive">Failed to load Quo settings: {error.message}</p>;
  }

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
          <MessageSquare className="h-5 w-5" />
          Quo
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          SMS and call transcripts for chef communication. Sender number and webhooks are configured via Supabase edge secrets.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading">API credentials</CardTitle>
          <CardDescription>
            Save your Quo API key here. Set <code className="text-xs">QUO_PHONE_NUMBER_ID</code> and webhook secrets in Supabase — see{' '}
            <code className="text-xs">docs/Quo-Integration-Setup.md</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="quo-enabled">Enabled</Label>
                <p className="text-xs text-muted-foreground">Allow staff to send SMS from chef profiles</p>
              </div>
              <Switch id="quo-enabled" checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quo-key">API key</Label>
              {data?.configured && !isChangingKey ? (
                <div className="flex items-center gap-2">
                  <Input value={data.api_key_masked} readOnly className="font-mono text-sm" />
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsChangingKey(true)}>
                    Change
                  </Button>
                </div>
              ) : (
                <Input
                  id="quo-key"
                  type="password"
                  autoComplete="off"
                  placeholder="Quo API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="font-mono text-sm"
                />
              )}
            </div>

            {data?.last_test_summary && (
              <p className="text-sm text-muted-foreground border rounded-md p-3 bg-muted/40">
                {data.last_test_summary}
                {data.last_test_at && (
                  <span className="block text-xs mt-1">
                    Last tested: {format(new Date(data.last_test_at), 'PPp')}
                  </span>
                )}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saveMutation.isPending} className="bg-navy hover:bg-navy/90 text-white">
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={testMutation.isPending || saveMutation.isPending}
              >
                {testMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test connection & A2P'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}