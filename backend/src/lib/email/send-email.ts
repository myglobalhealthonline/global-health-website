import sgMail from "@sendgrid/mail";
import { env } from "../../config/env.js";
import { isGmailConfigured, sendViaGmail } from "./gmail-send.js";

/**
 * Transactional email — Gmail API (preferred) or SendGrid, else dev console log.
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
    isGmailConfigured() || Boolean(env.SENDGRID_API_KEY && env.EMAIL_FROM)
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
  | { ok: true; id: string | null; mode: "gmail" }
  | { ok: true; id: string | null; mode: "sendgrid" }
  | { ok: true; id: null; mode: "log"; reason: string }
  | { ok: false; mode: "gmail" | "sendgrid" | "log"; message: string };

function logEmailInstead(input: SendEmailInput, reason: string): SendEmailResult {
  // eslint-disable-next-line no-console
  console.log(
    "[email:log]",
    JSON.stringify(
      {
        to: input.to,
        subject: input.subject,
        replyTo: input.replyTo,
        text: input.text.slice(0, 500),
        reason,
      },
      null,
      2,
    ),
  );
  return { ok: true, id: null, mode: "log", reason };
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
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
        : "No Gmail or SendGrid configured — logged instead of sending",
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
