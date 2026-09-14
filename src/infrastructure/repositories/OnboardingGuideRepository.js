import { supabase } from '@/api/supabaseClient'
import { wrapError } from '@/domain/errors/RepositoryError'
import { toAppRow, toDbRow } from '@/infrastructure/supabase/rowMapper'

export const ONBOARDING_GUIDE_SINGLETON_ID = '00000000-0000-0000-0000-000000000001'

export const OnboardingGuideRepository = {
  async get() {
    try {
      const { data, error } = await supabase
        .from('onboarding_guide_settings')
        .select('*')
        .eq('id', ONBOARDING_GUIDE_SINGLETON_ID)
        .maybeSingle()
      if (error) throw error
      return toAppRow(data)
    } catch (error) {
      wrapError(error, 'onboarding_guide_settings.get')
    }
  },

  async update(payload) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const row = {
        ...toDbRow(payload),
        updated_by: user?.id || null,
      }
      const { data, error } = await supabase
        .from('onboarding_guide_settings')
        .update(row)
        .eq('id', ONBOARDING_GUIDE_SINGLETON_ID)
        .select()
        .single()
      if (error) throw error
      return toAppRow(data)
    } catch (error) {
      wrapError(error, 'onboarding_guide_settings.update')
    }
  },
}
