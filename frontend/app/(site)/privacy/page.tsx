import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: `How ${SITE_NAME} collects, stores, and protects your data.`,
};

export default function PrivacyPage() {
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
            Privacy notice
          </h1>
          <p
            className="mt-3 text-sm"
            style={{ color: "rgba(255,255,255,0.65)" }}
          >
            Last updated: 16 May 2026
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
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              Who we are
            </h2>
            <p className="mt-2">
              {SITE_NAME} provides online medical consultations across several
              European countries. The legal entity acting as data controller
              depends on the country you book in — see our country pages for
              local details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              What we collect
            </h2>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Account data: name, email, phone, hashed password.</li>
              <li>
                Booking data: the country and consultation type you requested,
                your notes, and the timestamps for status changes.
              </li>
              <li>
                Payment data: Stripe charge IDs, amounts, and timestamps. We
                never see card numbers — Stripe holds those directly.
              </li>
              <li>
                Email-delivery metadata: when SendGrid accepted, opened, or
                bounced our messages.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              Cookies
            </h2>
            <p className="mt-2">
              We set one strictly-necessary session cookie (<code>gh_auth</code>)
              so you stay logged in. Country and language preferences are also
              stored as cookies. No third-party trackers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              Your rights
            </h2>
            <p className="mt-2">Under GDPR you can:</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>
                Request a copy of everything we hold — sign in and go to{" "}
                <Link
                  href="/account/security"
                  className="font-medium text-[var(--color-brand-primary)] underline underline-offset-2"
                >
                  Account → Security → Download my data
                </Link>
                .
              </li>
              <li>
                Delete your account — same page. Booking history is preserved
                for regulatory reasons but stripped of identifying details.
              </li>
              <li>
                Contact us at{" "}
                <a
                  href="mailto:privacy@myglobalhealth.online"
                  className="font-medium text-[var(--color-brand-primary)] underline underline-offset-2"
                >
                  privacy@myglobalhealth.online
                </a>{" "}
                for anything else (access, rectification, restriction,
                portability, objection).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              Retention
            </h2>
            <p className="mt-2">
              Account data is kept while your account is active. Booking +
              payment data is retained for 7 years to satisfy medical record-
              keeping and tax-audit requirements, even if you delete your
              account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              Sub-processors
            </h2>
            <p className="mt-2">
              We use Railway (hosting), Stripe (payments), and SendGrid
              (transactional email). Each is GDPR-compliant and bound by
              Data Processing Agreements.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
