import {
  corsHeaders,
  createServiceClient,
  isValidEmail,
  jsonResponse,
  requireAdmin,
  requireAuth,
} from '../_shared/auth.ts';
import { backfillIntegrationSecrets, resolveSecret } from '../_shared/crypto.ts';
import { sendEmail } from '../_shared/email.ts';
import {
  renderApplicationAcceptedEmail,
  renderApplicationReceivedEmail,
} from '../_shared/emailTemplates.ts';
import {
  buildJobInviteContext,
  DEFAULT_JOB_EMAIL_HTML,
  DEFAULT_JOB_EMAIL_SUBJECT,
  DEFAULT_JOB_SMS_TEMPLATE,
  normalizeEmail,
  normalizePhoneDigits,
  renderJobEmailHtml,
  renderJobEmailSubject,
  renderJobSmsTemplate,
} from '../_shared/jobInvite.ts';
import {
  getQuoEnvConfig,
  loadQuoSettings,
  normalizeE164,
  quoConfigured,
  quoSendTextMessage,
} from '../_shared/quo.ts';

type ChefSafeSnapshot = {
  event_date: string | null;
  service_area: string | null;
  experience_type: string | null;
  event_type: string | null;
  cuisines_served: string[];
  guest_count: number | null;
  staffing_roles: Array<{ role: string; filled: boolean }>;
};

type JobAiContent = {
  title: string;
  hero_subtitle: string;
  summary: string;
  bullets: string[];
  requirements: string[];
};

async function loadOpenAI(adminClient: ReturnType<typeof createServiceClient>) {
  await backfillIntegrationSecrets(adminClient);
  const { data, error } = await adminClient
    .from('integration_openai_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.enabled) return null;
  const apiKey = await resolveSecret(adminClient, {
    encrypted: data.encrypted_api_key,
    iv: data.api_key_iv,
    legacyPlaintext: data.api_key,
  });
  if (!apiKey?.trim()) return null;
  const model = (data.default_model_id as string)?.trim() || 'gpt-4o-mini';
  return { apiKey, model };
}

function buildChefSafeSnapshot(
  event: Record<string, unknown>,
  eventChefs: Array<{ role: string; chef_name: string | null }>,
): ChefSafeSnapshot {
  const cuisines = Array.isArray(event.cuisines_served)
    ? (event.cuisines_served as string[]).filter(Boolean)
    : [];
  const roles = eventChefs.map((ec) => ({
    role: ec.role || 'Chef',
    filled: Boolean(ec.chef_name?.trim()),
  }));
  const guest = event.guest_count;
  return {
    event_date: event.date ? String(event.date) : null,
    service_area: event.service_area ? String(event.service_area) : null,
    experience_type: event.experience_type ? String(event.experience_type) : null,
    event_type: event.event_type ? String(event.event_type) : null,
    cuisines_served: cuisines,
    guest_count: guest != null && guest !== '' ? Number(guest) : null,
    staffing_roles: roles,
  };
}

async function callOpenAIForJob(
  apiKey: string,
  model: string,
  snapshot: ChefSafeSnapshot,
): Promise<JobAiContent> {
  const modelLower = model.toLowerCase();
  const omitTemperature = /^o[0-9]/.test(modelLower) || modelLower.startsWith('gpt-5');
  const schema = {
    title: 'string — short enticing job title for chefs',
    hero_subtitle: 'string — one line under the title',
    summary: 'string — 2-3 sentences, chef-facing',
    bullets: 'array of strings — what the chef will do',
    requirements: 'array of strings — skills or logistics, no client identity',
  };
  const messages = [
    {
      role: 'system',
      content:
        'You write chef recruitment copy for private dining events. Never mention client names, revenue, or internal business details. Respond with JSON only.',
    },
    {
      role: 'user',
      content: `Create chef job page copy from this data:\n${JSON.stringify(snapshot, null, 2)}\n\nSchema:\n${JSON.stringify(schema)}`,
    },
  ];
  const payload: Record<string, unknown> = {
    model,
    messages,
    response_format: { type: 'json_object' },
  };
  if (!omitTemperature) payload.temperature = 0.3;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const completion = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = typeof completion?.error?.message === 'string'
      ? completion.error.message
      : `OpenAI error (${response.status})`;
    throw new Error(msg);
  }
  const content = completion?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('Empty OpenAI response');
  const parsed = JSON.parse(content) as JobAiContent;
  return {
    title: String(parsed.title || 'Private chef opportunity').trim(),
    hero_subtitle: String(parsed.hero_subtitle || '').trim(),
    summary: String(parsed.summary || '').trim(),
    bullets: Array.isArray(parsed.bullets) ? parsed.bullets.map(String) : [],
    requirements: Array.isArray(parsed.requirements) ? parsed.requirements.map(String) : [],
  };
}

