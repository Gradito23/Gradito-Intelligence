import { supabase } from '@/api/supabaseClient'
import { wrapError } from '@/domain/errors/RepositoryError'
import { createRepository } from '@/infrastructure/supabase/BaseRepository'
import { toAppRow, toDbRow } from '@/infrastructure/supabase/rowMapper'

const base = createRepository('chef_intake_requests', {
  column: 'created_at',
  ascending: false,
})

/**
 * Anon may INSERT pending intake rows but has no SELECT policy.
 * Insert without RETURNING so public /intake submit does not hit RLS on .select().
 */
export const ChefIntakeRequestRepository = {
  ...base,
  async create(payload) {
    try {
      const row = toDbRow(payload)
      const { error } = await supabase.from('chef_intake_requests').insert(row)
      if (error) throw error
      return toAppRow({
        ...row,
        status: row.status || 'pending',
      })
    } catch (error) {
      wrapError(error, 'chef_intake_requests.create')
    }
  },
}
