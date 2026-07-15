import nodemailer from 'npm:nodemailer@6.9.7';

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
  encrypted_password?: string | null;
  password_iv?: string | null;
  dek_version?: number | null;
};

const SMTP_TIMEOUT_MS = 15_000;

export function formatSmtpError(error: unknown, host: string): string {
  const message = error instanceof Error ? error.message : String(error);
  const isGmail = host.includes('gmail');

  if (
    isGmail &&
    (message.includes('535') ||
      message.includes('BadCredentials') ||
      message.includes('Username and Password not accepted'))
  ) {
    return 'Google rejected the SMTP password. Generate a new App Password at Google Account → Security → App passwords, then save and test again.';
  }

  return `SMTP connection failed: ${message}`;
}

function buildTransportConfig(config: CustomSmtpConfig) {
  const isTls = config.encryption === 'tls';
  const isSecure = config.encryption === 'ssl' || (isTls && config.smtp_port === 465);
  const requireTLS = isTls && config.smtp_port !== 465;

  return {
    host: config.smtp_host,
    port: config.smtp_port,
    secure: isSecure,
    requireTLS,
    auth: {
      user: config.username,
      pass: config.password,
    },
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
    ...(config.smtp_host.includes('gmail') && {
      service: 'gmail',
      tls: {
        rejectUnauthorized: false,
      },
    }),
  };
}

export async function sendCustomSmtpEmail(
  config: CustomSmtpConfig,
  params: { to: string; subject: string; html: string },
  options?: { verify?: boolean },
): Promise<void> {
  const transport = nodemailer.createTransport(buildTransportConfig(config));

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const run = async () => {
    if (options?.verify) {
      await transport.verify();
    }
    await transport.sendMail({
      from: `${config.from_name?.trim() || 'Gradito'} <${config.from_email.trim()}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
  };

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error('SMTP connection timed out. Check host, port, and encryption settings.')),
      SMTP_TIMEOUT_MS,
    );
  });

  try {
    await Promise.race([run(), timeoutPromise]);
  } catch (err) {
    throw new Error(formatSmtpError(err, config.smtp_host));
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    transport.close();
  }
}
