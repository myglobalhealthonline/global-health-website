import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";
import { ContactForm } from "@/components/forms/ContactForm";
import { PageHero } from "@/components/sections/PageHero";
import { Mail, Clock, AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: `Contact us | ${SITE_NAME}`,
  description:
    "Get in touch with the Global Health team. We typically respond within 24 hours on working days.",
};

export default function ContactPage() {
  return (
    <main>
      {/* DARK — hero */}
      <PageHero
        countryLabel="Global Health · Contact"
        titleLead="Talk to us"
        titleAccent="like"
        titleTrail="a person."
        lede={
          <>
            Bookings, consultations, partnerships, anything else — drop a line
            and a real person on our team gets back to you within 24 hours on
            working days. No bots, no ticket queue.
          </>
        }
      />

      {/* DARK — contact form + reach info */}
      <section style={{ background: "var(--color-background-dark)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10 gh-section">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr]">
            <aside>
              <h2 className="text-xl font-extrabold tracking-[-0.015em]" style={{ color: "rgba(255,255,255,0.92)" }}>
                Reach us
              </h2>

              <ul className="mt-6 space-y-5">
                <li className="flex items-start gap-3">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(176,241,34,0.08)", border: "1px solid rgba(176,241,34,0.20)" }}>
                    <Mail className="size-4" style={{ color: "var(--color-brand-accent)" }} strokeWidth={1.5} aria-hidden />
                  </span>
                  <div>
                    <p className="text-[length:var(--text-meta)] font-semibold" style={{ color: "rgba(255,255,255,0.88)" }}>
                      Email
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

                <li className="flex items-start gap-3">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(176,241,34,0.08)", border: "1px solid rgba(176,241,34,0.20)" }}>
                    <Clock className="size-4" style={{ color: "var(--color-brand-accent)" }} strokeWidth={1.5} aria-hidden />
                  </span>
                  <div>
                    <p className="text-[length:var(--text-meta)] font-semibold" style={{ color: "rgba(255,255,255,0.88)" }}>
                      Response time
                    </p>
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.60)" }}>
                      Within 24 hours on working days
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
                      Medical emergencies
                    </p>
                    <p
                      className="mt-1 text-sm opacity-90"
                      style={{ color: "var(--color-status-warning-text)" }}
                    >
                      If you are experiencing a medical emergency, call your
                      local emergency services (112 in the EU) — do not use
                      this form.
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
    </main>
  );
}
