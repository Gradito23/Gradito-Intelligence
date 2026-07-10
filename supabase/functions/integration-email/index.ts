import {
  corsHeaders,
  createServiceClient,
  isValidEmail,
  jsonResponse,
  requireAdmin,
  SECRET_MASK,
} from '../_shared/auth.ts';
import { buildEmailAnalytics, logEmail, sendEmail } from '../_shared/email.ts';
import {
  loadResendSettings,
  sendResendEmail,
  toSafeResendSettings,
} from '../_shared/resend.ts';
import { CustomSmtpConfig, sendCustomSmtpEmail } from '../_shared/smtp.ts';

type SafeCustomSmtpConfig = Omit<CustomSmtpConfig, 'password'> & {
  password_masked: string;
};

function maskCustomConfig(row: CustomSmtpConfig): SafeCustomSmtpConfig {
  const { password, ...rest } = row;
  return {
    ...rest,
    password_masked: password?.trim() ? SECRET_MASK : '',
  };
}

async function loadCustomConfigs(adminClient: ReturnType<typeof createServiceClient>) {
  const { data, error } = await adminClient
    .from('custom_smtp_configs')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data as CustomSmtpConfig[]).map(maskCustomConfig);
}

async function loadProviderSettings(adminClient: ReturnType<typeof createServiceClient>) {
  const { data, error } = await adminClient
    .from('email_provider_settings')
    .select('active_provider, updated_at')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw error;
  return data ?? { active_provider: 'resend', updated_at: null };
}

async function handleGet(adminClient: ReturnType<typeof createServiceClient>) {
  const [provider, resend, customConfigs, analytics] = await Promise.all([
    loadProviderSettings(adminClient),
    loadResendSettings(adminClient),
    loadCustomConfigs(adminClient),
    buildEmailAnalytics(adminClient),
  ]);

  const activeCustom = customConfigs.find((c) => c.is_active) ?? null;

  return jsonResponse({
    active_provider: provider.active_provider,
    provider_updated_at: provider.updated_at,
    resend: toSafeResendSettings(resend),
    custom_smtp_configs: customConfigs,
    active_custom_smtp: activeCustom,
    analytics,
  });
}

async function handleSetActiveProvider(
  body: Record<string, unknown>,
  user: { id: string },
  adminClient: ReturnType<typeof createServiceClient>,
) {
  const provider = body.provider;
  if (provider !== 'resend' && provider !== 'custom_smtp') {
    return jsonResponse({ error: 'provider must be resend or custom_smtp' }, 400);
  }

  if (provider === 'custom_smtp') {
    const { count, error } = await adminClient
      .from('custom_smtp_configs')
      .select('id', { count: 'exact', head: true });

    if (error) throw error;
    if (!count || count === 0) {
      return jsonResponse({ error: 'Add a Custom SMTP configuration first' }, 400);
    }

    const { data: activeRow } = await adminClient
      .from('custom_smtp_configs')
      .select('id')
      .eq('is_active', true)
      .maybeSingle();

    if (!activeRow) {
      const { data: first } = await adminClient
        .from('custom_smtp_configs')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (first) {
        await adminClient.from('custom_smtp_configs').update({ is_active: false }).neq('id', first.id);
        await adminClient.from('custom_smtp_configs').update({ is_active: true }).eq('id', first.id);
      }
    }
  }

  const { error } = await adminClient
    .from('email_provider_settings')
    .upsert({ id: 1, active_provider: provider, updated_by: user.id });

  if (error) throw error;
  return handleGet(adminClient);
}

async function handleSaveResend(
  body: Record<string, unknown>,
  user: { id: string },
  adminClient: ReturnType<typeof createServiceClient>,
) {
  const fromEmail = typeof body.from_email === 'string' ? body.from_email.trim() : '';
  const fromName = typeof body.from_name === 'string' ? body.from_name.trim() : 'Gradito';
  const apiKeyInput = typeof body.api_key === 'string' ? body.api_key.trim() : '';

  if (!fromEmail || !isValidEmail(fromEmail)) {
    return jsonResponse({ error: 'A valid sender email is required' }, 400);
  }

  const existing = await loadResendSettings(adminClient);
  const apiKey = apiKeyInput || existing?.api_key?.trim() || '';
  if (!apiKey) {
    return jsonResponse({ error: 'API key is required' }, 400);
  }

  const enabled = Boolean(apiKey && fromEmail);

  const { data, error } = await adminClient
    .from('integration_resend_settings')
    .upsert({
      id: 1,
      api_key: apiKey,
      from_email: fromEmail,
      from_name: fromName || null,
      enabled,
      updated_by: user.id,
    })
    .select('*')
    .single();

  if (error) throw error;
  return jsonResponse({ resend: toSafeResendSettings(data) });
}

