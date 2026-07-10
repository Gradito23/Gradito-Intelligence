#!/usr/bin/env node
/**
 * Phase 1 business regression tests (no DB required for domain logic).
 * Run: node scripts/test-business-regression.mjs
 */
import { calcExperienceFee, calcFoodRevenue } from '../src/lib/pnlUtils.js'
import { normalizeFacilitators, computeCommission } from '../src/lib/commissionUtils.js'
import { toAppRow } from '../src/infrastructure/supabase/rowMapper.js'

let passed = 0
let failed = 0

function assert(label, condition) {
  if (condition) {
    console.log(`✅ ${label}`)
    passed++
  } else {
    console.error(`❌ FAIL ${label}`)
    failed++
  }
}

function assertClose(label, got, expected) {
  assert(label, Math.abs(got - expected) < 0.01)
}

// P1-24: Commission worked examples
const memberMap = [
  { id: 'closer', first_name: 'A', last_name: 'Closer' },
  { id: 'fac', first_name: 'B', last_name: 'Fac' },
]
const base = {
  closer_id: 'closer',
  facilitator_id: 'fac',
  source_rep_id: null,
  source_split_pct: 40,
  repeat_client_bonus: false,
  apply_min_floor: false,
}

const ds = computeCommission({ ...base, lead_type: 'Direct-Sourced' }, 14400, memberMap)
assertClose('Direct-Sourced total', ds.totalCommission, 2160)
assertClose('Direct-Sourced closer', ds.closerAmount, 1440)
assertClose('Direct-Sourced fac', ds.facAmount, 720)

const ib = computeCommission({ ...base, lead_type: 'Inbound' }, 1500, memberMap)
assertClose('Inbound total', ib.totalCommission, 150)
assertClose('Inbound closer', ib.closerAmount, 105)
assertClose('Inbound fac', ib.facAmount, 45)

const ha = computeCommission({ ...base, lead_type: 'House Account / Referral' }, 2100, memberMap)
assertClose('House/Referral total', ha.totalCommission, 105)
assertClose('House/Referral closer', ha.closerAmount, 63)
assertClose('House/Referral fac', ha.facAmount, 42)

// P1-25, P1-26: P&L calcs
assertClose('calcExperienceFee Signature 20 guests', calcExperienceFee('Signature Experience', 20), 2500)
assertClose(
  'calcFoodRevenue Classic tier 10 guests',
  calcFoodRevenue('Signature Experience', 'Classic ($68)', 10),
  680
)

// normalizeFacilitators
const fac = normalizeFacilitators({ facilitator_id: 'x' })
assert(
  'normalizeFacilitators legacy facilitator_id',
  fac.length === 1 && fac[0].team_member_id === 'x' && fac[0].split_pct === 100
)

// P1-27: rowMapper
const row = toAppRow({ id: '1', created_at: '2026-01-01T00:00:00Z' })
assert('toAppRow includes created_date', row.created_date === '2026-01-01T00:00:00Z')

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
