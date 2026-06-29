"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarRange,
  ChevronDown,
  ChevronRight,
  CreditCard,
  FileText,
  Globe2,
  ImageIcon,
  Layers,
  LayoutDashboard,
  Mail,
  Menu,
  Newspaper,
  ShoppingBag,
  Stethoscope,
  Tags,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Toaster } from "sonner";
import { CountryPicker } from "./country-picker";
import type { CountryPickerOption } from "./country-picker-constants";
import { FlagBadge } from "./flag-badge";
import {
  NotificationPopover,
  type NotificationPopoverItem,
} from "@/components/NotificationPopover";

export type AdminShellUser = {
  fullName: string;
  email: string;
  role: string;
};

type Section = { href: string; label: string };

type SignOutAction = () => Promise<void> | void;
type SetCountryPreferenceAction = (slug: string) => Promise<void>;

// Icons used ONLY in the Global section — country-scoped items use dot bullets
// per the reference (admin-portal-reference Shell.jsx).
const GLOBAL_ICONS: Record<string, LucideIcon> = {
  "/admin": LayoutDashboard,
  "/admin/calendar": CalendarRange,
  "/admin/countries": Globe2,
  "/admin/specialties": Tags,
  "/admin/doctors": UserRound,
  "/admin/assets": ImageIcon,
  "/admin/users": Users,
  "/admin/newsletter": Mail,
  "/admin/orders": ShoppingBag,
  "/admin/pages": FileText,
  "/admin/services": Stethoscope,
  "/admin/blog": Newspaper,
  "/admin/subscriptions": CreditCard,
};

// Global = admin-wide ops; Country = items scoped to a single country
// (dim when "All countries" is selected).
const GLOBAL_HREFS = new Set([
  "/admin",
  "/admin/calendar",
  "/admin/countries",
  "/admin/doctors",
  "/admin/blog",
  "/admin/specialties",
  "/admin/assets",
  "/admin/users",
  "/admin/orders",
  "/admin/newsletter",
  "/admin/subscriptions",
  "/admin/audit-log",
]);

const COUNTRY_HREFS = new Set([
  "/admin/plans",
  "/admin/country-features",
  "/admin/country-home",
  "/admin/country-content",
  "/admin/footer",
  "/admin/pages",
  "/admin/services",
  "/admin/general-consultations",
  "/admin/specialist-consultations",
  "/admin/online-prescriptions",
  "/admin/health-tests",
  "/admin/appointments",
]);

/** Map sidebar href → feature key stored in `Country.enabledFeatures`.
 *  Items not in this map are always shown when country-scoped. The
 *  controller route (`/admin/country-features`) is intentionally NOT
 *  in this map so it stays reachable when everything else is toggled
 *  off. */
const HREF_TO_FEATURE_KEY: Record<string, string> = {
  "/admin/country-home": "country-home",
  "/admin/country-content": "country-content",
  "/admin/pages": "pages",
  "/admin/footer": "footer",
  "/admin/general-consultations": "general-consultations",
  "/admin/specialist-consultations": "specialist-consultations",
  "/admin/online-prescriptions": "online-prescriptions",
  "/admin/health-tests": "health-tests",
  "/admin/plans": "subscriptions",
  "/admin/appointments": "appointments",
};

const ORDER: Record<string, number> = {
  "/admin": 0,
  "/admin/calendar": 0.5,
  "/admin/countries": 1,
  "/admin/specialties": 2,
  "/admin/doctors": 3,
  "/admin/assets": 4,
  "/admin/users": 5,
  "/admin/orders": 6,
  "/admin/newsletter": 7,
  "/admin/subscriptions": 7.5,
  "/admin/audit-log": 8,
  "/admin/country-features": 0,
  "/admin/country-home": 1,
  "/admin/country-content": 2,
  "/admin/footer": 3,
  "/admin/pages": 4,
  "/admin/services": 5,
  "/admin/general-consultations": 6,
  "/admin/specialist-consultations": 7,
  "/admin/online-prescriptions": 8,
  "/admin/health-tests": 9,
  "/admin/plans": 9.5,
  "/admin/appointments": 10,
};

// Tighter labels — long phrases overflow the 260px sidebar.
const LABEL_OVERRIDES: Record<string, string> = {
  "/admin/general-consultations": "General consultations",
  "/admin/specialist-consultations": "Specialist consultations",
  "/admin/online-prescriptions": "Prescriptions",
  "/admin/health-tests": "Health tests",
};

