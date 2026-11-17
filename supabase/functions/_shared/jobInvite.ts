export const DEFAULT_JOB_SMS_TEMPLATE =
  "Gradito: Hi {{first_name}}, new opportunity in {{city}} on {{event_date}}! View details & let us know if you're available: {{job_url}} Reply STOP to opt out.";

export const DEFAULT_JOB_EMAIL_SUBJECT = 'Gradito chef opportunity in {{city}}';

export const DEFAULT_JOB_EMAIL_HTML = `<p>Hi {{first_name}},</p>
<p>We have a new private dining opportunity in <strong>{{city}}</strong> on <strong>{{event_date}}</strong>.</p>
<p><a href="{{job_url}}" style="display:inline-block;background:#c9a227;color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">View opportunity</a></p>
<p>Let us know if you are available.</p>
<p>— Gradito Team</p>`;

export function getAppBaseUrl(): string {
  return (Deno.env.get('APP_URL')?.trim() || Deno.env.get('SITE_URL')?.trim() || '').replace(/\/$/, '');
}

export function publicJobUrl(jobPageId: string): string {
  const base = getAppBaseUrl();
  if (!base) return `/job/${jobPageId}`;
  return `${base}/job/${jobPageId}`;
}

export type JobInviteContext = {
  first_name: string;
  last_name: string;
  city: string;
  event_date: string;
  job_url: string;
};

export function formatEventDateLabel(value: string | null | undefined): string {
  if (!value) return 'TBD';
  const s = String(value).slice(0, 10);
  const d = new Date(`${s}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function buildJobInviteContext(
  chef: { first_name?: string | null; last_name?: string | null },
  event: { service_area?: string | null; date?: string | null },
  jobPageId: string,
  snapshot?: { service_area?: string | null; event_date?: string | null } | null,
): JobInviteContext {
  const city = (event.service_area || snapshot?.service_area || 'your area').trim();
  const eventDateRaw = event.date || snapshot?.event_date || null;
  return {
    first_name: chef.first_name?.trim() || 'there',
    last_name: chef.last_name?.trim() || '',
    city,
    event_date: formatEventDateLabel(eventDateRaw ? String(eventDateRaw) : null),
    job_url: publicJobUrl(jobPageId),
  };
}

function applyJobVars(template: string, ctx: JobInviteContext): string {
  return String(template || '')
    .replace(/\{\{\s*first_name\s*\}\}/gi, ctx.first_name)
    .replace(/\{\{\s*last_name\s*\}\}/gi, ctx.last_name)
    .replace(/\{\{\s*city\s*\}\}/gi, ctx.city)
    .replace(/\{\{\s*event_date\s*\}\}/gi, ctx.event_date)
    .replace(/\{\{\s*job_url\s*\}\}/gi, ctx.job_url);
}

export function renderJobSmsTemplate(template: string, ctx: JobInviteContext): string {
  return applyJobVars(template || DEFAULT_JOB_SMS_TEMPLATE, ctx);
}

export function renderJobEmailSubject(template: string, ctx: JobInviteContext): string {
  return applyJobVars(template || DEFAULT_JOB_EMAIL_SUBJECT, ctx);
}

export function renderJobEmailHtml(template: string, ctx: JobInviteContext): string {
  return applyJobVars(template || DEFAULT_JOB_EMAIL_HTML, ctx);
}

export function normalizePhoneDigits(value: string | null | undefined): string {
  return String(value ?? '').replace(/\D/g, '');
}

export function normalizeEmail(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase();
}