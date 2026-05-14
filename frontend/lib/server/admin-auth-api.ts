import "server-only";

import { getBackendOrigin } from "@/lib/server/backend-origin";

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "SUPER_ADMIN";
};

type JsonRecord = Record<string, unknown>;

function getRequiredBackendOrigin() {
  const origin = getBackendOrigin();
  if (!origin) {
    throw new Error("Backend API is not configured.");
  }
  return origin;
}

function getOptionalBackendOrigin() {
  return getBackendOrigin() || null;
}

export async function loginAdminWithBackend(input: {
  email: string;
  password: string;
}): Promise<
  | { ok: true; token: string; user: AdminUser }
  | { ok: false; message: string; status: number }
> {
  let response: Response;
  try {
    response = await fetch(`${getRequiredBackendOrigin()}/api/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
    });
  } catch (err) {
    return {
      ok: false,
      status: 503,
      message:
        err instanceof Error ? err.message : "Backend authentication is unavailable.",
    };
  }

  const data = (await response.json().catch(() => null)) as JsonRecord | null;
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: typeof data?.message === "string" ? data.message : "Sign in failed",
    };
  }

  return {
    ok: true,
    token: String(data?.token ?? ""),
    user: data?.user as AdminUser,
  };
}

export async function getAdminSessionFromBackend(token: string): Promise<AdminUser | null> {
  const origin = getOptionalBackendOrigin();
  if (!origin) return null;

  let response: Response;
  try {
    response = await fetch(`${origin}/api/admin/auth/session`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;

  const data = (await response.json().catch(() => null)) as JsonRecord | null;
  if (!data?.user || typeof data.user !== "object") return null;
  return data.user as AdminUser;
}

export async function notifyAdminLogout(token: string): Promise<void> {
  const origin = getOptionalBackendOrigin();
  if (!origin) return;

  try {
    await fetch(`${origin}/api/admin/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    // Logout should remain local even when the backend is unavailable.
  }
}
