#!/usr/bin/env node
/**
 * One-time Quo webhook registration for Gradito Intelligence.
 *
 * Env:
 *   QUO_API_KEY (required)
 *   SUPABASE_PROJECT_REF or QUO_WEBHOOK_BASE_URL (required)
 *   QUO_PHONE_NUMBER_ID (optional, PN… id for resourceIds filter)
 */

const QUO_API_VERSION = '2026-03-30';
const QUO_API_BASE = 'https://api.quo.com';

function getBaseUrl() {
  const explicit = process.env.QUO_WEBHOOK_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const ref = process.env.SUPABASE_PROJECT_REF?.trim();
  if (!ref) {
    throw new Error('Set QUO_WEBHOOK_BASE_URL or SUPABASE_PROJECT_REF');
  }
  return `https://${ref}.supabase.co/functions/v1`;
}

async function quoFetch(path, body) {
  const apiKey = process.env.QUO_API_KEY?.trim();
  if (!apiKey) throw new Error('QUO_API_KEY is required');

  const response = await fetch(`${QUO_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Quo-Api-Version': QUO_API_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = json?.message || `Quo API ${response.status}`;
    throw new Error(msg);
  }
  return json?.data ?? json;
}

async function main() {
  const base = getBaseUrl();
  const phoneNumberId = process.env.QUO_PHONE_NUMBER_ID?.trim();
  const resourceIds = phoneNumberId ? [phoneNumberId] : ['*'];

  const messagesUrl = `${base}/quo-webhook-messages`;
  const transcriptsUrl = `${base}/quo-webhook-transcripts`;

  console.log('Creating messages webhook →', messagesUrl);
  const messages = await quoFetch('/webhooks', {
    label: 'gradito-messages',
    url: messagesUrl,
    events: ['message.received', 'message.delivered', 'message.failed', 'message.undelivered'],
    resourceIds,
    status: 'enabled',
  });

  console.log('Creating transcripts webhook →', transcriptsUrl);
  const transcripts = await quoFetch('/webhooks', {
    label: 'gradito-transcripts',
    url: transcriptsUrl,
    events: ['call.transcript.completed'],
    resourceIds,
    status: 'enabled',
  });

  console.log('\nWebhook IDs:');
  console.log('  messages:', messages.id);
  console.log('  transcripts:', transcripts.id);

  console.log('\nStore signing secrets in Supabase (shown once by Quo):');
  if (messages.key) {
    console.log(`  npx supabase secrets set QUO_WEBHOOK_MESSAGES_SECRET="${messages.key}"`);
  }
  if (transcripts.key) {
    console.log(`  npx supabase secrets set QUO_WEBHOOK_TRANSCRIPTS_SECRET="${transcripts.key}"`);
  }

  console.log('\nRedeploy webhook functions after setting secrets.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});