import { createRepository } from '@/infrastructure/supabase/BaseRepository'

export const EventVendorRepository = createRepository('event_vendors', {
  column: 'created_at',
  ascending: false,
})
