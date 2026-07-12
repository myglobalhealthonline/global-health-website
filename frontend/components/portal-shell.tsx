"use client";

/**
 * PortalShell — shared chrome for the doctor + patient portals.
 *
 * Mirrors `AdminShell` (admin portal) so all three surfaces share one
 * visual language: dark 260px sidebar with logo + section eyebrows +
 * active-item highlight, light top header with hamburger (mobile),
 * breadcrumb trail, notification bell, and user-menu dropdown with
 * sign-out.
 *
 * Differences from AdminShell:
 *  - No country picker (admin-only feature)
 *  - One nav section, not split Global/Country
 *  - Portal label + home href are props (Doctor portal / Patient portal)
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu, X } from "lucide-react";
import {
  NotificationPopover,
  type NotificationPopoverItem,
} from "@/components/NotificationPopover";
import { PortalUserMenu } from "@/components/PortalUserMenu";
import { IdleLogout } from "@/components/IdleLogout";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { usePortalMobileNavA11y } from "@/components/use-portal-mobile-nav";
import { isEmailSegment, PII_SAFE_CRUMB_LABEL } from "@/lib/breadcrumb-utils";
import type { LocaleCode } from "@/lib/i18n/types";

export type PortalShellUser = {
  fullName: string;
  email: string;
  role: string;
};

export type PortalNavItem = {
  href: string;
  label: string;
  /** Pre-rendered icon element. Server Components cannot pass function
   *  components across the boundary, so layouts pass `<Calendar … />`
   *  instead of `Calendar`. */
  icon: ReactNode;
  badge?: number;
};

/** A labeled cluster of nav items. Each group renders its own eyebrow
 *  (`SidebarSectionLabel`) above its items — mirrors the Global/Country
 *  split in `AdminShell` so all three portals share one visual language. */
export type PortalNavGroup = {
  label: string;
  items: PortalNavItem[];
};

type SignOutAction = () => Promise<void> | void;

/** Shell chrome strings — localizable UI text that isn't nav data.
 *  Optional with English defaults so callers that don't localize
 *  (corporate portal) keep working untouched. */
export type PortalShellChrome = {
  account: string;
  mainSite: string;
  signOut: string;
  closeNavigation: string;
  openNavigation: string;
  closeMenu: string;
  allCaughtUp: string;
};

const DEFAULT_CHROME: PortalShellChrome = {
  account: "Account",
  mainSite: "Main site",
  signOut: "Sign out",
  closeNavigation: "Close navigation",
  openNavigation: "Open navigation",
  closeMenu: "Close menu",
  allCaughtUp: "You're all caught up.",
};

