import { packSecret, resolveSecret } from './crypto.ts';
export const PV_API_BASE = 'https://api.perfectvenue.com/api/v1';
export const PV_OAUTH_AUTHORIZE = 'https://api.perfectvenue.com/oauth/authorize';
export const PV_OAUTH_TOKEN = 'https://api.perfectvenue.com/oauth/token';
export const PV_OAUTH_REVOKE = 'https://api.perfectvenue.com/oauth/revoke';
export const PV_OAUTH_SCOPES = 'public read contacts_read users_read';
export const PV_SYNC_OVERLAP_MS = 5 * 60 * 1000;
const GRADITO_SERVICE_AREAS = [
  'Manhattan',
  'Brooklyn',
  'Westchester',
  'The Hamptons',
  'New Jersey',
  'Miami',
  'Los Angeles',
  'Philadelphia',
  'Washington DC',
  'San Francisco',
  'Nashville',
  'Seattle',
  'Las Vegas',
  'Dallas',
  'Chicago',
  'Boston',
  'Austin',
  'Houston',
  'Denver',
  'Atlanta',
  'New Orleans',
  'Portland',
  'San Diego',
  'Palm Beach',
  'Aspen',
  'Dubai',
  'Paris',
  'Italy',
  'Westchester, Putnam & Fairfield',
  'Long Island',
  'The Berkshires'
];
export const SECRET_MASK_PLACEHOLDER = '********';
export function maskSecret(value) {
  const v = value?.trim() || '';
  if (!v) return '';
  if (v.length >= 6) return `${v.slice(0, 2)}***${v.slice(-3)}`;
  return SECRET_MASK_PLACEHOLDER;
}
export async function getPvConfig(adminClient) {
  const row = await loadConnection(adminClient);
  const redirectUri = Deno.env.get('PERFECT_VENUE_REDIRECT_URI')?.trim() || 'https://ai.gradito.com/oauth/perfect-venue/callback';
  let clientId = row?.client_id?.trim() || '';
  let clientSecret = '';
  if (row?.encrypted_client_secret && row.client_secret_iv) {
    clientSecret = await resolveSecret(adminClient, {
      encrypted: row.encrypted_client_secret,
      iv: row.client_secret_iv
    });
  }
  if (!clientId) {
    clientId = Deno.env.get('PERFECT_VENUE_CLIENT_ID')?.trim() || '';
  }
  if (!clientSecret) {
    clientSecret = Deno.env.get('PERFECT_VENUE_CLIENT_SECRET')?.trim() || '';
  }
  if (!clientId || !clientSecret) {
    throw new Error('Configure Perfect Venue client ID and secret under Admin → Integrations → Perfect Venue');
  }
  return {
    clientId,
    clientSecret,
    redirectUri
  };
}
function basicAuthHeader(clientId, clientSecret) {
  const encoded = btoa(`${clientId}:${clientSecret}`);
  return `Basic ${encoded}`;
}
function unwrapData(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  const obj = payload;
  if (obj.data !== undefined) return obj.data;
  return payload;
}
export async function pvApiGet(accessToken, path, query) {
  const url = new URL(`${PV_API_BASE}${path}`);
  if (query) {
    Object.entries(query).forEach(([k, v])=>{
      if (v !== undefined && v !== '') url.searchParams.set(k, v);
    });
  }
  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  });
  if (!response.ok) {
    const text = await response.text().catch(()=>'');
    throw new Error(`Perfect Venue API ${path} failed (${response.status}): ${text.slice(0, 200)}`);
  }
  const payload = await response.json();
  return unwrapData(payload);
}
export async function buildAuthorizeUrl(adminClient, state) {
  const { clientId, redirectUri } = await getPvConfig(adminClient);
  const url = new URL(PV_OAUTH_AUTHORIZE);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', PV_OAUTH_SCOPES);
  url.searchParams.set('state', state);
  return url.toString();
}
export async function exchangeAuthorizationCode(adminClient, code) {
  const { clientId, clientSecret, redirectUri } = await getPvConfig(adminClient);
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri
  });
  const response = await fetch(PV_OAUTH_TOKEN, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(clientId, clientSecret),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });
  const payload = await response.json().catch(()=>({}));
  if (!response.ok) {
    const desc = typeof payload.error_description === 'string' ? payload.error_description : JSON.stringify(payload);
    throw new Error(`Token exchange failed: ${desc}`);
  }
  return payload;
}
export async function refreshAccessToken(adminClient, refreshToken) {
  const { clientId, clientSecret } = await getPvConfig(adminClient);
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });
  const response = await fetch(PV_OAUTH_TOKEN, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(clientId, clientSecret),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });
  const payload = await response.json().catch(()=>({}));
  if (!response.ok) {
    throw new Error('Refresh token failed; reconnect Perfect Venue');
  }
  return payload;
}
export async function revokeToken(adminClient, token) {
  const { clientId, clientSecret } = await getPvConfig(adminClient);
  const body = new URLSearchParams({
    token
  });
  await fetch(PV_OAUTH_REVOKE, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(clientId, clientSecret),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });
}
export async function loadConnection(adminClient) {
  const { data, error } = await adminClient.from('integration_perfect_venue_connections').select('*').eq('id', 1).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    venue_ids: Array.isArray(data.venue_ids) ? data.venue_ids : [],
    venues: Array.isArray(data.venues) ? data.venues : []
  };
}
export async function resolveAccessToken(adminClient, row) {
  const accessToken = await resolveSecret(adminClient, {
    encrypted: row.encrypted_access_token,
    iv: row.access_token_iv
  });
  if (accessToken) return accessToken;
  const refreshToken = await resolveSecret(adminClient, {
    encrypted: row.encrypted_refresh_token,
    iv: row.refresh_token_iv
  });
  if (!refreshToken) throw new Error('Perfect Venue is not connected');
  const tokens = await refreshAccessToken(adminClient, refreshToken);
  await storeTokens(adminClient, tokens.access_token, tokens.refresh_token);
  return tokens.access_token;
}
export async function storeTokens(adminClient, accessToken, refreshToken, extras) {
  const accessPacked = await packSecret(adminClient, accessToken);
  const refreshPacked = await packSecret(adminClient, refreshToken);
  const { error } = await adminClient.from('integration_perfect_venue_connections').upsert({
    id: 1,
    connected: true,
    connected_at: new Date().toISOString(),
    scopes: extras?.scopes ?? PV_OAUTH_SCOPES,
    encrypted_access_token: accessPacked.encrypted,
    access_token_iv: accessPacked.iv,
    encrypted_refresh_token: refreshPacked.encrypted,
    refresh_token_iv: refreshPacked.iv,
    dek_version: accessPacked.dekVersion,
    oauth_state: null,
    oauth_state_expires_at: null,
    updated_by: extras?.userId ?? null
  });
  if (error) throw error;
}
export async function fetchVenues(accessToken) {
  const data = await pvApiGet('/venues');
  if (Array.isArray(data)) return data;
  return data.venues ?? [];
}
function mapServiceArea(venueName) {
  if (!venueName?.trim()) return null;
  const lower = venueName.trim().toLowerCase();
  const match = GRADITO_SERVICE_AREAS.find((a)=>a.toLowerCase() === lower || lower.includes(a.toLowerCase()) || a.toLowerCase().includes(lower));
  return match ?? venueName.trim();
}
export function mapPvStatus(status) {
  if (!status) return null;
  const key = status.toLowerCase();
  const map = {
    confirmed: 'Confirmed',
    completed: 'Completed',
    lost: 'Cancelled',
    lead: 'Lead',
    qualified: 'Qualified',
    proposal_sent: 'Proposal Sent',
    balance_due: 'Balance Due'
  };
  return map[key] ?? status;
}
function eventDate(startTime) {
  if (!startTime) return null;
  const d = startTime.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}
