import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";
import { PageHero } from "@/components/sections/PageHero";
import { FAQSection } from "@/components/sections/FAQSection";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export const metadata: Metadata = {
  title: `FAQ | ${SITE_NAME}`,
  description:
    "Common questions about booking, prescriptions, lab tests, payments, and privacy on the Global Health telemedicine platform.",
};

const FAQ_GROUPS: Array<{
  eyebrow: string;
  title: string;
  items: Array<{ question: string; answer: string }>;
}> = [
  {
    eyebrow: "Booking",
    title: "Booking a consultation",
    items: [
      {
        question: "Do I need an account to book?",
        answer:
          "No. You can book as a guest with just an email and phone number. We create a patient portal for you automatically so you can pull up the appointment later — but you don't have to sign up first.",
      },
      {
        question: "How quickly can I see a doctor?",
        answer:
          "Most countries have same-day slots available, especially for general consultations. Pick a date from the rail on the booking page and you'll see live availability for that day.",
      },
      {
        question: "Can I book on behalf of someone else?",
        answer:
          "Yes. Tick \"Booking for someone else\" on the patient details step and fill in their information. Useful for parents booking for kids or carers booking for relatives.",
      },
      {
        question: "What if the doctor doesn't show up?",
        answer:
          "You don't pay. Stripe only charges your card once the doctor joins the video call. If we cancel on our end, the slot is rebooked at no cost.",
      },
    ],
  },
  {
    eyebrow: "Payment",
    title: "Payment & pricing",
    items: [
      {
        question: "When do I pay?",
        answer:
          "Most services charge after the doctor joins the call. Home tests and prescriptions charge at checkout. The exact moment is shown on the service page before you commit.",
      },
      {
        question: "Which cards do you accept?",
        answer:
          "All major credit + debit cards via Stripe. Some countries also support Apple Pay and Google Pay at checkout. We don't store card numbers ourselves — Stripe handles all card data.",
      },
      {
        question: "Can I get a receipt for insurance?",
        answer:
          "Yes — receipts land in your patient portal immediately after payment and are also emailed. They include the doctor's registration number, the consultation type, and the amount paid.",
      },
    ],
  },
  {
    eyebrow: "Care",
    title: "Prescriptions, tests, and referrals",
    items: [
      {
        question: "Can the doctor prescribe medication?",
        answer:
          "Yes, where it's clinically appropriate and legal in your country. Prescriptions land in your patient portal within the hour and can be sent to the pharmacy of your choice.",
      },
      {
        question: "What if I need to see a specialist?",
        answer:
          "Our GPs can refer you to a specialist either inside the platform (book a specialist consultation directly) or to a local clinic via a written referral letter.",
      },
      {
        question: "How do home tests work?",
        answer:
          "Order the kit on the site, sample it at home using the included instructions, post it back in the prepaid envelope. Results land in your patient portal once the lab processes them — typically 3–5 days.",
      },
    ],
  },
  {
    eyebrow: "Privacy",
    title: "Privacy & data",
    items: [
      {
        question: "Where is my data stored?",
        answer:
          "EU data centres only. We're GDPR-compliant by default — that means no off-shore processing, no selling to insurers, no advertising profiling. The privacy notice has the full breakdown.",
      },
      {
        question: "Who sees my medical records?",
        answer:
          "Only the doctor on your call and you. We don't share records between doctors unless you explicitly ask us to (e.g. for a follow-up or referral). Admin staff don't have access to consultation notes.",
      },
      {
        question: "How do I delete my account?",
        answer:
          "Sign in, go to /account, and click \"Delete account\". Your personal data is scrubbed immediately; appointment history is retained for the regulatory minimum (varies by country) for audit purposes.",
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

      {/* LIGHT — FAQ accordion groups, alternating white/soft */}
      <div>
        {FAQ_GROUPS.map((group, i) => (
          <section
            key={group.title}
            style={{
              background: i % 2 === 0
                ? "var(--color-background-page)"
                : "var(--color-background-soft)",
            }}
          >
            <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10 gh-section-tight">
              <div className="mx-auto max-w-3xl">
                <p className="gh-eyebrow text-[var(--color-brand-primary)]">
                  {group.eyebrow}
                </p>
                <h2
                  className="mt-3 font-extrabold tracking-[-0.025em] leading-[1.05] text-[var(--color-text-primary)]"
                  style={{ fontSize: "clamp(1.75rem, 3vw + 0.5rem, 2.5rem)" }}
                >
                  {group.title}
                </h2>
                <div
                  className="mt-8"
                  style={{ borderTop: "1px solid var(--color-border)" }}
                >
                  {group.items.map((item) => (
                    <details key={item.question} className="group" style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-5">
                        <span className="text-base font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-primary)] transition-colors">
                          {item.question}
                        </span>
                        <span
                          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-brand-primary)] transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
                          style={{ background: "var(--color-background-page)" }}
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </span>
                      </summary>
                      <p className="pb-5 max-w-[62ch] text-sm leading-relaxed text-[var(--color-text-body)]">
                        {item.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

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
