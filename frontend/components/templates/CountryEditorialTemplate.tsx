import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  Pill,
  ShieldCheck,
  Stethoscope,
  TestTube2,
  Truck,
  Clock,
  Languages,
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

type Step = {
  title: string;
  description: string;
};

export type CountryEditorialTemplateProps = {
  country: CountryConfig;
  generalListing: ServiceCard[];
  specialistListing: ServiceCard[];
  doctors: DoctorCard[];
  steps: Step[];
  paths: {
    home: string;
    team: string;
    general: string;
    specialist: string;
  };
};

const COUNTRY_FLAGS: Record<string, string> = {
  ie: "fi fi-ie",
  pt: "fi fi-pt",
  sp: "fi fi-es",
  cz: "fi fi-cz",
  rm: "fi fi-ro",
};

const QUICK_ACTIONS = (paths: CountryEditorialTemplateProps["paths"]) => [
  {
    title: "General consultation",
    description: "Same-day GP video visits.",
    href: paths.general,
    icon: Stethoscope,
  },
  {
    title: "Specialist consultation",
    description: "Cardiology, dermatology, more.",
    href: paths.specialist,
    icon: ShieldCheck,
  },
  {
    title: "Online prescription",
    description: "Renewals and short-course meds.",
    href: "/online-prescription",
    icon: Pill,
  },
  {
    title: "Home health tests",
    description: "Blood panels and rapid tests.",
    href: "/home-health-test",
    icon: TestTube2,
  },
];