function partitionSections(
  sections: Section[],
  enabledFeatures: string[] | undefined,
): {
  global: Section[];
  country: Section[];
} {
  const global: Section[] = [];
  const country: Section[] = [];
  // Undefined enabledFeatures (legacy row before the schema column existed)
  // = treat every feature as enabled. Backward-compat for any country row
  // that pre-dates the visibility toggle.
  const enabledSet = enabledFeatures ? new Set(enabledFeatures) : null;
  for (const s of sections) {
    const label = LABEL_OVERRIDES[s.href] ?? s.label;
    const entry = { href: s.href, label };
    if (COUNTRY_HREFS.has(s.href)) {
      // Filter country items by the per-country toggle. The controller
      // route itself (/admin/country-features) is excluded from the map
      // so it always stays visible — admin needs it to re-enable things.
      const featureKey = HREF_TO_FEATURE_KEY[s.href];
      if (featureKey && enabledSet && !enabledSet.has(featureKey)) continue;
      country.push(entry);
    } else if (GLOBAL_HREFS.has(s.href)) global.push(entry);
    else global.push(entry);
  }
  global.sort((a, b) => (ORDER[a.href] ?? 99) - (ORDER[b.href] ?? 99));
  country.sort((a, b) => (ORDER[a.href] ?? 99) - (ORDER[b.href] ?? 99));
  return { global, country };
}

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

