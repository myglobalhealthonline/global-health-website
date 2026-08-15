/**
 * Public site footer. Country/lang aware via the request pathname parsed
 * server-side by the owning (site)/layout.tsx — Care links resolve to the
 * active country/lang scope when the user is inside a country, else they
 * fall through to the entry gate at `/`.
 *
 * Care links resolve to the live public country pages that now exist:
 * consultations, prescriptions, tests, and doctors.
 *
 * Server Component: no `usePathname()` of its own — the parsed pathname
 * comes in as a prop so this file doesn't force a client boundary. Only two
 * children hydrate: FooterNav (mobile accordions) and NewsletterSignup.
 *
 * LAYOUT
 * A three-area grid: brand | nav side by side at >=768px with the newsletter
 * panel spanning the full width beneath, collapsing to brand → newsletter →
 * accordions on mobile. The newsletter sits between brand and nav in the DOM
 * so the mobile order (the one most visitors get) matches the visual order.
 */

import Image from "next/image";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { countries as staticCountries, type CountryConfig } from "@/data/countries";
import {
  COUNTRY_CODE_TO_SLUG,
  countryCodeFromSlug,
} from "@/lib/routing/country-slug";
import type { ParsedSitePath } from "@/lib/routing/path-rewrites";
import { buildBookHref } from "@/lib/routing/book-href";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { TOOLS } from "@/lib/tools/registry";
import { isToolMarket } from "@/lib/tools/markets";
import { getCountryContact } from "@/lib/content/country-contact";
import type { PublicCountryFooter } from "@/lib/content/get-country-footers";
import type { SiteNavigationData } from "@/data/navigation";
import {
  IconInstagram,
  IconFacebook,
  IconLinkedin,
  IconTwitter,
  IconYoutube,
  IconTiktok,
  type BrandIcon,
} from "@/components/ui/BrandIcons";
import { FooterNav, type FooterGroup } from "./FooterNav";
import { NewsletterSignup } from "./NewsletterSignup";
import { CookieSettingsButton } from "@/components/compliance/CookieSettingsButton";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { localeDisplayName } from "@/lib/i18n/locale-display";
import type { LocaleCode } from "@/lib/i18n/types";
import { hreflangRegion } from "@/lib/seo/hreflang";

const REGULATORY_TEXT: Partial<Record<string, string>> = {
  cz: "Global Health je obchodní značkou společnosti Global Guest s.r.o., poskytovatele zdravotních služeb zapsaného v Národním registru poskytovatelů zdravotních služeb (NRPZS) pod registračním číslem 19071680.",
  pt: "A Global Health é uma marca comercial da Global Guest s.r.o., entidade prestadora de cuidados de saúde registada na Entidade Reguladora da Saúde (ERS) sob o número 179287.",
};

// Static spec for the social ribbon. Keeping it module-scoped lets the
// component body flatMap straight into render entries without ad-hoc
// ternary-then-filter shapes.
const SOCIAL_FIELDS: ReadonlyArray<{
  key: "instagramUrl" | "facebookUrl" | "linkedinUrl" | "twitterUrl" | "youtubeUrl" | "tiktokUrl";
  Icon: BrandIcon;
  label: string;
}> = [
  { key: "instagramUrl", Icon: IconInstagram, label: "Instagram" },
  { key: "facebookUrl", Icon: IconFacebook, label: "Facebook" },
  { key: "tiktokUrl", Icon: IconTiktok, label: "TikTok" },
  { key: "linkedinUrl", Icon: IconLinkedin, label: "LinkedIn" },
  { key: "twitterUrl", Icon: IconTwitter, label: "X / Twitter" },
  { key: "youtubeUrl", Icon: IconYoutube, label: "YouTube" },
];

