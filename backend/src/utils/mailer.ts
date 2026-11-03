import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

// Created on first use, so .env is already loaded
const getTransporter = (): Transporter => {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP settings are missing in .env");
  }

  const port = Number(SMTP_PORT) || 465;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465, // 465 = SSL, 587 = STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return transporter;
};

export const sendEmail = async (to: string, subject: string, html: string, text: string) => {
  await getTransporter().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
    text, 
  });
};