import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  Languages,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Video,
} from "lucide-react";
import { getCountryByCode } from "@/data/countries";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import {
  formatOffice,
  getCountryContact,
  resolveContactCopy,
  type ContactCopyTemplates,
} from "@/lib/content/country-contact";
import { SITE_NAME } from "@/lib/constants";
import { PageHero } from "@/components/sections/PageHero";
import { ContactArchPanel } from "@/components/sections/ContactArchPanel";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { FAQSection } from "@/components/sections/FAQSection";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  breadcrumbJsonLd,
  countryMedicalOrganizationJsonLd,
  faqJsonLd,
} from "@/lib/seo/structured-data";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { hreflangAlternates, ogLocales } from "@/lib/seo/hreflang";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { buildBookHref } from "@/lib/routing/book-href";

export const revalidate = 300;

type Params = { country: string; lang: string };

/** Route params → country config, contact facts and locale-resolved copy. */
function resolve(country: string, lang: string) {
  const code = countryCodeFromSlug(country);
  const config = code ? getCountryByCode(code) : null;
  if (!code || !config || !isSupportedLocale(lang)) return null;
  const contact = getCountryContact(code);
  if (!contact) return null;
  const bundle = loadLocaleBundle(lang as LocaleCode).contact;
  const t = bundle.country as unknown as ContactCopyTemplates & Record<string, string>;
  const copy = resolveContactCopy(contact, lang as LocaleCode, config.name, t);
  return { code, config, contact, copy, t };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { country, lang } = await params;
  const resolved = resolve(country, lang);
  if (!resolved) return { title: SITE_NAME };
  const { config, copy } = resolved;

  return buildPublicMetadata({
    path: `/${country}/${lang}/contact`,
    title: copy.title,
    description: copy.description,
    // The title already carries the brand; the layout suffix would push it
    // past the ~60-char display budget for no gain.
    brandSuffix: false,
    type: "website",
    kind: "page",
    subtitle: config.name,
    imageAlt: `${copy.h1} — ${config.name}`,
    locale: ogLocales(config, lang).locale,
    languages: hreflangAlternates(config, "/contact"),
  });
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Phone;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li
      className="gh2-glass-forest flex items-start gap-3"
      style={{
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: "var(--radius-card)",
        padding: "1rem",
      }}
    >
      <span
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-full"
        style={{
          background: "rgba(176,241,34,0.10)",
          border: "1px solid rgba(176,241,34,0.18)",
        }}
      >
        <Icon
          className="size-4"
          style={{ color: "var(--color-brand-accent)" }}
          strokeWidth={1.5}
          aria-hidden
        />
      </span>
      <div className="min-w-0">
        <p
          className="text-[length:var(--text-meta)] font-semibold"
          style={{ color: "rgba(255,255,255,0.92)" }}
        >
          {label}
        </p>
        <div className="mt-0.5 text-sm" style={{ color: "rgba(255,255,255,0.72)" }}>
          {children}
        </div>
      </div>
    </li>
  );
}

