import sgMail from "@sendgrid/mail";
import { env } from "../../config/env.js";
import { isGmailConfigured, sendViaGmail } from "./gmail-send.js";
import { isSmtpConfigured, sendViaSmtp } from "./smtp-send.js";

/**
 * Transactional email — SMTP (preferred), Gmail API, or SendGrid, else dev
 * console log.
 *
 * SMTP is first because it is the only DMARC-aligned path for
 * myglobalhealth.online: the apex SPF record authorizes Migadu and Migadu's
 * DKIM keys are published, so both mechanisms align with the From domain. The
 * Gmail API signs as `…gappssmtp.com`, which authenticates but does not align.
 * See smtp-send.ts for the variables.
 *
 * Gmail setup (consultation document attachments, etc.):
 *   GMAIL_SEND_FROM=globalhealth@myglobalhealth.online
 *   GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / GMAIL_SEND_REFRESH_TOKEN
 *   (falls back to GOOGLE_OAUTH_REFRESH_TOKEN only if send token is unset)
 *   Send refresh token must include https://www.googleapis.com/auth/gmail.send
 *
 * SendGrid fallback:
 *   SENDGRID_API_KEY=SG.…
 *   EMAIL_FROM=noreply@myglobalhealth.online
 */

let sendGridInitialized = false;
function ensureSendGridInitialized() {
  if (!env.SENDGRID_API_KEY) return false;
  if (!sendGridInitialized) {
    sgMail.setApiKey(env.SENDGRID_API_KEY);
    sendGridInitialized = true;
  }
  return true;
}

export function isEmailConfigured(): boolean {
  return (
    isSmtpConfigured() ||
    isGmailConfigured() ||
    Boolean(env.SENDGRID_API_KEY && env.EMAIL_FROM)
  );
}

export type SendEmailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: SendEmailAttachment[];
};

export type SendEmailResult =
  | { ok: true; id: string | null; mode: "smtp" }
  | { ok: true; id: string | null; mode: "gmail" }
  | { ok: true; id: string | null; mode: "sendgrid" }
  | { ok: true; id: null; mode: "log"; reason: string }
  | { ok: false; mode: "smtp" | "gmail" | "sendgrid" | "log"; message: string };

/** Mask an email so logs never carry a full patient address. */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const head = local.slice(0, 1);
  return `${head}***@${domain}`;
}

function logEmailInstead(input: SendEmailInput, reason: string): SendEmailResult {
  // No email provider configured. Log only non-PII metadata — recipient is
  // masked and the body is NOT logged. Email bodies contain patient names,
  // reset links and appointment details that must not land in log streams.
  // eslint-disable-next-line no-console
  console.log(
    "[email:log]",
    JSON.stringify(
      {
        to: maskEmail(input.to),
        subject: input.subject,
        reason,
      },
      null,
      2,
    ),
  );
  return { ok: true, id: null, mode: "log", reason };
}

/** Test/preview hook: when set, emails are captured instead of sent. */
export let emailCaptureHook: ((input: SendEmailInput) => void) | null = null;
export function setEmailCaptureHook(hook: ((input: SendEmailInput) => void) | null): void {
  emailCaptureHook = hook;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (emailCaptureHook) {
    emailCaptureHook(input);
    return { ok: true, id: null, mode: "log", reason: "captured by test hook" };
  }
  if (isSmtpConfigured()) {
    const result = await sendViaSmtp(input);
    if (result.ok) {
      return { ok: true, id: result.id, mode: "smtp" };
    }
    return { ok: false, mode: "smtp", message: result.message };
  }

  if (isGmailConfigured()) {
    const result = await sendViaGmail(input);
    if (result.ok) {
      return { ok: true, id: result.id, mode: "gmail" };
    }
    return { ok: false, mode: "gmail", message: result.message };
  }

  const from = env.EMAIL_FROM;
  const hasSendGrid = ensureSendGridInitialized();

  if (!hasSendGrid || !from) {
    return logEmailInstead(
      input,
      hasSendGrid
        ? "EMAIL_FROM missing — logged instead of sending"
        : "No SMTP, Gmail or SendGrid configured — logged instead of sending",
    );
  }

  try {
    const [response] = await sgMail.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      ...(input.attachments?.length
        ? {
            attachments: input.attachments.map((a) => ({
              filename: a.filename,
              content: a.content.toString("base64"),
              type: a.contentType ?? "application/octet-stream",
              disposition: "attachment",
            })),
          }
        : {}),
    });
    const headers = response.headers as Record<string, string | undefined> | undefined;
    const messageId = headers?.["x-message-id"] ?? null;
    return { ok: true, id: messageId, mode: "sendgrid" };
  } catch (error) {
    const err = error as {
      message?: string;
      response?: { body?: { errors?: Array<{ message?: string }> } };
    };
    const detail =
      err.response?.body?.errors?.map((e) => e.message).filter(Boolean).join("; ") ||
      err.message ||
      "Email send failed";
    return { ok: false, mode: "sendgrid", message: detail };
  }
}

export function absoluteSiteUrl(pathname: string): string {
  const base = env.PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") ?? "http://localhost:3000";
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${path}`;
}
