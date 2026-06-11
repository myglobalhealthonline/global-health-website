import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarClock } from "lucide-react";
import { getCountryByCode } from "@/data/countries";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import { getCountryServiceDetail } from "@/lib/content/get-country-collections";
import { scopeBlogHtml } from "@/lib/content/scope-blog-html";
import { getSiteUrl } from "@/lib/seo/site-url";
import { SITE_NAME } from "@/lib/constants";
import { formatPriceRounded } from "@/lib/format-currency";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqJsonLd } from "@/lib/seo/structured-data";
import { FAQSection } from "@/components/sections/FAQSection";
import { MedicalDisclaimer } from "@/components/sections/MedicalDisclaimer";

type Params = { country: string; lang: string; serviceSlug: string };

/** Back-link target = the listing this service belongs to, by kind. */
function listingPath(kind: string, country: string, lang: string): { href: string; label: string } {
  if (kind === "SPECIALIST") {
    return { href: `/${country}/${lang}/specialist-consultation`, label: "All specialist consultations" };
  }
  if (kind === "PRESCRIPTION") {
    return { href: `/${country}/${lang}/prescriptions`, label: "All prescriptions" };
  }
  return { href: `/${country}/${lang}/general-consultation`, label: "All consultations" };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { country, lang, serviceSlug } = await params;
  const code = countryCodeFromSlug(country);
  if (!code || !isSupportedLocale(lang)) return { title: SITE_NAME };

  const detail = await getCountryServiceDetail(code, serviceSlug, lang);
  if (!detail) return { title: SITE_NAME };

  // When an admin SEO title exists it already carries branding, so set it
  // absolute to bypass the layout's "%s · Global Health" template. Otherwise
  // fall back to the bare service name and let the template add the brand.
  const title = detail.seoTitle ?? detail.name;
  const description =
    detail.seoDescription ?? detail.summary ?? `Learn about ${detail.name} and book a consultation.`;
  const url = `${getSiteUrl()}/${country}/${lang}/services/${serviceSlug}`;
  return {
    title: detail.seoTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: SITE_NAME, title, description, url },
    twitter: { card: "summary_large_image", title, description },
  };
}

/**
 * Read-only service detail page (admin CMS content). "Learn more" on a
 * service card lands here; the page surfaces the admin-authored hero copy,
 * rich detail body, gallery and FAQs, with a "Book this service" CTA that
 * enters the consult doctor-pick flow.
 */
export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { country, lang, serviceSlug } = await params;
  const code = countryCodeFromSlug(country);
  const config = code ? getCountryByCode(code) : null;
  if (!code || !config || !isSupportedLocale(lang)) notFound();

  const detail = await getCountryServiceDetail(code, serviceSlug, lang);
  if (!detail) notFound();

  const back = listingPath(detail.kind, country, lang);
  const bookHref = `/${country}/${lang}/consult/${serviceSlug}`;
  const heading = detail.heroTitle ?? detail.name;
  const lede = detail.heroDescription ?? detail.summary;
  const bodyHtml = detail.detailBody ? scopeBlogHtml(detail.detailBody) : null;

  return (
    <>
      {detail.faqs.length > 0 ? (
        <JsonLd data={faqJsonLd(detail.faqs.map((f) => ({ question: f.question, answer: f.answer })))} />
      ) : null}

      {/* Dark hero — service context */}
      <section
        className="relative isolate overflow-hidden"
        style={{
          background: "var(--color-background-dark)",
          padding: "clamp(56px,7vw,96px) 0 clamp(40px,5vw,64px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 700px 400px at 90% -5%, rgba(176,241,34,0.10), transparent 55%)",
          }}
        />
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <Link
            href={back.href}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium uppercase tracking-[0.12em] transition-colors hover:text-white"
            style={{ color: "rgba(255,255,255,0.50)" }}
          >
            <ArrowLeft className="size-4" aria-hidden />
            {back.label}
          </Link>

          {detail.specialtyName ? (
            <div className="mt-6 flex items-center gap-2">
              <CalendarClock
                className="size-4"
                style={{ color: "var(--color-brand-accent)" }}
                aria-hidden
              />
              <p
                className="text-[11px] font-bold uppercase tracking-[0.2em]"
                style={{ color: "var(--color-brand-accent)" }}
              >
                {detail.specialtyName}
              </p>
            </div>
          ) : null}

          <h1
            className="mt-4 font-extrabold tracking-[-0.03em] leading-[1.02]"
            style={{ fontSize: "clamp(2rem, 4.5vw + 0.5rem, 4rem)", color: "rgba(255,255,255,0.95)" }}
          >
            {heading}
          </h1>

          {lede ? (
            <p
              className="mt-3 max-w-[52ch] text-[length:var(--text-body-lg)] leading-relaxed"
              style={{ color: "rgba(255,255,255,0.50)" }}
            >
              {lede}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: "rgba(176,241,34,0.12)", color: "var(--color-brand-accent)" }}
            >
              {detail.basePriceCents != null
                ? formatPriceRounded(detail.basePriceCents, detail.currencyCode)
                : "Price varies"}
            </span>
            {detail.durationMinutes != null ? (
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.70)" }}
              >
                {detail.durationMinutes} min
              </span>
            ) : null}
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
              {config.name}
            </span>
          </div>

          <div className="mt-8">
            <Link href={bookHref} className="gh2-btn-lime">
              {detail.ctaLabel ?? "Book this service"}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* Admin-authored rich detail body — sanitized on save, CSS-scoped. */}
      {bodyHtml ? (
        <section
          className="mx-auto max-w-[var(--container-width)]"
          style={{
            background: "var(--color-background-page)",
            padding: "clamp(48px,6vw,80px) clamp(20px,4vw,40px)",
          }}
        >
          <div className="gh-article-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        </section>
      ) : null}

      {/* Gallery */}
      {detail.gallery.length > 0 ? (
        <section style={{ background: "var(--color-background-soft)", padding: "clamp(40px,5vw,72px) 0" }}>
          <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {detail.gallery.map((src, i) => (
                <div
                  key={src}
                  className="overflow-hidden rounded-[var(--radius-card)]"
                  style={{ aspectRatio: "4 / 3", background: "var(--color-background-page)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`${detail.name} — image ${i + 1}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {detail.faqs.length > 0 ? (
        <FAQSection title="Frequently Asked Questions" items={detail.faqs} />
      ) : null}

      {/* Book CTA */}
      <section
        style={{
          background: "var(--color-background-dark)",
          padding: "clamp(56px,7vw,96px) 0",
          borderTop: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <div className="grid items-end gap-8 lg:grid-cols-[1.6fr_1fr]">
            <div>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.2em]"
                style={{ color: "var(--color-brand-accent)" }}
              >
                Ready when you are
              </p>
              <h2
                className="mt-4 font-extrabold tracking-[-0.03em] leading-[1.02]"
                style={{ fontSize: "clamp(2rem, 4vw + 0.5rem, 3.5rem)", color: "rgba(255,255,255,0.92)" }}
              >
                Book {detail.name} in {config.name}
              </h2>
            </div>
            <Link href={bookHref} className="gh2-btn-lime lg:justify-self-end">
              {detail.ctaLabel ?? "Book this service"}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <MedicalDisclaimer
        paragraphs={[
          `Information on this page is general and is not a substitute for professional medical advice, diagnosis or treatment. Book a consultation to discuss your situation with a doctor registered to practise in ${config.name}.`,
        ]}
      />
    </>
  );
}