export default async function CountryContactPage({ params }: { params: Promise<Params> }) {
  const { country, lang } = await params;
  const resolved = resolve(country, lang);
  if (!resolved) notFound();
  const { code, config, contact, copy, t } = resolved;
  const common = loadLocaleBundle(lang as LocaleCode).common;

  const office = contact.office;
  const bookHref = buildBookHref({ country, lang });
  const accent = { color: "var(--color-brand-accent)" };

  return (
    <section>
      <JsonLd
        data={countryMedicalOrganizationJsonLd({
          name: config.name,
          slug: config.slug || country,
          url: `/${country}/${lang}/contact`,
          regulator: contact.regulator,
          // Registered office only, never LocalBusiness — see the helper.
          address: office
            ? {
                streetAddress: office.streetLines.join(", "),
                addressLocality: office.locality,
                postalCode: office.postalCode,
                addressCountry: office.addressCountry,
              }
            : null,
          contactPoint: {
            telephone: contact.phoneE164,
            email: contact.email,
            availableLanguage: contact.phoneLanguages,
          },
        })}
      />
      <JsonLd data={faqJsonLd(copy.faqs)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: common.navigation.home, url: "/" },
          { name: common.countryNames?.[code] ?? config.name, url: `/${country}/${lang}` },
          { name: t.breadcrumb, url: `/${country}/${lang}/contact` },
        ])}
      />

      {/* DARK — hero, same primitive and rhythm as the global /contact page */}
      <PageHero
        countryCode={config.code}
        countryLabel={`${SITE_NAME} · ${config.name}`}
        watermark={t.watermark}
        titleLead={copy.h1}
        titleAccent=""
        lede={copy.intro}
        ctaLabel={t.ctaBook}
        ctaHref={bookHref}
        secondaryLabel={t.ctaDoctors}
        secondaryHref={`/${country}/${lang}/doctors`}
        trustCards={[
          {
            icon: <Phone className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: t.phoneLabel,
            subtitle: contact.phoneDisplay,
          },
          {
            icon: <Mail className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: t.emailLabel,
            subtitle: contact.email,
          },
          office
            ? {
                icon: <Building2 className="size-[18px]" strokeWidth={2} aria-hidden />,
                title: t.registeredOfficeLabel,
                subtitle: `${office.locality}, ${office.countryName}`,
              }
            : {
                icon: <Video className="size-[18px]" strokeWidth={2} aria-hidden />,
                title: t.onlineOnlyLabel,
                subtitle: config.name,
              },
        ]}
        rightSlot={
          <ContactArchPanel
            alt={t.heroImageAlt}
            floats={[
              // Ping dot, matching the global page's first badge.
              { icon: null, title: t.floatRegistered, subtitle: contact.regulator.name },
              {
                icon: <Languages className="size-4" strokeWidth={2} aria-hidden />,
                title: t.floatLanguages,
                subtitle: contact.phoneLanguages.join(" / "),
              },
              office
                ? {
                    icon: <MapPin className="size-4" strokeWidth={2} aria-hidden />,
                    title: t.registeredOfficeLabel,
                    subtitle: `${office.locality}, ${office.countryName}`,
                  }
                : {
                    icon: <Video className="size-4" strokeWidth={2} aria-hidden />,
                    title: t.onlineOnlyLabel,
                    subtitle: config.name,
                  },
            ]}
          />
        }
        mobileBgSrc="/images/stock/contact.jpg"
      />

      {/* LIGHT — reach + registration, with the contact card alongside */}
      <section className="relative gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel">
        <SectionSeam theme="light" />
        <div className="mx-auto max-w-[var(--container-width)] gh-section px-5 md:px-10">
          <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <h2
                className="text-2xl font-extrabold tracking-[-0.015em]"
                style={{ color: "var(--color-text-primary)" }}
              >
                {copy.reachHeading}
              </h2>
              <p
                className="mt-4 max-w-[62ch] text-[16px] leading-[1.7]"
                style={{ color: "var(--color-text-body)" }}
              >
                {copy.reachBody}
              </p>

              <h2
                className="mt-10 text-2xl font-extrabold tracking-[-0.015em]"
                style={{ color: "var(--color-text-primary)" }}
              >
                {copy.regulatoryHeading}
              </h2>
              <p
                className="mt-4 max-w-[62ch] text-[16px] leading-[1.7]"
                style={{ color: "var(--color-text-body)" }}
              >
                {copy.regulatoryBody}
              </p>
              <p className="mt-3 text-[15px]">
                <a
                  href={contact.regulator.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-medium underline underline-offset-2"
                  style={{ color: "var(--color-brand-primary)" }}
                >
                  <BadgeCheck className="size-4" strokeWidth={1.75} aria-hidden />
                  {contact.regulator.name}
                </a>
              </p>

              <div className="mt-10 flex flex-wrap gap-3">
                <Link href={bookHref} className="gh-btn gh-btn-primary">
                  {t.ctaBook}
                </Link>
                <Link href={`/${country}/${lang}/doctors`} className="gh-btn gh-btn-outline">
                  {t.ctaDoctors}
                </Link>
              </div>
            </div>

            <aside>
              <h2
                className="text-xl font-extrabold tracking-[-0.015em]"
                style={{ color: "var(--color-text-primary)" }}
              >
                {t.detailsHeading}
              </h2>
              <ul className="mt-6 space-y-3">
                <DetailRow icon={Phone} label={t.phoneLabel}>
                  <a href={`tel:${contact.phoneE164}`} className="hover:underline" style={accent}>
                    {contact.phoneDisplay}
                  </a>
                </DetailRow>
                <DetailRow icon={Mail} label={t.emailLabel}>
                  <a href={`mailto:${contact.email}`} className="hover:underline" style={accent}>
                    {contact.email}
                  </a>
                </DetailRow>
                {office ? (
                  <DetailRow icon={MapPin} label={t.registeredOfficeLabel}>
                    <address className="not-italic">{formatOffice(office)}</address>
                    <p className="mt-2 text-[13px]" style={{ color: "rgba(255,255,255,0.55)" }}>
                      {t.noWalkIn}
                    </p>
                  </DetailRow>
                ) : (
                  <DetailRow icon={Video} label={t.onlineOnlyLabel}>
                    {t.onlineOnlyBody.replace("{country}", config.name)}
                  </DetailRow>
                )}
                <DetailRow icon={ShieldCheck} label={t.faqEyebrow}>
                  {t.emergencyNote}
                </DetailRow>
              </ul>
            </aside>
          </div>
        </div>
      </section>

      <FAQSection title={copy.faqHeading} items={copy.faqs} theme="dark" eyebrow={t.faqEyebrow} />
    </section>
  );
}
