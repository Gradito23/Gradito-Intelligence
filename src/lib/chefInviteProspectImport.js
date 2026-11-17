import {
  parseSheet,
  detectChefColumnRoles,
  detectProspectColumnRoles,
  countProspectIdentityColumns,
  rowToChefDraft,
  isEmailLike,
  isPhoneLike,
  isCanvaLink,
  normalizeName,
} from '@/components/bulkupload/importUtils';
import {
  findChefByIdentity,
  findProspectByIdentity,
  identityHasPhone,
  normalizeEmail,
  normalizePhoneDigits,
} from '@/lib/chefDedupe';

const JUNK_NAME_RE = /^(ALL|CHEF\s*BIO|DECK|DO\s*NOT)/i;
const URL_IN_CONTACT_RE = /https?:\/\/|canva\.link/i;
const NO_CONTACT_MESSAGE = 'Email or phone required';

export function importRowHasContact(row) {
  const hasEmail = isEmailLike(trimVal(row?.email));
  const hasPhone = identityHasPhone({ mobile: row?.mobile, phone: row?.phone });
  return hasEmail || hasPhone;
}

function trimVal(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function looksLikeUrl(val) {
  const s = trimVal(val);
  return URL_IN_CONTACT_RE.test(s) || isCanvaLink(s);
}

function splitChefFullName(chefVal) {
  const parts = trimVal(chefVal).split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return {
      first_name: parts.slice(0, -1).join(' '),
      last_name: parts[parts.length - 1],
    };
  }
  return { first_name: parts[0] || '', last_name: '' };
}

function rowToProspectRaw(row, colRoles, sheetName) {
  const get = (role) => {
    const idx = Object.entries(colRoles).find(([, r]) => r === role)?.[0];
    if (idx === undefined) return '';
    return trimVal(row[Number(idx)]);
  };

  let first_name = get('first_name');
  let last_name = get('last_name');
  let mobile = get('mobile');
  let email = get('email');
  const locationNote = get('location_note');

  const hasLastNameCol = Object.values(colRoles).includes('last_name');
  if (!last_name && first_name) {
    if (!hasLastNameCol || first_name.includes(' ')) {
      const split = splitChefFullName(first_name);
      if (split.last_name) {
        first_name = split.first_name;
        last_name = split.last_name;
      }
    }
  }

  if (email && !isEmailLike(email)) {
    if (looksLikeUrl(email)) {
      return {
        first_name,
        last_name,
        mobile,
        email: '',
        city: sheetName.trim(),
        sourceSheet: sheetName.trim(),
        locationNote,
        _fieldErrors: ['Email looks like a link'],
      };
    }
  } else if (email) {
    email = normalizeEmail(email);
  }

  if (mobile && !isPhoneLike(mobile)) {
    if (looksLikeUrl(mobile)) {
      return {
        first_name,
        last_name,
        mobile: '',
        email,
        city: sheetName.trim(),
        sourceSheet: sheetName.trim(),
        locationNote,
        _fieldErrors: ['Phone looks like a link'],
      };
    }
  }

  if (last_name && looksLikeUrl(last_name)) {
    return {
      first_name,
      last_name: '',
      mobile,
      email,
      city: sheetName.trim(),
      sourceSheet: sheetName.trim(),
      locationNote,
      _fieldErrors: ['Last name looks like a link'],
    };
  }

  return {
    first_name: first_name.trim(),
    last_name: last_name.trim(),
    mobile: mobile.trim(),
    email: email || '',
    city: sheetName.trim(),
    sourceSheet: sheetName.trim(),
    locationNote,
    _fieldErrors: [],
  };
}

function rowToProspectFromChefDraft(chefDraft, sheetName) {
  return {
    first_name: trimVal(chefDraft.first_name),
    last_name: trimVal(chefDraft.last_name),
    mobile: trimVal(chefDraft.phone),
    email: chefDraft.email ? normalizeEmail(chefDraft.email) : '',
    city: sheetName.trim(),
    sourceSheet: sheetName.trim(),
    locationNote: '',
    _fieldErrors: [...(chefDraft._warnings || [])],
  };
}

function chefRolesToPhoneMap(colRoles) {
  return Object.fromEntries(
    Object.entries(colRoles).map(([i, r]) => [i, r === 'mobile' ? 'phone' : r]),
  );
}

