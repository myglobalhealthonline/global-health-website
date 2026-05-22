import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Stethoscope, Globe2, Clock } from "lucide-react";
import { SITE_NAME } from "@/lib/constants";
import { PageHero } from "@/components/sections/PageHero";

export const metadata: Metadata = {
  title: `About | ${SITE_NAME}`,
  description:
    "Global Health is a European telemedicine platform connecting patients with locally-licensed doctors. No call centres, no waiting rooms, no surprise fees.",
};

export default function AboutPage() {
  return (
    <main>
      {/* DARK — hero */}
      <PageHero
        countryLabel="Global Health · About"
        titleLead="A small team building"
        titleAccent="grown-up"
        titleTrail="online healthcare."
        lede={
          <>
            We&apos;re a European telemedicine platform connecting patients
            with locally-licensed doctors. No call centres, no waiting
            rooms, no surprise fees. You see who you&apos;re booking, what
            it costs, and when they&apos;re free.
          </>
        }
        ctaLabel="Browse doctors"
        ctaHref="/"
        secondaryLabel="Contact the team"
        secondaryHref="/contact"
      />

      {/* LIGHT — three pillars */}
      <section className="bg-[var(--color-background-page)]">
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10 gh-section">
          <p className="gh-eyebrow text-[var(--color-brand-primary)]">
            What we believe
          </p>
          <h2
            className="mt-3 max-w-[20ch] font-extrabold tracking-[-0.03em] leading-[1.02] text-[var(--color-text-primary)]"
            style={{ fontSize: "clamp(2rem,4vw+0.5rem,3.5rem)" }}
          >
            Healthcare should feel less like{" "}
            <span className="text-[var(--color-brand-primary)]">admin</span>.
          </h2>

          <div className="mt-14 grid gap-10 lg:grid-cols-3">
            <Pillar
              icon={<Stethoscope className="size-5" strokeWidth={1.5} aria-hidden />}
              eyebrow="01"
              title="Real doctors, registered locally"
              body="Every clinician on the platform is licensed in your country. No off-shore call centres, no rota of strangers. The doctor on the profile is the doctor on the call."
            />
            <Pillar
              icon={<Clock className="size-5" strokeWidth={1.5} aria-hidden />}
              eyebrow="02"
              title="Booking that respects your time"
              body="Pick a date, pick a time, pay only after the call connects. No upfront forms, no insurance pre-auth, no 'we'll call you back within 5 business days'."
            />
            <Pillar
              icon={<ShieldCheck className="size-5" strokeWidth={1.5} aria-hidden />}
              eyebrow="03"
              title="GDPR-compliant by default"
              body="Your data lives in EU data centres. We don't sell it, we don't profile you, we don't share it with insurers. The only people who see your records are the doctor on your call and you."
            />
          </div>
        </div>
      </section>

      {/* DARK — how we work */}
      <section
        className="gh-medical-pattern gh-medical-pattern-dark"
        style={{
          background: "var(--color-background-dark)",
          padding: "clamp(64px,8vw,120px) 0",
          borderTop: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
            <div>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.2em]"
                style={{ color: "var(--color-brand-accent)" }}
              >
                How we work
              </p>
              <h2
                className="mt-4 font-extrabold tracking-[-0.03em] leading-[1.02] text-white"
                style={{ fontSize: "clamp(1.75rem,3vw+0.5rem,2.75rem)" }}
              >
                The pieces that make it{" "}
                <span style={{ color: "var(--color-brand-accent)" }}>work</span>.
              </h2>
            </div>
            <div className="space-y-8">
              <DarkStep
                num="01"
                title="Pick a country, then a service"
                body="Click your flag. Browse general consultations, specialist consultations, prescriptions, or home tests. Prices and durations are listed up front."
              />
              <DarkStep
                num="02"
                title="Choose your doctor + slot"
                body="Every doctor's profile lists qualifications, languages, registration body. Pick a date from the rail, pick a time on that date."
              />
              <DarkStep
                num="03"
                title="Pay only after the call connects"
                body="Stripe processes the payment the moment the doctor joins the video call. If something goes wrong on our end, you don't pay."
              />
              <DarkStep
                num="04"
                title="Get prescriptions, referrals, or test kits at home"
                body="Prescriptions land in your patient portal within the hour. Test kits ship to your door. Referrals go straight to the clinic of your choice."
              />
            </div>
          </div>
        </div>
      </section>

      {/* LIGHT — coverage */}
      <section className="bg-[var(--color-background-page)]">
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10 gh-section-tight">
          <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="gh-eyebrow text-[var(--color-brand-primary)]">
                Where we cover
              </p>
              <h2
                className="mt-3 max-w-[16ch] font-extrabold tracking-[-0.025em] leading-[1.05] text-[var(--color-text-primary)]"
                style={{ fontSize: "clamp(1.75rem,3vw+0.5rem,2.75rem)" }}
              >
                Five European markets and counting.
              </h2>
            </div>
            <Link href="/" className="gh-btn gh-btn-primary">
              Pick your country
              <ArrowUpRight className="size-4" strokeWidth={1.5} aria-hidden />
            </Link>
          </div>
          <ul className="mt-10 grid gap-2 sm:grid-cols-3 lg:grid-cols-5 text-[length:var(--text-meta)]">
            {[
              { code: "ie", name: "Ireland" },
              { code: "pt", name: "Portugal" },
              { code: "es", name: "Spain" },
              { code: "cz", name: "Czechia" },
              { code: "ro", name: "Romania" },
            ].map((c) => (
              <li
                key={c.code}
                className="flex items-center gap-3 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-page)] px-4 py-3"
              >
                <span aria-hidden className={`fi fi-${c.code} inline-block text-xl leading-none`} />
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {c.name}
                </span>
                <Globe2
                  className="ml-auto size-4 text-[var(--color-text-muted)]"
                  strokeWidth={1.5}
                  aria-hidden
                />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

function Pillar({
  icon,
  eyebrow,
  title,
  body,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <article>
      <div className="flex items-center gap-3">
        <span className="inline-flex size-10 items-center justify-center rounded-full bg-[var(--color-background-soft)] border border-[var(--color-border)] text-[var(--color-brand-primary)]">
          {icon}
        </span>
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-text-muted)] [font-variant-numeric:tabular-nums]">
          {eyebrow}
        </span>
      </div>
      <h3 className="mt-5 text-xl font-extrabold tracking-[-0.015em] text-[var(--color-text-primary)]">
        {title}
      </h3>
      <p className="mt-3 max-w-[42ch] text-[length:var(--text-body)] leading-relaxed text-[var(--color-text-muted)]">
        {body}
      </p>
    </article>
  );
}

function DarkStep({
  num,
  title,
  body,
}: {
  num: string;
  title: string;
  body: string;
}) {
  return (
    <article
      className="grid gap-5 sm:grid-cols-[auto_1fr] sm:gap-7 pt-8"
      style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
    >
      <span
        className="font-extrabold tracking-[-0.03em] [font-variant-numeric:tabular-nums]"
        style={{ fontSize: "2rem", color: "var(--color-brand-accent)", lineHeight: 1 }}
      >
        {num}
      </span>
      <div>
        <h3
          className="text-lg font-extrabold tracking-[-0.01em]"
          style={{ color: "rgba(255,255,255,0.90)" }}
        >
          {title}
        </h3>
        <p
          className="mt-2 max-w-[56ch] text-[length:var(--text-body)] leading-relaxed"
          style={{ color: "rgba(255,255,255,0.42)" }}
        >
          {body}
        </p>
      </div>
    </article>
  );
}
