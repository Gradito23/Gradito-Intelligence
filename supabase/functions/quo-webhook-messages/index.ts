import { corsHeaders } from '../_shared/auth.ts';
import { handleQuoWebhookRequest } from '../_shared/quoWebhook.ts';

const ACCEPTED_TYPES = [
  'message.received',
  'message.delivered',
  'message.failed',
  'message.undelivered',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    return await handleQuoWebhookRequest(
      req,
      'QUO_WEBHOOK_MESSAGES_SECRET',
      'sms',
      ACCEPTED_TYPES,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('quo-webhook-messages:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});