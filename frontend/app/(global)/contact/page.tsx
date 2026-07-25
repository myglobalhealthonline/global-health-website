import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/seo/site-url";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { ContactForm } from "@/components/forms/ContactForm";
import { PageHero } from "@/components/sections/PageHero";
import { HeroPlusImage } from "@/components/sections/HeroPlusImage";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { Mail, Clock, AlertTriangle, ShieldCheck, BadgeCheck, MessageSquare } from "lucide-react";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { DoctifyReviewsSectionLazy as DoctifyReviewsSection } from "@/components/sections/DoctifyReviewsLazy";

const CONTACT_URL = `${getSiteUrl()}/contact`;
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale();
  const contact = loadLocaleBundle(locale).contact;
  const title = `${contact.hero_title_lead} ${contact.hero_title_accent} ${contact.hero_title_trail}`;
  return buildPublicMetadata({
    path: "/contact", title, description: contact.hero_lede, locale, kind: "page",
    subtitle: contact.response_body, sourceImage: "/images/stock/contact.jpg",
    imageAlt: `${title} - Contact Global Health`,
  });
}

const CONTACT_PAGE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Contact Global Health",
  url: CONTACT_URL,
  description:
    "Contact the Global Health team. We respond within 24 hours on working days. No bots, no ticket queue.",
  mainEntity: {
    "@type": "Organization",
    name: "Global Health",
    url: getSiteUrl(),
    contactPoint: {
      "@type": "ContactPoint",
      email: "info@myglobalhealth.online",
      contactType: "customer service",
      availableLanguage: ["English", "Portuguese", "Spanish", "Czech", "Romanian"],
      hoursAvailable: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        description: "Response within 24 hours on working days",
      },
    },
  },
};

export default async function ContactPage() {
  const locale = await getPageLocale();
  const { contact } = loadLocaleBundle(locale);

  return (
    <section>
      <JsonLd data={CONTACT_PAGE_JSONLD} />
      {/* DARK — hero */}
      <PageHero
        watermark={contact.watermark}
        countryLabel={contact.hero_eyebrow}
        titleLead={contact.hero_title_lead}
        titleAccent={contact.hero_title_accent}
        titleTrail={contact.hero_title_trail}
        lede={contact.hero_lede}
        ctaLabel={contact.hero_cta}
        ctaHref="#contact-form"
        secondaryLabel={contact.hero_secondary}
        secondaryHref="/"
        trustCards={[
          {
            icon: <Mail className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: contact.trust_card1_title,
            subtitle: contact.trust_card1_subtitle,
          },
          {
            icon: <Clock className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: contact.trust_card2_title,
            subtitle: contact.trust_card2_subtitle,
          },
          {
            icon: <ShieldCheck className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: contact.trust_card3_title,
            subtitle: contact.trust_card3_subtitle,
          },
        ]}
        rightSlot={<ContactArchPanel locale={contact} />}
        mobileBgSrc="/images/stock/contact.jpg"
      />

      {/* IVORY — contact form + reach info */}
      <section id="contact-form" className="relative gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel">
        <SectionSeam theme="light" />
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10 gh-section">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr]">
            <aside>
              <h2 className="text-xl font-extrabold tracking-[-0.015em]" style={{ color: "var(--color-text-primary)" }}>
                {contact.reach_h2}
              </h2>

              <ul className="mt-6 space-y-3">
                <li className="gh2-glass-forest flex items-center gap-3" style={{ border: "1px solid rgba(255,255,255,0.14)", borderRadius: "var(--radius-card)", padding: "1rem" }}>
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(176,241,34,0.10)", border: "1px solid rgba(176,241,34,0.18)" }}>
                    <Mail className="size-4" style={{ color: "var(--color-brand-accent)" }} strokeWidth={1.5} aria-hidden />
                  </span>
                  <div>
                    <p className="text-[length:var(--text-meta)] font-semibold" style={{ color: "rgba(255,255,255,0.92)" }}>
                      {contact.email_label}
                    </p>
                    <a
                      href="mailto:info@myglobalhealth.online"
                      className="text-sm hover:underline"
                      style={{ color: "var(--color-brand-accent)" }}
                    >
                      info@myglobalhealth.online
                    </a>
                  </div>
                </li>

                <li className="gh2-glass-forest flex items-center gap-3" style={{ border: "1px solid rgba(255,255,255,0.14)", borderRadius: "var(--radius-card)", padding: "1rem" }}>
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(176,241,34,0.10)", border: "1px solid rgba(176,241,34,0.18)" }}>
                    <Clock className="size-4" style={{ color: "var(--color-brand-accent)" }} strokeWidth={1.5} aria-hidden />
                  </span>
                  <div>
                    <p className="text-[length:var(--text-meta)] font-semibold" style={{ color: "rgba(255,255,255,0.92)" }}>
                      {contact.response_label}
                    </p>
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
                      {contact.response_body}
                    </p>
                  </div>
                </li>
              </ul>

              <div
                className="mt-10 rounded-[var(--radius-card)] p-5"
                style={{
                  border: "1px solid var(--color-status-warning-border)",
                  background: "var(--color-status-warning-bg)",
                }}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className="mt-0.5 size-4 shrink-0"
                    style={{ color: "var(--color-status-warning-text)" }}
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--color-status-warning-text)" }}
                    >
                      {contact.emergency_title}
                    </p>
                    <p
                      className="mt-1 text-sm opacity-90"
                      style={{ color: "var(--color-status-warning-text)" }}
                    >
                      {contact.emergency_body}
                    </p>
                  </div>
                </div>
              </div>
            </aside>

            <div>
              <ContactForm
                i18n={{
                  successTitle: contact.form_success_title,
                  successBody: contact.form_success_body,
                  fullName: contact.form_full_name,
                  fullNamePlaceholder: contact.form_full_name_placeholder,
                  email: contact.form_email,
                  emailPlaceholder: contact.form_email_placeholder,
                  subject: contact.form_subject,
                  subjectPlaceholder: contact.form_subject_placeholder,
                  message: contact.form_message,
                  messagePlaceholder: contact.form_message_placeholder,
                  sending: contact.form_sending,
                  send: contact.form_send,
                  genericError: contact.form_generic_error,
                  networkError: contact.form_network_error,
                }}
              />
            </div>
          </div>
        </div>
      </section>
      <DoctifyReviewsSection
        theme="forest"
        variant="carousel"
        language={locale}
        eyebrow={contact.reviews_eyebrow}
        headline={contact.reviews_headline}
        headlineAccent={contact.reviews_headline_accent}
        body={contact.reviews_body}
      />
    </section>
  );
}

