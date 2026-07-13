import { createRepository } from '@/infrastructure/supabase/BaseRepository'

export const ChefIntakeRequestRepository = createRepository('chef_intake_requests', {
  column: 'created_at',
  ascending: false,
})
