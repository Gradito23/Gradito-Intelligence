import { createRepository } from '@/infrastructure/supabase/BaseRepository'

export const ClientRepository = createRepository('clients', {
  column: 'created_at',
  ascending: false,
})
