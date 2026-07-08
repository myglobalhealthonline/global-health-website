"use client";

import { useEffect, useRef } from "react";
import { logoutUser } from "@/lib/api/auth-api";

/**
 * HIPAA §164.312(a)(2)(iii) automatic logoff — terminate an authenticated
 * session after a predetermined period of INACTIVITY. Mounted inside the
 * authenticated shells (PortalShell + AdminShell) so it covers every
 * account / doctor / corporate / admin page.
 *
 * Client-enforced idle timeout: any user interaction resets the timer; after
 * `idleMs` with no interaction we clear the session cookie (POST
 * /api/auth/logout) and hard-redirect to /login. The backend cookie/token
 * remains the source of truth — this is the inactivity layer on top of it.
 *
 * ponytail: client-side idle timer, not a server-tracked session. Background
 * tabs throttle setTimeout, so logout may fire on refocus rather than exactly
 * at the deadline — fine for a fail-safe (it always logs out, never keeps a
 * session alive longer server-side). Upgrade path if stricter proof is needed:
 * add a sliding server re-issue in the auth gates + short token TTL.
 */

const DEFAULT_IDLE_MS = 20 * 60 * 1000; // 20 minutes
const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "visibilitychange",
] as const;

export function IdleLogout({ idleMs = DEFAULT_IDLE_MS }: { idleMs?: number }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let done = false;

    async function signOutIdle() {
      if (done) return;
      done = true;
      try {
        await logoutUser();
      } catch {
        // Clearing the cookie server-side is best-effort — redirect regardless
        // so the user can't keep viewing PHI after the idle window.
      }
      const next = encodeURIComponent(window.location.pathname);
      window.location.href = `/login?next=${next}&reason=idle`;
    }

    function reset() {
      // Don't extend the window just because the tab was backgrounded; only
      // real interaction (or refocus) resets it.
      if (document.visibilityState === "hidden") return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(signOutIdle, idleMs);
    }

    reset();
    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, reset, { passive: true });
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, reset);
      }
    };
  }, [idleMs]);

  return null;
}