async function handlePublicGet(body: Record<string, unknown>) {
  const jobId = typeof body.job_id === 'string' ? body.job_id.trim() : '';
  if (!jobId) return jsonResponse({ error: 'job_id is required' }, 400);

  const adminClient = createServiceClient();
  const { data, error } = await adminClient
    .from('event_job_pages')
    .select('id, status, ai_content, source_snapshot, published_at')
    .eq('id', jobId)
    .maybeSingle();

  if (error) throw error;
  if (!data || data.status !== 'published') {
    return jsonResponse({ error: 'Job not found' }, 404);
  }

  return jsonResponse({
    id: data.id,
    ai_content: data.ai_content,
    source_snapshot: data.source_snapshot,
    published_at: data.published_at,
  });
}

async function handleGenerate(
  body: Record<string, unknown>,
  adminClient: ReturnType<typeof createServiceClient>,
) {
  const eventId = typeof body.event_id === 'string' ? body.event_id.trim() : '';
  if (!eventId) return jsonResponse({ error: 'event_id is required' }, 400);

  const { data: event, error: eventErr } = await adminClient
    .from('events')
    .select('id, date, service_area, event_type, experience_type, cuisines_served, guest_count, status')
    .eq('id', eventId)
    .maybeSingle();
  if (eventErr) throw eventErr;
  if (!event) return jsonResponse({ error: 'Event not found' }, 404);
  if (event.status !== 'Confirmed') {
    return jsonResponse({ error: 'Event must be Confirmed to publish a job page' }, 400);
  }

  const { data: eventChefs } = await adminClient
    .from('event_chefs')
    .select('role, chef_name')
    .eq('event_id', eventId);

  const snapshot = buildChefSafeSnapshot(event, eventChefs ?? []);
  const openai = await loadOpenAI(adminClient);

  const templateContent: JobAiContent = {
    title: `${snapshot.experience_type || 'Private dining'} — ${snapshot.service_area || 'Gradito'}`,
    hero_subtitle: snapshot.event_date ? `Event date: ${snapshot.event_date}` : 'Gradito chef opportunity',
    summary: 'Join Gradito for an exceptional private dining experience.',
    bullets: snapshot.staffing_roles.map((r) => `${r.role}${r.filled ? ' (filled)' : ' (needed)'}`),
    requirements: ['Professional culinary experience', 'Ability to travel to the service area'],
  };

  let aiContent = templateContent;
  let generationError: string | null = null;

  if (openai) {
    try {
      aiContent = await callOpenAIForJob(openai.apiKey, openai.model, snapshot);
    } catch (err) {
      generationError = err instanceof Error ? err.message : 'AI generation failed';
      aiContent = templateContent;
    }
  } else {
    generationError = 'OpenAI not configured';
    aiContent = templateContent;
  }

  const now = new Date().toISOString();
  const status = generationError ? 'draft' : 'published';
  const row = {
    event_id: eventId,
    status,
    source_snapshot: snapshot,
    ai_content: aiContent,
    generation_error: generationError,
    published_at: status === 'published' ? now : null,
  };

  const { data: existing } = await adminClient
    .from('event_job_pages')
    .select('id')
    .eq('event_id', eventId)
    .maybeSingle();

  let jobPage;
  if (existing?.id) {
    const { data, error } = await adminClient
      .from('event_job_pages')
      .update(row)
      .eq('id', existing.id)
      .select('id, status, generation_error, published_at')
      .single();
    if (error) throw error;
    jobPage = data;
  } else {
    const { data, error } = await adminClient
      .from('event_job_pages')
      .insert(row)
      .select('id, status, generation_error, published_at')
      .single();
    if (error) throw error;
    jobPage = data;
  }

  return jsonResponse({ job_page: jobPage, ai_fallback: Boolean(generationError) });
}

