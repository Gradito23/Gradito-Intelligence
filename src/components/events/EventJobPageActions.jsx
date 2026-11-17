import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import {
  CONFIRMED_EVENTS_JOB_HUB_KEY,
  EVENT_JOB_PAGE_QUERY_KEY,
  invokeEventJob,
  JOB_PAGE_STATUS_STYLES,
  publicJobUrl,
} from '@/lib/eventJobPage';
import { Copy, ExternalLink, Loader2, RefreshCw, Sparkles, Unlink } from 'lucide-react';

async function copyPublicLink(jobPageId) {
  const url = publicJobUrl(jobPageId);
  try {
    await navigator.clipboard.writeText(url);
    toast({ title: 'Link copied', description: url });
  } catch {
    toast({ title: 'Copy failed', description: url, variant: 'destructive' });
  }
}

export default function EventJobPageActions({
  eventId,
  jobPage,
  variant = 'inline',
  onUpdated,
  className = '',
}) {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('events', 'write');
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: CONFIRMED_EVENTS_JOB_HUB_KEY });
    if (eventId) {
      await queryClient.invalidateQueries({ queryKey: [...EVENT_JOB_PAGE_QUERY_KEY, eventId] });
    }
    onUpdated?.();
  };

  const runGenerate = async (action) => {
    if (!canWrite) return;
    setBusy(true);
    try {
      if (action === 'unpublish') {
        if (!jobPage?.id) return;
        await invokeEventJob({ action: 'unpublish', job_id: jobPage.id });
        toast({ title: 'Job unpublished' });
      } else if (action === 'regenerate') {
        await invokeEventJob({ action: 'regenerate', event_id: eventId });
        toast({ title: 'Job page regenerated' });
      } else {
        await invokeEventJob({ action: 'generate', event_id: eventId });
        toast({ title: 'Generating job page…' });
      }
      await refresh();
    } catch (err) {
      toast({
        title: 'Action failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const published = jobPage?.status === 'published';
  const draft = jobPage?.status === 'draft';
  const title = jobPage?.ai_content?.title;

  if (variant === 'card') {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Chef job page (public)
          </h4>
          {jobPage?.status && (
            <Badge variant="outline" className={`text-xs border ${JOB_PAGE_STATUS_STYLES[jobPage.status] || ''}`}>
              {jobPage.status}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Chef-safe copy — no client name or revenue. Shareable link for chef recruitment.
        </p>
        {title && <p className="text-sm font-medium">{title}</p>}
        {published && jobPage?.id && (
          <p className="text-xs font-mono text-muted-foreground break-all">{publicJobUrl(jobPage.id)}</p>
        )}
        {jobPage?.generation_error && (
          <p className="text-xs text-amber-700">{jobPage.generation_error}</p>
        )}
        {!jobPage && (
          <p className="text-sm text-muted-foreground">No public job page yet.</p>
        )}
        <ActionButtons
          busy={busy}
          canWrite={canWrite}
          published={published}
          draft={draft}
          hasPage={Boolean(jobPage)}
          onCopy={() => copyPublicLink(jobPage.id)}
          onOpen={() => window.open(publicJobUrl(jobPage.id), '_blank', 'noopener,noreferrer')}
          onGenerate={() => runGenerate('generate')}
          onRegenerate={() => runGenerate('regenerate')}
          onUnpublish={() => runGenerate('unpublish')}
          layout="wrap"
        />
      </div>
    );
  }

  return (
    <div className={`flex justify-end gap-1 flex-wrap ${className}`}>
      <ActionButtons
        busy={busy}
        canWrite={canWrite}
        published={published}
        draft={draft}
        hasPage={Boolean(jobPage)}
        onCopy={() => copyPublicLink(jobPage.id)}
        onOpen={() => window.open(publicJobUrl(jobPage.id), '_blank', 'noopener,noreferrer')}
        onGenerate={() => runGenerate('generate')}
        onRegenerate={() => runGenerate('regenerate')}
        onUnpublish={() => runGenerate('unpublish')}
        layout="icons"
      />
    </div>
  );
}

function ActionButtons({
  busy,
  canWrite,
  published,
  draft,
  hasPage,
  onCopy,
  onOpen,
  onGenerate,
  onRegenerate,
  onUnpublish,
  layout,
}) {
  const icon = busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null;

  if (!hasPage) {
    return (
      <Button
        type="button"
        variant={layout === 'wrap' ? 'default' : 'ghost'}
        size="sm"
        disabled={busy || !canWrite}
        onClick={onGenerate}
        title="Generate job link (AI)"
      >
        {busy ? icon : <Sparkles className={layout === 'wrap' ? 'h-4 w-4 mr-1' : 'h-4 w-4'} />}
        {layout === 'wrap' ? 'Generate job link (AI)' : null}
      </Button>
    );
  }

  if (layout === 'wrap') {
    return (
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={!published || busy} onClick={onCopy}>
          <Copy className="h-4 w-4 mr-1" />
          Copy link
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={!published || busy} onClick={onOpen}>
          <ExternalLink className="h-4 w-4 mr-1" />
          Open page
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={busy || !canWrite} onClick={onRegenerate}>
          {icon || <RefreshCw className="h-4 w-4 mr-1" />}
          {draft ? 'Retry (AI)' : 'Regenerate (AI)'}
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={!published || busy || !canWrite} onClick={onUnpublish}>
          <Unlink className="h-4 w-4 mr-1" />
          Unpublish
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button type="button" variant="ghost" size="sm" disabled={!published || busy} onClick={onCopy} title="Copy link">
        <Copy className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" disabled={!published || busy} onClick={onOpen} title="Open page">
        <ExternalLink className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={busy || !canWrite}
        onClick={onRegenerate}
        title={draft ? 'Retry (AI)' : 'Regenerate (AI)'}
      >
        {busy ? icon : <RefreshCw className="h-4 w-4" />}
      </Button>
      {!published && canWrite && (
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onGenerate} title="Generate job link (AI)">
          <Sparkles className="h-4 w-4" />
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={!published || busy || !canWrite}
        onClick={onUnpublish}
        title="Unpublish"
      >
        <Unlink className="h-4 w-4" />
      </Button>
    </>
  );
}