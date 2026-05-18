"use client";

import type { Cart, CartItemKind } from "./cart-types";

type Result<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; message: string; conflict?: string };

export async function getCart(): Promise<Result<Cart>> {
  const res = await fetch("/api/cart", { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    return { ok: false, message: json?.message ?? "Could not load cart" };
  }
  return { ok: true, data: json.data };
}

export type AddItemInput = {
  kind: CartItemKind;
  healthTestId?: string;
  serviceId?: string;
  quantity?: number;
  timeSlotId?: string;
  doctorId?: string;
};

export async function addToCart(input: AddItemInput): Promise<Result<Cart>> {
  const res = await fetch("/api/cart/items", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    return {
      ok: false,
      message: json?.message ?? "Could not add to cart",
      conflict: json?.errors?.conflict,
    };
  }
  return { ok: true, data: json.data };
}

export async function updateCartItem(
  itemId: string,
  quantity: number,
): Promise<Result<Cart>> {
  const res = await fetch(`/api/cart/items/${itemId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ quantity }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    return { ok: false, message: json?.message ?? "Could not update item" };
  }
  return { ok: true, data: json.data };
}

export async function removeCartItem(itemId: string): Promise<Result<Cart>> {
  const res = await fetch(`/api/cart/items/${itemId}`, { method: "DELETE" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    return { ok: false, message: json?.message ?? "Could not remove item" };
  }
  return { ok: true, data: json.data };
}

export async function clearCart(): Promise<Result<Cart>> {
  const res = await fetch("/api/cart", { method: "DELETE" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    return { ok: false, message: json?.message ?? "Could not clear cart" };
  }
  return { ok: true, data: json.data };
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
  const res = await fetch("/api/cart/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    return { ok: false, message: json?.message ?? "Checkout failed" };
  }
  return { ok: true, data: json.data };
}
