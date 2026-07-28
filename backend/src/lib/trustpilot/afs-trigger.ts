import { env } from "../../config/env.js";
import { sendEmail } from "../email/send-email.js";

/**
 * Trustpilot Automatic Feedback Service (AFS) — trigger-only integration.
 *
 * Trustpilot's Free plan has no API. The supported free mechanism is AFS: a
 * mail arrives at the account's `…@invite.trustpilot.com` address, Trustpilot
 * reads the customer's details out of it, and Trustpilot then emails that
 * customer its own review invitation.
 *
 * The usual way to feed AFS is to BCC that address on an email you are
 * already sending the customer, letting Trustpilot parse the `To:` header. We
 * deliberately do NOT do that: it would mean the patient receives two emails,
 * and it would ship Trustpilot a full copy of a clinical message. Instead we
 * send a dedicated trigger addressed straight TO the AFS address, carrying
 * nothing but the structured data snippet below. The patient receives exactly
 * one email — Trustpilot's.
 *
 * Because the `To:` header is Trustpilot's own address here, the snippet is
 * the ONLY place the patient's identity exists. Trustpilot documents that
 * snippet data takes priority over every value on the AFS settings page, so
 * it is also the authoritative source for the recipient and reference.
 *
 * PRIVACY: everything in this message goes to Trustpilot. It carries the
 * patient's first name, email, our appointment id and the invitation
 * language, and nothing else. No doctor name, no service, no appointment
 * date, no clinical wording. Do not add fields here without checking that —
 * `tags` in particular would leak the doctor if used naively.
 *
 * Fields Trustpilot accepts that we deliberately skip: `templateId` (account
 * default is fine), `preferredSendTime` (Pro/Enterprise only — our 24h delay
 * is enforced on our side instead), `tags`, `senderEmail`, `senderName`,
 * `replyTo`.
 */

/** The script type Trustpilot's AFS parser scans each trigger email for. */
const SNIPPET_MIME_TYPE = "application/json+trustpilot";

/**
 * Our locale codes → the ISO 15897 tags Trustpilot expects. Sets both the
 * language of the invitation email and the review landing page. Anything
 * unmapped is omitted, falling back to the account default rather than
 * risking a value Trustpilot rejects.
 */
const TRUSTPILOT_LOCALES: Record<string, string> = {
  en: "en-GB",
  "en-gb": "en-GB",
  "en-ie": "en-GB",
  "en-us": "en-US",
  pt: "pt-PT",
  "pt-pt": "pt-PT",
  "pt-br": "pt-BR",
  cs: "cs-CZ",
  "cs-cz": "cs-CZ",
  de: "de-DE",
  es: "es-ES",
  ro: "ro-RO",
};

export function toTrustpilotLocale(localeCode: string | null | undefined): string | undefined {
  if (!localeCode) return undefined;
  return TRUSTPILOT_LOCALES[localeCode.trim().toLowerCase()];
}

export type TrustpilotAfsTrigger = {
  /** Patient email — the address Trustpilot will invite. */
  customerEmail: string;
  /** Display name for Trustpilot's invitation. First name is enough. */
  customerName: string;
  /** Our appointment id. Trustpilot stores it against the review, which is
   *  the only per-patient attribution the Free plan gives us. */
  referenceId: string;
  /** Invitation language, already mapped by `toTrustpilotLocale`. Omitted
   *  when we can't map it confidently. */
  locale?: string;
};

export function isTrustpilotAfsConfigured(): boolean {
  return Boolean(env.TRUSTPILOT_AFS_TRIGGER_EMAIL);
}

/**
 * The snippet's payload sits inside a <script> block, so it is JSON — not
 * HTML. JSON.stringify handles quotes and backslashes but leaves `<` alone,
 * and a literal `</script>` inside a patient's name would close the block
 * early and hand Trustpilot a truncated document. Escaping `<` to its <
 * form is invisible to any JSON parser and makes that impossible.
 */
function toScriptSafeJson(payload: Record<string, string>): string {
  return JSON.stringify(payload, null, 2).replace(/</g, "\\u003c");
}

/**
 * Build the structured data snippet AFS parses out of the trigger email.
 * Trustpilot reads it from the message source; a <script> block renders
 * nothing, so it needs no hiding.
 */
export function buildTrustpilotAfsSnippet(trigger: TrustpilotAfsTrigger): string {
  const payload: Record<string, string> = {
    recipientName: trigger.customerName,
    recipientEmail: trigger.customerEmail,
    referenceId: trigger.referenceId,
  };
  if (trigger.locale) payload.locale = trigger.locale;

  return [`<script type="${SNIPPET_MIME_TYPE}">`, toScriptSafeJson(payload), "</script>"].join(
    "\n",
  );
}

export type TrustpilotAfsResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Ask Trustpilot to invite one patient. Returns a result rather than throwing
 * so the caller can record the failure on the invite row and retry later.
 *
 * Note this reaches for `sendEmail` directly, not `sendAutomationEmail` — the
 * automation wrapper copies every message to the internal records inbox, and
 * a duplicate of an ingest trigger there is noise at best and a second
 * invitation at worst.
 */
export async function sendTrustpilotAfsTrigger(
  trigger: TrustpilotAfsTrigger,
): Promise<TrustpilotAfsResult> {
  const to = env.TRUSTPILOT_AFS_TRIGGER_EMAIL;
  if (!to) {
    return { ok: false, message: "TRUSTPILOT_AFS_TRIGGER_EMAIL is not configured" };
  }

  const snippet = buildTrustpilotAfsSnippet(trigger);
  const result = await sendEmail({
    to,
    // Subject and body are for Trustpilot's ingest only — the patient never
    // sees this message, so it stays free of branding and clinical content.
    subject: `Review invitation trigger ${trigger.referenceId}`,
    text: [
      `email: ${trigger.customerEmail}`,
      `name: ${trigger.customerName}`,
      `reference: ${trigger.referenceId}`,
    ].join("\n"),
    html: `<html><body>\n${snippet}\n<p>Review invitation trigger.</p>\n</body></html>`,
  });

  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  // No provider configured — sendEmail logged instead of sending, so
  // Trustpilot got nothing. Surface it as a failure so the row retries once
  // email is configured rather than silently counting as invited.
  if (result.mode === "log") {
    return { ok: false, message: `Email provider not configured (${result.reason})` };
  }
  return { ok: true };
}
