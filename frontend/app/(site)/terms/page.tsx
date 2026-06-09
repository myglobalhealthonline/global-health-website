import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Terms of service",
  description: `The terms that apply when you use ${SITE_NAME} to book an online consultation.`,
};

export default function TermsPage() {
  return (
    <>
      {/* Dark header */}
      <section
        style={{
          background: "var(--color-background-dark)",
          padding: "clamp(56px,7vw,96px) 0 clamp(40px,5vw,64px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="mx-auto max-w-3xl px-5 md:px-10">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.2em]"
            style={{ color: "var(--color-brand-accent)" }}
          >
            Legal
          </p>
          <h1
            className="mt-4 font-extrabold tracking-[-0.03em] leading-[1.02]"
            style={{
              fontSize: "clamp(2.2rem,5vw,4rem)",
              color: "rgba(255,255,255,0.95)",
            }}
          >
            Terms of service
          </h1>
          <p className="mt-3 text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
            Last updated: 9 June 2026
          </p>
        </div>
      </section>

      {/* Prose body — light for readability */}
      <main
        className="mx-auto max-w-3xl px-5 md:px-10"
        style={{ padding: "clamp(48px,6vw,80px) 20px" }}
      >
        <div className="space-y-8 text-base leading-relaxed text-[var(--color-text-body)]">
          <section>
            <p>
              These terms apply when you use {SITE_NAME} to book or attend an
              online consultation. By booking, you agree to them. They are
              general terms of use and are not a substitute for the specific
              consent and clinical information you receive at the time of your
              consultation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              What the service is
            </h2>
            <p className="mt-2">
              {SITE_NAME} connects you with doctors registered to practise in
              the country you book in, for consultations held online. The
              clinical relationship is between you and the treating clinician,
              who is responsible for their own clinical decisions within the
              limits of their registration.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              Not for emergencies
            </h2>
            <p className="mt-2">
              Online consultations are not suitable for medical emergencies. If
              this is an emergency, or you think your life or someone else&apos;s
              is at risk, call 112 (or your local emergency number) or go to your
              nearest emergency department. Do not use this service to seek
              urgent or emergency care.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              No guaranteed outcome
            </h2>
            <p className="mt-2">
              Booking a consultation pays for the clinician&apos;s time and
              assessment. It does not guarantee any particular outcome. Whether a
              prescription, medical certificate, referral, or other document is
              issued is decided by the treating clinician following assessment,
              where it is clinically appropriate and legally permitted. A
              prescription or certificate is never guaranteed in advance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              Eligibility and accurate information
            </h2>
            <p className="mt-2">
              You must provide accurate personal and health information so the
              clinician can assess you safely. Consultations are intended for
              adults; care for a minor must be arranged by a parent or guardian
              where that is supported in your country. Using inaccurate
              information may make a consultation unsafe and is not permitted.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              Bookings, payment, and cancellations
            </h2>
            <p className="mt-2">
              Prices are shown before payment and are charged securely through
              Stripe — we never see your card number. Availability of
              appointments depends on clinician calendars and is not guaranteed.
              Cancellation and refund arrangements depend on the country and
              clinic you book with; where a consultation has not taken place,
              contact us and we will help resolve it fairly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              Your account
            </h2>
            <p className="mt-2">
              Keep your login details confidential — you are responsible for
              activity under your account. Tell us promptly if you believe your
              account has been used without your permission. How we handle your
              data is described in our{" "}
              <Link
                href="/privacy"
                className="font-medium text-[var(--color-brand-primary)] underline underline-offset-2"
              >
                Privacy notice
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              Content and intellectual property
            </h2>
            <p className="mt-2">
              The {SITE_NAME} website, brand, and its content are owned by us or
              our licensors and are provided for your personal use in booking
              care. Health information on this website is general guidance only
              and does not replace advice from a qualified healthcare
              professional.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              Liability
            </h2>
            <p className="mt-2">
              To the extent permitted by law, {SITE_NAME} is not liable for loss
              arising from use of the website outside its intended purpose, from
              inaccurate information you provide, or from using the service for
              emergencies. Nothing in these terms limits liability that cannot be
              limited by law, including liability for death or personal injury
              caused by negligence.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              Changes and governing law
            </h2>
            <p className="mt-2">
              We may update these terms from time to time; the date above shows
              the latest version. The legal entity providing the service and the
              governing law depend on the country you book in — see the relevant
              country pages for local details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              Contact
            </h2>
            <p className="mt-2">
              Questions about these terms? Email us at{" "}
              <a
                href="mailto:info@myglobalhealth.online"
                className="font-medium text-[var(--color-brand-primary)] underline underline-offset-2"
              >
                info@myglobalhealth.online
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
