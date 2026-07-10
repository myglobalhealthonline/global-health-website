"use client";

/**
 * P-001 fix: the public (site) shell used to learn `role`/`email` from
 * `x-gh-role`/`x-gh-email` request headers the edge proxy stamped after a
 * local JWT decode — free (no I/O), but reading `headers()` server-side in
 * `(site)/layout.tsx` forced EVERY public page to render dynamically,
 * defeating `generateStaticParams()` on the country routes.
 *
 * This moves the same personalization client-side: a small context provider
 * fetches `/api/auth/me` (same-origin, cookie-authenticated) once after the
 * static shell has already painted, and the header/mobile-nav avatar islands
 * read from it.
 *
 * Perf/UX: the vast majority of public-site visitors are anonymous, so
 * calling `/api/auth/me` unconditionally on every page view would cost every
 * one of them a wasted round-trip. `proxy.ts` stamps a bare, non-HttpOnly
 * `gh-auth-hint` cookie whenever the edge JWT check finds a valid session
 * (and clears it otherwise) purely so the client can decide, for free,
 * whether that round-trip is worth making at all.
 *
 * The cookie check happens in a `useEffect` (not a `useState` initializer)
 * so the very first client render matches the server-rendered HTML — which
 * is always the logged-out shape — for every visitor. State only "upgrades"
 * post-mount, same pattern as CartProvider's mount-time refresh().
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchCurrentUser, type AuthUser } from "@/lib/api/auth-api";

export type PublicAuthUser = AuthUser;

const AUTH_HINT_COOKIE = "gh-auth-hint";

type PublicAuthContextValue = {
  user: PublicAuthUser | null;
  loading: boolean;
};

const PublicAuthContext = createContext<PublicAuthContextValue | null>(null);

function hasAuthHintCookie(): boolean {
  return document.cookie
    .split(";")
    .some((part) => part.trim().startsWith(`${AUTH_HINT_COOKIE}=`));
}

export function PublicAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicAuthUser | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // No hint cookie: never authenticated (or the session already expired) —
    // skip the /api/auth/me round-trip entirely. `user`/`loading` are already
    // at their logged-out defaults, so there's nothing to set.
    if (!hasAuthHintCookie()) return;

    let cancelled = false;
    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    fetchCurrentUser().then((res) => {
      if (cancelled) return;
      setUser(res.ok ? res.data.user : null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PublicAuthContext.Provider value={{ user, loading }}>
      {children}
    </PublicAuthContext.Provider>
  );
}

export function usePublicAuth(): PublicAuthContextValue {
  const ctx = useContext(PublicAuthContext);
  if (!ctx) throw new Error("usePublicAuth must be inside <PublicAuthProvider>");
  return ctx;
}
