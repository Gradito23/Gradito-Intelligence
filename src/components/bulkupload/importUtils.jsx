import * as XLSX from 'xlsx';

// ─── Regex helpers ────────────────────────────────────────────────────────────
export const PHONE_RE = /[\d\s\-\(\)\+\.]{7,}/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const CANVA_RE = /canva\.com\/design/i;
export const PRICE_TIER_RE = /^\$+$/;

export function isPhoneLike(val) { return val && PHONE_RE.test(String(val)); }
export function isEmailLike(val) { return val && EMAIL_RE.test(String(val).trim()); }
export function isCanvaLink(val) { return val && CANVA_RE.test(String(val)); }
export function isPriceTier(val) { return val && PRICE_TIER_RE.test(String(val).trim()); }
export function normalizeName(s) { return String(s || '').trim().toLowerCase().replace(/\s+/g, ' '); }

// ─── Chef column detection ────────────────────────────────────────────────────
export function detectChefColumnRoles(rows) {
  if (!rows.length) return {};
  const numCols = Math.max(...rows.map(r => r.length));
  const colValues = Array.from({ length: numCols }, (_, i) =>
    rows.map(r => r[i]).filter(v => v !== null && v !== undefined && String(v).trim() !== '')
  );

  const canvaCols = [];
  for (let i = 0; i < numCols; i++) {
    const vals = colValues[i];
    const canvaCount = vals.filter(v => isCanvaLink(v)).length;
    if (canvaCount > 0) {
      const uniqueRatio = new Set(vals.map(v => String(v))).size / Math.max(vals.length, 1);
      canvaCols.push({ i, canvaCount, uniqueRatio });
    }
  }
  canvaCols.sort((a, b) => b.uniqueRatio - a.uniqueRatio);

  const roles = {};
  if (canvaCols.length >= 1) roles[canvaCols[0].i] = 'menu_url';
  if (canvaCols.length >= 2) roles[canvaCols[1].i] = 'bio_url';

  for (let i = 0; i < numCols; i++) {
    if (roles[i]) continue;
    const vals = colValues[i];
    const numericCount = vals.filter(v => /^\d{1,3}$/.test(String(v).trim())).length;
    if (vals.length > 0 && numericCount / vals.length > 0.7) {
      roles[i] = 'bio_page';
      break;
    }
  }

  for (let i = 0; i < numCols; i++) {
    if (roles[i]) continue;
    const vals = colValues[i];
    const emailCount = vals.filter(v => isEmailLike(v)).length;
    const phoneCount = vals.filter(v => isPhoneLike(v) && !isEmailLike(v)).length;
    const priceTierCount = vals.filter(v => isPriceTier(v)).length;
    if (emailCount > phoneCount && emailCount > 0) { roles[i] = 'email'; continue; }
    if (phoneCount > emailCount && phoneCount > 0) { roles[i] = 'phone'; continue; }
    if (priceTierCount > 0) { roles[i] = 'price_tier'; continue; }
  }

  let nameIdx = 0;
  for (let i = 0; i < numCols && nameIdx < 2; i++) {
    if (roles[i]) continue;
    const vals = colValues[i];
    const stringCount = vals.filter(v => typeof v === 'string' && v.trim().length > 0 && !isCanvaLink(v)).length;
    if (stringCount > 0) {
      roles[i] = nameIdx === 0 ? 'first_name' : 'last_name';
      nameIdx++;
    }
  }

  return roles;
}

// ─── Event column detection (fuzzy header match) ─────────────────────────────
const EVENT_HEADER_MAP = {
  date: 'date', 'event date': 'date',
  'service area': 'service_area', area: 'service_area', market: 'service_area',
  client: 'client_name', 'client name': 'client_name', 'company': 'client_name',
  'event type': 'event_type', type: 'event_type',
  'experience type': 'experience_type', experience: 'experience_type',
  cuisine: 'cuisines_served', cuisines: 'cuisines_served',
  guests: 'guest_count', 'guest count': 'guest_count', pax: 'guest_count',
  revenue: 'client_revenue', 'client revenue': 'client_revenue', 'total revenue': 'client_revenue',
  status: 'status',
  notes: 'notes', note: 'notes',
  'head chef': 'head_chef_name', 'head chef name': 'head_chef_name',
  'head fee': 'head_chef_fee', 'head chef fee': 'head_chef_fee',
  'sous chef': 'sous_chef_name', 'sous chef name': 'sous_chef_name',
  'sous fee': 'sous_chef_fee', 'sous chef fee': 'sous_chef_fee',
  'booking id': 'booking_id', 'event id': 'booking_id', id: 'booking_id',
};

