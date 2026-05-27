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
import type { PublicCountryFooter } from "@/lib/content/get-country-footers";
import { NewsletterSignup } from "./NewsletterSignup";

// Brand icons aren't shipped by lucide-react in this project (they were
// removed in favour of dedicated SimpleIcons-style packages). Inline
// SVGs sized 16px to match the footer ribbon. `currentColor` lets the
// parent `text-` class drive fill/stroke. Same pattern as DoctorCard.
function IconInstagram(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={props.className} aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}
function IconFacebook(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={props.className} aria-hidden>
      <path d="M22 12a10 10 0 1 0-11.5 9.88v-6.99H8v-2.89h2.5V9.85c0-2.48 1.49-3.85 3.74-3.85 1.08 0 2.21.2 2.21.2v2.44h-1.25c-1.23 0-1.61.77-1.61 1.55v1.87h2.74l-.44 2.89H13.6v6.99A10 10 0 0 0 22 12z" />
    </svg>
  );
}
function IconLinkedin(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={props.className} aria-hidden>
      <path d="M4.98 3.5a2.5 2.5 0 1 1-.02 5 2.5 2.5 0 0 1 .02-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-.93 1.83-1.92 3.77-1.92 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.36c0-1.28-.02-2.92-1.78-2.92-1.78 0-2.05 1.39-2.05 2.83V21H9z" />
    </svg>
  );
}
function IconTwitter(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={props.className} aria-hidden>
      <path d="M18.244 2H21.5l-7.5 8.57L23 22h-6.86l-5.37-7.04L4.5 22H1.245l8.04-9.18L1 2h7.04l4.85 6.41L18.244 2zm-2.4 18h1.81L7.27 4h-1.9l10.474 16z" />
    </svg>
  );
}
function IconYoutube(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={props.className} aria-hidden>
      <path d="M23.5 6.5a3 3 0 0 0-2.1-2.12C19.5 4 12 4 12 4s-7.5 0-9.4.38A3 3 0 0 0 .5 6.5 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.5 3 3 0 0 0 2.1 2.12C4.5 20 12 20 12 20s7.5 0 9.4-.38a3 3 0 0 0 2.1-2.12A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.5zM9.6 15.5v-7l6.4 3.5-6.4 3.5z" />
    </svg>
  );
}

