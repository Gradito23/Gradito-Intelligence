import { supabase } from '@/api/supabaseClient'

export const ChefRepository = {
  async list(orderBy = '-quality_rating', limit = 100) {
    const { data, error } = await supabase
      .from('chefs')
      .select('*')
      .limit(limit)
    if (error) throw error
    return data ?? []
  },

  async create(payload) {
    const { data, error } = await supabase.from('chefs').insert(payload).select().single()
    if (error) throw error
    return data
  },

  async update(id, payload) {
    const { data, error } = await supabase.from('chefs').update(payload).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async delete(id) {
    const { error } = await supabase.from('chefs').delete().eq('id', id)
    if (error) throw error
  },
}
