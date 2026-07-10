/**
 * Temporary Base44 compatibility stub.
 * Existing pages still import `base44` — replaced with no-op stubs until
 * each module is rewired to Supabase repositories in later phases.
 * @see src/infrastructure/repositories/
 */

const notImplemented = (method) => async (..._args) => {
  console.warn(`[base44-stub] ${method} called — not yet migrated to Supabase`)
  return null
}

const entityStub = (name) => ({
  list: async () => [],
  get: async () => null,
  create: notImplemented(`${name}.create`),
  update: notImplemented(`${name}.update`),
  delete: notImplemented(`${name}.delete`),
})

export const base44 = {
  entities: {
    Chef: entityStub('Chef'),
    Event: entityStub('Event'),
    Client: entityStub('Client'),
    EventChef: entityStub('EventChef'),
    EventVendor: entityStub('EventVendor'),
    TeamMember: entityStub('TeamMember'),
    CommissionLine: entityStub('CommissionLine'),
    ServiceArea: entityStub('ServiceArea'),
    MatchRun: entityStub('MatchRun'),
    ActivityLog: entityStub('ActivityLog'),
    User: entityStub('User'),
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
      InvokeLLM: notImplemented('integrations.Core.InvokeLLM'),
      UploadFile: notImplemented('integrations.Core.UploadFile'),
    },
  },
}