export function detectEventColumnRoles(headerRow) {
  if (!headerRow) return {};
  const roles = {};
  headerRow.forEach((cell, i) => {
    const key = String(cell || '').trim().toLowerCase();
    if (EVENT_HEADER_MAP[key]) roles[i] = EVENT_HEADER_MAP[key];
  });
  return roles;
}

// ─── Sheet parser ─────────────────────────────────────────────────────────────
export function parseSheet(sheetName, worksheet) {
  const raw = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null, blankrows: false });
  let dataStart = 0;
  let headerRow = null;
  for (let i = 0; i < Math.min(raw.length, 5); i++) {
    const row = raw[i];
    const hasHeader = row.some(c => /first|last|name|phone|email|menu|bio|canva|date|client|chef|revenue/i.test(String(c)));
    if (hasHeader) { headerRow = row; dataStart = i + 1; break; }
    const hasName = row.some(c => typeof c === 'string' && /^[A-Z][a-z]+/.test(String(c).trim()));
    if (hasName) { dataStart = i; break; }
  }
  const dataRows = raw.slice(dataStart).filter(r => r.some(c => c !== null && String(c).trim() !== ''));
  return { sheetName, dataRows, headerRow };
}

// ─── Chef draft builder ───────────────────────────────────────────────────────
export function rowToChefDraft(row, colRoles, sheetArea) {
  const draft = {
    first_name: '', last_name: '', phone: '', email: '',
    menu_url: '', bio_url: '', bio_page: null,
    price_tier: '', home_areas: [sheetArea],
    status: 'Active', notes: '', _warnings: [],
  };

  for (const [idxStr, role] of Object.entries(colRoles)) {
    const idx = Number(idxStr);
    const rawVal = row[idx];
    if (rawVal === null || rawVal === undefined) continue;
    const val = String(rawVal).trim();
    if (!val) continue;

    if (role === 'first_name') draft.first_name = val;
    else if (role === 'last_name') draft.last_name = val;
    else if (role === 'menu_url' || role === 'bio_url') draft[role] = val;
    else if (role === 'bio_page') draft.bio_page = parseInt(val, 10) || null;
    else if (role === 'price_tier' && isPriceTier(val)) draft.price_tier = val;
    else if (role === 'email') {
      if (isEmailLike(val)) draft.email = val;
      else { draft.notes += `Email field: "${val}"\n`; draft.status = 'Flagged'; draft._warnings.push(`Bad email: "${val}"`); }
    } else if (role === 'phone') {
      if (isPhoneLike(val)) draft.phone = val;
      else { draft.notes += `Phone field: "${val}"\n`; draft.status = 'Flagged'; draft._warnings.push(`Bad phone: "${val}"`); }
    }
  }

  // Unassigned columns → sweep to notes
  for (let i = 0; i < row.length; i++) {
    if (colRoles[i]) continue;
    const rawVal = row[i];
    if (rawVal === null || rawVal === undefined) continue;
    const val = String(rawVal).trim();
    if (!val) continue;
    if (/car|drive/i.test(val) || (val.length > 2 && !isPriceTier(val) && !isCanvaLink(val))) {
      draft.notes += `Note: ${val}\n`;
    }
  }

  draft.notes = draft.notes.trim();
  if (/strike|do not|dnb|blacklist/i.test(draft.notes + draft.email + draft.phone)) {
    draft.status = 'Flagged';
    draft._warnings.push('Contains "do not book" language');
  }
  return draft;
}

