export const CHEF_INTAKE_INVITE_TEMPLATE_KEY = 'gradito_chef_intake_invite_template_v3';
export const CHEF_INTAKE_INVITE_EMAIL_SUBJECT_KEY = 'gradito_chef_intake_invite_email_subject_v1';
export const CHEF_INTAKE_INVITE_EMAIL_BODY_KEY = 'gradito_chef_intake_invite_email_body_v2';

/** Fallback when prospect/chef has no city (matches prior hardcoded copy). */
export const DEFAULT_INVITE_CITY = 'Miami';

export const DEFAULT_CHEF_INTAKE_INVITE_EMAIL_SUBJECT = "You're invited to join Gradito";

export const DEFAULT_CHEF_INTAKE_INVITE_EMAIL_BODY = `Gradito: Hi {{first_name}}, it's Sean! We'd love to have you on our private chef roster for paid events in {{city}}: {{intake_link}}

Reply STOP to opt out.`;

/** Public intake form URL (SMS, copy link, templates — never localhost). */
export const PUBLIC_INTAKE_URL = 'https://ai.gradito.com/intake';

export const DEFAULT_CHEF_INTAKE_INVITE_TEMPLATE = `Gradito: Hi {{first_name}}, it's Sean! We'd love to have you on our private chef roster for paid events in {{city}}: {{intake_link}} Reply STOP to opt out.`;

export function buildIntakeJoinedLookup(requests) {
  const chefIds = new Set();
  const emails = new Set();
  for (const r of requests ?? []) {
    if (r.chef_id) chefIds.add(r.chef_id);
    const email = r.email?.trim().toLowerCase();
    if (email) emails.add(email);
  }
  return { chefIds, emails };
}

function chefMatchesIntake(chef, intakeLookup) {
  if (!chef || !intakeLookup) return false;
  if (chef.id && intakeLookup.chefIds.has(chef.id)) return true;
  const email = chef.email?.trim().toLowerCase();
  return !!(email && intakeLookup.emails.has(email));
}

/** @param {{ inRoster?: boolean, intakeLookup?: { chefIds: Set, emails: Set } }} options */
export function isChefInviteJoined(chef, options = {}) {
  const { inRoster = false, intakeLookup } = options;
  if (!chef || chef.archived) return false;
  if (inRoster) return true;
  return chefMatchesIntake(chef, intakeLookup);
}

export function getIntakeLink() {
  return PUBLIC_INTAKE_URL;
}

export function renderChefInviteTemplate(template, person) {
  return applyInviteVars(template || DEFAULT_CHEF_INTAKE_INVITE_TEMPLATE, person);
}

export function chefHasPhone(row) {
  const phone = `${row?.mobile || ''}${row?.phone || ''}`.trim();
  return phone.length >= 7;
}

export function chefHasEmail(row) {
  const e = row?.email?.trim() || '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export function isProspectJoined(prospect) {
  if (!prospect || prospect.archived) return false;
  return Boolean(prospect.chef_id || prospect.status === 'joined' || prospect.intake_submitted_at);
}

export function hasGraditoMessagingOptIn(row) {
  return row?.gradito_messaging_opt_in !== false;
}

/** @returns {'joined' | 'invited' | 'not_invited' | 'no_phone' | 'no_email'} */
export function deriveProspectInviteStatus(prospect) {
  if (!prospect || prospect.archived) return 'not_invited';
  if (isProspectJoined(prospect)) return 'joined';
  const invited = prospect.intake_invite_last_sent_at
    || prospect.intake_invite_email_last_sent_at
    || prospect.status === 'invited';
  if (invited) return 'invited';
  const hasPhone = chefHasPhone(prospect);
  const hasEmail = chefHasEmail(prospect);
  if (!hasPhone && !hasEmail) return 'not_invited';
  if (!hasPhone && hasEmail) return 'no_phone';
  if (hasPhone && !hasEmail) return 'no_email';
  return 'not_invited';
}

/** @returns {'joined' | 'invited' | 'not_invited' | 'no_phone'} */
export function deriveChefInviteStatus(chef, options = {}) {
  if (!chef || chef.archived) return 'not_invited';
  if (isChefInviteJoined(chef, options)) return 'joined';
  if (!chefHasPhone(chef)) return 'no_phone';
  if (chef.intake_invite_last_sent_at) return 'invited';
  return 'not_invited';
}

