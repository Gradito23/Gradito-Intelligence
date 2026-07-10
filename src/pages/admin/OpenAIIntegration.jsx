import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Bot, Loader2, RefreshCw } from 'lucide-react';
import {
  useOpenAIIntegration,
  useSaveOpenAISettings,
  useSetOpenAIDefaultModel,
  useSyncOpenAIModels,
  useTestOpenAIConnection,
} from '@/hooks/useOpenAIIntegration';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';

export default function OpenAIIntegration() {
  const { data, isLoading, isError, error } = useOpenAIIntegration();
  const saveMutation = useSaveOpenAISettings();
  const testMutation = useTestOpenAIConnection();
  const syncMutation = useSyncOpenAIModels();
  const setDefaultMutation = useSetOpenAIDefaultModel();

  const [apiKey, setApiKey] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [isChangingKey, setIsChangingKey] = useState(false);
  const [modelFilter, setModelFilter] = useState('');

  useEffect(() => {
    if (!data) return;
    setEnabled(data.enabled ?? false);
    setIsChangingKey(!data.configured);
    setApiKey('');
  }, [data]);

  const filteredModels = useMemo(() => {
    const models = data?.synced_models ?? [];
    const q = modelFilter.trim().toLowerCase();
    if (!q) return models;
    return models.filter((m) => m.id.toLowerCase().includes(q));
  }, [data?.synced_models, modelFilter]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await saveMutation.mutateAsync({
        api_key: apiKey || undefined,
        enabled,
      });
      setApiKey('');
      setIsChangingKey(false);
      toast({ title: 'OpenAI settings saved' });
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
      await testMutation.mutateAsync();
      toast({ title: 'Connection successful' });
    } catch (err) {
      toast({ title: 'Connection failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleSync = async () => {
    try {
      const result = await syncMutation.mutateAsync();
      toast({ title: `Synced ${result.synced_count ?? 0} models` });
    } catch (err) {
      toast({ title: 'Sync failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleSetDefault = async (modelId) => {
    try {
      await setDefaultMutation.mutateAsync(modelId);
      toast({ title: 'Default model updated' });
    } catch (err) {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-destructive">Failed to load OpenAI settings: {error.message}</p>;
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
          <Bot className="h-5 w-5" />
          OpenAI
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your OpenAI API key, sync available models, and set the platform default.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading">API credentials</CardTitle>
          <CardDescription>
            Uses OpenAI <code className="text-xs">GET /v1/models</code> to verify and sync models.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="openai-enabled">Enabled</Label>
                <p className="text-xs text-muted-foreground">Allow platform features to use OpenAI</p>
              </div>
              <Switch id="openai-enabled" checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="openai-key">API key</Label>
              {data?.configured && !isChangingKey ? (
                <div className="flex items-center gap-2">
                  <Input value={data.api_key_masked} readOnly className="font-mono text-sm" />
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsChangingKey(true)}>
                    Change
                  </Button>
                </div>
              ) : (
                <Input
                  id="openai-key"
                  type="password"
                  autoComplete="off"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="font-mono text-sm"
                />
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saveMutation.isPending} className="bg-navy hover:bg-navy/90 text-white">
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
              <Button type="button" variant="outline" onClick={handleTest} disabled={testMutation.isPending || saveMutation.isPending}>
                {testMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test connection'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base font-heading">Models</CardTitle>
            <CardDescription>
              Sync from OpenAI and choose the platform default model.
              {data?.last_synced_at && (
                <span className="block mt-1">
                  Last synced: {format(new Date(data.last_synced_at), 'PPp')}
                </span>
              )}
              {data?.last_sync_error && (
                <span className="block mt-1 text-destructive">{data.last_sync_error}</span>
              )}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={!data?.configured || syncMutation.isPending}
          >
            {syncMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-1" />
                Sync models
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1 space-y-2">
              <Label>Platform default</Label>
              <Select
                value={data?.default_model_id ?? ''}
                onValueChange={handleSetDefault}
                disabled={!filteredModels.length || setDefaultMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select default model" />
                </SelectTrigger>
                <SelectContent>
                  {(data?.synced_models ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="model-filter">Filter models</Label>
              <Input
                id="model-filter"
                placeholder="Search models…"
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
              />
            </div>
          </div>

          {(data?.synced_models ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No models synced yet. Save your API key and click Sync models.
            </p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="w-28">Default</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredModels.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-sm">{m.id}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{m.owned_by}</TableCell>
                      <TableCell>
                        {data?.default_model_id === m.id ? (
                          <Badge variant="secondary">Default</Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleSetDefault(m.id)}
                            disabled={setDefaultMutation.isPending}
                          >
                            Set default
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
