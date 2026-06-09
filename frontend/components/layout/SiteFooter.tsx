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
import { countries as staticCountries, type CountryConfig } from "@/data/countries";
import {
  COUNTRY_CODE_TO_SLUG,
  countryCodeFromSlug,
} from "@/lib/routing/country-slug";
import { parseSitePath } from "@/lib/routing/path-rewrites";
import { buildBookHref } from "@/lib/routing/book-href";
import type { PublicCountryFooter } from "@/lib/content/get-country-footers";
import {
  IconInstagram,
  IconFacebook,
  IconLinkedin,
  IconTwitter,
  IconYoutube,
  type BrandIcon,
} from "@/components/ui/BrandIcons";
import { NewsletterSignup } from "./NewsletterSignup";

// Static spec for the social ribbon. Keeping it module-scoped lets the
// component body flatMap straight into render entries without ad-hoc
// ternary-then-filter shapes.
const SOCIAL_FIELDS: ReadonlyArray<{
  key: "instagramUrl" | "facebookUrl" | "linkedinUrl" | "twitterUrl" | "youtubeUrl";
  Icon: BrandIcon;
  label: string;
}> = [
  { key: "instagramUrl", Icon: IconInstagram, label: "Instagram" },
  { key: "facebookUrl", Icon: IconFacebook, label: "Facebook" },
  { key: "linkedinUrl", Icon: IconLinkedin, label: "LinkedIn" },
  { key: "twitterUrl", Icon: IconTwitter, label: "X / Twitter" },
  { key: "youtubeUrl", Icon: IconYoutube, label: "YouTube" },
];

// Care column spec. Each entry: featureFlag key, label, route segment.
// flatMap below drops entries whose feature is off so the column stays
// clean without per-entry ternaries.
const CARE_FIELDS: ReadonlyArray<{
  flag: string | null;
  label: string;
  slug: string;
}> = [
  { flag: "general-consultations", label: "Book a GP Appointment", slug: "gp-appointment" },
  { flag: "specialist-consultations", label: "See a Specialist", slug: "see-a-specialist" },
  { flag: "online-prescriptions", label: "Repeat Prescription Request", slug: "repeat-prescription-request" },
  { flag: "health-tests", label: "Lab Test Booking", slug: "lab-tests" },
  { flag: null, label: "Our doctors", slug: "doctors" },
];

export function SiteFooter({
  siteName,
  countryFeatures,
  countryFooters,
  countries,
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
  /** Active countries from the CMS. Falls back to the static seed list
   *  when not provided so the footer renders on every context. */
  countries?: CountryConfig[];
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
  const bookHref =
    parsed.country && parsed.lang
      ? buildBookHref({ country: parsed.country, lang: parsed.lang })
      : "/";
  const careLinks = [
    { label: "Book Appointment", href: bookHref },
    ...CARE_FIELDS.flatMap((entry) =>
      entry.flag !== null && !isFeatureEnabled(entry.flag)
        ? []
        : [{ label: entry.label, href: careBase ? `${careBase}/${entry.slug}` : "/" }],
    ),
  ];

  // Use the CMS-derived country list when available so deactivated or
  // unpublished countries don't appear in the Clinics column. Fall back
  // to the static seed list so the footer works on pages that don't
  // pass the prop (e.g. storybook, older layouts).
  const activeCountries = countries ?? staticCountries;
  const clinicsLinks = activeCountries.map((c) => ({
    label: c.name,
    href: `/${COUNTRY_CODE_TO_SLUG[c.code]}/${c.defaultLocale ?? "en"}`,
  }));

  const accountLinks = [
    { label: "Sign in", href: "/login" },
    { label: "Create account", href: "/register" },
    { label: "Forgot password?", href: "/forgot-password" },
    { label: "My account", href: "/account" },
  ];

  const companyLinks = [
    { label: "Blog", href: "/blog" },
    { label: "FAQ", href: "/faq" },
    { label: "About", href: "/about" },
    { label: "Contact us", href: "/contact" },
    { label: "Privacy policy", href: "/privacy" },
    { label: "Terms of service", href: "/terms" },
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
  const socialLinks = SOCIAL_FIELDS.flatMap((entry) => {
    const url = override?.[entry.key];
    return url ? [{ url, Icon: entry.Icon, label: entry.label }] : [];
  });
  const copyrightPrefix =
    override?.copyrightLine ?? `© ${year} ${siteName || "Global Health"}`;

  return (
    <footer
      style={{
        background: "var(--color-background-dark)",
        color: "rgba(255,255,255,0.70)",
        padding: "64px 0 28px",
        borderTop: "1px solid rgba(176,241,34,0.16)",
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
                    className="inline-flex size-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition-[transform,color,border-color] duration-200 hover:-translate-y-0.5 hover:border-[var(--color-brand-accent)] hover:text-white active:scale-95 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:rgba(176,241,34,0.5)]"
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
                className="m-0 inline-flex items-center gap-2 uppercase text-white"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  marginBottom: 14,
                }}
              >
                <span
                  aria-hidden
                  className="inline-block h-3 w-[3px] rounded-full"
                  style={{ background: "var(--color-brand-accent)" }}
                />
                {group.h}
              </p>
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                {group.items.map((item) => {
                  // Admin custom links may set `external: true` for offsite
                  // URLs, mailto:, or tel:. Use a plain <a> in that case so
                  // Next doesn't try to prefetch them. Internal hrefs keep
                  // the <Link> for client-side nav. One renderer either way
                  // — the only branch is the element type + tab attrs.
                  const isExternal =
                    item.external === true ||
                    /^(https?:|mailto:|tel:)/i.test(item.href);
                  const linkClass = "inline-block text-[rgba(255,255,255,0.70)] transition-[color,transform] duration-200 hover:translate-x-0.5 hover:text-white focus-visible:text-white focus-visible:outline-none motion-reduce:transition-none";
                  const linkStyle = { fontSize: 14, textDecoration: "none" } as const;
                  const newTab = item.external === true;
                  return (
                    <li key={item.label + item.href}>
                      {isExternal ? (
                        <a
                          href={item.href}
                          target={newTab ? "_blank" : undefined}
                          rel={newTab ? "noopener noreferrer" : undefined}
                          className={linkClass}
                          style={linkStyle}
                        >
                          {item.label}
                        </a>
                      ) : (
                        <Link href={item.href} className={linkClass} style={linkStyle}>
                          {item.label}
                        </Link>
                      )}
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

        <p
          className="mt-10 max-w-[980px] text-sm leading-relaxed"
          style={{ color: "rgba(255,255,255,0.58)" }}
        >
          Online consultations are not a substitute for emergency care. If you
          need urgent help, call 112 or your local emergency number. Information
          on this website is general guidance; prescriptions, certificates,
          referrals and next steps depend on clinical assessment and are issued
          at the treating clinician&apos;s discretion.
        </p>

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
            <Link href="/privacy" className="transition-colors hover:text-white focus-visible:text-white focus-visible:outline-none" style={{ color: "inherit", textDecoration: "none" }}>
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
