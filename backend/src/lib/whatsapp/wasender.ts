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

function formatWaSenderError(rawBody: string, httpStatus: number): string {
  const trimmed = rawBody.trim();
  if (!trimmed) return `WaSender HTTP ${httpStatus}`;

  try {
    const json = JSON.parse(trimmed) as { message?: string; error?: string; success?: boolean };
    const detail = json.message || json.error;
    if (detail) {
      return typeof detail === "string" ? detail : JSON.stringify(detail);
    }
  } catch {
    // keep raw body
  }

  return trimmed.length > 500 ? `${trimmed.slice(0, 500)}…` : trimmed;
}

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
  message?: string;
  /** Normalized E.164 recipient (for logs). */
  to?: string;
  /** Digits-only recipient sent to WaSender. */
  apiTo?: string;
  raw?: string;
  countryUsed?: string | null;
};

/** Full diagnostic string for automation run logs. */
export function formatWhatsAppSendError(result: SendWhatsAppResult): string {
  const parts = [result.message ?? "WhatsApp send failed"];
  if (result.raw) parts.push(`raw=${result.raw}`);
  if (result.to) parts.push(`e164=${result.to}`);
  if (result.countryUsed) parts.push(`country=${result.countryUsed}`);
  return parts.join(" | ");
}

async function postWhatsAppMessage(
  auth: string,
  apiTo: string,
  message: string,
  e164: string,
  raw: string,
  countryUsed: string | null,
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
    const body = await res.text().catch(() => "");
    return {
      ok: false,
      message: formatWaSenderError(body, res.status),
      to: e164,
      apiTo,
      raw,
      countryUsed,
    };
  }
  return { ok: true, to: e164, apiTo, raw, countryUsed };
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
    return { ok: true, skipped: true, raw: opts.to };
  }
  const sendOnce = (): Promise<SendWhatsAppResult> =>
    withWhatsAppSendLock(() =>
      postWhatsAppMessage(auth, opts.to, opts.message, opts.to, opts.to, null),
    );
  try {
    let result = await sendOnce();
    if (!result.ok && result.message && isRateLimitMessage(result.message)) {
      result = await sendOnce();
    }
    return result;
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "WaSender request failed",
      raw: opts.to,
    };
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
    return { ok: true, skipped: true, raw: opts.to, message: "Skipped — no WhatsApp consent" };
  }
  const auth = resolveAuthHeader();
  if (!auth) {
    return { ok: true, skipped: true, raw: opts.to };
  }

  const hints: PhoneNormalizeHints = opts.hints ?? {
    orderCountryCode: opts.countryCode,
  };

  const normalized = normalizePhoneForWhatsApp(opts.to, hints);
  if (!normalized.e164 || !normalized.digits) {
    return {
      ok: false,
      message: `Invalid phone number (raw="${opts.to}", country=${normalized.countryUsed ?? hints.orderCountryCode ?? "?"})`,
      raw: opts.to,
      countryUsed: normalized.countryUsed,
    };
  }

  const e164 = normalized.e164;
  const apiTo = normalized.digits;

  const sendOnce = (): Promise<SendWhatsAppResult> =>
    withWhatsAppSendLock(() =>
      postWhatsAppMessage(auth, apiTo, opts.message, e164, opts.to, normalized.countryUsed),
    );

  function extractErrMessage(err: unknown): string {
    if (!(err instanceof Error)) return "WaSender request failed";
    const cause = (err as { cause?: { code?: string } }).cause;
    return cause?.code ? `${err.message} (${cause.code})` : err.message;
  }

  try {
    let result = await sendOnce();
    if (!result.ok && result.message && isRateLimitMessage(result.message)) {
      result = await sendOnce();
    }
    return result;
  } catch (err) {
    const msg1 = extractErrMessage(err);
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
      const msg2 = extractErrMessage(retryErr);
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
        const msg3 = extractErrMessage(retry2Err);
        return {
          ok: false,
          message: `${msg1}; retry1: ${msg2}; retry2: ${msg3}`,
          to: e164,
          apiTo,
          raw: opts.to,
          countryUsed: normalized.countryUsed,
        };
      }
    }
  }
}