// ─── Chef deduplication ───────────────────────────────────────────────────────
export function mergeDrafts(allDrafts) {
  const byEmail = {};
  const byName = {};
  const merged = [];
  const mergeLog = [];

  for (const d of allDrafts) {
    const emailKey = d.email ? d.email.toLowerCase() : null;
    const nameKey = normalizeName(`${d.first_name} ${d.last_name}`);
    let existing = null;
    if (emailKey && byEmail[emailKey]) existing = byEmail[emailKey];
    else if (!emailKey && nameKey && byName[nameKey]) existing = byName[nameKey];

    if (existing) {
      const newAreas = d.home_areas.filter(a => !existing.home_areas.includes(a));
      if (newAreas.length) {
        existing.home_areas = [...existing.home_areas, ...newAreas];
        mergeLog.push({ name: `${existing.first_name} ${existing.last_name}`, newArea: newAreas[0] });
      }
      if (!existing.email && d.email) existing.email = d.email;
      if (!existing.phone && d.phone) existing.phone = d.phone;
      if (!existing.menu_url && d.menu_url) existing.menu_url = d.menu_url;
      if (!existing.bio_url && d.bio_url) existing.bio_url = d.bio_url;
      if (!existing.bio_page && d.bio_page) existing.bio_page = d.bio_page;
      if (!existing.price_tier && d.price_tier) existing.price_tier = d.price_tier;
      if (d.notes) existing.notes = (existing.notes ? existing.notes + '\n' : '') + d.notes;
      if (d.status === 'Flagged') existing.status = 'Flagged';
      existing._warnings = [...(existing._warnings || []), ...(d._warnings || [])];
    } else {
      merged.push(d);
      if (emailKey) byEmail[emailKey] = d;
      if (nameKey) byName[nameKey] = d;
    }
  }
  return { merged, mergeLog };
}

// ─── Event draft builder ──────────────────────────────────────────────────────
export function rowToEventDraft(row, colRoles) {
  const get = (role) => {
    const idx = Object.entries(colRoles).find(([, r]) => r === role)?.[0];
    if (idx === undefined) return null;
    const v = row[Number(idx)];
    return v !== null && v !== undefined ? String(v).trim() : null;
  };

  const draft = {
    date: get('date'),
    service_area: get('service_area'),
    client_name: get('client_name'),
    event_type: get('event_type') || 'Private',
    experience_type: get('experience_type'),
    cuisines_served: get('cuisines_served') ? [get('cuisines_served')] : [],
    guest_count: Number(get('guest_count')) || null,
    client_revenue: Number(get('client_revenue')) || null,
    status: get('status') || 'Confirmed',
    notes: get('notes') || '',
    booking_id: get('booking_id'),
    head_chef_name: get('head_chef_name'),
    head_chef_fee: Number(get('head_chef_fee')) || null,
    sous_chef_name: get('sous_chef_name'),
    sous_chef_fee: Number(get('sous_chef_fee')) || null,
    _warnings: [],
  };

  if (!draft.date) draft._warnings.push('Missing date');
  if (!draft.client_name) draft._warnings.push('Missing client');
  if (!draft.service_area) draft._warnings.push('Missing service area');

  return draft;
}

// ─── Template downloads ───────────────────────────────────────────────────────
export function downloadChefTemplate() {
  const headers = ['First Name', 'Last Name', 'Phone', 'Email', 'Menu Link', 'Bio Link', 'Bio Page', 'Price Tier', 'Notes'];
  const example = ['Jane', 'Smith', '+1 212-555-0100', 'jane@email.com', 'https://canva.com/design/abc123/view', 'https://canva.com/design/sharedBio/view', '3', '$$$', ''];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'NYC (example)');
  XLSX.writeFile(wb, 'gradito_chef_import_template.xlsx');
}

export function downloadEventTemplate() {
  const headers = ['Booking ID', 'Date', 'Service Area', 'Client Name', 'Event Type', 'Experience Type', 'Cuisines Served', 'Guest Count', 'Client Revenue', 'Status', 'Head Chef', 'Head Fee', 'Sous Chef', 'Sous Fee', 'Notes'];
  const example = ['BK-001', '2024-09-15', 'Manhattan', 'Bain & Company', 'Corporate', 'Plated Multi-Course', 'New American', '20', '8000', 'Completed', 'Jane Smith', '2000', 'John Doe', '1200', ''];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Events');
  XLSX.writeFile(wb, 'gradito_event_import_template.xlsx');
}