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

      <section className="bg-[var(--color-background-page)]">
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10 gh-section">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr]">
            <aside>
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                Reach us
              </h2>

              <ul className="mt-6 space-y-5">
                <li className="flex items-start gap-3">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-background-soft)] border border-[var(--color-border)]">
                    <Mail
                      className="size-4 text-[var(--color-brand-primary)]"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                  </span>
                  <div>
                    <p className="text-[length:var(--text-meta)] font-semibold text-[var(--color-text-primary)]">
                      Email
                    </p>
                    <a
                      href="mailto:info@myglobalhealth.online"
                      className="text-sm text-[var(--color-brand-primary)] hover:underline"
                    >
                      info@myglobalhealth.online
                    </a>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-background-soft)] border border-[var(--color-border)]">
                    <Clock
                      className="size-4 text-[var(--color-brand-primary)]"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                  </span>
                  <div>
                    <p className="text-[length:var(--text-meta)] font-semibold text-[var(--color-text-primary)]">
                      Response time
                    </p>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      Within 24 hours on working days
                    </p>
                  </div>
                </li>
              </ul>

              <div className="
                mt-10
                rounded-[var(--radius-card)]
                border border-[var(--color-status-warning-border)]
                bg-[var(--color-status-warning-bg)]
                p-5
              ">
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className="mt-0.5 size-4 shrink-0 text-[var(--color-status-warning-text)]"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-status-warning-text)]">
                      Medical emergencies
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-status-warning-text)] opacity-90">
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
