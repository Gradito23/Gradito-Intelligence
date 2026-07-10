import { supabase } from '@/api/supabaseClient'

export const EventRepository = {
  async list(orderBy = '-date', limit = 200) {
    const { data, error } = await supabase.from('events').select('*').limit(limit)
    if (error) throw error
    return data ?? []
  },

  async create(payload) {
    const { data, error } = await supabase.from('events').insert(payload).select().single()
    if (error) throw error
    return data
  },

  async update(id, payload) {
    const { data, error } = await supabase.from('events').update(payload).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async delete(id) {
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (error) throw error
  },
}