async function handleUnpublish(body: Record<string, unknown>, adminClient: ReturnType<typeof createServiceClient>) {
  const jobId = typeof body.job_id === 'string' ? body.job_id.trim() : '';
  if (!jobId) return jsonResponse({ error: 'job_id is required' }, 400);
  const { error } = await adminClient
    .from('event_job_pages')
    .update({ status: 'unpublished', published_at: null })
    .eq('id', jobId);
  if (error) throw error;
  return jsonResponse({ ok: true });
}

type InviteChannel = 'sms' | 'email';

async function loadJobInviteTemplates(adminClient: ReturnType<typeof createServiceClient>) {
  const { data, error } = await adminClient
    .from('chef_invite_message_settings')
    .select('job_sms_template, job_email_subject, job_email_html')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  return {
    sms: data?.job_sms_template || DEFAULT_JOB_SMS_TEMPLATE,
    emailSubject: data?.job_email_subject || DEFAULT_JOB_EMAIL_SUBJECT,
    emailHtml: data?.job_email_html || DEFAULT_JOB_EMAIL_HTML,
  };
}

async function sendChefJobSms(
  adminClient: ReturnType<typeof createServiceClient>,
  userId: string,
  params: {
    chefId: string;
    eventId: string;
    content: string;
    toE164: string;
  },
): Promise<{ ok: boolean; error?: string }> {
  const settings = await loadQuoSettings(adminClient);
  if (!settings?.enabled || !quoConfigured(settings)) {
    return { ok: false, error: 'Quo integration is not enabled' };
  }
  const env = getQuoEnvConfig();
  const from = env.phoneNumberId || env.phoneNumberE164;
  if (!from) return { ok: false, error: 'QUO phone number is not configured' };

  const sendResult = await quoSendTextMessage(settings.api_key.trim(), {
    content: params.content,
    from,
    to: [params.toE164],
  });
  if (!sendResult.ok) {
    const message = (sendResult.raw as { message?: string })?.message
      || `Quo send failed (${sendResult.status})`;
    return { ok: false, error: message };
  }

  const resource = (sendResult.data as { data?: Record<string, unknown> })?.data ?? {};
  const occurredAt = typeof resource.createdAt === 'string'
    ? resource.createdAt
    : new Date().toISOString();
  await adminClient.from('quo_communication_events').insert({
    chef_id: params.chefId,
    event_id: params.eventId,
    channel: 'sms',
    direction: 'outbound',
    quo_conversation_id: typeof resource.conversationId === 'string' ? resource.conversationId : null,
    quo_message_id: typeof resource.id === 'string' ? resource.id : null,
    counterparty_phone_e164: params.toE164,
    body_text: params.content,
    payload: { resource, sent_via: 'event-job' },
    sent_by_profile_id: userId,
    occurred_at: occurredAt,
  });

  return { ok: true };
}

