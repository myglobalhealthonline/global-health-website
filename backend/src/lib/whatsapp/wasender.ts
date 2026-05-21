import { env } from "../../config/env.js";

const API_BASE = "https://wasenderapi.com/api";

// Serialize WaSender calls so concurrent senders don't all read the same
// lastSentAt and fire at once. Each caller awaits a shared promise chain
// that enforces the configured gap between actual sends.
let chainTail: Promise<void> = Promise.resolve();
let lastSentAt = 0;

function nextGapSlot(): Promise<void> {
  const ms = env.WASENDER_GAP_MS ?? 5500;
  const slot = chainTail.then(async () => {
    const elapsed = Date.now() - lastSentAt;
    if (elapsed < ms) {
      await new Promise((r) => setTimeout(r, ms - elapsed));
    }
    lastSentAt = Date.now();
  });
  chainTail = slot.catch(() => {});
  return slot;
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(env.WASENDER_API_TOKEN?.trim());
}

/**
 * Send a WhatsApp text via WaSender. No-op when WASENDER_API_TOKEN is unset.
 */
export async function sendWhatsAppText(opts: {
  to: string;
  message: string;
}): Promise<{ ok: boolean; skipped?: boolean; message?: string }> {
  const token = env.WASENDER_API_TOKEN?.trim();
  if (!token) {
    return { ok: true, skipped: true };
  }
  // Strip everything except digits and leading +. WaSender accepts E.164.
  const trimmed = opts.to.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  const digits = trimmed.replace(/\D/g, "");
  const to = digits ? `${plus}${digits}` : "";
  if (!to) {
    return { ok: false, message: "Invalid phone number" };
  }
  await nextGapSlot();
  try {
    const res = await fetch(`${API_BASE}/send-message`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to, text: opts.message }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, message: body || `WaSender HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "WaSender request failed",
    };
  }
}
