/**
 * Normalize legacy facilitator_id → facilitators array format.
 */
export function normalizeFacilitators(draft) {
  if (Array.isArray(draft.facilitators) && draft.facilitators.length > 0) {
    return draft.facilitators;
  }
  if (draft.facilitator_id) {
    return [{ team_member_id: draft.facilitator_id, split_pct: 100 }];
  }
  return [];
}

export const COMMISSION_RATES = {
  'Direct-Sourced':            { closerPct: 10, facPct: 5 },
  'Inbound':                   { closerPct: 7,  facPct: 3 },
  'House Account / Referral':  { closerPct: 3,  facPct: 2 },
};

export const LEAD_TYPES = ['Direct-Sourced', 'Inbound', 'House Account / Referral'];

/**
 * Compute commission breakdown from event draft + netProfit.
 * @returns {object} { closerAmount, facAmount, sourceAmount, totalCommission, finalNetProfit, lines[], incomplete }
 */
/**
 * Compute commission breakdown from event draft + commissionableProfit.
 * @param {object} draft
 * @param {number} commissionableProfit — billableRevenue − adminFee − totalEventCosts
 * @param {Array}  teamMembers
 */
export function computeCommission(draft, commissionableProfit, teamMembers = []) {
  const profit  = Number(commissionableProfit) || 0;
  const rates   = COMMISSION_RATES[draft.lead_type];
  const facilitators = Array.isArray(draft.facilitators) && draft.facilitators.length > 0
    ? draft.facilitators
    : (draft.facilitator_id ? [{ team_member_id: draft.facilitator_id, split_pct: 100 }] : []);

  const incomplete = !rates || !draft.closer_id || facilitators.length === 0;

  if (incomplete) {
    return {
      closerAmount: 0, facAmount: 0, sourceAmount: 0,
      totalCommission: 0, finalNetProfit: profit,
      lines: [], incomplete: true,
    };
  }

  const profitGuard = profit <= 0;

  let closerPool   = profitGuard ? 0 : round2((rates.closerPct / 100) * profit);
  const facPoolTotal = profitGuard ? 0 : round2((rates.facPct / 100) * profit);

  // Source rep split
  const splitPct = Number(draft.source_split_pct ?? 40);
  const hasSplit = !!(draft.source_rep_id && draft.source_rep_id !== draft.closer_id);
  let sourceAmount = 0;
  if (hasSplit && !profitGuard) {
    sourceAmount = round2((splitPct / 100) * closerPool);
    closerPool   = round2((1 - splitPct / 100) * closerPool);
  }

  let closerAmount = closerPool;
  if (draft.repeat_client_bonus) closerAmount = round2(closerAmount + 100);
  if (draft.apply_min_floor && closerAmount < 50) closerAmount = 50;
  closerAmount = round2(closerAmount);

  // Build named lines
  const find = (id) => teamMembers.find(m => m.id === id);
  const name = (m) => m ? `${m.first_name} ${m.last_name || ''}`.trim() : '—';

  const closer    = find(draft.closer_id);
  const sourceRep = hasSplit ? find(draft.source_rep_id) : null;

  const lines = [];
  if (closer) lines.push({
    team_member_id: draft.closer_id,
    team_member_name: name(closer),
    role: 'Closer',
    rate_pct: rates.closerPct,
    split_pct: 100,
    amount: closerAmount,
  });

  // One line per facilitator, split proportionally
  for (const fac of facilitators) {
    const member = find(fac.team_member_id);
    if (!member) continue;
    const pct = Number(fac.split_pct ?? 100);
    const facAmount = round2((pct / 100) * facPoolTotal);
    lines.push({
      team_member_id: fac.team_member_id,
      team_member_name: name(member),
      role: 'Facilitator',
      rate_pct: rates.facPct,
      split_pct: pct,
      amount: facAmount,
    });
  }

  if (sourceRep) lines.push({
    team_member_id: draft.source_rep_id,
    team_member_name: name(sourceRep),
    role: 'Source Rep',
    rate_pct: splitPct,
    split_pct: 100,
    amount: sourceAmount,
  });

  const totalCommission = round2(closerAmount + facPoolTotal + sourceAmount);
  const finalNetProfit  = round2(profit - totalCommission);
  const facAmount       = facPoolTotal;

  return { closerAmount, facAmount, sourceAmount, totalCommission, finalNetProfit, lines, incomplete: false };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Worked-example assertions — run once on mount to verify the engine.
 * All three must pass before Phase 2 is considered complete.
 */
export function runWorkedExamples() {
  const memberMap = [
    { id: 'closer', first_name: 'A', last_name: '' },
    { id: 'fac',    first_name: 'B', last_name: '' },
  ];
  const base = {
    closer_id: 'closer', facilitator_id: 'fac',
    source_rep_id: null, source_split_pct: 40,
    repeat_client_bonus: false, apply_min_floor: false,
  };

  const assert = (label, got, expected) => {
    const pass = Math.abs(got - expected) < 0.01;
    if (pass) {
      console.log(`✅ [Commission] ${label}: ${got}`);
    } else {
      console.error(`❌ [Commission] FAIL ${label}: expected ${expected}, got ${got}`);
    }
  };

  // Direct-Sourced, commissionableProfit $14,400 → total $2,160 (closer $1,440 + fac $720)
  const ds = computeCommission({ ...base, lead_type: 'Direct-Sourced' }, 14400, memberMap);
  assert('Direct-Sourced total',  ds.totalCommission, 2160);
  assert('Direct-Sourced closer', ds.closerAmount,    1440);
  assert('Direct-Sourced fac',    ds.facAmount,        720);

  // Inbound, profit $1,500 → total $150 (closer $105 + fac $45)
  const ib = computeCommission({ ...base, lead_type: 'Inbound' }, 1500, memberMap);
  assert('Inbound total',  ib.totalCommission, 150);
  assert('Inbound closer', ib.closerAmount,    105);
  assert('Inbound fac',    ib.facAmount,        45);

  // House/Referral, profit $2,100 → total $105 (closer $63 + fac $42)
  const ha = computeCommission({ ...base, lead_type: 'House Account / Referral' }, 2100, memberMap);
  assert('House/Referral total',  ha.totalCommission, 105);
  assert('House/Referral closer', ha.closerAmount,     63);
  assert('House/Referral fac',    ha.facAmount,        42);
}