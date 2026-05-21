import { env } from "../../config/env.js";

const API_BASE = "https://wasenderapi.com/api";

let lastSentAt = 0;

async function gap() {
  const ms = env.WASENDER_GAP_MS ?? 5500;
  const elapsed = Date.now() - lastSentAt;
  if (elapsed < ms) {
    await new Promise((r) => setTimeout(r, ms - elapsed));
  }
  lastSentAt = Date.now();
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
  const to = opts.to.replace(/\D/g, "");
  if (!to) {
    return { ok: false, message: "Invalid phone number" };
  }
  await gap();
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
