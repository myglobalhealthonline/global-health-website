import "server-only";

import { cookies } from "next/headers";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import type { CreditsView, RedemptionsView, SubscriptionView } from "./me-subscription";

/**
 * Server-side reads of the patient `/api/me/*` surface for account pages.
 * Forwards the site cookie string to the backend (like `getServerAuthUser`);
 * returns null on any failure so a page can fall back gracefully rather than
 * throw. Mutations stay on the client (`me-subscription.ts`).
 */
async function meServerGet<T>(path: string): Promise<T | null> {
  const cookieHeader = (await cookies())
    .getAll()
    .map((entry) => `${entry.name}=${entry.value}`)
    .join("; ");
  if (!cookieHeader) return null;

  const backend = getBackendOrigin();
  if (!backend) return null;

  try {
    const response = await fetch(`${backend}/api/me/${path}`, {
      method: "GET",
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { ok?: boolean; data?: T };
    if (!json.ok) return null;
    return (json.data ?? null) as T | null;
  } catch {
    return null;
  }
}

export function getServerSubscription(): Promise<SubscriptionView | null> {
  return meServerGet<SubscriptionView | null>("subscription");
}

export function getServerCredits(): Promise<CreditsView | null> {
  return meServerGet<CreditsView>("credits");
}

export function getServerRedemptions(): Promise<RedemptionsView | null> {
  return meServerGet<RedemptionsView>("redemptions");
}
