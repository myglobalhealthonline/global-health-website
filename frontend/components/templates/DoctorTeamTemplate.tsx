import Link from "next/link";
import { BookingCTA } from "@/components/sections/BookingCTA";
import { Container } from "@/components/layout/Container";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Globe2,
  Languages,
  MessageCircle,
  ShieldCheck,
  Stethoscope,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

type Doctor = {
  name: string;
  title: string;
  imcRegistration?: string;
  medicalRegistrationUrl?: string;
  country?: string;
  languages?: string[];
  whatsappNumber?: string;
  bio: string;
  imageSrc?: string | null;
  href?: string;
  ctaLabel?: string;
};

type DoctorTeamTemplateProps = {
  countryName: string;
  doctors: Doctor[];
  bookingHref: string;
  bookingLabel: string;
  /**
   * Whether to render a `BookingCTA` after the doctor card grid.
   * Defaults to `false` — the doctor cards already serve as the primary
   * clinician selection UI, so a generic CTA at the end adds repetition.
   * Set to `true` only when the page has no other booking entry points.
   */
  showBottomCta?: boolean;
};

function HeroPlusPattern() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full text-white opacity-[0.16] [mask-image:radial-gradient(circle_at_72%_30%,black,transparent_72%)]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="doctor-team-plus-pattern"
          width="56"
          height="56"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M28 18v20M18 28h20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill="url(#doctor-team-plus-pattern)" />
    </svg>
  );
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function truncate(value: string, maxLength: number) {
  const text = stripHtml(value);

  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength).trim()}…`;
}

function whatsappHref(value?: string) {
  if (!value) return null;

  const cleaned = value.replace(/[^\d+]/g, "").replace(/^\+/, "");

  if (!cleaned) return null;

  return `https://wa.me/${cleaned}`;
}

function HeroStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
      <div className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/10">
          <Icon className="size-5 text-[var(--color-brand-accent)]" />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/45">{label}</p>
          <p className="mt-1 text-base font-bold leading-6 text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function MetaChip({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  if (!children) return null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-text-muted)]">
      <Icon className="size-3.5 text-[var(--color-brand-primary)]" />
      {children}
    </span>
  );
}

