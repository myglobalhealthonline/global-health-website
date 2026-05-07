import "server-only";

import { cookies, headers } from "next/headers";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import type { AuthUser } from "./auth-api";

/** Public origin for this deployment (Railway sets x-forwarded-*). Used to hit same-origin /api/auth/* proxies like the browser. */
async function getForwardedSiteOrigin(): Promise<string | null> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (!host) return null;
    const rawProto = h.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
    const protocol =
      rawProto === "http" || rawProto === "https"
        ? rawProto
        : host.startsWith("localhost") || host.startsWith("127.")
          ? "http"
          : "https";
    return `${protocol}://${host}`;
  } catch {
    return null;
  }
}

async function fetchAuthMe(url: string, cookieHeader: string): Promise<AuthUser | null> {
  const response = await fetch(url, {
    method: "GET",
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const json = (await response.json()) as {
    ok?: boolean;
    data?: { user?: AuthUser };
  };
  if (!json.ok || !json.data?.user) return null;
  return json.data.user;
}

export async function getServerAuthUser(): Promise<AuthUser | null> {
  const cookieHeader = (await cookies())
    .getAll()
    .map((entry) => `${entry.name}=${entry.value}`)
    .join("; ");
  if (!cookieHeader) return null;

  const site = await getForwardedSiteOrigin();
  const backend = getBackendOrigin();
  const urls = [
    site ? `${site}/api/auth/me` : null,
    backend ? `${backend}/api/auth/me` : null,
  ].filter((u): u is string => Boolean(u));

  const unique = [...new Set(urls)];

  for (const url of unique) {
    try {
      const user = await fetchAuthMe(url, cookieHeader);
      if (user) return user;
    } catch {
      continue;
    }
  }
  return null;
}
