import Image from "next/image";
import { BookingCTA } from "@/components/sections/BookingCTA";
import { HeroSection } from "@/components/sections/HeroSection";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

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
  };
  bottomCta: { title: string; description: string; ctaLabel: string; ctaHref: string };
};

export function DoctorProfileTemplate({ hero, profile, bottomCta }: DoctorProfileTemplateProps) {
  return (
    <>
      <HeroSection
        eyebrow="Doctor profile"
        title={hero.title}
        description={hero.description}
        primaryCta={hero.primaryCta}
        secondaryCta={hero.secondaryCta}
        trustBadges={["Licensed clinician", "Secure consultations", "Country-supported care"]}
      />
      <Section className="bg-[var(--color-brand-secondary)]">
        <Container>
          <article className="gh-card mx-auto max-w-4xl p-7 sm:p-8">
            <div className="grid gap-6 md:grid-cols-[0.8fr_1.2fr]">
              <div className="overflow-hidden rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[linear-gradient(135deg,var(--color-background-soft),#eef6e2)] p-2">
                <Image
                  src="/images/ireland/doctor-spotlight-ai.svg"
                  alt={`Illustrative clinician portrait for ${profile.name}`}
                  width={540}
                  height={620}
                  className="h-auto w-full rounded-[14px] object-cover"
                />
              </div>
              <div>
                <h2 className="gh-h2 text-[var(--color-text-primary)]">{profile.name}</h2>
                <p className="gh-body mt-2 font-semibold text-[var(--color-brand-primary)]">
                  {profile.title}
                </p>
                <p className="gh-body-sm mt-2 text-[var(--color-text-muted)]">
                  {profile.country} · Languages: {profile.languages.join(", ")}
                </p>
                <p className="gh-body mt-4 text-[var(--color-text-muted)]">{profile.bio}</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <section className="rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
                <h3 className="gh-h3 text-[var(--color-text-primary)]">Qualifications</h3>
                <ul className="mt-3 space-y-2">
                  {profile.qualifications.map((item) => (
                    <li key={item} className="gh-body-sm text-[var(--color-text-muted)]">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
              <section className="rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
                <h3 className="gh-h3 text-[var(--color-text-primary)]">Consultation areas</h3>
                <ul className="mt-3 space-y-2">
                  {profile.specialties.map((item) => (
                    <li key={item} className="gh-body-sm text-[var(--color-text-muted)]">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </article>
        </Container>
      </Section>
      <BookingCTA
        title={bottomCta.title}
        description={bottomCta.description}
        ctaLabel={bottomCta.ctaLabel}
        ctaHref={bottomCta.ctaHref}
      />
    </>
  );
}
