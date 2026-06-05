import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";
import { PageHero } from "@/components/sections/PageHero";
import { FAQSection } from "@/components/sections/FAQSection";
import { FAQTabs } from "@/components/sections/FAQTabs";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export const metadata: Metadata = {
  title: `FAQ | ${SITE_NAME}`,
  description:
    "Common questions about booking, prescriptions, lab tests, payments, and privacy on the Global Health telemedicine platform.",
};

// Content mirrors the live myglobalhealth.online FAQ verbatim (5
// categories scraped from the production Wix page). Keep in sync with
// that page until the FAQ is admin-managed.
const FAQ_GROUPS: Array<{
  eyebrow: string;
  title: string;
  items: Array<{ question: string; answer: string }>;
}> = [
  {
    eyebrow: "How it works",
    title: "How it works",
    items: [
      {
        question: "How can I choose the right health plan for me?",
        answer:
          "Explore our Essential, Comprehensive, or Premium Wellness plans to find the one that best suits your lifestyle and healthcare needs.",
      },
      {
        question: "Step 2: Sign Up with Ease",
        answer:
          "Select the health plan that fits your lifestyle and needs — Essential, Comprehensive, or Premium Wellness.",
      },
    ],
  },
  {
    eyebrow: "Devices",
    title: "Telemedicine Devices",
    items: [
      {
        question: "What telemedicine devices are compatible with Global Health?",
        answer:
          "Global Health supports a variety of telemedicine devices, including easy-to-use blood pressure monitors and glucose meters, all designed to work seamlessly with our online consultation platform for a smooth healthcare experience.",
      },
    ],
  },
  {
    eyebrow: "Privacy",
    title: "Privacy Policy",
    items: [
      {
        question: "How does Global Health safeguard your personal information?",
        answer:
          "Your privacy is our priority at Global Health. We adhere to strict privacy standards and our comprehensive Privacy Policy ensures your personal information is handled securely and transparently. Rest assured, your data is always protected.",
      },
    ],
  },
  {
    eyebrow: "Plans",
    title: "Healthcare Plans",
    items: [
      {
        question: "What types of healthcare plans does Global Health offer?",
        answer:
          "Global Health provides a range of healthcare plans, including individual consultations, family packages, and specialized care plans, all designed to offer comprehensive coverage and flexibility to suit your needs.",
      },
    ],
  },
  {
    eyebrow: "Payments",
    title: "Payment Methods",
    items: [
      {
        question: "What payment methods can I use at Global Health?",
        answer:
          "We accept credit cards for all transactions at Global Health. Your payment information is processed securely to ensure your privacy and security.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <main>
      {/* DARK — hero */}
      <PageHero
        countryLabel="Global Health · FAQ"
        titleLead="Questions, answered"
        titleAccent="without"
        titleTrail="the marketing speak."
        lede={
          <>
            Booking, payment, prescriptions, privacy. The questions
            patients actually ask, with answers that don&apos;t pad. Can&apos;t
            find what you need? Drop us a line.
          </>
        }
        ctaLabel="Contact the team"
        ctaHref="/contact"
        secondaryLabel="Browse doctors"
        secondaryHref="/"
      />

      {/* Tabbed FAQ */}
      <FAQTabs groups={FAQ_GROUPS} />

      {/* DARK — tail CTA */}
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
            background: "radial-gradient(ellipse 700px 400px at 100% -10%, rgba(176,241,34,0.08), transparent 55%)",
          }}
        />
        <div className="relative mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <div className="grid gap-8 items-end lg:grid-cols-[1fr_auto]">
            <div>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.2em]"
                style={{ color: "var(--color-brand-accent)" }}
              >
                Still stuck
              </p>
              <h2
                className="mt-4 max-w-[22ch] font-extrabold tracking-[-0.03em] leading-[1.02] text-white"
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

      {false && <FAQSection items={[]} />}
    </main>
  );
}
