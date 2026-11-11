# Perfect Venue Integration — Simple Overview

**For:** Client / Perfect Venue partner setup  
**Our live website:** https://ai.gradito.com/  
**Official API docs:** https://perfect-venue.github.io/api-docs/#section/Introduction  
**Date:** 9 November 2026  

---

## What this is

Perfect Venue has an API (a secure way for Gradito to connect to Perfect Venue data).

It is **not open to everyone**. Perfect Venue only gives access to partners.  
So we must email them first and ask them to set us up.

Their contact: **eng@perfectvenue.com**

---

## Why we need to contact them

We cannot create the connection ourselves.

Perfect Venue must:

1. Approve Gradito as a partner
2. Create our connection (OAuth app)
3. Give us two secret keys: `client_id` and `client_secret`
4. Save our callback web address (see below)

Without this, Gradito cannot connect to Perfect Venue.

---

## Our callback URL (must be registered)

After a Perfect Venue user clicks **Allow**, Perfect Venue sends them back to this Gradito page:

```text
https://ai.gradito.com/oauth/perfect-venue/callback
```

Please ask Perfect Venue to register this exact address.

---

## What Gradito will do after connection (simple steps)

These steps follow Perfect Venue’s official Quick start:

### Step 1 — Ask Perfect Venue to set up access
We contact Perfect Venue and request partner access.

### Step 2 — Perfect Venue gives us credentials
They configure our app and send us:
- `client_id`
- `client_secret`
- confirmation of our callback URL

### Step 3 — A Perfect Venue user logs in and allows Gradito
Someone from the venue (who already has Perfect Venue access) opens a permission screen and approves Gradito.

### Step 4 — Gradito receives secure access tokens
Perfect Venue gives Gradito temporary access keys so we can talk to their system safely.

### Step 5 — Gradito reads the venues that user can access
We call their venues list and save each venue ID in Gradito.

### Step 6 — Sync all event data into Gradito
We pull the full event list from Perfect Venue and save every event field they return.

### Step 7 — Keep event data up to date
We use Perfect Venue’s event list again when needed, plus webhooks (automatic updates) so Gradito stays current when events change.

---

## Main goal: sync all event data

Our primary need is **data sync** — bring Perfect Venue event data into Gradito.

Perfect Venue does not use a separate permission for each event field.  
One **`read`** permission covers reading venues, events, and contacts. With that, Gradito receives the full event record their API returns.

### Event fields we will sync (from Perfect Venue API)

| Field | Meaning |
|---|---|
| `id` | Perfect Venue event ID |
| `venue_id` | Which venue the event belongs to |
| `contact_id` | Primary contact for the event |
| `owner_id` | Team member who owns the event |
| `name` | Event name |
| `status` | Event status (lead, confirmed, completed, etc.) |
| `start_time` / `end_time` | Event start and end time |
| `start_date` / `end_date` | Older date fields (still returned; new work uses start/end time) |
| `group_size` | Guest / group size |
| `source` | Where the event came from |
| `campaign` | Campaign name (if set) |
| `amount` | Estimated value (in cents) |
| `event_type` | Event type (e.g. Wedding) |
| `spaces` | Venue spaces assigned |
| `created_at` / `updated_at` | When the event was created / last updated |

We also sync related **contact** details and **team member** info when linked to an event.

---

## Permissions (scopes) we are requesting for sync

| Permission | Why we need it |
|---|---|
| `public` | Basic Perfect Venue API access (default) |
| `read` | **Required for event sync** — view venues, events, and contacts (all event fields above) |
| `contacts_read` | Sync full contact list (names and emails) linked to events |
| `users_read` | Sync team member names/roles/emails for event `owner_id` |
| `write` | Only if we later create or update events from Gradito |

**Sync scope string (minimum for full event data sync):**

```text
public read contacts_read users_read
```

**If two-way updates from Gradito are also needed later, add:** `write`

**Important:** Gradito only sees venues and data that the approving Perfect Venue user already has access to.

---

## Key details to share with Perfect Venue

| Item | Value |
|---|---|
| Product | Gradito Intelligence |
| Live website | https://ai.gradito.com/ |
| Callback URL | https://ai.gradito.com/oauth/perfect-venue/callback |
| Primary use case | Sync all event data fields into Gradito |
| Permissions requested | `public read contacts_read users_read` (+ `write` if create/update is needed) |
| Their setup email | eng@perfectvenue.com |
| Their docs | https://perfect-venue.github.io/api-docs/#section/Introduction |

---

## Short checklist

| # | Action | Who |
|---|---|---|
| 1 | Email Perfect Venue to request partner access | Gradito |
| 2 | Register callback URL and issue credentials | Perfect Venue |
| 3 | Venue user logs in and allows Gradito | Client / venue user |
| 4 | Gradito syncs venues + full event data | Gradito |

---

## Bottom line

1. Perfect Venue access is partner-only — we must ask them first.  
2. They register our callback URL and give us credentials.  
3. A Perfect Venue user must approve the connection.  
4. With the **`read`** permission, Gradito can sync **all event fields** Perfect Venue returns, plus contacts and team members as needed.

Nothing else is needed from the client at this stage except agreeing to this setup and, later, having a Perfect Venue user click **Allow**.