async function handleSendChefInvites(
  body: Record<string, unknown>,
  adminClient: ReturnType<typeof createServiceClient>,
  user: { id: string },
) {
  const eventId = typeof body.event_id === 'string' ? body.event_id.trim() : '';
  const jobPageId = typeof body.job_page_id === 'string' ? body.job_page_id.trim() : '';
  const chefIds = Array.isArray(body.chef_ids)
    ? body.chef_ids.filter((id): id is string => typeof id === 'string' && id.trim()).map((id) => id.trim())
    : [];
  const channelsRaw = Array.isArray(body.channels) ? body.channels : ['sms', 'email'];
  const channels = new Set(
    channelsRaw.filter((c): c is InviteChannel => c === 'sms' || c === 'email'),
  );
  if (!channels.size) {
    channels.add('sms');
    channels.add('email');
  }

  if (!eventId || !jobPageId) {
    return jsonResponse({ error: 'event_id and job_page_id are required' }, 400);
  }
  if (chefIds.length === 0) return jsonResponse({ error: 'chef_ids is required' }, 400);

  const { data: jobPage, error: jobErr } = await adminClient
    .from('event_job_pages')
    .select('id, event_id, status, source_snapshot')
    .eq('id', jobPageId)
    .maybeSingle();
  if (jobErr) throw jobErr;
  if (!jobPage || jobPage.event_id !== eventId) {
    return jsonResponse({ error: 'Job page not found for this event' }, 404);
  }
  if (jobPage.status !== 'published') {
    return jsonResponse({ error: 'Publish the job page before sending invitations' }, 400);
  }

  const { data: event, error: eventErr } = await adminClient
    .from('events')
    .select('id, date, service_area')
    .eq('id', eventId)
    .maybeSingle();
  if (eventErr) throw eventErr;
  if (!event) return jsonResponse({ error: 'Event not found' }, 404);

  const templates = await loadJobInviteTemplates(adminClient);

  const { data: chefs, error: chefsErr } = await adminClient
    .from('chefs')
    .select('id, first_name, last_name, email, phone, mobile, archived, gradito_messaging_opt_in')
    .in('id', chefIds);
  if (chefsErr) throw chefsErr;

  const snapshot = jobPage.source_snapshot as Record<string, unknown> | null;
  const results: Array<Record<string, unknown>> = [];

  for (const chef of chefs ?? []) {
    if (!chef || chef.archived) continue;
    const ctx = buildJobInviteContext(
      chef,
      event,
      jobPageId,
      snapshot as { service_area?: string | null; event_date?: string | null } | null,
    );

    let smsStatus: 'skipped' | 'sent' | 'failed' = 'skipped';
    let emailStatus: 'skipped' | 'sent' | 'failed' = 'skipped';
    let smsSentAt: string | null = null;
    let emailSentAt: string | null = null;
    let smsError: string | null = null;
    let emailError: string | null = null;

    if (channels.has('sms')) {
      if (chef.gradito_messaging_opt_in === false) {
        smsStatus = 'skipped';
        smsError = 'Opted out of messaging';
      } else {
        const toE164 = normalizeE164(chef.mobile || chef.phone);
        if (!toE164) {
          smsStatus = 'skipped';
          smsError = 'No valid phone';
        } else {
          const content = renderJobSmsTemplate(templates.sms, ctx);
          const sent = await sendChefJobSms(adminClient, user.id, {
            chefId: chef.id,
            eventId,
            content,
            toE164,
          });
          if (sent.ok) {
            smsStatus = 'sent';
            smsSentAt = new Date().toISOString();
          } else {
            smsStatus = 'failed';
            smsError = sent.error || 'SMS failed';
          }
        }
      }
    }

    if (channels.has('email')) {
      if (chef.gradito_messaging_opt_in === false) {
        emailStatus = 'skipped';
        emailError = 'Opted out of messaging';
      } else {
        const to = typeof chef.email === 'string' ? chef.email.trim() : '';
        if (!to || !isValidEmail(to)) {
          emailStatus = 'skipped';
          emailError = 'No valid email';
        } else {
          try {
            const subject = renderJobEmailSubject(templates.emailSubject, ctx);
            const html = renderJobEmailHtml(templates.emailHtml, ctx);
            await sendEmail(adminClient, {
              to,
              subject,
              html,
              emailType: 'job_chef_invite',
            });
            emailStatus = 'sent';
            emailSentAt = new Date().toISOString();
          } catch (err) {
            emailStatus = 'failed';
            emailError = err instanceof Error ? err.message : 'Email failed';
          }
        }
      }
    }

    const row = {
      event_job_page_id: jobPageId,
      event_id: eventId,
      chef_id: chef.id,
      sms_status: smsStatus,
      email_status: emailStatus,
      sms_sent_at: smsSentAt,
      email_sent_at: emailSentAt,
      sms_error: smsError,
      email_error: emailError,
    };

    const { data: saved, error: upsertErr } = await adminClient
      .from('event_job_chef_invitations')
      .upsert(row, { onConflict: 'event_job_page_id,chef_id' })
      .select('*')
      .single();
    if (upsertErr) throw upsertErr;
    results.push(saved);
  }

  return jsonResponse({ invitations: results });
}

