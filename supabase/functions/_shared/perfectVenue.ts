import { packSecret, resolveSecret } from './crypto.ts';
export const PV_API_BASE = 'https://api.perfectvenue.com/api/v1';
export const PV_OAUTH_AUTHORIZE = 'https://api.perfectvenue.com/oauth/authorize';
export const PV_OAUTH_TOKEN = 'https://api.perfectvenue.com/oauth/token';
export const PV_OAUTH_REVOKE = 'https://api.perfectvenue.com/oauth/revoke';
export const PV_OAUTH_SCOPES = 'public read contacts_read users_read';
export const PV_SYNC_OVERLAP_MS = 5 * 60 * 1000;
export const PV_API_VERSION = '2026-11-01';
const SYNC_STALE_MS = 3 * 60 * 1000;
const SYNC_CHUNK_BUDGET_MS = 20 * 1000;
const MAX_EVENT_PAGES_PER_VENUE = 100;
export type PvSyncCheckpoint = {
  run_id: string;
  mode: 'full' | 'incremental';
  venue_ids: string[];
  venues: { id: string; name?: string }[];
  venue_index: number;
  event_page: number;
  date_from: string | null;
  date_to: string;
  inserted: number;
  updated: number;
  events_fetched: number;
};

export type PvSyncResult = {
  inserted: number;
  updated: number;
  events_fetched: number;
  venues: number;
  run_id: string;
  partial?: boolean;
  continue?: boolean;
  background?: boolean;
  idle?: boolean;
  started?: boolean;
};

export class SyncInProgressError extends Error {
  readonly httpStatus = 409;
  constructor(message = 'Sync already in progress') {
    super(message);
    this.name = 'SyncInProgressError';
  }
}
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
      Accept: 'application/json',
      'PV-Version': PV_API_VERSION,
    },
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
  const data = await pvApiGet(accessToken, '/venues');
  if (Array.isArray(data)) return data;
  return data.venues ?? [];
}
function isKnownServiceArea(name) {
  if (!name?.trim()) return false;
  const lower = name.trim().toLowerCase();
  return GRADITO_SERVICE_AREAS.some(
    (a) => a.toLowerCase() === lower || lower.includes(a.toLowerCase()) || a.toLowerCase().includes(lower),
  );
}

function mapServiceAreaFromVenueName(venueName) {
  if (!venueName?.trim()) return null;
  const lower = venueName.trim().toLowerCase();
  const match = GRADITO_SERVICE_AREAS.find(
    (a) => a.toLowerCase() === lower || lower.includes(a.toLowerCase()) || a.toLowerCase().includes(lower),
  );
  return match ?? null;
}

