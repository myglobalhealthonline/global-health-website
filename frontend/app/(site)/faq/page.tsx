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

// Source of truth for the FAQ — easier to maintain inline than to wire
// admin CRUD for a content surface that changes once a quarter.
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

      <div className="bg-[var(--color-background-page)]">
        {FAQ_GROUPS.map((group, i) => (
          <section
            key={group.title}
            className={
              i % 2 === 0
                ? "bg-[var(--color-background-page)]"
                : "bg-[var(--color-background-soft)]"
            }
          >
            <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10 gh-section-tight">
              <div className="mx-auto max-w-3xl">
                <p className="gh-eyebrow text-[var(--color-brand-primary)]">
                  {group.eyebrow}
                </p>
                <h2
                  className="
                    mt-3 font-semibold tracking-[-0.025em] leading-[1.05]
                    text-[var(--color-text-primary)]
                    text-[clamp(1.75rem,3vw+0.5rem,2.5rem)]
                  "
                >
                  {group.title}
                </h2>
                <div className="mt-8 divide-y divide-[var(--color-border)]">
                  {group.items.map((item) => (
                    <details key={item.question} className="group py-5">
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                        <span className="text-base font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-primary)] transition-colors">
                          {item.question}
                        </span>
                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-background-page)] border border-[var(--color-border)] text-[var(--color-brand-primary)] transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path
                              d="M7 1V13M1 7H13"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                        </span>
                      </summary>
                      <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-[var(--color-text-body)]">
                        {item.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ))}

        {/* Tail CTA */}
        <section className="bg-[var(--color-background-page)]">
          <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10 gh-section">
            <div className="
              rounded-[var(--radius-card)]
              border border-[var(--color-border)]
              bg-[var(--color-background-soft)]
              p-8 md:p-12
              grid gap-6 items-end lg:grid-cols-[1fr_auto]
            ">
              <div>
                <p className="gh-eyebrow text-[var(--color-brand-primary)]">
                  Still stuck
                </p>
                <h2 className="mt-3 max-w-[18ch] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)] text-[clamp(1.5rem,2.5vw+0.5rem,2.25rem)]">
                  Not the question you came with? Talk to us.
                </h2>
              </div>
              <Link href="/contact" className="gh-btn gh-btn-primary lg:justify-self-end">
                Contact the team
                <ArrowUpRight className="size-4" strokeWidth={1.5} aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </div>
      {/* FAQSection import kept for backwards-compat consumers; this
        * page renders its own inline UI for finer grouping control. */}
      {false && <FAQSection items={[]} />}
    </main>
  );
}
