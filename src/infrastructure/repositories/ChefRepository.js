import { createRepository } from '@/infrastructure/supabase/BaseRepository'

export const ChefRepository = createRepository('chefs', {
  column: 'quality_rating',
  ascending: false,
})