const APPLICATION_RECEIPT_SUBJECT = 'We received your application';
const APPLICATION_RECEIPT_SMS = 'Gradito: We received your application. If you are a match, we will contact you.';
const APPLICATION_RECEIPT_PAGE = 'We received your application. If you are a match, we will contact you.';
const APPLICATION_ACCEPT_SUBJECT = 'Your application has been accepted';
const APPLICATION_ACCEPT_SMS = 'Gradito: Congratulations. Your application has been accepted. We will contact you shortly.';

type NoticeStatus = 'skipped' | 'sent' | 'failed';

type ApplicantMatch = {
  intakeVerified: boolean;
  chefId: string | null;
  intakeRequestId: string | null;
};

type ApplicantNotice = {
  emailStatus: NoticeStatus;
  smsStatus: NoticeStatus;
  emailError: string | null;
  smsError: string | null;
};

function phonesLooselyMatch(stored: string | null | undefined, applicantDigits: string): boolean {
  const digits = normalizePhoneDigits(stored);
  if (digits.length < 7 || applicantDigits.length < 7) return false;
  return digits === applicantDigits || digits.endsWith(applicantDigits) || applicantDigits.endsWith(digits);
}

function intakePreference(status: string | null | undefined): number {
  if (status === 'approved') return 0;
  if (status === 'pending') return 1;
  return 2;
}

function pickIntakeMatch<T extends { id: string; status?: string | null; created_at?: string | null }>(
  rows: T[],
): T | null {
  if (!rows.length) return null;
  return [...rows].sort((a, b) => {
    const rank = intakePreference(a.status) - intakePreference(b.status);
    if (rank !== 0) return rank;
    return String(b.created_at || '').localeCompare(String(a.created_at || ''));
  })[0];
}

