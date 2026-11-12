import nodemailer from 'nodemailer';

// Outgoing email through any SMTP provider, configured ONLY by environment variables
// (see server/.env.example and the README). Nothing here is hard-coded.
//
//   SMTP_HOST     e.g. smtp.gmail.com, smtp-relay.brevo.com, smtp.mailgun.org
//   SMTP_PORT     465 (implicit TLS) or 587 (STARTTLS). Default 587.
//   SMTP_SECURE   "true" for port 465. Default: true when SMTP_PORT is 465, false otherwise.
//   SMTP_USER     the SMTP login (for Gmail: your Gmail address)
//   SMTP_PASS     the SMTP password (for Gmail: a 16-character App Password, not your Google password)
//   MAIL_FROM     the sender shown to recipients, e.g. "DevPress <you@gmail.com>". Default: SMTP_USER.

let transporter = null;

export function isMailConfigured() {
  return Boolean(process.env.SMTP_HOST && (process.env.MAIL_FROM || process.env.SMTP_USER));
}

function getTransporter() {
  if (transporter) return transporter;
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    // Some local relays need no login; every hosted provider does.
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    // Fail in seconds instead of hanging a background send for minutes.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return transporter;
}

// Sends one message. Throws if the provider rejects it (callers decide what to log).
export async function sendMail({ to, subject, text, html }) {
  if (!isMailConfigured()) throw new Error('Email is not configured (SMTP_HOST and MAIL_FROM or SMTP_USER are required)');
  return getTransporter().sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text, html });
}
