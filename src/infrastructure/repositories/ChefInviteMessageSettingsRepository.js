import { supabase } from '@/api/supabaseClient'
import { wrapError } from '@/domain/errors/RepositoryError'
import { toAppRow, toDbRow } from '@/infrastructure/supabase/rowMapper'

export const CHEF_INVITE_MESSAGE_SETTINGS_ID = 1

export const ChefInviteMessageSettingsRepository = {
  async get() {
    try {
      const { data, error } = await supabase
        .from('chef_invite_message_settings')
        .select('*')
        .eq('id', CHEF_INVITE_MESSAGE_SETTINGS_ID)
        .maybeSingle()
      if (error) throw error
      return toAppRow(data)
    } catch (error) {
      wrapError(error, 'chef_invite_message_settings.get')
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
        .from('chef_invite_message_settings')
        .update(row)
        .eq('id', CHEF_INVITE_MESSAGE_SETTINGS_ID)
        .select()
        .single()
      if (error) throw error
      return toAppRow(data)
    } catch (error) {
      wrapError(error, 'chef_invite_message_settings.update')
    }
  },
}