import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { BookingCTA } from "@/components/sections/BookingCTA";

type ExtraSection = {
  heading: string;
  body: string;
};

type Props = {
  title: string;
  price: string;
  imageSrc: string;
  shortDescription?: string | null;
  detailIntro?: string | null;
  sampleType?: string | null;
  resultsTimeline?: string | null;
  whatThisTestCovers: string[];
  whyGetTested: string[];
  extraSections?: ExtraSection[] | null;
  galleryImagePaths?: string[];
  ctaLabel: string;
};

export function HealthTestDetailTemplate({
  title,
  price,
  imageSrc,
  shortDescription,
  detailIntro,
  sampleType,
  resultsTimeline,
  whatThisTestCovers,
  whyGetTested,
  extraSections,
  galleryImagePaths = [],
  ctaLabel,
}: Props) {
  return (
    <>
      <Section variant="white" pattern="soft">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[420px_1fr]">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageSrc} alt={title} className="w-full object-contain" />
              {galleryImagePaths.length > 0 ? (
                <div className="mt-4 grid grid-cols-4 gap-3">
                  {galleryImagePaths.map((path) => (
                    <div key={path} className="rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-white p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={path} alt="" className="h-16 w-full object-contain" />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div>
              <h1 className="gh-h1 text-[var(--color-brand-primary)]">{title}</h1>
              <p className="mt-4 text-4xl font-black text-[var(--color-text-primary)]">{price}</p>
              {shortDescription ? <p className="mt-6 text-xl leading-relaxed text-[var(--color-text-muted)]">{shortDescription}</p> : null}
              {detailIntro ? <p className="mt-6 whitespace-pre-line text-lg leading-relaxed text-[var(--color-text-muted)]">{detailIntro}</p> : null}
              {sampleType ? <p className="mt-8 text-2xl font-semibold text-[var(--color-text-primary)]">{sampleType}</p> : null}
              {resultsTimeline ? <p className="mt-3 text-lg leading-relaxed text-[var(--color-text-muted)]">{resultsTimeline}</p> : null}
              <Link href="/book-online" className="gh-btn gh-btn-primary mt-8 inline-flex min-w-[240px] justify-center">
                {ctaLabel}
              </Link>

              {whatThisTestCovers.length > 0 ? (
                <div className="mt-10">
                  <h2 className="gh-h3 text-[var(--color-text-primary)]">What this test covers</h2>
                  <ul className="mt-4 space-y-4 text-lg leading-relaxed text-[var(--color-text-muted)]">
                    {whatThisTestCovers.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              ) : null}

              {whyGetTested.length > 0 ? (
                <div className="mt-10">
                  <h2 className="gh-h3 text-[var(--color-text-primary)]">Why get tested</h2>
                  <ul className="mt-4 space-y-4 text-lg leading-relaxed text-[var(--color-text-muted)]">
                    {whyGetTested.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              ) : null}

              {extraSections?.map((section) => (
                <div key={section.heading} className="mt-10">
                  <h2 className="gh-h3 text-[var(--color-text-primary)]">{section.heading}</h2>
                  <p className="mt-4 whitespace-pre-line text-lg leading-relaxed text-[var(--color-text-muted)]">{section.body}</p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      <BookingCTA
        variant="compact"
        eyebrow="Start Your Online Consultation"
        title="Choose your country and connect with a licensed doctor in minutes"
        description="100% online, no waiting rooms, confidential."
        ctaLabel="Start Consultation"
        ctaHref="/general-consultation-ie"
      />
    </>
  );
}
