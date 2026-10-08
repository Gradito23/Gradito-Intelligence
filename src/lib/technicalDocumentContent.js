/**
 * Static technical reference for the admin Technical Document page.
 * Keep prose factual; do not embed secrets or live credentials.
 */

export const TECHNICAL_DOC_SECTIONS = [
  {
    id: 'overview',
    title: 'Overview',
    paragraphs: [
      'Gradito Intelligence is the internal operations platform for chef rostering, events, matching, profitability reporting, and administrative configuration.',
      'Production is hosted at https://ai.gradito.com. Local development typically runs at http://localhost:5173 via Vite.',
    ],
    bullets: [
      'Frontend: React 18 with Vite, React Router, TanStack Query, Tailwind CSS, and shadcn/ui components.',
      'Backend: Supabase (PostgreSQL, Auth, Storage, Edge Functions).',
      'Legacy compatibility: many screens still call the Base44-shaped client in src/api/base44Client.js, which delegates to Supabase repositories.',
    ],
  },
  {
    id: 'application-architecture',
    title: 'Application architecture',
    paragraphs: [
      'The UI is organized into operational routes (dashboard, chefs, events, match, reports) and an admin area under /admin. Authentication and role-based permissions are enforced in the client and backed by Supabase RLS and server-side checks on edge functions.',
    ],
    bullets: [
      'src/pages/ — route-level screens for ops, public intake, and admin.',
      'src/infrastructure/ — Supabase repositories and data access patterns.',
      'src/hooks/ — TanStack Query hooks wrapping repositories and integrations.',
      'src/lib/ — Auth context, permissions, navigation metadata, and shared utilities.',
      'src/components/ — Reusable UI, layout (sidebar, app shell), and admin widgets.',
    ],
  },
  {
    id: 'data-security',
    title: 'Data and security',
    paragraphs: [
      'Application data lives in Supabase Postgres with row-level security aligned to staff roles. File uploads use Storage buckets (for example uploads and avatars). Integration API keys and SMTP credentials are stored encrypted at rest using a platform data-encryption key wrapped by the PLATFORM_KEK edge secret.',
    ],
    bullets: [
      'Auth: Supabase Auth (email/password, OTP, optional Google SSO for staff).',
      'Roles and permissions: profiles, app_roles, and role_permissions tables; checked via AuthContext and PermissionRoute.',
      'Secrets: configure PLATFORM_KEK once per environment; redeploy edge functions after rotation. Losing PLATFORM_KEK makes existing ciphertext unrecoverable.',
      'Never commit .env files or paste live API keys into this document or support tickets.',
    ],
  },
  {
    id: 'edge-functions',
    title: 'Edge functions',
    paragraphs: [
      'Server-side logic that must not run in the browser is implemented as Supabase Edge Functions under supabase/functions/. Deploy with npx supabase functions deploy <name>.',
    ],
    bullets: [
      'integration-email — Resend and custom SMTP configuration, send/test, encrypted secret storage.',
      'integration-openai — OpenAI API key management, model sync, and LLM invocation for product features.',
      'integration-smtp — SMTP-related helpers used by the email integration stack.',
      'onboarding-guide-email — Sends the Chef & FOH onboarding guide after intake; open/click tracking.',
      'manage-users — Admin user lifecycle (invites, role assignment) with service-role access.',
      'auth-gate — Auth-related gatekeeping for protected flows.',
      'auth-password-reset — Password reset email and token handling.',
    ],
  },
  {
    id: 'routes-surfaces',
    title: 'Key routes and public surfaces',
    paragraphs: [
      'Some routes are intentionally public or semi-public for chef onboarding and guide delivery; the rest require an authenticated staff session.',
    ],
    bullets: [
      'Public: /intake (chef self-onboarding), /login, /register, password reset and invite acceptance flows.',
      'Public tracking: /guide/:token — redirects to the configured onboarding guide URL and records click events.',
      'Ops (authenticated): /dashboard, /chefs, /intake-requests, /events, /match, /reports, /profitability, /profile.',
      'Admin (admin_panel access): /admin/* — users, roles, reference data, integrations, bulk upload, commission team, documentation pages.',
    ],
  },
  {
    id: 'configuration-deploy',
    title: 'Configuration and deploy',
    paragraphs: [
      'Client environment variables are prefixed with VITE_ and baked in at build time. Server-only secrets are set via Supabase CLI (supabase secrets set).',
    ],
    bullets: [
      'VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY — Supabase project connection for the browser.',
      'VITE_APP_URL — Canonical app URL for links in emails and redirects (must match production host).',
      'APP_URL — Edge secret for invite and password-reset links generated on the server.',
      'Database: apply migrations with npx supabase db push (or your team’s migration workflow).',
      'Build: npm run build; lint with npm run lint.',
    ],
  },
];
