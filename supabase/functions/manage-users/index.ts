import {
  corsHeaders,
  createServiceClient,
  isValidEmail,
  jsonResponse,
  requireAdmin,
} from '../_shared/auth.ts';
import {
  getActiveProvider,
  loadActiveCustomSmtpConfig,
  sendEmail,
} from '../_shared/email.ts';
import { loadResendSettings } from '../_shared/resend.ts';
import { renderInviteEmail } from '../_shared/emailTemplates.ts';

type AdminClient = ReturnType<typeof createServiceClient>;

function getAppUrl(): string {
  return Deno.env.get('APP_URL')?.trim() || Deno.env.get('SITE_URL')?.trim() || '';
}

function requireAppUrl(): string {
  const appUrl = getAppUrl();
  if (!appUrl) {
    throw new Error(
      'Set APP_URL secret on the manage-users edge function (e.g. http://localhost:5173 or your production URL).',
    );
  }
  return appUrl.replace(/\/$/, '');
}

async function assertEmailProviderConfigured(adminClient: AdminClient) {
  const provider = await getActiveProvider(adminClient);

  if (provider === 'resend') {
    const settings = await loadResendSettings(adminClient);
    if (!settings?.enabled || !settings.api_key?.trim() || !settings.from_email?.trim()) {
      throw new Error('Configure Email integration before inviting users.');
    }
    return;
  }

  const smtp = await loadActiveCustomSmtpConfig(adminClient);
  if (!smtp) {
    throw new Error('Configure Email integration before inviting users.');
  }
}

async function upsertProvisionedEmail(
  adminClient: AdminClient,
  email: string,
  roleId: string,
  provisionedBy?: string,
) {
  const { error } = await adminClient
    .from('provisioned_emails')
    .upsert({
      email: email.trim().toLowerCase(),
      role_id: roleId,
      provisioned_by: provisionedBy ?? null,
    }, { onConflict: 'email' });

  if (error) throw error;
}

async function removeProvisionedEmail(adminClient: AdminClient, email: string) {
  const { error } = await adminClient
    .from('provisioned_emails')
    .delete()
    .eq('email', email.trim().toLowerCase());

  if (error) throw error;
}

async function getAdminRoleId(adminClient: AdminClient): Promise<string | null> {
  const { data } = await adminClient
    .from('app_roles')
    .select('id')
    .eq('name', 'admin')
    .maybeSingle();
  return data?.id ?? null;
}

async function countActiveAdmins(adminClient: AdminClient, excludeUserId?: string): Promise<number> {
  const adminRoleId = await getAdminRoleId(adminClient);
  if (!adminRoleId) return 0;

  let query = adminClient
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role_id', adminRoleId)
    .eq('status', 'active');

  if (excludeUserId) {
    query = query.neq('id', excludeUserId);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

async function isUserAdmin(adminClient: AdminClient, userId: string): Promise<boolean> {
  const adminRoleId = await getAdminRoleId(adminClient);
  if (!adminRoleId) return false;

  const { data } = await adminClient
    .from('profiles')
    .select('role_id')
    .eq('id', userId)
    .maybeSingle();

  return data?.role_id === adminRoleId;
}

function summarizeIdentities(identities: Array<{ provider: string }> | undefined) {
  const providers = (identities ?? []).map((i) => i.provider);
  return {
    has_google: providers.includes('google'),
    has_password: providers.includes('email'),
  };
}

async function handleList(adminClient: AdminClient) {
  const { data: authData, error: authError } = await adminClient.auth.admin.listUsers({
    perPage: 1000,
  });
  if (authError) throw authError;

  const { data: profiles, error: profileError } = await adminClient
    .from('profiles')
    .select('id, role_id, role, display_name, avatar_url, last_login_at, status, password_setup_required, app_roles(name)');

  if (profileError) throw profileError;

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const users = (authData.users ?? []).map((u) => {
    const profile = profileMap.get(u.id);
    const identitySummary = summarizeIdentities(u.identities);
    return {
      id: u.id,
      email: u.email ?? '',
      display_name: profile?.display_name ?? u.user_metadata?.display_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
      role_id: profile?.role_id ?? null,
      role: profile?.role ?? 'user',
      role_name: (profile?.app_roles as { name?: string } | null)?.name ?? profile?.role ?? 'user',
      status: profile?.status ?? 'active',
      last_login_at: profile?.last_login_at ?? null,
      created_at: u.created_at,
      invited_at: u.invited_at ?? null,
      banned_until: u.banned_until ?? null,
      password_setup_required: profile?.password_setup_required ?? false,
      ...identitySummary,
    };
  });

  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === 'active').length,
    invited: users.filter((u) => u.status === 'invited').length,
    deactivated: users.filter((u) => u.status === 'deactivated').length,
    admins: users.filter((u) => u.role === 'admin').length,
  };

  return jsonResponse({ users, stats });
}

