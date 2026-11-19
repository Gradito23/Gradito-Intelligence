/** Pure Perfect Venue event → Gradito field helpers (testable without Deno edge deps). */

export type PvContactLike = {
  id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
};

export type PvCustomFieldEntry = { label: string; value: string };

export type PvVenueLike = {
  name?: string;
  custom_fields?: { key?: string; name?: string }[];
  address?: {
    street_address1?: string;
    street_address2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
};

export type PvEventLike = Record<string, unknown> & {
  id?: string;
  name?: string;
  contact_id?: string;
  contact_name?: string;
  amount?: number;
  budget?: number;
  estimated_budget?: number;
  total_amount?: number;
  start_time?: unknown;
  end_time?: unknown;
  event_address?: unknown;
  address?: unknown;
  /** PV API: keyed by venue custom field `key` (see PV "Data model notes"). */
  custom?: Record<string, unknown>;
  custom_field_values?: unknown;
  custom_fields?: unknown;
  contact?: PvContactLike;
  /** Set during sync after Get Event still had no intake — do not block page upsert. */
  _pv_detail_exhausted?: boolean;
};

const SERVICE_AREA_FROM_ADDRESS: { pattern: RegExp; area: string }[] = [
  { pattern: /\bmanhattan\b|\bnew york,?\s*ny\b|\byork avenue\b/i, area: 'Manhattan' },
  { pattern: /\bbrooklyn\b/i, area: 'Brooklyn' },
  { pattern: /\bqueens\b/i, area: 'Brooklyn' },
  { pattern: /\bbronx\b/i, area: 'Brooklyn' },
  { pattern: /\bwestchester\b|\bwhite plains\b|\byonkers\b/i, area: 'Westchester' },
  { pattern: /\bhamptons\b|\bsouthampton\b|\beast hampton\b/i, area: 'The Hamptons' },
  { pattern: /\bnewark\b|\bjersey city\b|\bhoboken\b|\bnew jersey\b/i, area: 'New Jersey' },
  { pattern: /\bmiami\b|\bbrickell\b/i, area: 'Miami' },
  { pattern: /\bflorida keys\b|\bislamorada\b|\bkey largo\b/i, area: 'Miami' },
  { pattern: /\blos angeles\b|\b\s+ca\b/i, area: 'Los Angeles' },
  { pattern: /\bphiladelphia\b|\b\s+pa\b/i, area: 'Philadelphia' },
  { pattern: /\bwashington\b|\b\s+dc\b/i, area: 'Washington DC' },
  { pattern: /\bsan francisco\b/i, area: 'San Francisco' },
  { pattern: /\bnashville\b/i, area: 'Nashville' },
  { pattern: /\bseattle\b/i, area: 'Seattle' },
  { pattern: /\blas vegas\b/i, area: 'Las Vegas' },
  { pattern: /\bdallas\b/i, area: 'Dallas' },
  { pattern: /\bchicago\b/i, area: 'Chicago' },
  { pattern: /\bboston\b/i, area: 'Boston' },
  { pattern: /\baustin\b/i, area: 'Austin' },
  { pattern: /\bhouston\b/i, area: 'Houston' },
  { pattern: /\bdenver\b/i, area: 'Denver' },
  { pattern: /\batlanta\b/i, area: 'Atlanta' },
  { pattern: /\bnew orleans\b/i, area: 'New Orleans' },
  { pattern: /\bportland\b/i, area: 'Portland' },
  { pattern: /\bsan diego\b/i, area: 'San Diego' },
  { pattern: /\bpalm beach\b/i, area: 'Palm Beach' },
  { pattern: /\baspen\b/i, area: 'Aspen' },
];

/** Map free-text event address / intake location to a Gradito roster market when unambiguous. */
export function inferServiceAreaFromAddressText(text: string | null | undefined): string | null {
  const hay = text?.trim();
  if (!hay) return null;
  for (const row of SERVICE_AREA_FROM_ADDRESS) {
    if (row.pattern.test(hay)) return row.area;
  }
  return null;
}

const EVENT_TITLE_WORDS = /\b(dinner|wedding|reception|party|corporate|birthday|engagement|gala|luncheon|brunch|catering|welcome)\b/i;

export function contactDisplayNameFromContact(contact?: PvContactLike | null): string | null {
  if (!contact) return null;
  const parts = [contact.first_name, contact.last_name].filter(Boolean);
  if (parts.length) return parts.join(' ');
  if (contact.email) return contact.email;
  return null;
}

export function parseEventTitleFromName(evName?: string | null): string | null {
  const raw = evName?.trim();
  if (!raw) return null;
  const parts = raw.split(/\s*\|\s*|\s+—\s+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return parts.slice(1).join(' | ');
  return raw;
}

function firstSegmentLooksLikePersonName(segment: string): boolean {
  const s = segment.trim();
  if (!s || s.length > 80) return false;
  if (EVENT_TITLE_WORDS.test(s)) return false;
  if (s.includes('|')) return false;
  return true;
}

export function parseClientNameFromPvEvent(ev: PvEventLike, contact?: PvContactLike | null): string | null {
  const fromContact = contactDisplayNameFromContact(contact);
  if (fromContact) return fromContact;

  const nested = ev.contact as PvContactLike | undefined;
  const fromNested = contactDisplayNameFromContact(nested);
  if (fromNested) return fromNested;

  if (typeof ev.contact_name === 'string' && ev.contact_name.trim()) {
    return ev.contact_name.trim();
  }

  const raw = ev.name?.trim();
  if (!raw) return null;

  const parts = raw.split(/\s*\|\s*|\s+—\s+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2 && firstSegmentLooksLikePersonName(parts[0])) {
    return parts[0];
  }
  if (parts.length === 1 && firstSegmentLooksLikePersonName(parts[0])) {
    return parts[0];
  }

  return raw;
}

export function buildInsertNotes(clientName: string | null, evName: string | null): string | null {
  const title = parseEventTitleFromName(evName) ?? evName?.trim();
  if (clientName && title && title !== clientName) {
    return `${clientName} — ${title}`;
  }
  return evName?.trim() || clientName;
}

export function notesLooksAutoGenerated(
  notes: string | null | undefined,
  evName: string | null | undefined,
  clientName: string | null | undefined,
): boolean {
  const n = notes?.trim();
  if (!n) return true;
  if (evName && n === evName.trim()) return true;
  const built = buildInsertNotes(clientName ?? null, evName ?? null);
  if (built && n === built.trim()) return true;
  return false;
}

export function getPvRevenueRaw(ev: PvEventLike): Record<string, number | null> {
  const pick = (key: string) => {
    const v = ev[key];
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  };
  return {
    amount: pick('amount'),
    budget: pick('budget'),
    estimated_budget: pick('estimated_budget'),
    total_amount: pick('total_amount'),
  };
}

function moneyCentsToDollars(cents: number): number {
  return cents / 100;
}

function moneyMaybeCentsToDollars(value: number): number {
  if (Number.isInteger(value) && Math.abs(value) >= 100) return value / 100;
  return value;
}

export function resolvePvRevenue(ev: PvEventLike): number {
  const raw = getPvRevenueRaw(ev);
  if (raw.amount != null && raw.amount !== 0) return moneyCentsToDollars(raw.amount);
  for (const key of ['budget', 'estimated_budget', 'total_amount'] as const) {
    const v = raw[key];
    if (v != null && v !== 0) return moneyMaybeCentsToDollars(v);
  }
  if (raw.amount != null) return moneyCentsToDollars(raw.amount);
  return 0;
}

export function pvMinutesToDisplayTime(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    const t = value.trim();
    if (/^\d{1,2}:\d{2}/.test(t)) return t.slice(0, 5);
    return t;
  }
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 24 * 60) {
    const h = Math.floor(value / 60);
    const m = value % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return null;
}

export function formatPvEventTimes(ev: PvEventLike): {
  start_time_raw: unknown;
  end_time_raw: unknown;
  start_time_display: string | null;
  end_time_display: string | null;
} {
  return {
    start_time_raw: ev.start_time ?? null,
    end_time_raw: ev.end_time ?? null,
    start_time_display: pvMinutesToDisplayTime(ev.start_time),
    end_time_display: pvMinutesToDisplayTime(ev.end_time),
  };
}

type CustomFieldItem = {
  label?: string;
  name?: string;
  key?: string;
  field_name?: string;
  value?: unknown;
  answer?: unknown;
  text?: unknown;
};

function venueCustomFieldKeyToName(
  venue?: PvVenueLike | null,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const f of venue?.custom_fields ?? []) {
    const key = f?.key?.trim();
    const name = f?.name?.trim();
    if (key && name) map.set(key, name);
  }
  return map;
}

