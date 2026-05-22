import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Languages } from "lucide-react";
import { PageHero } from "@/components/sections/PageHero";

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
  showBottomCta?: boolean;
};

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function truncate(value: string, max = 140) {
  const t = stripHtml(value);
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

export function DoctorTeamTemplate({
  countryName,
  doctors,
  bookingHref,
  bookingLabel,
  showBottomCta = false,
}: DoctorTeamTemplateProps) {
  return (
    <main className="bg-[var(--color-background-page)]">
      <PageHero
        countryLabel={`${countryName} · The team`}
        titleLead="Doctors who"
        titleAccent="actually"
        titleTrail="pick up."
        lede={
          <>
            Every clinician below is licensed in {countryName}, vetted for
            online care, and reviewed by patients after each consultation.
            <br />
            <span className="text-white/55">
              {doctors.length} licensed{" "}
              {doctors.length === 1 ? "clinician" : "clinicians"} available
            </span>
          </>
        }
        ctaLabel={bookingLabel}
        ctaHref={bookingHref}
      />

      {/* GRID */}
      <section className="gh-section bg-[var(--color-background-page)]">
        <div className="gh-container">
          {doctors.length === 0 ? (
            <div className="mx-auto max-w-[480px] text-center">
              <h2
                className="gh-display text-[2rem]"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                Onboarding clinicians.
              </h2>
              <p className="mt-4 text-[15px] text-[var(--color-text-muted)]">
                Our {countryName} medical team is being verified. Check back
                soon — or book with our cross-border specialists.
              </p>
              <Link href={bookingHref} className="gh-btn gh-btn-primary mt-8">
                {bookingLabel}
              </Link>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-x-10 gap-y-16 md:grid-cols-2 lg:grid-cols-3">
              {doctors.map((d) => (
                <li key={(d.href ?? "") + d.name}>
                  <article>
                    <Link
                      href={d.href ?? "#"}
                      className="group block"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-background-panel)]">
                        {d.imageSrc ? (
                          <Image
                            src={d.imageSrc}
                            alt={d.name}
                            fill
                            sizes="(min-width:1024px) 380px, (min-width:768px) 50vw, 100vw"
                            className="object-cover"
                            // Admin-uploaded portraits live under /api/media/
                            // and aren't pre-registered in
                            // next.config.remotePatterns. Without
                            // `unoptimized`, Next's image optimiser refuses
                            // them and returns a broken response — same
                            // guard DoctorCard already has on the consult
                            // pages.
                            unoptimized={
                              /^https?:\/\//i.test(d.imageSrc) ||
                              d.imageSrc.startsWith("/api/media/")
                            }
                          />
                        ) : null}
                      </div>
                      <div className="mt-5 flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-[1.05rem] font-medium leading-tight text-[var(--color-text-primary)]">
                            {d.name}
                          </h3>
                          {d.title ? (
                            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
                              {d.title}
                            </p>
                          ) : null}
                        </div>
                        <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--color-text-primary)] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0" />
                      </div>
                    </Link>

                    {d.languages && d.languages.length > 0 ? (
                      <p className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                        <Languages className="h-3 w-3" />
                        {d.languages.slice(0, 3).join(" · ")}
                      </p>
                    ) : null}

                    {d.bio ? (
                      <p className="mt-3 text-[14px] leading-[1.7] text-[var(--color-text-muted)]">
                        {truncate(d.bio, 160)}
                      </p>
                    ) : null}
                  </article>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {showBottomCta ? (
        <section className="gh-section bg-[var(--color-background-soft)]">
          <div className="gh-container">
            <div className="grid items-end gap-10 lg:grid-cols-[1.6fr_1fr]">
              <h2
                className="gh-display text-[clamp(2rem,4.5vw,4rem)]"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                Pick a clinician. Book{" "}
                <span className="gh-display-em">the same day.</span>
              </h2>
              <Link href={bookingHref} className="gh-btn gh-btn-primary lg:justify-self-end">
                {bookingLabel}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
