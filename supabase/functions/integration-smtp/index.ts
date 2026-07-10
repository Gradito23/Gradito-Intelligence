import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  createServiceClient,
  loadSmtpSettings,
  sendResendEmail,
  toSafeSettings,
} from '../_shared/resend.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { error: jsonResponse({ error: 'Unauthorized' }, 401) };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) {
    return { error: jsonResponse({ error: 'Server configuration error' }, 500) };
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) {
    return { error: jsonResponse({ error: 'Unauthorized' }, 401) };
  }

  const adminClient = createServiceClient();
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || profile?.role !== 'admin') {
    return { error: jsonResponse({ error: 'Forbidden' }, 403) };
  }

  return { user, adminClient };
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  const { user, adminClient } = auth;

  try {
    if (req.method === 'GET') {
      const settings = await loadSmtpSettings(adminClient);
      return jsonResponse(toSafeSettings(settings));
    }

    if (req.method === 'PUT') {
      const body = await req.json();
      return await handleSave(body, user, adminClient);
    }

    if (req.method === 'POST') {
      const body = await req.json();

      if (body.action === 'get') {
        const settings = await loadSmtpSettings(adminClient);
        return jsonResponse(toSafeSettings(settings));
      }

      if (body.action === 'save') {
        return await handleSave(body, user, adminClient);
      }

      if (body.action === 'test' || body.test_to) {
        const testTo = typeof body.test_to === 'string' ? body.test_to.trim() : '';
        if (!testTo || !isValidEmail(testTo)) {
          return jsonResponse({ error: 'A valid test recipient email is required' }, 400);
        }

        const settings = await loadSmtpSettings(adminClient);
        if (!settings?.api_key?.trim() || !settings.from_email?.trim()) {
          return jsonResponse({ error: 'SMTP integration is not configured' }, 400);
        }

        const { messageId } = await sendResendEmail(settings, {
          to: testTo,
          subject: 'Gradito — SMTP test email',
          html: '<p>Your Resend integration is working.</p>',
        });

        return jsonResponse({ ok: true, message_id: messageId });
      }

      return jsonResponse({ error: 'Unknown action' }, 400);
    }

    return jsonResponse({ error: 'Method not allowed' }, 405);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return jsonResponse({ error: message }, 500);
  }
});

async function handleSave(
  body: Record<string, unknown>,
  user: { id: string },
  adminClient: ReturnType<typeof createServiceClient>,
) {
  const smtpPort = Number(body.smtp_port);
  const fromEmail = typeof body.from_email === 'string' ? body.from_email.trim() : '';
  const fromName = typeof body.from_name === 'string' ? body.from_name.trim() : '';
  const apiKeyInput = typeof body.api_key === 'string' ? body.api_key.trim() : '';

  if (![465, 587].includes(smtpPort)) {
    return jsonResponse({ error: 'SMTP port must be 465 or 587' }, 400);
  }
  if (!fromEmail || !isValidEmail(fromEmail)) {
    return jsonResponse({ error: 'A valid from email is required' }, 400);
  }

  const existing = await loadSmtpSettings(adminClient);
  const apiKey = apiKeyInput || existing?.api_key?.trim() || '';
  if (!apiKey) {
    return jsonResponse({ error: 'API key is required' }, 400);
  }

  const enabled = Boolean(apiKey && fromEmail);

  const { data, error } = await adminClient
    .from('integration_smtp_settings')
    .upsert({
      id: 1,
      provider: 'resend',
      smtp_host: 'smtp.resend.com',
      smtp_port: smtpPort,
      smtp_username: 'resend',
      api_key: apiKey,
      from_email: fromEmail,
      from_name: fromName || null,
      enabled,
      updated_by: user.id,
    })
    .select('*')
    .single();

  if (error) throw error;
  return jsonResponse(toSafeSettings(data));
}