function customObjectToFieldItems(
  custom: Record<string, unknown>,
  keyToName: Map<string, string>,
): CustomFieldItem[] {
  const out: CustomFieldItem[] = [];
  for (const [key, value] of Object.entries(custom)) {
    if (value == null) continue;
    const label = keyToName.get(key) ?? key;
    out.push({ key, name: label, label, value });
  }
  return out;
}

/**
 * Merge PV `custom` (official API shape) into array-style custom fields for mappers.
 * Call at sync boundary so list/detail payloads both work.
 */
export function normalizePvEventForMapping(
  ev: PvEventLike,
  venue?: PvVenueLike | null,
): PvEventLike {
  const keyToName = venueCustomFieldKeyToName(venue);
  const fromArrays = (() => {
    const raw = ev.custom_field_values ?? ev.custom_fields ?? ev.answers ?? ev.form_answers;
    if (!Array.isArray(raw)) return [] as CustomFieldItem[];
    return raw as CustomFieldItem[];
  })();

  const rawCustom = ev.custom;
  if (!rawCustom || typeof rawCustom !== 'object' || Array.isArray(rawCustom)) {
    return ev;
  }

  const fromObject = customObjectToFieldItems(rawCustom as Record<string, unknown>, keyToName);
  if (!fromObject.length) return ev;

  const seenKeys = new Set(
    fromArrays.map((item) => String(item.key ?? item.name ?? item.label ?? '').toLowerCase()).filter(Boolean),
  );
  const merged = [...fromArrays];
  for (const item of fromObject) {
    const k = String(item.key ?? '').toLowerCase();
    if (k && seenKeys.has(k)) continue;
    merged.push(item);
    if (k) seenKeys.add(k);
  }

  return { ...ev, custom_field_values: merged };
}

