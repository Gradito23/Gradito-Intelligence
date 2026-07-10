import { createRepository } from '@/infrastructure/supabase/BaseRepository'

export const MatchRunRepository = createRepository('match_runs', {
  column: 'created_at',
  ascending: false,
})