function humanizeSegment(seg: string, countries: CountryPickerOption[]): string {
  if (!seg) return "";
  const decoded = decodeURIComponent(seg);
  const country = countries.find((c) => c.slug === decoded || c.code.toLowerCase() === decoded.toLowerCase());
  if (country) return country.name;
  if (decoded.includes("@")) return decoded;
  return decoded.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function useBreadcrumbs(pathname: string, countries: CountryPickerOption[]) {
  return useMemo(() => {
    if (!pathname.startsWith("/admin")) return [{ label: "Admin", href: "/admin" }];
    const segments = pathname.split("/").filter(Boolean);
    const crumbs: { label: string; href: string }[] = [];
    let acc = "";
    for (let i = 0; i < segments.length; i++) {
      acc += `/${segments[i]}`;
      if (i === 0) {
        crumbs.push({ label: "Admin", href: "/admin" });
        continue;
      }
      const isCuid = segments[i].length === 25 && /^[a-z0-9]+$/i.test(segments[i]);
      const label = isCuid ? `${segments[i].slice(0, 8)}…` : humanizeSegment(segments[i], countries);
      crumbs.push({ label, href: acc });
    }
    return crumbs;
  }, [pathname, countries]);
}

export function AdminShell({
  user,
  countries,
  activeCountry,
  sections,
  signOutAction,
  setCountryPreferenceAction,
  notifications,
  navBadges,
  children,
}: {
  user: AdminShellUser;
  countries: CountryPickerOption[];
  activeCountry: CountryPickerOption | null;
  sections: Section[];
  signOutAction: SignOutAction;
  setCountryPreferenceAction: SetCountryPreferenceAction;
  /** Topbar bell feed. Defaults to an empty caught-up state. */
  notifications?: { items: NotificationPopoverItem[]; unreadCount: number };
  /** Sidebar count badges keyed by href (e.g. pending approvals on Doctors). */
  navBadges?: Record<string, number>;
  children: ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const breadcrumbs = useBreadcrumbs(pathname, countries);
  const { global: globalSections, country: countrySections } = useMemo(
    () => partitionSections(sections, activeCountry?.enabledFeatures),
    [sections, activeCountry?.enabledFeatures],
  );
  const countryScopeLabel = activeCountry ? activeCountry.name : "Country";
  const countryDimmed = !activeCountry;

  function isActive(href: string): boolean {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="min-h-screen bg-[var(--color-background-soft)]">
      {/* Sidebar — fixed on every breakpoint so it stays put while the
          main column scrolls. On mobile it slides in/out via translate;
          on desktop it's always visible and the main column is offset by
          `lg:pl-[260px]`. */}
      {navOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col transition-transform duration-200 ease-out lg:translate-x-0 ${
          navOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{
          background: "var(--color-background-dark)",
          color: "rgba(255,255,255,0.85)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
          {/* Logo block — matches reference Shell.jsx exactly:
              padding 20 20 18, logo image filtered white, SUPER ADMIN eyebrow. */}
          <div
            className="gh-admin-sidebar-logo px-5 pb-[18px] pt-5"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Link href="/admin" className="inline-flex items-center gap-2.5">
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
              Super admin
            </p>
          </div>

          <nav className="gh-dark-scroll flex-1 overflow-y-auto">
            {/* ── Global section ────────────────────────────────── */}
            <SidebarSectionLabel label="Global" />
            <div className="px-3 pt-1">
              <div className="grid gap-0.5">
                {globalSections.map((section) => {
                  const Icon = GLOBAL_ICONS[section.href] ?? LayoutDashboard;
                  return (
                    <SidebarItem
                      key={section.href}
                      href={section.href}
                      icon={<Icon className="size-4" aria-hidden />}
                      label={section.label}
                      active={isActive(section.href)}
                      badge={navBadges?.[section.href]}
                      onNavigate={() => setNavOpen(false)}
                    />
                  );
                })}
              </div>
            </div>

            {/* ── Country-scoped section (dims when no country) ──── */}
            {countrySections.length > 0 ? (
              <>
                <SidebarSectionLabel
                  label={countryScopeLabel}
                  trailing={
                    activeCountry ? (
                      <FlagBadge code={activeCountry.slug} size={14} />
                    ) : null
                  }
                />
                <div
                  className="px-3 pb-6 pt-1"
                  style={{
                    opacity: countryDimmed ? 0.45 : 1,
                    pointerEvents: countryDimmed ? "none" : "auto",
                    transition: "opacity 180ms ease-out",
                  }}
                >
                  <div className="grid gap-0.5">
                    {countrySections.map((section) => (
                      <SidebarItem
                        key={section.href}
                        href={section.href}
                        // The visibility controller gets a real icon to set
                        // it apart from the dot-bulleted feature pages.
                        icon={
                          section.href === "/admin/country-features" ? (
                            <Layers className="size-4" aria-hidden />
                          ) : (
                            <DotBullet />
                          )
                        }
                        label={section.label}
                        active={isActive(section.href)}
                        onNavigate={() => setNavOpen(false)}
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : null}
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
      <div className="flex min-h-screen min-w-0 flex-col lg:pl-[260px]">
          <header
            className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 sm:px-7"
            style={{
              background: "color-mix(in srgb, var(--color-background-page) 88%, transparent)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: "0 1px 0 var(--color-border)",
            }}
          >
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setNavOpen((v) => !v)}
                aria-label={navOpen ? "Close navigation" : "Open navigation"}
                aria-expanded={navOpen}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-text-primary)] lg:hidden"
              >
                {navOpen ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
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
                {countries.length > 0 ? (
                  <div className="hidden sm:block">
                    <CountryPicker
                      countries={countries}
                      current={activeCountry}
                      setCountryPreferenceAction={setCountryPreferenceAction}
                    />
                  </div>
                ) : null}

              {/* Notification bell — surfaces pending approval requests
                  (doctor service selections awaiting review). */}
              <NotificationPopover
                items={notifications?.items ?? []}
                unreadCount={notifications?.unreadCount ?? 0}
                viewAllHref={
                  notifications && notifications.unreadCount > 0
                    ? "/admin/doctors"
                    : null
                }
                emptyMessage="You're all caught up. New approval requests will appear here."
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
                  <ChevronDown className="size-3 text-[var(--color-text-muted)]" aria-hidden />
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
                      <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--color-border)]">
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
                          <p className="truncate text-xs text-[var(--color-text-muted)]">{user.email}</p>
                        </div>
                      </div>
                      <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-brand-primary)]">
                        {user.role}
                      </p>
                      <nav className="mt-2 flex flex-col gap-0.5">
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
                          className="w-full rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-background-panel)] hover:border-[var(--color-border-strong)]"
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

          {/* Mobile country picker row */}
          {countries.length > 0 ? (
            <div className="border-b border-[var(--color-border)] bg-white px-4 py-3 sm:hidden">
              <CountryPicker
                countries={countries}
                current={activeCountry}
                setCountryPreferenceAction={setCountryPreferenceAction}
              />
            </div>
          ) : null}

          <main className="gh-admin-main min-w-0 flex-1 px-4 py-6 sm:px-7 sm:py-8">{children}</main>
        </div>

      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast:
              "rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm shadow-md",
            title: "font-semibold text-[var(--color-text-primary)]",
            description: "text-[var(--color-text-muted)]",
          },
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Sidebar atoms — match reference Shell.jsx exactly
   ───────────────────────────────────────────────────────────── */

function SidebarSectionLabel({
  label,
  trailing,
}: {
  label: string;
  trailing?: ReactNode;
}) {
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
          background:
            "linear-gradient(90deg, var(--color-accent) 0%, transparent 100%)",
        }}
      />
      <span>{label}</span>
      {trailing}
    </div>
  );
}

function DotBullet() {
  return (
    <span
      aria-hidden
      className="inline-block"
      style={{
        width: 4,
        height: 4,
        borderRadius: 999,
        background: "rgba(255,255,255,0.4)",
      }}
    />
  );
}

function SidebarItem({
  href,
  icon,
  label,
  active,
  badge,
  onNavigate,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  active: boolean;
  badge?: number;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="relative flex w-full items-center gap-2.5"
      style={{
        padding: "9px 12px",
        borderRadius: 10,
        background: active
          ? "linear-gradient(90deg, rgba(176,241,34,0.18) 0%, rgba(176,241,34,0.04) 100%)"
          : "transparent",
        color: active ? "var(--color-accent)" : "rgba(255,255,255,0.80)",
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
      {/* Left accent bar on active item — subtle but clearer than the
          background tint alone. */}
      {active ? (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 -translate-y-1/2"
          style={{
            width: 3,
            height: 18,
            borderRadius: 2,
            background: "var(--color-accent)",
          }}
        />
      ) : null}
      <span
        className="inline-flex shrink-0 justify-center"
        style={{ width: 16 }}
      >
        {icon}
      </span>
      <span className="truncate">{label}</span>
      {badge && badge > 0 ? (
        <span
          className="ml-auto inline-flex shrink-0 items-center justify-center"
          aria-label={`${badge} pending`}
          style={{
            minWidth: 18,
            height: 18,
            padding: "0 6px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 800,
            lineHeight: 1,
            color: "#0a1f14",
            background: "var(--color-accent)",
          }}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}