export function canSendProspectSms(prospect) {
  return !isProspectJoined(prospect) && chefHasPhone(prospect) && hasGraditoMessagingOptIn(prospect);
}

/** @deprecated use canSendProspectSms */
export function canSendProspectInvite(prospect) {
  return canSendProspectSms(prospect);
}

export function canSendProspectEmail(prospect) {
  return !isProspectJoined(prospect) && chefHasEmail(prospect) && hasGraditoMessagingOptIn(prospect);
}

export function canSelectProspectForInvite(prospect) {
  return canSendProspectSms(prospect) || canSendProspectEmail(prospect);
}

export function inviteStatusLabel(status) {
  switch (status) {
    case 'joined':
      return 'Joined';
    case 'invited':
      return 'Invited';
    case 'no_phone':
      return 'No phone';
    case 'no_email':
      return 'No email';
    default:
      return 'Not invited';
  }
}

export function canSendInviteMessage(chef, options = {}) {
  return !isChefInviteJoined(chef, options) && chefHasPhone(chef);
}

export function loadStoredInviteTemplate() {
  try {
    return localStorage.getItem(CHEF_INTAKE_INVITE_TEMPLATE_KEY) || DEFAULT_CHEF_INTAKE_INVITE_TEMPLATE;
  } catch {
    return DEFAULT_CHEF_INTAKE_INVITE_TEMPLATE;
  }
}

export function saveStoredInviteTemplate(template) {
  try {
    localStorage.setItem(CHEF_INTAKE_INVITE_TEMPLATE_KEY, template);
  } catch {
    // ignore
  }
}

function applyInviteVars(template, person) {
  const intakeLink = getIntakeLink();
  const first = person?.first_name?.trim() || 'there';
  const last = person?.last_name?.trim() || '';
  const city = person?.city?.trim() || DEFAULT_INVITE_CITY;
  return String(template || '')
    .replace(/\{\{\s*first_name\s*\}\}/gi, first)
    .replace(/\{\{\s*last_name\s*\}\}/gi, last)
    .replace(/\{\{\s*city\s*\}\}/gi, city)
    .replace(/\{\{\s*intake_link\s*\}\}/gi, intakeLink);
}

export function plainInviteTextToHtml(text) {
  const escaped = String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const link = getIntakeLink();
  const linkified = escaped.replace(
    link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    `<a href="${link}">${link}</a>`,
  );
  return linkified.replace(/\n/g, '<br>\n');
}

export function renderChefInviteEmailSubject(subjectTemplate, person) {
  return applyInviteVars(subjectTemplate || DEFAULT_CHEF_INTAKE_INVITE_EMAIL_SUBJECT, person);
}

export function renderChefInviteEmailPlain(bodyTemplate, person) {
  return applyInviteVars(bodyTemplate || DEFAULT_CHEF_INTAKE_INVITE_EMAIL_BODY, person);
}

export function renderChefInviteEmailHtml(bodyTemplate, person) {
  const plain = renderChefInviteEmailPlain(bodyTemplate, person);
  return plainInviteTextToHtml(plain);
}

export function loadStoredInviteEmailSubject() {
  try {
    return localStorage.getItem(CHEF_INTAKE_INVITE_EMAIL_SUBJECT_KEY)
      || DEFAULT_CHEF_INTAKE_INVITE_EMAIL_SUBJECT;
  } catch {
    return DEFAULT_CHEF_INTAKE_INVITE_EMAIL_SUBJECT;
  }
}

export function saveStoredInviteEmailSubject(subject) {
  try {
    localStorage.setItem(CHEF_INTAKE_INVITE_EMAIL_SUBJECT_KEY, subject);
  } catch {
    // ignore
  }
}

export function loadStoredInviteEmailBody() {
  try {
    return localStorage.getItem(CHEF_INTAKE_INVITE_EMAIL_BODY_KEY)
      || DEFAULT_CHEF_INTAKE_INVITE_EMAIL_BODY;
  } catch {
    return DEFAULT_CHEF_INTAKE_INVITE_EMAIL_BODY;
  }
}

export function saveStoredInviteEmailBody(body) {
  try {
    localStorage.setItem(CHEF_INTAKE_INVITE_EMAIL_BODY_KEY, body);
  } catch {
    // ignore
  }
}

export function estimateSmsSegments(text) {
  const len = (text || '').length;
  if (len === 0) return 0;
  return len <= 160 ? 1 : Math.ceil(len / 153);
}