export function iterPvCustomFields(ev: PvEventLike): CustomFieldItem[] {
  const raw = ev.custom_field_values ?? ev.answers ?? ev.form_answers;
  if (Array.isArray(raw)) return raw as CustomFieldItem[];
  const legacyFields = ev.custom_fields;
  if (Array.isArray(legacyFields)) return legacyFields as CustomFieldItem[];
  if (
    legacyFields &&
    typeof legacyFields === 'object' &&
    !Array.isArray(legacyFields)
  ) {
    return Object.entries(legacyFields as Record<string, unknown>).map(([key, value]) => ({
      key,
      name: key,
      label: key,
      value,
    }));
  }
  return [];
}

export function customFieldAnswer(item: CustomFieldItem): string | null {
  const val = item.value ?? item.answer ?? item.text;
  if (val == null) return null;
  if (typeof val === 'string') return val.trim() || null;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  return null;
}

export function findCustomFieldByLabel(ev: PvEventLike, labelNeedle: string): string | null {
  const needle = labelNeedle.toLowerCase();
  for (const item of iterPvCustomFields(ev)) {
    const label = String(item.label ?? item.name ?? item.key ?? item.field_name ?? '').toLowerCase();
    if (label.includes(needle)) {
      const ans = customFieldAnswer(item);
      if (ans) return ans;
    }
  }
  return null;
}

export function extractEventAddress(ev: PvEventLike): string | null {
  const addr = ev.event_address ?? ev.address ?? ev.location;
  if (typeof addr === 'string' && addr.trim()) return addr.trim();
  if (addr && typeof addr === 'object') {
    const a = addr as Record<string, unknown>;
    const parts = [
      a.line1,
      a.line_1,
      a.street,
      a.street_1,
      a.city,
      a.state,
      a.region,
    ].filter((x) => typeof x === 'string' && x.trim());
    if (parts.length) return parts.join(', ');
    const formatted = a.formatted ?? a.full;
    if (typeof formatted === 'string' && formatted.trim()) return formatted.trim();
  }
  return findCustomFieldByLabel(ev, 'event address') ?? findCustomFieldByLabel(ev, 'address');
}

export function extractEventLocationLabel(ev: PvEventLike): string | null {
  const fromCustom =
    findCustomFieldByLabel(ev, 'event space') ??
    findCustomFieldByLabel(ev, 'event location') ??
    findCustomFieldByLabel(ev, 'event address');
  if (fromCustom) {
    const firstLine = fromCustom.split(/[\n,]/)[0]?.trim();
    if (firstLine) return firstLine;
  }
  const addr = extractEventAddress(ev);
  if (addr) {
    const firstLine = addr.split(/[\n,]/)[0]?.trim();
    if (firstLine) return firstLine;
  }
  return null;
}

