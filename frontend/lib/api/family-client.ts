"use client";

/**
 * Family-members client (patient account). Mirrors the shape/style of
 * `lib/api/cart-client.ts`: a thin `familyFetch<T>` wrapper that normalises
 * the `{ ok, data?, message? }` envelope into a discriminated `Result<T>`.
 *
 * Same-origin `/api/account/family`; all calls send the auth cookie.
 */

export type FamilyMember = {
  id: string;
  fullName: string;
  relationship: string | null;
  email: string | null;
  /** ISO date string (YYYY-MM-DD or full ISO) or null. */
  dateOfBirth: string | null;
  /** Approved to spend the subscriber's plan credits / discounts. */
  canUseCredits: boolean;
  createdAt: string;
};

type Result<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; message: string };

async function familyFetch<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Result<T>> {
  try {
    const res = await fetch(input, { credentials: "include", ...init });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) {
      return { ok: false, message: json?.message ?? "Family request failed" };
    }
    return { ok: true, data: json.data as T, message: json.message };
  } catch {
    return { ok: false, message: "Could not reach the server — is the backend running?" };
  }
}

export async function listFamilyMembers(): Promise<Result<{ items: FamilyMember[] }>> {
  return familyFetch<{ items: FamilyMember[] }>("/api/account/family", {
    cache: "no-store",
  });
}

export type FamilyMemberInput = {
  fullName: string;
  relationship?: string;
  /** YYYY-MM-DD */
  dateOfBirth?: string;
  email?: string;
  canUseCredits?: boolean;
};

export async function addFamilyMember(
  input: FamilyMemberInput,
): Promise<Result<FamilyMember>> {
  return familyFetch<FamilyMember>("/api/account/family", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export type FamilyMemberPatch = Partial<FamilyMemberInput>;

export async function updateFamilyMember(
  id: string,
  patch: FamilyMemberPatch,
): Promise<Result<FamilyMember>> {
  return familyFetch<FamilyMember>(`/api/account/family/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export async function removeFamilyMember(
  id: string,
): Promise<Result<{ id: string; deleted: true }>> {
  return familyFetch<{ id: string; deleted: true }>(`/api/account/family/${id}`, {
    method: "DELETE",
  });
}
