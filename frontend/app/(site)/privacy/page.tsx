import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: `How ${SITE_NAME} collects, stores, and protects your data.`,
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Privacy notice</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: 16 May 2026</p>

      <div className="mt-8 space-y-6 text-base leading-relaxed text-slate-700">
        <section>
          <h2 className="text-xl font-bold text-slate-900">Who we are</h2>
          <p className="mt-2">
            {SITE_NAME} provides online medical consultations across several
            European countries. The legal entity acting as data controller
            depends on the country you book in — see our country pages for
            local details.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900">What we collect</h2>
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
          <h2 className="text-xl font-bold text-slate-900">Cookies</h2>
          <p className="mt-2">
            We set one strictly-necessary session cookie (<code>gh_auth</code>)
            so you stay logged in. Country and language preferences are also
            stored as cookies. No third-party trackers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900">Your rights</h2>
          <p className="mt-2">
            Under GDPR you can:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              Request a copy of everything we hold — sign in and go to{" "}
              <Link href="/account/security" className="text-emerald-700 underline">
                Account → Security → Download my data
              </Link>
              .
            </li>
            <li>
              Delete your account — same page. Booking history is preserved
              for regulatory reasons but stripped of identifying details.
            </li>
            <li>
              Contact us at <a href="mailto:privacy@myglobalhealth.online" className="text-emerald-700 underline">privacy@myglobalhealth.online</a> for anything else (access, rectification, restriction, portability, objection).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900">Retention</h2>
          <p className="mt-2">
            Account data is kept while your account is active. Booking +
            payment data is retained for 7 years to satisfy medical record-
            keeping and tax-audit requirements, even if you delete your
            account.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900">Sub-processors</h2>
          <p className="mt-2">
            We use Railway (hosting), Stripe (payments), and SendGrid
            (transactional email). Each is GDPR-compliant and bound by
            Data Processing Agreements.
          </p>
        </section>
      </div>
    </main>
  );
}
