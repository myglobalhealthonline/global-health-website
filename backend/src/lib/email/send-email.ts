import { Resend } from "resend";
import { env } from "../../config/env.js";

/**
 * Transactional email adapter. Resend in production; falls back to a console
 * log in dev when RESEND_API_KEY is unset so the rest of the system keeps
 * working (signups, password reset etc. don't block on missing creds).
 *
 * Usage:
 *   await sendEmail({
 *     to: "user@example.com",
 *     subject: "Verify your email",
 *     html: "<p>Click <a href=…>here</a></p>",
 *     text: "Click here: …",
 *   });
 *
 * To enable real delivery:
 *   1. Sign up at resend.com, verify your sender domain
 *   2. Set RESEND_API_KEY=re_… in backend/.env
 *   3. Set EMAIL_FROM=noreply@yourdomain.com
 *   4. Set PUBLIC_SITE_URL=https://… (used to build verification links)
 *   Restart the backend dev server.
 */

let cachedClient: Resend | null = null;
function getClient(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!cachedClient) cachedClient = new Resend(env.RESEND_API_KEY);
  return cachedClient;
}

export function isEmailConfigured(): boolean {
  return Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
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
  | { ok: true; id: string; mode: "resend" }
  | { ok: true; id: null; mode: "log"; reason: string }
  | { ok: false; mode: "resend" | "log"; message: string };

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const from = env.EMAIL_FROM;
  const client = getClient();

  if (!client || !from) {
    // Dev fallback — log the message so password-reset tokens etc. are still
    // visible in development. Configure Resend keys for real delivery.
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
      reason: from
        ? "RESEND_API_KEY missing — logged instead of sending"
        : "EMAIL_FROM missing — logged instead of sending",
    };
  }

  try {
    const result = await client.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    });
    if (result.error) {
      return { ok: false, mode: "resend", message: result.error.message };
    }
    return { ok: true, id: result.data?.id ?? "unknown", mode: "resend" };
  } catch (error) {
    return {
      ok: false,
      mode: "resend",
      message: error instanceof Error ? error.message : "Email send failed",
    };
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
