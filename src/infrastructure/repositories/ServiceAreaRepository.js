import { createRepository } from '@/infrastructure/supabase/BaseRepository'

/** Maps to service_areas config table (Base44 ServiceArea entity compat). */
export const ServiceAreaRepository = createRepository('service_areas', {
  column: 'name',
  ascending: true,
})
