/**
 * Base44-compatible client backed by Supabase repositories.
 * Existing pages keep calling `base44.entities.*` — this adapter delegates to repos.
 * @see src/infrastructure/repositories/
 */
import { supabase } from '@/api/supabaseClient'
import { FunctionsHttpError } from '@supabase/supabase-js'
import {
  ActivityLogRepository,
  ChefRepository,
  ClientRepository,
  CommissionLineRepository,
  EventChefRepository,
  EventRepository,
  EventVendorRepository,
  MatchRunRepository,
  ServiceAreaRepository,
  TeamMemberRepository,
} from '@/infrastructure/repositories'

const notImplemented = (method) => async (..._args) => {
  console.warn(`[base44] ${method} called — not yet migrated to Supabase`)
  return null
}

async function parseFunctionError(error) {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json()
      if (body?.error) return body.error
    } catch {
      // fall through
    }
  }
  return error?.message || 'Request failed'
}

async function invokeLlm({ prompt, response_json_schema }) {
  const { data, error } = await supabase.functions.invoke('integration-openai', {
    method: 'POST',
    body: { action: 'invoke_llm', prompt, response_json_schema },
  })

  if (error) {
    throw new Error(await parseFunctionError(error))
  }
  if (data?.error) {
    throw new Error(data.error)
  }
  if (data?.result === undefined) {
    throw new Error('OpenAI returned no result')
  }
  return data.result
}

/** Map Base44 app field names used in filter criteria to DB columns. */
const CRITERIA_FIELD_MAP = {
  created_date: 'created_at',
  updated_date: 'updated_at',
}

function mapCriteria(criteria = {}) {
  const mapped = {}
  for (const [key, value] of Object.entries(criteria)) {
    if (value === undefined) continue
    mapped[CRITERIA_FIELD_MAP[key] ?? key] = value
  }
  return mapped
}

/**
 * Wrap a repository with the Base44 entity surface:
 * list(orderBy?, limit?), filter(criteria, orderBy?, limit?), get/create/update/delete
 */
function entityFromRepo(repo) {
  return {
    list: (orderBy, limit) => repo.list(orderBy, limit),
    filter: (criteria, orderBy, limit) => repo.filter(mapCriteria(criteria), orderBy, limit),
    get: (id) => repo.get(id),
    create: (payload) => repo.create(payload),
    update: (id, payload) => repo.update(id, payload),
    delete: (id) => repo.delete(id),
  }
}

export const base44 = {
  entities: {
    Chef: entityFromRepo(ChefRepository),
    Event: entityFromRepo(EventRepository),
    Client: entityFromRepo(ClientRepository),
    EventChef: entityFromRepo(EventChefRepository),
    EventVendor: entityFromRepo(EventVendorRepository),
    TeamMember: entityFromRepo(TeamMemberRepository),
    CommissionLine: entityFromRepo(CommissionLineRepository),
    ServiceArea: entityFromRepo(ServiceAreaRepository),
    MatchRun: entityFromRepo(MatchRunRepository),
    ActivityLog: entityFromRepo(ActivityLogRepository),
    // Legacy Users page; admin user management uses Profile APIs instead.
    User: {
      list: async () => [],
      get: async () => null,
      create: notImplemented('User.create'),
      update: notImplemented('User.update'),
      delete: notImplemented('User.delete'),
      filter: async () => [],
    },
  },
  auth: {
    me: async () => { throw Object.assign(new Error('Not authenticated'), { status: 401 }) },
    logout: async () => {},
    redirectToLogin: () => { window.location.href = '/login' },
    loginViaEmailPassword: notImplemented('auth.loginViaEmailPassword'),
    loginWithProvider: notImplemented('auth.loginWithProvider'),
    register: notImplemented('auth.register'),
    verifyOtp: notImplemented('auth.verifyOtp'),
    resendOtp: notImplemented('auth.resendOtp'),
    resetPasswordRequest: notImplemented('auth.resetPasswordRequest'),
    resetPassword: notImplemented('auth.resetPassword'),
  },
  users: {
    inviteUser: notImplemented('users.inviteUser'),
  },
  integrations: {
    Core: {
      InvokeLLM: invokeLlm,
      UploadFile: notImplemented('integrations.Core.UploadFile'),
    },
  },
  functions: {
    invoke: notImplemented('functions.invoke'),
  },
}