async function resolveJobApplicantIdentity(
  adminClient: ReturnType<typeof createServiceClient>,
  email: string,
  phone: string,
): Promise<ApplicantMatch> {
  const none: ApplicantMatch = { intakeVerified: false, chefId: null, intakeRequestId: null };
  const emailNorm = normalizeEmail(email);
  const phoneDigits = normalizePhoneDigits(phone);

  if (emailNorm) {
    const { data: chefsByEmail, error: chefEmailErr } = await adminClient
      .from('chefs')
      .select('id')
      .eq('archived', false)
      .ilike('email', emailNorm)
      .limit(1);
    if (chefEmailErr) throw chefEmailErr;
    if (chefsByEmail?.[0]?.id) {
      return { intakeVerified: true, chefId: chefsByEmail[0].id, intakeRequestId: null };
    }
  }

  if (phoneDigits.length >= 7) {
    const { data: chefs, error: chefsErr } = await adminClient
      .from('chefs')
      .select('id, phone, mobile')
      .eq('archived', false);
    if (chefsErr) throw chefsErr;
    const chef = (chefs ?? []).find((row) => (
      phonesLooselyMatch(row.mobile, phoneDigits) || phonesLooselyMatch(row.phone, phoneDigits)
    ));
    if (chef?.id) {
      return { intakeVerified: true, chefId: chef.id, intakeRequestId: null };
    }
  }

  if (emailNorm) {
    const { data: intakesByEmail, error: intakeEmailErr } = await adminClient
      .from('chef_intake_requests')
      .select('id, status, created_at')
      .ilike('email', emailNorm);
    if (intakeEmailErr) throw intakeEmailErr;
    const intake = pickIntakeMatch(intakesByEmail ?? []);
    if (intake) {
      return { intakeVerified: true, chefId: null, intakeRequestId: intake.id };
    }
  }

  if (phoneDigits.length >= 7) {
    const { data: intakes, error: intakesErr } = await adminClient
      .from('chef_intake_requests')
      .select('id, mobile, status, created_at');
    if (intakesErr) throw intakesErr;
    const matches = (intakes ?? []).filter((row) => phonesLooselyMatch(row.mobile, phoneDigits));
    const intake = pickIntakeMatch(matches);
    if (intake) {
      return { intakeVerified: true, chefId: null, intakeRequestId: intake.id };
    }
  }

  return none;
}

async function sendApplicantNoticeSms(
  adminClient: ReturnType<typeof createServiceClient>,
  params: {
    chefId: string | null;
    eventId: string | null;
    content: string;
    toE164: string;
    sentByProfileId: string | null;
    sentVia: string;
  },
): Promise<{ ok: boolean; error?: string }> {
  const settings = await loadQuoSettings(adminClient);
  if (!settings?.enabled || !quoConfigured(settings)) {
    return { ok: false, error: 'Quo integration is not enabled' };
  }
  const env = getQuoEnvConfig();
  const from = env.phoneNumberId || env.phoneNumberE164;
  if (!from) return { ok: false, error: 'QUO phone number is not configured' };

  const sendResult = await quoSendTextMessage(settings.api_key.trim(), {
    content: params.content,
    from,
    to: [params.toE164],
  });
  if (!sendResult.ok) {
    const message = (sendResult.raw as { message?: string })?.message
      || `Quo send failed (${sendResult.status})`;
    return { ok: false, error: message };
  }

  const resource = (sendResult.data as { data?: Record<string, unknown> })?.data ?? {};
  const occurredAt = typeof resource.createdAt === 'string'
    ? resource.createdAt
    : new Date().toISOString();
  const { error: logErr } = await adminClient.from('quo_communication_events').insert({
    chef_id: params.chefId,
    event_id: params.eventId,
    channel: 'sms',
    direction: 'outbound',
    quo_conversation_id: typeof resource.conversationId === 'string' ? resource.conversationId : null,
    quo_message_id: typeof resource.id === 'string' ? resource.id : null,
    counterparty_phone_e164: params.toE164,
    body_text: params.content,
    payload: { resource, sent_via: params.sentVia },
    sent_by_profile_id: params.sentByProfileId,
    occurred_at: occurredAt,
  });
  if (logErr) console.error('Failed to log applicant SMS:', logErr.message);

  return { ok: true };
}

