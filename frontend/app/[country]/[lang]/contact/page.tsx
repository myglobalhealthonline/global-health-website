import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, MapPin, Phone } from "lucide-react";
import { getCountryByCode } from "@/data/countries";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import {
  formatOffice,
  getCountryContact,
  resolveContactCopy,
} from "@/lib/content/country-contact";
import { SITE_NAME } from "@/lib/constants";
import { GH2CompactHero } from "@/components/sections/GH2PagePrimitives";
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

/** Resolves the route params to a country config + its contact record. */
function resolve(country: string, lang: string) {
  const code = countryCodeFromSlug(country);
  const config = code ? getCountryByCode(code) : null;
  if (!code || !config || !isSupportedLocale(lang)) return null;
  const contact = getCountryContact(code);
  if (!contact) return null;
  const copy = resolveContactCopy(contact, lang as LocaleCode, config.defaultLocale);
  if (!copy) return null;
  return { code, config, contact, copy };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { country, lang } = await params;
  const resolved = resolve(country, lang);
  if (!resolved) return { title: SITE_NAME };
  const { code, config, copy } = resolved;

  return buildPublicMetadata({
    path: `/${country}/${lang}/contact`,
    title: copy.title,
    description: copy.description,
    // copy.title already carries the brand, so the layout's " · Global Health"
    // suffix would push it past the ~60-char display budget for no gain.
    brandSuffix: false,
    type: "website",
    kind: "page",
    subtitle: config.name,
    imageAlt: `${copy.h1} — ${config.name}`,
    locale: ogLocales(config, lang).locale,
    languages: hreflangAlternates(config, "/contact"),
  });
}

function ContactRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Phone;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon
        className="mt-0.5 size-5 shrink-0 text-[var(--color-brand-primary)]"
        strokeWidth={1.75}
        aria-hidden
      />
      <div>
        <p className="m-0 text-[13px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
          {label}
        </p>
        <div className="mt-1 text-[15px] text-[var(--color-text-body)]">{children}</div>
      </div>
    </div>
  );
}

export default async function CountryContactPage({ params }: { params: Promise<Params> }) {
  const { country, lang } = await params;
  const resolved = resolve(country, lang);
  if (!resolved) notFound();
  const { code, config, contact, copy } = resolved;

  // `contact.json` merges the English bundle underneath every locale, so a
  // key that has not been translated yet renders in English rather than blank.
  const t = loadLocaleBundle(lang as LocaleCode).contact.country;
  const office = contact.office;
  const bookHref = buildBookHref({ country, lang });

  return (
    <>
      <JsonLd
        data={countryMedicalOrganizationJsonLd({
          name: config.name,
          slug: config.slug || country,
          url: `/${country}/${lang}/contact`,
          regulator: contact.regulator,
          // Registered office only — see the note on the helper. Markets with
          // no premises pass null and emit no address at all.
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
          { name: "Home", url: "/" },
          { name: config.name, url: `/${country}/${lang}` },
          { name: t.breadcrumb, url: `/${country}/${lang}/contact` },
        ])}
      />

      <GH2CompactHero
        eyebrow={config.name}
        title={copy.h1}
        body={copy.intro}
        watermark={t.watermark}
        backHref={`/${country}/${lang}`}
        backLabel={config.name}
      />

      <section className="gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel relative overflow-hidden">
        <div className="gh2-container py-14 md:py-20">
          <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:gap-14">
            <div>
              <h2 className="text-2xl font-extrabold tracking-[-0.015em] text-[var(--color-text-primary)]">
                {copy.reachHeading}
              </h2>
              <p className="mt-4 max-w-[62ch] text-[16px] leading-[1.7] text-[var(--color-text-body)]">
                {copy.reachBody}
              </p>

              <h2 className="mt-10 text-2xl font-extrabold tracking-[-0.015em] text-[var(--color-text-primary)]">
                {copy.regulatoryHeading}
              </h2>
              <p className="mt-4 max-w-[62ch] text-[16px] leading-[1.7] text-[var(--color-text-body)]">
                {copy.regulatoryBody}
              </p>
              <p className="mt-3 text-[15px]">
                <a
                  href={contact.regulator.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[var(--color-brand-primary)] underline underline-offset-2"
                >
                  {contact.regulator.name}
                </a>
              </p>

              <div className="mt-10 flex flex-wrap gap-3">
                <Link href={bookHref} className="gh2-btn gh2-btn-primary">
                  {t.ctaBook}
                </Link>
                <Link href={`/${country}/${lang}/doctors`} className="gh2-btn gh2-btn-ghost">
                  {t.ctaDoctors}
                </Link>
              </div>
            </div>

            <aside className="gh2-card-ivory h-fit rounded-[22px] p-6 md:p-7">
              <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
                {t.detailsHeading}
              </h2>
              <div className="mt-5 space-y-5">
                <ContactRow icon={Phone} label={t.phoneLabel}>
                  <a
                    href={`tel:${contact.phoneE164}`}
                    className="font-medium text-[var(--color-brand-primary)] underline underline-offset-2"
                  >
                    {contact.phoneDisplay}
                  </a>
                </ContactRow>
                <ContactRow icon={Mail} label={t.emailLabel}>
                  <a
                    href={`mailto:${contact.email}`}
                    className="font-medium text-[var(--color-brand-primary)] underline underline-offset-2"
                  >
                    {contact.email}
                  </a>
                </ContactRow>
                {office ? (
                  <ContactRow icon={MapPin} label={t.registeredOfficeLabel}>
                    <address className="not-italic">{formatOffice(office)}</address>
                    <p className="m-0 mt-2 text-[13px] text-[var(--color-text-muted)]">
                      {t.noWalkIn}
                    </p>
                  </ContactRow>
                ) : (
                  <ContactRow icon={MapPin} label={t.onlineOnlyLabel}>
                    <p className="m-0">{t.onlineOnlyBody.replace("{country}", config.name)}</p>
                  </ContactRow>
                )}
              </div>
              <p className="mt-6 border-t border-[color-mix(in_srgb,var(--color-text-muted)_25%,transparent)] pt-4 text-[13px] leading-[1.6] text-[var(--color-text-muted)]">
                {t.emergencyNote}
              </p>
            </aside>
          </div>
        </div>
      </section>

      <FAQSection title={copy.faqHeading} items={copy.faqs} theme="dark" eyebrow={t.faqEyebrow} />
    </>
  );
}
