import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  Clock,
  FileText,
  Lock,
  ShieldCheck,
  Stethoscope,
  Video,
} from "lucide-react";
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
import {
  WhyChooseSection,
  ProcessStepsSection,
} from "@/components/sections/ServiceContentSections";
import { MedicalDisclaimer } from "@/components/sections/MedicalDisclaimer";

type Params = { country: string; lang: string; serviceSlug: string };

/** Admin copy may arrive as rich HTML — flatten to plain text for ledes. */
function stripHtml(value: string | null): string | null {
  if (!value) return value;
  const text = value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 0 ? text : null;
}

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
 * Service landing page (admin CMS content). "Learn more" on a service card
 * lands here. Layout: dark gh2 hero with a sticky booking panel, "what you
 * get" benefit grid, 3-step how-it-works, the admin-authored rich detail
 * body, gallery, FAQs, and a closing booking band.
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
  const lede = stripHtml(detail.heroDescription) ?? stripHtml(detail.summary);
  const bodyHtml = detail.detailBody ? scopeBlogHtml(detail.detailBody) : null;
  const priceLabel =
    detail.basePriceCents != null
      ? formatPriceRounded(detail.basePriceCents, detail.currencyCode)
      : null;
  const bookLabel = detail.ctaLabel ?? "Book this service";

  // Platform-level facts only — clinical specifics live in the admin-authored
  // detailBody, never in hardcoded copy.
  const included = [
    `Consultation with a doctor registered to practise in ${config.name}`,
    "Secure video appointment — no travel, no waiting room",
    "Choose a time that suits you from live availability",
    "Booking confirmation and receipt sent to your email",
    "Pay securely online — payments processed by Stripe",
    "Your details handled with strict medical confidentiality",
  ];

  const steps = [
    {
      title: "Pick your doctor & time",
      body: `Browse available doctors for ${detail.name} in ${config.name} and choose a slot from their live calendar.`,
    },
    {
      title: "Confirm & pay securely",
      body: "Add your details and complete payment through our secure Stripe checkout. Your slot is reserved instantly.",
    },
    {
      title: "Meet your doctor online",
      body: "Join the secure video consultation at your appointment time and get clear advice on your next steps.",
    },
  ];

  return (
    <>
      {detail.faqs.length > 0 ? (
        <JsonLd data={faqJsonLd(detail.faqs.map((f) => ({ question: f.question, answer: f.answer })))} />
      ) : null}

      {/* Hero — gh2 dark, content left + sticky booking panel right */}
      <section
        className="gh2-hero relative isolate overflow-hidden"
        style={{
          padding: "clamp(56px,7vw,96px) 0 clamp(48px,6vw,80px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {detail.specialtyName ? (
          <div
            aria-hidden
            className="gh2-watermark pointer-events-none absolute -right-[0.08em] bottom-[-0.18em] select-none"
            style={{ fontSize: "clamp(4.5rem,12vw,11rem)" }}
          >
            {detail.specialtyName}
          </div>
        ) : null}

        <div className="relative mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <Link
            href={back.href}
            className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/45 transition-colors hover:text-[var(--color-brand-accent)]"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {back.label}
          </Link>

          <div className="mt-8 grid gap-10 lg:grid-cols-[1.35fr_minmax(340px,1fr)] lg:gap-14">
            {/* Left — service context */}
            <div>
              <p className="flex items-center gap-3">
                <span aria-hidden className="gh2-index" style={{ color: "rgba(176,241,34,0.50)" }}>
                  01
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-brand-accent)]">
                  {detail.specialtyName ?? (detail.kind === "SPECIALIST" ? "Specialist care" : "Online consultation")}
                </span>
              </p>

              <h1
                className="mt-5 font-extrabold leading-[1.0] tracking-[-0.035em]"
                style={{ fontSize: "clamp(2.2rem,4.5vw,4rem)", color: "rgba(255,255,255,0.95)", maxWidth: "16ch" }}
              >
                {heading}
              </h1>

              {lede ? (
                <p
                  className="mt-5 max-w-[48ch] text-[length:var(--text-body-lg)] leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.58)" }}
                >
                  {lede}
                </p>
              ) : null}

              {/* Trust meta row */}
              <div
                className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t pt-5"
                style={{ borderColor: "rgba(255,255,255,0.10)" }}
              >
                {[
                  { icon: ShieldCheck, label: `Registered doctors · ${config.name}` },
                  { icon: Video, label: "Secure video consultation" },
                  { icon: Lock, label: "Confidential & GDPR-compliant" },
                ].map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-2 text-[13px] font-medium"
                    style={{ color: "rgba(255,255,255,0.65)" }}
                  >
                    <Icon className="size-4 shrink-0" style={{ color: "var(--color-brand-accent)" }} aria-hidden />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Right — sticky booking panel */}
            <aside className="lg:sticky lg:top-[calc(var(--header-height)+16px)] lg:self-start">
              <div
                className="overflow-hidden rounded-[24px]"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  backdropFilter: "blur(18px)",
                  boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
                }}
              >
                {detail.imageSrc ? (
                  <div className="relative" style={{ aspectRatio: "16 / 8" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={detail.imageSrc}
                      alt={detail.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0"
                      style={{ background: "linear-gradient(180deg, rgba(10,31,20,0.10) 0%, rgba(10,31,20,0.55) 100%)" }}
                    />
                  </div>
                ) : null}

                <div className="p-6 sm:p-7">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-accent)]">
                    Book online
                  </p>

                  <div className="mt-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <span
                      className="font-extrabold tracking-[-0.03em] [font-variant-numeric:tabular-nums]"
                      style={{ fontSize: "clamp(1.9rem,3vw,2.5rem)", color: "rgba(255,255,255,0.95)" }}
                    >
                      {priceLabel ?? "Price varies"}
                    </span>
                    {priceLabel ? (
                      <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
                        per consultation
                      </span>
                    ) : null}
                  </div>

                  <ul className="mt-5 space-y-3 border-t pt-5" style={{ borderColor: "rgba(255,255,255,0.10)" }}>
                    {[
                      detail.durationMinutes != null
                        ? { icon: Clock, label: `${detail.durationMinutes}-minute appointment` }
                        : null,
                      { icon: Stethoscope, label: `Doctor registered in ${config.name}` },
                      { icon: CalendarCheck, label: "Instant confirmation by email" },
                      { icon: FileText, label: "Consultation summary included" },
                    ]
                      .filter((row): row is { icon: typeof Clock; label: string } => row !== null)
                      .map(({ icon: Icon, label }) => (
                        <li key={label} className="flex items-center gap-3">
                          <span
                            className="inline-flex size-8 shrink-0 items-center justify-center rounded-[10px]"
                            style={{ background: "rgba(176,241,34,0.12)" }}
                          >
                            <Icon className="size-4" style={{ color: "var(--color-brand-accent)" }} strokeWidth={1.8} aria-hidden />
                          </span>
                          <span className="text-[14px] font-medium" style={{ color: "rgba(255,255,255,0.80)" }}>
                            {label}
                          </span>
                        </li>
                      ))}
                  </ul>

                  <Link href={bookHref} className="gh2-btn-lime mt-6 w-full justify-center">
                    {bookLabel}
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>

                  <p
                    className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs"
                    style={{ color: "rgba(255,255,255,0.40)" }}
                  >
                    <Lock className="size-3" aria-hidden />
                    Secure checkout · payments processed by Stripe
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* What you get */}
      <WhyChooseSection
        eyebrow="What's included"
        title={`Everything in your ${detail.name.toLowerCase()}`}
        items={included}
        theme="light"
      />

      {/* How it works */}
      <ProcessStepsSection
        eyebrow="How it works"
        title="Booked and seen in three steps"
        steps={steps}
        theme="soft"
      />

      {/* Admin-authored rich detail body — sanitized on save, CSS-scoped. */}
      {bodyHtml ? (
        <section
          style={{
            background: "var(--color-background-page)",
            padding: "clamp(56px,7vw,104px) 0",
            borderTop: "1px solid rgba(29,75,54,0.10)",
          }}
        >
          <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--color-brand-primary)" }}>
              About this service
            </p>
            <div className="gh-article-body mt-8 max-w-[76ch]" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
          </div>
        </section>
      ) : null}

      {/* Gallery */}
      {detail.gallery.length > 0 ? (
        <section
          style={{
            background: "var(--color-background-soft)",
            padding: "clamp(48px,6vw,80px) 0",
            borderTop: "1px solid rgba(29,75,54,0.10)",
          }}
        >
          <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {detail.gallery.map((src, i) => (
                <div
                  key={src}
                  className="overflow-hidden rounded-[var(--radius-card)]"
                  style={{
                    aspectRatio: "4 / 3",
                    background: "var(--color-background-page)",
                    border: "1px solid var(--color-border)",
                  }}
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

      {/* Closing booking band */}
      <section
        className="gh2-hero relative isolate overflow-hidden"
        style={{
          padding: "clamp(56px,7vw,96px) 0",
          borderTop: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="relative mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <div className="grid items-end gap-8 lg:grid-cols-[1.6fr_1fr]">
            <div>
              <p className="flex items-center gap-3">
                <span aria-hidden className="gh2-index" style={{ color: "rgba(176,241,34,0.50)" }}>
                  02
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-brand-accent)]">
                  Ready when you are
                </span>
              </p>
              <h2
                className="mt-5 font-extrabold leading-[1.0] tracking-[-0.035em]"
                style={{ fontSize: "clamp(2rem,4vw,3.4rem)", color: "rgba(255,255,255,0.95)", maxWidth: "18ch" }}
              >
                Book {detail.name} in {config.name}
              </h2>
              <p className="mt-4 max-w-[44ch] text-[15px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                {priceLabel ? `From ${priceLabel} · ` : ""}
                Live availability — pick a doctor and a time that suits you.
              </p>
            </div>
            <div className="flex lg:justify-end">
              <Link href={bookHref} className="gh2-btn-lime">
                {bookLabel}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
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