export function CountryEditorialTemplate({
  country,
  generalListing,
  specialistListing,
  doctors,
  steps,
  paths,
}: CountryEditorialTemplateProps) {
  const quickActions = QUICK_ACTIONS(paths);
  const featuredSpecialties = specialistListing.slice(0, 6);
  const featuredDoctors = doctors.slice(0, 4);

  return (
    <main className="bg-white">
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-[var(--color-background-soft)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(900px 480px at 90% -10%, rgba(176, 241, 34, 0.20), transparent 60%), radial-gradient(800px 460px at -10% 110%, rgba(27, 77, 62, 0.10), transparent 60%)",
          }}
        />

        <div className="mx-auto w-full max-w-[1240px] px-6 py-20 md:py-28 lg:px-10">
          <div className="flex items-center gap-3 text-[12px] font-medium text-[var(--color-text-muted)]">
            <span
              className={`${COUNTRY_FLAGS[country.code] ?? "fi"} rounded-[3px] shadow-sm`}
              style={{ width: 22, height: 16 }}
              aria-hidden
            />
            <span className="uppercase tracking-[0.18em]">{country.name} clinic</span>
            <span className="h-1 w-1 rounded-full bg-[var(--color-border-strong)]" />
            <span>Online &amp; in your language</span>
          </div>

          <h1
            className="mt-6 max-w-3xl text-[clamp(2.5rem,5.5vw,4.75rem)] leading-[1.05] tracking-[-0.02em] text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Your {country.name} clinic,{" "}
            <em className="italic font-medium text-[var(--color-brand-primary)]">
              one tap away.
            </em>
          </h1>

          <p className="mt-6 max-w-2xl text-[1.05rem] leading-relaxed text-[var(--color-text-muted)] md:text-[1.15rem]">
            Speak to a licensed clinician in minutes — video, audio, or chat.
            Prescriptions, referrals and lab orders are issued straight to your file.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/book-online" className="gh-btn gh-btn-primary">
              Book a consultation
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href={paths.team} className="gh-btn gh-btn-outline">
              Meet our clinicians
            </Link>
          </div>

          <ul className="mt-12 grid max-w-3xl grid-cols-2 gap-x-8 gap-y-4 text-[13px] text-[var(--color-text-muted)] sm:grid-cols-4">
            <li className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-[var(--color-brand-primary)]" />
              Same-day slots
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--color-brand-primary)]" />
              GDPR-secure
            </li>
            <li className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-[var(--color-brand-primary)]" />
              Pharmacy delivery
            </li>
            <li className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-[var(--color-brand-primary)]" />
              {country.supportedLocales.length} languages
            </li>
          </ul>
        </div>
      </section>

      {/* QUICK ACTIONS — the 4 services as large editorial tiles */}
      <section className="border-t border-[var(--color-border)] bg-white">
        <div className="mx-auto w-full max-w-[1240px] px-6 py-16 lg:px-10 lg:py-20">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="gh-heading-eyebrow">What can we help with?</span>
              <h2
                className="mt-3 text-[clamp(1.75rem,3vw,2.5rem)] leading-tight tracking-tight text-[var(--color-text-primary)]"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                Care in four directions.
              </h2>
            </div>
            <Link
              href="/plans-pricing"
              className="text-[14px] font-semibold text-[var(--color-brand-primary)] underline-offset-4 hover:underline"
            >
              See pricing →
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="group flex h-full flex-col justify-between gap-8 rounded-3xl border border-[var(--color-border)] bg-white p-6 transition hover:-translate-y-[2px] hover:border-[var(--color-brand-primary)] hover:shadow-[0_18px_40px_-20px_rgba(27,77,62,0.35)]"
              >
                <div>
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-brand-accent)] text-[var(--color-brand-primary)]">
                    <action.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-[17px] font-bold tracking-tight text-[var(--color-text-primary)]">
                    {action.title}
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-[var(--color-text-muted)]">
                    {action.description}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--color-brand-primary)]">
                  Explore
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SPECIALTIES — editorial image-led grid */}
      {featuredSpecialties.length > 0 ? (
        <section className="bg-[var(--color-background-soft)]">
          <div className="mx-auto w-full max-w-[1240px] px-6 py-16 lg:px-10 lg:py-24">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="max-w-2xl">
                <span className="gh-heading-eyebrow">Specialist consultations</span>
                <h2
                  className="mt-3 text-[clamp(1.75rem,3vw,2.5rem)] leading-tight tracking-tight text-[var(--color-text-primary)]"
                  style={{ fontFamily: "var(--font-cormorant)" }}
                >
                  Go deeper, with the right expert.
                </h2>
                <p className="mt-3 text-[15px] text-[var(--color-text-muted)]">
                  Curated consultants across cardiology, dermatology, mental health and more — booked the same way you book a GP.
                </p>
              </div>
              <Link
                href={paths.specialist}
                className="text-[14px] font-semibold text-[var(--color-brand-primary)] underline-offset-4 hover:underline"
              >
                View all specialties →
              </Link>
            </div>

            <ul className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {featuredSpecialties.map((s) => (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    className="group block h-full overflow-hidden rounded-3xl border border-[var(--color-border)] bg-white transition hover:-translate-y-[2px] hover:shadow-[0_22px_50px_-22px_rgba(27,77,62,0.35)]"
                  >
                    {s.imageSrc ? (
                      <div className="relative aspect-[5/3] overflow-hidden">
                        <Image
                          src={s.imageSrc}
                          alt={s.title}
                          fill
                          sizes="(min-width:1024px) 380px, (min-width:768px) 50vw, 100vw"
                          className="object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[5/3] bg-gradient-to-br from-[var(--color-brand-primary)] to-[var(--color-background-dark)]" />
                    )}
                    <div className="p-5">
                      <h3 className="text-[17px] font-bold tracking-tight text-[var(--color-text-primary)]">
                        {s.title}
                      </h3>
                      {s.description ? (
                        <p className="mt-2 line-clamp-2 text-[14px] leading-relaxed text-[var(--color-text-muted)]">
                          {s.description}
                        </p>
                      ) : null}
                      {s.stats ? (
                        <p className="mt-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--color-brand-primary)]">
                          {s.stats}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* DOCTORS */}
      {featuredDoctors.length > 0 ? (
        <section className="bg-white">
          <div className="mx-auto w-full max-w-[1240px] px-6 py-16 lg:px-10 lg:py-24">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="max-w-2xl">
                <span className="gh-heading-eyebrow">Your care team</span>
                <h2
                  className="mt-3 text-[clamp(1.75rem,3vw,2.5rem)] leading-tight tracking-tight text-[var(--color-text-primary)]"
                  style={{ fontFamily: "var(--font-cormorant)" }}
                >
                  Real clinicians. Real registration numbers.
                </h2>
              </div>
              <Link
                href={paths.team}
                className="text-[14px] font-semibold text-[var(--color-brand-primary)] underline-offset-4 hover:underline"
              >
                Meet the full team →
              </Link>
            </div>

            <ul className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-4">
              {featuredDoctors.map((d) => (
                <li key={d.href}>
                  <Link
                    href={d.href}
                    className="group block overflow-hidden rounded-3xl border border-[var(--color-border)] bg-white transition hover:-translate-y-[2px] hover:shadow-[0_18px_40px_-20px_rgba(27,77,62,0.30)]"
                  >
                    {d.imageSrc ? (
                      <div className="relative aspect-[4/5] overflow-hidden bg-[var(--color-background-soft)]">
                        <Image
                          src={d.imageSrc}
                          alt={d.name}
                          fill
                          sizes="(min-width:1024px) 220px, (min-width:768px) 25vw, 50vw"
                          className="object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[4/5] bg-gradient-to-br from-[var(--color-brand-primary)] to-[var(--color-background-dark)]" />
                    )}
                    <div className="p-4">
                      <h3 className="text-[15px] font-bold leading-tight text-[var(--color-text-primary)]">
                        {d.name}
                      </h3>
                      {d.title ? (
                        <p className="mt-1 text-[12.5px] text-[var(--color-text-muted)]">
                          {d.title}
                        </p>
                      ) : null}
                      {d.languages && d.languages.length > 0 ? (
                        <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-brand-primary)]">
                          <Languages className="h-3 w-3" />
                          {d.languages.slice(0, 3).join(" · ")}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* HOW IT WORKS */}
      <section className="bg-[var(--color-brand-primary)] text-white">
        <div className="mx-auto w-full max-w-[1240px] px-6 py-16 lg:px-10 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-brand-accent)]">
                How it works
              </span>
              <h2
                className="mt-3 text-[clamp(1.75rem,3vw,2.75rem)] leading-tight tracking-tight"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                Three steps. No paperwork.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-white/75">
                Set up an account once. From then on, you'll book, consult and receive
                your prescription on the same screen.
              </p>
              <Link
                href="/book-online"
                className="gh-btn gh-btn-ghost-dark mt-8"
              >
                Start now
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <ol className="space-y-4">
              {(steps.length ? steps : DEFAULT_STEPS).map((step, idx) => (
                <li
                  key={step.title}
                  className="flex items-start gap-5 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-accent)] text-[14px] font-bold text-[var(--color-brand-primary)]">
                    {idx + 1}
                  </span>
                  <div>
                    <h3 className="text-[17px] font-bold leading-tight">{step.title}</h3>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-white/75">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-white">
        <div className="mx-auto w-full max-w-[1240px] px-6 py-20 lg:px-10 lg:py-28">
          <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-10 md:p-14">
            <div className="flex flex-wrap items-end justify-between gap-8">
              <div className="max-w-xl">
                <span className="gh-heading-eyebrow flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" /> Average wait · 14 min
                </span>
                <h2
                  className="mt-4 text-[clamp(1.75rem,3.5vw,3rem)] leading-tight tracking-tight text-[var(--color-text-primary)]"
                  style={{ fontFamily: "var(--font-cormorant)" }}
                >
                  Ready when you are.
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-[var(--color-text-muted)]">
                  Most {country.name} patients are seen the same day. Book in under a minute.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/book-online" className="gh-btn gh-btn-primary">
                  Book online
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href={paths.team} className="gh-btn gh-btn-soft">
                  Browse clinicians
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GENERAL service list (compact) — keeps general catalogue indexable */}
      {generalListing.length > 0 ? (
        <section className="border-t border-[var(--color-border)] bg-white">
          <div className="mx-auto w-full max-w-[1240px] px-6 py-14 lg:px-10">
            <span className="gh-heading-eyebrow">General consultation menu</span>
            <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
              {generalListing.slice(0, 12).map((s) => (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--color-border)] py-3 text-[14px] font-medium text-[var(--color-text-primary)] hover:text-[var(--color-brand-primary)]"
                  >
                    <span>{s.title}</span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-50" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
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
