import { format, parseISO } from 'date-fns';
import { chefHasEmail, chefHasPhone } from '@/lib/chefInviteMessage';
import { canonicalPublicJobUrl } from '@/lib/eventJobPage';

export const DEFAULT_JOB_SMS_TEMPLATE =
  "Gradito: Hi {{first_name}}, new opportunity in {{city}} on {{event_date}}! View details & let us know if you're available: {{job_url}} Reply STOP to opt out.";

export const DEFAULT_JOB_EMAIL_SUBJECT = 'Gradito chef opportunity in {{city}}';

export const DEFAULT_JOB_EMAIL_HTML = `<p>Hi {{first_name}},</p>
<p>We have a new private dining opportunity in <strong>{{city}}</strong> on <strong>{{event_date}}</strong>.</p>
<p><a href="{{job_url}}" style="display:inline-block;background:#c9a227;color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">View opportunity</a></p>
<p>Let us know if you are available.</p>
<p>— Gradito Team</p>`;

function formatJobEventDate(value) {
  if (!value) return 'TBD';
  try {
    const d = parseISO(String(value).slice(0, 10));
    if (Number.isNaN(d.getTime())) return String(value);
    return format(d, 'EEE, MMM d, yyyy');
  } catch {
    return String(value);
  }
}

export function buildJobInviteContext(chef, event, jobPage, jobSnapshot = null) {
  const city = (event?.service_area || jobSnapshot?.service_area || 'your area').trim();
  const eventDateRaw = event?.date || jobSnapshot?.event_date || null;
  return {
    first_name: chef?.first_name?.trim() || 'there',
    last_name: chef?.last_name?.trim() || '',
    city,
    event_date: formatJobEventDate(eventDateRaw),
    job_url: canonicalPublicJobUrl(jobPage?.id),
  };
}

function applyJobVars(template, ctx) {
  return String(template ?? '')
    .replace(/\{\{\s*first_name\s*\}\}/gi, ctx.first_name)
    .replace(/\{\{\s*last_name\s*\}\}/gi, ctx.last_name)
    .replace(/\{\{\s*city\s*\}\}/gi, ctx.city)
    .replace(/\{\{\s*event_date\s*\}\}/gi, ctx.event_date)
    .replace(/\{\{\s*job_url\s*\}\}/gi, ctx.job_url);
}

export function renderJobSmsTemplate(template, ctx) {
  return applyJobVars(template || DEFAULT_JOB_SMS_TEMPLATE, ctx);
}

export function renderJobEmailSubject(template, ctx) {
  return applyJobVars(template || DEFAULT_JOB_EMAIL_SUBJECT, ctx);
}

export function renderJobEmailHtml(template, ctx) {
  return applyJobVars(template || DEFAULT_JOB_EMAIL_HTML, ctx);
}

export function jobInviteTemplatesFromSettings(settings) {
  return {
    sms: settings?.job_sms_template || DEFAULT_JOB_SMS_TEMPLATE,
    emailSubject: settings?.job_email_subject || DEFAULT_JOB_EMAIL_SUBJECT,
    emailHtml: settings?.job_email_html || DEFAULT_JOB_EMAIL_HTML,
  };
}

export function chefCanReceiveJobSms(chef) {
  return chefHasPhone(chef) && chef?.gradito_messaging_opt_in !== false;
}

export function chefCanReceiveJobEmail(chef) {
  return chefHasEmail(chef) && chef?.gradito_messaging_opt_in !== false;
}

/** @returns {'sent' | 'failed' | 'skipped' | null} */
export function invitationChannelStatus(invitation, channel) {
  if (!invitation) return null;
  const key = channel === 'sms' ? 'sms_status' : 'email_status';
  return invitation[key] ?? null;
}

export function invitationStatusLabel(status) {
  switch (status) {
    case 'sent':
      return 'Sent';
    case 'failed':
      return 'Failed';
    case 'skipped':
      return 'Skipped';
    default:
      return '—';
  }
}

export function inviteChannelChipLabel(channel, invitation, chef) {
  const status = invitationChannelStatus(invitation, channel);
  if (status === 'sent') return channel === 'sms' ? 'SMS sent' : 'Email sent';
  if (status === 'failed') return channel === 'sms' ? 'SMS failed' : 'Email failed';
  if (channel === 'sms') {
    if (!chefHasPhone(chef)) return 'No phone';
    if (chef?.gradito_messaging_opt_in === false) return 'SMS opt-out';
  } else if (!chefHasEmail(chef)) return 'No email';
  return null;
}