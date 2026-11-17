export const CHEF_INTAKE_INVITE_TEMPLATE_KEY = 'gradito_chef_intake_invite_template_v3';
export const CHEF_INTAKE_INVITE_EMAIL_SUBJECT_KEY = 'gradito_chef_intake_invite_email_subject_v1';
export const CHEF_INTAKE_INVITE_EMAIL_BODY_KEY = 'gradito_chef_intake_invite_email_body_v3';

const LEGACY_SMS_TEMPLATE_KEYS = [
  'gradito_chef_intake_invite_template_v2',
  'gradito_chef_intake_invite_template_v1',
];
const LEGACY_EMAIL_BODY_KEYS = [
  'gradito_chef_intake_invite_email_body_v2',
  'gradito_chef_intake_invite_email_body_v1',
];

/** @deprecated stored under v2 — used only for localStorage migration */
export const LEGACY_DEFAULT_CHEF_INTAKE_INVITE_TEMPLATE_V2 = `Gradito: Hi {{first_name}}, it's Sean! We'd love to have you on our private chef roster for paid events in Miami: {{intake_link}} Reply STOP to opt out.`;

/** @deprecated stored under email body v1 — used only for localStorage migration */
export const LEGACY_DEFAULT_CHEF_INTAKE_INVITE_EMAIL_BODY_V1 = `Gradito: Hi {{first_name}}, it's Sean! We'd love to have you on our private chef roster for paid events in Miami: {{intake_link}}

Reply STOP to opt out.`;

/** @deprecated generic roster invite stored in early localStorage builds */
export const LEGACY_GENERIC_CHEF_INTAKE_INVITE_EMAIL_BODY = `Hi {{first_name}},

You're invited to join the Gradito chef roster. Please complete your talent profile:

{{intake_link}}

— Gradito Team`;

/** Fallback when prospect/chef has no city (matches prior hardcoded copy). */
export const DEFAULT_INVITE_CITY = 'Miami';

export const DEFAULT_CHEF_INTAKE_INVITE_EMAIL_SUBJECT = "You're invited to join Gradito";

/** Public intake form URL (SMS, copy link, templates — never localhost). */
export const PUBLIC_INTAKE_URL = 'https://ai.gradito.com/intake';

export const DEFAULT_CHEF_INTAKE_INVITE_TEMPLATE = `Gradito: Hi {{first_name}}, it's Sean! We'd love to have you on our private chef roster for paid events in {{city}}: {{intake_link}} Reply STOP to opt out.`;

/** Remove SMS opt-out footer — not used in email invites. */
export function stripEmailOptOutFooter(text) {
  return String(text ?? '')
    .replace(/\n*\s*Reply STOP to opt out\.?\s*/gi, '')
    .replace(/\s+Reply STOP to opt out\.?\s*/gi, '')
    .trim();
}

/** Email body aligns with SMS copy but omits the STOP footer. */
export function emailBodyFromSmsTemplate(smsTemplate) {
  return stripEmailOptOutFooter(smsTemplate);
}

export const DEFAULT_CHEF_INTAKE_INVITE_EMAIL_BODY = emailBodyFromSmsTemplate(
  DEFAULT_CHEF_INTAKE_INVITE_TEMPLATE,
);

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

/**
 * Upgrade stored invite copy that hardcoded Miami before {{city}} existed.
 * @returns {string} upgraded template (unchanged if already has {{city}} and no legacy exact match)
 */
export function upgradeInviteTemplateCity(template) {
  const raw = String(template ?? '');
  if (/\{\{\s*city\s*\}\}/i.test(raw)) return raw;
  if (raw === LEGACY_DEFAULT_CHEF_INTAKE_INVITE_TEMPLATE_V2) {
    return DEFAULT_CHEF_INTAKE_INVITE_TEMPLATE;
  }
  if (raw === LEGACY_DEFAULT_CHEF_INTAKE_INVITE_EMAIL_BODY_V1) {
    return DEFAULT_CHEF_INTAKE_INVITE_EMAIL_BODY;
  }
  return raw.replace(/paid events in Miami:/gi, 'paid events in {{city}}:');
}

function isLegacyGenericInviteEmailBody(raw) {
  if (raw === LEGACY_GENERIC_CHEF_INTAKE_INVITE_EMAIL_BODY) return true;
  return /Gradito Team/i.test(raw) && !/it's Sean/i.test(raw);
}

/**
 * Upgrade stored email bodies (generic roster copy or pre-{{city}} Sean copy).
 */
export function upgradeInviteEmailBody(template) {
  const raw = String(template ?? '');
  let next;
  if (isLegacyGenericInviteEmailBody(raw)) {
    next = emailBodyFromSmsTemplate(DEFAULT_CHEF_INTAKE_INVITE_TEMPLATE);
  } else {
    next = upgradeInviteTemplateCity(raw);
  }
  return stripEmailOptOutFooter(next);
}

