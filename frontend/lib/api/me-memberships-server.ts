import "server-only";

import { cookies } from "next/headers";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import type { MemberMembershipView } from "./me-memberships";

/**
 * Server-side reads of the private-membership member surface (§10).
 * Same cookie-forward + null-on-failure shape as `me-subscription-server.ts`,
 * so a page degrades to its empty state rather than throwing.
 */
async function meServerGet<T>(path: string): Promise<T | null> {
  try {
    const cookieHeader = (await cookies())
      .getAll()
      .map((entry) => `${entry.name}=${entry.value}`)
      .join("; ");
    if (!cookieHeader) return null;

    const backend = getBackendOrigin();
    if (!backend) return null;

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

export function getServerMemberships(): Promise<MemberMembershipView[] | null> {
  return meServerGet<MemberMembershipView[]>("memberships");
}

export function getServerMembership(id: string): Promise<MemberMembershipView | null> {
  return meServerGet<MemberMembershipView>(`memberships/${encodeURIComponent(id)}`);
}
