import "server-only";

import { cookies } from "next/headers";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import type { Cart, OrderDetail, OrderListItem } from "./cart-types";
import type { AdminOrderRow } from "@/app/(portal)/(admin)/admin/orders/_components/admin-orders-table";

// H22: validate the admin-orders response at the boundary instead of casting
// `unknown[]` straight to AdminOrderRow[]. A backend shape change now surfaces
// as a handled error rather than a runtime crash deep in the table component.
// Hand-rolled guard (frontend has no zod dependency).
function isAdminOrderRow(v: unknown): v is AdminOrderRow {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.status === "string" &&
    typeof o.paymentStatus === "string" &&
    typeof o.email === "string" &&
    typeof o.fullName === "string" &&
    typeof o.countryCode === "string" &&
    typeof o.currencyCode === "string" &&
    typeof o.bookingSource === "string" &&
    typeof o.isFirstOrder === "boolean" &&
    typeof o.totalCents === "number" &&
    typeof o.itemCount === "number" &&
    (o.meetingUrl === null || typeof o.meetingUrl === "string") &&
    typeof o.hasConsultation === "boolean" &&
    (o.invoiceId === null || o.invoiceId === undefined || typeof o.invoiceId === "string") &&
    (o.stripeCheckoutUrl === null || o.stripeCheckoutUrl === undefined || typeof o.stripeCheckoutUrl === "string") &&
    (o.paidAt === null || typeof o.paidAt === "string") &&
    typeof o.createdAt === "string"
  );
}

type Result<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; status?: number };

