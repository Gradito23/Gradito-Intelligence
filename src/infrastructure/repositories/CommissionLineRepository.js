import { createRepository } from '@/infrastructure/supabase/BaseRepository'

export const CommissionLineRepository = createRepository('commission_lines', {
  column: 'created_at',
  ascending: false,
})
