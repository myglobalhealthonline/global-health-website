import { createHash } from "node:crypto";
import { env } from "../../config/env.js";

/**
 * Meta Conversions API — server-side Purchase events for paid cart orders.
 *
 * Fires alongside (and deduped with, via a shared `event_id`) the browser
 * pixel's own Purchase — see `frontend/components/analytics/PurchaseTracker.tsx`.
 * Recovers the conversions ad blockers and Safari's ITP drop from the
 * browser-only pixel.
 *
 * Native fetch + AbortSignal.timeout, mirroring `lib/invoice-express/client.ts`.
 * On a non-2xx response this throws with a truncated body so the outbox
 * dispatcher records it and retries with backoff — never call this inline on
 * the payment-confirmation request path.
 *
 * Healthcare constraint: `custom_data` carries currency + value only — no
 * item names, no service/treatment info. Nothing here should ever be
 * extended with an `items`/`contents` field.
 */

const TIMEOUT_MS = 15_000;
const GRAPH_API_VERSION = "v21.0";

export function isMetaCapiConfigured(): boolean {
  return Boolean(env.META_CAPI_ACCESS_TOKEN?.trim() && env.META_PIXEL_ID?.trim());
}

/** Meta requires lowercase, trimmed, SHA-256 hex for hashed `user_data` fields. */
function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

/** E.164-ish digits only, no leading '+' — Meta's documented phone hashing input. */
function normalizePhone(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

export type MetaPurchaseInput = {
  /** Order id — becomes `event_id`, matching the browser pixel's eventID so Meta dedupes the two. */
  orderId: string;
  /** Unix seconds. Use the order's paidAt. */
  eventTime: number;
  valueMajorUnits: number;
  currency: string;
  email?: string | null;
  phone?: string | null;
  clientIp?: string | null;
  clientUserAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
};

export type MetaCapiEventPayload = {
  data: [
    {
      event_name: "Purchase";
      event_time: number;
      event_id: string;
      action_source: "website";
      user_data: Record<string, string | string[]>;
      custom_data: { currency: string; value: string };
    },
  ];
  test_event_code?: string;
};

/**
 * Pure payload builder — no network call — so hashing/shape logic is
 * unit-testable without a live token. Only includes `user_data` fields we
 * actually have; Meta accepts a sparse object.
 */
export function buildMetaPurchasePayload(input: MetaPurchaseInput): MetaCapiEventPayload {
  const userData: Record<string, string | string[]> = {};
  if (input.email) userData.em = [sha256(input.email)];
  if (input.phone) {
    const digits = normalizePhone(input.phone);
    if (digits) userData.ph = [sha256(digits)];
  }
  if (input.clientIp) userData.client_ip_address = input.clientIp;
  if (input.clientUserAgent) userData.client_user_agent = input.clientUserAgent;
  if (input.fbp) userData.fbp = input.fbp;
  if (input.fbc) userData.fbc = input.fbc;

  const payload: MetaCapiEventPayload = {
    data: [
      {
        event_name: "Purchase",
        event_time: input.eventTime,
        event_id: input.orderId,
        action_source: "website",
        user_data: userData,
        custom_data: {
          currency: input.currency,
          value: input.valueMajorUnits.toFixed(2),
        },
      },
    ],
  };
  if (env.META_TEST_EVENT_CODE?.trim()) payload.test_event_code = env.META_TEST_EVENT_CODE.trim();
  return payload;
}

function redact(url: string): string {
  return url.replace(/access_token=[^&]*/i, "access_token=***");
}

/** Sends the built payload to Meta. Throws on non-2xx with a truncated body. */
export async function sendMetaPurchaseEvent(input: MetaPurchaseInput): Promise<void> {
  const pixelId = env.META_PIXEL_ID?.trim() ?? "";
  const token = env.META_CAPI_ACCESS_TOKEN?.trim() ?? "";
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildMetaPurchasePayload(input)),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    const detail = text.trim().slice(0, 500);
    throw new Error(`Meta CAPI POST ${redact(url)} → ${res.status}${detail ? `: ${detail}` : ""}`);
  }
}