async function cookieHeader(): Promise<string> {
  const store = await cookies();
  return store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

export async function fetchCart(): Promise<Result<Cart>> {
  const backend = getBackendOrigin();
  if (!backend) return { ok: false, message: "Backend not configured" };
  try {
    const res = await fetch(`${backend}/api/cart`, {
      headers: { cookie: await cookieHeader() },
      cache: "no-store",
    });
    const json = (await res.json()) as { ok?: boolean; data?: Cart; message?: string };
    if (!res.ok || !json.ok || !json.data) {
      return { ok: false, status: res.status, message: json.message ?? "Failed" };
    }
    return { ok: true, data: json.data };
  } catch {
    return { ok: false, message: "Backend unavailable" };
  }
}

export async function fetchAccountOrders(): Promise<Result<{ items: OrderListItem[] }>> {
  const backend = getBackendOrigin();
  if (!backend) return { ok: false, message: "Backend not configured" };
  try {
    const res = await fetch(`${backend}/api/account/orders`, {
      headers: { cookie: await cookieHeader() },
      cache: "no-store",
    });
    const json = (await res.json()) as {
      ok?: boolean;
      data?: { items: OrderListItem[] };
      message?: string;
    };
    if (!res.ok || !json.ok || !json.data) {
      return { ok: false, status: res.status, message: json.message ?? "Failed" };
    }
    return { ok: true, data: json.data };
  } catch {
    return { ok: false, message: "Backend unavailable" };
  }
}

export async function fetchAccountOrder(id: string): Promise<Result<OrderDetail>> {
  const backend = getBackendOrigin();
  if (!backend) return { ok: false, message: "Backend not configured" };
  try {
    const res = await fetch(`${backend}/api/account/orders/${id}`, {
      headers: { cookie: await cookieHeader() },
      cache: "no-store",
    });
    const json = (await res.json()) as {
      ok?: boolean;
      data?: OrderDetail;
      message?: string;
    };
    if (!res.ok || !json.ok || !json.data) {
      return { ok: false, status: res.status, message: json.message ?? "Failed" };
    }
    return { ok: true, data: json.data };
  } catch {
    return { ok: false, message: "Backend unavailable" };
  }
}

export type OrderReceipt = {
  id: string;
  status: string;
  paymentStatus: string;
  currencyCode: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  items: { id: string; kind: string; name: string; quantity: number; lineTotalCents: number }[];
  paidAt: string | null;
  createdAt: string;
};

/**
 * Public receipt fetch — keyed on the unguessable order CUID, no
 * authentication. Used by the post-Stripe success page so guest
 * checkouts (userId: null) still see their line items + total.
 */
export async function fetchOrderReceipt(id: string): Promise<Result<OrderReceipt>> {
  const backend = getBackendOrigin();
  if (!backend) return { ok: false, message: "Backend not configured" };
  try {
    const res = await fetch(`${backend}/api/orders/${id}/receipt`, {
      cache: "no-store",
    });
    const json = (await res.json()) as {
      ok?: boolean;
      data?: OrderReceipt;
      message?: string;
    };
    if (!res.ok || !json.ok || !json.data) {
      return { ok: false, status: res.status, message: json.message ?? "Failed" };
    }
    return { ok: true, data: json.data };
  } catch {
    return { ok: false, message: "Backend unavailable" };
  }
}

/** Server-side fallback when Stripe webhook did not reach the backend. */
export async function syncOrderPaymentServer(input: {
  orderId?: string;
  stripeSessionId?: string;
  source?: string;
}): Promise<{ ok: boolean; code?: string }> {
  const backend = getBackendOrigin();
  if (!backend) return { ok: false };
  const payload =
    input.orderId?.trim()
      ? { orderId: input.orderId.trim() }
      : input.stripeSessionId?.trim()
        ? { stripeSessionId: input.stripeSessionId.trim() }
        : null;
  if (!payload) return { ok: false };

  try {
    const res = await fetch(`${backend}/api/payments/sync-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const json = (await res.json()) as {
      ok?: boolean;
      data?: { ok?: boolean; code?: string };
    };
    const ok = Boolean(res.ok && json.ok && json.data?.ok);
    if (!ok) return { ok: false, code: json.data?.code };
    return { ok: true, code: json.data?.code };
  } catch {
    return { ok: false };
  }
}

/** Server-side filters forwarded verbatim to `GET /api/admin/orders`. */
export type AdminOrderFilters = {
  /** Free text — order number, order id, patient name, email, phone, doctor. */
  q?: string;
  status?: string;
  paymentStatus?: string;
  countryCode?: string;
  doctorName?: string;
  createdFrom?: string;
  createdTo?: string;
  consultFrom?: string;
  consultTo?: string;
};

export async function fetchAdminOrders(
  cursor?: string,
  filters: AdminOrderFilters = {},
): Promise<Result<{ items: AdminOrderRow[]; nextCursor: string | null }>> {
  const backend = getBackendOrigin();
  if (!backend) return { ok: false, message: "Backend not configured" };
  try {
    const qs = new URLSearchParams({ limit: "50" });
    if (cursor) qs.set("cursor", cursor);
    for (const [key, value] of Object.entries(filters)) {
      const trimmed = value?.trim();
      if (trimmed) qs.set(key, trimmed);
    }
    const res = await fetch(`${backend}/api/admin/orders?${qs.toString()}`, {
      headers: { cookie: await cookieHeader() },
      cache: "no-store",
    });
    const json: unknown = await res.json();
    const obj = (typeof json === "object" && json !== null ? json : {}) as {
      ok?: unknown;
      data?: { items?: unknown; nextCursor?: unknown };
      message?: unknown;
    };
    if (!res.ok || obj.ok !== true || !obj.data || !Array.isArray(obj.data.items)) {
      const message = typeof obj.message === "string" ? obj.message : "Failed";
      return { ok: false, status: res.status, message };
    }
    if (!obj.data.items.every(isAdminOrderRow)) {
      return { ok: false, status: res.status, message: "Unexpected orders response" };
    }
    const nextCursor =
      typeof obj.data.nextCursor === "string" ? obj.data.nextCursor : null;
    return {
      ok: true,
      data: { items: obj.data.items, nextCursor },
    };
  } catch {
    return { ok: false, message: "Backend unavailable" };
  }
}
