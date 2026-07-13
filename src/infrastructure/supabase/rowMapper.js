/**
 * Maps Postgres row shapes to Base44-compatible app shapes.
 * UI reads `created_date` / `updated_date` on several pages.
 */
export function toAppRow(row) {
  if (!row) return row
  return {
    ...row,
    created_date: row.created_at,
    updated_date: row.updated_at,
  }
}

export function toAppRows(rows) {
  if (!rows) return []
  return rows.map(toAppRow)
}

/**
 * Strips app-only aliases and immutable keys before writing to Postgres.
 * Empty strings become null so optional uuid/date/numeric columns accept the row.
 */
export function toDbRow(payload) {
  if (!payload) return payload
  const {
    id,
    created_date,
    updated_date,
    created_at,
    updated_at,
    ...rest
  } = payload

  const cleaned = {}
  for (const [key, value] of Object.entries(rest)) {
    cleaned[key] = value === '' ? null : value
  }
  return cleaned
}