function validateProspectRaw(raw) {
  const messages = [...(raw._fieldErrors || [])];
  let level = messages.length ? 'error' : 'ok';

  const nameProbe = `${raw.first_name} ${raw.last_name}`.trim();
  if (!raw.first_name && !raw.last_name) {
    messages.push('Missing name');
    level = 'error';
  } else if (JUNK_NAME_RE.test(raw.first_name) || JUNK_NAME_RE.test(nameProbe)) {
    messages.push('Instructional or junk row');
    level = 'error';
  }

  if (level !== 'error') {
    if (!importRowHasContact(raw)) {
      messages.push(NO_CONTACT_MESSAGE);
      level = 'error';
    }
  }

  if (raw.locationNote) {
    messages.push(`Location note: ${raw.locationNote}`);
  }

  return { level, messages };
}

function prospectRowKey(draft) {
  const emailKey = draft.email ? normalizeEmail(draft.email) : '';
  if (emailKey) return `email:${emailKey}`;
  const phoneKey = normalizePhoneDigits(draft.mobile);
  if (phoneKey.length >= 7) return `phone:${phoneKey}`;
  const nameKey = normalizeName(`${draft.first_name} ${draft.last_name}`);
  if (nameKey) return `name:${nameKey}`;
  return null;
}

function findExistingMerged(byEmail, byPhone, byName, raw) {
  const email = raw.email ? normalizeEmail(raw.email) : '';
  if (email && byEmail.has(email)) return byEmail.get(email);
  const phone = normalizePhoneDigits(raw.mobile);
  if (phone.length >= 7 && byPhone.has(phone)) return byPhone.get(phone);
  const name = normalizeName(`${raw.first_name} ${raw.last_name}`);
  if (name && byName.has(name)) return byName.get(name);
  return null;
}

function registerMergedKeys(entry, byEmail, byPhone, byName) {
  if (entry.email) byEmail.set(normalizeEmail(entry.email), entry);
  const phone = normalizePhoneDigits(entry.mobile);
  if (phone.length >= 7) byPhone.set(phone, entry);
  const name = normalizeName(`${entry.first_name} ${entry.last_name}`);
  if (name) byName.set(name, entry);
}

function addSheetToEntry(existing, sheet) {
  if (!sheet || existing.sourceSheets.includes(sheet)) return;
  existing.sourceSheets.push(sheet);
  const cities = new Set(
    existing.city.split(',').map((c) => c.trim()).filter(Boolean),
  );
  cities.add(sheet.trim());
  existing.city = [...cities].join(', ');
}

function reconcileEntryLevel(entry) {
  const hasContact = importRowHasContact(entry);
  const messages = hasContact
    ? entry.messages.filter((m) => m !== NO_CONTACT_MESSAGE && m !== 'No phone or email')
    : [...entry.messages];
  const hardError = messages.some((m) =>
    m === 'Missing name'
    || m === 'Instructional or junk row'
    || m.includes('looks like a link'),
  );
  let level = 'error';
  if (!hardError && hasContact) level = 'ok';
  else if (!hardError && !hasContact) level = 'error';
  return { ...entry, messages: [...new Set(messages)], level };
}

function mergeMessageForSheets(sheets) {
  if (sheets.length <= 1) return null;
  return `Merged from ${sheets.join(', ')}`;
}

function attachMergeMessage(row) {
  const rest = row.messages.filter((m) => !m.startsWith('Merged from'));
  const mergeMsg = mergeMessageForSheets(row.sourceSheets);
  return { ...row, messages: mergeMsg ? [...rest, mergeMsg] : rest };
}

