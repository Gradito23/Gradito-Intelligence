import { supabase } from '@/api/supabaseClient'
import { RepositoryError, wrapError } from '@/domain/errors/RepositoryError'
import { applyOrder } from '@/infrastructure/supabase/queryBuilder'
import { toAppRow, toAppRows, toDbRow } from '@/infrastructure/supabase/rowMapper'

/**
 * @param {string} tableName
 * @param {{ column: string, ascending: boolean }} [defaultOrder]
 */
export function createRepository(tableName, defaultOrder = { column: 'created_at', ascending: false }) {
  return {
    async list(orderBy, limit = 100) {
      try {
        let query = supabase.from(tableName).select('*')
        query = applyOrder(query, orderBy, defaultOrder)
        if (limit) query = query.limit(limit)
        const { data, error } = await query
        if (error) throw error
        return toAppRows(data ?? [])
      } catch (error) {
        wrapError(error, `${tableName}.list`)
      }
    },

    async filter(criteria = {}, orderBy, limit) {
      try {
        let query = supabase.from(tableName).select('*')
        for (const [key, value] of Object.entries(criteria)) {
          if (value === undefined) continue
          query = query.eq(key, value)
        }
        query = applyOrder(query, orderBy, defaultOrder)
        if (limit) query = query.limit(limit)
        const { data, error } = await query
        if (error) throw error
        return toAppRows(data ?? [])
      } catch (error) {
        wrapError(error, `${tableName}.filter`)
      }
    },

    async get(id) {
      try {
        const { data, error } = await supabase.from(tableName).select('*').eq('id', id).maybeSingle()
        if (error) throw error
        return toAppRow(data)
      } catch (error) {
        wrapError(error, `${tableName}.get`)
      }
    },

    async create(payload) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .insert(toDbRow(payload))
          .select()
          .single()
        if (error) throw error
        return toAppRow(data)
      } catch (error) {
        wrapError(error, `${tableName}.create`)
      }
    },

    async update(id, payload) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .update(toDbRow(payload))
          .eq('id', id)
          .select()
          .single()
        if (error) throw error
        return toAppRow(data)
      } catch (error) {
        wrapError(error, `${tableName}.update`)
      }
    },

    async delete(id) {
      try {
        const { error } = await supabase.from(tableName).delete().eq('id', id)
        if (error) throw error
      } catch (error) {
        wrapError(error, `${tableName}.delete`)
      }
    },
  }
}

export { RepositoryError }
