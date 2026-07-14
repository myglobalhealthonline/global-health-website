import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { JsonLd } from "@/components/seo/JsonLd";
import { ServicesGrid } from "@/components/sections/ServicesGrid";
import { ServiceHero } from "@/components/sections/ServiceHero";
import { MessageCircle, ShieldCheck, Clock, Star, Lock } from "lucide-react";
import { isUnoptimizedImageSrc } from "@/lib/content/asset-media-url";
import { DoctorsSection } from "@/components/sections/DoctorsSection";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { StickyBookingCTA } from "@/components/sections/StickyBookingCTA";
import { FAQSection } from "@/components/sections/FAQSection";
import { MedicalDisclaimer } from "@/components/sections/MedicalDisclaimer";
import {
  ServiceIntro,
  ChecklistSection,
  WhyChooseSection,
} from "@/components/sections/ServiceContentSections";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { getCountryByCode } from "@/data/countries";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
import { isCountryFeatureEnabled } from "@/lib/content/country-features";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { countryLangParams } from "@/lib/routing/static-params";
import { buildBookHref } from "@/lib/routing/book-href";
import { getSiteUrl } from "@/lib/seo/site-url";
import { resolveBrandTitle } from "@/lib/seo/page-seo";
import { breadcrumbJsonLd, medicalProcedureJsonLd, faqJsonLd } from "@/lib/seo/structured-data";
import { hreflangAlternates, ogLocales } from "@/lib/seo/hreflang";
import {
  getPageContent,
  isSupportedLocale,
  themeProp,
  type PublicLocale,
} from "@/lib/content/get-page-content";
import {
  getCountryDoctors,
  getCountryServices,
} from "@/lib/content/get-country-collections";
import { SITE_NAME } from "@/lib/constants";
import { formatPriceRounded } from "@/lib/format-currency";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { DoctifyReviewsSectionLazy as DoctifyReviewsSection } from "@/components/sections/DoctifyReviewsLazy";

type Params = { country: string; lang: string };

