export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

/** Compare phones by digits only (US 10-digit after stripping leading 1). */
export function normalizePhoneDigits(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits;
}

export function identityHasPhone({ mobile, phone } = {}) {
  const combined = `${mobile || ''}${phone || ''}`.trim();
  return normalizePhoneDigits(combined).length >= 7;
}

export function chefMatchesIdentity(chef, { email, mobile, phone } = {}) {
  if (!chef || chef.archived) return false;
  const wantEmail = normalizeEmail(email);
  const chefEmail = normalizeEmail(chef.email);
  if (wantEmail && chefEmail && wantEmail === chefEmail) return true;
  const wantDigits = normalizePhoneDigits(mobile || phone);
  if (wantDigits.length < 7) return false;
  const m = normalizePhoneDigits(chef.mobile);
  const p = normalizePhoneDigits(chef.phone);
  return (m.length >= 7 && m === wantDigits) || (p.length >= 7 && p === wantDigits);
}

export function findChefByIdentity(chefs, identity) {
  return (chefs || []).find((c) => chefMatchesIdentity(c, identity)) || null;
}

export function findProspectByIdentity(prospects, identity) {
  return (prospects || []).find((p) => !p.archived && chefMatchesIdentity(p, identity)) || null;
}