import {
  corsHeaders,
  createServiceClient,
  jsonResponse,
  requireAdmin,
  SECRET_MASK,
} from '../_shared/auth.ts';
import { resolveSecret } from '../_shared/crypto.ts';
import {
  buildAuthorizeUrl,
  exchangeAuthorizationCode,
  fetchVenues,
  listSyncRuns,
  loadConnection,
  revokeToken,
  savePvCredentials,
  storeTokens,
  syncPerfectVenueEvents,
  toPublicStatus,
} from '../_shared/perfectVenue.ts';

const OAUTH_STATE_TTL_MS = 15 * 60 * 1000;

function keepExistingSecret(input: string): boolean {
  return !input || input === SECRET_MASK;
}

function validateCronSecret(req: Request): boolean {
  const secret = Deno.env.get('PERFECT_VENUE_CRON_SECRET')?.trim();
  if (!secret) return false;
  const auth = req.headers.get('Authorization')?.trim() || '';
  return auth === `Bearer ${secret}`;
}

type PvSyncRunContext = { trigger: 'cron' | 'manual'; actorId: string | null };

async function runIncrementalSync(
  client: ReturnType<typeof createServiceClient>,
  ctx: PvSyncRunContext,
) {
  return runPerfectVenueSync(client, 'incremental', ctx);
}

async function runPerfectVenueSync(
  client: ReturnType<typeof createServiceClient>,
  mode: 'incremental' | 'full',
  ctx: PvSyncRunContext,
) {
  try {
    const result = await syncPerfectVenueEvents(client, mode, ctx);
    return { ok: true as const, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    await client
      .from('integration_perfect_venue_connections')
      .update({ last_sync_error: message, last_sync_at: new Date().toISOString() })
      .eq('id', 1);
    return { ok: false as const, error: message };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const adminClient = createServiceClient();

  try {
    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : 'get_status';

    if (action === 'sync_events_scheduled') {
      if (!validateCronSecret(req)) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }
      const outcome = await runIncrementalSync(adminClient, { trigger: 'cron', actorId: null });
      if (!outcome.ok) return jsonResponse({ error: outcome.error }, 400);
      return jsonResponse({ ok: true, ...outcome.result });
    }

    const authResult = await requireAdmin(req);
    if (authResult.error) return authResult.error;
    const { user, adminClient: client } = authResult;

    switch (action) {
      case 'get_status': {
        const row = await loadConnection(client);
        return jsonResponse(await toPublicStatus(client, row));
      }

      case 'list_sync_runs': {
        const limit = typeof body.limit === 'number' ? Math.min(body.limit, 100) : 50;
        const runs = await listSyncRuns(client, limit);
        return jsonResponse({ runs });
      }

      case 'save_credentials': {
        const clientId = typeof body.client_id === 'string' ? body.client_id.trim() : '';
        const clientSecretInput = typeof body.client_secret === 'string' ? body.client_secret.trim() : '';
        const row = await loadConnection(client);
        let clientSecret = clientSecretInput;
        if (keepExistingSecret(clientSecretInput) && row?.encrypted_client_secret) {
          clientSecret = await resolveSecret(client, {
            encrypted: row.encrypted_client_secret,
            iv: row.client_secret_iv,
          });
        }
        const effectiveClientId = clientId || row?.client_id?.trim() || '';
        if (!effectiveClientId || !clientSecret) {
          return jsonResponse({ error: 'client_id and client_secret are required' }, 400);
        }
        await savePvCredentials(client, effectiveClientId, clientSecret, user.id);
        const updated = await loadConnection(client);
        return jsonResponse(await toPublicStatus(client, updated));
      }

      case 'get_authorize_url': {
        const state = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + OAUTH_STATE_TTL_MS).toISOString();
        await client
          .from('integration_perfect_venue_connections')
          .upsert({
            id: 1,
            oauth_state: state,
            oauth_state_expires_at: expiresAt,
            updated_by: user.id,
          });
        const authorize_url = await buildAuthorizeUrl(client, state);
        return jsonResponse({ authorize_url, state });
      }

      case 'exchange_code': {
        const code = typeof body.code === 'string' ? body.code.trim() : '';
        const state = typeof body.state === 'string' ? body.state.trim() : '';
        if (!code || !state) {
          return jsonResponse({ error: 'code and state are required' }, 400);
        }

        const row = await loadConnection(client);
        if (!row?.oauth_state || row.oauth_state !== state) {
          return jsonResponse({ error: 'Invalid OAuth state' }, 400);
        }
        const expires = row.oauth_state_expires_at
          ? new Date(row.oauth_state_expires_at).getTime()
          : 0;
        if (expires < Date.now()) {
          return jsonResponse({ error: 'OAuth state expired; try Connect again' }, 400);
        }

        const tokens = await exchangeAuthorizationCode(client, code);
        await storeTokens(client, tokens.access_token, tokens.refresh_token, {
          scopes: tokens.scope ?? undefined,
          userId: user.id,
        });

        let venues: Awaited<ReturnType<typeof fetchVenues>> = [];
        let venuesFetchWarning: string | undefined;
        try {
          venues = await fetchVenues(tokens.access_token);
        } catch (err) {
          venuesFetchWarning = err instanceof Error ? err.message : 'Failed to fetch venues';
          console.warn('integration-perfect-venue exchange_code venues:', venuesFetchWarning);
        }

        if (venues.length > 0) {
          await client
            .from('integration_perfect_venue_connections')
            .update({
              venue_ids: venues.map((v) => v.id),
              venues,
              updated_by: user.id,
            })
            .eq('id', 1);
        }

        return jsonResponse({
          connected: true,
          venue_count: venues.length,
          ...(venuesFetchWarning ? { venues_fetch_warning: venuesFetchWarning } : {}),
        });
      }

      case 'disconnect': {
        const row = await loadConnection(client);
        if (row) {
          const refresh = await resolveSecret(client, {
            encrypted: row.encrypted_refresh_token,
            iv: row.refresh_token_iv,
          });
          const access = await resolveSecret(client, {
            encrypted: row.encrypted_access_token,
            iv: row.access_token_iv,
          });
          try {
            if (refresh) await revokeToken(client, refresh);
            else if (access) await revokeToken(client, access);
          } catch {
            // revoke is best-effort
          }
        }
        await client
          .from('integration_perfect_venue_connections')
          .update({
            connected: false,
            connected_at: null,
            scopes: null,
            venue_ids: [],
            venues: [],
            encrypted_access_token: null,
            access_token_iv: null,
            encrypted_refresh_token: null,
            refresh_token_iv: null,
            oauth_state: null,
            oauth_state_expires_at: null,
            updated_by: user.id,
          })
          .eq('id', 1);
        return jsonResponse({ ok: true, connected: false });
      }

      case 'sync_events': {
        const mode = body.mode === 'full' ? 'full' : 'incremental';
        const ctx: PvSyncRunContext = { trigger: 'manual', actorId: user.id };
        const outcome = mode === 'incremental'
          ? await runIncrementalSync(client, ctx)
          : await runPerfectVenueSync(client, 'full', ctx);
        if (!outcome.ok) return jsonResponse({ error: outcome.error }, 400);
        return jsonResponse({ ok: true, ...outcome.result });
      }

      default:
        return jsonResponse({ error: 'Unknown action' }, 400);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('integration-perfect-venue:', message);
    return jsonResponse({ error: message }, 500);
  }
});
