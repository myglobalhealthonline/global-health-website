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

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, HelpCircle, Menu, X } from "lucide-react";
import {
  NotificationPopover,
  type NotificationPopoverItem,
} from "@/components/NotificationPopover";
import { PortalUserMenu } from "@/components/PortalUserMenu";
import { IdleLogout } from "@/components/IdleLogout";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { usePortalMobileNavA11y } from "@/components/use-portal-mobile-nav";
import { isEmailSegment, isIdSegment, PII_SAFE_CRUMB_LABEL, shortIdLabel } from "@/lib/breadcrumb-utils";
import type { LocaleCode } from "@/lib/i18n/types";
import { PortalTour, type TourLabels, type TourStep } from "@/components/portal-tour";

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
  skipToContent: string;
  /** Sidebar footer tagline. Optional — falls back to the English default
   *  for callers (corporate portal) that don't localize it. */
  slogan?: string;
  notificationsAriaLabel?: string;
  notificationsHeading?: string;
  notificationsUnreadSuffix?: string;
  notificationsUnreadSr?: string;
  notificationsViewAll?: string;
  chooseLanguage?: string;
};

const DEFAULT_CHROME: PortalShellChrome = {
  account: "Account",
  mainSite: "Main site",
  signOut: "Sign out",
  closeNavigation: "Close navigation",
  openNavigation: "Open navigation",
  closeMenu: "Close menu",
  allCaughtUp: "You're all caught up.",
  skipToContent: "Skip to main content",
  slogan: "v1.0 · medicine anytime anywhere",
  notificationsAriaLabel: "Notifications",
  notificationsHeading: "Notifications",
  notificationsUnreadSuffix: "unread",
  notificationsUnreadSr: "{count} unread notifications",
  notificationsViewAll: "View all",
  chooseLanguage: "Choose language",
};

/** Live unread-notifications count, shared between the shell's own bell/nav
 *  badges and any descendant page content (e.g. the notifications list).
 *  Initialized from the server-rendered prop and kept in sync with it on
 *  every render, but mark-read actions can also update it immediately —
 *  relying on `router.refresh()` alone to reliably re-run a *parent*
 *  layout's data fetch on every Next.js version is exactly the kind of
 *  thing that silently regresses (11-001). */
const NotificationCenterContext = createContext<{
  unreadCount: number;
  setUnreadCount: (value: number | ((prev: number) => number)) => void;
} | null>(null);

/** Call from a descendant page (inside a portal layout using `PortalShell`)
 *  to read/adjust the live unread count so the bell dot + sidebar badge
 *  update in the same tick as an optimistic mark-read UI change. No-op
 *  setter outside a `PortalShell` so callers don't need to guard usage. */
