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
 * Strips app-only aliases before writing to Postgres.
 */
export function toDbRow(payload) {
  if (!payload) return payload
  const { created_date, updated_date, ...rest } = payload
  return rest
}
