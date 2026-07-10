import { Bot, Mail } from 'lucide-react';

export const INTEGRATION_CATEGORIES = [
  {
    id: 'communications',
    label: 'Communications',
    integrations: [
      {
        id: 'email',
        label: 'Email',
        description: 'Resend API or Custom SMTP for app emails and notifications.',
        path: '/admin/integrations/email',
        icon: Mail,
        status: 'active',
      },
    ],
  },
  {
    id: 'ai',
    label: 'AI Providers',
    integrations: [
      {
        id: 'openai',
        label: 'OpenAI',
        description: 'Connect OpenAI API for AI-assisted workflows.',
        path: '/admin/integrations/ai',
        icon: Bot,
        status: 'active',
      },
      {
        id: 'anthropic',
        label: 'Anthropic',
        description: 'Claude API for AI-assisted workflows.',
        path: '/admin/integrations/ai',
        icon: Bot,
        status: 'coming_soon',
      },
    ],
  },
];

export function getEmailIntegrationStatus(emailData) {
  if (!emailData) return 'Loading…';

  const activeProvider = emailData.active_provider ?? 'resend';
  const resend = emailData.resend;
  const customCount = emailData.custom_smtp_configs?.length ?? 0;

  if (activeProvider === 'resend') {
    const connected = resend?.configured ? 'Connected' : 'Not configured';
    return `Resend active · ${connected}`;
  }

  const activeCustom = emailData.active_custom_smtp;
  if (activeCustom) {
    return `Custom SMTP · ${activeCustom.smtp_host}:${activeCustom.smtp_port}`;
  }

  return customCount > 0
    ? `Custom SMTP · ${customCount} config(s)`
    : 'Custom SMTP · No configs';
}

export function getOpenAIIntegrationStatus(openaiData) {
  if (!openaiData) return 'Loading…';
  if (!openaiData.configured) return 'Not configured';
  if (!openaiData.enabled) return 'Configured · Disabled';
  const model = openaiData.default_model_id;
  return model ? `Connected · Default: ${model}` : 'Connected · No default model';
}