type CareField = { flag: string | null; labelKey: keyof SiteNavigationData; slug: string };
const CARE_FIELDS: ReadonlyArray<CareField> = [
  { flag: "general-consultations", labelKey: "navBookGp", slug: "gp-consultation-online" },
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
  parsed,
}: {
  siteName: string;
  navigation: SiteNavigationData;
  countryFeatures?: Record<string, string[] | undefined>;
  countryFooters?: Record<string, PublicCountryFooter | null>;
  countries?: CountryConfig[];
  /** Request pathname, parsed server-side (from `x-gh-pathname`). */
  parsed: ParsedSitePath;
}) {
  const year = new Date().getFullYear();

  const common = getCommonLocale(resolveLocale({ explicitLocale: parsed.lang }));
  const cookieCopy = common.cookie;

  const careBase =
    parsed.country && parsed.lang ? `/${parsed.country}/${parsed.lang}` : null;
  // Resolve the active country's enabled feature list so we can hide
  // Care entries the admin has disabled. Outside a country (`careBase`
  // is null) we still render the labels — they fall through to the
  // entry gate at "/" where the user picks a country.
  const activeCountryCode = parsed.country
    ? countryCodeFromSlug(parsed.country)
    : null;
  // Pre-country (careBase null — the gateway page, or any global page like
  // /about, /cart with no gh-last-country cookie, which every crawler hits)
  // used to just assume every flag was on. Fine for a flag that varies by
  // market, but a flag that's off in EVERY country (e.g. online-prescriptions,
  // Ads compliance — next.config.ts) produced a guaranteed-dead footer link.
  // Union across all markets instead: only counts as enabled here when at
  // least one country actually has it on.
  const activeFeatures = activeCountryCode
    ? countryFeatures?.[activeCountryCode]
    : countryFeatures
      ? [...new Set(Object.values(countryFeatures).flatMap((f) => f ?? []))]
      : undefined;
  // Admin-managed per-country override. Only applies when visitor is
  // inside a country scope (gateway page + global pages keep defaults).
  const override = activeCountryCode
    ? countryFooters?.[activeCountryCode] ?? null
    : null;
  const isFeatureEnabled = (slug: string) => {
    if (!activeFeatures) return true; // no toggle data → assume on (legacy default)
    return activeFeatures.includes(slug);
  };
  // Care links must always resolve to a real service page. Inside a country
  // they use that country's scope; on global pages (/about, /blog, /faq…)
  // parsed.country/lang are null — fall back to Ireland/en so the links point
  // at live pages instead of dumping every visitor back on the homepage.
  // (careBase stays null-on-global for isFeatureEnabled + the Company-column
  // legal links, which have no global variant.)
  const careCountry = parsed.country ?? "ireland";
  const careLang = parsed.lang ?? "en";
  const careScope = `/${careCountry}/${careLang}`;
  const bookHref = buildBookHref({ country: careCountry, lang: careLang });
  const careLinks = [
    { label: navigation.navBookAppointment, href: bookHref },
    ...CARE_FIELDS.flatMap((entry) =>
      entry.flag !== null && !isFeatureEnabled(entry.flag)
        ? []
        : [{ label: navigation[entry.labelKey] as string, href: `${careScope}/${entry.slug}` }],
    ),
  ];

  // Use the CMS-derived country list when available so deactivated or
  // unpublished countries don't appear in the Clinics column. Fall back
  // to the static seed list so the footer works on pages that don't
  // pass the prop (e.g. storybook, older layouts).
  const activeCountries = countries ?? staticCountries;
  // Prefer the slug carried on the country data itself — the client-side
  // slug registry proxy may not be warmed on hydration for admin-added
  // countries, which previously produced `/undefined/<lang>` hrefs.
  const clinicsLinks = activeCountries.map((c) => ({
    label: c.name,
    href: `/${c.slug || COUNTRY_CODE_TO_SLUG[c.code] || c.code.toLowerCase()}/${c.defaultLocale ?? "en"}`,
  }));

  const accountLinks = [
    { label: navigation.footerSignIn, href: "/login" },
    { label: navigation.footerCreateAccount, href: "/register" },
    { label: navigation.footerForgotPassword, href: "/forgot-password" },
    { label: navigation.footerMyAccount, href: "/account" },
  ];

  // Free calculators, listed individually — there is no /tools index, and the
  // footer is the crawlable path into each of them. Labels come from the tools
  // bundle (translated in all six locales), gated by the same `isToolMarket`
  // the routes and sitemap use. These get their OWN column: they are patient
  // utilities, not company pages.
  const toolsBundle = loadLocaleBundle(resolveLocale({ explicitLocale: parsed.lang })).tools;
  const toolLinks =
    activeCountryCode && parsed.lang && isToolMarket(activeCountryCode, parsed.lang)
      ? TOOLS.flatMap((tool) => {
          const copy = (toolsBundle.tools as Record<string, { cardTitle: string } | undefined>)[
            tool.slug
          ];
          return copy ? [{ label: copy.cardTitle, href: `${careScope}/tools/${tool.slug}` }] : [];
        })
      : [];

  const companyLinks = [
    // Blog, FAQ and About exist ONLY per market since 2026-08-15 — the bare
    // /blog, /faq and /about were retired and 301 to Ireland (next.config.ts).
    // `careScope` is the country in scope, or Ireland outside one, so these
    // always name a live page rather than a redirect. /contact still has a
    // real global variant, so it keeps the careBase (null-on-global) form.
    { label: navigation.navBlog, href: `${careScope}/blog` },
    { label: navigation.navFaq, href: `${careScope}/faq` },
    { label: navigation.navAbout, href: `${careScope}/about` },
    { label: navigation.footerContactUs, href: careBase ? `${careBase}/contact` : "/contact" },
    { label: navigation.footerPrivacyPolicy, href: "/privacy" },
    { label: navigation.footerTermsOfService, href: "/terms" },
    // Country-scoped legal hub (admin-authored CountryLegalDocument pages).
    // Only shown inside a country scope — there is no global variant.
    ...(careBase
      ? [
          { label: navigation.footerLegalInformation, href: `${careBase}/legal` },
          { label: navigation.footerMedicalDisclaimer, href: `${careBase}/legal/medical-disclaimer` },
        ]
      : []),
  ];

  // Crawlable locale row. The header's LanguageSwitcher lives inside a Radix
  // portal that only mounts on open, so its links are absent from the served
  // HTML — every non-default-locale URL was therefore orphaned (GSC: "URL is
  // unknown to Google" / "Discovered - currently not indexed"). These anchors
  // are server-rendered, so Googlebot has a real path into each locale.
  // Only inside a country scope: global pages have no [lang] segment to swap.
  //
  // ponytail: [country]/[lang]/layout.tsx hardcodes `rest: []` (reading the
  // real pathname needs headers(), which would opt those pages out of static
  // rendering — see P-001), so in practice these point at the locale HOME, not
  // the current deep page. That's enough: the locale home carries the full
  // in-locale nav, so crawlers reach the deep pages one hop later. Populate
  // `rest` if per-page swapping is ever wanted.
  const localeTail = parsed.rest.length > 0 ? `/${parsed.rest.join("/")}` : "";
  const localeLinks =
    parsed.country && parsed.lang
      ? (
          activeCountries.find((c) => c.code === activeCountryCode)
            ?.supportedLocales ?? [parsed.lang as LocaleCode]
        ).map((loc) => ({
          loc,
          label: localeDisplayName(loc, "native"),
          href: `/${parsed.country}/${loc}${localeTail}`,
          hrefLang: activeCountryCode
            ? `${loc}-${hreflangRegion(activeCountryCode)}`
            : loc,
          isActive: loc === parsed.lang,
        }))
      : [];

  // Built-in groups stay auto-derived (Care + Clinics from features, Account
  // from auth pages, Health Tools from the calculator registry, Company from
  // global pages). Admin's override appends custom columns AFTER these — the
  // patient still sees the in-country service links and country picker.
  const groups: FooterGroup[] = [
    { kind: "care", title: navigation.footerCareHeading, links: careLinks },
    { kind: "clinics", title: navigation.footerClinicsHeading, links: clinicsLinks },
    { kind: "account", title: navigation.footerAccountHeading, links: accountLinks },
    // Own column, never folded into Company.
    ...(toolLinks.length > 0
      ? [{ kind: "tools" as const, title: toolsBundle.hub.navLabel, links: toolLinks }]
      : []),
    { kind: "company", title: navigation.footerCompanyHeading, links: companyLinks },
    ...(override?.customColumns ?? []).map((c) => ({
      kind: "custom" as const,
      title: c.title,
      links: c.links,
    })),
  ];

  // Brand tagline + contact + social fall back to globals outside a
  // country scope or when admin hasn't customised. The default tagline
  // matches the historical hard-coded copy so non-customised countries
  // look the same as before this feature shipped.
  const tagline = override?.tagline ?? navigation.footerTagline;
  const contactEmail = override?.contactEmail ?? "info@myglobalhealth.online";
  // Fall back to the market's published support number (contact page / NAP /
  // JSON-LD all read the same table) so the footer shows a phone even when the
  // admin hasn't filled the per-country override.
  const contactPhone =
    override?.contactPhone ??
    (activeCountryCode ? getCountryContact(activeCountryCode)?.phoneDisplay ?? null : null) ??
    getCountryContact("IE")?.phoneDisplay ??
    null;
  const contactAddress = override?.contactAddress ?? null;
  const contactHours = override?.contactHours ?? null;
  const socialLinks = SOCIAL_FIELDS.flatMap((entry) => {
    const url = override?.[entry.key];
    return url ? [{ url, Icon: entry.Icon, label: entry.label }] : [];
  });
  const copyrightPrefix =
    override?.copyrightLine ?? `© ${year} ${siteName || "Global Health"}`;
  const regulatoryText = activeCountryCode
    ? (REGULATORY_TEXT[activeCountryCode.toLowerCase()] ?? null)
    : null;

  return (
    <footer className="gh-site-shell gh-footer-shell relative overflow-hidden">
      {/* Atmosphere only: a dotted health-tech field in the lower corners and
          a single ECG trace at the right edge. Both are painted with CSS/inline
          SVG (no extra requests) and sit under the content layer. */}
      <span aria-hidden className="gh-footer-dots" />
      <svg
        aria-hidden
        focusable="false"
        className="gh-footer-ecg"
        viewBox="0 0 240 60"
        preserveAspectRatio="none"
      >
        <path
          d="M0 42h72l9-24 11 44 10-32 8 12h130"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="gh-footer-inner relative z-[1] mx-auto">
        <div className="gh-footer-layout">
          <div className="gh-footer-brand">
            <Link
              href="/"
              className="gh-footer-brandLink gh-focus-on-dark inline-flex items-center"
              aria-label={siteName || "Global Health"}
            >
              {/* width/height match the rendered size (.gh-footer-logo is
                  64px tall) so the optimizer serves a ~128px 2x variant
                  instead of the full 399px source. */}
              <Image
                src="/logos/global-health-light.png"
                alt={siteName || "Global Health"}
                width={98}
                height={64}
                className="gh-footer-logo"
              />
            </Link>
            <p className="gh-footer-tagline whitespace-pre-line">{tagline}</p>

            <ul className="gh-footer-contact">
              {contactEmail ? (
                <li>
                  <a
                    href={`mailto:${contactEmail}`}
                    className="gh-footer-contactLink gh-focus-on-dark"
                  >
                    <span aria-hidden className="gh-footer-contactIcon">
                      <Mail className="size-4" />
                    </span>
                    {contactEmail}
                  </a>
                </li>
              ) : null}
              {contactPhone ? (
                <li>
                  <a
                    href={`tel:${contactPhone.replace(/[^0-9+]/g, "")}`}
                    className="gh-footer-contactLink gh-focus-on-dark"
                  >
                    <span aria-hidden className="gh-footer-contactIcon">
                      <Phone className="size-4" />
                    </span>
                    {contactPhone}
                  </a>
                </li>
              ) : null}
              {contactAddress ? (
                <li className="gh-footer-contactPlain whitespace-pre-line">{contactAddress}</li>
              ) : null}
              {contactHours ? (
                <li className="gh-footer-contactPlain">{contactHours}</li>
              ) : null}
            </ul>

            {socialLinks.length > 0 ? (
              <div className="gh-footer-social">
                <p className="gh-footer-socialHeading">{navigation.footerFollowUs}</p>
                <ul className="gh-footer-socialRow">
                  {socialLinks.map(({ url, Icon, label }) => (
                    <li key={url}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={label}
                        className="gh-footer-socialLink gh-focus-on-dark"
                      >
                        <Icon className="size-4" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {/* DOM-ordered between brand and nav so the mobile column order
              (brand → newsletter → accordions) matches the visual order. */}
          <div className="gh-footer-newsletterArea">
            <NewsletterSignup
              countryCode={parsed.country ?? null}
              locale={parsed.lang ?? null}
              i18n={{
                stayInformed: navigation.footerStayInformed,
                newsletterDesc: navigation.footerNewsletterDesc,
                subscribe: navigation.footerSubscribe,
                newsletterSuccess: navigation.footerNewsletterSuccess,
                newsletterPrivacy: navigation.footerNewsletterPrivacy,
                emailLabel: common.bookingForm.email,
                invalidEmail: common.bookingForm.enterValidEmail,
              }}
            />
          </div>

          <nav aria-label={common.a11y.footerNavigation} className="gh-footer-navArea">
            <FooterNav groups={groups} />
          </nav>
        </div>

        {localeLinks.length > 1 ? (
          <nav
            aria-label={common.a11y.chooseLanguage}
            className="gh-footer-localeBar"
          >
            <span aria-hidden className="gh-footer-localeGlobe">
              <svg viewBox="0 0 24 24" fill="none" focusable="false">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>
            </span>
            <ul className="gh-footer-localeRow">
              {/* Plain <a>, not <Link>: a client-side nav would keep the shared
                  (site)/layout mounted, so the chrome never re-renders under the
                  new x-gh-locale header (same reason LanguageSwitcher hard-navs).
                  It also avoids prefetching every locale from every page. */}
              {localeLinks.map((l) => (
                <li key={l.loc}>
                  <a
                    href={l.href}
                    hrefLang={l.hrefLang}
                    aria-current={l.isActive ? "true" : undefined}
                    className="gh-footer-localeLink gh-focus-on-dark"
                    data-active={l.isActive}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        {regulatoryText ? (
          <p className="gh-footer-regulatory gh-body-sm text-white/60">{regulatoryText}</p>
        ) : null}

        {/* items-center: legal links have a 44px tap-target min-height, so
            without centering the plain-text siblings (·, GDPR line) sat at
            the top of the row while the links floated lower. */}
        <div className="gh-footer-copyrightBar">
          <span suppressHydrationWarning>
            {copyrightPrefix} · {navigation.footerCopyrightSuffix}
          </span>
          <span className="gh-footer-legalRow">
            <Link
              href="/privacy"
              className="gh-footer-legalLink gh-focus-on-dark"
            >
              {navigation.footerPrivacyLink}
            </Link>
            <span aria-hidden className="gh-footer-legalDot">
              ·
            </span>
            {/* Consent must be as easy to withdraw as it was to give — this
                reopens the banner with the stored choices pre-filled. */}
            <CookieSettingsButton
              label={cookieCopy.settingsLink}
              className="gh-footer-legalLink gh-focus-on-dark"
            />
            <span aria-hidden className="gh-footer-legalDot">
              ·
            </span>
            <span>{navigation.footerEuCompliant}</span>
          </span>
        </div>
      </div>

      {/* Outlined wordmark closer — cropped at the page's bottom edge.
          Echoes the hero's country-name watermark; pure atmosphere. */}
      <div
        aria-hidden
        className="gh-footer-watermark gh2-watermark pointer-events-none relative z-0 mt-10 text-center"
      >
        {siteName || "Global Health"}
      </div>
    </footer>
  );
}
