"use client";

import type {
  BenefitSelection,
  Cart,
  CartBenefitInput,
  CartItemKind,
  CartItemPatientInput,
} from "./cart-types";

type Result<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; message: string; conflict?: string };

async function cartFetch<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Result<T>> {
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
    return { ok: true, data: json.data as T, message: json.message };
  } catch {
    return { ok: false, message: "Could not reach the server — is the backend running?" };
  }
}

export async function getCart(): Promise<Result<Cart>> {
  return cartFetch<Cart>("/api/cart", { cache: "no-store" });
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
  /** Per-line benefit choice. Default PAY_NORMAL never consumes a credit. */
  benefitSelection?: BenefitSelection;
  /** Approved dependent to book for (Premium family usage). */
  familyMemberId?: string;
  /** Insurance company the patient selected for this covered service. The
   *  server validates coverage + re-derives the negotiated price. */
  insuranceCompanyId?: string;
  /** The patient's insurance card / policy number (stored encrypted). */
  insurancePolicyNumber?: string;
  /**
   * Self-declared coverage from the booking form's coverage picker: the
   * category, the provider the patient picked out of the admin catalogue, and
   * the number on their card. Unverified by definition — the server re-derives
   * the price from the card and parks the order for manual verification, so
   * nothing here decides what is charged.
   */
  declaredCoverage?: {
    source: "INSURANCE" | "CORPORATE" | "MEMBERSHIP" | "PUBLIC_PLAN";
    refId: string;
    cardNumber: string;
  };
  /**
   * Cart-level benefit choice (§11.4) — which pricing engine checkout runs.
   * Sent here rather than by a separate call so a line can never exist without
   * the benefit that prices it. Ignored for guests, who hold none.
   */
  benefit?: CartBenefitInput;
};

export async function addToCart(input: AddItemInput): Promise<Result<Cart>> {
  return cartFetch<Cart>("/api/cart/items", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

/** Cart-line patch — any subset. Backend rejects an empty body. */
export type UpdateItemInput = {
  quantity?: number;
  benefitSelection?: BenefitSelection;
  /** `null` clears the family target (book for self); a string targets a dependent. */
  familyMemberId?: string | null;
};

export async function updateCartItem(
  itemId: string,
  patch: number | UpdateItemInput,
): Promise<Result<Cart>> {
  // Back-compat: a bare number is treated as a quantity update.
  const body: UpdateItemInput = typeof patch === "number" ? { quantity: patch } : patch;
  return cartFetch<Cart>(`/api/cart/items/${itemId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function removeCartItem(itemId: string): Promise<Result<Cart>> {
  return cartFetch<Cart>(`/api/cart/items/${itemId}`, { method: "DELETE" });
}

export async function clearCart(): Promise<Result<Cart>> {
  return cartFetch<Cart>("/api/cart", { method: "DELETE" });
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
  /**
   * Site locale the customer is browsing in, upper-cased (the `[lang]` route
   * segment). Recorded on the Order so every payment link, reminder and
   * confirmation is written in the language they actually booked in, rather
   * than the booking country's default. Omitted → the server falls back to the
   * country, which is the pre-feature behaviour.
   */
  notificationLocale?: "EN" | "PT" | "ES" | "CS" | "RO" | "DE";
};

export async function startCheckout(
  input: CheckoutInput,
): Promise<Result<{ orderId: string; url: string | null; free?: boolean; insurancePendingVerification?: boolean }>> {
  return cartFetch<{ orderId: string; url: string | null; free?: boolean; insurancePendingVerification?: boolean }>(
    "/api/cart/checkout",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    },
  );
}
