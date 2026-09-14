import { createRepository } from '@/infrastructure/supabase/BaseRepository'

const base = createRepository('onboarding_guide_deliveries', {
  column: 'sent_at',
  ascending: false,
})

export const OnboardingGuideDeliveryRepository = {
  ...base,
  async list(orderBy, limit = 500) {
    return base.list(orderBy || '-sent_at', limit)
  },
}
