import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SITE_NAME } from "@/lib/constants";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageHero } from "@/components/sections/PageHero";
import { FAQTabs } from "@/components/sections/FAQTabs";
import { faqJsonLd } from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: `FAQ | ${SITE_NAME}`,
  description:
    "Common questions about booking, online consultations, payments, privacy, and emergency-care limits on Global Health.",
};

const FAQ_GROUPS: Array<{
  eyebrow: string;
  title: string;
  items: Array<{ question: string; answer: string }>;
}> = [
  {
    eyebrow: "Booking",
    title: "Booking an appointment",
    items: [
      {
        question: "How do I book an online consultation?",
        answer:
          "Choose your country, select a service, pick a clinician and open time slot, then complete the patient details and checkout steps.",
      },
      {
        question: "Can I choose the doctor before I book?",
        answer:
          "Yes. Doctor profiles show the clinician's registration details, specialties, languages, and bookable services where available.",
      },
      {
        question: "Are appointments guaranteed for the same day?",
        answer:
          "No. Appointment times depend on clinician availability, country coverage, and the selected service. Open slots are shown during booking.",
      },
    ],
  },
  {
    eyebrow: "Care",
    title: "Consultations and next steps",
    items: [
      {
        question: "Can the doctor issue a prescription, referral, or certificate?",
        answer:
          "Where clinically appropriate, the treating doctor can issue next steps such as a prescription, referral, or certificate. These are never guaranteed before assessment.",
      },
      {
        question: "Is online care suitable for emergencies?",
        answer:
          "No. Online consultations are not emergency care. If you need urgent help, call 112 or your local emergency number.",
      },
    ],
  },
  {
    eyebrow: "Privacy",
    title: "Privacy and records",
    items: [
      {
        question: "How is my information protected?",
        answer:
          "Global Health handles personal data under GDPR principles and collects the details needed to provide the service. You can read more in the privacy policy.",
      },
      {
        question: "Will my consultation notes be available after the appointment?",
        answer:
          "Clinical notes or follow-up guidance may be shared after the consultation where appropriate for the service and country workflow.",
      },
    ],
  },
  {
    eyebrow: "Payments",
    title: "Payments",
    items: [
      {
        question: "When do I see the price?",
        answer:
          "Service prices are shown before booking and checkout. Final availability and payment options depend on the selected country and service.",
      },
      {
        question: "Do I need a subscription or wellness plan?",
        answer:
          "No. The public site is currently built around pay-per-consultation and service-based bookings, not bundled wellness plans.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <main>
      <JsonLd data={faqJsonLd(FAQ_GROUPS.flatMap((group) => group.items))} />

      <PageHero
        countryLabel="Global Health · FAQ"
        titleLead="Questions, answered"
        titleAccent="without"
        titleTrail="the marketing speak."
        lede={
          <>
            Booking, payment, consultations, privacy, and when online care is
            not the right route. Can&apos;t find what you need? Drop us a line.
          </>
        }
        ctaLabel="Contact the team"
        ctaHref="/contact"
        secondaryLabel="Choose your country"
        secondaryHref="/"
        heroImage={{
          src: "/images/stock/contact.jpg",
          alt: "Patient on a video call with a doctor during an online consultation",
          priority: true,
        }}
      />

      <FAQTabs groups={FAQ_GROUPS} />

      <section
        className="relative overflow-hidden gh-medical-pattern gh-medical-pattern-dark"
        style={{
          background: "var(--color-background-dark)",
          padding: "clamp(64px,8vw,96px) 0",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 700px 400px at 100% -10%, rgba(176,241,34,0.08), transparent 55%)",
          }}
        />
        <div className="relative mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.2em]"
                style={{ color: "var(--color-brand-accent)" }}
              >
                Still stuck
              </p>
              <h2
                className="mt-4 max-w-[22ch] font-extrabold leading-[1.02] tracking-[-0.03em] text-white"
                style={{ fontSize: "clamp(1.75rem, 3vw + 0.5rem, 2.75rem)" }}
              >
                Not the question you came with?{" "}
                <span style={{ color: "var(--color-brand-accent)" }}>Talk to us.</span>
              </h2>
            </div>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-bold text-white transition-colors duration-200 hover:bg-white/10 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 lg:justify-self-end"
              style={{ border: "1px solid rgba(255,255,255,0.22)" }}
            >
              Contact the team
              <ArrowUpRight className="size-4" strokeWidth={1.5} aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
