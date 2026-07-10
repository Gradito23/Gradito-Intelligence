import { Bot, Cloud, Mail, MessageSquare } from 'lucide-react';

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
      {
        id: 'sms',
        label: 'SMS / Twilio',
        description: 'Transactional SMS notifications.',
        path: null,
        icon: MessageSquare,
        status: 'coming_soon',
      },
    ],
  },
  {
    id: 'ai',
    label: 'AI Providers',
    integrations: [
      {
        id: 'llm',
        label: 'LLM / OpenAI',
        description: 'Connect OpenAI or compatible LLM APIs.',
        path: '/admin/integrations/ai',
        icon: Bot,
        status: 'coming_soon',
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
  {
    id: 'storage',
    label: 'Storage',
    integrations: [
      {
        id: 'gdrive',
        label: 'Google Drive',
        description: 'Import and export files from Google Drive.',
        path: '/admin/integrations/storage',
        icon: Cloud,
        status: 'coming_soon',
      },
      {
        id: 's3',
        label: 'S3 / R2',
        description: 'Object storage for uploads and backups.',
        path: '/admin/integrations/storage',
        icon: Cloud,
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
