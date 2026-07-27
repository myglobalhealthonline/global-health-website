"use client";

/**
 * Notification bell + login/avatar block, split out of `SiteHeader` (a
 * Server Component) so the static shell doesn't need `authUser` passed in
 * from a header/cookie read. See `PublicAuthContext.tsx` for the P-001
 * rationale. Logged-out and logged-in markup/classes are unchanged from the
 * previous inline version; the loading placeholder is new.
 */

import Link from "next/link";
import { Bell } from "lucide-react";
import { usePublicAuth } from "@/components/layout/PublicAuthContext";
import type { SiteNavigationData } from "@/data/navigation";

/** First letter of the user's email, uppercased — the avatar glyph.
 *  Falls back to a neutral dot when no email is available. */
function initialFromEmail(email?: string | null): string {
  const ch = email?.trim()?.[0];
  return ch ? ch.toUpperCase() : "•";
}

export function HeaderAuthActions({
  navigation,
  a11y,
}: {
  navigation: SiteNavigationData;
  /** Localized aria-labels, resolved server-side by SiteHeader. */
  a11y: { yourAccount: string; notifications: string };
}) {
  const { user, loading } = usePublicAuth();
  // Optimistic while the /api/auth/me fetch is in flight (auth-hint cookie
  // was present): route to the authenticated destinations now rather than
  // /login. If the fetch resolves logged-out, /account's own server-side
  // check (and the edge proxy's route gate) sends the visitor to /login.
  const authed = loading || user !== null;

  return (
    <>
      {/* Notifications — links to the account inbox (or sign-in). The
          lime dot is the signature live-status accent. */}
      <Link
        href={authed ? "/account/notifications" : "/login"}
        aria-label={a11y.notifications}
        className="gh-focus-on-dark relative hidden size-11 items-center justify-center rounded-full text-white/85 transition-colors duration-200 hover:bg-white/12 hover:text-white xl:inline-flex"
      >
        <Bell className="size-4" strokeWidth={2} aria-hidden />
        <span
          aria-hidden
          className="absolute right-2.5 top-2.5 size-2 rounded-full ring-2 ring-[color:var(--color-background-dark)]"
          style={{ background: "var(--color-brand-accent)" }}
        />
      </Link>

      {loading ? (
        // Hint present, session not resolved yet: neutral placeholder avatar,
        // no email/role known. Links to /account, which self-corrects
        // (ADMIN/DOCTOR get redirected on to /admin or /doctor there).
        <Link
          href="/account"
          aria-label={a11y.yourAccount}
          className="gh-focus-on-dark group hidden size-11 items-center justify-center rounded-full transition-transform duration-200 active:scale-95 xl:inline-flex"
        >
          <span className="inline-flex size-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[13px] font-extrabold leading-none text-white/50 transition-[background-color,border-color] duration-200 group-hover:border-[var(--color-brand-accent)] group-hover:bg-white/[0.16]">
            •
          </span>
        </Link>
      ) : !user ? (
        <Link
          href="/login"
          className="gh-header-authLink gh-focus-on-dark hidden whitespace-nowrap rounded-full px-2 text-sm font-semibold text-white/70 transition-colors hover:text-white active:opacity-80 xl:inline-flex"
        >
          {navigation.headerAuthLink.label}
        </Link>
      ) : (
        <Link
          href={
            user.role === "ADMIN"
              ? "/admin"
              : user.role === "DOCTOR"
                ? "/doctor"
                : "/account"
          }
          aria-label={user.email ? `${a11y.yourAccount} (${user.email})` : a11y.yourAccount}
          title={user.email ?? undefined}
          // The signed-in branch is the only part of the public chrome that
          // carries the visitor's own identity — the email sits in title and
          // aria-label, and the avatar renders its initial. Force-masked so a
          // Clarity recording of a marketing page cannot pick it up, whatever
          // the project's dashboard masking level happens to be set to.
          data-clarity-mask="true"
          className="gh-focus-on-dark group hidden size-11 items-center justify-center rounded-full transition-transform duration-200 active:scale-95 xl:inline-flex"
        >
          {/* 44px hit area; 36px visual circle so the tight lg header row
              keeps its previous width. */}
          <span className="inline-flex size-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[13px] font-extrabold leading-none text-white transition-[background-color,border-color] duration-200 group-hover:border-[var(--color-brand-accent)] group-hover:bg-white/[0.16]">
            {initialFromEmail(user.email)}
          </span>
        </Link>
      )}
    </>
  );
}
