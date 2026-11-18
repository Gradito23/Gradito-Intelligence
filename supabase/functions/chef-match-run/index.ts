import { corsHeaders, jsonResponse, requireAuth } from '../_shared/auth.ts';
import { runServerChefMatch } from '../_shared/chefMatchRun.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json().catch(() => ({}));
    const eventId = typeof body.event_id === 'string' ? body.event_id : null;
    const criteria = body.criteria && typeof body.criteria === 'object' ? body.criteria : null;

    const result = await runServerChefMatch(auth.adminClient, { eventId, criteria, limit: body.limit ?? 5 });
    return jsonResponse(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('chef-match-run:', message);
    return jsonResponse({ error: message }, 500);
  }
});