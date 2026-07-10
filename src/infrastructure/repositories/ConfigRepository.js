import { supabase } from '@/api/supabaseClient'

const CONFIG_TABLES = {
  service_areas: 'service_areas',
  holidays: 'holidays',
  cuisines: 'cuisines',
  experience_types: 'experience_types',
  dietary_specialties: 'dietary_specialties',
  languages: 'languages',
  event_types: 'event_types',
  package_types: 'package_types',
  menu_tiers: 'menu_tiers',
  lead_types: 'lead_types',
}

export const ConfigRepository = {
  async list(type) {
    const table = CONFIG_TABLES[type]
    if (!table) throw new Error(`Unknown config type: ${type}`)
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('active', true)
      .order('sort_order')
    if (error) throw error
    return data ?? []
  },
}
