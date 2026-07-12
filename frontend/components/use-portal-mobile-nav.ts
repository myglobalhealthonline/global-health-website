"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

/**
 * Shared a11y hardening for the mobile sidebar nav in both portal shells
 * (`components/portal-shell.tsx` and `app/(admin)/admin/_components/
 * admin-shell.tsx`). The two shells render structurally different sidebar
 * content (nav groups vs. Global/Country sections), so a shared hook —
 * not a shared component — is the surgical fix: both copies keep their own
 * markup and just call this the same way.
 *
 * Adds what the hand-rolled scrim+slide-in was missing (A4 findings): Esc
 * to close, body scroll lock, a focus trap scoped to the open drawer, and
 * focus restoration to whatever opened it.
 */
export function usePortalMobileNavA11y(
  open: boolean,
  onClose: () => void,
  navRef: RefObject<HTMLElement | null>,
) {
  const returnFocusRef = useRef<HTMLElement | null>(null);
  // Both shells pass an inline `() => setNavOpen(false)` — reading it via a
  // ref keeps the effect keyed to `open` alone, so re-renders while the
  // drawer is open don't tear down the trap (which would restore focus and
  // churn the body scroll lock mid-open).
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function queryFocusable(): NodeListOf<HTMLElement> | undefined {
      return navRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
    }
    const focusTimer = window.setTimeout(() => queryFocusable()?.[0]?.focus(), 0);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = queryFocusable();
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [open, navRef]);
}
