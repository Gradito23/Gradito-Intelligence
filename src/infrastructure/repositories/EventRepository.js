import { supabase } from '@/api/supabaseClient'
import { createRepository } from '@/infrastructure/supabase/BaseRepository'
import { toAppRows } from '@/infrastructure/supabase/rowMapper'
import { wrapError } from '@/domain/errors/RepositoryError'
import {
  ACTIVE_PIPELINE_STATUSES,
  ARCHIVE_STATUSES,
} from '@/lib/eventStatuses'

const baseRepo = createRepository('events', {
  column: 'date',
  ascending: false,
})

function escapeIlikePattern(input) {
  return String(input).replace(/[%_]/g, '').trim()
}

function applyEventSourceFilter(query, eventSource) {
  if (!eventSource || eventSource === 'all') return query
  if (eventSource === 'manual') {
    return query.or('event_source.eq.manual,event_source.is.null')
  }
  return query.eq('event_source', eventSource)
}

function applyLedgerFilters(query, { view, filters }) {
  const statusFilter = filters?.status
  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  } else if (view === 'active') {
    query = query.in('status', ACTIVE_PIPELINE_STATUSES)
  } else if (view === 'archive') {
    query = query.in('status', ARCHIVE_STATUSES)
  }

  if (filters?.service_area && filters.service_area !== 'all') {
    query = query.eq('service_area', filters.service_area)
  }
  if (filters?.event_type && filters.event_type !== 'all') {
    query = query.eq('event_type', filters.event_type)
  }
  query = applyEventSourceFilter(query, filters?.event_source)
  return query
}

function parseAggregateSum(rows) {
  const row = rows?.[0]
  if (!row || typeof row !== 'object') return null
  if (row.sum != null && !Number.isNaN(Number(row.sum))) return Number(row.sum)
  if (row.client_revenue != null && !Number.isNaN(Number(row.client_revenue))) {
    return Number(row.client_revenue)
  }
  const values = Object.values(row).filter((v) => typeof v === 'number' || (typeof v === 'string' && v !== ''))
  if (values.length === 1) return Number(values[0])
  return null
}

async function sumClientRevenuePaginated({ yearStart, yearEnd } = {}) {
  const pageSize = 1000
  let from = 0
  let total = 0

  for (;;) {
    let query = supabase.from('events').select('client_revenue').range(from, from + pageSize - 1)
    if (yearStart && yearEnd) {
      query = query.gte('date', yearStart).lt('date', yearEnd)
    }
    const { data, error } = await query
    if (error) throw error
    const rows = data ?? []
    total += rows.reduce((sum, r) => sum + Number(r.client_revenue || 0), 0)
    if (rows.length < pageSize) break
    from += pageSize
  }

  return total
}

async function sumClientRevenue({ yearStart, yearEnd } = {}) {
  let query = supabase.from('events').select('client_revenue.sum()')
  if (yearStart && yearEnd) {
    query = query.gte('date', yearStart).lt('date', yearEnd)
  }
  const { data, error } = await query
  if (error) {
    return sumClientRevenuePaginated({ yearStart, yearEnd })
  }
  const parsed = parseAggregateSum(data)
  if (parsed != null && !Number.isNaN(parsed)) return parsed
  return sumClientRevenuePaginated({ yearStart, yearEnd })
}

async function countWithFilters(view, filters, search) {
  let query = supabase.from('events').select('id', { count: 'exact', head: true })
  query = applyLedgerFilters(query, { view, filters })
  const q = search?.trim()
  if (q && q.length >= 1) {
    const escaped = escapeIlikePattern(q)
    query = query.or(`client_name.ilike.%${escaped}%,notes.ilike.%${escaped}%`)
  }
  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

export const EventRepository = {
  ...baseRepo,

  async listPaged({
    view = 'active',
    page = 1,
    pageSize = 50,
    filters = {},
    search = '',
  } = {}) {
    try {
      const safePage = Math.max(1, page)
      const safeSize = Math.min(100, Math.max(1, pageSize))
      const from = (safePage - 1) * safeSize
      const to = from + safeSize - 1

      let query = supabase.from('events').select('*', { count: 'exact' })
      query = applyLedgerFilters(query, { view, filters })
      const q = search?.trim()
      if (q && q.length >= 1) {
        const escaped = escapeIlikePattern(q)
        query = query.or(`client_name.ilike.%${escaped}%,notes.ilike.%${escaped}%`)
      }
      query = query.order('date', { ascending: false, nullsFirst: false }).range(from, to)

      const { data, error, count } = await query
      if (error) throw error

      return {
        rows: toAppRows(data ?? []),
        totalCount: count ?? 0,
        page: safePage,
        pageSize: safeSize,
      }
    } catch (error) {
      wrapError(error, 'events.listPaged')
    }
  },

  async pipelineStats({ eventSource = 'all' } = {}) {
    try {
      const filters = { event_source: eventSource }
      const byStatus = {}
      await Promise.all(
        ACTIVE_PIPELINE_STATUSES.map(async (status) => {
          byStatus[status] = await countWithFilters('all', { ...filters, status }, '')
        }),
      )

      const activeTotal = await countWithFilters('active', filters, '')
      const archiveTotal = await countWithFilters('archive', filters, '')
      const allTotal = await countWithFilters('all', filters, '')

      return { byStatus, activeTotal, archiveTotal, allTotal }
    } catch (error) {
      wrapError(error, 'events.pipelineStats')
    }
  },

  async summaryStats() {
    try {
      const year = new Date().getFullYear()
      const yearStart = `${year}-01-01`
      const yearEnd = `${year + 1}-01-01`

      const ytdCountQuery = supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .gte('date', yearStart)
        .lt('date', yearEnd)
      const { count: ytdCount, error: countErr } = await ytdCountQuery
      if (countErr) throw countErr

      const [totalRevenue, ytdRevenue] = await Promise.all([
        sumClientRevenue(),
        sumClientRevenue({ yearStart, yearEnd }),
      ])

      const { data: ytdClients, error: clientErr } = await supabase
        .from('events')
        .select('client_id, client_name')
        .gte('date', yearStart)
        .lt('date', yearEnd)
        .limit(5000)
      if (clientErr) throw clientErr

      const clientCounts = {}
      ;(ytdClients ?? []).forEach((e) => {
        const key = e.client_id
          || (e.client_name
            ? `name:${String(e.client_name).trim().toLowerCase().replace(/\s+/g, ' ')}`
            : null)
        if (!key) return
        clientCounts[key] = (clientCounts[key] || 0) + 1
      })
      const repeatRate = Object.keys(clientCounts).length > 0
        ? Math.round(
            (Object.values(clientCounts).filter((c) => c > 1).length / Object.keys(clientCounts).length) * 100,
          )
        : 0

      return {
        ytdCount: ytdCount ?? 0,
        ytdRevenue,
        totalRevenue,
        repeatRate,
      }
    } catch (error) {
      wrapError(error, 'events.summaryStats')
    }
  },
}
