import { env } from "../../config/env.js";
import {
  normalizePhoneForWhatsApp,
  type PhoneNormalizeHints,
} from "./normalize-phone.js";

const DEFAULT_SEND_URL = "https://wasenderapi.com/api/send-message";

/** Global minimum gap between WaSender API calls — no two messages may overlap. */
export const WHATSAPP_SEND_GAP_MS = 6000;

// Serialize the full send (wait + HTTP) so concurrent callers never overlap.
let sendChain: Promise<unknown> = Promise.resolve();
let lastAttemptAt = 0;

function gapMs(): number {
  const configured = env.WASENDER_GAP_MS ?? WHATSAPP_SEND_GAP_MS;
  return Math.max(WHATSAPP_SEND_GAP_MS, configured);
}

/**
 * Run one WhatsApp send at a time. Waits `gapMs()` since the previous attempt
 * finished (success or failure) before executing `fn`.
 */
async function withWhatsAppSendLock<T>(fn: () => Promise<T>): Promise<T> {
  const ms = gapMs();
  const job = sendChain.then(async () => {
    const elapsed = Date.now() - lastAttemptAt;
    if (elapsed < ms) {
      await new Promise((r) => setTimeout(r, ms - elapsed));
    }
    try {
      return await fn();
    } finally {
      lastAttemptAt = Date.now();
    }
  });
  sendChain = job.then(
    () => undefined,
    () => undefined,
  );
  return job;
}

function resolveSendUrl(): string {
  return env.WA_API_URL?.trim() || DEFAULT_SEND_URL;
}

function resolveAuthHeader(): string | null {
  const waAuth = env.WA_AUTH?.trim();
  if (waAuth) {
    return waAuth.toLowerCase().startsWith("bearer ") ? waAuth : `Bearer ${waAuth}`;
  }
  const legacy = env.WASENDER_API_TOKEN?.trim();
  if (legacy) {
    return legacy.toLowerCase().startsWith("bearer ") ? legacy : `Bearer ${legacy}`;
  }
  return null;
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(resolveAuthHeader());
}

/**
 * PR-6: a safe, non-identifying class for a WaSender HTTP failure.
 *
 * The provider echoes the recipient — and sometimes the message we just sent —
 * back inside its own error text, so that body is never the returned message.
 * The status code and the failure class are enough to triage, and neither is
 * personal data.
 */
function classifyWaSenderHttpError(httpStatus: number): string {
  if (httpStatus === 401 || httpStatus === 403) {
    return `WaSender rejected the credentials (HTTP ${httpStatus})`;
  }
  if (httpStatus === 429) return `WaSender rate limited (HTTP ${httpStatus})`;
  if (httpStatus >= 500) return `WaSender unavailable (HTTP ${httpStatus})`;
  return `WaSender rejected the request (HTTP ${httpStatus})`;
}

/**
 * PR-6: a stable class for a transport failure. The HTTP client's own message
 * can embed the whole request (recipient + message body), so only the errno is
 * kept — it names the failure without naming anyone.
 */
function classifyRequestError(err: unknown): string {
  const e = err as { name?: string; cause?: { code?: string } } | null;
  if (e?.name === "TimeoutError" || e?.name === "AbortError") {
    return "WaSender request timed out";
  }
  const code = e?.cause?.code;
  return code ? `WaSender request failed (${code})` : "WaSender request failed";
}

/**
 * The provider's own error text, extracted exactly as it used to be before
 * PR-6 — but INTERNAL ONLY. It can echo the recipient and the message body, so
 * it exists solely to feed `isRateLimitMessage` and is discarded immediately;
 * it is never returned, logged or persisted. Keeping the extraction identical
 * keeps the rate-limit retry firing in exactly the same cases as before.
 */
function waSenderErrorDetail(rawBody: string, httpStatus: number): string {
  const trimmed = rawBody.trim();
  if (!trimmed) return `WaSender HTTP ${httpStatus}`;
  try {
    const json = JSON.parse(trimmed) as { message?: string; error?: string };
    const detail = json.message || json.error;
    if (detail) return typeof detail === "string" ? detail : JSON.stringify(detail);
  } catch {
    // not JSON — the raw body is the detail
  }
  return trimmed;
}

/** Does the provider's reply mean "slow down"? Read internally only — the text
 *  it inspects is discarded, never returned or logged. */
function isRateLimitMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("5 seconds") ||
    lower.includes("6 seconds") ||
    lower.includes("account protection") ||
    lower.includes("rate limit")
  );
}

export type SendWhatsAppResult = {
  ok: boolean;
  skipped?: boolean;
  /**
   * Safe diagnostic text (PR-6). Never contains the recipient, the group JID,
   * the message body, a credential, or a provider body that could echo them —
   * it is persisted to `AutomationRun.error`, forwarded to `Outbox.lastError`
   * and ops alerts, written to application logs, and returned verbatim by
   * `POST /api/admin/invoices/:id/resend`.
   */
  message?: string;
  /**
   * Normalized E.164 recipient — the ONE deliberate recipient field, kept
   * because automation callers copy it into `AutomationRun.recipient`, a
   * dedicated column on a restricted admin table. It is never concatenated
   * into `message` nor emitted by `formatWhatsAppSendError`; do not log or
   * serialize the result object as a whole.
   */
  to?: string;
  /** ISO country the number was normalized against. Not personal data. */
  countryUsed?: string | null;
  /** Provider asked us to slow down — drives the single immediate retry. */
  rateLimited?: boolean;
};

