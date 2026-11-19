export const DEFAULT_INTAKE_APPROVED_SMS_TEMPLATE =
  'Gradito: Hi {{first_name}}, great news — your chef intake was approved. Welcome to the Gradito roster! Reply STOP to opt out.';

export const INTAKE_APPROVED_EMAIL_SUBJECT = 'Welcome to the Gradito chef roster';

export function renderIntakeApprovedSms(firstName: string): string {
  const name = firstName?.trim() || 'there';
  return DEFAULT_INTAKE_APPROVED_SMS_TEMPLATE.replace(/\{\{\s*first_name\s*\}\}/gi, name);
}

export function getAppBaseUrl(): string {
  return (Deno.env.get('APP_URL')?.trim() || Deno.env.get('SITE_URL')?.trim() || '').replace(/\/$/, '');
}