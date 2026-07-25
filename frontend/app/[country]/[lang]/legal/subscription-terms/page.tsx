import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCountryByCode } from "@/data/countries";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import { hreflangAlternates } from "@/lib/seo/hreflang";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { SITE_NAME } from "@/lib/constants";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

type Params = { country: string; lang: string };

// Static "last updated" stamp — bump when the terms copy changes.
const LAST_UPDATED = "21 June 2026";

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { country, lang } = await params;
  const code = countryCodeFromSlug(country);
  const config = code ? getCountryByCode(code) : null;
  if (!code || !config || !isSupportedLocale(lang)) return { title: SITE_NAME };
  const { subscription } = loadLocaleBundle(lang as LocaleCode);
  const title = `${subscription.legal.title} · ${config.name}`;
  return buildPublicMetadata({
    path: `/${country}/${lang}/legal/subscription-terms`,
    title,
    description: subscription.legal.intro,
    locale: `${lang}_${code.toUpperCase()}`,
    subtitle: config.name,
    imageAlt: `${subscription.legal.title} — ${config.name}`,
    languages: hreflangAlternates(config, "/legal/subscription-terms"),
  });
}

function Section({ heading, body }: { heading: string; body: string }) {
  return (
    <section>
      <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">{heading}</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-text-body)]">{body}</p>
    </section>
  );
}

export default async function SubscriptionTermsPage({ params }: { params: Promise<Params> }) {
  const { country: slug, lang } = await params;
  const code = countryCodeFromSlug(slug);
  if (!code) notFound();
  const config = getCountryByCode(code);
  if (!config) notFound();
  if (!isSupportedLocale(lang)) notFound();

  const { subscription } = loadLocaleBundle(lang as LocaleCode);
  const t = subscription.legal;

  // Country-aware tax paragraph (§40 / D21) — generic wording keyed to the
  // resolved country; the per-country VAT specifics live in CountryLegalProfile
  // and are surfaced on the main /legal page.
  const taxBody = t.tax_p.replace("{country}", config.name);

  return (
    <>
      <header
        className="gh-medical-pattern gh-medical-pattern-dark relative isolate overflow-hidden text-white"
        style={{ background: "#0F2E25" }}
      >
        <div
          className="relative z-[1] mx-auto max-w-3xl px-5 md:px-10"
          style={{ paddingTop: "clamp(56px,7vw,96px)", paddingBottom: "clamp(32px,4vw,56px)" }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: "var(--color-brand-accent)" }}>
            {t.eyebrow}
          </p>
          <h1
            className="mt-3 font-extrabold tracking-[-0.03em]"
            style={{ fontSize: "clamp(2rem,4vw + 0.5rem,3.25rem)", color: "rgba(255,255,255,0.96)", lineHeight: 1.05 }}
          >
            {t.title}
          </h1>
          <p className="mt-4 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
            {t.lastUpdated.replace("{date}", LAST_UPDATED)}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 md:px-10" style={{ padding: "clamp(40px,5vw,72px) 20px" }}>
        <p className="text-[15px] leading-relaxed text-[var(--color-text-body)]">{t.intro}</p>
        <div className="mt-10 space-y-9">
          <Section heading={t.billing_h} body={t.billing_p} />
          <Section heading={t.renewal_h} body={t.renewal_p} />
          <Section heading={t.cancellation_h} body={t.cancellation_p} />
          <Section heading={t.refund_h} body={t.refund_p} />
          <Section heading={t.price_h} body={t.price_p} />
          <Section heading={t.tax_h} body={taxBody} />
          <Section heading={t.scope_h} body={t.scope_p} />
          <Section heading={t.credits_h} body={t.credits_p} />
          <Section heading={t.contact_h} body={t.contact_p} />
        </div>
      </div>
    </>
  );
}
