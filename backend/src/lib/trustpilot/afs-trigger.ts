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
 * The usual way to feed AFS is to BCC the address on an email you are already
 * sending the customer. We deliberately do NOT do that: it would mean the
 * patient receives two emails, and it would ship Trustpilot a full copy of a
 * clinical email. Instead we send a dedicated trigger message addressed
 * straight TO the AFS address, carrying nothing but the structured block
 * below. The patient receives exactly one email — Trustpilot's.
 *
 * PRIVACY: everything in this message goes to Trustpilot. It carries the
 * patient's name, email and our appointment id, and nothing else. No doctor
 * name, no service, no appointment date, no clinical wording. Do not add
 * fields here without checking that.
 *
 * ┌─ VERIFY BEFORE ENABLING ────────────────────────────────────────────────┐
 * │ The exact field names in the structured block are dictated by           │
 * │ Trustpilot and are shown in the dashboard under the AFS setup step      │
 * │ ("if you can't use BCC, use this structured data snippet"). If they     │
 * │ differ from the constants below, Trustpilot ignores the message and     │
 * │ nothing appears in Invitation history. Change SNIPPET_IDS only — the    │
 * │ rest of the pipeline is independent of the wire format.                 │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

/** Field ids Trustpilot's AFS parser looks for inside the structured block. */
const SNIPPET_IDS = {
  email: "trustpilot-email",
  name: "trustpilot-name",
  reference: "trustpilot-ref",
} as const;

export type TrustpilotAfsTrigger = {
  /** Patient email — the address Trustpilot will invite. */
  customerEmail: string;
  /** Display name for Trustpilot's invitation. First name is enough. */
  customerName: string;
  /** Our appointment id. Trustpilot echoes it back on the review, which is
   *  the only per-patient attribution the Free plan gives us. */
  referenceId: string;
};

export function isTrustpilotAfsConfigured(): boolean {
  return Boolean(env.TRUSTPILOT_AFS_TRIGGER_EMAIL);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * The structured block AFS parses. Rendered hidden — the only human who could
 * ever see this message is whoever reads the Trustpilot ingest mailbox, but
 * keeping it hidden matches Trustpilot's documented snippet.
 */
export function buildTrustpilotAfsSnippet(trigger: TrustpilotAfsTrigger): string {
  return [
    '<div style="display:none">',
    `  <span id="${SNIPPET_IDS.email}">${escapeHtml(trigger.customerEmail)}</span>`,
    `  <span id="${SNIPPET_IDS.name}">${escapeHtml(trigger.customerName)}</span>`,
    `  <span id="${SNIPPET_IDS.reference}">${escapeHtml(trigger.referenceId)}</span>`,
    "</div>",
  ].join("\n");
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
    html: `${snippet}\n<p>Review invitation trigger.</p>`,
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
