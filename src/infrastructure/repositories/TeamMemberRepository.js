import { createRepository } from '@/infrastructure/supabase/BaseRepository'

export const TeamMemberRepository = createRepository('team_members', {
  column: 'first_name',
  ascending: true,
})