/** Five-digit ZIP prefix (3 chars) → Gradito service market */
const ZIP_PREFIX_TO_SERVICE_AREA: Record<string, string> = {
  '100': 'Manhattan',
  '101': 'Manhattan',
  '102': 'Manhattan',
  '103': 'Manhattan',
  '104': 'Manhattan',
  '112': 'Brooklyn',
  '070': 'New Jersey',
  '071': 'New Jersey',
  '072': 'New Jersey',
  '073': 'New Jersey',
  '074': 'New Jersey',
  '075': 'New Jersey',
  '076': 'New Jersey',
  '077': 'New Jersey',
  '078': 'New Jersey',
  '079': 'New Jersey',
  '331': 'Miami',
  '332': 'Miami',
  '333': 'Miami',
  '334': 'Palm Beach',
  '335': 'Palm Beach',
  '900': 'Los Angeles',
  '901': 'Los Angeles',
  '902': 'Los Angeles',
  '903': 'Los Angeles',
  '904': 'Los Angeles',
  '905': 'Los Angeles',
  '906': 'Los Angeles',
  '907': 'Los Angeles',
  '908': 'Los Angeles',
  '910': 'Los Angeles',
  '911': 'Los Angeles',
  '912': 'Los Angeles',
  '913': 'Los Angeles',
  '914': 'Los Angeles',
  '915': 'Los Angeles',
  '916': 'Los Angeles',
  '917': 'Los Angeles',
  '918': 'Los Angeles',
  '919': 'Los Angeles',
  '920': 'San Diego',
  '921': 'San Diego',
  '922': 'San Diego',
  '923': 'San Diego',
  '924': 'San Diego',
  '925': 'San Diego',
  '926': 'San Diego',
  '927': 'San Diego',
  '928': 'San Diego',
  '191': 'Philadelphia',
  '190': 'Philadelphia',
  '200': 'Washington DC',
  '201': 'Washington DC',
  '202': 'Washington DC',
  '203': 'Washington DC',
  '204': 'Washington DC',
  '205': 'Washington DC',
  '940': 'San Francisco',
  '941': 'San Francisco',
  '942': 'San Francisco',
  '943': 'San Francisco',
  '944': 'San Francisco',
  '945': 'San Francisco',
  '946': 'San Francisco',
  '947': 'San Francisco',
  '948': 'San Francisco',
  '949': 'San Francisco',
  '950': 'San Francisco',
  '951': 'San Francisco',
  '952': 'San Francisco',
  '953': 'San Francisco',
  '954': 'San Francisco',
  '955': 'San Francisco',
  '956': 'San Francisco',
  '957': 'San Francisco',
  '958': 'San Francisco',
  '959': 'San Francisco',
  '372': 'Nashville',
  '981': 'Seattle',
  '980': 'Seattle',
  '891': 'Las Vegas',
  '752': 'Dallas',
  '750': 'Dallas',
  '751': 'Dallas',
  '753': 'Dallas',
  '606': 'Chicago',
  '607': 'Chicago',
  '608': 'Chicago',
  '021': 'Boston',
  '022': 'Boston',
  '787': 'Austin',
  '786': 'Austin',
  '770': 'Houston',
  '771': 'Houston',
  '772': 'Houston',
  '773': 'Houston',
  '774': 'Houston',
  '775': 'Houston',
  '802': 'Denver',
  '800': 'Denver',
  '801': 'Denver',
  '303': 'Atlanta',
  '300': 'Atlanta',
  '301': 'Atlanta',
  '302': 'Atlanta',
  '701': 'New Orleans',
  '700': 'New Orleans',
  '972': 'Portland',
  '970': 'Portland',
  '971': 'Portland',
  '816': 'Aspen',
  '105': 'Westchester',
  '106': 'Westchester',
  '107': 'Westchester',
  '108': 'Westchester',
  '109': 'Westchester',
  '068': 'Westchester, Putnam & Fairfield',
  '069': 'Westchester, Putnam & Fairfield',
  '110': 'Long Island',
  '111': 'Long Island',
  '115': 'Long Island',
  '117': 'Long Island',
  '118': 'Long Island',
  '119': 'Long Island',
  '012': 'The Berkshires',
  '013': 'The Berkshires',
};

function normalizeZip(value) {
  if (value == null) return null;
  const s = String(value).trim();
  const m = s.match(/\b(\d{5})\b/);
  return m ? m[1] : null;
}

function serviceAreaFromZip(zip) {
  if (!zip || zip.length < 3) return null;
  const prefix = zip.slice(0, 3);
  const area = ZIP_PREFIX_TO_SERVICE_AREA[prefix];
  return area && GRADITO_SERVICE_AREAS.includes(area) ? area : null;
}

function extractZipFromPvEvent(ev) {
  const direct = [ev.zip, ev.zip_code, ev.postal_code, ev.postal];
  for (const v of direct) {
    const z = normalizeZip(v);
    if (z) return z;
  }
  const addr = ev.event_address ?? ev.address ?? ev.location;
  if (addr && typeof addr === 'object') {
    const a = addr as Record<string, unknown>;
    const z = normalizeZip(a.zip ?? a.postal_code ?? a.postal ?? a.zip_code);
    if (z) return z;
    const line = [a.line1, a.line_1, a.street, a.street_1].filter(Boolean).join(' ');
    const fromLine = normalizeZip(line) || (typeof line === 'string' ? line.match(/\b(\d{5})\b/)?.[1] : null);
    if (fromLine) return fromLine;
  }
  if (typeof addr === 'string') {
    const z = normalizeZip(addr);
    if (z) return z;
  }
  const custom = ev.custom_field_values ?? ev.custom_fields ?? ev.answers ?? ev.form_answers;
  if (Array.isArray(custom)) {
    for (const item of custom) {
      const label = String(item?.label ?? item?.name ?? item?.key ?? item?.field_name ?? '').toLowerCase();
      const val = item?.value ?? item?.answer ?? item?.text;
      if (label.includes('zip')) {
        const z = normalizeZip(val);
        if (z) return z;
      }
      if (typeof val === 'string') {
        const m = val.match(/\bZip:\s*(\d{5})\b/i) || val.match(/\b(\d{5})\b/);
        if (m) return m[1];
      }
    }
  }
  for (const key of ['notes', 'description', 'event_address']) {
    const s = ev[key];
    if (typeof s === 'string') {
      const m = s.match(/\bZip:\s*(\d{5})\b/i) || s.match(/\b(\d{5})(?:-\d{4})?\b/);
      if (m) return m[1];
    }
  }
  return null;
}