/** Gradito Area: roster market when inferable; not a raw street address. */
export function resolveAreaFromPv(
  ev: PvEventLike,
  options: { knownGraditoMarket?: string | null; pvAccountVenueName?: string | null } = {},
): string | null {
  if (options.knownGraditoMarket?.trim()) return options.knownGraditoMarket.trim();

  const addressHay =
    findCustomFieldByLabel(ev, 'event address') ??
    extractEventAddress(ev) ??
    extractEventLocationLabel(ev);
  const fromAddress = inferServiceAreaFromAddressText(addressHay);
  if (fromAddress) return fromAddress;

  const loc = extractEventLocationLabel(ev) ?? extractEventAddress(ev);
  if (loc) {
    const inferred = inferServiceAreaFromAddressText(loc);
    if (inferred) return inferred;
  }

  const title = parseEventTitleFromName(ev.name);
  if (title) {
    const inMatch = title.match(/\b(?:in|at)\s+(.+)$/i);
    if (inMatch?.[1]?.trim()) {
      const region = inMatch[1].trim();
      const fromTitle = inferServiceAreaFromAddressText(region);
      if (fromTitle) return fromTitle;
      return region.slice(0, 120);
    }
  }
  const venue = options.pvAccountVenueName?.trim();
  if (venue && venue.toLowerCase() !== 'gradito') {
    return null;
  }
  return null;
}

export function buildCustomFieldsArray(ev: PvEventLike): PvCustomFieldEntry[] {
  const out: PvCustomFieldEntry[] = [];
  for (const item of iterPvCustomFields(ev)) {
    const label = String(
      item.label ?? item.name ?? item.key ?? item.field_name ?? '',
    ).trim();
    const value = customFieldAnswer(item);
    if (!label || !value) continue;
    out.push({
      label,
      value: value.length > 2000 ? `${value.slice(0, 1997)}...` : value,
    });
  }
  return out;
}

function readPvStringField(ev: PvEventLike, key: string): string | null {
  const v = ev[key];
  if (typeof v === 'string' && v.trim()) return v.trim();
  if (v && typeof v === 'object' && 'name' in v) {
    const name = (v as { name?: string }).name;
    if (typeof name === 'string' && name.trim()) return name.trim();
  }
  return null;
}

export function resolvePvSpecialistNames(ev: PvEventLike): {
  sales_specialist_name: string | null;
  execution_specialist_name: string | null;
} {
  const sales =
    readPvStringField(ev, 'sales_specialist') ??
    readPvStringField(ev, 'sales_specialist_name') ??
    readPvStringField(ev, 'owner_name') ??
    readPvStringField(ev, 'owner') ??
    findCustomFieldByLabel(ev, 'sales specialist');
  const execution =
    readPvStringField(ev, 'execution_specialist') ??
    readPvStringField(ev, 'execution_specialist_name') ??
    findCustomFieldByLabel(ev, 'execution specialist');
  return { sales_specialist_name: sales, execution_specialist_name: execution };
}

const EXPERIENCE_KEYWORD_MAP: [RegExp, string][] = [
  [/\bwedding\b/i, 'Wedding'],
  [/\bcorporate\b/i, 'Corporate'],
  [/\bwelcome dinner\b/i, 'Family-Style'],
  [/\bcocktail\b|\bcanap/i, 'Cocktail Reception / Canapés'],
  [/\bbrunch\b/i, 'Brunch / Daytime'],
  [/\bclass\b/i, 'Interactive Cooking Class'],
];

/** Map PV vision/intake text to Gradito experience_type when unambiguous. */
export function resolveExperienceTypeFromPv(ev: PvEventLike): string | null {
  const chunks = [
    findCustomFieldByLabel(ev, 'type of event'),
    findCustomFieldByLabel(ev, 'vision'),
    parseEventTitleFromName(ev.name),
  ].filter(Boolean) as string[];
  const hay = chunks.join(' ').toLowerCase();
  if (!hay) return null;
  for (const [re, exp] of EXPERIENCE_KEYWORD_MAP) {
    if (re.test(hay)) return exp;
  }
  return null;
}

export function contactEmailFromPvContact(contact?: PvContactLike | null): string | null {
  return contact?.email?.trim() || null;
}

export function contactPhoneFromPvContact(contact?: PvContactLike | null): string | null {
  return contact?.mobile?.trim() || contact?.phone?.trim() || null;
}

const INTAKE_LABEL_KEYWORDS = [
  ['event timing', 'timing'],
  ['dietary', 'dietary'],
  ['vision', 'vision'],
  ['type of event', 'event vision'],
];