function DoctorImage({
  doctor,
  large = false,
}: {
  doctor: Doctor;
  large?: boolean;
}) {
  if (doctor.imageSrc) {
    return (
      <div
        className={
          large
            ? "relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-[var(--color-background-soft)]"
            : "relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-[var(--color-background-soft)]"
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={doctor.imageSrc}
          alt={doctor.name}
          className="h-full w-full object-cover"
          loading={large ? "eager" : "lazy"}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
      </div>
    );
  }

  return (
    <div
      className={
        large
          ? "flex aspect-[4/5] items-center justify-center rounded-[1.5rem] bg-[var(--color-background-soft)]"
          : "flex aspect-[4/3] items-center justify-center rounded-[1.5rem] bg-[var(--color-background-soft)]"
      }
    >
      <div className="flex size-24 items-center justify-center rounded-[2rem] bg-white shadow-sm">
        <UserRound className="size-12 text-[var(--color-brand-primary)]" />
      </div>
    </div>
  );
}

function FeaturedDoctorCard({
  doctor,
  bookingHref,
  bookingLabel,
}: {
  doctor: Doctor;
  bookingHref: string;
  bookingLabel: string;
}) {
  const profileHref = doctor.href ?? bookingHref;
  const ctaLabel = doctor.ctaLabel ?? bookingLabel;
  const languages = doctor.languages?.filter(Boolean) ?? [];
  const whatsapp = whatsappHref(doctor.whatsappNumber);

  return (
    <section className="bg-[var(--color-background-soft)] pb-16 sm:pb-20 lg:pb-24">
      <Container>
        <div className="-mt-12 relative z-20 overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-white p-4 shadow-xl sm:p-5 lg:p-6">
          <div className="grid gap-8 lg:grid-cols-[0.48fr_0.52fr] lg:items-center">
            <div className="relative">
              <DoctorImage doctor={doctor} large />

              <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/15 bg-white/90 p-5 text-[var(--color-text-primary)] shadow-xl backdrop-blur">
                <p className="text-sm font-semibold text-[var(--color-brand-primary)]">
                  Featured clinician
                </p>
                <p className="mt-1 text-xl font-extrabold leading-6">{doctor.name}</p>
                <p className="mt-1 text-sm leading-5 text-[var(--color-text-muted)]">
                  {doctor.title}
                </p>
              </div>
            </div>

            <div className="p-2 sm:p-4 lg:p-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-primary)]/10 px-4 py-2 text-sm font-semibold text-[var(--color-brand-primary)]">
                <BadgeCheck className="size-4" />
                Lead profile
              </span>

              <h2 className="mt-6 text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-5xl">
                {doctor.name}
              </h2>

              <p className="mt-3 text-xl font-semibold leading-8 text-[var(--color-brand-primary)]">
                {doctor.title}
              </p>

              {doctor.bio ? (
                <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--color-text-muted)]">
                  {truncate(doctor.bio, 340)}
                </p>
              ) : null}

              <div className="mt-7 flex flex-wrap gap-2">
                {doctor.country ? <MetaChip icon={Globe2}>{doctor.country}</MetaChip> : null}

                {languages.length > 0 ? (
                  <MetaChip icon={Languages}>{languages.join(", ")}</MetaChip>
                ) : null}

                {doctor.imcRegistration ? (
                  <MetaChip icon={ShieldCheck}>IMC {doctor.imcRegistration}</MetaChip>
                ) : null}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={profileHref}
                  className="group inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-brand-primary)] px-7 py-3.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:opacity-90"
                >
                  {ctaLabel}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>

                {doctor.medicalRegistrationUrl ? (
                  <a
                    href={doctor.medicalRegistrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-7 py-3.5 text-sm font-bold text-[var(--color-text-primary)] transition-all hover:bg-[var(--color-background-soft)]"
                  >
                    <ShieldCheck className="size-4" />
                    Registration
                  </a>
                ) : null}

                {whatsapp ? (
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-7 py-3.5 text-sm font-bold text-[var(--color-text-primary)] transition-all hover:bg-[var(--color-background-soft)]"
                  >
                    <MessageCircle className="size-4" />
                    WhatsApp
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function DoctorCard({
  doctor,
  bookingHref,
  bookingLabel,
}: {
  doctor: Doctor;
  bookingHref: string;
  bookingLabel: string;
}) {
  const profileHref = doctor.href ?? bookingHref;
  const ctaLabel = doctor.ctaLabel ?? bookingLabel;
  const languages = doctor.languages?.filter(Boolean) ?? [];
  const whatsapp = whatsappHref(doctor.whatsappNumber);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <Link href={profileHref} className="block p-4 pb-0">
        <DoctorImage doctor={doctor} />
      </Link>

      <div className="flex flex-1 flex-col p-6">
        <div>
          <Link href={profileHref}>
            <h3 className="text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-brand-primary)]">
              {doctor.name}
            </h3>
          </Link>

          <p className="mt-2 text-base font-semibold leading-6 text-[var(--color-brand-primary)]">
            {doctor.title}
          </p>

          {doctor.bio ? (
            <p className="mt-4 line-clamp-4 text-sm leading-6 text-[var(--color-text-muted)]">
              {truncate(doctor.bio, 210)}
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {doctor.country ? <MetaChip icon={Globe2}>{doctor.country}</MetaChip> : null}

          {languages.length > 0 ? (
            <MetaChip icon={Languages}>{languages.join(", ")}</MetaChip>
          ) : null}

          {doctor.imcRegistration ? (
            <MetaChip icon={ShieldCheck}>IMC {doctor.imcRegistration}</MetaChip>
          ) : null}
        </div>

        <div className="mt-auto pt-7">
          <Link
            href={profileHref}
            className="group/btn inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-brand-primary)] px-6 py-3.5 text-sm font-bold text-white transition-all hover:opacity-90"
          >
            {ctaLabel}
            <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-1" />
          </Link>

          {(doctor.medicalRegistrationUrl || whatsapp) ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {doctor.medicalRegistrationUrl ? (
                <a
                  href={doctor.medicalRegistrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 py-3 text-xs font-bold text-[var(--color-text-primary)] transition-all hover:bg-[var(--color-background-soft)]"
                >
                  <ShieldCheck className="size-4" />
                  Registration
                </a>
              ) : null}

              {whatsapp ? (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 py-3 text-xs font-bold text-[var(--color-text-primary)] transition-all hover:bg-[var(--color-background-soft)]"
                >
                  <MessageCircle className="size-4" />
                  WhatsApp
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function EmptyState({ countryName, bookingHref, bookingLabel }: {
  countryName: string;
  bookingHref: string;
  bookingLabel: string;
}) {
  return (
    <section className="bg-[var(--color-background-soft)] py-20 sm:py-28 lg:py-32">
      <Container>
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-[var(--color-border)] bg-white p-8 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[var(--color-brand-primary)]/10">
            <UsersRound className="size-7 text-[var(--color-brand-primary)]" />
          </div>

          <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
            {countryName} medical team
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[var(--color-text-muted)]">
            Clinician profiles will appear here when they are available.
          </p>

          <div className="mt-7">
            <Link
              href={bookingHref}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-brand-primary)] px-7 py-3.5 text-sm font-bold text-white transition-all hover:opacity-90"
            >
              {bookingLabel}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}

export function DoctorTeamTemplate({
  countryName,
  doctors,
  bookingHref,
  bookingLabel,
  showBottomCta = false,
}: DoctorTeamTemplateProps) {
  const featuredDoctor = doctors[0];
  const remainingDoctors = doctors.slice(1);
  const doctorCount = doctors.length === 1 ? "1 clinician" : `${doctors.length} clinicians`;

  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative isolate overflow-hidden bg-[var(--color-brand-primary)] text-white">
        <HeroPlusPattern />

        <div className="gh-medical-pattern gh-medical-pattern-dark absolute inset-0 z-0 opacity-20" />
        <div className="absolute -right-40 top-0 z-0 size-[34rem] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 z-0 size-[30rem] rounded-full bg-[var(--color-brand-accent)]/20 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 z-0 h-40 bg-gradient-to-t from-black/15 to-transparent" />

        <Container className="relative z-10 py-20 sm:py-28 lg:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-[var(--color-brand-accent)] backdrop-blur">
              <Stethoscope className="size-4" />
              Medical team
            </span>

            <h1 className="mt-7 text-5xl font-extrabold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">
              {countryName} medical team
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/75 sm:text-xl">
              Review clinician profiles, languages, and registration details before choosing your
              booking route.
            </p>

            <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
              <HeroStat icon={UsersRound} label="Team" value={doctorCount} />
              <HeroStat icon={ShieldCheck} label="Details" value="Registration shown" />
              <HeroStat icon={CalendarClock} label="Booking" value="Online route available" />
            </div>

            <div className="mt-10">
              <Link
                href={featuredDoctor ? "#medical-team" : bookingHref}
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-[var(--color-brand-primary)] shadow-xl shadow-black/10 transition-all hover:-translate-y-0.5 hover:bg-[var(--color-brand-accent)]"
              >
                {featuredDoctor ? "View clinicians" : bookingLabel}
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {!featuredDoctor ? (
        <EmptyState countryName={countryName} bookingHref={bookingHref} bookingLabel={bookingLabel} />
      ) : (
        <>
          <FeaturedDoctorCard
            doctor={featuredDoctor}
            bookingHref={bookingHref}
            bookingLabel={bookingLabel}
          />

          <section id="medical-team" className="bg-[var(--color-background-soft)] pb-20 sm:pb-28 lg:pb-32">
            <Container>
              <div className="mb-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <span className="gh-heading-eyebrow text-[var(--color-brand-primary)]">
                    Clinician profiles
                  </span>

                  <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
                    {countryName} medical team
                  </h2>
                </div>

                <p className="max-w-2xl text-base leading-7 text-[var(--color-text-muted)] sm:text-right">
                  Review clinician specialties, languages, and registration details before choosing
                  a booking route.
                </p>
              </div>

              {remainingDoctors.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {remainingDoctors.map((doctor) => (
                    <DoctorCard
                      key={`${doctor.name}-${doctor.title}`}
                      doctor={doctor}
                      bookingHref={bookingHref}
                      bookingLabel={bookingLabel}
                    />
                  ))}
                </div>
              ) : null}
            </Container>
          </section>
        </>
      )}

      {showBottomCta ? (
        <BookingCTA
          variant="doctor"
          eyebrow={`${countryName} clinician access`}
          title="Book with the right clinician"
          description="Choose a consultation route after reviewing clinician fit, specialty, and availability."
          ctaLabel={bookingLabel}
          ctaHref={bookingHref}
          density="compact"
          showProofPoints={false}
        />
      ) : null}
    </>
  );
}