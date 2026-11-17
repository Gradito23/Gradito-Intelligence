import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Loader2, Phone, Send } from 'lucide-react';
import { QuoCommunicationRepository } from '@/infrastructure/repositories/QuoCommunicationRepository';
import { useQuoIntegrationStatus, useSendQuoMessage } from '@/hooks/useQuoIntegration';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';

function channelLabel(channel) {
  return channel === 'call_transcript' ? 'Call transcript' : 'SMS';
}

export default function ChefQuoMessages({ chef, eventId = null }) {
  const { data: quoStatus, isLoading: statusLoading } = useQuoIntegrationStatus();
  const [content, setContent] = useState('');

  const chefPhone = chef?.mobile || chef?.phone;
  const chefId = chef?.id;

  const { data: events = [], isLoading: eventsLoading, refetch } = useQuery({
    queryKey: ['quo-communication-events', chefId],
    queryFn: () => QuoCommunicationRepository.listByChefId(chefId),
    enabled: Boolean(chefId),
  });

  const sendMutation = useSendQuoMessage();

  const timeline = useMemo(
    () => [...events].sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at)),
    [events],
  );

  const messagingOptIn = chef?.gradito_messaging_opt_in !== false;
  const canSend = quoStatus?.enabled && chefPhone && content.trim().length > 0 && messagingOptIn;

  const handleSend = async () => {
    try {
      await sendMutation.mutateAsync({
        chef_id: chefId,
        content: content.trim(),
        event_id: eventId || undefined,
      });
      setContent('');
      await refetch();
      toast({ title: 'Message sent' });
    } catch (err) {
      toast({ title: 'Send failed', description: err.message, variant: 'destructive' });
    }
  };

  if (statusLoading) {
    return <p className="text-sm text-muted-foreground">Loading Quo status…</p>;
  }

  if (!quoStatus?.configured) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        Quo is not configured. Ask an admin to connect it under Admin → Integrations → Quo.
      </Card>
    );
  }

  if (!quoStatus?.enabled) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        Quo is disabled. Enable it in Admin → Integrations → Quo to send messages.
      </Card>
    );
  }

  if (!chefPhone) {
    return (
      <Card className="p-4 text-sm text-muted-foreground flex items-start gap-2">
        <Phone className="h-4 w-4 mt-0.5 shrink-0" />
        Add a mobile or phone number on this chef before sending SMS.
      </Card>
    );
  }

  if (!messagingOptIn) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        This chef has opted out of Gradito messaging (including SMS). Re-enable under Contact &amp; Portfolio if they
        agree to receive messages again.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <p className="text-xs text-muted-foreground">
          Sending to <span className="font-mono text-foreground">{chefPhone}</span>
          {eventId && <span className="block mt-1">Linked to current event context.</span>}
        </p>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type your message…"
          rows={3}
          className="text-sm resize-none"
          maxLength={1600}
        />
        <Button
          type="button"
          size="sm"
          className="bg-navy hover:bg-navy/90 text-white"
          disabled={!canSend || sendMutation.isPending}
          onClick={handleSend}
        >
          {sendMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Send className="h-4 w-4 mr-1" />
              Send SMS
            </>
          )}
        </Button>
      </Card>

      {eventsLoading ? (
        <p className="text-sm text-muted-foreground">Loading history…</p>
      ) : timeline.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">No Quo messages or transcripts yet for this chef.</Card>
      ) : (
        <ul className="space-y-2">
          {timeline.map((item) => (
            <li key={item.id}>
              <Card className="p-3 space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline">{channelLabel(item.channel)}</Badge>
                  <Badge variant={item.direction === 'outbound' ? 'default' : 'secondary'}>
                    {item.direction === 'outbound' ? 'Sent' : 'Received'}
                  </Badge>
                  <span className="text-muted-foreground">
                    {format(new Date(item.occurred_at), 'PPp')}
                  </span>
                </div>
                {item.body_text ? (
                  <p className="text-sm whitespace-pre-wrap">{item.body_text}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No text body</p>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}