import { supabase } from '@/api/supabaseClient'
import { wrapError } from '@/domain/errors/RepositoryError'
import { toAppRow, toAppRows, toDbRow } from '@/infrastructure/supabase/rowMapper'

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

function getTable(type) {
  const table = CONFIG_TABLES[type]
  if (!table) throw new Error(`Unknown config type: ${type}`)
  return table
}

export const ConfigRepository = {
  async list(type) {
    const table = getTable(type)
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('active', true)
        .order('sort_order')
      if (error) throw error
      return toAppRows(data ?? [])
    } catch (error) {
      wrapError(error, `ConfigRepository.list(${type})`)
    }
  },

  async listAll(type) {
    const table = getTable(type)
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('sort_order')
      if (error) throw error
      return toAppRows(data ?? [])
    } catch (error) {
      wrapError(error, `ConfigRepository.listAll(${type})`)
    }
  },

  async create(type, payload) {
    const table = getTable(type)
    try {
      const { data, error } = await supabase
        .from(table)
        .insert(toDbRow(payload))
        .select()
        .single()
      if (error) throw error
      return toAppRow(data)
    } catch (error) {
      wrapError(error, `ConfigRepository.create(${type})`)
    }
  },

  async update(type, id, payload) {
    const table = getTable(type)
    try {
      const { data, error } = await supabase
        .from(table)
        .update(toDbRow(payload))
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return toAppRow(data)
    } catch (error) {
      wrapError(error, `ConfigRepository.update(${type})`)
    }
  },

  async deactivate(type, id) {
    return this.update(type, id, { active: false })
  },

  async activate(type, id) {
    return this.update(type, id, { active: true })
  },
}