export function useNotificationCenter() {
  const ctx = useContext(NotificationCenterContext);
  return ctx ?? { unreadCount: 0, setUnreadCount: () => {} };
}

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
      const label = isEmailSegment(segments[i])
        ? PII_SAFE_CRUMB_LABEL
        : isIdSegment(segments[i])
          ? shortIdLabel(segments[i])
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
  tour,
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
  /** Onboarding spotlight tour — omit to skip rendering it (e.g. corporate
   *  portal hasn't got copy yet). Auto-starts once per browser via
   *  `storageKey`; the sidebar footer gets a "restart tour" button. */
  tour?: { steps: TourStep[]; labels: TourLabels & { restart: string }; storageKey: string };
  children: ReactNode;
}) {
  const c = { ...DEFAULT_CHROME, ...chrome };
  const [navOpen, setNavOpen] = useState(false);
  // Seeded once from the server-rendered prop (source of truth on first
  // mount); mark-read actions below update it optimistically from real
  // events afterwards, rather than re-mirroring the prop on every render.
  const [unreadCount, setUnreadCount] = useState(() => notificationsUnreadCount);
  const pathname = usePathname();
  const breadcrumbs = useBreadcrumbs(pathname, rootHref, rootBreadcrumb);
  const navRef = useRef<HTMLElement | null>(null);
  const topbarRef = useRef<HTMLElement | null>(null);
  usePortalMobileNavA11y(navOpen, () => setNavOpen(false), navRef);

  // Topbar seam-light swap — the ONLY scroll-linked effect in the system
  // (DESIGN.md §5.2). Purely presentational, one class toggle applied
  // directly to the DOM node (rAF-throttled) so it never re-renders the
  // shell tree (sidebar/breadcrumbs/notifications) on every scroll frame.
  useEffect(() => {
    let ticking = false;
    const apply = () => {
      topbarRef.current?.classList.toggle("gh-portal-topbar--scrolled", window.scrollY > 8);
      ticking = false;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    };
    apply();
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
    <NotificationCenterContext.Provider value={{ unreadCount, setUnreadCount }}>
    <div
      className={`gh-portal-shell min-h-screen${noTranslate ? " notranslate" : ""}`}
      translate={noTranslate ? "no" : undefined}
      data-portal={portalKey}
      data-density="comfortable"
    >
      <IdleLogout />
      {/* 16-005: first focusable element in the shell — visually hidden
          until focused, jumps keyboard users past the ~15-item sidebar
          straight to page content. Reuses the public site's `.gh-skip-link`
          (globals.css, shared) rather than a new portal.css rule. */}
      <a href="#main-content" className="gh-skip-link">
        {c.skipToContent}
      </a>
      {/* Mobile overlay */}
      <button
        type="button"
        aria-label={c.closeNavigation}
        aria-hidden={!navOpen}
        tabIndex={navOpen ? 0 : -1}
        onClick={() => setNavOpen(false)}
        className={`gh-portal-nav-scrim lg:hidden${navOpen ? " gh-portal-nav-scrim--open" : ""}`}
      />

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
                        badge={s.href === notificationsViewAllHref ? unreadCount : s.badge}
                        active={isActive(s.href)}
                        onNavigate={() => setNavOpen(false)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </nav>

          <div className="gh-portal-sidebar-footer px-5 py-4">
            {tour ? (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("gh:tour:start"))}
                className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] opacity-80 transition hover:opacity-100"
              >
                <HelpCircle className="size-3.5" aria-hidden />
                {tour.labels.restart}
              </button>
            ) : null}
            <p className="text-[12px] font-bold uppercase tracking-[0.06em]">{c.slogan}</p>
          </div>
        </aside>

      {/* Main column — offset by sidebar width on desktop so content
          doesn't slide under the fixed sidebar. */}
      <div className="flex min-h-screen min-w-0 flex-col lg:pl-[var(--portal-sidebar-w)]">
          {/* Top header — sticky dark glass over scrolling content. */}
          <header
            ref={topbarRef}
            className="gh-portal-topbar sticky top-0 z-[var(--z-header)] flex shrink-0 items-center justify-between gap-3 px-4 sm:px-6"
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
                    <span
                      key={crumb.href}
                      className={`min-w-0 items-center gap-1.5 ${
                        isLast ? "flex" : "hidden sm:flex"
                      }`}
                    >
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
                          className="max-w-[16ch] truncate font-medium text-[var(--portal-chrome-text)] transition hover:text-[var(--portal-chrome-text-active)]"
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
                  chooseLanguageLabel={c.chooseLanguage ?? DEFAULT_CHROME.chooseLanguage!}
                />
              ) : null}
              {/* Bell + user chip share one chrome pill (DESIGN.md §5.2). */}
              <div
                className="gh-portal-user-pill flex items-center rounded-full"
              >
                <NotificationPopover
                  items={notifications ?? []}
                  unreadCount={unreadCount}
                  viewAllHref={notificationsViewAllHref ?? null}
                  emptyMessage={notificationsEmptyMessage ?? c.allCaughtUp}
                  ariaLabel={c.notificationsAriaLabel}
                  heading={c.notificationsHeading}
                  unreadSuffix={c.notificationsUnreadSuffix}
                  unreadNotificationsSr={c.notificationsUnreadSr}
                  viewAllLabel={c.notificationsViewAll}
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

          <main id="main-content" className="gh-admin-main gh-portal-main min-w-0 flex-1">
            {children}
          </main>
        </div>
    </div>
    {tour ? <PortalTour steps={tour.steps} labels={tour.labels} storageKey={tour.storageKey} /> : null}
    </NotificationCenterContext.Provider>
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
      data-tour={href}
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
