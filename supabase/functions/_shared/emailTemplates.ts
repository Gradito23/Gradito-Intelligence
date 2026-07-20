const BRAND = {
  navy: '#1a2744',
  gold: '#c9a227',
  goldHover: '#b8921f',
  text: '#334155',
  muted: '#64748b',
  border: '#e2e8f0',
  bg: '#f8fafc',
  white: '#ffffff',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderLayout({
  preheader,
  bodyHtml,
}: {
  preheader: string;
  bodyHtml: string;
}): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Gradito Intelligence</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:${BRAND.white};border-radius:12px;overflow:hidden;border:1px solid ${BRAND.border};">
          <tr>
            <td style="background-color:${BRAND.navy};padding:28px 32px;text-align:center;">
              <p style="margin:0;font-size:28px;font-weight:700;letter-spacing:0.08em;color:${BRAND.white};font-family:Georgia,'Times New Roman',serif;">GRADITO</p>
              <p style="margin:8px 0 0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.75);">Intelligence</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid ${BRAND.border};background-color:${BRAND.bg};">
              <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:${BRAND.muted};text-align:center;">
                &copy; ${year} Gradito Intelligence. All rights reserved.
              </p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:${BRAND.muted};text-align:center;">
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

function renderCta(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr>
    <td align="center">
      <a href="${escapeHtml(url)}" style="display:inline-block;background-color:${BRAND.gold};color:${BRAND.white};text-decoration:none;font-size:15px;font-weight:600;padding:14px 28px;border-radius:8px;">
        ${escapeHtml(label)}
      </a>
    </td>
  </tr>
</table>`;
}

export function renderInviteEmail({
  recipientName,
  roleName,
  actionLink,
}: {
  recipientName?: string | null;
  roleName: string;
  actionLink: string;
}): string {
  const greeting = recipientName?.trim()
    ? `Hello ${escapeHtml(recipientName.trim())},`
    : 'Hello,';
  const roleLabel = escapeHtml(roleName.replace(/_/g, ' '));

  const bodyHtml = `
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${BRAND.navy};font-weight:600;">You're invited to Gradito Intelligence</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.text};">${greeting}</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.text};">
      You have been invited to join the platform as <strong style="color:${BRAND.navy};">${roleLabel}</strong>.
    </p>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:${BRAND.text};">
      Click the button below to accept your invitation and set your password.
    </p>
    ${renderCta('Accept invitation', actionLink)}
    <p style="margin:0;font-size:13px;line-height:1.5;color:${BRAND.muted};">
      This link expires for security. If the button does not work, copy and paste this URL into your browser:<br />
      <a href="${escapeHtml(actionLink)}" style="color:${BRAND.gold};word-break:break-all;">${escapeHtml(actionLink)}</a>
    </p>
  `;

  return renderLayout({
    preheader: `You've been invited to Gradito Intelligence as ${roleName.replace(/_/g, ' ')}.`,
    bodyHtml,
  });
}

export function renderPasswordResetEmail({
  recipientName,
  actionLink,
}: {
  recipientName?: string | null;
  actionLink: string;
}): string {
  const greeting = recipientName?.trim()
    ? `Hello ${escapeHtml(recipientName.trim())},`
    : 'Hello,';

  const bodyHtml = `
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${BRAND.navy};font-weight:600;">Reset your password</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.text};">${greeting}</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.text};">
      We received a request to reset your Gradito Intelligence password. Click the button below to choose a new one.
    </p>
    ${renderCta('Reset password', actionLink)}
    <p style="margin:0;font-size:13px;line-height:1.5;color:${BRAND.muted};">
      This link expires for security. If you did not request a password reset, you can safely ignore this email.<br /><br />
      If the button does not work, copy and paste this URL into your browser:<br />
      <a href="${escapeHtml(actionLink)}" style="color:${BRAND.gold};word-break:break-all;">${escapeHtml(actionLink)}</a>
    </p>
  `;

  return renderLayout({
    preheader: 'Reset your Gradito Intelligence password.',
    bodyHtml,
  });
}

export function renderNotificationEmail({
  title,
  bodyHtml,
  ctaLabel,
  ctaUrl,
}: {
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): string {
  const cta = ctaLabel && ctaUrl ? renderCta(ctaLabel, ctaUrl) : '';
  const content = `
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${BRAND.navy};font-weight:600;">${escapeHtml(title)}</h1>
    <div style="font-size:15px;line-height:1.6;color:${BRAND.text};">${bodyHtml}</div>
    ${cta}
  `;
  return renderLayout({ preheader: title, bodyHtml: content });
}

export function renderTestEmail(): string {
  return renderNotificationEmail({
    title: 'Email integration test',
    bodyHtml: `<p style="margin:0;">Your Gradito email integration is configured correctly. This is a test message from the platform.</p>`,
  });
}
