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
import type { SiteNavigationData } from "@/data/navigation";
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

type CareField = { flag: string | null; labelKey: keyof SiteNavigationData; slug: string };
const CARE_FIELDS: ReadonlyArray<CareField> = [
  { flag: "general-consultations", labelKey: "navBookGp", slug: "gp-appointment" },
  { flag: "specialist-consultations", labelKey: "navSeeSpecialist", slug: "see-a-specialist" },
  { flag: "online-prescriptions", labelKey: "navRepeatPrescription", slug: "repeat-prescription-request" },
  { flag: "health-tests", labelKey: "navLabTests", slug: "lab-tests" },
  { flag: null, labelKey: "footerOurDoctors", slug: "doctors" },
];

export function SiteFooter({
  siteName,
  navigation,
  countryFeatures,
  countryFooters,
  countries,
}: {
  siteName: string;
  navigation: SiteNavigationData;
  countryFeatures?: Record<string, string[] | undefined>;
  countryFooters?: Record<string, PublicCountryFooter | null>;
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
    { label: navigation.navBookAppointment, href: bookHref },
    ...CARE_FIELDS.flatMap((entry) =>
      entry.flag !== null && !isFeatureEnabled(entry.flag)
        ? []
        : [{ label: navigation[entry.labelKey] as string, href: careBase ? `${careBase}/${entry.slug}` : "/" }],
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
    { label: navigation.footerSignIn, href: "/login" },
    { label: navigation.footerCreateAccount, href: "/register" },
    { label: navigation.footerForgotPassword, href: "/forgot-password" },
    { label: navigation.footerMyAccount, href: "/account" },
  ];

  const companyLinks = [
    { label: navigation.navBlog, href: "/blog" },
    { label: navigation.navFaq, href: "/faq" },
    { label: navigation.navAbout, href: "/about" },
    { label: navigation.footerContactUs, href: "/contact" },
    { label: navigation.footerPrivacyPolicy, href: "/privacy" },
    { label: navigation.footerTermsOfService, href: "/terms" },
    // Country-scoped legal hub (admin-authored CountryLegalDocument pages).
    // Only shown inside a country scope — there is no global variant.
    ...(careBase ? [{ label: "Legal information", href: `${careBase}/legal` }] : []),
  ];

  // Built-in groups stay auto-derived (Care + Clinics from features,
  // Account from auth pages, Company from global pages). Admin's
  // override appends custom columns AFTER these — the patient still
  // sees the in-country service links and country picker.
  const groups: Array<{ h: string; items: Array<{ label: string; href: string; external?: boolean }> }> = [
    { h: navigation.footerCareHeading, items: careLinks },
    { h: navigation.footerClinicsHeading, items: clinicsLinks },
    { h: navigation.footerAccountHeading, items: accountLinks },
    { h: navigation.footerCompanyHeading, items: companyLinks },
    ...(override?.customColumns ?? []).map((c) => ({ h: c.title, items: c.links })),
  ];

  // Brand tagline + contact + social fall back to globals outside a
  // country scope or when admin hasn't customised. The default tagline
  // matches the historical hard-coded copy so non-customised countries
  // look the same as before this feature shipped.
  const tagline = override?.tagline ?? navigation.footerTagline;
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
      className="relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #0F2E25 0%, #0B241C 100%)",
        color: "rgba(255,255,255,0.70)",
        padding: "clamp(56px,7vw,88px) 0 0",
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        className="relative z-[1] mx-auto"
        style={{ maxWidth: 1320, padding: "0 clamp(20px, 4vw, 40px)" }}
      >
        <div className="gh-footer-grid grid gap-x-8 gap-y-10">
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
                style={{ height: 38, width: "auto" }}
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
            {/* Newsletter sits in the brand column so the footer grid stays a
                single clean row (no orphaned full-width void below). */}
            <div className="mt-7 max-w-[320px]">
              <NewsletterSignup
                countryCode={parsed.country ?? null}
                locale={parsed.lang ?? null}
                i18n={{
                  stayInformed: navigation.footerStayInformed,
                  newsletterDesc: navigation.footerNewsletterDesc,
                  subscribe: navigation.footerSubscribe,
                  newsletterSuccess: navigation.footerNewsletterSuccess,
                }}
              />
            </div>
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
        </div>

        <p
          className="mt-12 max-w-[980px] text-sm leading-relaxed"
          style={{ color: "rgba(255,255,255,0.58)" }}
        >
          {navigation.footerDisclaimer}
        </p>

        <div
          className="flex flex-wrap justify-between gap-3"
          style={{
            marginTop: 40,
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.10)",
            fontSize: 12,
            color: "rgba(255,255,255,0.65)",
          }}
        >
          <span suppressHydrationWarning>
            {copyrightPrefix} · {navigation.footerCopyrightSuffix}
          </span>
          <span className="flex gap-3">
            <Link href="/privacy" className="transition-colors hover:text-white focus-visible:text-white focus-visible:outline-none" style={{ color: "inherit", textDecoration: "none" }}>
              {navigation.footerPrivacyLink}
            </Link>
            <span aria-hidden>·</span>
            <span>{navigation.footerEuCompliant}</span>
          </span>
        </div>
      </div>

      {/* Outlined wordmark closer — cropped at the page's bottom edge.
          Echoes the hero's country-name watermark; pure atmosphere. */}
      <div
        aria-hidden
        className="gh2-watermark pointer-events-none relative z-0 mt-10 text-center"
        style={{
          fontSize: "clamp(3.25rem, 10.5vw, 9.5rem)",
          marginBottom: "-0.18em",
        }}
      >
        {siteName || "Global Health"}
      </div>
    </footer>
  );
}