function loadInviteTextFromStorage(
  currentKey,
  legacyKeys,
  defaultValue,
  upgradeFn = upgradeInviteTemplateCity,
) {
  try {
    let raw = localStorage.getItem(currentKey);
    let fromLegacy = false;
    if (raw == null) {
      for (const legacyKey of legacyKeys) {
        const legacy = localStorage.getItem(legacyKey);
        if (legacy != null) {
          raw = legacy;
          fromLegacy = true;
          try {
            localStorage.removeItem(legacyKey);
          } catch {
            // ignore
          }
          break;
        }
      }
    }
    if (raw == null) return defaultValue;
    const upgraded = upgradeFn(raw);
    if (fromLegacy || upgraded !== raw || localStorage.getItem(currentKey) !== upgraded) {
      localStorage.setItem(currentKey, upgraded);
    }
    return upgraded;
  } catch {
    return defaultValue;
  }
}

export function loadStoredInviteTemplate() {
  return loadInviteTextFromStorage(
    CHEF_INTAKE_INVITE_TEMPLATE_KEY,
    LEGACY_SMS_TEMPLATE_KEYS,
    DEFAULT_CHEF_INTAKE_INVITE_TEMPLATE,
  );
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

const INVITE_EMAIL_BRAND = {
  navy: '#1a2744',
  gold: '#c9a227',
  text: '#334155',
  muted: '#64748b',
  border: '#e2e8f0',
  bg: '#f8fafc',
  white: '#ffffff',
};

function escapeInviteHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInviteEmailCta(label, url) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr>
    <td align="center">
      <a href="${escapeInviteHtml(url)}" style="display:inline-block;background-color:${INVITE_EMAIL_BRAND.gold};color:${INVITE_EMAIL_BRAND.white};text-decoration:none;font-size:15px;font-weight:600;padding:14px 28px;border-radius:8px;">
        ${escapeInviteHtml(label)}
      </a>
    </td>
  </tr>
</table>`;
}

function renderChefIntakeInviteEmailLayout({ preheader, bodyHtml }) {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Gradito</title>
</head>
<body style="margin:0;padding:0;background-color:${INVITE_EMAIL_BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeInviteHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${INVITE_EMAIL_BRAND.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:${INVITE_EMAIL_BRAND.white};border-radius:12px;overflow:hidden;border:1px solid ${INVITE_EMAIL_BRAND.border};">
          <tr>
            <td style="background-color:${INVITE_EMAIL_BRAND.navy};padding:28px 32px;text-align:center;">
              <img src="cid:gradito-logo" width="160" height="44" alt="Gradito" style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none;" />
              <p style="margin:8px 0 0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.75);">Chef roster</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid ${INVITE_EMAIL_BRAND.border};background-color:${INVITE_EMAIL_BRAND.bg};">
              <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:${INVITE_EMAIL_BRAND.muted};text-align:center;">
                &copy; ${year} Gradito. All rights reserved.
              </p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:${INVITE_EMAIL_BRAND.muted};text-align:center;">
                If you did not expect this email, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Plain invite copy → branded HTML (intake link becomes a CTA when present). */
export function invitePlainToProfessionalEmailHtml(plainText) {
  const intakeLink = getIntakeLink();
  let text = stripEmailOptOutFooter(plainText).replace(/^Gradito:\s*/i, '').trim();
  const linkAt = text.indexOf(intakeLink);

  let bodyHtml;
  let preheader = text.slice(0, 120);

  if (linkAt >= 0) {
    let lead = text.slice(0, linkAt).trim().replace(/:\s*$/, '');
    preheader = lead;
    bodyHtml = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${INVITE_EMAIL_BRAND.text};">${escapeInviteHtml(lead)}</p>
    ${renderInviteEmailCta('Complete your chef profile', intakeLink)}
    <p style="margin:0;font-size:13px;line-height:1.5;color:${INVITE_EMAIL_BRAND.muted};">
      If the button does not work, copy and paste this URL into your browser:<br />
      <a href="${escapeInviteHtml(intakeLink)}" style="color:${INVITE_EMAIL_BRAND.gold};word-break:break-all;">${escapeInviteHtml(intakeLink)}</a>
    </p>`;
  } else {
    const withBreaks = escapeInviteHtml(text).replace(/\n/g, '<br />');
    bodyHtml = `<p style="margin:0;font-size:15px;line-height:1.65;color:${INVITE_EMAIL_BRAND.text};">${withBreaks}</p>`;
  }

  return renderChefIntakeInviteEmailLayout({ preheader, bodyHtml });
}

/** @deprecated simple preview — use renderChefInviteEmailHtml */
export function plainInviteTextToHtml(text) {
  return invitePlainToProfessionalEmailHtml(text);
}

export function renderChefInviteEmailSubject(subjectTemplate, person) {
  return applyInviteVars(subjectTemplate || DEFAULT_CHEF_INTAKE_INVITE_EMAIL_SUBJECT, person);
}

export function renderChefInviteEmailPlain(bodyTemplate, person) {
  return applyInviteVars(bodyTemplate || DEFAULT_CHEF_INTAKE_INVITE_EMAIL_BODY, person);
}

export function renderChefInviteEmailHtml(bodyTemplate, person) {
  const plain = renderChefInviteEmailPlain(bodyTemplate, person);
  return invitePlainToProfessionalEmailHtml(plain);
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
  return loadInviteTextFromStorage(
    CHEF_INTAKE_INVITE_EMAIL_BODY_KEY,
    LEGACY_EMAIL_BODY_KEYS,
    DEFAULT_CHEF_INTAKE_INVITE_EMAIL_BODY,
    upgradeInviteEmailBody,
  );
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