"use client";

import type { Cart, CartItemKind, CartItemPatientInput } from "./cart-types";

type Result<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; message: string; conflict?: string };

async function cartFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Result<never>> {
  try {
    const res = await fetch(input, init);
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) {
      return {
        ok: false,
        message: json?.message ?? "Cart request failed",
        conflict: json?.errors?.conflict,
      };
    }
    return { ok: true, data: json.data, message: json.message };
  } catch {
    return { ok: false, message: "Could not reach the server — is the backend running?" };
  }
}

export async function getCart(): Promise<Result<Cart>> {
  const res = await cartFetch("/api/cart", { cache: "no-store" });
  if (!res.ok) return res;
  return { ok: true, data: res.data as Cart };
}

export type AddItemInput = {
  kind: CartItemKind;
  healthTestId?: string;
  serviceId?: string;
  quantity?: number;
  timeSlotId?: string;
  doctorId?: string;
  /** Patient intake — required for GENERAL_CONSULTATION /
   *  SPECIALIST_CONSULTATION (the consult-page form collects it). */
  patient?: CartItemPatientInput;
};

export async function addToCart(input: AddItemInput): Promise<Result<Cart>> {
  const res = await cartFetch("/api/cart/items", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) return res;
  return { ok: true, data: res.data as Cart };
}

export async function updateCartItem(
  itemId: string,
  quantity: number,
): Promise<Result<Cart>> {
  const res = await cartFetch(`/api/cart/items/${itemId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ quantity }),
  });
  if (!res.ok) return res;
  return { ok: true, data: res.data as Cart };
}

export async function removeCartItem(itemId: string): Promise<Result<Cart>> {
  const res = await cartFetch(`/api/cart/items/${itemId}`, { method: "DELETE" });
  if (!res.ok) return res;
  return { ok: true, data: res.data as Cart };
}

export async function clearCart(): Promise<Result<Cart>> {
  const res = await cartFetch("/api/cart", { method: "DELETE" });
  if (!res.ok) return res;
  return { ok: true, data: res.data as Cart };
}

export type CheckoutInput = {
  email: string;
  fullName: string;
  phone?: string;
  shipName: string;
  shipLine1: string;
  shipLine2?: string;
  shipCity: string;
  shipPostalCode: string;
  shipCountryCode: string;
  returnTo?: string;
};

export async function startCheckout(
  input: CheckoutInput,
): Promise<Result<{ orderId: string; url: string }>> {
  const res = await cartFetch("/api/cart/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) return res;
  return { ok: true, data: res.data as { orderId: string; url: string } };
}
