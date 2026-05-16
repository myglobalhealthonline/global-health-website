"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  FileText,
  Globe2,
  ImageIcon,
  LayoutDashboard,
  Mail,
  Menu,
  Settings,
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
  "/admin/countries": Globe2,
  "/admin/specialties": Tags,
  "/admin/doctors": UserRound,
  "/admin/assets": ImageIcon,
  "/admin/users": Users,
  "/admin/newsletter": Mail,
  "/admin/settings": Settings,
  "/admin/pages": FileText,
  "/admin/services": Stethoscope,
};

// Global = admin-wide ops; Country = items scoped to a single country
// (dim when "All countries" is selected).
const GLOBAL_HREFS = new Set([
  "/admin",
  "/admin/countries",
  "/admin/doctors",
  "/admin/specialties",
  "/admin/assets",
  "/admin/newsletter",
  "/admin/settings",
]);

const COUNTRY_HREFS = new Set([
  "/admin/country-home",
  "/admin/country-content",
  "/admin/pages",
  "/admin/services",
  "/admin/general-consultations",
  "/admin/specialist-consultations",
  "/admin/online-prescriptions",
  "/admin/health-tests",
  "/admin/appointments",
]);

const ORDER: Record<string, number> = {
  "/admin": 0,
  "/admin/countries": 1,
  "/admin/specialties": 2,
  "/admin/doctors": 3,
  "/admin/assets": 4,
  "/admin/newsletter": 5,
  "/admin/settings": 6,
  "/admin/country-home": 0,
  "/admin/country-content": 1,
  "/admin/pages": 2,
  "/admin/services": 3,
  "/admin/general-consultations": 4,
  "/admin/specialist-consultations": 5,
  "/admin/online-prescriptions": 6,
  "/admin/health-tests": 7,
  "/admin/appointments": 8,
};

// Tighter labels — long phrases overflow the 260px sidebar.
const LABEL_OVERRIDES: Record<string, string> = {
  "/admin/general-consultations": "General consultations",
  "/admin/specialist-consultations": "Specialist consultations",
  "/admin/online-prescriptions": "Online prescriptions",
  "/admin/health-tests": "Health tests",
  "/admin/specialties": "Categories",
};

function partitionSections(sections: Section[]): {
  global: Section[];
  country: Section[];
} {
  const global: Section[] = [];
  const country: Section[] = [];
  for (const s of sections) {
    const label = LABEL_OVERRIDES[s.href] ?? s.label;
    const entry = { href: s.href, label };
    if (COUNTRY_HREFS.has(s.href)) country.push(entry);
    else if (GLOBAL_HREFS.has(s.href)) global.push(entry);
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
  const country = countries.find((c) => c.slug === seg || c.code.toLowerCase() === seg.toLowerCase());
  if (country) return country.name;
  return seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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
  children,
}: {
  user: AdminShellUser;
  countries: CountryPickerOption[];
  activeCountry: CountryPickerOption | null;
  sections: Section[];
  signOutAction: SignOutAction;
  setCountryPreferenceAction: SetCountryPreferenceAction;
  children: ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const breadcrumbs = useBreadcrumbs(pathname, countries);
  const { global: globalSections, country: countrySections } = useMemo(
    () => partitionSections(sections),
    [sections],
  );
  const countryScopeLabel = activeCountry ? activeCountry.name : "Country";
  const countryDimmed = !activeCountry;

  function isActive(href: string): boolean {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="min-h-screen bg-[var(--color-background-soft)]">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        {navOpen ? (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setNavOpen(false)}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          />
        ) : null}

        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col shadow-2xl transition-transform duration-200 ease-out lg:static lg:z-auto lg:translate-x-0 ${
            navOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
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
            className="px-5 pb-[18px] pt-5"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Link href="/admin" className="inline-flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logos/global-health-official.png"
                alt="Global Health"
                style={{
                  height: 36,
                  width: "auto",
                  filter: "brightness(0) invert(1)",
                }}
              />
            </Link>
            <p
              className="mt-2 text-[10px] font-bold uppercase tracking-[0.22em]"
              style={{ color: "var(--color-accent)" }}
            >
              Super admin
            </p>
          </div>

          <nav className="flex-1 overflow-y-auto">
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
                        // Dot bullet for country-scoped items, per reference
                        icon={<DotBullet />}
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
            v1.0 · medicine without borders
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-background-page)] px-4 sm:px-7" style={{ boxShadow: "0 1px 0 var(--color-border)" }}>
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

              {/* Notification bell */}
              <button
                type="button"
                aria-label="Notifications"
                className="relative inline-flex size-9 items-center justify-center rounded-[10px] border border-[var(--color-border)] bg-[var(--color-background-page)] text-[var(--color-text-muted)] transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
              >
                <Bell className="size-4" aria-hidden />
                {/* Notification dot — vivid lime for marketing-level attention */}
                <span
                  className="absolute right-[6px] top-[6px] size-[6px] rounded-full ring-2 ring-[var(--color-background-page)]"
                  style={{ background: "var(--color-brand-accent)" }}
                />
              </button>

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
                      <form
                        action={signOutAction}
                        className="mt-3"
                      >
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
      className="flex items-center gap-2 px-6 pb-1.5 pt-4"
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.50)",
      }}
    >
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
  onNavigate,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex w-full items-center gap-2.5 transition-all duration-150"
      style={{
        padding: "9px 12px",
        borderRadius: 10,
        background: active ? "rgba(200,230,160,0.16)" : "transparent",
        color: active ? "var(--color-accent)" : "rgba(255,255,255,0.80)",
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        textDecoration: "none",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      <span
        className="inline-flex shrink-0 justify-center"
        style={{ width: 16 }}
      >
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}
