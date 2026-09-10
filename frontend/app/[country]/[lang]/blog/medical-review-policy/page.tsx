import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, BadgeCheck, BookOpen, Mail, ShieldCheck } from "lucide-react";
import { getCountryByCode } from "@/data/countries";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import { getCountryContact, fillTemplate } from "@/lib/content/country-contact";
import { getCountryDoctors } from "@/lib/content/get-country-collections";
import { getCountryTrust, doctorVerificationUrl } from "@/lib/content/get-country-trust";
import { buildDoctorProfilePath } from "@/lib/content/doctor-profile-path";
import { BLOG_AUTHOR_NAME } from "@/lib/content/blog-byline";
import { SITE_NAME } from "@/lib/constants";
import { PageHero } from "@/components/sections/PageHero";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import { hreflangAlternates, ogLocales } from "@/lib/seo/hreflang";
import { buildPublicMetadata } from "@/lib/seo/page-seo";

export const revalidate = 300;

type Params = { country: string; lang: string };

/**
 * Date this policy text was last changed. Hand-maintained on purpose: it is a
 * statement about the policy, not about the page's build, so it must never be
 * `new Date()` — that would silently claim a fresh review on every deploy.
 */
const POLICY_UPDATED = "2026-09-10";

/**
 * Route params → country config + locale-resolved policy copy. Same resolver
 * shape as /press and /about: templates in company.json (medicalReview),
 * market facts from the shared per-country content files.
 */
async function resolve(country: string, lang: string) {
  const code = countryCodeFromSlug(country);
  if (!code || !isSupportedLocale(lang)) return null;
  const config = (await getPublicCountryByCode(code)) ?? getCountryByCode(code);
  const contact = getCountryContact(code);
  if (!config || !contact) return null;
  const bundle = loadLocaleBundle(lang as LocaleCode);
  const t = bundle.company.medicalReview;
  const countryName = getCommonLocale(lang as LocaleCode).countryNames?.[code] ?? config.name;
  const vars = {
    country: countryName,
    regulator: contact.regulator.name,
    emergency: contact.facts.emergency,
  };
  return { code, config, contact, countryName, t, vars };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { country, lang } = await params;
  const resolved = await resolve(country, lang);
  if (!resolved) return { title: SITE_NAME };
  const { config, countryName, t, vars } = resolved;

  return buildPublicMetadata({
    path: `/${country}/${lang}/blog/medical-review-policy`,
    title: fillTemplate(t.titleTemplate, vars),
    description: fillTemplate(t.descriptionTemplate, vars),
    brandSuffix: false,
    type: "website",
    kind: "corporate",
    subtitle: countryName,
    imageAlt: t.heroImageAlt,
    locale: ogLocales(config, lang).locale,
    languages: hreflangAlternates(config, "/blog/medical-review-policy"),
  });
}

/**
 * The stamped verification seal from the policy design, rebuilt on the site's
 * own tokens (forest hero + accent) instead of the mock-up's standalone
 * palette. Inline SVG rather than new CSS classes — it is used once, so it
 * needs no entry in globals.css.
 */
function ReviewSeal({ label, sublabel }: { label: string; sublabel: string }) {
  return (
    <div className="relative mx-auto hidden w-full max-w-[380px] place-items-center lg:grid">
      <div
        className="grid aspect-square w-full place-items-center rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, rgba(176,241,34,0.10), rgba(255,255,255,0.02) 62%)",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <svg viewBox="0 0 100 100" className="w-[74%]" role="img" aria-label={`${label} — ${sublabel}`}>
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="var(--color-brand-accent)"
            strokeWidth="1.1"
            opacity="0.85"
          />
          <circle cx="50" cy="50" r="38" fill="none" stroke="#FFFFFF" strokeWidth="0.7" opacity="0.28" />
          <text
            fill="var(--color-brand-accent)"
            fontSize="6"
            fontWeight="700"
            letterSpacing="1.6"
            textAnchor="middle"
            x="50"
            y="21"
          >
            {label}
          </text>
          <text
            fill="rgba(255,255,255,0.55)"
            fontSize="5"
            fontWeight="700"
            letterSpacing="1.4"
            textAnchor="middle"
            x="50"
            y="85"
          >
            {sublabel}
          </text>
          <text
            fill="rgba(255,255,255,0.92)"
            fontSize="21"
            fontWeight="800"
            letterSpacing="-0.5"
            textAnchor="middle"
            x="50"
            y="58"
          >
            GH
          </text>
        </svg>
      </div>
    </div>
  );
}

export default async function CountryMedicalReviewPolicyPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { country, lang } = await params;
  const resolved = await resolve(country, lang);
  if (!resolved) notFound();
  const { code, config, contact, countryName, t, vars } = resolved;

  const base = `/${country}/${lang}`;
  const blogHref = `${base}/blog`;

  /* The byline example must match what a post actually renders. The editorial
   * author is ALWAYS the collective team byline — resolveBlogAuthorByline()
   * returns BLOG_AUTHOR_NAME unconditionally and never a person, so the named,
   * registered clinician on a post is the REVIEWER. The reviewer shown here is
   * a real doctor on this market register, never a hand-written name + council
   * number, which on a page about verifiable credentials would be exactly the
   * claim it tells readers to distrust. Falls back to a placeholder-shaped
   * example when the market has no admin-verified registration yet. */
  const [doctors, trust] = await Promise.all([
    getCountryDoctors(code, lang),
    // `lang` is already narrowed by isSupportedLocale() in resolve() above;
    // every other caller of getCountryTrust asserts the same way.
    getCountryTrust(code, lang as LocaleCode),
  ]);
  const sampleReviewer =
    doctors.find((d) => d.registrationVerified && d.imcRegistration) ?? null;
  const registerUrl = doctorVerificationUrl(trust) ?? contact.regulator.url;

  const reviewerHref = sampleReviewer ? buildDoctorProfilePath(country, lang, sampleReviewer.slug) : null;

  const contactHref = `mailto:${contact.email}?subject=${encodeURIComponent(
    `${t.s5EmailSubject} — ${SITE_NAME} ${countryName}`,
  )}`;

  const updatedLabel = new Date(POLICY_UPDATED).toLocaleDateString(lang, {
    month: "long",
    year: "numeric",
  });

  const standards: Array<{ title: string; body: string }> = [
    { title: t.s3Std1Title, body: t.s3Std1Body },
    { title: t.s3Std2Title, body: t.s3Std2Body },
    { title: t.s3Std3Title, body: fillTemplate(t.s3Std3BodyTemplate, vars) },
    { title: t.s3Std4Title, body: t.s3Std4Body },
    { title: t.s3Std5Title, body: fillTemplate(t.s3Std5BodyTemplate, vars) },
  ];

  const trustCards = [
    {
      icon: <BadgeCheck className="size-[18px]" strokeWidth={2} aria-hidden />,
      title: t.trustNamedTitle,
      subtitle: t.trustNamedSubtitle,
    },
    {
      icon: <ShieldCheck className="size-[18px]" strokeWidth={2} aria-hidden />,
      title: t.trustSourcedTitle,
      subtitle: t.trustSourcedSubtitle,
    },
    {
      icon: <BookOpen className="size-[18px]" strokeWidth={2} aria-hidden />,
      title: t.trustCurrentTitle,
      subtitle: t.trustCurrentSubtitle,
    },
  ];

  return (
    <section>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: countryName, url: base },
          { name: t.breadcrumb, url: `${base}/blog/medical-review-policy` },
        ])}
      />

      {/* DARK — hero, same anatomy as /press and the blog index */}
      <PageHero
        countryCode={config.code}
        countryLabel={`${SITE_NAME} · ${t.eyebrow}`}
        watermark={t.watermark}
        titleLead={t.h1}
        titleAccent=""
        lede={fillTemplate(t.introTemplate, vars)}
        ctaLabel={t.ctaArticles}
        ctaHref={blogHref}
        secondaryLabel={t.ctaContact}
        secondaryHref="#report"
        trustCards={trustCards}
        rightSlot={<ReviewSeal label={t.trustNamedTitle} sublabel={SITE_NAME} />}
      />

      {/* LIGHT — 01 who writes */}
      <section className="gh-inline-clamp-section-pricing relative overflow-hidden gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel">
        <SectionSeam theme="light" />
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <p aria-hidden className="gh2-index text-[2.5rem] leading-none text-[rgba(29,75,54,0.18)]">
            01
          </p>
          <h2 className="mt-3 max-w-[20ch] text-[clamp(1.75rem,3vw+0.5rem,2.75rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-[var(--color-text-primary)]">
            {t.s1Heading}
          </h2>
          <div className="mt-8 max-w-[68ch] space-y-5 text-[length:var(--text-body)] leading-relaxed text-[var(--color-text-primary)]">
            <p>{t.s1Body1}</p>
            <p>{fillTemplate(t.s1Body2Template, vars)}</p>
          </div>
        </div>
      </section>

      {/* DARK — 02 who reviews, role cards + the real byline example */}
      <section className="gh-inline-clamp-section-pricing relative overflow-hidden gh-medical-pattern gh-medical-pattern-dark gh2-section-forest">
        <SectionSeam theme="dark" />
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <p aria-hidden className="gh2-index text-[2.5rem] leading-none text-white/20">
            02
          </p>
          <h2 className="mt-3 max-w-[20ch] text-[clamp(1.75rem,3vw+0.5rem,2.75rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-white/92">
            {t.s2Heading}
          </h2>
          <p className="mt-6 max-w-[68ch] text-[length:var(--text-body)] leading-relaxed text-white/78">
            {t.s2Intro}
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              { tag: t.s2AuthorTag, title: t.s2AuthorTitle, body: t.s2AuthorBody },
              { tag: t.s2ReviewerTag, title: t.s2ReviewerTitle, body: t.s2ReviewerBody },
            ].map((role) => (
              /* gh-glass-emerald, not a hand-rolled rgba fill: it is the same
                 forest-glass material the hero trust cards use, and it already
                 carries its solid-forest fallbacks in both the
                 `@media (pointer: coarse)` and `@supports not (backdrop-filter)`
                 blocks of globals.css — so this adds no new glass class. */
              <div key={role.tag} className="gh-glass-emerald rounded-2xl p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-brand-accent)]">
                  {role.tag}
                </p>
                <h3 className="mt-3 text-[1.05rem] font-extrabold leading-snug tracking-[-0.015em] text-white/92">
                  {role.title}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-white/70">{role.body}</p>
              </div>
            ))}
          </div>

          <p className="mt-10 max-w-[68ch] text-[length:var(--text-body)] leading-relaxed text-white/78">
            {t.s2BylineIntro}
          </p>
          {/* Same forest glass as the role cards above, kept distinct by the
              accent rail rather than by a different fill. */}
          <div
            className="gh-glass-emerald mt-4 max-w-[68ch] rounded-r-2xl px-6 py-5"
            style={{ borderLeft: "3px solid var(--color-brand-accent)" }}
          >
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] text-white/85">
              <BadgeCheck className="size-4 shrink-0 text-[var(--color-brand-accent)]" aria-hidden />
              {/* The editorial author, verbatim from the constant every post
                  renders — not a localized string, because it is a brand
                  byline and reads the same in every market. */}
              <span className="font-semibold">{BLOG_AUTHOR_NAME}</span>
              <span aria-hidden className="text-white/25">
                —
              </span>
              <span className="text-white/65">{t.s2ReviewedByLabel}</span>
              {sampleReviewer ? (
                <>
                  {reviewerHref ? (
                    <Link
                      href={reviewerHref}
                      className="gh-focus-on-dark font-semibold underline decoration-[rgba(176,241,34,0.5)] underline-offset-4"
                    >
                      {sampleReviewer.fullName}
                    </Link>
                  ) : (
                    <span className="font-semibold">{sampleReviewer.fullName}</span>
                  )}
                  <span className="tabular-nums text-[var(--color-brand-accent)]">
                    {sampleReviewer.imcRegistration}
                  </span>
                  <span className="text-white/60">, {sampleReviewer.title}</span>
                </>
              ) : (
                /* No admin-verified registration in this market yet — show the
                   SHAPE of the reviewer credit with bracketed placeholders
                   rather than inventing a name or a council number. */
                <>
                  <span className="font-semibold text-white/60">{t.s2BylineFallbackReviewer}</span>
                  <span className="tabular-nums text-white/45">{t.s2BylineFallbackReg}</span>
                </>
              )}
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-white/55">{t.s2BylineFormatNote}</p>
            {registerUrl ? (
              <p className="mt-3">
                <a
                  href={registerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gh-focus-on-dark inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--color-brand-accent)] underline underline-offset-4"
                >
                  <ArrowUpRight className="size-3.5" strokeWidth={2} aria-hidden />
                  {t.s2VerifyLabel} · {contact.regulator.name}
                </a>
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {/* LIGHT — 03 editorial standards, numbered like a policy clause */}
      <section className="gh-inline-clamp-section-pricing relative overflow-hidden gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel">
        <SectionSeam theme="light" />
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <p aria-hidden className="gh2-index text-[2.5rem] leading-none text-[rgba(29,75,54,0.18)]">
            03
          </p>
          <h2 className="mt-3 max-w-[20ch] text-[clamp(1.75rem,3vw+0.5rem,2.75rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-[var(--color-text-primary)]">
            {t.s3Heading}
          </h2>
          <ol className="mt-10 max-w-[72ch] space-y-7">
            {standards.map((std, i) => (
              <li key={std.title} className="grid grid-cols-[2.5rem_1fr] gap-x-4">
                <span
                  aria-hidden
                  className="gh2-index text-[1rem] font-bold leading-[1.6] text-[var(--color-brand-primary)]"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-[length:var(--text-body)] leading-relaxed text-[var(--color-text-muted)]">
                  <strong className="font-bold text-[var(--color-text-primary)]">{std.title}</strong> {std.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* DARK — 04 keeping articles current */}
      <section className="gh-inline-clamp-section-pricing relative overflow-hidden gh-medical-pattern gh-medical-pattern-dark gh2-section-forest">
        <SectionSeam theme="dark" />
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <p aria-hidden className="gh2-index text-[2.5rem] leading-none text-white/20">
            04
          </p>
          <h2 className="mt-3 max-w-[20ch] text-[clamp(1.75rem,3vw+0.5rem,2.75rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-white/92">
            {t.s4Heading}
          </h2>
          <div className="mt-8 max-w-[68ch] space-y-5 text-[length:var(--text-body)] leading-relaxed text-white/78">
            <p>{t.s4Body1}</p>
            <p>{t.s4Body2}</p>
          </div>
        </div>
      </section>

      {/* LIGHT — 05 report an issue */}
      <section
        id="report"
        className="gh-inline-clamp-section-pricing relative overflow-hidden gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel"
      >
        <SectionSeam theme="light" />
        <div className="mx-auto grid max-w-[var(--container-width)] gap-12 px-5 md:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <p aria-hidden className="gh2-index text-[2.5rem] leading-none text-[rgba(29,75,54,0.18)]">
              05
            </p>
            <h2 className="mt-3 text-[clamp(1.75rem,3vw+0.5rem,2.75rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-[var(--color-text-primary)]">
              {t.s5Heading}
            </h2>
          </div>
          <div className="space-y-5 text-[length:var(--text-body)] leading-relaxed text-[var(--color-text-muted)]">
            <p>{t.s5Body}</p>
            <p className="pt-2">
              <a href={contactHref} className="gh-btn gh-btn-primary">
                <Mail className="size-4" strokeWidth={1.75} aria-hidden />
                {t.ctaContact}
              </a>
            </p>
            {/* The disclaimer is country-scoped — there is no global
                /legal/medical-disclaimer route; it lives under the market. */}
            <p className="border-t border-[rgba(29,75,54,0.12)] pt-5 text-[13px] leading-relaxed">
              {t.footerNote}{" "}
              <Link
                href={`${base}/legal/medical-disclaimer`}
                className="font-medium text-[var(--color-brand-primary)] underline underline-offset-4"
              >
                {t.footerDisclaimerLink}
              </Link>
              .
            </p>
            <p className="text-[13px] text-[var(--color-text-muted)]">
              {t.updatedLabel}: <time dateTime={POLICY_UPDATED}>{updatedLabel}</time>
            </p>
          </div>
        </div>
      </section>
    </section>
  );
}
