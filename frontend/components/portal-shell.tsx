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

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, Menu, X } from "lucide-react";
import {
  NotificationPopover,
  type NotificationPopoverItem,
} from "@/components/NotificationPopover";
import { Pill, Btn } from "@/components/portal-atoms";

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

function initials(name: string, email: string): string {
  if (name?.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");
  }
  return email[0]?.toUpperCase() ?? "?";
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
      const isCuid =
        segments[i].length === 25 && /^[a-z0-9]+$/i.test(segments[i]);
      const label = isCuid
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
  children: ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const breadcrumbs = useBreadcrumbs(pathname, rootHref, rootBreadcrumb);

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

  return (
    <div className="gh-portal-shell min-h-screen" data-portal={portalKey} data-density="comfortable">
      {/* Mobile overlay */}
      {navOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      {/* Sidebar — fixed on every breakpoint. Mobile slide-in via
          translate; on desktop the main column gets `lg:pl-[260px]`
          so content doesn't slide under it. */}
      <aside
        className={`gh-portal-sidebar fixed inset-y-0 left-0 z-40 flex w-[var(--portal-sidebar-w)] max-w-[86vw] flex-col transition-transform duration-200 ease-out lg:translate-x-0 ${
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
            className={`gh-portal-topbar${scrolled ? " gh-portal-topbar--scrolled" : ""} sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 px-4 sm:px-6`}
          >
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setNavOpen((v) => !v)}
                aria-label={navOpen ? "Close navigation" : "Open navigation"}
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
              {/* Bell + user chip share one chrome pill (DESIGN.md §5.2). */}
              <div
                className="gh-portal-user-pill flex items-center rounded-full"
              >
                <NotificationPopover
                  items={notifications ?? []}
                  unreadCount={notificationsUnreadCount}
                  viewAllHref={notificationsViewAllHref ?? null}
                  emptyMessage={
                    notificationsEmptyMessage ?? "You're all caught up."
                  }
                />

                <span
                  aria-hidden
                  className="gh-portal-user-divider"
                />

                {/* User menu */}
                <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                  className="inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-semibold text-[var(--portal-chrome-text-active)] transition hover:bg-white/5"
                >
                  <span
                    className="gh-portal-avatar inline-flex size-7 items-center justify-center rounded-[9px] text-[11px] font-extrabold text-white"
                  >
                    {initials(user.fullName, user.email)}
                  </span>
                  <span className="hidden max-w-[140px] truncate md:inline">
                    {user.fullName || user.email.split("@")[0]}
                  </span>
                  <ChevronDown
                    className="size-3 opacity-70"
                    aria-hidden
                  />
                </button>
                {userMenuOpen ? (
                  <>
                    <button
                      type="button"
                      aria-label="Close menu"
                      onClick={() => setUserMenuOpen(false)}
                      className="fixed inset-0 z-30"
                    />
                    <div
                      className="gh-portal-user-menu absolute right-0 top-[calc(100%+8px)] z-40 min-w-[224px] p-3"
                      style={{
                        borderRadius: "var(--portal-radius-xl)",
                        border: "1px solid var(--portal-line)",
                        background: "var(--portal-surface-elevated)",
                        boxShadow: "var(--portal-shadow-popover)",
                      }}
                    >
                      <div className="flex items-center gap-2.5 pb-3" style={{ borderBottom: "1px solid var(--portal-line)" }}>
                        <span
                          className="gh-portal-avatar inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] text-[11px] font-extrabold text-white"
                        >
                          {initials(user.fullName, user.email)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold" style={{ color: "var(--portal-text)" }}>
                            {user.fullName || user.email}
                          </p>
                          <p className="truncate text-xs" style={{ color: "var(--portal-muted)" }}>
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <Pill tone="neutral">{user.role}</Pill>
                      </div>
                      <nav className="mt-2 flex flex-col gap-0.5">
                        <Link
                          href={accountHref ?? rootHref}
                          onClick={() => setUserMenuOpen(false)}
                          className="rounded-md px-2 py-1.5 text-sm font-semibold hover:bg-[var(--portal-well)]"
                          style={{ color: "var(--portal-text)" }}
                        >
                          Account
                        </Link>
                        <Link
                          href="/"
                          onClick={() => setUserMenuOpen(false)}
                          className="rounded-md px-2 py-1.5 text-sm font-semibold hover:bg-[var(--portal-well)]"
                          style={{ color: "var(--portal-text)" }}
                        >
                          Main site
                        </Link>
                      </nav>
                      <form action={signOutAction} className="mt-2 pt-2" style={{ borderTop: "1px solid var(--portal-line)" }}>
                        <Btn type="submit" variant="danger" size="sm" className="w-full justify-center">
                          Sign out
                        </Btn>
                      </form>
                    </div>
                  </>
                ) : null}
                </div>
              </div>
            </div>
          </header>

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
