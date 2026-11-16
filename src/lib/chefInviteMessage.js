export const CHEF_INTAKE_INVITE_TEMPLATE_KEY = 'gradito_chef_intake_invite_template_v1';

/** Public intake form URL (SMS, copy link, templates — never localhost). */
export const PUBLIC_INTAKE_URL = 'https://ai.gradito.com/intake';

export const DEFAULT_CHEF_INTAKE_INVITE_TEMPLATE = `Hi {{first_name}},

You're invited to join the Gradito chef roster. Please complete your talent profile:

{{intake_link}}

— Gradito Team`;

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

export function renderChefInviteTemplate(template, chef) {
  const intakeLink = getIntakeLink();
  const first = chef?.first_name?.trim() || 'there';
  const last = chef?.last_name?.trim() || '';
  return String(template || DEFAULT_CHEF_INTAKE_INVITE_TEMPLATE)
    .replace(/\{\{\s*first_name\s*\}\}/gi, first)
    .replace(/\{\{\s*last_name\s*\}\}/gi, last)
    .replace(/\{\{\s*intake_link\s*\}\}/gi, intakeLink);
}

export function chefHasPhone(row) {
  const phone = `${row?.mobile || ''}${row?.phone || ''}`.trim();
  return phone.length >= 7;
}

/** @returns {'joined' | 'invited' | 'not_invited' | 'no_phone'} */
export function deriveProspectInviteStatus(prospect) {
  if (!prospect || prospect.archived) return 'not_invited';
  if (prospect.chef_id || prospect.status === 'joined' || prospect.intake_submitted_at) {
    return 'joined';
  }
  if (!chefHasPhone(prospect)) return 'no_phone';
  if (prospect.intake_invite_last_sent_at || prospect.status === 'invited') return 'invited';
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

export function canSendProspectInvite(prospect) {
  return deriveProspectInviteStatus(prospect) !== 'joined' && chefHasPhone(prospect);
}

export function inviteStatusLabel(status) {
  switch (status) {
    case 'joined':
      return 'Joined';
    case 'invited':
      return 'Invited';
    case 'no_phone':
      return 'No phone';
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

export function estimateSmsSegments(text) {
  const len = (text || '').length;
  if (len === 0) return 0;
  return len <= 160 ? 1 : Math.ceil(len / 153);
}