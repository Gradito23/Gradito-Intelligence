import {
  corsHeaders,
  createServiceClient,
  isValidEmail,
  jsonResponse,
  requireAuth,
} from '../_shared/auth.ts';
import { sendEmail } from '../_shared/email.ts';
import { renderIntakeApprovedEmail } from '../_shared/emailTemplates.ts';
import {
  getAppBaseUrl,
  INTAKE_APPROVED_EMAIL_SUBJECT,
  renderIntakeApprovedSms,
} from '../_shared/intakeApprovalNotify.ts';
import {
  getQuoEnvConfig,
  loadQuoSettings,
  normalizeE164,
  quoConfigured,
  quoSendTextMessage,
} from '../_shared/quo.ts';

type ChannelResult = {
  status: 'sent' | 'skipped' | 'failed';
  reason?: string;
};

async function sendApprovalSms(
  adminClient: ReturnType<typeof createServiceClient>,
  userId: string,
  params: { chefId: string; content: string; toE164: string },
): Promise<ChannelResult> {
  const settings = await loadQuoSettings(adminClient);
  if (!settings?.enabled || !quoConfigured(settings)) {
    return { status: 'skipped', reason: 'quo_not_configured' };
  }
  const env = getQuoEnvConfig();
  const from = env.phoneNumberId || env.phoneNumberE164;
  if (!from) return { status: 'skipped', reason: 'quo_phone_not_configured' };

  const sendResult = await quoSendTextMessage(settings.api_key.trim(), {
    content: params.content,
    from,
    to: [params.toE164],
  });
  if (!sendResult.ok) {
    const message = (sendResult.raw as { message?: string })?.message
      || `Quo send failed (${sendResult.status})`;
    return { status: 'failed', reason: message };
  }

  const resource = (sendResult.data as { data?: Record<string, unknown> })?.data ?? {};
  const occurredAt = typeof resource.createdAt === 'string'
    ? resource.createdAt
    : new Date().toISOString();
  await adminClient.from('quo_communication_events').insert({
    chef_id: params.chefId,
    channel: 'sms',
    direction: 'outbound',
    quo_conversation_id: typeof resource.conversationId === 'string' ? resource.conversationId : null,
    quo_message_id: typeof resource.id === 'string' ? resource.id : null,
    counterparty_phone_e164: params.toE164,
    body_text: params.content,
    payload: { resource, sent_via: 'chef-intake-approve-notify' },
    sent_by_profile_id: userId,
    occurred_at: occurredAt,
  });

  return { status: 'sent' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const auth = await requireAuth(req);
    if (auth.error) return auth.error;

    const body = await req.json().catch(() => ({}));
    const intakeRequestId = typeof body.intake_request_id === 'string'
      ? body.intake_request_id.trim()
      : '';
    if (!intakeRequestId) {
      return jsonResponse({ error: 'intake_request_id is required' }, 400);
    }

    const { adminClient, user } = auth;
    const { data: intake, error: intakeErr } = await adminClient
      .from('chef_intake_requests')
      .select(
        'id, status, chef_id, first_name, last_name, email, mobile, payload, approval_welcome_email_sent_at, approval_welcome_sms_sent_at',
      )
      .eq('id', intakeRequestId)
      .maybeSingle();
    if (intakeErr) throw intakeErr;
    if (!intake) return jsonResponse({ error: 'Intake request not found' }, 404);
    if (intake.status !== 'approved') {
      return jsonResponse({ error: 'Intake request is not approved' }, 400);
    }
    if (!intake.chef_id) {
      return jsonResponse({ error: 'Intake has no chef_id' }, 400);
    }

    const emailDone = Boolean(intake.approval_welcome_email_sent_at);
    const smsDone = Boolean(intake.approval_welcome_sms_sent_at);
    if (emailDone && smsDone) {
      return jsonResponse({
        ok: true,
        email: { status: 'skipped', reason: 'already_sent' },
        sms: { status: 'skipped', reason: 'already_sent' },
      });
    }

    const { data: chef, error: chefErr } = await adminClient
      .from('chefs')
      .select('id, first_name, email, phone, mobile, gradito_messaging_opt_in, archived')
      .eq('id', intake.chef_id)
      .maybeSingle();
    if (chefErr) throw chefErr;
    if (!chef || chef.archived) {
      return jsonResponse({ error: 'Chef not found' }, 404);
    }

    const payload = (intake.payload && typeof intake.payload === 'object')
      ? intake.payload as Record<string, unknown>
      : {};
    const firstName = intake.first_name || chef.first_name || 'Chef';
    const email = (intake.email || chef.email || '').trim().toLowerCase();
    const toE164 = normalizeE164(chef.mobile || chef.phone || intake.mobile);
    const messagingOptIn = chef.gradito_messaging_opt_in !== false
      && payload.gradito_messaging_opt_in !== false;

    let emailResult: ChannelResult = emailDone
      ? { status: 'skipped', reason: 'already_sent' }
      : { status: 'skipped', reason: 'no_email' };
    let smsResult: ChannelResult = smsDone
      ? { status: 'skipped', reason: 'already_sent' }
      : { status: 'skipped', reason: 'no_phone' };

    const now = new Date().toISOString();
    const updateRow: Record<string, unknown> = {};
    const errors: string[] = [];

    if (!emailDone && email && isValidEmail(email)) {
      try {
        const html = renderIntakeApprovedEmail({
          firstName,
          appUrl: getAppBaseUrl() || undefined,
        });
        await sendEmail(adminClient, {
          to: email,
          subject: INTAKE_APPROVED_EMAIL_SUBJECT,
          html,
          emailType: 'chef_intake_approved',
        });
        emailResult = { status: 'sent' };
        updateRow.approval_welcome_email_sent_at = now;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Email failed';
        emailResult = { status: 'failed', reason: message };
        errors.push(`email: ${message}`);
      }
    } else if (!emailDone) {
      emailResult = { status: 'skipped', reason: email ? 'invalid_email' : 'no_email' };
    }

    if (!smsDone) {
      if (!messagingOptIn) {
        smsResult = { status: 'skipped', reason: 'messaging_opt_out' };
      } else if (!toE164) {
        smsResult = { status: 'skipped', reason: 'no_phone' };
      } else {
        const content = renderIntakeApprovedSms(firstName);
        smsResult = await sendApprovalSms(adminClient, user.id, {
          chefId: chef.id,
          content,
          toE164,
        });
        if (smsResult.status === 'sent') {
          updateRow.approval_welcome_sms_sent_at = now;
        } else if (smsResult.status === 'failed' && smsResult.reason) {
          errors.push(`sms: ${smsResult.reason}`);
        }
      }
    }

    if (errors.length) {
      updateRow.approval_notify_error = errors.join('; ');
    } else if (emailResult.status === 'sent' || smsResult.status === 'sent') {
      updateRow.approval_notify_error = null;
    }

    if (Object.keys(updateRow).length > 0) {
      await adminClient
        .from('chef_intake_requests')
        .update(updateRow)
        .eq('id', intakeRequestId);
    }

    return jsonResponse({
      ok: true,
      email: emailResult,
      sms: smsResult,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('chef-intake-approve-notify:', message);
    return jsonResponse({ error: message }, 500);
  }
});