export function SiteFooter({
  siteName,
  countryFeatures,
  countryFooters,
}: {
  siteName: string;
  /** Code → enabled feature slugs (same shape SiteHeader receives).
   *  Used to gate Prescriptions / Health tests links so the footer
   *  doesn't expose pages the country has toggled off — those pages
   *  hard-404, which used to look like broken footer links. */
  countryFeatures?: Record<string, string[] | undefined>;
  /** Per-country footer overrides keyed by lowercase country code.
   *  When the visitor is inside `/<country>/<lang>/*` and an override
   *  exists, it replaces the brand block + adds the admin-managed
   *  contact, social, custom columns, and copyright. */
  countryFooters?: Record<string, PublicCountryFooter | null>;
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
  // Admin-managed per-country override. Only applies when visitor is
  // inside a country scope (gateway page + global pages keep defaults).
  const override = activeCountryCode
    ? countryFooters?.[activeCountryCode] ?? null
    : null;
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
      ? { label: "Book a GP Appointment", href: careBase ? `${careBase}/gp-appointment` : "/" }
      : null,
    isFeatureEnabled("specialist-consultations")
      ? { label: "See a Specialist", href: careBase ? `${careBase}/see-a-specialist` : "/" }
      : null,
    isFeatureEnabled("online-prescriptions")
      ? { label: "Repeat Prescription Request", href: careBase ? `${careBase}/repeat-prescription-request` : "/" }
      : null,
    isFeatureEnabled("health-tests")
      ? { label: "Lab Test Booking", href: careBase ? `${careBase}/lab-tests` : "/" }
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

  // Built-in groups stay auto-derived (Care + Clinics from features,
  // Account from auth pages, Company from global pages). Admin's
  // override appends custom columns AFTER these — the patient still
  // sees the in-country service links and country picker.
  const groups: Array<{ h: string; items: Array<{ label: string; href: string; external?: boolean }> }> = [
    { h: "Care", items: careLinks },
    { h: "Clinics", items: clinicsLinks },
    { h: "Account", items: accountLinks },
    { h: "Company", items: companyLinks },
    ...(override?.customColumns ?? []).map((c) => ({ h: c.title, items: c.links })),
  ];

  // Brand tagline + contact + social fall back to globals outside a
  // country scope or when admin hasn't customised. The default tagline
  // matches the historical hard-coded copy so non-customised countries
  // look the same as before this feature shipped.
  const tagline =
    override?.tagline ??
    "Medicine anytime anywhere. Online medical consultations with locally-registered doctors across Europe.";
  const contactEmail = override?.contactEmail ?? "info@myglobalhealth.online";
  const contactPhone = override?.contactPhone ?? null;
  const contactAddress = override?.contactAddress ?? null;
  const contactHours = override?.contactHours ?? null;
  type SocialIcon = (props: { className?: string }) => React.ReactElement;
  const socialLinks: Array<{ url: string; Icon: SocialIcon; label: string }> = [
    override?.instagramUrl
      ? { url: override.instagramUrl, Icon: IconInstagram, label: "Instagram" }
      : null,
    override?.facebookUrl
      ? { url: override.facebookUrl, Icon: IconFacebook, label: "Facebook" }
      : null,
    override?.linkedinUrl
      ? { url: override.linkedinUrl, Icon: IconLinkedin, label: "LinkedIn" }
      : null,
    override?.twitterUrl
      ? { url: override.twitterUrl, Icon: IconTwitter, label: "X / Twitter" }
      : null,
    override?.youtubeUrl
      ? { url: override.youtubeUrl, Icon: IconYoutube, label: "YouTube" }
      : null,
  ].filter((x): x is { url: string; Icon: SocialIcon; label: string } => x !== null);
  const copyrightPrefix =
    override?.copyrightLine ?? `© ${year} ${siteName || "Global Health"}`;

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
              className="mt-4 whitespace-pre-line"
              style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 320 }}
            >
              {tagline}
            </p>
            <div
              className="mt-4 flex flex-col gap-1"
              style={{ fontSize: 13, color: "rgba(255,255,255,0.50)" }}
            >
              {contactEmail ? (
                <a
                  href={`mailto:${contactEmail}`}
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  {contactEmail}
                </a>
              ) : null}
              {contactPhone ? (
                <a
                  href={`tel:${contactPhone.replace(/[^0-9+]/g, "")}`}
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  {contactPhone}
                </a>
              ) : null}
              {contactAddress ? (
                <span className="whitespace-pre-line">{contactAddress}</span>
              ) : null}
              {contactHours ? <span>{contactHours}</span> : null}
            </div>
            {socialLinks.length > 0 ? (
              <div className="mt-4 flex gap-2">
                {socialLinks.map(({ url, Icon, label }) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="inline-flex size-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-white/40 hover:text-white"
                  >
                    <Icon className="size-4" />
                  </a>
                ))}
              </div>
            ) : null}
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
                {group.items.map((item) => {
                  // Admin custom links may set `external: true` for offsite
                  // URLs, mailto:, or tel:. Use a plain <a> in that case so
                  // Next doesn't try to prefetch them. Internal hrefs keep
                  // the <Link> for client-side nav.
                  const external =
                    item.external === true ||
                    /^(https?:|mailto:|tel:)/i.test(item.href);
                  if (external) {
                    return (
                      <li key={item.label + item.href}>
                        <a
                          href={item.href}
                          target={item.external ? "_blank" : undefined}
                          rel={item.external ? "noopener noreferrer" : undefined}
                          className="text-[rgba(255,255,255,0.70)] transition-colors hover:text-white"
                          style={{ fontSize: 14, textDecoration: "none" }}
                        >
                          {item.label}
                        </a>
                      </li>
                    );
                  }
                  return (
                    <li key={item.label + item.href}>
                      <Link
                        href={item.href}
                        className="text-[rgba(255,255,255,0.70)] transition-colors hover:text-white"
                        style={{ fontSize: 14, textDecoration: "none" }}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
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
            {copyrightPrefix} · Medicine anytime anywhere
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
