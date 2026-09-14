import React, { useEffect, useState } from 'react';
import { BookOpen, ExternalLink, Loader2 } from 'lucide-react';
import { useOnboardingGuide, useSaveOnboardingGuide } from '@/hooks/useOnboardingGuide';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function UserGuide() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('config', 'write');
  const { data, isLoading, isError, error } = useOnboardingGuide();
  const saveMutation = useSaveOnboardingGuide();

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!data) return;
    setTitle(data.title || '');
    setUrl(data.url || '');
    setEnabled(data.enabled !== false);
  }, [data]);

  const trimmedUrl = url.trim();
  const previewUrl = isHttpUrl(trimmedUrl) ? trimmedUrl : '';

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canWrite) return;
    if (!title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    if (!isHttpUrl(trimmedUrl)) {
      toast({ title: 'Enter a valid http(s) URL', variant: 'destructive' });
      return;
    }
    try {
      await saveMutation.mutateAsync({
        title: title.trim(),
        url: trimmedUrl,
        enabled,
      });
      toast({ title: 'User guide saved' });
    } catch (err) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive py-8 px-4">
        Failed to load user guide settings: {error.message}
      </p>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-navy flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          User Guide
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Chef & FOH Onboarding Guide shown to chefs after they submit the intake form.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading">Published guide</CardTitle>
          <CardDescription>
            Chefs see this link on the intake thank-you screen when the guide is enabled.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="guide-enabled">Enabled</Label>
                <p className="text-xs text-muted-foreground">Show the guide on the intake thank-you screen</p>
              </div>
              <Switch
                id="guide-enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
                disabled={!canWrite}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guide-title">Title</Label>
              <Input
                id="guide-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!canWrite}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guide-url">URL</Label>
              <Input
                id="guide-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://"
                disabled={!canWrite}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                disabled={!canWrite || saveMutation.isPending}
                className="bg-navy hover:bg-navy/90 text-white"
              >
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
              {previewUrl ? (
                <Button type="button" variant="outline" asChild>
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1.5" />
                    Preview
                  </a>
                </Button>
              ) : (
                <Button type="button" variant="outline" disabled>
                  <ExternalLink className="h-4 w-4 mr-1.5" />
                  Preview
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
