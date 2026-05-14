import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Pill,
  ShieldCheck,
  Stethoscope,
  TestTube2,
} from "lucide-react";
import type { CountryConfig } from "@/data/countries";

type ServiceCard = {
  title: string;
  description: string;
  href: string;
  imageSrc?: string;
  stats?: string;
};

type DoctorCard = {
  name: string;
  title?: string | null;
  imageSrc?: string;
  href: string;
  languages?: string[];
};

type Step = { title: string; description: string };

export type CountryEditorialTemplateProps = {
  country: CountryConfig;
  generalListing: ServiceCard[];
  specialistListing: ServiceCard[];
  doctors: DoctorCard[];
  steps: Step[];
  paths: { home: string; team: string; general: string; specialist: string };
  countrySlug: string;
};

const COUNTRY_FLAGS: Record<string, string> = {
  ie: "fi fi-ie",
  pt: "fi fi-pt",
  sp: "fi fi-es",
  cz: "fi fi-cz",
  rm: "fi fi-ro",
};

const QUICK_ACTIONS = (slug: string) => [
  {
    title: "General consultation",
    blurb: "Same-day GP video visits, with prescriptions and sick notes issued on the call.",
    href: `/${slug}/services`,
    icon: Stethoscope,
  },
  {
    title: "Specialist consultation",
    blurb: "Cardiology, dermatology, mental health and more — booked the way you book a GP.",
    href: `/${slug}/specialists`,
    icon: ShieldCheck,
  },
  {
    title: "Online prescription",
    blurb: "Renewals and short-course meds after a brief clinician review.",
    href: "/online-prescription",
    icon: Pill,
  },
  {
    title: "Home health tests",
    blurb: "Blood panels, hormones, STI and rapid kits — results in your file.",
    href: "/home-health-test",
    icon: TestTube2,
  },
];