async function handleTestResend(
  body: Record<string, unknown>,
  adminClient: ReturnType<typeof createServiceClient>,
) {
  const testTo = typeof body.test_to === 'string' ? body.test_to.trim() : '';
  if (!testTo || !isValidEmail(testTo)) {
    return jsonResponse({ error: 'A valid test recipient email is required' }, 400);
  }

  const settings = await loadResendSettings(adminClient);
  if (!settings?.api_key?.trim() || !settings.from_email?.trim()) {
    return jsonResponse({ error: 'Resend is not configured' }, 400);
  }

  const subject = 'Gradito — Resend test email';
  const html = '<p>Your Resend integration is working.</p>';

  try {
    const { messageId } = await sendResendEmail(settings, { to: testTo, subject, html });
    await logEmail(adminClient, {
      email_type: 'test',
      recipient: testTo,
      provider: 'resend',
      status: 'sent',
      subject,
    });
    return jsonResponse({ ok: true, message_id: messageId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Send failed';
    await logEmail(adminClient, {
      email_type: 'test',
      recipient: testTo,
      provider: 'resend',
      status: 'failed',
      error_message: message,
      subject,
    });
    return jsonResponse({ error: message }, 400);
  }
}

async function resolveCustomConfigForSave(
  body: Record<string, unknown>,
  adminClient: ReturnType<typeof createServiceClient>,
): Promise<{ error?: Response; config?: Partial<CustomSmtpConfig> & { id?: string } }> {
  const id = typeof body.id === 'string' ? body.id : undefined;
  const smtpHost = typeof body.smtp_host === 'string' ? body.smtp_host.trim() : '';
  const smtpPort = Number(body.smtp_port);
  const encryption = body.encryption === 'ssl' ? 'ssl' : 'tls';
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const passwordInput = typeof body.password === 'string' ? body.password.trim() : '';
  const fromName = typeof body.from_name === 'string' ? body.from_name.trim() : 'Gradito';
  const fromEmail = typeof body.from_email === 'string' ? body.from_email.trim() : '';

  if (!smtpHost) return { error: jsonResponse({ error: 'SMTP host is required' }, 400) };
  if (!smtpPort || smtpPort < 1 || smtpPort > 65535) {
    return { error: jsonResponse({ error: 'A valid SMTP port is required' }, 400) };
  }
  if (!username) return { error: jsonResponse({ error: 'Username is required' }, 400) };
  if (!fromEmail || !isValidEmail(fromEmail)) {
    return { error: jsonResponse({ error: 'A valid from email is required' }, 400) };
  }

  let password = passwordInput;
  if (id) {
    const { data: existing, error } = await adminClient
      .from('custom_smtp_configs')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!existing) return { error: jsonResponse({ error: 'Configuration not found' }, 404) };
    if (!password) password = existing.password;
  } else if (!password) {
    return { error: jsonResponse({ error: 'Password is required for new configurations' }, 400) };
  }

  return {
    config: {
      id,
      smtp_host: smtpHost,
      smtp_port: smtpPort,
      encryption,
      username,
      password,
      from_name: fromName || null,
      from_email: fromEmail,
    },
  };
}

async function handleSaveCustomSmtp(
  body: Record<string, unknown>,
  user: { id: string },
  adminClient: ReturnType<typeof createServiceClient>,
) {
  const resolved = await resolveCustomConfigForSave(body, adminClient);
  if (resolved.error) return resolved.error;
  const cfg = resolved.config!;

  if (cfg.id) {
    const { data, error } = await adminClient
      .from('custom_smtp_configs')
      .update({
        smtp_host: cfg.smtp_host,
        smtp_port: cfg.smtp_port,
        encryption: cfg.encryption,
        username: cfg.username,
        password: cfg.password,
        from_name: cfg.from_name,
        from_email: cfg.from_email,
        updated_by: user.id,
      })
      .eq('id', cfg.id)
      .select('*')
      .single();

    if (error) throw error;
    return jsonResponse({ config: maskCustomConfig(data as CustomSmtpConfig) });
  }

  const { count } = await adminClient
    .from('custom_smtp_configs')
    .select('id', { count: 'exact', head: true });

  const isFirst = !count || count === 0;

  const { data, error } = await adminClient
    .from('custom_smtp_configs')
    .insert({
      smtp_host: cfg.smtp_host,
      smtp_port: cfg.smtp_port,
      encryption: cfg.encryption,
      username: cfg.username,
      password: cfg.password,
      from_name: cfg.from_name,
      from_email: cfg.from_email,
      is_active: isFirst,
      updated_by: user.id,
    })
    .select('*')
    .single();

  if (error) throw error;
  return jsonResponse({ config: maskCustomConfig(data as CustomSmtpConfig) });
}

async function pickNextActiveConfig(
  adminClient: ReturnType<typeof createServiceClient>,
  excludeId: string,
): Promise<string | null> {
  const { data: tested } = await adminClient
    .from('custom_smtp_configs')
    .select('id')
    .neq('id', excludeId)
    .not('last_tested_at', 'is', null)
    .order('last_tested_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (tested?.id) return tested.id;

  const { data: newest } = await adminClient
    .from('custom_smtp_configs')
    .select('id')
    .neq('id', excludeId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return newest?.id ?? null;
}

async function handleDeleteCustomSmtp(
  body: Record<string, unknown>,
  user: { id: string },
  adminClient: ReturnType<typeof createServiceClient>,
) {
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return jsonResponse({ error: 'id is required' }, 400);

  const { data: row, error } = await adminClient
    .from('custom_smtp_configs')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!row) return jsonResponse({ error: 'Configuration not found' }, 404);

  const { count } = await adminClient
    .from('custom_smtp_configs')
    .select('id', { count: 'exact', head: true });

  const isLast = (count ?? 0) <= 1;
  let warning: string | undefined;

  if (row.is_active && !isLast) {
    const nextId = await pickNextActiveConfig(adminClient, id);
    if (nextId) {
      await adminClient.from('custom_smtp_configs').update({ is_active: false }).neq('id', nextId);
      await adminClient.from('custom_smtp_configs').update({ is_active: true }).eq('id', nextId);
    }
  }

  if (row.is_active && isLast) {
    const provider = await loadProviderSettings(adminClient);
    if (provider.active_provider === 'custom_smtp') {
      await adminClient
        .from('email_provider_settings')
        .upsert({ id: 1, active_provider: 'resend', updated_by: user.id });
      warning = 'Last Custom SMTP configuration removed. Active provider switched to Resend.';
    }
  }

  const { error: deleteError } = await adminClient
    .from('custom_smtp_configs')
    .delete()
    .eq('id', id);

  if (deleteError) throw deleteError;

  const response = await handleGet(adminClient);
  const parsed = await response.json();
  return jsonResponse({ ...parsed, warning });
}

async function handleSetActiveCustomSmtp(
  body: Record<string, unknown>,
  adminClient: ReturnType<typeof createServiceClient>,
) {
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return jsonResponse({ error: 'id is required' }, 400);

  const { data: row, error } = await adminClient
    .from('custom_smtp_configs')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!row) return jsonResponse({ error: 'Configuration not found' }, 404);

  await adminClient.from('custom_smtp_configs').update({ is_active: false }).neq('id', id);
  const { error: updateError } = await adminClient
    .from('custom_smtp_configs')
    .update({ is_active: true })
    .eq('id', id);

  if (updateError) throw updateError;
  return handleGet(adminClient);
}

async function resolveConfigForTest(
  body: Record<string, unknown>,
  adminClient: ReturnType<typeof createServiceClient>,
): Promise<{ error?: Response; config?: CustomSmtpConfig; configId?: string }> {
  const id = typeof body.id === 'string' ? body.id : undefined;

  if (id) {
    const { data, error } = await adminClient
      .from('custom_smtp_configs')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return { error: jsonResponse({ error: 'Configuration not found' }, 404) };

    const resolved = await resolveCustomConfigForSave({ ...body, id, password: body.password }, adminClient);
    if (resolved.error) return { error: resolved.error };

    return {
      config: { ...(data as CustomSmtpConfig), ...resolved.config, password: resolved.config!.password! },
      configId: id,
    };
  }

  const resolved = await resolveCustomConfigForSave(body, adminClient);
  if (resolved.error) return { error: resolved.error };
  return { config: resolved.config as CustomSmtpConfig };
}

async function handleTestCustomSmtp(
  body: Record<string, unknown>,
  adminClient: ReturnType<typeof createServiceClient>,
) {
  const testTo = typeof body.test_to === 'string' ? body.test_to.trim() : '';
  if (!testTo || !isValidEmail(testTo)) {
    return jsonResponse({ error: 'A valid test recipient email is required' }, 400);
  }

  const resolved = await resolveConfigForTest(body, adminClient);
  if (resolved.error) return resolved.error;

  const config = resolved.config!;
  const configId = resolved.configId;
  const subject = 'Gradito — Custom SMTP test email';
  const html = '<p>Your Custom SMTP integration is working.</p>';

  try {
    await sendCustomSmtpEmail(config, { to: testTo, subject, html }, { verify: true });

    if (configId) {
      await adminClient
        .from('custom_smtp_configs')
        .update({
          last_tested_at: new Date().toISOString(),
          last_test_status: 'success',
          last_test_error: null,
        })
        .eq('id', configId);
    }

    await logEmail(adminClient, {
      email_type: 'test',
      recipient: testTo,
      provider: 'custom_smtp',
      custom_smtp_config_id: configId ?? null,
      status: 'sent',
      subject,
    });

    return jsonResponse({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Send failed';

    if (configId) {
      await adminClient
        .from('custom_smtp_configs')
        .update({
          last_tested_at: new Date().toISOString(),
          last_test_status: 'failed',
          last_test_error: message,
        })
        .eq('id', configId);
    }

    await logEmail(adminClient, {
      email_type: 'test',
      recipient: testTo,
      provider: 'custom_smtp',
      custom_smtp_config_id: configId ?? null,
      status: 'failed',
      error_message: message,
      subject,
    });

    return jsonResponse({ error: message }, 400);
  }
}

async function handleListLogs(
  body: Record<string, unknown>,
  adminClient: ReturnType<typeof createServiceClient>,
) {
  const limit = Math.min(Math.max(Number(body.limit) || 50, 1), 200);
  const offset = Math.max(Number(body.offset) || 0, 0);

  const { data, error, count } = await adminClient
    .from('email_logs')
    .select('id, email_type, recipient, provider, status, error_message, subject, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return jsonResponse({ logs: data ?? [], total: count ?? 0 });
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;
    const { user, adminClient } = auth;

    const body = await req.json();
    const action = body.action;

    switch (action) {
      case 'get':
        return handleGet(adminClient);
      case 'set_active_provider':
        return handleSetActiveProvider(body, user, adminClient);
      case 'save_resend':
        return handleSaveResend(body, user, adminClient);
      case 'test_resend':
        return handleTestResend(body, adminClient);
      case 'save_custom_smtp':
        return handleSaveCustomSmtp(body, user, adminClient);
      case 'delete_custom_smtp':
        return handleDeleteCustomSmtp(body, user, adminClient);
      case 'set_active_custom_smtp':
        return handleSetActiveCustomSmtp(body, adminClient);
      case 'test_custom_smtp':
        return handleTestCustomSmtp(body, adminClient);
      case 'list_logs':
        return handleListLogs(body, adminClient);
      case 'send':
        return handleSend(body, adminClient);
      default:
        return jsonResponse({ error: 'Unknown action' }, 400);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('integration-email error:', message);
    return jsonResponse({ error: message }, 500);
  }
});

async function handleSend(
  body: Record<string, unknown>,
  adminClient: ReturnType<typeof createServiceClient>,
) {
  const to = typeof body.to === 'string' ? body.to.trim() : '';
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const html = typeof body.html === 'string' ? body.html : '';
  const emailType = typeof body.email_type === 'string' ? body.email_type : 'notification';

  if (!to || !isValidEmail(to)) {
    return jsonResponse({ error: 'A valid recipient email is required' }, 400);
  }
  if (!subject) return jsonResponse({ error: 'subject is required' }, 400);
  if (!html) return jsonResponse({ error: 'html is required' }, 400);

  const result = await sendEmail(adminClient, { to, subject, html, emailType });
  return jsonResponse({ ok: true, ...result });
}