function humanizeSegment(seg: string): string {
  if (!seg) return "";
  return seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function useBreadcrumbs(pathname: string, rootHref: string, rootLabel: string) {
  return useMemo(() => {
    if (!pathname.startsWith(rootHref)) {
      return [{ label: rootLabel, href: rootHref }];
    }
    const segments = pathname.split("/").filter(Boolean);
    const crumbs: { label: string; href: string }[] = [];
    let acc = "";
    for (let i = 0; i < segments.length; i++) {
      acc += `/${segments[i]}`;
      if (i === 0) {
        crumbs.push({ label: rootLabel, href: rootHref });
        continue;
      }
      const isCuid =
        segments[i].length === 25 && /^[a-z0-9]+$/i.test(segments[i]);
      const label = isEmailSegment(segments[i])
        ? PII_SAFE_CRUMB_LABEL
        : isCuid
          ? `${segments[i].slice(0, 8)}…`
          : humanizeSegment(segments[i]);
      crumbs.push({ label, href: acc });
    }
    return crumbs;
  }, [pathname, rootHref, rootLabel]);
}

export function PortalShell({
  user,
  portalKey,
  groups,
  portalLabel,
  rootHref,
  rootBreadcrumb,
  signOutAction,
  accountHref,
  notifications,
  notificationsUnreadCount = 0,
  notificationsViewAllHref,
  notificationsEmptyMessage,
  logoHref,
  banner,
  locale,
  availableLocales,
  chrome,
  children,
}: {
  user: PortalShellUser;
  /** Drives `data-portal` (role accent token) — "doctor", "patient" or "corporate". */
  portalKey: "doctor" | "patient" | "corporate";
  /** Labeled nav groups, rendered top-to-bottom with an eyebrow each. */
  groups: PortalNavGroup[];
  /** Mint eyebrow under logo (e.g., "Doctor portal"). */
  portalLabel: string;
  /** Home route — "/doctor" or "/account". */
  rootHref: string;
  /** First breadcrumb label (e.g., "Doctor", "Account"). */
  rootBreadcrumb: string;
  signOutAction: SignOutAction;
  /** Href for the user-menu "Account" link. Defaults to the portal's
   *  root (e.g. /doctor or /account) so each layout can point at its
   *  own profile sub-route without re-implementing the menu. */
  accountHref?: string;
  /** Recent notifications for the bell dropdown. Empty (or undefined) =
   *  shows the empty-state message; bell dot hides. */
  notifications?: NotificationPopoverItem[];
  /** Total unread count, drives the red bell dot + "N unread" label. */
  notificationsUnreadCount?: number;
  /** "View all" link href; null hides the link. */
  notificationsViewAllHref?: string | null;
  /** Fallback text when notifications is empty. */
  notificationsEmptyMessage?: string;
  /** Override the logo link href. Defaults to rootHref.
   *  Patient portal passes the country homepage so clicking the logo
   *  takes the user back to e.g. /ie/en rather than /account. */
  logoHref?: string;
  /** Optional banner rendered directly under the header, above the main
   *  content (e.g. the doctor compliance nudge). */
  banner?: ReactNode;
  /** Current UI locale — with `availableLocales`, shows the topbar
   *  language switcher. Omit both to hide it (corporate portal). */
  locale?: LocaleCode;
  availableLocales?: LocaleCode[];
  /** Localized shell strings; defaults to English when omitted. */
  chrome?: PortalShellChrome;
  children: ReactNode;
}) {
  const c = chrome ?? DEFAULT_CHROME;
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const breadcrumbs = useBreadcrumbs(pathname, rootHref, rootBreadcrumb);
  const navRef = useRef<HTMLElement | null>(null);
  usePortalMobileNavA11y(navOpen, () => setNavOpen(false), navRef);

  // Topbar seam-light swap — the ONLY scroll-linked effect in the system
  // (DESIGN.md §5.2). Purely presentational, one class toggle.
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function isActive(href: string): boolean {
    if (href === rootHref) return pathname === rootHref;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  // Staff portals (doctor/corporate) are English-only data tools — opt them
  // out of Chrome auto-translate, which mutates text nodes under React and
  // crashes hydration (insertBefore "not a child"). Patients keep translation.
  const noTranslate = portalKey !== "patient";

  return (
    <div
      className={`gh-portal-shell min-h-screen${noTranslate ? " notranslate" : ""}`}
      translate={noTranslate ? "no" : undefined}
      data-portal={portalKey}
      data-density="comfortable"
    >
      <IdleLogout />
      {/* Mobile overlay */}
      {navOpen ? (
        <button
          type="button"
          aria-label={c.closeNavigation}
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-[calc(var(--z-header)-1)] bg-black/40 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      {/* Sidebar — fixed on every breakpoint. Mobile slide-in via
          translate; on desktop the main column gets `lg:pl-[260px]`
          so content doesn't slide under it. */}
      <aside
        ref={navRef}
        role={navOpen ? "dialog" : undefined}
        aria-modal={navOpen ? true : undefined}
        aria-label={navOpen ? portalLabel : undefined}
        className={`gh-portal-sidebar fixed inset-y-0 left-0 z-[var(--z-header)] flex w-[var(--portal-sidebar-w)] max-w-[86vw] flex-col transition-transform duration-200 ease-out lg:translate-x-0 ${
          navOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
        }`}
      >
          <div
            className="gh-admin-sidebar-logo px-5 pb-[18px] pt-5"
          >
            <Link href={logoHref ?? rootHref} className="inline-flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logos/global-health-light.png"
                alt="Global Health"
                style={{ height: 44, width: "auto" }}
              />
            </Link>
            <p
              className="gh-portal-label mt-2 text-[10px] font-bold uppercase tracking-[0.22em]"
            >
              {portalLabel}
            </p>
          </div>

          <nav className="gh-dark-scroll flex-1 overflow-y-auto pb-6">
            {groups.map((group) => (
              <div key={group.label}>
                <SidebarSectionLabel label={group.label} />
                <div className="px-3 pt-1">
                  <div className="grid gap-0.5">
                    {group.items.map((s) => (
                      <SidebarItem
                        key={s.href}
                        href={s.href}
                        icon={s.icon}
                        label={s.label}
                        badge={s.badge}
                        active={isActive(s.href)}
                        onNavigate={() => setNavOpen(false)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </nav>

          <div
            className="gh-portal-sidebar-footer px-5 py-4 text-[12px] font-bold uppercase tracking-[0.06em]"
          >
            v1.0 · medicine anytime anywhere
          </div>
        </aside>

      {/* Main column — offset by sidebar width on desktop so content
          doesn't slide under the fixed sidebar. */}
      <div className="flex min-h-screen min-w-0 flex-col lg:pl-[var(--portal-sidebar-w)]">
          {/* Top header — sticky dark glass over scrolling content. */}
          <header
            className={`gh-portal-topbar${scrolled ? " gh-portal-topbar--scrolled" : ""} sticky top-0 z-[var(--z-header)] flex shrink-0 items-center justify-between gap-3 px-4 sm:px-6`}
            style={{ height: "var(--portal-topbar-h)" }}
          >
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setNavOpen((v) => !v)}
                aria-label={navOpen ? c.closeNavigation : c.openNavigation}
                aria-expanded={navOpen}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-[var(--portal-chrome-border)] text-[var(--portal-chrome-text-active)] lg:hidden"
              >
                {navOpen ? (
                  <X className="size-4" aria-hidden />
                ) : (
                  <Menu className="size-4" aria-hidden />
                )}
              </button>

              {/* Portal glyph — DESIGN.md §5.2. */}
              <span
                aria-hidden
                className="gh-portal-glyph inline-flex shrink-0 items-center justify-center rounded-[6px]"
              >
                <span className="gh-portal-glyph__dot" />
              </span>

              <nav
                aria-label="Breadcrumb"
                className="flex min-w-0 items-center gap-1.5 overflow-hidden text-sm"
              >
                {breadcrumbs.map((crumb, i) => {
                  const isLast = i === breadcrumbs.length - 1;
                  return (
                    <span key={crumb.href} className="flex items-center gap-1.5">
                      {isLast ? (
                        <span
                          aria-current="page"
                          className="truncate font-bold text-[var(--portal-chrome-text-active)]"
                        >
                          {crumb.label}
                        </span>
                      ) : (
                        <Link
                          href={crumb.href}
                          className="truncate font-medium text-[var(--portal-chrome-text)] transition hover:text-[var(--portal-chrome-text-active)]"
                        >
                          {crumb.label}
                        </Link>
                      )}
                      {!isLast ? (
                        <ChevronRight
                          className="size-3 shrink-0 opacity-50"
                          style={{ color: "var(--portal-chrome-text)" }}
                          aria-hidden
                        />
                      ) : null}
                    </span>
                  );
                })}
              </nav>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {locale && availableLocales ? (
                <LanguageSwitcher
                  currentLang={locale}
                  availableLocales={availableLocales}
                  mode="refresh"
                />
              ) : null}
              {/* Bell + user chip share one chrome pill (DESIGN.md §5.2). */}
              <div
                className="gh-portal-user-pill flex items-center rounded-full"
              >
                <NotificationPopover
                  items={notifications ?? []}
                  unreadCount={notificationsUnreadCount}
                  viewAllHref={notificationsViewAllHref ?? null}
                  emptyMessage={notificationsEmptyMessage ?? c.allCaughtUp}
                />

                <span
                  aria-hidden
                  className="gh-portal-user-divider"
                />

                <PortalUserMenu
                  user={user}
                  accountHref={accountHref ?? rootHref}
                  rootHref="/"
                  signOutAction={signOutAction}
                  labels={{ account: c.account, mainSite: c.mainSite, signOut: c.signOut }}
                />
              </div>
            </div>
          </header>

          {banner}

          <main className="gh-admin-main gh-portal-main min-w-0 flex-1">
            {children}
          </main>
        </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Sidebar atoms — copied from admin-shell for visual parity
   ───────────────────────────────────────────────────────────── */

function SidebarSectionLabel({ label }: { label: string }) {
  return (
    <div
      className="flex items-center gap-2 px-6 pb-2 pt-5"
      style={{
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.55)",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 14,
          height: 2,
          borderRadius: 2,
          background: "var(--portal-mint)",
        }}
      />
      <span>{label}</span>
    </div>
  );
}

function SidebarItem({
  href,
  icon,
  label,
  badge,
  active,
  onNavigate,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  badge?: number;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className="gh-portal-nav-item"
    >
      {/* Left accent bar — CSS-driven, scales in on activation (§5.1). */}
      <span aria-hidden className="gh-portal-nav-item__bar" />
      <span className="inline-flex shrink-0 justify-center" style={{ width: 16 }}>
        {icon}
      </span>
      <span className="truncate flex-1">{label}</span>
      {badge && badge > 0 ? (
        <span className="gh-portal-nav-item__badge gh-portal-nav-item__badge--live">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}
