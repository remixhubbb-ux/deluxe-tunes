import nodemailer from 'nodemailer';

export function createPasswordResetMailer(env = process.env, {createTransport = nodemailer.createTransport} = {}) {
  const host = String(env.SMTP_HOST || '').trim();
  const user = String(env.SMTP_USER || '').trim();
  const password = String(env.SMTP_PASS || '');
  const from = String(env.PASSWORD_RESET_FROM || user).trim();
  const port = Number(env.SMTP_PORT || 587);
  const baseUrl = String(env.PASSWORD_RESET_BASE_URL || env.APP_ORIGIN || '').trim();

  if (!host || !user || !password || !from || !Number.isInteger(port) || port < 1 || port > 65_535 || !baseUrl) {
    return null;
  }

  let resetBase;
  try {
    resetBase = new URL(baseUrl);
  } catch {
    throw new Error('PASSWORD_RESET_BASE_URL must be an absolute HTTP or HTTPS URL.');
  }
  if (!['http:', 'https:'].includes(resetBase.protocol)) {
    throw new Error('PASSWORD_RESET_BASE_URL must use HTTP or HTTPS.');
  }
  if (resetBase.username || resetBase.password) {
    throw new Error('PASSWORD_RESET_BASE_URL must not include credentials.');
  }
  if (resetBase.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(resetBase.hostname)) {
    throw new Error('PASSWORD_RESET_BASE_URL must use HTTPS outside localhost.');
  }
  resetBase.search = '';
  resetBase.hash = '';

  const transport = createTransport({
    host,
    port,
    secure: env.SMTP_SECURE === 'true' || port === 465,
    auth: {user, pass: password},
  });

  return {
    async sendPasswordReset({email, token}) {
      const resetUrl = new URL(resetBase);
      resetUrl.pathname = '/app.html';
      resetUrl.hash = new URLSearchParams({resetToken: token}).toString();
      const link = resetUrl.toString();
      await transport.sendMail({
        from,
        to: email,
        subject: 'Reset your Deluxe Tunes password',
        text: `We received a request to reset your Deluxe Tunes password. Use this link within 30 minutes:\n\n${link}\n\nIf you did not request a reset, you can ignore this email.`,
        html: `<p>We received a request to reset your Deluxe Tunes password.</p><p><a href="${link}">Reset your password</a></p><p>This link expires in 30 minutes. If you did not request a reset, you can ignore this email.</p>`,
      });
    },
  };
}
