import {
  corsHeaders,
  createServiceClient,
  isValidEmail,
  jsonResponse,
} from '../_shared/auth.ts';
import { sendEmail } from '../_shared/email.ts';
import { renderPasswordResetEmail } from '../_shared/emailTemplates.ts';

function getAppUrl(): string {
  return Deno.env.get('APP_URL')?.trim() || Deno.env.get('SITE_URL')?.trim() || '';
}

function requireAppUrl(): string {
  const appUrl = getAppUrl();
  if (!appUrl) {
    throw new Error(
      'Set APP_URL secret on the auth-password-reset edge function (e.g. http://localhost:5173 or your production URL).',
    );
  }
  return appUrl.replace(/\/$/, '');
}

async function handlePasswordReset(email: string) {
  const adminClient = createServiceClient();
  const appUrl = requireAppUrl();
  const redirectTo = `${appUrl}/reset-password`;

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email: email.trim().toLowerCase(),
    options: { redirectTo },
  });

  if (error || !data?.properties?.action_link) {
    console.warn('Password reset link not generated:', error?.message ?? 'no action link');
    return;
  }

  const actionLink = data.properties.action_link;
  const recipientName = typeof data.user?.user_metadata?.display_name === 'string'
    ? data.user.user_metadata.display_name
    : null;

  try {
    await sendEmail(adminClient, {
      to: email.trim().toLowerCase(),
      subject: 'Reset your Gradito Intelligence password',
      html: renderPasswordResetEmail({ recipientName, actionLink }),
      emailType: 'password_reset',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send password reset email';
    console.error('Password reset email failed:', message);
  }
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
    const email = typeof body.email === 'string' ? body.email.trim() : '';

    if (!email || !isValidEmail(email)) {
      return jsonResponse({ error: 'A valid email is required' }, 400);
    }

    await handlePasswordReset(email);

    return jsonResponse({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('auth-password-reset error:', message);
    return jsonResponse({ ok: true });
  }
});
