import { DoctifyReviewsSection } from "@/components/sections/DoctifyReviews";
import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";
import Image from "next/image";
import { ContactForm } from "@/components/forms/ContactForm";
import { PageHero } from "@/components/sections/PageHero";
import { Mail, Clock, AlertTriangle, ShieldCheck, BadgeCheck, MessageSquare } from "lucide-react";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const metadata: Metadata = {
  title: `Contact us | ${SITE_NAME}`,
  description:
    "Get in touch with the Global Health team. We usually respond within 24 hours on working days.",
};

export default async function ContactPage() {
  const locale = await getPageLocale();
  const { contact } = loadLocaleBundle(locale);

  return (
    <section>
      {/* DARK — hero */}
      <PageHero
        watermark="Contact"
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
      />

      {/* LIGHT — contact form + reach info */}
      <section id="contact-form" style={{ background: "var(--color-background-soft)", borderTop: "1px solid rgba(29,75,54,0.10)" }}>
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10 gh-section">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr]">
            <aside>
              <h2 className="text-xl font-extrabold tracking-[-0.015em]" style={{ color: "var(--color-text-primary)" }}>
                {contact.reach_h2}
              </h2>

              <ul className="mt-6 space-y-3">
                <li className="gh2-trust-tile">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(29,75,54,0.08)", border: "1px solid rgba(29,75,54,0.20)" }}>
                    <Mail className="size-4" style={{ color: "var(--color-brand-primary)" }} strokeWidth={1.5} aria-hidden />
                  </span>
                  <div>
                    <p className="text-[length:var(--text-meta)] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      {contact.email_label}
                    </p>
                    <a
                      href="mailto:info@myglobalhealth.online"
                      className="text-sm hover:underline"
                      style={{ color: "var(--color-brand-primary)" }}
                    >
                      info@myglobalhealth.online
                    </a>
                  </div>
                </li>

                <li className="gh2-trust-tile">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(29,75,54,0.08)", border: "1px solid rgba(29,75,54,0.20)" }}>
                    <Clock className="size-4" style={{ color: "var(--color-brand-primary)" }} strokeWidth={1.5} aria-hidden />
                  </span>
                  <div>
                    <p className="text-[length:var(--text-meta)] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      {contact.response_label}
                    </p>
                    <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
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
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
      <DoctifyReviewsSection
        theme="forest"
        variant="carousel"
        language={locale}
        eyebrow="Patient reviews"
        headline="Trusted by patients"
        headlineAccent="worldwide"
        body="Independent, verified reviews collected by Doctify from patients treated by our clinicians across Europe."
      />
    </section>
  );
}

function ContactArchPanel({ locale }: { locale: { float1_title: string; float1_subtitle: string; float2_title: string; float2_subtitle: string; float3_title: string; float3_subtitle: string } }) {
  return (
    <div className="relative mx-auto max-w-[440px]">
      <div aria-hidden className="gh2-arch-frame" />
      <div className="gh2-arch gh2-zoom relative aspect-[4/4.7] overflow-hidden border border-white/10 bg-white/[0.045]">
        <Image
          src="/images/stock/contact.jpg"
          alt="Telehealth care coordinator supporting a patient through an online consultation platform"
          fill
          priority
          sizes="(min-width: 1024px) 440px, 100vw"
          className="object-cover object-center"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-[rgba(8,42,32,0.62)] via-transparent to-transparent"
        />
      </div>

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
        className="gh-glass-emerald gh-floaty absolute -right-4 top-[56%] z-10 flex items-center gap-2.5 rounded-2xl px-3.5 py-3"
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
        className="gh-glass-emerald gh-floaty absolute -left-8 bottom-[5%] z-10 flex items-center gap-2.5 rounded-2xl px-3.5 py-3"
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
