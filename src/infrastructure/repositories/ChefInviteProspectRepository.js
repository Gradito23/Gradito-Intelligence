import { createRepository } from '@/infrastructure/supabase/BaseRepository'

export const ChefInviteProspectRepository = createRepository('chef_invite_prospects', {
  column: 'created_at',
  ascending: false,
})