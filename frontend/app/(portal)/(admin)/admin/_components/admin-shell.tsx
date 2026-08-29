"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IdleLogout } from "@/components/IdleLogout";
import {
  applyCrumbTitles,
  isEmailSegment,
  isIdSegment,
  isPagelessPrefix,
  PII_SAFE_CRUMB_LABEL,
  shortIdLabel,
  type Crumb,
} from "@/lib/breadcrumb-utils";
import { CrumbTitleContext, type CrumbTitleSetter } from "@/components/crumb-title";
import { RegisteredBrandLockup } from "@/components/brand/RegisteredBrandLockup";
import { usePortalMobileNavA11y } from "@/components/use-portal-mobile-nav";
import {
  BarChart3,
  CalendarRange,
  ChevronRight,
  CreditCard,
  FileText,
  Globe2,
  HeartPulse,
  ImageIcon,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  Menu,
  MessagesSquare,
  Newspaper,
  ReceiptText,
  ShoppingBag,
  Star,
  Stethoscope,
  Tags,
  UserRound,
  Users,
  Workflow,
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
import { PortalUserMenu } from "@/components/PortalUserMenu";

export type AdminShellUser = {
  fullName: string;
  email: string;
  role: string;
};

type Section = { href: string; label: string };

type SignOutAction = () => Promise<void> | void;
type SetCountryPreferenceAction = (slug: string) => Promise<void>;

/** A sidebar count badge. `title` says WHAT is pending and WHO raised it
 *  ("2 pending approvals — Dr A (service request), Dr B (name change)") so a
 *  bare number is never a dead end: it's both the hover tooltip and the
 *  screen-reader label. */
export type NavBadge = { count: number; title: string };

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
  "/admin/patients": HeartPulse,
  "/admin/messages": MessagesSquare,
  "/admin/support": LifeBuoy,
  "/admin/newsletter": Mail,
  "/admin/orders": ShoppingBag,
  "/admin/invoices": ReceiptText,
  "/admin/automation": Workflow,
  "/admin/reports": BarChart3,
  "/admin/settings/reviews": Star,
  "/admin/page-content": FileText,
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
  "/admin/messages",
  "/admin/support",
  "/admin/orders",
  "/admin/invoices",
  "/admin/automation",
  "/admin/newsletter",
  "/admin/subscriptions",
  "/admin/reports",
  "/admin/audit-log",
  "/admin/settings/reviews",
  // Global, not country-scoped: the page works with no country selected
  // (all patients) and carries its own `?countryCode=all` override. The
  // topbar picker still narrows it, same as Doctors and Invoices.
  "/admin/patients",
]);

// Sub-groups within the Global section — related admin-wide links clustered
// under labeled eyebrows so the (14-item) Global list stays scannable.
// Ordering within each group follows the href order here. Any Global item
// not listed falls into a trailing "More" group (see render) so nothing is
// silently dropped.
const GLOBAL_GROUPS: { label: string; hrefs: string[] }[] = [
  { label: "Overview", hrefs: ["/admin", "/admin/calendar"] },
  { label: "Catalog", hrefs: ["/admin/countries", "/admin/doctors", "/admin/assets", "/admin/blog"] },
  { label: "People", hrefs: ["/admin/users", "/admin/patients", "/admin/messages", "/admin/support"] },
  { label: "Commerce", hrefs: ["/admin/orders", "/admin/invoices", "/admin/subscriptions"] },
  {
    label: "System",
    hrefs: [
      "/admin/reports",
      "/admin/newsletter",
      "/admin/automation",
      "/admin/audit-log",
      "/admin/settings/reviews",
    ],
  },
];

const COUNTRY_HREFS = new Set([
  "/admin/plans",
  // Private membership programmes belong to exactly one country, so they sit
  // with the country-scoped items. Deliberately absent from
  // HREF_TO_FEATURE_KEY below — see the note there.
  "/admin/memberships",
  "/admin/country-features",
  "/admin/country-home",
  "/admin/country-content",
  "/admin/footer",
  "/admin/page-content",
  "/admin/services",
  "/admin/general-consultations",
  "/admin/specialist-consultations",
  "/admin/online-prescriptions",
  "/admin/health-tests",
  "/admin/appointments",
  "/admin/insurance",
  "/admin/test-centers",
  "/admin/lab-requisitions",
  // Czech-only in practice (SÚKL is the Czech drug authority), so it sits with
  // the country-scoped items rather than in the global list.
  "/admin/integrations/sukl",
]);

/** Map sidebar href → feature key stored in `Country.enabledFeatures`.
 *  Items not in this map are always shown when country-scoped. The
 *  controller route (`/admin/country-features`) is intentionally NOT
 *  in this map so it stays reachable when everything else is toggled
 *  off. */
