import {
  corsHeaders,
  createServiceClient,
  jsonResponse,
} from '../_shared/auth.ts';
type AdminClient = ReturnType<typeof createServiceClient>;

function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function phoneDigits(value: unknown): string {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits;
}

function chefIdentityMatch(
  chef: { email?: string | null; mobile?: string | null; phone?: string | null; archived?: boolean },
  email: string,
  mobile: string,
): boolean {
  if (chef.archived) return false;
  const chefEmail = normalizeEmail(chef.email);
  if (email && chefEmail && email === chefEmail) return true;
  const want = phoneDigits(mobile);
  if (want.length < 7) return false;
  const m = phoneDigits(chef.mobile);
  const p = phoneDigits(chef.phone);
  return (m.length >= 7 && m === want) || (p.length >= 7 && p === want);
}

async function findLiveChef(
  adminClient: AdminClient,
  email: string,
  mobile: string,
) {
  const { data: chefs, error } = await adminClient
    .from('chefs')
    .select('id, email, mobile, phone, archived')
    .eq('archived', false)
    .limit(500);
  if (error) throw error;
  return (chefs ?? []).find((c) => chefIdentityMatch(c, email, mobile)) ?? null;
}

async function findOpenProspect(
  adminClient: AdminClient,
  email: string,
  mobile: string,
) {
  const { data: prospects, error } = await adminClient
    .from('chef_invite_prospects')
    .select('id, email, mobile, phone, archived, status')
    .eq('archived', false)
    .neq('status', 'joined')
    .limit(500);
  if (error) throw error;
  return (prospects ?? []).find((p) => chefIdentityMatch(p, email, mobile)) ?? null;
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
    const firstName = typeof body.first_name === 'string' ? body.first_name.trim() : '';
    const lastName = typeof body.last_name === 'string' ? body.last_name.trim() : '';
    const email = normalizeEmail(body.email);
    const mobileRaw = typeof body.mobile === 'string' ? body.mobile.trim() : '';
    const photoUrl = typeof body.photo_url === 'string' ? body.photo_url.trim() : null;
    const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};

    if (!firstName || !lastName) {
      return jsonResponse({ error: 'First and last name are required' }, 400);
    }

    const adminClient = createServiceClient();
    const liveChef = await findLiveChef(adminClient, email, mobileRaw);
    if (liveChef) {
      return jsonResponse({
        error: 'This email or phone is already on the Gradito chef roster. Contact the team if you need help.',
        code: 'already_on_roster',
      }, 409);
    }

    const prospect = await findOpenProspect(adminClient, email, mobileRaw);

    const { data: inserted, error: insertError } = await adminClient
      .from('chef_intake_requests')
      .insert({
        first_name: firstName,
        last_name: lastName,
        email: email || null,
        mobile: mobileRaw || null,
        photo_url: photoUrl,
        status: 'pending',
        payload,
        prospect_id: prospect?.id ?? null,
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    const now = new Date().toISOString();
    if (prospect?.id) {
      await adminClient
        .from('chef_invite_prospects')
        .update({
          intake_request_id: inserted.id,
          intake_submitted_at: now,
        })
        .eq('id', prospect.id);
    }

    return jsonResponse({ ok: true, id: inserted.id, prospect_id: prospect?.id ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('chef-intake-submit error:', message);
    return jsonResponse({ error: message }, 500);
  }
});