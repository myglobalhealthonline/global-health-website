import { env } from "../../config/env.js";
import {
  sendEmail,
  type SendEmailInput,
  type SendEmailResult,
} from "../../lib/email/send-email.js";

const DEFAULT_OFFICIAL_EMAIL = "globalhealth@myglobalhealth.online";

/** Inbox that receives a copy of every automation email for internal records. */
export function getAutomationOfficialEmail(): string {
  return env.AUTOMATION_OFFICIAL_EMAIL?.trim() || DEFAULT_OFFICIAL_EMAIL;
}

/**
 * Send to the primary recipient and duplicate to the official automation inbox
 * when it differs from the primary address.
 */
export async function sendAutomationEmail(
  input: SendEmailInput,
  opts?: { recordLabel?: string },
): Promise<SendEmailResult> {
  const primary = await sendEmail(input);

  const official = getAutomationOfficialEmail();
  if (official.toLowerCase() === input.to.trim().toLowerCase()) {
    return primary;
  }

  const prefix = opts?.recordLabel
    ? `[Record - ${opts.recordLabel}] `
    : "[Record] ";

  await sendEmail({
    ...input,
    to: official,
    subject: `${prefix}${input.subject}`,
  }).catch((err) => {
    // Primary delivery succeeded — log copy failure without failing the run.
    console.error("[automation-email] official copy failed", {
      recordLabel: opts?.recordLabel,
      err: err instanceof Error ? err.message : String(err),
    });
  });

  return primary;
}
