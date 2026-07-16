# Gradito Intelligence

Ops platform for Gradito chef rostering, events, matching, profitability, and admin configuration.

**Stack:** React (Vite) · TypeScript-friendly JS · Supabase (Auth, Postgres, Storage, Edge Functions) · Tailwind CSS · TanStack Query

---

## Prerequisites

- Node.js 20+
- npm
- A Supabase project (or local Supabase CLI)

---

## Setup

```bash
git clone <repo-url>
cd Gradito-Intelligence
npm install
cp .env.example .env
```

Fill `.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_APP_URL=http://localhost:5173
```

Apply database migrations (from the Supabase SQL editor, or):

```bash
npx supabase db push
# or: supabase migration up
```

Deploy edge functions as needed (e.g. OpenAI integration, auth/email helpers):

```bash
npx supabase functions deploy integration-openai
```

---

## Run

```bash
npm run dev
```

App: [http://localhost:5173](http://localhost:5173)

```bash
npm run build    # production build
npm run preview  # preview build
npm run lint
```

---

## App areas

| Area | Routes (examples) |
|------|-------------------|
| Ops | `/dashboard`, `/chefs`, `/intake-requests`, `/events`, `/match`, `/reports`, `/profitability` |
| Public | `/intake` (chef self-onboarding), `/login` |
| Admin | `/admin/*` — users, roles, permissions, reference data, integrations, bulk upload, commission team |

---

## Architecture notes

- UI talks to Supabase via repositories under `src/infrastructure/` and the API client in `src/api/`.
- Auth and role permissions live in Supabase (`profiles`, `app_roles`, `role_permissions`).
- File uploads use the `uploads` / `avatars` storage buckets.
- LLM features (Chef Match, invoice parse) use the `integration-openai` edge function; configure the API key under **Admin → Integrations → OpenAI**.
- Integration secrets (OpenAI, Resend, SMTP) are encrypted at rest with a platform DEK wrapped by `PLATFORM_KEK` (Edge Function secret). Set once after deploy:

```bash
npx supabase secrets set PLATFORM_KEK="$(openssl rand -base64 32)"
```

Then apply the encryption migration (`supabase db push`), redeploy edge functions, and open **Admin → Integrations** (or invoke `backfill_secrets` on `integration-openai` / `integration-email`) so existing plaintext keys are encrypted. Keep a secure backup of `PLATFORM_KEK` — losing it makes ciphertext unrecoverable.

### Production URL and Google SSO

Production app: **https://ai.gradito.com**

1. Set hosting env: `VITE_APP_URL=https://ai.gradito.com`
2. Set Supabase edge secret: `npx supabase secrets set APP_URL="https://ai.gradito.com"` (for invite + password-reset links)
3. Google SSO: **Admin → Integrations → Google SSO** — Phase 1 (Google Cloud URLs) and Phase 2 (Supabase Client ID + Secret)

---

## Test fixtures

Bulk upload samples: `fixtures/bulk-upload/` (see that folder’s README).

```bash
node scripts/generate-bulk-upload-fixtures.mjs
```

---

## License

Private — Gradito.
