import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../../config/env.js";
import type { SendEmailInput } from "./send-email.js";

/**
 * SMTP sender — the DMARC-aligned path for myglobalhealth.online.
 *
 * The apex SPF record authorizes Migadu only (`v=spf1 include:spf.migadu.com
 * -all`) and the `key1/key2/key3._domainkey` CNAMEs publish Migadu's DKIM keys,
 * so mail sent through Migadu as `SMTP_FROM` aligns on both SPF and DKIM. The
 * Gmail API path signs as `…gappssmtp.com` instead, which authenticates but does
 * NOT align with the From domain — that is why automation email fails DMARC.
 *
 * Setup:
 *   SMTP_HOST=smtp.migadu.com
 *   SMTP_PORT=465            (implicit TLS; 587 switches to STARTTLS)
 *   SMTP_USER=globalhealth@myglobalhealth.online
 *   SMTP_PASSWORD=…
 *   SMTP_FROM="Global Health <globalhealth@myglobalhealth.online>"
 *
 * SMTP_FROM's address must belong to the authenticated mailbox's domain or the
 * envelope sender stops matching the SPF record and alignment is lost again.
 */

export function isSmtpConfigured(): boolean {
  return Boolean(
    env.SMTP_HOST?.trim() &&
      env.SMTP_USER?.trim() &&
      env.SMTP_PASSWORD?.trim() &&
      smtpFrom(),
  );
}

/** From header — falls back to the authenticated mailbox when SMTP_FROM is unset. */
function smtpFrom(): string | undefined {
  return env.SMTP_FROM?.trim() || env.SMTP_USER?.trim() || undefined;
}

/** Bare address out of `Name <addr@host>`, used for the SMTP envelope sender. */
function envelopeAddress(from: string): string {
  const match = /<([^>]+)>/.exec(from);
  return (match ? match[1] : from).trim();
}

let transporter: Transporter | null = null;

/**
 * One pooled transporter for the process. Without pooling every email opens a
 * fresh TLS connection, and Migadu counts connections as well as messages —
 * a reminder sweep would trip the per-hour connection cap long before the
 * message cap. maxMessages recycles a connection periodically so a stale socket
 * can never wedge the pool.
 */
function getTransporter(): Transporter {
  if (transporter) return transporter;

  const port = env.SMTP_PORT ?? 465;
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST!.trim(),
    port,
    // 465 is implicit TLS. Any other port starts plaintext and upgrades, which
    // `requireTLS` makes mandatory rather than opportunistic — an SMTP server
    // that fails to offer STARTTLS must abort, not silently send in the clear.
    secure: port === 465,
    requireTLS: port !== 465,
    auth: {
      user: env.SMTP_USER!.trim(),
      pass: env.SMTP_PASSWORD!,
    },
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
    // Ceiling of 20 messages/sec across the pool. Bulk sends (invite blasts,
    // credential mailouts) still pace themselves at the script level; this only
    // stops a burst of concurrent webhooks from hammering the relay.
    rateDelta: 1000,
    rateLimit: 20,
  });

  return transporter;
}

/** Drop the pooled connections — for graceful shutdown and tests. */
export function closeSmtpTransport(): void {
  transporter?.close();
  transporter = null;
}

export type SmtpSendResult =
  | { ok: true; id: string | null }
  | { ok: false; message: string };

export async function sendViaSmtp(input: SendEmailInput): Promise<SmtpSendResult> {
  const from = smtpFrom()!;
  try {
    const info = await getTransporter().sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      ...(input.attachments?.length
        ? {
            attachments: input.attachments.map((a) => ({
              filename: a.filename,
              content: a.content,
              contentType: a.contentType ?? "application/octet-stream",
            })),
          }
        : {}),
      // Pin the envelope sender to the authenticated mailbox. Nodemailer would
      // otherwise derive it from the From header including the display name,
      // and SPF is evaluated against the envelope, not the header.
      envelope: {
        from: envelopeAddress(from),
        to: input.to,
      },
    });

    // A message accepted by the relay but rejected for every recipient is not a
    // send — surface it as a failure instead of a silent success.
    if (info.accepted?.length === 0 && info.rejected?.length) {
      return { ok: false, message: `SMTP rejected recipient: ${info.rejected.join(", ")}` };
    }

    return { ok: true, id: info.messageId ?? null };
  } catch (error) {
    const err = error as { message?: string; response?: string; code?: string };
    const message =
      [err.code, err.response || err.message].filter(Boolean).join(" ") || "SMTP send failed";
    return { ok: false, message };
  }
}
