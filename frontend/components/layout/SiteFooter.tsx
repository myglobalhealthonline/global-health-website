"use client";

/**
 * Public site footer. Country/lang aware via `usePathname()` — Care links
 * resolve to the active country/lang scope when the user is inside a country,
 * else they fall through to the entry gate at `/`.
 *
 * Care links resolve to the live public country pages that now exist:
 * consultations, prescriptions, tests, and doctors.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { countries } from "@/data/countries";
import {
  COUNTRY_CODE_TO_SLUG,
  countryCodeFromSlug,
} from "@/lib/routing/country-slug";
import { parseSitePath } from "@/lib/routing/path-rewrites";
import { NewsletterSignup } from "./NewsletterSignup";

export function SiteFooter({
  siteName,
  countryFeatures,
}: {
  siteName: string;
  /** Code → enabled feature slugs (same shape SiteHeader receives).
   *  Used to gate Prescriptions / Health tests links so the footer
   *  doesn't expose pages the country has toggled off — those pages
   *  hard-404, which used to look like broken footer links. */
  countryFeatures?: Record<string, string[] | undefined>;
}) {
  const pathname = usePathname() || "/";
  const parsed = parseSitePath(pathname);
  const year = new Date().getFullYear();

  const careBase =
    parsed.country && parsed.lang ? `/${parsed.country}/${parsed.lang}` : null;
  // Resolve the active country's enabled feature list so we can hide
  // Care entries the admin has disabled. Outside a country (`careBase`
  // is null) we still render the labels — they fall through to the
  // entry gate at "/" where the user picks a country.
  const activeCountryCode = parsed.country
    ? countryCodeFromSlug(parsed.country)
    : null;
  const activeFeatures = activeCountryCode
    ? countryFeatures?.[activeCountryCode]
    : undefined;
  const isFeatureEnabled = (slug: string) => {
    if (!careBase) return true; // pre-country: keep links so the gate can route
    if (!activeFeatures) return true; // no toggle data → assume on (legacy default)
    return activeFeatures.includes(slug);
  };
  // Cart-first booking: footer "Book consultation" entry now lands on
  // the GP catalogue (service-first); /book-online stays as a fallback
  // path but isn't surfaced from the footer.
  const careLinks = [
    isFeatureEnabled("general-consultations")
      ? { label: "Book consultation", href: careBase ? `${careBase}/general-consultation` : "/" }
      : null,
    isFeatureEnabled("general-consultations")
      ? { label: "GP consultation", href: careBase ? `${careBase}/general-consultation` : "/" }
      : null,
    isFeatureEnabled("specialist-consultations")
      ? { label: "Specialist consultation", href: careBase ? `${careBase}/specialist-consultation` : "/" }
      : null,
    isFeatureEnabled("online-prescriptions")
      ? { label: "Prescriptions", href: careBase ? `${careBase}/prescriptions` : "/" }
      : null,
    isFeatureEnabled("health-tests")
      ? { label: "Health tests", href: careBase ? `${careBase}/tests` : "/" }
      : null,
    { label: "Our doctors", href: careBase ? `${careBase}/doctors` : "/" },
  ].filter((x): x is { label: string; href: string } => x !== null);

  const clinicsLinks = countries.map((c) => ({
    label: c.name,
    href: `/${COUNTRY_CODE_TO_SLUG[c.code]}`,
  }));

  const accountLinks = [
    { label: "Sign in", href: "/login" },
    { label: "Create account", href: "/register" },
    { label: "Forgot password?", href: "/forgot-password" },
    { label: "My account", href: "/account" },
  ];

  const companyLinks = [
    { label: "Blog", href: "/blog" },
    { label: "Contact us", href: "/contact" },
    { label: "About", href: "/about" },
  ];

  const groups = [
    { h: "Care", items: careLinks },
    { h: "Clinics", items: clinicsLinks },
    { h: "Account", items: accountLinks },
    { h: "Company", items: companyLinks },
  ];

  return (
    <footer
      style={{
        background: "var(--color-background-dark)",
        color: "rgba(255,255,255,0.70)",
        padding: "64px 0 28px",
      }}
    >
      <div
        className="mx-auto"
        style={{ maxWidth: 1320, padding: "0 clamp(20px, 4vw, 40px)" }}
      >
        <div className="gh-footer-grid grid gap-10">
          <div>
            <Link
              href="/"
              className="inline-flex items-center"
              style={{ textDecoration: "none" }}
              aria-label={siteName || "Global Health"}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logos/global-health-light.png"
                alt={siteName || "Global Health"}
                style={{ height: 44, width: "auto" }}
              />
            </Link>
            <p
              className="mt-4"
              style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 320 }}
            >
              Medicine without borders. Online medical consultations with
              locally-registered doctors across Europe.
            </p>
            <p
              className="mt-4"
              style={{ fontSize: 13, color: "rgba(255,255,255,0.50)" }}
            >
              <a
                href="mailto:info@myglobalhealth.online"
                style={{ color: "inherit", textDecoration: "none" }}
              >
                info@myglobalhealth.online
              </a>
            </p>
          </div>

          {groups.map((group) => (
            <div key={group.h}>
              <p
                className="m-0 uppercase text-white"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  marginBottom: 14,
                }}
              >
                {group.h}
              </p>
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                {group.items.map((item) => (
                  <li key={item.label + item.href}>
                    <Link
                      href={item.href}
                      className="text-[rgba(255,255,255,0.70)] transition-colors hover:text-white"
                      style={{ fontSize: 14, textDecoration: "none" }}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <NewsletterSignup
            countryCode={parsed.country ?? null}
            locale={parsed.lang ?? null}
          />
        </div>

        <div
          className="flex flex-wrap justify-between gap-3"
          style={{
            marginTop: 56,
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.10)",
            fontSize: 12,
            color: "rgba(255,255,255,0.65)",
          }}
        >
          <span suppressHydrationWarning>
            © {year} {siteName || "Global Health"} · Medicine without borders
          </span>
          <span className="flex gap-3">
            <Link href="/privacy" className="hover:text-white" style={{ color: "inherit", textDecoration: "none" }}>
              Privacy
            </Link>
            <span aria-hidden>·</span>
            <span>EU-registered telemedicine provider · GDPR compliant</span>
          </span>
        </div>
      </div>

    </footer>
  );
}
