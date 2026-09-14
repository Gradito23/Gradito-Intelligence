import {
  corsHeaders,
  createServiceClient,
  isValidEmail,
  jsonResponse,
} from '../_shared/auth.ts';
import { sendEmail } from '../_shared/email.ts';
import { renderOnboardingGuideEmail } from '../_shared/emailTemplates.ts';

const PIXEL_GIF = Uint8Array.from(
  atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'),
  (c) => c.charCodeAt(0),
);

const TRACK_HEADERS = {
  ...corsHeaders,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function getAppUrl(): string {
  return (Deno.env.get('APP_URL')?.trim() || Deno.env.get('SITE_URL')?.trim() || '').replace(/\/$/, '');
}

function functionBaseUrl(): string {
  const supabaseUrl = (Deno.env.get('SUPABASE_URL') || '').replace(/\/$/, '');
  return `${supabaseUrl}/functions/v1/onboarding-guide-email`;
}

function withAnonKey(url: string): string {
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  if (!anonKey) return url;
  const join = url.includes('?') ? '&' : '?';
  return `${url}${join}apikey=${encodeURIComponent(anonKey)}`;
}

function pixelResponse() {
  return new Response(PIXEL_GIF, {
    status: 200,
    headers: {
      ...TRACK_HEADERS,
      'Content-Type': 'image/gif',
      'Content-Length': String(PIXEL_GIF.byteLength),
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    },
  });
}

async function markDeliveryEvent(
  adminClient: ReturnType<typeof createServiceClient>,
  token: string,
  event: 'open' | 'click',
) {
  const column = event === 'open' ? 'opened_at' : 'clicked_at';
  const { data, error } = await adminClient
    .from('onboarding_guide_deliveries')
    .select('id, guide_url, status, opened_at, clicked_at')
    .eq('token', token)
    .maybeSingle();

  if (error || !data || data.status !== 'sent') return data ?? null;

  if (!data[column]) {
    const { error: updateError } = await adminClient
      .from('onboarding_guide_deliveries')
      .update({ [column]: new Date().toISOString() })
      .eq('id', data.id);
    if (updateError) console.error('Failed to mark delivery event:', updateError.message);
  }

  return data;
}

async function handleClick(
  adminClient: ReturnType<typeof createServiceClient>,
  token: string,
) {
  const row = await markDeliveryEvent(adminClient, token, 'click');
  return row?.guide_url || null;
}

async function handleSend(body: Record<string, unknown>) {
  const firstName = typeof body.first_name === 'string' ? body.first_name.trim() : '';
  const lastName = typeof body.last_name === 'string' ? body.last_name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!email || !isValidEmail(email)) {
    return jsonResponse({ sent: false, reason: 'invalid_email' });
  }

  const adminClient = createServiceClient();
  const { data: settings, error: settingsError } = await adminClient
    .from('onboarding_guide_settings')
    .select('title, url, enabled')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .maybeSingle();

  if (settingsError) {
    console.error('Failed to load onboarding guide settings:', settingsError.message);
    return jsonResponse({ sent: false, reason: 'settings_error' });
  }

  const guideUrl = typeof settings?.url === 'string' ? settings.url.trim() : '';
  if (!settings?.enabled || !guideUrl) {
    return jsonResponse({ sent: false, reason: 'disabled' });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await adminClient
    .from('onboarding_guide_deliveries')
    .select('id')
    .eq('recipient_email', email)
    .eq('status', 'sent')
    .gte('sent_at', since)
    .limit(1);

  if (recent?.length) {
    return jsonResponse({ sent: true, duplicate: true });
  }

  const token = crypto.randomUUID();
  const recipientName = [firstName, lastName].filter(Boolean).join(' ') || email;
  const guideTitle = (typeof settings.title === 'string' && settings.title.trim())
    || 'Chef & FOH Onboarding Guide';
  const appUrl = getAppUrl();
  const ctaUrl = appUrl ? `${appUrl}/guide/${token}` : withAnonKey(`${functionBaseUrl()}?t=${token}&e=click`);
  const openPixelUrl = withAnonKey(`${functionBaseUrl()}?t=${token}&e=open`);

  try {
    await sendEmail(adminClient, {
      to: email,
      subject: `${guideTitle} from Gradito`,
      html: renderOnboardingGuideEmail({
        chefName: firstName || recipientName,
        guideTitle,
        ctaUrl,
        openPixelUrl,
      }),
      emailType: 'onboarding_guide',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Send failed';
    console.error('Onboarding guide email failed:', message);
    await adminClient.from('onboarding_guide_deliveries').insert({
      token,
      recipient_name: recipientName,
      recipient_email: email,
      guide_url: guideUrl,
      status: 'failed',
      error_message: message,
    });
    return jsonResponse({ sent: false, reason: 'send_failed' });
  }

  const { error: insertError } = await adminClient.from('onboarding_guide_deliveries').insert({
    token,
    recipient_name: recipientName,
    recipient_email: email,
    guide_url: guideUrl,
    status: 'sent',
  });
  if (insertError) console.error('Failed to insert delivery:', insertError.message);

  const { error: logError } = await adminClient.from('activity_logs').insert({
    actor: 'Intake Form',
    action: 'Emailed',
    entity_type: 'UserGuide',
    entity_label: recipientName,
    summary: `User guide emailed to ${recipientName} (${email})`,
  });
  if (logError) console.error('Failed to write activity log:', logError.message);

  return jsonResponse({ sent: true });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: TRACK_HEADERS });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get('t')?.trim() || '';
  const event = url.searchParams.get('e')?.trim() || '';

  try {
    if (req.method === 'GET' && token) {
      const adminClient = createServiceClient();
      if (event === 'open') {
        await markDeliveryEvent(adminClient, token, 'open');
        return pixelResponse();
      }
      if (event === 'click') {
        const guideUrl = await handleClick(adminClient, token);
        if (guideUrl) {
          return new Response(null, {
            status: 302,
            headers: { ...TRACK_HEADERS, Location: guideUrl },
          });
        }
        return jsonResponse({ error: 'Guide link not found' }, 404);
      }
    }

    if (req.method !== 'POST') {
      if (event === 'open') return pixelResponse();
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const action = typeof body.action === 'string' ? body.action : '';
    const bodyToken = typeof body.token === 'string' ? body.token.trim() : '';

    if (action === 'click' && bodyToken) {
      const adminClient = createServiceClient();
      const guideUrl = await handleClick(adminClient, bodyToken);
      if (!guideUrl) return jsonResponse({ error: 'Guide link not found' }, 404);
      return jsonResponse({ url: guideUrl });
    }

    return await handleSend(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('onboarding-guide-email error:', message);
    if (event === 'open') return pixelResponse();
    return jsonResponse({ sent: false, reason: 'error' });
  }
});
