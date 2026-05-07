import Image from "next/image";
import { BookingCTA } from "@/components/sections/BookingCTA";
import { HeroSection } from "@/components/sections/HeroSection";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { sanitizeServiceDetailHtml } from "@/lib/content/service-detail-format";

type ServiceDetailTemplateProps = {
  title: string;
  description: string;
  body: string[];
  bodyHtml?: string | null;
  keyFacts?: Array<{ label: string; value: string }>;
  bookingHref: string;
  bookingLabel: string;
  imageSrc?: string;
};

export function ServiceDetailTemplate({
  title,
  description,
  body,
  bodyHtml,
  keyFacts = [],
  bookingHref,
  bookingLabel,
  imageSrc,
}: ServiceDetailTemplateProps) {
  const unoptimized = !!imageSrc && (/^https?:\/\//i.test(imageSrc) || imageSrc.startsWith("/api/media/"));

  return (
    <>
      <HeroSection
        eyebrow="Consultation details"
        title={title}
        description={description}
        primaryCta={{ href: bookingHref, label: bookingLabel }}
        trustBadges={["Online assessment", "Private and secure", "Clear follow-up guidance"]}
      />
      <Section>
        <Container>
          <article className="gh-card mx-auto max-w-4xl p-7 sm:p-8">
            {imageSrc ? (
              <div className="relative mb-6 aspect-[16/8] overflow-hidden rounded-[var(--radius-card)]">
                <Image src={imageSrc} alt={title} fill className="object-cover" unoptimized={unoptimized} />
              </div>
            ) : null}
            {keyFacts.length > 0 ? (
              <dl className="mb-6 grid gap-2 sm:grid-cols-2">
                {keyFacts.map((fact) => (
                  <div key={fact.label} className="rounded-full bg-[var(--color-background-soft)] px-4 py-2 text-sm">
                    <dt className="inline font-semibold text-[var(--color-text-primary)]">{fact.label}: </dt>
                    <dd className="inline text-[var(--color-text-muted)]">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {bodyHtml ? (
              <div
                className="gh-body space-y-4 text-[var(--color-text-muted)] [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-[var(--color-text-primary)] [&_h3]:mt-5 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-[var(--color-text-primary)] [&_li]:ml-4 [&_li]:list-disc [&_ol_li]:list-decimal"
                dangerouslySetInnerHTML={{ __html: sanitizeServiceDetailHtml(bodyHtml) }}
              />
            ) : (
              body.map((paragraph) => (
                <p key={paragraph} className="gh-body text-[var(--color-text-muted)] not-first:mt-4">
                  {paragraph}
                </p>
              ))
            )}
          </article>
        </Container>
      </Section>
      <BookingCTA
        title="Book this consultation"
        description="Service scope and eligibility will be confirmed during intake."
        ctaLabel={bookingLabel}
        ctaHref={bookingHref}
      />
    </>
  );
}
