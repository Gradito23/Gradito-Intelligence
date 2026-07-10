/**
 * Maps Base44 order strings to Supabase order options.
 * Examples: '-created_date' → created_at DESC, 'name' → name ASC
 */
const ORDER_FIELD_MAP = {
  created_date: 'created_at',
  updated_date: 'updated_at',
}

export function parseOrderBy(orderBy, fallback = { column: 'created_at', ascending: false }) {
  if (!orderBy || typeof orderBy !== 'string') {
    return fallback
  }

  const desc = orderBy.startsWith('-')
  const rawField = desc ? orderBy.slice(1) : orderBy
  const column = ORDER_FIELD_MAP[rawField] ?? rawField

  return { column, ascending: !desc }
}

export function applyOrder(query, orderBy, fallback) {
  const { column, ascending } = parseOrderBy(orderBy, fallback)
  return query.order(column, { ascending, nullsFirst: false })
}
