import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";
import { ContactForm } from "@/components/forms/ContactForm";
import { PageHero } from "@/components/sections/PageHero";
import { Mail, Clock, AlertTriangle } from "lucide-react";
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
        heroImage={{
          src: "/images/stock/contact.jpg",
          alt: "Telehealth care coordinator supporting a patient through an online consultation platform",
          priority: true,
        }}
      />

      {/* LIGHT — contact form + reach info */}
      <section style={{ background: "var(--color-background-soft)", borderTop: "1px solid rgba(29,75,54,0.10)" }}>
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10 gh-section">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr]">
            <aside>
              <h2 className="text-xl font-extrabold tracking-[-0.015em]" style={{ color: "var(--color-text-primary)" }}>
                {contact.reach_h2}
              </h2>

              <ul className="mt-6 space-y-5">
                <li className="flex items-start gap-3">
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

                <li className="flex items-start gap-3">
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
    </section>
  );
}