export async function generateStaticParams(): Promise<Params[]> {
  return countryLangParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { country, lang } = await params;
  const code = countryCodeFromSlug(country);
  const config = code ? getCountryByCode(code) : null;
  if (!code || !config || !isSupportedLocale(lang)) return { title: SITE_NAME };

  const { record: page } = await getPageContent(code, "GENERAL_CONSULTATION", lang as PublicLocale);
  const url = `${getSiteUrl()}/${country}/${lang}/gp-consultation-online`;
  const title =
    page?.seoTitle ?? `General practitioners registered in ${config.name}`;
  const description =
    page?.seoDescription ??
    `General practitioners registered to practise in ${config.name}. View credentials and languages, then book a consultation.`;
  return {
    // resolveBrandTitle returns an absolute title when the (CMS- or hub-)
    // authored title already contains the brand, so the layout's
    // "%s · Global Health" template never doubles it.
    title: resolveBrandTitle(title),
    description,
    alternates: { canonical: url, languages: hreflangAlternates(config, "/gp-consultation-online") },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url,
      ...ogLocales(config, lang),
      ...(page?.ogImageSrc ? { images: [{ url: page.ogImageSrc }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(page?.ogImageSrc ? { images: [{ url: page.ogImageSrc }] } : {}),
    },
  };
}

function formatPrice(cents: number | null, currency: string | null): string | undefined {
  if (cents == null) return undefined;
  return formatPriceRounded(cents, currency);
}

function formatDuration(minutes: number | null): string | undefined {
  if (minutes == null) return undefined;
  return `${minutes} min`;
}

export default async function CountryLangGeneralConsultationPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { country: slug, lang } = await params;
  const code = countryCodeFromSlug(slug);
  if (!code) notFound();
  const config = getCountryByCode(code);
  if (!config) notFound();
  if (!isSupportedLocale(lang)) notFound();

  const { common: c, home } = loadLocaleBundle(lang as LocaleCode);
  const gp = c.gpPage;

  // Honor the per-country `general-consultations` toggle from /admin/country-features.
  const overlay = await getPublicCountryByCode(code);
  if (!isCountryFeatureEnabled(overlay, "general-consultations")) notFound();
  // Independent of each other (and of `overlay`, already resolved above) —
  // started together instead of awaited one after another.
  const [{ record: rawPage, disabled: pageDisabled }, services, doctors] =
    await Promise.all([
      getPageContent(code, "GENERAL_CONSULTATION", lang as PublicLocale),
      getCountryServices(code, "GENERAL", lang),
      getCountryDoctors(code, lang),
    ]);

  // Structured PageContent self-gates via publish status + per-section
  // toggles (the `disabled` flag already covers unpublished/inactive), so the
  // legacy coarse "pages" country-feature no longer gates it.
  const page = pageDisabled ? null : rawPage;

  // Long-form GP positioning copy, now DB-backed (per country) instead of
  // hardcoded to Ireland. `hubActive` mirrors the old `gpHub` truthy gate
  // used for the hero country label — true whenever any of the marketing
  // sections (intro/whoFor/whyChoose/faq) is toggled on for this country.
  const hubActive = !!(
    page?.sections.intro ||
    page?.sections.whoFor ||
    page?.sections.whyChoose ||
    page?.sections.faq
  );

  // Provider-first defaults per Google Ads "restricted services" guidance.
  // Admin can override via the PageContent row when localised copy lands.
  const heroTitle = page?.heroTitle ?? gp.heroTitle;
  const heroSubtitle =
    page?.heroSubtitle ?? gp.heroSubtitle.replace("{country}", config.name);
  const ctaLabel = page?.ctaLabel ?? c.doctors.bookAppointment;
  // Hero headline: DB `heroTitleLead`/`heroTitleAccent` override the i18n
  // lead/accent when authored (e.g. IE's "Online GP Consultation in" +
  // accent "Ireland"); falls back to the generic i18n composition otherwise.
  const heroLead = page?.heroTitleLead ?? gp.heroLead;
  const heroAccent = page?.heroTitleAccent ?? gp.heroAccent;
  // Authored DB headline carries no trail word (matches the old IE hub copy);
  // the generic i18n composition keeps its trail.
  const heroTrail = page?.heroTitleLead ? undefined : gp.heroTrail;
  // Cart-first booking: hero CTA jumps to the in-page service list
  // instead of the legacy /book-online form. Admin can still override
  // via the ContentPage row.
  const ctaHref =
    page?.ctaHref ??
    buildBookHref({ country: slug, lang, service: services[0]?.slug ?? null });

  // Map Service rows to the ServicesGrid card shape. Cards auto-appear when
  // admin adds a Service row of kind=GENERAL for this country.
  // Each service card links to the booking form WITH `?service=<slug>`
  // so the backend resolves the catalogue price + triggers Stripe Checkout.
  // Without this the priced services would never actually charge.
  const serviceItems = services.map((s) => ({
    title: s.name,
    description: s.summary,
    // Two CTAs: "Learn more" opens the read-only service detail page;
    // "Book" enters the consult doctor-pick flow (cart-first booking).
    detailHref: `/${slug}/${lang}/services/${s.slug}`,
    bookHref: buildBookHref({ country: slug, lang, service: s.slug }),
    bookLabel: c.doctors.bookAppointment,
    serviceType: "general" as const,
    duration: formatDuration(s.durationMinutes),
    startingPrice: formatPrice(s.basePriceCents, s.currencyCode),
    imageSrc: s.imageSrc ?? null,
  }));

  // Doctor cards — admin adding a Doctor row for this country adds a card.
  const doctorItems = doctors.slice(0, 6).map((d) => ({
    name: d.fullName,
    title: d.title,
    bio: d.bio ?? "",
    languages: d.languages,
    country: config.name,
    imageSrc: d.imageSrc ?? null,
    href: `/${slug}/${lang}/doctors/${d.slug}`,
    bookingHref: buildBookHref({ country: slug, lang, doctor: d.slug }),
    whatsappNumber: d.whatsappNumber,
    ctaLabel: c.doctors.viewProfile,
  }));

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: config.name, url: `/${slug}/${lang}` },
          { name: "Online GP consultation", url: `/${slug}/${lang}/gp-consultation-online` },
        ])}
      />
      <JsonLd
        data={medicalProcedureJsonLd({
          name: `General practitioners in ${config.name}`,
          description: `Network of general practitioners registered to practise in ${config.name}. Profiles include credentials, specialties and languages.`,
          countryName: config.name,
          url: `/${slug}/${lang}/gp-consultation-online`,
          bookingUrl: ctaHref,
        })}
      />

      {/* Hero — dark editorial, shared with every inner page. Admin
        * copy still takes precedence via the heroTitle / heroSubtitle
        * overrides; titleAccent is the only place we baked in the
        * page-type-specific italic word. */}
      {page?.sections.faq ? (
        <JsonLd data={faqJsonLd(page.faq)} />
      ) : null}

      <ServiceHero
        countryCode={config.code}
        countryLabel={
          hubActive
            ? gp.countryLabelGp.replace("{country}", config.name)
            : gp.countryLabelGeneral.replace("{country}", config.name)
        }
        titleLead={heroLead}
        titleAccent={heroAccent}
        titleTrail={heroTrail}
        lede={heroSubtitle}
        primaryCta={{ label: ctaLabel, href: ctaHref }}
        secondaryCta={{
          label: gp.secondaryLabel,
          href: `/${slug}/${lang}/doctors`,
        }}
        heroImage={{
          src: "/images/stock/gp.jpg",
          alt: `General practitioner available for an online consultation in ${config.name}`,
          priority: true,
        }}
        featureCards={[
          {
            icon: <MessageCircle className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: gp.hero.feature1Title,
            subtitle: gp.hero.feature1Subtitle,
          },
          {
            icon: <ShieldCheck className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: gp.hero.feature2Title,
            subtitle: gp.hero.feature2Subtitle,
          },
          {
            icon: <Clock className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: gp.hero.feature3Title,
            subtitle: gp.hero.feature3Subtitle,
          },
        ]}
        trustStats={[
          {
            icon: <ShieldCheck className="size-5" strokeWidth={2} aria-hidden />,
            title: gp.hero.stat1Title.replace("{country}", config.name),
            subtitle: gp.hero.stat1Subtitle.replace("{country}", config.name),
          },
          {
            icon: <Star className="size-5" strokeWidth={2} aria-hidden />,
            title: gp.hero.stat2Title.replace("{country}", config.name),
            subtitle: gp.hero.stat2Subtitle.replace("{country}", config.name),
          },
          {
            icon: <Lock className="size-5" strokeWidth={2} aria-hidden />,
            title: gp.hero.stat3Title.replace("{country}", config.name),
            subtitle: gp.hero.stat3Subtitle.replace("{country}", config.name),
          },
        ]}
      />

      {page?.heroImageSrc ? (
        <section className="gh2-section-forest gh-medical-pattern gh-medical-pattern-dark" style={{ padding: "clamp(64px,8vw,120px) 0" }}>
          <SectionSeam theme="dark" />
          <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10 -mt-16 relative">
            <div
              className="relative w-full overflow-hidden rounded-[var(--radius-card)]"
              style={{ border: "1px solid rgba(255,255,255,0.09)", aspectRatio: "2.2 / 1", maxHeight: 480 }}
            >
              <Image
                src={page.heroImageSrc}
                alt={heroTitle}
                fill
                sizes="(min-width:1024px) 1024px, 100vw"
                className="object-cover"
                unoptimized={isUnoptimizedImageSrc(page.heroImageSrc)}
              />
            </div>
          </div>
        </section>
      ) : null}

      {/* 1 — What this is: short authored positioning intro (when present). */}
      {page?.sections.intro ? (
        <ServiceIntro body={page.intro!} theme={themeProp(page?.introTheme, "light")} />
      ) : null}

      {/* 2 — The product: bookable GP consultations, straight after the hero
          so the offer is visible before any supporting copy. */}
      {serviceItems.length > 0 ? (
        <div id="services" className="scroll-mt-24">
          <ServicesGrid
            eyebrow={gp.practiceAreas}
            title={gp.gpConsultationsTitle}
            intro={gp.gpConsultationsIntro
              .replace("{count}", String(serviceItems.length))
              .replace("{consultation}", serviceItems.length === 1 ? gp.consultation : gp.consultations)
              .replace("{country}", config.name)}
            items={serviceItems}
            variant="dark"
          />
        </div>
      ) : null}

      {/* Who it's for (authored hub copy, when present). */}
      {page?.sections.whoFor ? (
        <ChecklistSection
          eyebrow="Who it's for"
          title={page.whoForTitle!}
          intro={page.whoForIntro ?? undefined}
          items={page.whoForItems}
          theme={themeProp(page?.whoForTheme, "light")}
        />
      ) : null}

      {/* 5 — The clinicians behind the service. Dark band so the page keeps
          a strict dark/light rhythm: services (dark) → who-for (ivory) →
          doctors (dark) → why-choose (ivory) → FAQ (dark) → reviews (ivory). */}
      {doctorItems.length > 0 ? (
        <DoctorsSection
          title={gp.doctorsSectionTitle.replace("{country}", config.name)}
          intro={gp.doctorsSectionIntro}
          doctors={doctorItems}
          theme="dark"
        />
      ) : null}

      {page?.sections.whyChoose ? (
        <WhyChooseSection
          title={page.whyChooseTitle!}
          items={page.whyChooseItems}
          theme={themeProp(page?.whyChooseTheme, "soft")}
        />
      ) : null}

      {/* FAQs + closing CTA. */}
      {page?.sections.faq ? (
        <FAQSection
          title={gp.faqTitle}
          items={page.faq}
          theme={themeProp(page?.faqTheme, "dark")}
        />
      ) : null}

      <DoctifyReviewsSection
        theme="ivory"
        variant="carousel"
        language={lang}
        eyebrow="Patient reviews"
        headline="Trusted by patients in"
        headlineAccent={config.name}
        body="Independent, verified reviews collected by Doctify from patients treated by our clinicians."
      />

      <FinalCTA primaryHref={ctaHref} secondaryHref={`/${slug}/${lang}/doctors`} i18n={home.finalCta} />
      <StickyBookingCTA href={ctaHref} />

      {page?.sections.disclaimer ? (
        <MedicalDisclaimer
          paragraphs={page.disclaimerParagraphs}
          theme={themeProp(page?.disclaimerTheme, "dark")}
        />
      ) : null}
    </>
  );
}