async function deliverApplicantNotice(
  adminClient: ReturnType<typeof createServiceClient>,
  params: {
    email: string;
    phone: string;
    subject: string;
    html: string;
    smsBody: string;
    emailType: string;
    chefId: string | null;
    eventId: string | null;
    sentByProfileId: string | null;
    sentVia: string;
  },
): Promise<ApplicantNotice> {
  const result: ApplicantNotice = {
    emailStatus: 'skipped',
    smsStatus: 'skipped',
    emailError: null,
    smsError: null,
  };

  if (params.email) {
    if (!isValidEmail(params.email)) {
      result.emailStatus = 'failed';
      result.emailError = 'No valid email';
    } else {
      try {
        await sendEmail(adminClient, {
          to: params.email,
          subject: params.subject,
          html: params.html,
          emailType: params.emailType,
        });
        result.emailStatus = 'sent';
      } catch (err) {
        result.emailStatus = 'failed';
        result.emailError = err instanceof Error ? err.message : 'Email failed';
      }
    }
  }

  if (params.phone) {
    const toE164 = normalizeE164(params.phone);
    if (!toE164) {
      result.smsStatus = 'failed';
      result.smsError = 'No valid phone';
    } else {
      try {
        const sent = await sendApplicantNoticeSms(adminClient, {
          chefId: params.chefId,
          eventId: params.eventId,
          content: params.smsBody,
          toE164,
          sentByProfileId: params.sentByProfileId,
          sentVia: params.sentVia,
        });
        if (sent.ok) {
          result.smsStatus = 'sent';
        } else {
          result.smsStatus = 'failed';
          result.smsError = sent.error || 'SMS failed';
        }
      } catch (err) {
        result.smsStatus = 'failed';
        result.smsError = err instanceof Error ? err.message : 'SMS failed';
      }
    }
  }

  return result;
}

async function handleSubmitApplication(body: Record<string, unknown>) {
  const jobPageId = typeof body.job_page_id === 'string' ? body.job_page_id.trim() : '';
  const firstName = typeof body.first_name === 'string' ? body.first_name.trim() : '';
  const lastName = typeof body.last_name === 'string' ? body.last_name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const intakeAttestation = body.intake_attestation === true;

  if (!jobPageId) return jsonResponse({ error: 'job_page_id is required' }, 400);
  if (!firstName || !lastName) return jsonResponse({ error: 'First and last name are required' }, 400);
  if (!email && !phone) return jsonResponse({ error: 'Email or phone is required' }, 400);

  const adminClient = createServiceClient();
  const { data: jobPage, error: jobErr } = await adminClient
    .from('event_job_pages')
    .select('id, status, event_id')
    .eq('id', jobPageId)
    .maybeSingle();
  if (jobErr) throw jobErr;
  if (!jobPage || jobPage.status !== 'published') {
    return jsonResponse({ error: 'Job not found' }, 404);
  }

  const match = await resolveJobApplicantIdentity(adminClient, email, phone);
  let status: 'pending' | 'ignored' = 'ignored';
  if (match.intakeVerified || intakeAttestation) status = 'pending';

  const { data: inserted, error: insertErr } = await adminClient
    .from('event_job_applications')
    .insert({
      event_job_page_id: jobPageId,
      first_name: firstName,
      last_name: lastName,
      email: email || null,
      phone: phone || null,
      intake_attestation: intakeAttestation,
      intake_verified: match.intakeVerified,
      matched_chef_id: match.chefId,
      matched_intake_request_id: match.intakeRequestId,
      status,
    })
    .select('id')
    .single();
  if (insertErr) throw insertErr;

  const notice = await deliverApplicantNotice(adminClient, {
    email,
    phone,
    subject: APPLICATION_RECEIPT_SUBJECT,
    html: renderApplicationReceivedEmail({ firstName }),
    smsBody: APPLICATION_RECEIPT_SMS,
    emailType: 'job_application_received',
    chefId: match.chefId,
    eventId: jobPage.event_id ?? null,
    sentByProfileId: null,
    sentVia: 'job-application-receipt',
  });

  const { error: noticeErr } = await adminClient
    .from('event_job_applications')
    .update({
      receipt_email_status: notice.emailStatus,
      receipt_sms_status: notice.smsStatus,
      receipt_email_error: notice.emailError,
      receipt_sms_error: notice.smsError,
    })
    .eq('id', inserted.id);
  if (noticeErr) console.error('Failed to record application receipt:', noticeErr.message);

  return jsonResponse({
    ok: true,
    message: APPLICATION_RECEIPT_PAGE,
  });
}

