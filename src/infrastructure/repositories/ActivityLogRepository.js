import { createRepository } from '@/infrastructure/supabase/BaseRepository'

export const ActivityLogRepository = createRepository('activity_logs', {
  column: 'created_at',
  ascending: false,
})