export function CountryEditorialTemplate({
  country,
  specialistListing,
  generalListing,
  doctors,
  steps,
  countrySlug,
}: CountryEditorialTemplateProps) {
  const teamHref = `/${countrySlug}/team`;
  const servicesHref = `/${countrySlug}/services`;
  const specialistsHref = `/${countrySlug}/specialists`;
  const quickActions = QUICK_ACTIONS(countrySlug);
  const featuredSpecialties = specialistListing.slice(0, 6);
  const featuredDoctors = doctors.slice(0, 4);

  return (
    <main className="bg-[var(--color-background-page)]">
      {/* HERO — calm, no gradient, big editorial type. */}
      <section className="gh-section-sm border-b border-[var(--color-border)] bg-[var(--color-background-soft)]">
        <div className="gh-container">
          <div className="flex items-center gap-3 text-[12px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
            <span
              className={`${COUNTRY_FLAGS[country.code] ?? "fi"} rounded-[3px]`}
              style={{ width: 22, height: 16 }}
              aria-hidden
            />
            <span>{country.name} clinic</span>
            <span className="text-[var(--color-border-strong)]">/</span>
            <span>Online &amp; in your language</span>
          </div>

          <h1
            className="gh-display mt-10 max-w-[18ch] text-[clamp(2.75rem,6vw,5.5rem)]"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Your {country.name} clinic, <span className="gh-display-em">one tap away.</span>
          </h1>

          <p className="mt-8 max-w-[600px] text-[1.05rem] leading-[1.7] text-[var(--color-text-body)] md:text-[1.2rem]">
            Speak to a licensed clinician in minutes — video, audio or chat.
            Prescriptions, referrals and lab orders are issued straight to your file.
          </p>

          <div className="mt-12 flex flex-wrap items-center gap-3">
            <Link href="/book-online" className="gh-btn gh-btn-primary">
              Book a consultation
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link href={teamHref} className="gh-btn gh-btn-outline">
              Meet our clinicians
            </Link>
          </div>
        </div>
      </section>

      {/* QUICK ACTIONS — calm cards, lots of whitespace. */}
      <section className="gh-section bg-[var(--color-background-page)]">
        <div className="gh-container">
          <header className="flex flex-wrap items-end justify-between gap-6 border-b border-[var(--color-border)] pb-10">
            <div className="max-w-2xl">
              <span className="gh-heading-eyebrow">What we offer</span>
              <h2
                className="gh-display mt-5 text-[clamp(2rem,4vw,3.25rem)]"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                Four ways we care.
              </h2>
            </div>
            <Link
              href="/plans-pricing"
              className="text-[13px] font-medium uppercase tracking-[0.16em] text-[var(--color-text-primary)] underline-offset-4 hover:underline"
            >
              View pricing →
            </Link>
          </header>

          <ul className="mt-16 grid grid-cols-1 gap-x-12 gap-y-16 md:grid-cols-2">
            {quickActions.map((action, idx) => (
              <li key={action.title}>
                <Link
                  href={action.href}
                  className="group block"
                >
                  <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="mt-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-background-panel)] text-[var(--color-brand-primary)] transition group-hover:bg-[var(--color-brand-accent)]">
                    <action.icon className="h-5 w-5" />
                  </span>
                  <h3
                    className="gh-display mt-6 text-[1.85rem] tracking-[-0.015em]"
                    style={{ fontFamily: "var(--font-cormorant)" }}
                  >
                    {action.title}
                  </h3>
                  <p className="mt-3 max-w-[440px] text-[15px] leading-[1.65] text-[var(--color-text-muted)]">
                    {action.blurb}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1 text-[13px] font-medium text-[var(--color-text-primary)] underline-offset-4 group-hover:underline">
                    Explore
                    <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* SPECIALTIES — image-led editorial grid. */}
      {featuredSpecialties.length > 0 ? (
        <section className="gh-section bg-[var(--color-background-soft)]">
          <div className="gh-container">
            <header className="flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-2xl">
                <span className="gh-heading-eyebrow">Specialist consultations</span>
                <h2
                  className="gh-display mt-5 text-[clamp(2rem,4vw,3.25rem)]"
                  style={{ fontFamily: "var(--font-cormorant)" }}
                >
                  Go deeper, with the right expert.
                </h2>
              </div>
              <Link
                href={specialistsHref}
                className="text-[13px] font-medium uppercase tracking-[0.16em] text-[var(--color-text-primary)] underline-offset-4 hover:underline"
              >
                View all →
              </Link>
            </header>

            <ul className="mt-14 grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
              {featuredSpecialties.map((s) => (
                <li key={s.href}>
                  <Link href={s.href} className="group block">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-background-panel)]">
                      {s.imageSrc ? (
                        <Image
                          src={s.imageSrc}
                          alt={s.title}
                          fill
                          sizes="(min-width:1024px) 380px, (min-width:768px) 50vw, 100vw"
                          className="object-cover transition duration-700 group-hover:scale-[1.04]"
                        />
                      ) : null}
                    </div>
                    <div className="mt-5 flex items-start justify-between gap-4">
                      <h3
                        className="gh-display text-[1.5rem]"
                        style={{ fontFamily: "var(--font-cormorant)" }}
                      >
                        {s.title}
                      </h3>
                      <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--color-text-primary)]" />
                    </div>
                    {s.description ? (
                      <p className="mt-2 line-clamp-2 text-[14px] leading-relaxed text-[var(--color-text-muted)]">
                        {s.description}
                      </p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* DOCTORS */}
      {featuredDoctors.length > 0 ? (
        <section className="gh-section bg-[var(--color-background-page)]">
          <div className="gh-container">
            <header className="flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-2xl">
                <span className="gh-heading-eyebrow">Your care team</span>
                <h2
                  className="gh-display mt-5 text-[clamp(2rem,4vw,3.25rem)]"
                  style={{ fontFamily: "var(--font-cormorant)" }}
                >
                  Real clinicians. Real registration numbers.
                </h2>
              </div>
              <Link
                href={teamHref}
                className="text-[13px] font-medium uppercase tracking-[0.16em] text-[var(--color-text-primary)] underline-offset-4 hover:underline"
              >
                Meet the team →
              </Link>
            </header>

            <ul className="mt-14 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
              {featuredDoctors.map((d) => (
                <li key={d.href}>
                  <Link href={d.href} className="group block">
                    <div className="relative aspect-[3/4] overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-background-panel)]">
                      {d.imageSrc ? (
                        <Image
                          src={d.imageSrc}
                          alt={d.name}
                          fill
                          sizes="(min-width:1024px) 240px, (min-width:768px) 25vw, 50vw"
                          className="object-cover transition duration-700 group-hover:scale-[1.04]"
                        />
                      ) : null}
                    </div>
                    <h3 className="mt-4 text-[15px] font-medium leading-tight text-[var(--color-text-primary)]">
                      {d.name}
                    </h3>
                    {d.title ? (
                      <p className="mt-1 text-[12.5px] text-[var(--color-text-muted)]">
                        {d.title}
                      </p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* HOW IT WORKS — forest full-bleed. */}
      <section className="bg-[var(--color-brand-primary)] text-white">
        <div className="gh-container gh-section">
          <div className="grid gap-16 lg:grid-cols-[1fr_1.3fr] lg:gap-24">
            <div>
              <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--color-brand-accent)]">
                How it works
              </span>
              <h2
                className="gh-display mt-5 text-[clamp(2rem,4vw,3.5rem)] text-white"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                Three steps.
                <br />
                No paperwork.
              </h2>
              <p className="mt-6 max-w-md text-[15px] leading-[1.7] text-white/75">
                Set up an account once. From then on, every consultation,
                prescription and lab order lives in the same secure file.
              </p>
              <Link
                href="/book-online"
                className="gh-btn gh-btn-accent mt-10"
              >
                Start now
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            <ol className="space-y-0">
              {(steps.length ? steps : DEFAULT_STEPS).map((step, idx) => (
                <li
                  key={step.title}
                  className="grid grid-cols-[auto_1fr] items-start gap-8 border-t border-white/10 py-8 first:border-t-0 first:pt-0"
                >
                  <span
                    className="text-[2.75rem] leading-none tracking-[-0.02em] text-[var(--color-brand-accent)]"
                    style={{ fontFamily: "var(--font-cormorant)" }}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3
                      className="text-[1.5rem] leading-tight tracking-[-0.01em] text-white"
                      style={{ fontFamily: "var(--font-cormorant)" }}
                    >
                      {step.title}
                    </h3>
                    <p className="mt-2 max-w-md text-[14.5px] leading-[1.7] text-white/70">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* GENERAL menu — compact catalogue */}
      {generalListing.length > 0 ? (
        <section className="gh-section-sm border-b border-[var(--color-border)] bg-[var(--color-background-page)]">
          <div className="gh-container">
            <span className="gh-heading-eyebrow">General consultation menu</span>
            <ul className="mt-8 grid grid-cols-1 gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
              {generalListing.slice(0, 12).map((s) => (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] py-4 text-[14.5px] text-[var(--color-text-primary)] transition hover:text-[var(--color-brand-primary)]"
                  >
                    <span>{s.title}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 opacity-40" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* FINAL CTA */}
      <section className="gh-section bg-[var(--color-background-soft)]">
        <div className="gh-container">
          <div className="grid items-end gap-12 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <span className="gh-heading-eyebrow">Ready when you are</span>
              <h2
                className="gh-display mt-5 text-[clamp(2.5rem,5vw,4.5rem)]"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                Most {country.name} patients are seen{" "}
                <span className="gh-display-em">the same day.</span>
              </h2>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link href="/book-online" className="gh-btn gh-btn-primary">
                Book online
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link href={teamHref} className="gh-btn gh-btn-outline">
                Browse clinicians
              </Link>
            </div>
          </div>
        </div>
      </section>

      {servicesHref ? null /* keep ref used so TS doesn't warn */ : null}
    </main>
  );
}

const DEFAULT_STEPS: Step[] = [
  {
    title: "Choose your consultation",
    description: "GP, specialist, prescription renewal or a home test — pick what fits.",
  },
  {
    title: "Talk to a clinician",
    description: "Video, audio or chat. Your file is open in front of them in real time.",
  },
  {
    title: "Follow-up in your file",
    description: "Prescriptions, lab orders and notes land in your account immediately.",
  },
];
