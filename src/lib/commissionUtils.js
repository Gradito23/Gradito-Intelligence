/**
 * Normalize legacy facilitator_id → facilitators array format.
 * Single named facilitator always gets split_pct 100 (covers stored 0 / missing).
 */
export function normalizeFacilitators(draft) {
  let list;
  if (Array.isArray(draft.facilitators) && draft.facilitators.length > 0) {
    list = draft.facilitators.map((f) => ({
      team_member_id: f.team_member_id || '',
      split_pct: Number(f.split_pct),
    }));
  } else if (draft.facilitator_id) {
    list = [{ team_member_id: draft.facilitator_id, split_pct: 100 }];
  } else {
    return [];
  }

  const named = list.filter((f) => f.team_member_id);
  if (named.length === 1 && list.length === 1) {
    return [{ ...list[0], split_pct: 100 }];
  }
  if (list.length === 1) {
    return [{ ...list[0], split_pct: Number.isFinite(list[0].split_pct) && list[0].split_pct > 0 ? list[0].split_pct : 100 }];
  }
  return list.map((f) => ({
    ...f,
    split_pct: Number.isFinite(f.split_pct) ? f.split_pct : 0,
  }));
}

/** Effective split % for a facilitator row given the full list. */
export function effectiveFacSplitPct(fac, facilitators) {
  const named = (facilitators || []).filter((f) => f.team_member_id);
  if (named.length <= 1) return 100;
  const pct = Number(fac.split_pct);
  return Number.isFinite(pct) ? pct : 0;
}

export function facilitatorsSplitInvalid(facilitators) {
  const list = facilitators || [];
  const named = list.filter((f) => f.team_member_id);
  if (named.length <= 1) return false;
  const sum = named.reduce((s, f) => s + (Number(f.split_pct) || 0), 0);
  return Math.abs(sum - 100) > 0.01;
}

export const COMMISSION_RATES = {
  'Direct-Sourced':            { closerPct: 10, facPct: 5 },
  'Inbound':                   { closerPct: 7,  facPct: 3 },
  'House Account / Referral':  { closerPct: 3,  facPct: 2 },
};

export const LEAD_TYPES = ['Direct-Sourced', 'Inbound', 'House Account / Referral'];

/**
 * Compute commission breakdown from event draft + commissionableProfit.
 * @returns {object} { closerAmount, facAmount, sourceAmount, totalCommission, finalNetProfit, lines[], incomplete, splitInvalid }
 */
export function computeCommission(draft, commissionableProfit, teamMembers = []) {
  const profit  = Number(commissionableProfit) || 0;
  const rates   = COMMISSION_RATES[draft.lead_type];
  const facilitators = normalizeFacilitators(draft);

  const incomplete = !rates || !draft.closer_id || facilitators.length === 0
    || !facilitators.some((f) => f.team_member_id);

  if (incomplete) {
    return {
      closerAmount: 0, facAmount: 0, sourceAmount: 0,
      totalCommission: 0, finalNetProfit: profit,
      lines: [], incomplete: true, splitInvalid: false,
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

  let facAmountSum = 0;
  for (const fac of facilitators) {
    const member = find(fac.team_member_id);
    if (!member) continue;
    const pct = effectiveFacSplitPct(fac, facilitators);
    const lineAmount = round2((pct / 100) * facPoolTotal);
    facAmountSum = round2(facAmountSum + lineAmount);
    lines.push({
      team_member_id: fac.team_member_id,
      team_member_name: name(member),
      role: 'Facilitator',
      rate_pct: rates.facPct,
      split_pct: pct,
      amount: lineAmount,
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

  const facAmount = facAmountSum;
  const totalCommission = round2(closerAmount + facAmount + sourceAmount);
  const finalNetProfit  = round2(profit - totalCommission);
  const splitInvalid = facilitatorsSplitInvalid(facilitators);

  return {
    closerAmount, facAmount, sourceAmount, totalCommission, finalNetProfit,
    lines, incomplete: false, splitInvalid,
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Worked-example assertions — run once on mount to verify the engine.
 */
export function runWorkedExamples() {
  const memberMap = [
    { id: 'closer', first_name: 'A', last_name: '' },
    { id: 'fac',    first_name: 'B', last_name: '' },
    { id: 'fac2',   first_name: 'C', last_name: '' },
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

  const assertBool = (label, got, expected) => {
    if (got === expected) {
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

  // Single fac with stored split_pct 0 → still full pool
  const zeroSplit = computeCommission({
    closer_id: 'closer',
    lead_type: 'Direct-Sourced',
    facilitators: [{ team_member_id: 'fac', split_pct: 0 }],
    source_rep_id: null,
  }, 3445, memberMap);
  assert('Zero-split single fac total', zeroSplit.totalCommission, round2(3445 * 0.15));
  assert('Zero-split single fac amount', zeroSplit.facAmount, round2(3445 * 0.05));
  assertBool('Zero-split not invalid', zeroSplit.splitInvalid, false);

  // Two facs 60/40
  const split6040 = computeCommission({
    closer_id: 'closer',
    lead_type: 'Direct-Sourced',
    facilitators: [
      { team_member_id: 'fac', split_pct: 60 },
      { team_member_id: 'fac2', split_pct: 40 },
    ],
    source_rep_id: null,
  }, 3395, memberMap);
  assert('60/40 fac pool', split6040.facAmount, round2(3395 * 0.05));
  assertBool('60/40 valid', split6040.splitInvalid, false);

  // Under-split 5/0 → splitInvalid; total = sum of lines (not full pool)
  const under = computeCommission({
    closer_id: 'closer',
    lead_type: 'Direct-Sourced',
    facilitators: [
      { team_member_id: 'fac', split_pct: 5 },
      { team_member_id: 'fac2', split_pct: 0 },
    ],
    source_rep_id: null,
  }, 3445, memberMap);
  assertBool('Under-split invalid', under.splitInvalid, true);
  const facLineSum = under.lines.filter((l) => l.role === 'Facilitator').reduce((s, l) => s + l.amount, 0);
  assert('Under-split facAmount = line sum', under.facAmount, facLineSum);
  assert('Under-split total = sum lines', under.totalCommission, round2(under.closerAmount + facLineSum));
}