export function buildIntakeSummary(ev: PvEventLike): Record<string, string> | null {
  const out: Record<string, string> = {};
  for (const [needle, key] of INTAKE_LABEL_KEYWORDS) {
    const val = findCustomFieldByLabel(ev, needle);
    if (val) out[key] = val.length > 500 ? `${val.slice(0, 497)}...` : val;
  }
  return Object.keys(out).length ? out : null;
}

export type PvMetadataBuilt = {
  name?: string;
  source?: unknown;
  campaign?: unknown;
  spaces?: unknown;
  owner_id?: unknown;
  start_time?: unknown;
  end_time?: unknown;
  start_time_display?: string | null;
  end_time_display?: string | null;
  start_date?: unknown;
  end_date?: unknown;
  amount?: unknown;
  budget?: unknown;
  estimated_budget?: unknown;
  total_amount?: unknown;
  revenue_raw?: Record<string, number | null>;
  contact_id?: unknown;
  venue_id?: unknown;
  pv_venue_name?: string | null;
  zip?: string | null;
  event_address?: string | null;
  event_location_label?: string | null;
  intake_summary?: Record<string, string> | null;
  custom_fields?: PvCustomFieldEntry[];
  contact_email?: string | null;
  contact_phone?: string | null;
  sales_specialist_name?: string | null;
  execution_specialist_name?: string | null;
  attribution_unmatched?: string[] | null;
  updated_at?: unknown;
};

export function buildPvMetadataFields(
  ev: PvEventLike,
  options: {
    zip?: string | null;
    pvVenueName?: string | null;
    contact?: PvContactLike | null;
    attribution_unmatched?: string[] | null;
  } = {},
): PvMetadataBuilt {
  const revenueRaw = getPvRevenueRaw(ev);
  const times = formatPvEventTimes(ev);
  const specialists = resolvePvSpecialistNames(ev);
  return {
    name: ev.name,
    source: ev.source,
    campaign: ev.campaign,
    spaces: ev.spaces,
    owner_id: ev.owner_id,
    start_time: ev.start_time,
    end_time: ev.end_time,
    start_time_display: times.start_time_display,
    end_time_display: times.end_time_display,
    start_date: ev.start_date ?? null,
    end_date: ev.end_date ?? null,
    amount: ev.amount,
    budget: ev.budget,
    estimated_budget: ev.estimated_budget,
    total_amount: ev.total_amount,
    revenue_raw: revenueRaw,
    contact_id: ev.contact_id,
    venue_id: ev.venue_id,
    pv_venue_name: options.pvVenueName ?? null,
    zip: options.zip ?? null,
    event_address: extractEventAddress(ev),
    event_location_label: extractEventLocationLabel(ev),
    intake_summary: buildIntakeSummary(ev),
    custom_fields: buildCustomFieldsArray(ev),
    contact_email: contactEmailFromPvContact(options.contact),
    contact_phone: contactPhoneFromPvContact(options.contact),
    sales_specialist_name: specialists.sales_specialist_name,
    execution_specialist_name: specialists.execution_specialist_name,
    attribution_unmatched: options.attribution_unmatched ?? null,
    updated_at: ev.updated_at,
  };
}

/** True when event JSON has no documented intake after normalization (needs GET /events/{id}). */
export function pvEventNeedsDetailFetch(
  ev: PvEventLike,
  venue?: PvVenueLike | null,
  options: { detailAttempted?: boolean } = {},
): boolean {
  if (options.detailAttempted === true) return false;
  if (ev._pv_detail_exhausted === true) return false;
  const mapped = normalizePvEventForMapping(ev, venue);
  if (buildCustomFieldsArray(mapped).length > 0) return false;
  if (extractEventAddress(mapped)) return false;
  return true;
}

export function pageDetailEnrichmentComplete(
  events: PvEventLike[],
  venueMap: Map<string, unknown>,
  exhaustedIds: Set<string>,
): boolean {
  for (const ev of events) {
    const id = ev?.id != null ? String(ev.id) : '';
    const venue = ev?.venue_id ? venueMap.get(String(ev.venue_id)) : undefined;
    const attempted = id ? exhaustedIds.has(id) : false;
    if (pvEventNeedsDetailFetch(ev, venue as PvVenueLike | null, { detailAttempted: attempted })) {
      return false;
    }
  }
  return true;
}

export function shouldSyncPvClientRevenue(ev: PvEventLike): boolean {
  return resolvePvRevenue(ev) > 0;
}