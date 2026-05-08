import Image from "next/image";
import Link from "next/link";
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
  const duration = keyFacts.find((fact) => /duration/i.test(fact.label))?.value ?? "Confirmed during booking";
  const price = keyFacts.find((fact) => /price/i.test(fact.label))?.value ?? "Shown before booking";

  return (
    <>
      <HeroSection
        eyebrow="Clinical service guide"
        title={title}
        description={description}
        primaryCta={{ href: bookingHref, label: bookingLabel }}
        showMedia={false}
      />
      <Section variant="white">
        <Container>
          <article className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_22rem]">
            <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-card)] sm:p-8 lg:p-10">
              {imageSrc ? (
                <div className="relative mb-8 aspect-[16/8] overflow-hidden rounded-[var(--radius-card)]">
                  <Image src={imageSrc} alt={title} fill className="object-cover" unoptimized={unoptimized} />
                </div>
              ) : null}

              {keyFacts.length > 0 ? (
                <dl className="mb-8 grid gap-3 sm:grid-cols-2">
                  {keyFacts.map((fact) => (
                    <div key={fact.label} className="rounded-full bg-[var(--color-background-soft)] px-4 py-2.5 text-sm">
                      <dt className="inline font-semibold text-[var(--color-text-primary)]">{fact.label}: </dt>
                      <dd className="inline text-[var(--color-text-muted)]">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              {bodyHtml ? (
                <div
                  className="gh-body space-y-4 text-[var(--color-text-muted)] [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-[var(--color-text-primary)] [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-[var(--color-text-primary)] [&_li]:ml-4 [&_li]:list-disc [&_ol_li]:list-decimal"
                  dangerouslySetInnerHTML={{ __html: sanitizeServiceDetailHtml(bodyHtml) }}
                />
              ) : (
                body.map((paragraph) => (
                  <p key={paragraph} className="gh-body text-[var(--color-text-muted)] not-first:mt-4">
                    {paragraph}
                  </p>
                ))
              )}
            </div>

            <aside className="h-fit rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-card)] lg:sticky lg:top-24">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
                Price and duration
              </p>
              <dl className="mt-5 space-y-5">
                <div>
                  <dt className="text-sm font-semibold text-[var(--color-text-muted)]">Duration</dt>
                  <dd className="text-2xl font-extrabold text-[var(--color-text-primary)]">{duration}</dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-[var(--color-text-muted)]">Starting price</dt>
                  <dd className="text-2xl font-extrabold text-[var(--color-text-primary)]">{price}</dd>
                </div>
              </dl>
              <Link href={bookingHref} className="gh-btn gh-btn-primary mt-6 w-full justify-center">
                {bookingLabel}
              </Link>
            </aside>
          </article>
        </Container>
      </Section>
    </>
  );
}
