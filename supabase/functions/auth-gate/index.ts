import {
  corsHeaders,
  createServiceClient,
  jsonResponse,
} from '../_shared/auth.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function hookReject(message: string, httpCode = 403) {
  return new Response(
    JSON.stringify({
      error: {
        message,
        http_code: httpCode,
      },
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
}

function hookAllow() {
  return new Response('{}', {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function isEmailProvisioned(
  adminClient: ReturnType<typeof createServiceClient>,
  email: string,
): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  const { data, error } = await adminClient
    .from('provisioned_emails')
    .select('email')
    .eq('email', normalized)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

async function handleBeforeUserCreated(
  payload: Record<string, unknown>,
  adminClient: ReturnType<typeof createServiceClient>,
) {
  const user = payload.user as Record<string, unknown> | undefined;
  const email = typeof user?.email === 'string' ? user.email.trim().toLowerCase() : '';

  if (!email) {
    return hookReject('A valid email is required to sign up.');
  }

  const invitedAt = user?.invited_at;
  if (invitedAt) {
    return hookAllow();
  }

  const userMetadata = user?.user_metadata as Record<string, unknown> | undefined;
  if (userMetadata?.provisioned === 'true' || userMetadata?.provisioned === true) {
    return hookAllow();
  }
  if (typeof userMetadata?.role_id === 'string' && userMetadata.role_id) {
    return hookAllow();
  }

  const provisioned = await isEmailProvisioned(adminClient, email);
  if (provisioned) {
    return hookAllow();
  }

  return hookReject(
    'Signups are disabled. Contact your administrator for an invite.',
    403,
  );
}

async function handleCleanupUnauthorized(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) {
    return jsonResponse({ error: 'Server configuration error' }, 500);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const adminClient = createServiceClient();
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id, is_provisioned')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  if (profile?.is_provisioned) {
    return jsonResponse({ ok: true, cleaned: false });
  }

  await adminClient.auth.admin.deleteUser(user.id);
  return jsonResponse({ ok: true, cleaned: true });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));

    if (req.method === 'POST' && (url.searchParams.get('action') === 'cleanup' || body.action === 'cleanup_unauthorized')) {
      return await handleCleanupUnauthorized(req);
    }

    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const adminClient = createServiceClient();
    const payload = body;

    const metadata = payload.metadata as Record<string, unknown> | undefined;
    const hookName = metadata?.name;

    if (hookName === 'before-user-created') {
      return await handleBeforeUserCreated(payload, adminClient);
    }

    // Fallback: treat as before-user-created if user object present
    if (payload.user) {
      return await handleBeforeUserCreated(payload, adminClient);
    }

    return hookAllow();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('auth-gate error:', message);
    return hookReject('Authentication service error. Please try again later.', 500);
  }
});