async function sendInviteEmail(
  adminClient: AdminClient,
  email: string,
  actionLink: string,
  roleName: string,
  recipientName?: string | null,
) {
  await sendEmail(adminClient, {
    to: email,
    subject: "You're invited to Gradito Intelligence",
    html: renderInviteEmail({ recipientName, roleName, actionLink }),
    emailType: 'invite',
  });
}

async function generateAndSendInvite(
  adminClient: AdminClient,
  email: string,
  roleId: string,
  roleName: string,
  provisionedBy?: string,
) {
  await upsertProvisionedEmail(adminClient, email, roleId, provisionedBy);

  const appUrl = requireAppUrl();
  const redirectTo = `${appUrl}/accept-invite`;

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      redirectTo,
      data: { role_id: roleId },
    },
  });

  if (error) throw error;

  const actionLink = data?.properties?.action_link;
  if (!actionLink) throw new Error('Failed to generate invite link');

  const userId = data.user?.id;
  if (!userId) throw new Error('Failed to create invited user');

  const { error: profileError } = await adminClient
    .from('profiles')
    .upsert({
      id: userId,
      role_id: roleId,
      status: 'invited',
      is_provisioned: true,
      password_setup_required: true,
    }, { onConflict: 'id' });

  if (profileError) throw profileError;

  await sendInviteEmail(adminClient, email, actionLink, roleName, null);

  return { user_id: userId, email };
}

async function handleInvite(
  body: Record<string, unknown>,
  adminClient: AdminClient,
  callerId: string,
) {
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const roleId = typeof body.role_id === 'string' ? body.role_id.trim() : '';

  if (!email || !isValidEmail(email)) {
    return jsonResponse({ error: 'A valid email is required' }, 400);
  }
  if (!roleId) return jsonResponse({ error: 'role_id is required' }, 400);

  const { data: role, error: roleError } = await adminClient
    .from('app_roles')
    .select('id, name')
    .eq('id', roleId)
    .maybeSingle();

  if (roleError) throw roleError;
  if (!role) return jsonResponse({ error: 'Role not found' }, 404);

  await assertEmailProviderConfigured(adminClient);

  const result = await generateAndSendInvite(adminClient, email, role.id, role.name, callerId);
  return jsonResponse({ ok: true, ...result });
}

async function handleUpdateRole(
  body: Record<string, unknown>,
  callerId: string,
  adminClient: AdminClient,
) {
  const userId = typeof body.user_id === 'string' ? body.user_id.trim() : '';
  const roleId = typeof body.role_id === 'string' ? body.role_id.trim() : '';

  if (!userId) return jsonResponse({ error: 'user_id is required' }, 400);
  if (!roleId) return jsonResponse({ error: 'role_id is required' }, 400);
  if (userId === callerId) {
    return jsonResponse({ error: 'You cannot change your own role' }, 400);
  }

  const { data: role, error: roleError } = await adminClient
    .from('app_roles')
    .select('id, name')
    .eq('id', roleId)
    .maybeSingle();

  if (roleError) throw roleError;
  if (!role) return jsonResponse({ error: 'Role not found' }, 404);

  const wasAdmin = await isUserAdmin(adminClient, userId);
  const becomingNonAdmin = wasAdmin && role.name !== 'admin';

  if (becomingNonAdmin) {
    const otherAdmins = await countActiveAdmins(adminClient, userId);
    if (otherAdmins === 0) {
      return jsonResponse({ error: 'Cannot demote the last active admin' }, 400);
    }
  }

  const { error: updateError } = await adminClient
    .from('profiles')
    .update({ role_id: roleId })
    .eq('id', userId);

  if (updateError) throw updateError;

  return jsonResponse({ ok: true });
}

async function handleDeactivate(
  body: Record<string, unknown>,
  callerId: string,
  adminClient: AdminClient,
) {
  const userId = typeof body.user_id === 'string' ? body.user_id.trim() : '';
  if (!userId) return jsonResponse({ error: 'user_id is required' }, 400);
  if (userId === callerId) {
    return jsonResponse({ error: 'You cannot deactivate your own account' }, 400);
  }

  if (await isUserAdmin(adminClient, userId)) {
    const otherAdmins = await countActiveAdmins(adminClient, userId);
    if (otherAdmins === 0) {
      return jsonResponse({ error: 'Cannot deactivate the last active admin' }, 400);
    }
  }

  const { error: banError } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: '876000h',
  });
  if (banError) throw banError;

  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ status: 'deactivated' })
    .eq('id', userId);

  if (profileError) throw profileError;

  return jsonResponse({ ok: true });
}

async function handleReactivate(
  body: Record<string, unknown>,
  adminClient: AdminClient,
) {
  const userId = typeof body.user_id === 'string' ? body.user_id.trim() : '';
  if (!userId) return jsonResponse({ error: 'user_id is required' }, 400);

  const { error: unbanError } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: 'none',
  });
  if (unbanError) throw unbanError;

  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ status: 'active' })
    .eq('id', userId);

  if (profileError) throw profileError;

  return jsonResponse({ ok: true });
}

