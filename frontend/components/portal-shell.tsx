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

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, Menu, X } from "lucide-react";
import {
  NotificationPopover,
  type NotificationPopoverItem,
} from "@/components/NotificationPopover";

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
  sections,
  portalLabel,
  sectionLabel,
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
  sections: PortalNavItem[];
  /** Mint eyebrow under logo (e.g., "Doctor portal"). */
  portalLabel: string;
  /** "GLOBAL" / "Account" label above the nav list. */
  sectionLabel: string;
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
  const pathname = usePathname();
  const breadcrumbs = useBreadcrumbs(pathname, rootHref, rootBreadcrumb);

  function isActive(href: string): boolean {
    if (href === rootHref) return pathname === rootHref;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="gh-portal-shell min-h-screen bg-[var(--color-background-soft)]">
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
        className={`gh-portal-sidebar fixed inset-y-0 left-0 z-40 flex w-[272px] max-w-[86vw] flex-col transition-transform duration-200 ease-out lg:translate-x-0 ${
          navOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
        }`}
      >
          <div
            className="gh-admin-sidebar-logo px-5 pb-[18px] pt-5"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
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
              className="mt-2 text-[10px] font-bold uppercase tracking-[0.22em]"
              style={{ color: "var(--color-accent)" }}
            >
              {portalLabel}
            </p>
          </div>

          <nav className="gh-dark-scroll flex-1 overflow-y-auto">
            <SidebarSectionLabel label={sectionLabel} />
            <div className="px-3 pb-6 pt-1">
              <div className="grid gap-0.5">
                {sections.map((s) => (
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
          </nav>

          <div
            className="px-5 py-4 text-[11px]"
            style={{
              borderTop: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.45)",
            }}
          >
            v1.0 · medicine anytime anywhere
          </div>
        </aside>

      {/* Main column — offset by sidebar width on desktop so content
          doesn't slide under the fixed sidebar. */}
      <div className="flex min-h-screen min-w-0 flex-col lg:pl-[272px]">
          {/* Top header — sticky, frosted-glass over scrolling content. */}
          <header
            className="gh-portal-topbar sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 sm:px-6"
          >
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setNavOpen((v) => !v)}
                aria-label={navOpen ? "Close navigation" : "Open navigation"}
                aria-expanded={navOpen}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-text-primary)] lg:hidden"
              >
                {navOpen ? (
                  <X className="size-4" aria-hidden />
                ) : (
                  <Menu className="size-4" aria-hidden />
                )}
              </button>
              <nav
                aria-label="Breadcrumb"
                className="flex min-w-0 items-center gap-1.5 overflow-hidden text-sm"
              >
                {breadcrumbs.map((crumb, i) => {
                  const isLast = i === breadcrumbs.length - 1;
                  return (
                    <span key={crumb.href} className="flex items-center gap-1.5">
                      {isLast ? (
                        <span className="truncate font-bold text-[var(--color-text-primary)]">
                          {crumb.label}
                        </span>
                      ) : (
                        <Link
                          href={crumb.href}
                          className="truncate font-medium text-[var(--color-text-muted)] transition hover:text-[var(--color-text-primary)]"
                        >
                          {crumb.label}
                        </Link>
                      )}
                      {!isLast ? (
                        <ChevronRight
                          className="size-3 shrink-0 text-[var(--color-text-muted)]"
                          aria-hidden
                        />
                      ) : null}
                    </span>
                  );
                })}
              </nav>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <NotificationPopover
                items={notifications ?? []}
                unreadCount={notificationsUnreadCount}
                viewAllHref={notificationsViewAllHref ?? null}
                emptyMessage={
                  notificationsEmptyMessage ?? "You're all caught up."
                }
              />

              {/* User menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                  className="inline-flex items-center gap-2 rounded-[999px] border border-[var(--color-border)] bg-[var(--color-background-page)] py-1 pl-1 pr-3 text-sm font-semibold text-[var(--color-text-primary)] transition hover:border-[var(--color-border-strong)]"
                  style={{ boxShadow: "var(--shadow-soft)" }}
                >
                  <span
                    className="inline-flex size-7 items-center justify-center rounded-full text-[11px] font-extrabold text-white"
                    style={{ background: "var(--color-brand-primary)" }}
                  >
                    {initials(user.fullName, user.email)}
                  </span>
                  <span className="hidden max-w-[140px] truncate md:inline">
                    {user.fullName || user.email.split("@")[0]}
                  </span>
                  <ChevronDown
                    className="size-3 text-[var(--color-text-muted)]"
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
                      className="absolute right-0 top-[calc(100%+8px)] z-40 min-w-[224px] rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-page)] p-3"
                      style={{ boxShadow: "var(--shadow-elevated)" }}
                    >
                      <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] pb-3">
                        <span
                          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold text-white"
                          style={{ background: "var(--color-brand-primary)" }}
                        >
                          {initials(user.fullName, user.email)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                            {user.fullName || user.email}
                          </p>
                          <p className="truncate text-xs text-[var(--color-text-muted)]">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-brand-primary)]">
                        {user.role}
                      </p>
                      <nav className="mt-2 flex flex-col gap-0.5">
                        <Link
                          href={accountHref ?? rootHref}
                          onClick={() => setUserMenuOpen(false)}
                          className="rounded-md px-2 py-1.5 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)]"
                        >
                          Account
                        </Link>
                        <Link
                          href="/"
                          onClick={() => setUserMenuOpen(false)}
                          className="rounded-md px-2 py-1.5 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)]"
                        >
                          Main site
                        </Link>
                      </nav>
                      <form action={signOutAction} className="mt-2 border-t border-[var(--color-border)] pt-2">
                        <button
                          type="submit"
                          className="w-full rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-background-panel)]"
                        >
                          Sign out
                        </button>
                      </form>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </header>

          <main className="gh-admin-main gh-portal-main min-w-0 flex-1 px-3 py-4 sm:px-5 sm:py-6 xl:px-7">
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
          background: "var(--color-brand-mint)",
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
      className="relative flex w-full items-center gap-2.5"
      style={{
        padding: "9px 12px",
        borderRadius: 8,
        background: active ? "rgba(255,255,255,0.10)" : "transparent",
        color: active ? "#D9F99D" : "rgba(255,255,255,0.80)",
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        textDecoration: "none",
        transition: "background 240ms cubic-bezier(0.25, 1.1, 0.4, 1), color 240ms ease-out",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.06)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      {/* Left accent bar on active item — visual parity with AdminShell. */}
      {active ? (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 -translate-y-1/2"
          style={{
            width: 3,
            height: 18,
            borderRadius: 2,
            background: "var(--color-brand-mint)",
          }}
        />
      ) : null}
      <span className="inline-flex shrink-0 justify-center" style={{ width: 16 }}>
        {icon}
      </span>
      <span className="truncate flex-1">{label}</span>
      {badge && badge > 0 ? (
        <span
          className="inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
          style={{
            background: "#D9F99D",
            color: "var(--color-background-dark)",
          }}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}