function buildPvMetadata(ev) {
  return {
    name: ev.name,
    source: ev.source,
    campaign: ev.campaign,
    spaces: ev.spaces,
    owner_id: ev.owner_id,
    start_time: ev.start_time,
    end_time: ev.end_time,
    amount: ev.amount,
    contact_id: ev.contact_id,
    venue_id: ev.venue_id,
    updated_at: ev.updated_at
  };
}
function contactDisplayName(contact, fallback) {
  if (contact) {
    const parts = [
      contact.first_name,
      contact.last_name
    ].filter(Boolean);
    if (parts.length) return parts.join(' ');
    if (contact.email) return contact.email;
  }
  return fallback?.trim() || null;
}
async function resolveClientId(adminClient, contact, clientName) {
  if (!clientName?.trim()) return null;
  const name = clientName.trim();
  const { data: existing } = await adminClient.from('clients').select('id').ilike('name', name).limit(1).maybeSingle();
  if (existing?.id) return existing.id;
  const { data: created, error } = await adminClient.from('clients').insert({
    name,
    type: 'Private',
    notes: contact?.email ? `PV contact ${contact.email}` : null
  }).select('id').single();
  if (error) {
    console.warn('client create skipped:', error.message);
    return null;
  }
  return created.id;
}
export async function fetchAllContacts(accessToken) {
  const map = new Map();
  let cursor = null;
  for(let page = 0; page < 50; page++){
    const url = new URL(`${PV_API_BASE}/contacts`);
    url.searchParams.set('limit', '100');
    if (cursor) url.searchParams.set('cursor', cursor);
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'PV-Version': '2026-11-01'
      }
    });
    if (!response.ok) break;
    const raw = await response.json();
    const data = unwrapData(raw);
    const contacts = data.contacts ?? (Array.isArray(data) ? data : []);
    contacts.forEach((c)=>{
      if (c?.id) map.set(c.id, c);
    });
    const next = data.meta?.next_cursor ?? raw.meta?.next_cursor;
    if (!next) break;
    cursor = next;
  }
  return map;
}
export function buildVenueMap(venues) {
  return new Map(venues.map((v)=>[
      v.id,
      v
    ]));
}
export async function upsertEventFromPv(adminClient, ev, venues, contacts) {
  if (!ev.id) return 'skipped';
  const venue = ev.venue_id ? venues.get(ev.venue_id) : undefined;
  const contact = ev.contact_id ? contacts.get(ev.contact_id) : undefined;
  const clientName = contactDisplayName(contact, ev.name);
  const clientId = await resolveClientId(adminClient, contact, clientName);
  const crmPatch = {
    perfect_venue_id: ev.id,
    event_source: 'perfect_venue',
    pv_venue_id: ev.venue_id ?? null,
    date: eventDate(ev.start_time),
    service_area: mapServiceArea(venue?.name),
    client_id: clientId,
    client_name: clientName,
    event_type: ev.event_type ?? null,
    guest_count: ev.group_size ?? null,
    status: mapPvStatus(ev.status),
    pv_metadata: buildPvMetadata(ev)
  };
  const { data: existing } = await adminClient.from('events').select('id, notes, client_revenue, invoice_number').eq('perfect_venue_id', ev.id).maybeSingle();
  if (existing) {
    const { error } = await adminClient.from('events').update(crmPatch).eq('id', existing.id);
    if (error) throw error;
    return 'updated';
  }
  const insertRow = {
    ...crmPatch,
    notes: ev.name ?? null,
    commission_status: 'Pending',
    cuisines_served: [],
    facilitators: {},
    admin_fee_applies_to: [],
    client_revenue: typeof ev.amount === 'number' ? ev.amount / 100 : 0
  };
  const { error } = await adminClient.from('events').insert(insertRow);
  if (error) throw error;
  return 'inserted';
}
async function listEventsForVenue(accessToken, venueId, mode, dateFrom, dateTo) {
  const all = [];
  for(let page = 1; page <= 200; page++){
    const query = {
      venue_id: venueId,
      page: String(page),
      per_page: '100'
    };
    if (mode === 'incremental' && dateFrom) {
      query.date_field = 'updated_at';
      query.date_from = dateFrom;
      query.date_to = dateTo;
    }
    const data = await pvApiGet(accessToken, '/events', query);
    const events = data.events ?? (Array.isArray(data) ? data : []);
    all.push(...events);
    const totalPages = data.meta?.total_pages;
    if (events.length < 100 || totalPages && page >= totalPages) break;
    if (events.length === 0) break;
  }
  return all;
}
export async function listSyncRuns(adminClient, limit = 50) {
  const { data, error } = await adminClient.from('perfect_venue_sync_runs').select('id, started_at, finished_at, sync_trigger, mode, status, inserted, updated, error_message, actor_id').order('started_at', {
    ascending: false
  }).limit(limit);
  if (error) throw error;
  return data ?? [];
}
export async function syncPerfectVenueEvents(adminClient, mode, runContext = {
  trigger: 'manual'
}) {
  const row = await loadConnection(adminClient);
  if (!row?.connected) throw new Error('Perfect Venue is not connected');
  const { data: runRow, error: runInsertError } = await adminClient.from('perfect_venue_sync_runs').insert({
    sync_trigger: runContext.trigger,
    mode,
    status: 'running',
    actor_id: runContext.actorId ?? null
  }).select('id').single();
  if (runInsertError) throw runInsertError;
  const runId = runRow.id;
  try {
    let accessToken = await resolveAccessToken(adminClient, row);
    const venues = await fetchVenues(accessToken);
    const venueIds = venues.map((v)=>v.id);
    const venueMap = buildVenueMap(venues);
    let contacts;
    try {
      contacts = await fetchAllContacts(accessToken);
    } catch  {
      contacts = new Map();
    }
    const now = new Date();
    const dateTo = now.toISOString();
    let dateFrom = null;
    if (mode === 'incremental' && row.last_synced_updated_at) {
      const fromMs = new Date(row.last_synced_updated_at).getTime() - PV_SYNC_OVERLAP_MS;
      dateFrom = new Date(fromMs).toISOString();
    }
    let inserted = 0;
    let updated = 0;
    for (const venueId of venueIds){
      let events;
      try {
        events = await listEventsForVenue(accessToken, venueId, mode, dateFrom, dateTo);
      } catch (err) {
        if (err instanceof Error && err.message.includes('401')) {
          accessToken = await resolveAccessToken(adminClient, row);
          events = await listEventsForVenue(accessToken, venueId, mode, dateFrom, dateTo);
        } else {
          throw err;
        }
      }
      for (const ev of events){
        const result = await upsertEventFromPv(adminClient, ev, venueMap, contacts);
        if (result === 'inserted') inserted += 1;
        if (result === 'updated') updated += 1;
      }
    }
    const stats = {
      inserted,
      updated,
      mode,
      at: now.toISOString()
    };
    const patch = {
      venue_ids: venueIds,
      venues,
      last_sync_at: now.toISOString(),
      last_sync_error: null,
      last_sync_stats: stats,
      last_synced_updated_at: now.toISOString()
    };
    if (mode === 'full') patch.last_full_sync_at = now.toISOString();
    await adminClient.from('integration_perfect_venue_connections').update(patch).eq('id', 1);
    await adminClient.from('perfect_venue_sync_runs').update({
      finished_at: now.toISOString(),
      status: 'success',
      inserted,
      updated
    }).eq('id', runId);
    return {
      inserted,
      updated,
      venues: venues.length,
      run_id: runId
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    await adminClient.from('perfect_venue_sync_runs').update({
      finished_at: new Date().toISOString(),
      status: 'failed',
      error_message: message
    }).eq('id', runId);
    throw err;
  }
}
export async function toPublicStatus(adminClient, row) {
  const envConfigured = Boolean(Deno.env.get('PERFECT_VENUE_CLIENT_ID')?.trim() && Deno.env.get('PERFECT_VENUE_CLIENT_SECRET')?.trim());
  const dbClientId = row?.client_id?.trim() || '';
  const hasDbSecret = Boolean(row?.encrypted_client_secret?.trim());
  const client_configured = Boolean(dbClientId && hasDbSecret) || envConfigured;
  let client_secret_masked = '';
  if (hasDbSecret && row) {
    const secret = await resolveSecret(adminClient, {
      encrypted: row.encrypted_client_secret,
      iv: row.client_secret_iv
    });
    client_secret_masked = maskSecret(secret);
  } else if (envConfigured) {
    client_secret_masked = maskSecret(Deno.env.get('PERFECT_VENUE_CLIENT_SECRET') ?? 'set');
  }
  if (!row?.connected) {
    return {
      connected: false,
      client_configured,
      client_id_display: dbClientId || null,
      client_secret_masked,
      venues: [],
      venue_ids: [],
      scopes: null,
      connected_at: null,
      last_sync_at: null,
      last_full_sync_at: null,
      last_synced_updated_at: null,
      last_sync_error: null,
      last_sync_stats: null
    };
  }
  return {
    connected: true,
    client_configured,
    client_id_display: dbClientId || null,
    client_secret_masked,
    venues: row.venues,
    venue_ids: row.venue_ids,
    scopes: row.scopes,
    connected_at: row.connected_at ?? null,
    last_sync_at: row.last_sync_at ?? null,
    last_full_sync_at: row.last_full_sync_at ?? null,
    last_synced_updated_at: row.last_synced_updated_at,
    last_sync_error: row.last_sync_error ?? null,
    last_sync_stats: row.last_sync_stats ?? null
  };
}
export async function savePvCredentials(adminClient, clientId, clientSecret, userId) {
  const id = clientId.trim();
  const secret = clientSecret.trim();
  if (!id || !secret) {
    throw new Error('client_id and client_secret are required');
  }
  const packed = await packSecret(adminClient, secret);
  const { error } = await adminClient.from('integration_perfect_venue_connections').upsert({
    id: 1,
    client_id: id,
    encrypted_client_secret: packed.encrypted,
    client_secret_iv: packed.iv,
    dek_version: packed.dekVersion,
    updated_by: userId
  });
  if (error) throw error;
}