async function handleResendInvite(
  body: Record<string, unknown>,
  adminClient: AdminClient,
) {
  const userId = typeof body.user_id === 'string' ? body.user_id.trim() : '';
  if (!userId) return jsonResponse({ error: 'user_id is required' }, 400);

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id, status, role_id, display_name, app_roles(name)')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile) return jsonResponse({ error: 'User not found' }, 404);
  if (profile.status !== 'invited') {
    return jsonResponse({ error: 'User is not in invited status' }, 400);
  }

  const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(userId);
  if (authError) throw authError;
  const email = authUser.user?.email;
  if (!email) return jsonResponse({ error: 'User has no email' }, 400);

  await assertEmailProviderConfigured(adminClient);

  const roleName = (profile.app_roles as { name?: string } | null)?.name ?? 'user';
  const roleId = profile.role_id;

  if (!roleId) return jsonResponse({ error: 'User has no role assigned' }, 400);

  const appUrl = requireAppUrl();
  const redirectTo = `${appUrl}/accept-invite`;

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo },
  });

  if (error) throw error;

  const actionLink = data?.properties?.action_link;
  if (!actionLink) throw new Error('Failed to generate invite link');

  const displayName = profile.display_name ?? null;
  await sendInviteEmail(adminClient, email, actionLink, roleName, displayName);

  return jsonResponse({ ok: true });
}

async function handleDelete(
  body: Record<string, unknown>,
  callerId: string,
  adminClient: AdminClient,
) {
  const userId = typeof body.user_id === 'string' ? body.user_id.trim() : '';
  if (!userId) return jsonResponse({ error: 'user_id is required' }, 400);
  if (userId === callerId) {
    return jsonResponse({ error: 'You cannot delete your own account' }, 400);
  }

  if (await isUserAdmin(adminClient, userId)) {
    const otherAdmins = await countActiveAdmins(adminClient, userId);
    if (otherAdmins === 0) {
      return jsonResponse({ error: 'Cannot delete the last active admin' }, 400);
    }
  }

  const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(userId);
  if (authError) throw authError;
  const email = authUser.user?.email;

  if (email) {
    await removeProvisionedEmail(adminClient, email);
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
  if (deleteError) throw deleteError;

  return jsonResponse({ ok: true });
}

async function handleRoleDeleteCheck(
  body: Record<string, unknown>,
  adminClient: AdminClient,
) {
  const roleId = typeof body.role_id === 'string' ? body.role_id.trim() : '';
  if (!roleId) return jsonResponse({ error: 'role_id is required' }, 400);

  const { data: role, error: roleError } = await adminClient
    .from('app_roles')
    .select('id, name, is_system')
    .eq('id', roleId)
    .maybeSingle();

  if (roleError) throw roleError;
  if (!role) return jsonResponse({ error: 'Role not found' }, 404);

  if (role.is_system) {
    return jsonResponse({
      can_delete: false,
      reason: 'System roles cannot be deleted',
      user_count: 0,
      users: [],
    });
  }

  const { data: profiles, error: profilesError } = await adminClient
    .from('profiles')
    .select('id, display_name')
    .eq('role_id', roleId);

  if (profilesError) throw profilesError;

  const userIds = (profiles ?? []).map((p) => p.id);
  const usersWithEmail: Array<{ id: string; email: string; display_name: string | null }> = [];

  for (const p of profiles ?? []) {
    const { data: authUser } = await adminClient.auth.admin.getUserById(p.id);
    usersWithEmail.push({
      id: p.id,
      email: authUser.user?.email ?? '—',
      display_name: p.display_name,
    });
  }

  const userCount = userIds.length;

  return jsonResponse({
    can_delete: userCount === 0,
    reason: userCount > 0
      ? `${userCount} user(s) are assigned to this role. Reassign them first.`
      : null,
    user_count: userCount,
    users: usersWithEmail,
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
    const authResult = await requireAdmin(req);
    if (authResult.error) return authResult.error;

    const { user, adminClient } = authResult;
    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : 'list';

    switch (action) {
      case 'list':
        return handleList(adminClient);
      case 'invite':
        return handleInvite(body, adminClient, user.id);
      case 'update_role':
        return handleUpdateRole(body, user.id, adminClient);
      case 'deactivate':
        return handleDeactivate(body, user.id, adminClient);
      case 'reactivate':
        return handleReactivate(body, adminClient);
      case 'resend_invite':
        return handleResendInvite(body, adminClient);
      case 'delete':
        return handleDelete(body, user.id, adminClient);
      case 'role_delete_check':
        return handleRoleDeleteCheck(body, adminClient);
      default:
        return jsonResponse({ error: 'Unknown action' }, 400);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('manage-users error:', message);
    return jsonResponse({ error: message }, 500);
  }
});
