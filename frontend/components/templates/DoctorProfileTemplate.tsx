import Image from "next/image";
import Link from "next/link";
/* eslint-disable react/no-unescaped-entities */
import {
  ArrowLeft,
  ArrowUpRight,
  ExternalLink,
} from "lucide-react";
import { sanitizeDoctorBioHtml } from "@/lib/content/doctor-bio-format";

type DoctorProfileTemplateProps = {
  hero: {
    title: string;
    description: string;
    primaryCta: { label: string; href: string };
    secondaryCta?: { label: string; href: string };
  };
  profile: {
    name: string;
    title: string;
    country: string;
    languages: string[];
    bio: string;
    qualifications: string[];
    specialties: string[];
    imageLabel: string;
    imcRegistration?: string;
    medicalRegistrationUrl?: string;
  };
  bottomCta: { title: string; description: string; ctaLabel: string; ctaHref: string };
  profileImageSrc?: string;
  bookingCtaImage?: { src: string; alt: string };
  showReviewScore?: boolean;
  doctifyWidgetUrl?: string;
};

export function DoctorProfileTemplate({
  hero,
  profile,
  bottomCta,
  profileImageSrc,
  doctifyWidgetUrl,
}: DoctorProfileTemplateProps) {
  const safeBio = sanitizeDoctorBioHtml(profile.bio);
  const backHref = hero.secondaryCta?.href;

  return (
    <main className="bg-[var(--color-background-page)]">
      {/* HERO — split portrait + meta */}
      <section className="gh-section-sm bg-[var(--color-background-soft)]">
        <div className="gh-container">
          {backHref ? (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-medium uppercase tracking-[0.16em] text-[var(--color-text-muted)] underline-offset-4 hover:text-[var(--color-text-primary)] hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to {profile.country} clinicians
            </Link>
          ) : null}

          <div className="mt-12 grid items-start gap-12 lg:grid-cols-[460px_1fr] lg:gap-20">
            <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-background-panel)]">
              {profileImageSrc ? (
                <div className="relative aspect-[4/5]">
                  <Image
                    src={profileImageSrc}
                    alt={profile.name}
                    fill
                    sizes="(min-width:1024px) 460px, 100vw"
                    priority
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-[4/5]" />
              )}
            </div>

            <div>
              <span className="gh-heading-eyebrow">
                {profile.title} · {profile.country}
              </span>
              <h1
                className="gh-display mt-6 text-[clamp(2.5rem,5vw,4.5rem)]"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                {profile.name}
              </h1>

              {hero.description ? (
                <p className="mt-8 max-w-[560px] text-[1.05rem] leading-[1.7] text-[var(--color-text-body)] md:text-[1.15rem]">
                  {hero.description}
                </p>
              ) : null}

              <dl className="mt-12 grid max-w-[520px] grid-cols-2 gap-x-10 gap-y-8 border-t border-[var(--color-border)] pt-10">
                {profile.imcRegistration ? (
                  <Meta
                    label="Registration"
                    value={
                      profile.medicalRegistrationUrl ? (
                        <a
                          href={profile.medicalRegistrationUrl}
                          target="_blank"
                          rel="noopener"
                          className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                        >
                          {profile.imcRegistration}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        profile.imcRegistration
                      )
                    }
                  />
                ) : null}
                {profile.languages.length > 0 ? (
                  <Meta label="Languages" value={profile.languages.join(" · ")} />
                ) : null}
                {profile.specialties.length > 0 ? (
                  <Meta
                    label="Focus areas"
                    value={profile.specialties.slice(0, 3).join(" · ")}
                  />
                ) : null}
                <Meta label="Country" value={profile.country} />
              </dl>

              <div className="mt-12 flex flex-wrap items-center gap-3">
                <Link href={hero.primaryCta.href} className="gh-btn gh-btn-primary">
                  {hero.primaryCta.label}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                {hero.secondaryCta ? (
                  <Link href={hero.secondaryCta.href} className="gh-btn gh-btn-outline">
                    {hero.secondaryCta.label}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BODY — long-form bio + sticky booking */}
      <section className="gh-section bg-[var(--color-background-page)]">
        <div className="gh-container grid gap-16 lg:grid-cols-[1.5fr_1fr] lg:gap-24">
          <article>
            <span className="gh-heading-eyebrow">Profile</span>
            <h2
              className="gh-display mt-5 text-[clamp(1.85rem,3.5vw,2.75rem)]"
              style={{ fontFamily: "var(--font-cormorant)" }}
            >
              About {profile.name.split(" ").slice(0, 2).join(" ")}
            </h2>
            <div
              className="mt-8 text-[16px] leading-[1.85] text-[var(--color-text-body)] [&_p]:mt-5 [&_p:first-child]:mt-0 [&_a]:text-[var(--color-brand-primary)] [&_a]:underline [&_a]:underline-offset-2"
              dangerouslySetInnerHTML={{ __html: safeBio }}
            />

            {profile.qualifications.length > 0 ? (
              <div className="mt-14 border-t border-[var(--color-border)] pt-10">
                <span className="gh-heading-eyebrow">Qualifications</span>
                <ul className="mt-6 space-y-3 text-[15px] leading-[1.7] text-[var(--color-text-body)]">
                  {profile.qualifications.map((q) => (
                    <li key={q} className="flex items-start gap-3">
                      <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-[var(--color-text-primary)]" />
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {doctifyWidgetUrl ? (
              <div className="mt-12 overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-background-soft)] p-6">
                <iframe
                  src={doctifyWidgetUrl}
                  title="Patient reviews"
                  className="h-[220px] w-full"
                  loading="lazy"
                />
              </div>
            ) : null}
          </article>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[var(--radius-card)] bg-[var(--color-brand-primary)] p-8 text-white md:p-10">
              <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--color-brand-accent)]">
                Book this clinician
              </span>
              <h3
                className="gh-display mt-5 text-[1.85rem] text-white"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                Same-day video slots, typically.
              </h3>
              <p className="mt-4 text-[14.5px] leading-[1.7] text-white/75">
                You'll receive a calendar invite immediately after booking — no
                back-and-forth.
              </p>
              <Link
                href={hero.primaryCta.href}
                className="gh-btn gh-btn-accent mt-8 w-full justify-center"
              >
                {hero.primaryCta.label}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </aside>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="gh-section-sm border-t border-[var(--color-border)] bg-[var(--color-background-soft)]">
        <div className="gh-container">
          <div className="grid items-end gap-10 lg:grid-cols-[1.6fr_1fr]">
            <div>
              <span className="gh-heading-eyebrow">Next step</span>
              <h2
                className="gh-display mt-5 text-[clamp(1.85rem,4vw,3rem)]"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                {bottomCta.title}
              </h2>
              <p className="mt-6 max-w-[520px] text-[15px] leading-[1.7] text-[var(--color-text-muted)]">
                {bottomCta.description}
              </p>
            </div>
            <Link href={bottomCta.ctaHref} className="gh-btn gh-btn-primary lg:justify-self-end">
              {bottomCta.ctaLabel}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        {label}
      </dt>
      <dd className="mt-2 text-[14.5px] text-[var(--color-text-primary)]">{value}</dd>
    </div>
  );
}