export function mergeProspectDrafts(rawDrafts) {
  const byEmail = new Map();
  const byPhone = new Map();
  const byName = new Map();
  const order = [];

  for (const raw of rawDrafts) {
    const { level, messages } = validateProspectRaw(raw);
    const sheet = raw.sourceSheet || raw.city;

    const hasIdentity = Boolean(prospectRowKey(raw));
    if (!hasIdentity) continue;

    const existing = findExistingMerged(byEmail, byPhone, byName, raw);

    if (existing) {
      addSheetToEntry(existing, sheet);
      if (!existing.email && raw.email) existing.email = raw.email;
      if (!existing.mobile && raw.mobile) existing.mobile = raw.mobile;
      if (!existing.first_name && raw.first_name) existing.first_name = raw.first_name;
      if (!existing.last_name && raw.last_name) existing.last_name = raw.last_name;
      if (raw.locationNote && !existing.locationNote) existing.locationNote = raw.locationNote;
      existing.messages = [...new Set([...existing.messages, ...messages])];
      Object.assign(existing, reconcileEntryLevel(existing));
      registerMergedKeys(existing, byEmail, byPhone, byName);
    } else {
      const sourceSheets = sheet ? [sheet] : [];
      const entry = {
        first_name: raw.first_name,
        last_name: raw.last_name,
        mobile: raw.mobile,
        email: raw.email,
        city: sheet || '',
        sourceSheets,
        locationNote: raw.locationNote || '',
        level,
        messages: [...messages],
      };
      registerMergedKeys(entry, byEmail, byPhone, byName);
      order.push(entry);
    }
  }

  return order.map((entry) => {
    const reconciled = reconcileEntryLevel(entry);
    const withMerge = attachMergeMessage(reconciled);
    return { ...withMerge, key: prospectRowKey(withMerge) };
  });
}

export function classifyProspectRows(rows, chefs, prospects) {
  return rows.map((row) => {
    const identity = { email: row.email, mobile: row.mobile };
    const messages = [...row.messages];
    let level = row.level;
    let existingProspectId;

    if (level !== 'error' && findChefByIdentity(chefs, identity)) {
      messages.push('Already on chef roster');
      level = 'error';
    } else if (level !== 'error') {
      const existing = findProspectByIdentity(prospects, identity);
      if (existing) {
        existingProspectId = existing.id;
        messages.push('Will update existing prospect');
        if (existing.status === 'joined' || existing.chef_id) {
          messages.push('Existing prospect (joined)');
        }
      }
    }

    return {
      ...row,
      level,
      messages,
      existingProspectId,
      importable: level === 'ok' || level === 'warning',
    };
  });
}

function parseSheetProspectRows(worksheet, sheetName) {
  const { dataRows, headerRow } = parseSheet(sheetName, worksheet);
  const headerRoles = detectProspectColumnRoles(headerRow || []);
  let colRoles = { ...headerRoles };
  let useHeader = countProspectIdentityColumns(headerRoles) >= 2;

  if (!useHeader && dataRows.length) {
    const chefDetect = detectChefColumnRoles(dataRows);
    colRoles = {};
    for (const [idx, role] of Object.entries(chefDetect)) {
      if (role === 'phone') colRoles[idx] = 'mobile';
      else if (['first_name', 'last_name', 'email'].includes(role)) colRoles[idx] = role;
    }
  }

  if (countProspectIdentityColumns(colRoles) < 1) {
    return {
      sheetName,
      skipped: true,
      skipReason: 'Could not find name/phone/email columns',
      rowCount: dataRows.length,
      rows: [],
    };
  }

  const rows = [];
  for (const row of dataRows) {
    if (!row.some((c) => c !== null && trimVal(c))) continue;
    const raw = useHeader
      ? rowToProspectRaw(row, colRoles, sheetName)
      : rowToProspectFromChefDraft(
        rowToChefDraft(row, chefRolesToPhoneMap(colRoles), sheetName),
        sheetName,
      );
    rows.push(raw);
  }

  return { sheetName, skipped: false, rowCount: dataRows.length, rows };
}

export function parseProspectWorkbook(workbook) {
  const sheetResults = [];
  const allRaw = [];

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    const result = parseSheetProspectRows(ws, sheetName);
    sheetResults.push(result);
    if (!result.skipped) allRaw.push(...result.rows);
  }

  const merged = mergeProspectDrafts(allRaw);

  return {
    sheetResults,
    skippedSheets: sheetResults.filter((s) => s.skipped),
    merged,
    stats: {
      sheetCount: workbook.SheetNames.length,
      totalRows: sheetResults.reduce((n, s) => n + s.rowCount, 0),
      parsedRowCount: allRaw.length,
      mergedCount: merged.length,
    },
  };
}

export function buildProspectImportPreview(workbook, chefs, prospects) {
  const parsed = parseProspectWorkbook(workbook);
  const rows = classifyProspectRows(parsed.merged, chefs, prospects);

  const counts = { ok: 0, warning: 0, error: 0, importable: 0 };
  rows.forEach((r) => {
    counts[r.level] = (counts[r.level] || 0) + 1;
    if (r.importable) counts.importable += 1;
  });

  return {
    ...parsed,
    rows,
    counts,
  };
}