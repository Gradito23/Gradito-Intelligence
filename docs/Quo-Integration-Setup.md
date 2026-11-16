# Quo — SMS and call transcripts

Quo powers staff SMS to chefs and ingests inbound replies and call transcripts for AI-ready history in `quo_communication_events`.

## Prerequisites

1. Migration applied: `20261116120000_integration_quo.sql`
2. Edge functions deployed: `integration-quo`, `quo-webhook-messages`, `quo-webhook-transcripts`
3. `PLATFORM_KEK` set (same as OpenAI / email encryption)
4. Quo API key saved under **Admin → Integrations → Quo**

## Edge secrets (Supabase)

```bash
npx supabase secrets set QUO_PHONE_NUMBER_ID="PNxxxxxxxx"
# optional fallback sender E.164:
npx supabase secrets set QUO_PHONE_NUMBER_E164="+15555555555"
```

Webhook signing secrets come from the setup script output (one per webhook).

## Register webhooks (one-time)

After deploying webhook functions:

```bash
export QUO_API_KEY="your-quo-api-key"
export SUPABASE_PROJECT_REF="your-project-ref"
# optional:
export QUO_PHONE_NUMBER_ID="PNxxxxxxxx"

node scripts/quo-setup-webhooks.mjs
```

Run the printed `npx supabase secrets set QUO_WEBHOOK_*` commands, then redeploy:

```bash
npx supabase functions deploy quo-webhook-messages quo-webhook-transcripts --project-ref <ref> --yes
```

## Admin test

**Admin → Integrations → Quo → Test connection** verifies:

- API key (`GET /users`)
- A2P registration status (`GET /a2p-registration`)
- Sender number (`GET /phone-numbers/{QUO_PHONE_NUMBER_ID}` when id is set)

Phone number id and webhook URLs are not shown in the admin UI.

## Chef messaging

**Chefs → detail panel → Messages** lists `quo_communication_events` for that chef and sends outbound SMS via `integration-quo` (`send_message` with `chef_id`).

## Intake invite SMS (prospects)

Migration: `20261117100000_chef_invite_prospects.sql`. Deploy `chef-intake-submit` for public `/intake` submissions.

- **Invite by Message** uses `chef_invite_prospects` (not the live chef roster).
- Send intake SMS with `send_message` + `prospect_id` + `mark_intake_invite: true` (updates prospect `intake_invite_last_sent_at`).
- Public intake runs through `chef-intake-submit`: blocks if email/phone matches a live chef; links `prospect_id` when matched.
- Approving an intake request **updates** an existing chef when email/phone (or `prospect.chef_id`) matches — it does not create a duplicate row.

## Intake invite email (prospects)

Migration: `20261117200000_prospect_invite_email.sql`. Redeploy `integration-email`.

- SendGrid is configured as **Custom SMTP** under **Admin → Integrations → Email** (active provider).
- **Invite by Message → Email** tab calls `integration-email` `send_intake_invite` (authenticated ops users).
- Sends use `email_type: chef_intake_invite` and set `email_logs.prospect_id`; prospect column `intake_invite_email_last_sent_at` is updated when `mark_intake_invite: true`.
- **History** tab merges `quo_communication_events` (SMS) and `email_logs` for the selected prospect.

```bash
npx supabase functions deploy integration-email integration-quo chef-intake-submit --project-ref <ref> --yes
```

## API reference

- [Quo API introduction](https://www.quo.com/docs/2026-03-30/introduction.md)
- [Create webhook](https://www.quo.com/docs/2026-03-30/webhooks/create-a-new-webhook)
- [Webhooks overview](https://www.quo.com/docs/2026-03-30/webhooks-overview.md)