const HREF_TO_FEATURE_KEY: Record<string, string> = {
  "/admin/country-home": "country-home",
  "/admin/country-content": "country-content",
  "/admin/page-content": "pages",
  "/admin/footer": "footer",
  "/admin/general-consultations": "general-consultations",
  "/admin/specialist-consultations": "specialist-consultations",
  "/admin/online-prescriptions": "online-prescriptions",
  "/admin/health-tests": "health-tests",
  "/admin/plans": "subscriptions",
  "/admin/appointments": "appointments",
  // NOTE: "/admin/memberships" is intentionally NOT listed. An entry here
  // hides the item unless the country's `enabledFeatures` array contains the
  // key, and no existing Country row's array can contain a key that did not
  // exist when it was written — so adding one would hide the section in every
  // market. Unmapped country-scoped items are always shown.
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
  "/admin/reports": 7.8,
  "/admin/audit-log": 8,
  // Country-scoped — by priority: controller → content → services →
  // bookings → footer last (site chrome, lowest priority).
  "/admin/country-features": 0,
  "/admin/page-content": 1,
  "/admin/services": 2,
  "/admin/general-consultations": 3,
  "/admin/specialist-consultations": 4,
  "/admin/online-prescriptions": 5,
  "/admin/health-tests": 6,
  "/admin/plans": 7,
  "/admin/memberships": 7.5,
  "/admin/appointments": 8,
  "/admin/patients": 8.2,
  "/admin/insurance": 8.5,
  "/admin/test-centers": 8.6,
  "/admin/lab-requisitions": 8.7,
  "/admin/integrations/sukl": 8.8,
  "/admin/footer": 9,
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

/** Bucket the flat Global list into labeled sub-groups per GLOBAL_GROUPS.
 *  Item order inside a group follows the group's href order. Anything not
 *  claimed by a group lands in a trailing "More" group so no item vanishes
 *  if a new route is added to the layout but not to GLOBAL_GROUPS. */
function bucketGlobalSections(global: Section[]): { label: string; items: Section[] }[] {
  const byHref = new Map(global.map((s) => [s.href, s]));
  const used = new Set<string>();
  const groups: { label: string; items: Section[] }[] = [];
  for (const g of GLOBAL_GROUPS) {
    const items: Section[] = [];
    for (const href of g.hrefs) {
      const s = byHref.get(href);
      if (s) {
        items.push(s);
        used.add(href);
      }
    }
    if (items.length > 0) groups.push({ label: g.label, items });
  }
  const leftovers = global.filter((s) => !used.has(s.href));
  if (leftovers.length > 0) groups.push({ label: "More", items: leftovers });
  return groups;
}

function humanizeSegment(seg: string, countries: CountryPickerOption[]): string {
  if (!seg) return "";
  const decoded = decodeURIComponent(seg);
  const country = countries.find((c) => c.slug === decoded || c.code.toLowerCase() === decoded.toLowerCase());
  if (country) return country.name;
  return decoded.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function useBreadcrumbs(
  pathname: string,
  countries: CountryPickerOption[],
  activeCountry: CountryPickerOption | null,
) {
  return useMemo(() => {
    if (!pathname.startsWith("/admin")) return [{ label: "Admin", href: "/admin" }];
    const segments = pathname.split("/").filter(Boolean);
    // href: null marks a passive context label with no distinct destination
    // of its own (e.g. the topbar-selected country isn't a real URL segment)
    // — rendered as plain text instead of a Link, so it doesn't duplicate
    // the "Admin" crumb's target.
    const crumbs: Crumb[] = [];
    let acc = "";
    // Country-scoped routes (e.g. /admin/page-content) implicitly operate on the
    // topbar-selected country rather than a country segment in the URL —
    // surface that context in the trail so "Admin / Pages" doesn't read as
    // global when it's actually scoped to whichever country is active.
    const isCountryScoped = segments.length >= 2 && COUNTRY_HREFS.has(`/${segments[0]}/${segments[1]}`);
    for (let i = 0; i < segments.length; i++) {
      acc += `/${segments[i]}`;
      if (i === 0) {
        crumbs.push({ label: "Admin", href: "/admin" });
        if (isCountryScoped && activeCountry) {
          crumbs.push({ label: activeCountry.name, href: null });
        }
        continue;
      }
      // A record segment (/plans/<id>, /patients/<email>) is an identifier, not
      // a destination — several of them have no page of their own (the route is
      // /plans/<id>/edit), so linking it 404s. Rendered as plain text instead.
      const isRecord = isEmailSegment(segments[i]) || isIdSegment(segments[i]);
      const label = isEmailSegment(segments[i])
        ? PII_SAFE_CRUMB_LABEL
        : isIdSegment(segments[i])
          ? shortIdLabel(segments[i])
          : humanizeSegment(segments[i], countries);
      // Grouping prefixes such as /memberships/<planId>/levels have no page
      // of their own either — plain text, same as a record segment.
      const linkable = !isRecord && !isPagelessPrefix(acc);
      crumbs.push({ label, href: linkable ? acc : null, isRecord, segment: segments[i] });
    }
    return crumbs;
  }, [pathname, countries, activeCountry]);
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
  navBadges?: Record<string, NavBadge>;
  children: ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();
  // Detail pages (rendered inside <main>) can name their own crumbs via
  // <SetCrumbTitle>, so a record route reads "… / Appointments / Thomas
  // Lubbe" instead of "… / cmrtif3u…". Keyed by path segment (or the empty
  // trailing key); empty on every route that sets none.
  const [crumbTitles, setCrumbTitles] = useState<Record<string, string>>({});
  const setCrumbTitle = useCallback<CrumbTitleSetter>((key, label) => {
    setCrumbTitles((prev) => {
      if (label === null) {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      }
      if (prev[key] === label) return prev;
      return { ...prev, [key]: label };
    });
  }, []);
  const derivedBreadcrumbs = useBreadcrumbs(pathname, countries, activeCountry);
  const breadcrumbs = useMemo(
    () => applyCrumbTitles(derivedBreadcrumbs, crumbTitles),
    [derivedBreadcrumbs, crumbTitles],
  );
  const navRef = useRef<HTMLElement | null>(null);
  const topbarRef = useRef<HTMLElement | null>(null);
  usePortalMobileNavA11y(navOpen, () => setNavOpen(false), navRef);
  const pathSegments = pathname.split("/").filter(Boolean);
  const isOnCountryScopedRoute =
    pathSegments.length >= 2 && COUNTRY_HREFS.has(`/${pathSegments[0]}/${pathSegments[1]}`);
  const showNoCountryBanner = isOnCountryScopedRoute && !activeCountry;
  const { global: globalSections, country: countrySections } = useMemo(
    () => partitionSections(sections, activeCountry?.enabledFeatures),
    [sections, activeCountry?.enabledFeatures],
  );
  const globalGroups = useMemo(
    () => bucketGlobalSections(globalSections),
    [globalSections],
  );
  const countryScopeLabel = activeCountry ? activeCountry.name : "Country";
  const countryDimmed = !activeCountry;

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
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    // translate="no" — the portal is an English-only data tool; Chrome's
    // auto-translate mutates text nodes under React and crashes hydration
    // (insertBefore "not a child" errors). Opt the whole portal out.
    <div className="gh-portal-shell min-h-screen notranslate" translate="no" data-portal="admin" data-density="dense">
      <IdleLogout />
      {/* Sidebar — fixed on every breakpoint so it stays put while the
          main column scrolls. On mobile it slides in/out via translate;
          on desktop it's always visible and the main column is offset by
          `lg:pl-[260px]`. */}
      <button
        type="button"
        aria-label="Close navigation"
        aria-hidden={!navOpen}
        tabIndex={navOpen ? 0 : -1}
        onClick={() => setNavOpen(false)}
        className={`gh-portal-nav-scrim lg:hidden${navOpen ? " gh-portal-nav-scrim--open" : ""}`}
      />

      <aside
        ref={navRef}
        role={navOpen ? "dialog" : undefined}
        aria-modal={navOpen ? true : undefined}
        aria-label={navOpen ? "Admin navigation" : undefined}
        className={`gh-portal-sidebar fixed inset-y-0 left-0 z-[var(--z-header)] flex w-[var(--portal-sidebar-w)] max-w-[86vw] flex-col transition-transform duration-200 ease-out lg:translate-x-0 ${
          navOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
        }`}
      >
          {/* Logo block — matches reference Shell.jsx exactly:
              padding 20 20 18, logo image filtered white, SUPER ADMIN eyebrow. */}
          <div
            className="gh-admin-sidebar-logo px-5 pb-[18px] pt-5"
          >
            <Link href="/admin" className="inline-flex items-center gap-2.5">
              <RegisteredBrandLockup tone="light">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logos/global-health-light.png"
                  alt="Global Health"
                  width={399}
                  height={260}
                  style={{ height: 44, width: "auto" }}
                />
              </RegisteredBrandLockup>
            </Link>
            <p
              className="gh-portal-label mt-2 text-portal-micro font-bold uppercase tracking-[0.22em]"
            >
              Super admin
            </p>
          </div>

          <nav className="gh-dark-scroll flex-1 overflow-y-auto">
            {/* ── Global section — sub-grouped for scannability ──── */}
            {globalGroups.map((group) => (
              <div key={group.label}>
                <SidebarSectionLabel label={group.label} />
                <div className="px-3 pt-1">
                  <div className="grid gap-0.5">
                    {group.items.map((section) => {
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
              </div>
            ))}

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
                        badge={navBadges?.[section.href]}
                        onNavigate={() => setNavOpen(false)}
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </nav>

          <div
            className="gh-portal-sidebar-footer px-5 py-4 text-portal-meta font-bold uppercase tracking-[0.06em]"
          >
            v1.0 · medicine anytime anywhere
          </div>
        </aside>

      {/* Main column — offset by sidebar width on desktop so content
          doesn't slide under the fixed sidebar. */}
      <div className="flex min-h-screen min-w-0 flex-col lg:pl-[var(--portal-sidebar-w)]">
          <header
            ref={topbarRef}
            className="gh-portal-topbar sticky top-0 z-[var(--z-header)] flex shrink-0 items-center justify-between gap-3 px-4 sm:px-6"
            style={{ height: "var(--portal-topbar-h)" }}
          >
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setNavOpen((v) => !v)}
                aria-label={navOpen ? "Close navigation" : "Open navigation"}
                aria-expanded={navOpen}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-[var(--portal-chrome-border)] text-[var(--portal-chrome-text-active)] lg:hidden"
              >
                {navOpen ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
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
                    <span key={`${crumb.href ?? "label"}-${i}`} className="flex items-center gap-1.5">
                      {isLast || !crumb.href ? (
                        <span
                          className={
                            isLast
                              ? "truncate font-bold text-[var(--portal-chrome-text-active)]"
                              : "truncate font-medium text-[var(--portal-chrome-text)]"
                          }
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
                {countries.length > 0 ? (
                  <div className="hidden sm:block">
                    <CountryPicker
                      countries={countries}
                      current={activeCountry}
                      setCountryPreferenceAction={setCountryPreferenceAction}
                    />
                  </div>
                ) : null}

              {/* Bell + user chip share one chrome pill (DESIGN.md §5.2). */}
              <div
                className="gh-portal-user-pill flex items-center rounded-full"
              >
                {/* Notification bell — surfaces pending approval requests
                    (doctor service selections awaiting review). */}
                <NotificationPopover
                  items={notifications?.items ?? []}
                  unreadCount={notifications?.unreadCount ?? 0}
                  viewAllHref="/admin/messages"
                  emptyMessage="You're all caught up. Patient messages and approval requests appear here."
                />

                <span
                  aria-hidden
                  className="gh-portal-user-divider"
                />

                <PortalUserMenu
                  user={user}
                  rootHref="/"
                  signOutAction={signOutAction}
                  labels={{ mainSite: "Main site", signOut: "Sign out" }}
                />
              </div>
            </div>
          </header>

          {/* Mobile country picker row — chrome-toned bar so the
              chrome-styled CountryPicker trigger (near-white text) stays
              legible; a white bar here would nearly hide the text. */}
          {countries.length > 0 ? (
            <div
              className="px-4 py-3 sm:hidden"
              style={{ background: "var(--portal-chrome-solid)", borderBottom: "1px solid var(--portal-chrome-border)" }}
            >
              <CountryPicker
                countries={countries}
                current={activeCountry}
                setCountryPreferenceAction={setCountryPreferenceAction}
              />
            </div>
          ) : null}

          {showNoCountryBanner ? (
            <div
              className="gh-admin-no-country-banner mx-4 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-card-sm)] border border-[var(--color-status-warning-border,#e0b649)] bg-[var(--color-status-warning-bg,#fff8e1)] px-4 py-2.5 text-sm sm:mx-6"
              role="status"
            >
              <span>
                <strong>This section requires a country</strong> — pick one from the top bar to see its content.
              </span>
            </div>
          ) : null}

          <main className="gh-admin-main gh-portal-main min-w-0 flex-1">
            <CrumbTitleContext.Provider value={setCrumbTitle}>
              {children}
            </CrumbTitleContext.Provider>
          </main>
        </div>

      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast:
              "rounded-md border border-[var(--portal-line)] bg-[var(--portal-surface)] px-3 py-2 text-sm shadow-md",
            title: "font-semibold text-[var(--portal-text)]",
            description: "text-[var(--portal-muted)]",
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
          background: "var(--portal-mint)",
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
  badge?: NavBadge;
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
      <span
        className="inline-flex shrink-0 justify-center"
        style={{ width: 16 }}
      >
        {icon}
      </span>
      <span className="truncate">{label}</span>
      {badge && badge.count > 0 ? (
        <span
          className="gh-portal-nav-item__badge gh-portal-nav-item__badge--live ml-auto"
          title={badge.title}
          aria-label={badge.title}
        >
          {badge.count > 99 ? "99+" : badge.count}
        </span>
      ) : null}
    </Link>
  );
}
