/** Fallback home markets when `home_areas` is empty but city/state exist on chef profile. */
const CITY_HINTS = [
  { pattern: /\bmanhattan\b|\bnew york\b/i, areas: ['Manhattan'] },
  { pattern: /\bbrooklyn\b|\bqueens\b|\bbronx\b/i, areas: ['Brooklyn'] },
  { pattern: /\bwestchester\b|\bwhite plains\b|\byonkers\b/i, areas: ['Westchester'] },
  { pattern: /\bhamptons\b|\bsouthampton\b|\beast hampton\b/i, areas: ['The Hamptons'] },
  { pattern: /\bnewark\b|\bjersey city\b|\bhoboken\b|\bnew jersey\b/i, areas: ['New Jersey'] },
  { pattern: /\bmiami\b/i, areas: ['Miami'] },
  { pattern: /\blos angeles\b|\bla\b/i, areas: ['Los Angeles'] },
  { pattern: /\bphiladelphia\b/i, areas: ['Philadelphia'] },
  { pattern: /\bwashington\b|\bdc\b/i, areas: ['Washington DC'] },
  { pattern: /\bsan francisco\b/i, areas: ['San Francisco'] },
  { pattern: /\bnashville\b/i, areas: ['Nashville'] },
  { pattern: /\bseattle\b/i, areas: ['Seattle'] },
  { pattern: /\blas vegas\b/i, areas: ['Las Vegas'] },
  { pattern: /\bdallas\b/i, areas: ['Dallas'] },
  { pattern: /\bchicago\b/i, areas: ['Chicago'] },
  { pattern: /\bboston\b/i, areas: ['Boston'] },
  { pattern: /\baustin\b/i, areas: ['Austin'] },
  { pattern: /\bhouston\b/i, areas: ['Houston'] },
  { pattern: /\bdenver\b/i, areas: ['Denver'] },
  { pattern: /\batlanta\b/i, areas: ['Atlanta'] },
  { pattern: /\bnew orleans\b/i, areas: ['New Orleans'] },
  { pattern: /\bportland\b/i, areas: ['Portland'] },
  { pattern: /\bsan diego\b/i, areas: ['San Diego'] },
  { pattern: /\bpalm beach\b/i, areas: ['Palm Beach'] },
  { pattern: /\baspen\b/i, areas: ['Aspen'] },
];

const STATE_TO_AREA = {
  NJ: ['New Jersey'],
  FL: ['Miami'],
  CA: ['Los Angeles'],
  PA: ['Philadelphia'],
  DC: ['Washington DC'],
  TX: ['Houston'],
  IL: ['Chicago'],
  MA: ['Boston'],
  CO: ['Denver'],
  GA: ['Atlanta'],
  WA: ['Seattle'],
  NV: ['Las Vegas'],
  TN: ['Nashville'],
  OR: ['Portland'],
};

export function inferHomeAreasFromCity(city, state) {
  const parts = [city, state].filter(Boolean).join(' ');
  if (!parts.trim()) return [];
  for (const row of CITY_HINTS) {
    if (row.pattern.test(parts)) return [...row.areas];
  }
  const st = String(state || '').trim().toUpperCase().slice(0, 2);
  if (st && STATE_TO_AREA[st]) return [...STATE_TO_AREA[st]];
  return [];
}