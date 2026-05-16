import sgMail from "@sendgrid/mail";
import { env } from "../../config/env.js";

/**
 * Transactional email adapter — SendGrid.
 *
 * Falls back to a console log in dev when SENDGRID_API_KEY is unset so the
 * rest of the system keeps working (signups, password reset, booking
 * confirmation don't block on missing creds).
 *
 * Setup:
 *   1. Sign up at https://sendgrid.com (free tier: 100 emails/day forever)
 *   2. Set up sender authentication:
 *        Settings → Sender Authentication → Authenticate Your Domain
 *      Publish the CNAME records they give you at your DNS registrar.
 *      (Single Sender works for testing but Domain Authentication is needed
 *      for real production deliverability.)
 *   3. Create an API key at Settings → API Keys → "Restricted Access" with
 *      "Mail Send → Full Access". Copy the SG.… string.
 *   4. Put in backend/.env:
 *        SENDGRID_API_KEY=SG.…
 *        EMAIL_FROM=noreply@myglobalhealth.online
 *        PUBLIC_SITE_URL=https://myglobalhealth.online
 *   5. Restart the backend.
 *
 * Public interface (`sendEmail({ to, subject, html, text })`) is unchanged
 * from the previous adapter — callers stay portable across providers.
 */

let initialized = false;
function ensureInitialized() {
  if (!env.SENDGRID_API_KEY) return false;
  if (!initialized) {
    sgMail.setApiKey(env.SENDGRID_API_KEY);
    initialized = true;
  }
  return true;
}

export function isEmailConfigured(): boolean {
  return Boolean(env.SENDGRID_API_KEY && env.EMAIL_FROM);
}

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Override the default reply-to. */
  replyTo?: string;
};

export type SendEmailResult =
  | { ok: true; id: string | null; mode: "sendgrid" }
  | { ok: true; id: null; mode: "log"; reason: string }
  | { ok: false; mode: "sendgrid" | "log"; message: string };

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const from = env.EMAIL_FROM;
  const hasKey = ensureInitialized();

  if (!hasKey || !from) {
    // Dev fallback — log the message so password-reset tokens etc. are still
    // visible in development. Configure SendGrid keys for real delivery.
    // eslint-disable-next-line no-console
    console.log(
      "[email:log]",
      JSON.stringify(
        {
          to: input.to,
          subject: input.subject,
          replyTo: input.replyTo,
          text: input.text.slice(0, 500),
        },
        null,
        2,
      ),
    );
    return {
      ok: true,
      id: null,
      mode: "log",
      reason: hasKey
        ? "EMAIL_FROM missing — logged instead of sending"
        : "SENDGRID_API_KEY missing — logged instead of sending",
    };
  }

  try {
    const [response] = await sgMail.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    });
    // SendGrid returns the message id in the `x-message-id` response header.
    const headers = response.headers as Record<string, string | undefined> | undefined;
    const messageId = headers?.["x-message-id"] ?? null;
    return { ok: true, id: messageId, mode: "sendgrid" };
  } catch (error) {
    // SendGrid surfaces field-level errors via `error.response.body.errors[]`.
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

/**
 * Build an absolute URL using PUBLIC_SITE_URL (with safe fallback to dev
 * frontend origin). Used inside email templates so the link works wherever
 * the receiver opens it.
 */
export function absoluteSiteUrl(pathname: string): string {
  const base = env.PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") ?? "http://localhost:3000";
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${path}`;
}
