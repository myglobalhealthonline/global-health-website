import "server-only";

import { cookies } from "next/headers";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import type { Cart, OrderDetail, OrderListItem } from "./cart-types";

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
  fullName: string;
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

export async function fetchAdminOrders(): Promise<Result<{ items: unknown[] }>> {
  const backend = getBackendOrigin();
  if (!backend) return { ok: false, message: "Backend not configured" };
  try {
    const res = await fetch(`${backend}/api/admin/orders`, {
      headers: { cookie: await cookieHeader() },
      cache: "no-store",
    });
    const json = (await res.json()) as {
      ok?: boolean;
      data?: { items: unknown[] };
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
