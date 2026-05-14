"use client";

import { useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Calendar,
  ChevronDown,
  ChevronRight,
  Coins,
  Globe2,
  Home,
  Images,
  Layers,
  Menu,
  Package,
  Pill,
  Stethoscope,
  TestTube2,
  X,
  type LucideIcon,
} from "lucide-react";
import { Toaster } from "sonner";
import { CountryPicker, type CountryPickerOption } from "./country-picker";

export type AdminShellUser = {
  fullName: string;
  email: string;
  role: string;
};

type Section = { href: string; label: string };

type SignOutAction = () => Promise<void> | void;

const ICONS: Record<string, LucideIcon> = {
  "/admin": Home,
  "/admin/appointments": Calendar,
  "/admin/countries": Globe2,
  "/admin/specialties": Layers,
  "/admin/general-consultations": Stethoscope,
  "/admin/specialist-consultations": Stethoscope,
  "/admin/online-prescriptions": Pill,
  "/admin/home-delivery": Package,
  "/admin/health-tests": TestTube2,
  "/admin/doctors": Stethoscope,
  "/admin/pricing": Coins,
  "/admin/assets": Images,
};

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
  children,
}: {
  user: AdminShellUser;
  countries: CountryPickerOption[];
  activeCountry: CountryPickerOption | null;
  sections: Section[];
  signOutAction: SignOutAction;
  children: ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const breadcrumbs = useBreadcrumbs(pathname, countries);

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
          className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col text-white shadow-2xl transition-transform duration-200 ease-out lg:static lg:z-auto lg:translate-x-0 ${
            navOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
          style={{
            background: "var(--color-background-dark)",
            borderRight: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Logo block */}
          <div className="border-b border-white/[0.08] px-5 pb-5 pt-6">
            <Link href="/admin" className="inline-flex items-center gap-2.5">
              <Image
                src="/logos/global-health-official.png"
                alt="Global Health"
                width={140}
                height={48}
                priority
                className="h-9 w-auto"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </Link>
            <p
              className="mt-2 text-[10px] font-bold uppercase tracking-[0.22em]"
              style={{ color: "var(--color-brand-accent)" }}
            >
              Admin portal
            </p>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">
              Global
            </p>
            <div className="mt-1 grid gap-0.5">
              {sections.map((section) => {
                const Icon = ICONS[section.href] ?? Layers;
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
          </nav>

          <div className="border-t border-white/[0.08] px-5 py-4 text-[11px] text-white/45">
            v1.0 · medicine without borders
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-white px-4 sm:px-7">
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
                  <CountryPicker countries={countries} current={activeCountry} />
                </div>
              ) : null}

              <button
                type="button"
                aria-label="Notifications"
                className="relative inline-flex size-10 items-center justify-center rounded-[10px] border border-[var(--color-border)] bg-white text-[var(--color-text-body)] transition hover:border-[var(--color-border-strong)]"
              >
                <Bell className="size-4" aria-hidden />
                <span
                  className="absolute right-[7px] top-[7px] size-[7px] rounded-full border-2 border-white"
                  style={{ background: "var(--color-brand-accent)" }}
                />
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white py-1 pl-1 pr-3 text-sm font-semibold text-[var(--color-text-primary)] transition hover:border-[var(--color-border-strong)]"
                >
                  <span
                    className="inline-flex size-8 items-center justify-center rounded-full text-xs font-extrabold text-white"
                    style={{ background: "var(--color-brand-primary)" }}
                  >
                    {initials(user.fullName, user.email)}
                  </span>
                  <span className="hidden md:inline">
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
                    <div className="absolute right-0 top-[calc(100%+6px)] z-40 min-w-[220px] rounded-xl border border-[var(--color-border)] bg-white p-3 shadow-[var(--shadow-elevated)]">
                      <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                        {user.fullName || user.email}
                      </p>
                      <p className="truncate text-xs text-[var(--color-text-muted)]">{user.email}</p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
                        {user.role}
                      </p>
                      <form
                        action={signOutAction}
                        className="mt-3 border-t border-[var(--color-border)] pt-3"
                      >
                        <button type="submit" className="gh-btn gh-btn-soft w-full text-sm">
                          Log out
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
              <CountryPicker countries={countries} current={activeCountry} />
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
      className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-sm transition"
      style={{
        background: active ? "rgba(200,230,160,0.16)" : "transparent",
        color: active ? "var(--color-brand-accent)" : "rgba(255,255,255,0.80)",
        fontWeight: active ? 700 : 500,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      <span className="inline-flex w-4 justify-center">{icon}</span>
      {label}
    </Link>
  );
}
