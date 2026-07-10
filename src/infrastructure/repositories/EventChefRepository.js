import { createRepository } from '@/infrastructure/supabase/BaseRepository'

export const EventChefRepository = createRepository('event_chefs', {
  column: 'created_at',
  ascending: false,
})
