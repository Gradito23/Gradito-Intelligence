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

---

## Test fixtures

Bulk upload samples: `fixtures/bulk-upload/` (see that folder’s README).

```bash
node scripts/generate-bulk-upload-fixtures.mjs
```

---

## License

Private — Gradito.