async function handleAcceptApplication(
  body: Record<string, unknown>,
  adminClient: ReturnType<typeof createServiceClient>,
  user: { id: string },
) {
  const applicationId = typeof body.application_id === 'string' ? body.application_id.trim() : '';
  if (!applicationId) return jsonResponse({ error: 'application_id is required' }, 400);

  const { data: existing, error: existingErr } = await adminClient
    .from('event_job_applications')
    .select('id, status')
    .eq('id', applicationId)
    .maybeSingle();
  if (existingErr) throw existingErr;
  if (!existing) return jsonResponse({ error: 'Application not found' }, 404);
  if (existing.status === 'accepted') {
    return jsonResponse({ ok: true, already_accepted: true });
  }

  const { data: claimed, error: claimErr } = await adminClient
    .from('event_job_applications')
    .update({ status: 'accepted' })
    .eq('id', applicationId)
    .neq('status', 'accepted')
    .select('id, first_name, email, phone, matched_chef_id, event_job_page_id')
    .maybeSingle();
  if (claimErr) throw claimErr;
  if (!claimed) {
    return jsonResponse({ ok: true, already_accepted: true });
  }

  const { data: jobPage, error: jobErr } = await adminClient
    .from('event_job_pages')
    .select('event_id')
    .eq('id', claimed.event_job_page_id)
    .maybeSingle();
  if (jobErr) throw jobErr;

  const notice = await deliverApplicantNotice(adminClient, {
    email: typeof claimed.email === 'string' ? claimed.email.trim() : '',
    phone: typeof claimed.phone === 'string' ? claimed.phone.trim() : '',
    subject: APPLICATION_ACCEPT_SUBJECT,
    html: renderApplicationAcceptedEmail({
      firstName: typeof claimed.first_name === 'string' ? claimed.first_name : '',
    }),
    smsBody: APPLICATION_ACCEPT_SMS,
    emailType: 'job_application_accepted',
    chefId: claimed.matched_chef_id ?? null,
    eventId: jobPage?.event_id ?? null,
    sentByProfileId: user.id,
    sentVia: 'job-application-accepted',
  });

  const { error: noticeErr } = await adminClient
    .from('event_job_applications')
    .update({
      acceptance_email_status: notice.emailStatus,
      acceptance_sms_status: notice.smsStatus,
      acceptance_email_error: notice.emailError,
      acceptance_sms_error: notice.smsError,
    })
    .eq('id', claimed.id);
  if (noticeErr) console.error('Failed to record acceptance notice:', noticeErr.message);

  return jsonResponse({
    ok: true,
    already_accepted: false,
    acceptance_email_status: notice.emailStatus,
    acceptance_sms_status: notice.smsStatus,
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : '';

    if (action === 'public_get') {
      return await handlePublicGet(body);
    }

    if (action === 'submit_application') {
      return await handleSubmitApplication(body);
    }

    if (action === 'accept_application') {
      const authResult = await requireAuth(req);
      if (authResult.error) return authResult.error;
      return await handleAcceptApplication(body, authResult.adminClient, authResult.user);
    }

    if (action === 'send_chef_invites') {
      const authResult = await requireAuth(req);
      if (authResult.error) return authResult.error;
      return await handleSendChefInvites(body, authResult.adminClient, authResult.user);
    }

    if (action === 'generate') {
      const authResult = await requireAuth(req);
      if (authResult.error) return authResult.error;
      return await handleGenerate(body, authResult.adminClient);
    }

    if (action === 'unpublish' || action === 'regenerate') {
      const authResult = await requireAdmin(req);
      if (authResult.error) return authResult.error;
      if (action === 'unpublish') {
        return await handleUnpublish(body, authResult.adminClient);
      }
      return await handleGenerate(body, authResult.adminClient);
    }

    return jsonResponse({ error: 'Unknown action' }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error';
    return jsonResponse({ error: message }, 500);
  }
});