/**
 * Diagnostic string for automation-run errors, `Outbox.lastError`, ops alerts,
 * application logs and admin API responses. PR-6: failure class and country
 * only — no recipient, no group JID, no message body.
 */
export function formatWhatsAppSendError(result: SendWhatsAppResult): string {
  const parts = [result.message ?? "WhatsApp send failed"];
  if (result.countryUsed) parts.push(`country=${result.countryUsed}`);
  return parts.join(" | ");
}

async function postWhatsAppMessage(
  auth: string,
  apiTo: string,
  message: string,
  meta: { to?: string; countryUsed?: string | null },
): Promise<SendWhatsAppResult> {
  const res = await fetch(resolveSendUrl(), {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to: apiTo, text: message }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    // Read to classify the rate limit, then dropped — see waSenderErrorDetail.
    const body = await res.text().catch(() => "");
    return {
      ok: false,
      message: classifyWaSenderHttpError(res.status),
      rateLimited: isRateLimitMessage(waSenderErrorDetail(body, res.status)),
      ...meta,
    };
  }
  return { ok: true, ...meta };
}

/**
 * Send a WhatsApp text straight to a group JID (e.g. `120363...@g.us`) —
 * no phone normalization, since group JIDs aren't phone numbers. Shares the
 * same send lock/queue as `sendWhatsAppText`.
 */
export async function sendWhatsAppGroupText(opts: {
  to: string;
  message: string;
}): Promise<SendWhatsAppResult> {
  const auth = resolveAuthHeader();
  if (!auth) {
    return { ok: true, skipped: true };
  }
  // The JID is the delivery address only — it is deliberately kept out of the
  // result, so no sink can pick it up (PR-6).
  const sendOnce = (): Promise<SendWhatsAppResult> =>
    withWhatsAppSendLock(() => postWhatsAppMessage(auth, opts.to, opts.message, {}));
  try {
    let result = await sendOnce();
    if (!result.ok && result.rateLimited) {
      result = await sendOnce();
    }
    return result;
  } catch (err) {
    return { ok: false, message: classifyRequestError(err) };
  }
}

/**
 * Send a WhatsApp text via WaSender. All sends share one global queue with a
 * 6-second minimum gap so doctor + patient messages never overlap.
 */
export async function sendWhatsAppText(opts: {
  to: string;
  message: string;
  /** @deprecated Prefer `hints.orderCountryCode`. */
  countryCode?: string | null;
  hints?: PhoneNormalizeHints;
  /**
   * PRIV-001 / S-026: consent gate for PATIENT-facing sends. Fail CLOSED — a
   * consent-gated send proceeds ONLY when this is explicitly `true`. Any
   * non-true value that is actually present (`false` OR `null`) is skipped, so
   * a nullable/absent consent field can never leak patient data.
   *
   * `undefined` (key omitted) is the explicit opt-OUT of the gate for sends
   * that are not consent-gated (doctor-facing notifications, staff numbers,
   * transactional corporate/invoice flows). Those callers omit the key and are
   * unaffected. Every caller-level consent guard should still stay in place;
   * this is defense-in-depth so a call site that forgets its own check can't
   * silently export patient data anyway.
   */
  patientConsent?: boolean | null;
}): Promise<SendWhatsAppResult> {
  if (opts.patientConsent === false || opts.patientConsent === null) {
    return { ok: true, skipped: true, message: "Skipped — no WhatsApp consent" };
  }
  const auth = resolveAuthHeader();
  if (!auth) {
    return { ok: true, skipped: true };
  }

  const hints: PhoneNormalizeHints = opts.hints ?? {
    orderCountryCode: opts.countryCode,
  };

  const normalized = normalizePhoneForWhatsApp(opts.to, hints);
  if (!normalized.e164 || !normalized.digits) {
    // PR-6: the rejected input IS the personal data — report the class, not it.
    return {
      ok: false,
      message: `Invalid WhatsApp recipient (country=${normalized.countryUsed ?? hints.orderCountryCode ?? "?"})`,
      countryUsed: normalized.countryUsed,
    };
  }

  const e164 = normalized.e164;
  const apiTo = normalized.digits;

  const sendOnce = (): Promise<SendWhatsAppResult> =>
    withWhatsAppSendLock(() =>
      postWhatsAppMessage(auth, apiTo, opts.message, {
        to: e164,
        countryUsed: normalized.countryUsed,
      }),
    );

  try {
    let result = await sendOnce();
    if (!result.ok && result.rateLimited) {
      result = await sendOnce();
    }
    return result;
  } catch (err) {
    const msg1 = classifyRequestError(err);
    // wait 10 s before first retry — longer than the 6 s lock gap
    await new Promise((r) => setTimeout(r, 10_000));
    try {
      const retry = await sendOnce();
      if (!retry.ok) {
        return {
          ...retry,
          message: `${retry.message ?? "WaSender failed"} (after retry: ${msg1})`,
        };
      }
      return retry;
    } catch (retryErr) {
      const msg2 = classifyRequestError(retryErr);
      // second retry after another 20 s
      await new Promise((r) => setTimeout(r, 20_000));
      try {
        const retry2 = await sendOnce();
        if (!retry2.ok) {
          return {
            ...retry2,
            message: `${retry2.message ?? "WaSender failed"} (after 2 retries: ${msg1}; ${msg2})`,
          };
        }
        return retry2;
      } catch (retry2Err) {
        const msg3 = classifyRequestError(retry2Err);
        return {
          ok: false,
          message: `${msg1}; retry1: ${msg2}; retry2: ${msg3}`,
          to: e164,
          countryUsed: normalized.countryUsed,
        };
      }
    }
  }
}
