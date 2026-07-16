export const APP_URL = 'https://ai.gradito.com';

function trimTrailingSlash(url) {
  return (url || '').replace(/\/$/, '');
}

export function getSupabaseProjectRef() {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] || '';
}

export function getSupabaseCallbackUrl() {
  const base = trimTrailingSlash(import.meta.env.VITE_SUPABASE_URL?.trim() || '');
  if (!base) return 'https://YOUR_PROJECT.supabase.co/auth/v1/callback';
  return `${base}/auth/v1/callback`;
}

export function getGoogleCloudCredentialsUrl() {
  return 'https://console.cloud.google.com/apis/credentials';
}

export function getSupabaseGoogleProviderUrl(projectRef) {
  const ref = projectRef || getSupabaseProjectRef() || 'YOUR_PROJECT';
  return `https://supabase.com/dashboard/project/${ref}/auth/providers?provider=Google`;
}

export const GOOGLE_PHASE_STEPS = [
  'Set up OAuth consent screen (APIs & Services → OAuth consent screen).',
  'Create OAuth client ID → Web application.',
  'Paste the URLs below, then copy Client ID and Client Secret.',
];

export const SUPABASE_PHASE_STEPS = [
  'Open Authentication → Providers → Google.',
  'Enable Google, paste Client ID and Client Secret from Phase 1, Save.',
];

export function getGoogleSSOStatus() {
  return 'Setup guide';
}