function ContactArchPanel({ locale }: { locale: { float1_title: string; float1_subtitle: string; float2_title: string; float2_subtitle: string; float3_title: string; float3_subtitle: string } }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[600px]">
      <HeroPlusImage
        src="/images/stock/contact.jpg"
        alt="Telehealth care coordinator supporting a patient through an online consultation platform"
      />

      {/* Floating — 24h response */}
      <div
        className="gh-glass-emerald gh-floaty absolute -right-6 top-[12%] z-10 flex items-center gap-2.5 rounded-2xl px-3.5 py-3"
        style={{ maxWidth: 232, animationDelay: "0s" }}
      >
        <span className="relative flex size-2.5 shrink-0">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--color-brand-accent)] opacity-60" />
          <span className="relative inline-flex size-2.5 rounded-full bg-[var(--color-brand-accent)]" />
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-bold leading-tight text-white">{locale.float1_title}</span>
          <span className="block text-[11.5px] leading-tight text-white/55">{locale.float1_subtitle}</span>
        </span>
      </div>

      {/* Floating — Real humans */}
      <div
        className="gh-glass-emerald gh-floaty absolute -right-6 top-[56%] z-10 flex items-center gap-2.5 rounded-2xl px-3.5 py-3"
        style={{ maxWidth: 232, animationDelay: "1.4s" }}
      >
        <span
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-[var(--color-brand-accent)]"
          style={{ background: "rgba(176,241,34,0.12)" }}
        >
          <BadgeCheck className="size-4" strokeWidth={2} aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-bold leading-tight text-white">{locale.float2_title}</span>
          <span className="block text-[11.5px] leading-tight text-white/55">{locale.float2_subtitle}</span>
        </span>
      </div>

      {/* Floating — GDPR safe */}
      <div
        className="gh-glass-emerald gh-floaty absolute -left-6 bottom-[5%] z-10 flex items-center gap-2.5 rounded-2xl px-3.5 py-3"
        style={{ maxWidth: 232, animationDelay: "0.7s" }}
      >
        <span
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-[var(--color-brand-accent)]"
          style={{ background: "rgba(176,241,34,0.12)" }}
        >
          <MessageSquare className="size-4" strokeWidth={2} aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-bold leading-tight text-white">{locale.float3_title}</span>
          <span className="block text-[11.5px] leading-tight text-white/55">{locale.float3_subtitle}</span>
        </span>
      </div>
    </div>
  );
}
