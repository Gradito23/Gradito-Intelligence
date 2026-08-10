import { corsHeaders, isValidEmail, jsonResponse, requireAdmin, SECRET_MASK } from '../_shared/auth.ts';
import { renderTestEmail } from '../_shared/emailTemplates.ts';
import {
  loadResendSettings,
  packResendApiKey,
  sendResendEmail,
  toSafeResendSettings,
} from '../_shared/resend.ts';

function keepExistingSecret(input: string): boolean {
  return !input || input === SECRET_MASK;
}

/** @deprecated Use integration-email instead. Kept for backward compatibility. */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  const { user, adminClient } = auth;

  try {
    if (req.method === 'GET') {
      const settings = await loadResendSettings(adminClient);
      return jsonResponse(toSafeResendSettings(settings));
    }

    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const body = await req.json();

    if (body.action === 'get' || !body.action) {
      const settings = await loadResendSettings(adminClient);
      return jsonResponse(toSafeResendSettings(settings));
    }

    if (body.action === 'save') {
      const fromEmail = typeof body.from_email === 'string' ? body.from_email.trim() : '';
      const fromName = typeof body.from_name === 'string' ? body.from_name.trim() : 'Gradito';
      const apiKeyInput = typeof body.api_key === 'string' ? body.api_key.trim() : '';

      if (!fromEmail || !isValidEmail(fromEmail)) {
        return jsonResponse({ error: 'A valid from email is required' }, 400);
      }

      const existing = await loadResendSettings(adminClient);
      const apiKey = keepExistingSecret(apiKeyInput) ? (existing?.api_key?.trim() || '') : apiKeyInput;
      if (!apiKey) {
        return jsonResponse({ error: 'API key is required' }, 400);
      }

      const secretFields = await packResendApiKey(adminClient, apiKey);
      const { data, error } = await adminClient
        .from('integration_resend_settings')
        .upsert({
          id: 1,
          ...secretFields,
          from_email: fromEmail,
          from_name: fromName || null,
          enabled: Boolean(apiKey && fromEmail),
          updated_by: user.id,
        })
        .select('*')
        .single();

      if (error) throw error;
      return jsonResponse(toSafeResendSettings({ ...data, api_key: apiKey }));
    }

    if (body.action === 'test' || body.test_to) {
      const testTo = typeof body.test_to === 'string' ? body.test_to.trim() : '';
      if (!testTo || !isValidEmail(testTo)) {
        return jsonResponse({ error: 'A valid test recipient email is required' }, 400);
      }

      const settings = await loadResendSettings(adminClient);
      if (!settings?.api_key?.trim() || !settings.from_email?.trim()) {
        return jsonResponse({ error: 'Resend is not configured' }, 400);
      }

      const { messageId } = await sendResendEmail(settings, {
        to: testTo,
        subject: 'Gradito Intelligence — Email test',
        html: renderTestEmail(),
      });

      return jsonResponse({ ok: true, message_id: messageId });
    }

    return jsonResponse({ error: 'Unknown action' }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return jsonResponse({ error: message }, 500);
  }
});
