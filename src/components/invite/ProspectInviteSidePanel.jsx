import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Copy, Loader2, Mail, Send } from 'lucide-react';
import { QuoCommunicationRepository } from '@/infrastructure/repositories/QuoCommunicationRepository';
import { useProspectEmailLogs } from '@/hooks/useEmailIntegration';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  estimateSmsSegments,
  isProspectJoined,
  plainInviteTextToHtml,
  renderChefInviteEmailPlain,
  renderChefInviteEmailSubject,
  renderChefInviteTemplate,
} from '@/lib/chefInviteMessage';

function buildTimeline(smsEvents, emailLogs) {
  const items = [];
  for (const e of smsEvents ?? []) {
    items.push({
      id: `sms-${e.id}`,
      kind: 'sms',
      at: e.occurred_at,
      title: e.direction === 'inbound' ? 'Inbound SMS' : 'Outbound SMS',
      body: e.body_text,
      meta: e.counterparty_phone_e164,
    });
  }
  for (const l of emailLogs ?? []) {
    items.push({
      id: `email-${l.id}`,
      kind: 'email',
      at: l.created_at,
      title: l.subject || 'Email',
      body: l.status === 'failed' ? (l.error_message || 'Send failed') : `To ${l.recipient}`,
      meta: `${l.provider} · ${l.status}`,
    });
  }
  return items.sort((a, b) => new Date(b.at) - new Date(a.at));
}

export default function ProspectInviteSidePanel({
  prospect,
  smsTemplate,
  onSmsTemplateChange,
  emailSubject,
  onEmailSubjectChange,
  emailBody,
  onEmailBodyChange,
  quoReady,
  emailReady,
  canSms,
  canEmail,
  onSendSms,
  onSendEmail,
  smsSending,
  emailSending,
}) {
  const prospectId = prospect?.id;

  const { data: smsEvents = [], isLoading: loadingSms } = useQuery({
    queryKey: ['quo-communication-events', 'prospect', prospectId],
    queryFn: () => QuoCommunicationRepository.listByProspectId(prospectId),
    enabled: Boolean(prospectId),
  });

  const { data: emailLogs = [], isLoading: loadingEmail } = useProspectEmailLogs(prospectId);

  const timeline = useMemo(
    () => buildTimeline(smsEvents, emailLogs),
    [smsEvents, emailLogs],
  );

  const joined = isProspectJoined(prospect);

  const previewSms = prospect
    ? renderChefInviteTemplate(smsTemplate, prospect)
    : renderChefInviteTemplate(smsTemplate, { first_name: 'Jane', last_name: 'Doe', city: 'Miami' });

  const subjectPreview = prospect
    ? renderChefInviteEmailSubject(emailSubject, prospect)
    : renderChefInviteEmailSubject(emailSubject, { first_name: 'Jane', last_name: 'Doe' });

  const emailPlainPreview = prospect
    ? renderChefInviteEmailPlain(emailBody, prospect)
    : renderChefInviteEmailPlain(emailBody, { first_name: 'Jane', last_name: 'Doe', city: 'Miami' });

  const emailHtmlPreview = plainInviteTextToHtml(emailPlainPreview);

  const handleCopySms = () => {
    if (!prospect) return;
    navigator.clipboard.writeText(previewSms);
  };

  return (
    <Card className="lg:col-span-2 p-4 space-y-3">
      {!prospect ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Select a prospect to compose or view history.</p>
      ) : (
        <>
          <div>
            <h2 className="text-sm font-semibold text-navy">
              {prospect.first_name} {prospect.last_name}
            </h2>
            <p className="text-xs text-muted-foreground">
              {[prospect.city, prospect.email || 'No email', prospect.mobile || prospect.phone || 'No phone']
                .filter(Boolean)
                .join(' · ')}
            </p>
            {prospect.gradito_messaging_opt_in === false && (
              <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
                Opted out of Gradito messaging — SMS and email invites are disabled.
              </p>
            )}
          </div>

          <Tabs defaultValue="sms" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sms">SMS</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="sms" className="space-y-3 mt-3">
              <p className="text-xs text-muted-foreground">
                Variables: {'{{first_name}}'}, {'{{last_name}}'}, {'{{city}}'}, {'{{intake_link}}'}
              </p>
              <Textarea
                value={smsTemplate}
                onChange={(e) => onSmsTemplateChange(e.target.value)}
                rows={7}
                className="text-sm font-mono"
                disabled={joined}
              />
              <Card className="p-3 bg-muted/40 text-sm whitespace-pre-wrap">{previewSms}</Card>
              <p className="text-xs text-muted-foreground">~{estimateSmsSegments(previewSms)} SMS segment(s)</p>
              {joined ? (
                <p className="text-sm text-muted-foreground">Joined — SMS disabled.</p>
              ) : (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    className="bg-navy hover:bg-navy/90 text-white"
                    disabled={!canSms || smsSending || !quoReady}
                    onClick={onSendSms}
                  >
                    {smsSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                    Send via Quo
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCopySms}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="email" className="space-y-3 mt-3">
              <p className="text-xs text-muted-foreground">
                Variables: {'{{first_name}}'}, {'{{last_name}}'}, {'{{city}}'}, {'{{intake_link}}'}
              </p>
              <LabelRow label="Subject" />
              <Input
                value={emailSubject}
                onChange={(e) => onEmailSubjectChange(e.target.value)}
                disabled={joined}
                className="text-sm"
              />
              <LabelRow label="Body" />
              <Textarea
                value={emailBody}
                onChange={(e) => onEmailBodyChange(e.target.value)}
                rows={7}
                className="text-sm font-mono"
                disabled={joined}
              />
              <p className="text-xs text-muted-foreground">Preview subject: {subjectPreview}</p>
              <Card
                className="p-3 bg-muted/40 text-sm prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: emailHtmlPreview }}
              />
              {joined ? (
                <p className="text-sm text-muted-foreground">Joined — email disabled.</p>
              ) : (
                <Button
                  type="button"
                  className="bg-navy hover:bg-navy/90 text-white"
                  disabled={!canEmail || emailSending || !emailReady}
                  onClick={onSendEmail}
                >
                  {emailSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                  Send email
                </Button>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-3">
              {loadingSms || loadingEmail ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No SMS or email activity yet.</p>
              ) : (
                <ul className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {timeline.map((item) => (
                    <li key={item.id} className="border rounded-md p-3 text-sm">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {item.kind}
                          </Badge>
                          {item.title}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(item.at), 'PP p')}
                        </span>
                      </div>
                      {item.body && <p className="text-muted-foreground whitespace-pre-wrap">{item.body}</p>}
                      {item.meta && <p className="text-xs text-muted-foreground mt-1">{item.meta}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </Card>
  );
}

function LabelRow({ label }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
  );
}