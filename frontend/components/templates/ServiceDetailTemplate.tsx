import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
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
  const cleanBody = bodyHtml ? sanitizeServiceDetailHtml(bodyHtml) : null;

  return (
    <main className="bg-[var(--color-background-page)]">
      {/* HERO */}
      <section className="gh-section-sm bg-[var(--color-background-soft)]">
        <div className="gh-container">
          <div className="grid items-start gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-20">
            <div>
              <span className="gh-heading-eyebrow">Consultation</span>
              <h1
                className="gh-display mt-6 text-[clamp(2.25rem,5vw,4.5rem)]"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                {title}
              </h1>
              {description ? (
                <p className="mt-8 max-w-[620px] text-[1.05rem] leading-[1.7] text-[var(--color-text-body)] md:text-[1.2rem]">
                  {description}
                </p>
              ) : null}

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link href={bookingHref} className="gh-btn gh-btn-primary">
                  {bookingLabel}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <span className="text-[13px] text-[var(--color-text-muted)]">
                  Same-day slots typically available
                </span>
              </div>

              {keyFacts.length > 0 ? (
                <dl className="mt-14 grid max-w-[560px] grid-cols-2 gap-x-10 gap-y-8 border-t border-[var(--color-border)] pt-10">
                  {keyFacts.map((fact) => (
                    <div key={fact.label}>
                      <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                        {fact.label}
                      </dt>
                      <dd
                        className="mt-3 text-[1.85rem] leading-none tracking-[-0.015em] text-[var(--color-text-primary)]"
                        style={{ fontFamily: "var(--font-cormorant)" }}
                      >
                        {fact.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>

            {imageSrc ? (
              <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-background-panel)]">
                <Image
                  src={imageSrc}
                  alt={title}
                  fill
                  sizes="(min-width:1024px) 500px, 100vw"
                  priority
                  className="object-cover"
                />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* BODY */}
      <section className="gh-section bg-[var(--color-background-page)]">
        <div className="gh-container grid gap-16 lg:grid-cols-[1.6fr_1fr] lg:gap-24">
          <article>
            <span className="gh-heading-eyebrow">What to expect</span>
            <h2
              className="gh-display mt-5 text-[clamp(1.85rem,3.5vw,2.75rem)]"
              style={{ fontFamily: "var(--font-cormorant)" }}
            >
              The consultation, in plain language.
            </h2>
            {cleanBody ? (
              <div
                className="mt-10 text-[16px] leading-[1.9] text-[var(--color-text-body)] [&_h2]:mt-12 [&_h2]:font-medium [&_h2]:tracking-[-0.01em] [&_h2]:text-[1.75rem] [&_h2]:text-[var(--color-text-primary)] [&_h3]:mt-10 [&_h3]:text-[1.25rem] [&_h3]:font-medium [&_h3]:text-[var(--color-text-primary)] [&_p]:mt-5 [&_p:first-child]:mt-0 [&_ul]:mt-5 [&_ul]:list-disc [&_ul]:pl-6 [&_a]:text-[var(--color-brand-primary)] [&_a]:underline [&_a]:underline-offset-2 [&_h2]:[font-family:var(--font-cormorant)]"
                dangerouslySetInnerHTML={{ __html: cleanBody }}
              />
            ) : (
              <div className="mt-10 space-y-6 text-[16px] leading-[1.9] text-[var(--color-text-body)]">
                {body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            )}
          </article>

          {/* Sticky booking sidebar */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[var(--radius-card)] bg-[var(--color-brand-primary)] p-8 text-white md:p-10">
              <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--color-brand-accent)]">
                Ready when you are
              </span>
              <h3
                className="gh-display mt-5 text-[1.85rem] text-white"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                Book this consultation.
              </h3>
              <p className="mt-4 text-[14.5px] leading-[1.7] text-white/75">
                Confirm in under a minute — most patients are seen the same day.
              </p>
              <Link
                href={bookingHref}
                className="gh-btn gh-btn-accent mt-8 w-full justify-center"
              >
                {bookingLabel}
                <ArrowUpRight className="h-4 w-4" />
              </Link>

              {keyFacts.length > 0 ? (
                <dl className="mt-10 space-y-4 border-t border-white/10 pt-6">
                  {keyFacts.map((f) => (
                    <div key={f.label} className="flex items-center justify-between gap-3 text-[13px]">
                      <dt className="uppercase tracking-[0.14em] text-white/55">
                        {f.label}
                      </dt>
                      <dd className="font-medium text-white">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
          </aside>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="gh-section-sm border-t border-[var(--color-border)] bg-[var(--color-background-soft)]">
        <div className="gh-container">
          <div className="grid items-end gap-10 lg:grid-cols-[1.6fr_1fr]">
            <h2
              className="gh-display text-[clamp(2rem,4.5vw,3.5rem)]"
              style={{ fontFamily: "var(--font-cormorant)" }}
            >
              Get answers <span className="gh-display-em">today.</span>
            </h2>
            <Link href={bookingHref} className="gh-btn gh-btn-primary lg:justify-self-end">
              {bookingLabel}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
