import "server-only";

import { cookies } from "next/headers";
import type { AuthUser } from "./auth-api";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

export async function getServerAuthUser(): Promise<AuthUser | null> {
  if (!API_URL) return null;
  const cookieHeader = (await cookies())
    .getAll()
    .map((entry) => `${entry.name}=${entry.value}`)
    .join("; ");
  if (!cookieHeader) return null;

  try {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      method: "GET",
      headers: {
        cookie: cookieHeader,
      },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const json = (await response.json()) as {
      ok?: boolean;
      data?: { user?: AuthUser };
    };
    if (!json.ok || !json.data?.user) return null;
    return json.data.user;
  } catch {
    return null;
  }
}

