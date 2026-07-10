export type CustomSmtpConfig = {
  id: string;
  smtp_host: string;
  smtp_port: number;
  encryption: 'tls' | 'ssl';
  username: string;
  password: string;
  from_name: string | null;
  from_email: string;
  is_active: boolean;
  last_tested_at: string | null;
  last_test_status: string | null;
  last_test_error: string | null;
};

const SMTP_TIMEOUT_MS = 15_000;

/** Deno Deploy (Supabase Edge) blocks outbound SMTP on these ports. */
const BLOCKED_EDGE_PORTS = new Set([25, 465, 587]);

export function getSmtpPortError(port: number): string | null {
  if (!BLOCKED_EDGE_PORTS.has(port)) return null;
  return (
    `SMTP port ${port} is not available from Supabase Edge Functions. ` +
    'Use a provider alternate port (e.g. AWS SES 2587, Mailgun 2525) or switch to Resend API for Gmail.'
  );
}

export async function sendCustomSmtpEmail(
  config: CustomSmtpConfig,
  params: { to: string; subject: string; html: string },
): Promise<void> {
  const portError = getSmtpPortError(config.smtp_port);
  if (portError) {
    throw new Error(portError);
  }

  const nodemailer = await import('npm:nodemailer@^6.9.16');

  const fromName = config.from_name?.trim() || 'Gradito';
  const fromEmail = config.from_email.trim();

  const transport = nodemailer.default.createTransport({
    host: config.smtp_host,
    port: config.smtp_port,
    // secure=true → implicit TLS (465); secure=false → STARTTLS (587 on supported ports)
    secure: config.encryption === 'ssl',
    auth: {
      user: config.username,
      pass: config.password,
    },
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
  });

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const sendPromise = transport.sendMail({
    from: `${fromName} <${fromEmail}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error('SMTP connection timed out. Check host, port, and encryption settings.')),
      SMTP_TIMEOUT_MS,
    );
  });

  try {
    await Promise.race([sendPromise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    transport.close();
  }
}
