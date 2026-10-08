import { Bot, Cloud, Mail, Server } from 'lucide-react';
import GoogleIcon from '@/components/GoogleIcon';

export const INTEGRATION_DOC_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'platform', label: 'Platform' },
  { id: 'authentication', label: 'Auth' },
  { id: 'communications', label: 'Email' },
  { id: 'ai', label: 'AI' },
];

export const INTEGRATIONS_DOC_CARDS = [
  {
    id: 'supabase',
    title: 'Supabase',
    vendor: 'Supabase',
    category: 'platform',
    icon: Cloud,
    status: 'active',
    purpose:
      'Core backend: authentication, PostgreSQL database, file storage, and Deno edge functions. All staff sessions and application data flow through this platform.',
    usedIn: [
      'Staff login and session management',
      'Chef, event, and ops data (Postgres + RLS)',
      'Intake and portfolio file uploads (Storage)',
      'Integration secret storage and edge function execution',
    ],
    configurePath: null,
  },
  {
    id: 'google_sso',
    title: 'Google SSO',
    vendor: 'Google',
    category: 'authentication',
    icon: GoogleIcon,
    status: 'active',
    purpose:
      'Allows staff to sign in with Google OAuth via Supabase Auth. Reduces password friction and aligns with Google Workspace accounts where enabled.',
    usedIn: [
      'Login and registration flows',
      'Admin → Integrations → Google SSO setup',
    ],
    configurePath: '/admin/integrations/google-sso',
  },
  {
    id: 'resend',
    title: 'Resend',
    vendor: 'Resend',
    category: 'communications',
    icon: Mail,
    status: 'active',
    purpose:
      'Primary transactional email API when Resend is the active email provider. Sends onboarding guide messages, notifications, and other system email.',
    usedIn: [
      'Admin → Integrations → Email (Resend API)',
      'onboarding-guide-email edge function',
      'integration-email send and test actions',
    ],
    configurePath: '/admin/integrations/email',
  },
  {
    id: 'custom_smtp',
    title: 'Custom SMTP',
    vendor: 'Your mail server',
    category: 'communications',
    icon: Server,
    status: 'active',
    purpose:
      'Alternative to Resend: send application email through your own SMTP host (TLS). Only one email provider is active at a time (Resend or custom SMTP).',
    usedIn: [
      'Admin → Integrations → Email (Custom SMTP)',
      'integration-email edge function when SMTP is selected',
    ],
    configurePath: '/admin/integrations/email',
  },
  {
    id: 'openai',
    title: 'OpenAI',
    vendor: 'OpenAI',
    category: 'ai',
    icon: Bot,
    status: 'active',
    purpose:
      'Powers AI-assisted workflows: chef matching insights, invoice parsing, and other LLM features invoked through the integration-openai edge function.',
    usedIn: [
      'Chef Match and related ops tools',
      'Bulk upload invoice interpretation',
      'Admin → Integrations → OpenAI (API key, models, enable/disable)',
    ],
    configurePath: '/admin/integrations/ai',
  },
  {
    id: 'anthropic',
    title: 'Anthropic',
    vendor: 'Anthropic',
    category: 'ai',
    icon: Bot,
    status: 'coming_soon',
    purpose:
      'Planned support for Claude models as an additional AI provider for the same class of assisted workflows as OpenAI.',
    usedIn: [
      'Not yet connected in production',
      'Listed in Integrations hub as coming soon',
    ],
    configurePath: null,
  },
];