function resolveServiceAreaFromPv(ev, venue) {
  const fromVenue = mapServiceAreaFromVenueName(venue?.name);
  if (fromVenue) return fromVenue;
  const zip = extractZipFromPvEvent(ev);
  if (zip) {
    const fromZip = serviceAreaFromZip(zip);
    if (fromZip) return fromZip;
  }
  const fallback = venue?.name?.trim();
  if (fallback && isKnownServiceArea(fallback)) return fallback;
  return null;
}

export function pvAmountToRevenue(amount) {
  return typeof amount === 'number' && Number.isFinite(amount) ? amount / 100 : 0;
}

function datePartFromPvValue(value) {
  if (value == null) return null;
  if (typeof value === 'string') {
    const d = value.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  }
  return null;
}

export function eventDateFromPv(ev) {
  const candidates = [ev.start_time, ev.start_date, ev.end_time, ev.end_date, ev.date];
  for (const c of candidates) {
    const d = datePartFromPvValue(c);
    if (d) return d;
  }
  return null;
}

function resolveEventTypeFromPv(ev) {
  const raw = ev.event_type;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  const spaces = ev.spaces;
  if (Array.isArray(spaces) && spaces.length) {
    const first = spaces[0];
    if (typeof first === 'string' && first.trim()) return first.trim();
    if (first && typeof first === 'object' && typeof first.name === 'string' && first.name.trim()) {
      return first.name.trim();
    }
  }
  return null;
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
function buildPvMetadata(ev) {
  const zip = extractZipFromPvEvent(ev);
  return {
    name: ev.name,
    source: ev.source,
    campaign: ev.campaign,
    spaces: ev.spaces,
    owner_id: ev.owner_id,
    start_time: ev.start_time,
    end_time: ev.end_time,
    start_date: ev.start_date ?? null,
    end_date: ev.end_date ?? null,
    amount: ev.amount,
    contact_id: ev.contact_id,
    venue_id: ev.venue_id,
    zip,
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
function buildCrmPatchFromPv(ev, venues, contacts) {
  const venue = ev.venue_id ? venues.get(ev.venue_id) : undefined;
  const contact = ev.contact_id ? contacts.get(ev.contact_id) : undefined;
  const clientName = contactDisplayName(contact, ev.name);
  return {
    perfect_venue_id: ev.id,
    event_source: 'perfect_venue',
    pv_venue_id: ev.venue_id ?? null,
    date: eventDateFromPv(ev),
    service_area: resolveServiceAreaFromPv(ev, venue),
    client_id: null as string | null,
    client_name: clientName,
    event_type: resolveEventTypeFromPv(ev),
    guest_count: ev.group_size ?? null,
    status: mapPvStatus(ev.status),
    client_revenue: pvAmountToRevenue(ev.amount),
    pv_metadata: buildPvMetadata(ev),
  };
}

/** Batch upsert one API page: select existing, bulk insert new, bulk upsert CRM fields from PV (including date and revenue). */
export async function upsertEventsBatch(
  adminClient,
  events,
  venues,
  contacts,
  options: { linkClients?: boolean } = {},
): Promise<{ inserted: number; updated: number; skipped: number }> {
  const linkClients = options.linkClients === true;
  let skipped = 0;
  const withIds = (events ?? []).filter((ev) => {
    if (!ev?.id) {
      skipped += 1;
      return false;
    }
    return true;
  });
  if (!withIds.length) return { inserted: 0, updated: 0, skipped };

  const pvIds = withIds.map((ev) => ev.id);
  const { data: existingRows, error: selectError } = await adminClient
    .from('events')
    .select('perfect_venue_id')
    .in('perfect_venue_id', pvIds);
  if (selectError) throw new Error(selectError.message || 'Failed to query existing events');

  const existingSet = new Set((existingRows ?? []).map((r) => r.perfect_venue_id));

  const insertRows: Record<string, unknown>[] = [];
  const updateRows: Record<string, unknown>[] = [];

  for (const ev of withIds) {
    const crmPatch = buildCrmPatchFromPv(ev, venues, contacts);
    if (linkClients) {
      const contact = ev.contact_id ? contacts.get(ev.contact_id) : undefined;
      const clientName = contactDisplayName(contact, ev.name);
      crmPatch.client_id = await resolveClientId(adminClient, contact, clientName);
    }
    if (existingSet.has(ev.id)) {
      updateRows.push(crmPatch);
    } else {
      insertRows.push({
        ...crmPatch,
        notes: ev.name ?? null,
        commission_status: 'Pending',
        cuisines_served: [],
        facilitators: {},
        admin_fee_applies_to: [],
      });
    }
  }

  let inserted = 0;
  let updated = 0;

  if (insertRows.length) {
    const { error } = await adminClient.from('events').insert(insertRows);
    if (error) throw new Error(error.message || 'Failed to insert Perfect Venue events');
    inserted = insertRows.length;
  }

  if (updateRows.length) {
    const { error } = await adminClient
      .from('events')
      .upsert(updateRows, { onConflict: 'perfect_venue_id' });
    if (error) throw new Error(error.message || 'Failed to upsert Perfect Venue events');
    updated = updateRows.length;
  }

  return { inserted, updated, skipped };
}

export async function upsertEventFromPv(adminClient, ev, venues, contacts, options = {}) {
  const result = await upsertEventsBatch(adminClient, [ev], venues, contacts, options);
  if (result.skipped) return 'skipped';
  if (result.inserted) return 'inserted';
  if (result.updated) return 'updated';
  return 'skipped';
}
async function fetchEventsPage(accessToken, venueId, mode, page, dateFrom, dateTo) {
  const query: Record<string, string> = {
    venue_id: venueId,
    page: String(page),
    per_page: '100',
  };
  if (mode === 'incremental' && dateFrom) {
    query.date_field = 'updated_at';
    query.date_from = dateFrom;
    query.date_to = dateTo;
  }
  const data = await pvApiGet(accessToken, '/events', query);
  const events = data.events ?? (Array.isArray(data) ? data : []);
  if (events.length === 0) return { events: [], hasMore: false };
  const totalPages = data.meta?.total_pages;
  let hasMore = events.length >= 100;
  if (totalPages != null) hasMore = page < totalPages;
  else if (page >= 50) {
    console.warn(`fetchEventsPage: venue ${venueId} stopping at page ${page} without total_pages`);
    hasMore = false;
  }
  if (events.length < 100) hasMore = false;
  if (page >= MAX_EVENT_PAGES_PER_VENUE) hasMore = false;
  return { events, hasMore };
}

function parseCheckpoint(raw: unknown): PvSyncCheckpoint | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as PvSyncCheckpoint;
  if (!c.run_id || !c.mode || !Array.isArray(c.venue_ids)) return null;
  return c;
}

async function saveCheckpoint(adminClient, checkpoint: PvSyncCheckpoint) {
  const { error } = await adminClient
    .from('integration_perfect_venue_connections')
    .update({ sync_checkpoint: checkpoint })
    .eq('id', 1);
  if (error) throw new Error(error.message || 'Failed to save sync checkpoint');
}

async function clearCheckpoint(adminClient) {
  await adminClient.from('integration_perfect_venue_connections').update({ sync_checkpoint: null }).eq('id', 1);
}

async function heartbeatRun(adminClient, runId: string, inserted: number, updated: number) {
  await adminClient
    .from('perfect_venue_sync_runs')
    .update({
      inserted,
      updated,
      heartbeat_at: new Date().toISOString(),
    })
    .eq('id', runId);
}

async function expireStaleSyncRuns(adminClient) {
  const staleBefore = new Date(Date.now() - SYNC_STALE_MS).toISOString();
  const { data: running, error: selectError } = await adminClient
    .from('perfect_venue_sync_runs')
    .select('id, started_at, heartbeat_at')
    .eq('status', 'running');
  if (selectError) return;
  const staleIds = (running ?? []).filter((r) => {
    const last = r.heartbeat_at ?? r.started_at;
    return last && last < staleBefore;
  }).map((r) => r.id);
  if (!staleIds.length) return;
  await adminClient
    .from('perfect_venue_sync_runs')
    .update({
      finished_at: new Date().toISOString(),
      status: 'failed',
      error_message: 'Timed out or interrupted (stale heartbeat)',
    })
    .in('id', staleIds);
  await clearCheckpoint(adminClient);
}

async function assertNoActiveSync(adminClient) {
  const freshSince = new Date(Date.now() - SYNC_STALE_MS).toISOString();
  const { data: active, error } = await adminClient
    .from('perfect_venue_sync_runs')
    .select('id, started_at, heartbeat_at')
    .eq('status', 'running')
    .limit(5);
  if (error) throw new Error(error.message || 'Failed to check sync status');
  const fresh = (active ?? []).filter((r) => {
    const last = r.heartbeat_at ?? r.started_at;
    return last && last >= freshSince;
  });
  if (fresh.length) throw new SyncInProgressError();
}

async function loadRunningRun(adminClient, runId: string) {
  const { data, error } = await adminClient
    .from('perfect_venue_sync_runs')
    .select('id, status, mode, started_at, heartbeat_at')
    .eq('id', runId)
    .maybeSingle();
  if (error) throw new Error(error.message || 'Failed to load sync run');
  return data;
}

function runHeartbeatIsFresh(run: { heartbeat_at?: string | null; started_at?: string | null }) {
  const freshSince = Date.now() - SYNC_STALE_MS;
  const last = run.heartbeat_at ?? run.started_at;
  if (!last) return false;
  return new Date(last).getTime() >= freshSince;
}

async function expireRunById(adminClient, runId: string, errorMessage: string) {
  await adminClient
    .from('perfect_venue_sync_runs')
    .update({
      finished_at: new Date().toISOString(),
      status: 'failed',
      error_message: errorMessage,
    })
    .eq('id', runId);
  await clearCheckpoint(adminClient);
}

export async function listSyncRuns(adminClient, limit = 50) {
  const { data, error } = await adminClient
    .from('perfect_venue_sync_runs')
    .select(
      'id, started_at, finished_at, sync_trigger, mode, status, inserted, updated, error_message, actor_id, heartbeat_at',
    )
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

type SyncRunContext = { trigger: 'cron' | 'manual'; actorId?: string | null };
type SyncOptions = { continue?: boolean };

export async function syncPerfectVenueEvents(
  adminClient,
  mode: 'full' | 'incremental',
  runContext: SyncRunContext = { trigger: 'manual' },
  options: SyncOptions = {},
): Promise<PvSyncResult> {
  const row = await loadConnection(adminClient);
  if (!row?.connected) throw new Error('Perfect Venue is not connected');

  await expireStaleSyncRuns(adminClient);

  let rowAfterExpire = await loadConnection(adminClient);
  const existingCheckpoint = parseCheckpoint(rowAfterExpire?.sync_checkpoint);
  const wantContinue = options.continue === true;

  let checkpoint: PvSyncCheckpoint | null = null;
  let runId: string;
  let resume = false;

  if (existingCheckpoint) {
    const run = await loadRunningRun(adminClient, existingCheckpoint.run_id);
    if (run?.status === 'running') {
      if (wantContinue) {
        if (existingCheckpoint.mode !== mode) {
          throw new Error(`Cannot continue ${existingCheckpoint.mode} sync as ${mode}`);
        }
        checkpoint = existingCheckpoint;
        runId = existingCheckpoint.run_id;
        resume = true;
      } else if (runHeartbeatIsFresh(run)) {
        throw new SyncInProgressError(
          'Sync in progress and completing in the background. Wait for the next automatic tick or check Sync history.',
        );
      } else {
        await expireRunById(adminClient, existingCheckpoint.run_id, 'Stale sync replaced by new request');
        await clearCheckpoint(adminClient);
      }
    } else {
      await clearCheckpoint(adminClient);
    }
  }

  if (!resume) {
    await assertNoActiveSync(adminClient);
    const { data: runRow, error: runInsertError } = await adminClient
      .from('perfect_venue_sync_runs')
      .insert({
        sync_trigger: runContext.trigger,
        mode,
        status: 'running',
        actor_id: runContext.actorId ?? null,
        heartbeat_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (runInsertError) throw new Error(runInsertError.message || 'Failed to start sync run');
    runId = runRow.id;

    let accessToken = await resolveAccessToken(adminClient, row);
    const venues = await fetchVenues(accessToken);
    const venueIds = venues.map((v) => v.id);
    const now = new Date();
    const dateTo = now.toISOString();
    let dateFrom: string | null = null;
    if (mode === 'incremental' && row.last_synced_updated_at) {
      const fromMs = new Date(row.last_synced_updated_at).getTime() - PV_SYNC_OVERLAP_MS;
      dateFrom = new Date(fromMs).toISOString();
    }
    checkpoint = {
      run_id: runId,
      mode,
      venue_ids: venueIds,
      venues: venues.map((v) => ({ id: v.id, name: v.name })),
      venue_index: 0,
      event_page: 1,
      date_from: dateFrom,
      date_to: dateTo,
      inserted: 0,
      updated: 0,
      events_fetched: 0,
    };
    await saveCheckpoint(adminClient, checkpoint);
    await heartbeatRun(adminClient, runId, 0, 0);
  }

  if (!checkpoint) throw new Error('Sync checkpoint missing');

  let runFinalized = false;
  let returnedPartial = false;
  const contacts = new Map();
  const venueMap = buildVenueMap(
    checkpoint.venues.map((v) => ({ id: v.id, name: v.name })),
  );
  const venuesCount = checkpoint.venue_ids.length;

  const finalizeRun = async (
    status: 'success' | 'failed',
    extra: { error_message?: string; inserted?: number; updated?: number } = {},
  ) => {
    if (runFinalized) return;
    runFinalized = true;
    await adminClient
      .from('perfect_venue_sync_runs')
      .update({
        finished_at: new Date().toISOString(),
        status,
        inserted: extra.inserted ?? checkpoint!.inserted,
        updated: extra.updated ?? checkpoint!.updated,
        error_message: extra.error_message ?? null,
      })
      .eq('id', runId);
  };

  const chunkDeadline = Date.now() + SYNC_CHUNK_BUDGET_MS;

  try {
    let connectionRow = row;
    let accessToken = await resolveAccessToken(adminClient, connectionRow);

    while (checkpoint.venue_index < checkpoint.venue_ids.length) {
      if (Date.now() >= chunkDeadline) {
        await saveCheckpoint(adminClient, checkpoint);
        await heartbeatRun(adminClient, runId, checkpoint.inserted, checkpoint.updated);
        returnedPartial = true;
        return {
          inserted: checkpoint.inserted,
          updated: checkpoint.updated,
          events_fetched: checkpoint.events_fetched,
          venues: venuesCount,
          run_id: runId,
          partial: true,
          continue: true,
          background: true,
        };
      }

      const venueId = checkpoint.venue_ids[checkpoint.venue_index];
      let pageResult;
      try {
        pageResult = await fetchEventsPage(
          accessToken,
          venueId,
          checkpoint.mode,
          checkpoint.event_page,
          checkpoint.date_from,
          checkpoint.date_to,
        );
      } catch (err) {
        if (err instanceof Error && err.message.includes('401')) {
          connectionRow = (await loadConnection(adminClient)) ?? connectionRow;
          accessToken = await resolveAccessToken(adminClient, connectionRow);
          pageResult = await fetchEventsPage(
            accessToken,
            venueId,
            checkpoint.mode,
            checkpoint.event_page,
            checkpoint.date_from,
            checkpoint.date_to,
          );
        } else {
          throw err;
        }
      }

      const { events, hasMore } = pageResult;
      checkpoint.events_fetched += events.length;

      const batch = await upsertEventsBatch(adminClient, events, venueMap, contacts, {
        linkClients: false,
      });
      checkpoint.inserted += batch.inserted;
      checkpoint.updated += batch.updated;

      await heartbeatRun(adminClient, runId, checkpoint.inserted, checkpoint.updated);

      if (hasMore) {
        checkpoint.event_page += 1;
      } else {
        checkpoint.venue_index += 1;
        checkpoint.event_page = 1;
      }
      await saveCheckpoint(adminClient, checkpoint);
    }

    const completedAt = new Date().toISOString();
    const stats = {
      inserted: checkpoint.inserted,
      updated: checkpoint.updated,
      events_fetched: checkpoint.events_fetched,
      mode: checkpoint.mode,
      at: completedAt,
    };
    const patch: Record<string, unknown> = {
      venue_ids: checkpoint.venue_ids,
      venues: checkpoint.venues,
      last_sync_at: completedAt,
      last_sync_error: null,
      last_sync_stats: stats,
      last_synced_updated_at: completedAt,
      sync_checkpoint: null,
    };
    if (checkpoint.mode === 'full') patch.last_full_sync_at = completedAt;
    await adminClient.from('integration_perfect_venue_connections').update(patch).eq('id', 1);

    await finalizeRun('success');
    return {
      inserted: checkpoint.inserted,
      updated: checkpoint.updated,
      events_fetched: checkpoint.events_fetched,
      venues: venuesCount,
      run_id: runId,
    };
  } catch (err) {
    if (err instanceof SyncInProgressError) throw err;
    const message = err instanceof Error ? err.message : 'Sync failed';
    await clearCheckpoint(adminClient);
    await finalizeRun('failed', { error_message: message });
    throw err instanceof Error ? err : new Error(message);
  } finally {
    if (!runFinalized && !returnedPartial) {
      await finalizeRun('failed', {
        error_message: 'Timed out or interrupted before completion',
      });
      await clearCheckpoint(adminClient);
    }
  }
}

export type PvSyncTickResult = PvSyncResult | { idle: true };

/** Process one chunk for an in-flight checkpoint (cron tick). */
export async function syncPerfectVenueEventsTick(adminClient): Promise<PvSyncTickResult> {
  const row = await loadConnection(adminClient);
  if (!row?.connected) throw new Error('Perfect Venue is not connected');
  await expireStaleSyncRuns(adminClient);
  const fresh = await loadConnection(adminClient);
  const cp = parseCheckpoint(fresh?.sync_checkpoint);
  if (!cp) return { idle: true };
  return syncPerfectVenueEvents(adminClient, cp.mode, { trigger: 'cron', actorId: null }, { continue: true });
}

/** Daily cron: start incremental sync only when no checkpoint is active (one chunk). */
export async function startScheduledIncrementalIfIdle(
  adminClient,
): Promise<PvSyncResult | { skipped: true; reason: string }> {
  const row = await loadConnection(adminClient);
  if (!row?.connected) throw new Error('Perfect Venue is not connected');
  await expireStaleSyncRuns(adminClient);
  const fresh = await loadConnection(adminClient);
  if (parseCheckpoint(fresh?.sync_checkpoint)) {
    return { skipped: true, reason: 'checkpoint_in_progress' };
  }
  return syncPerfectVenueEvents(adminClient, 'incremental', { trigger: 'cron', actorId: null }, { continue: false });
}
function checkpointProgressFromRow(row) {
  const cp = parseCheckpoint(row?.sync_checkpoint);
  if (!cp) return null;
  return {
    run_id: cp.run_id,
    mode: cp.mode,
    venue_index: cp.venue_index,
    total_venues: cp.venue_ids.length,
    events_fetched: cp.events_fetched,
    inserted: cp.inserted,
    updated: cp.updated,
  };
}

export async function toPublicStatus(adminClient, row) {
  const checkpoint_progress = checkpointProgressFromRow(row);
  const sync_in_progress = checkpoint_progress != null;
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
      last_sync_stats: null,
      sync_in_progress: false,
      checkpoint_progress: null,
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
    last_sync_stats: row.last_sync_stats ?? null,
    sync_in_progress,
    checkpoint_progress,
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
