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
  editorialNotice?: string | null;
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
  editorialNotice,
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
        trustBadges={["Eligibility reviewed", "Private intake", "Follow-up explained"]}
      />
      <Section>
        <Container>
          <article className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_20rem]">
            <div className="gh-card p-7 sm:p-8">
            {imageSrc ? (
              <div className="relative mb-6 aspect-[16/8] overflow-hidden rounded-[var(--radius-card)]">
                <Image src={imageSrc} alt={title} fill className="object-cover" unoptimized={unoptimized} />
              </div>
            ) : null}
            {editorialNotice ? (
              <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">
                {editorialNotice}
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
            {/* Concise safe fallback rendered only when no rich body content exists yet.
                Keep to three sections — overview, preparation, urgent safety note.
                Real service-specific content should come from the DB bodyHtml field. */}
            {!bodyHtml ? (
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <section className="rounded-2xl bg-[var(--color-background-soft)] p-5">
                  <h2 className="text-lg font-bold text-[var(--color-text-primary)]">About this service</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                    This appointment is for non-emergency concerns that can be safely reviewed online. The
                    clinician will assess your information and advise on next steps, which may include
                    treatment, referral, testing, or in-person care.
                  </p>
                </section>

                <section className="rounded-2xl bg-[var(--color-background-soft)] p-5">
                  <h2 className="text-lg font-bold text-[var(--color-text-primary)]">What to prepare</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                    Prepare your symptoms, current medications, allergies, relevant documents or photos, and
                    the outcome you need from the consultation. The more context you provide, the more useful
                    the review will be.
                  </p>
                </section>

                <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <h2 className="text-lg font-bold text-amber-900">Urgent symptoms</h2>
                  <p className="mt-2 text-sm leading-6 text-amber-800">
                    Emergency symptoms — including chest pain, breathing difficulty, severe pain, major
                    injury, or rapidly worsening conditions — require urgent or in-person emergency care.
                    Do not wait for an online consultation.
                  </p>
                </section>
              </div>
            ) : null}
            </div>
            <aside className="gh-card h-fit p-6 lg:sticky lg:top-24">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
                Price and duration
              </p>
              <dl className="mt-4 space-y-4">
                <div>
                  <dt className="text-sm font-semibold text-[var(--color-text-muted)]">Duration</dt>
                  <dd className="text-xl font-extrabold text-[var(--color-text-primary)]">{duration}</dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-[var(--color-text-muted)]">Starting price</dt>
                  <dd className="text-xl font-extrabold text-[var(--color-text-primary)]">{price}</dd>
                </div>
              </dl>
              <p className="mt-5 text-sm leading-6 text-[var(--color-text-muted)]">
                Final suitability is checked during intake. If symptoms suggest urgent risk, use emergency or local in-person care.
              </p>
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
