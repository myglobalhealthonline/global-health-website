import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, FlaskConical, ShieldCheck } from "lucide-react";

type Item = {
  title: string;
  shortDescription: string;
  price: string;
  imageSrc: string;
  sampleType?: string | null;
  resultsTimeline?: string | null;
  href: string;
  ctaLabel: string;
};

type Props = {
  title: string;
  description: string;
  items: Item[];
};

export function HealthTestListingTemplate({ title, description, items }: Props) {
  return (
    <main className="bg-white">
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-[var(--color-background-soft)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(900px 480px at 90% -10%, rgba(176, 241, 34, 0.18), transparent 60%), radial-gradient(800px 460px at -10% 110%, rgba(27, 77, 62, 0.08), transparent 60%)",
          }}
        />
        <div className="mx-auto w-full max-w-[1240px] px-6 py-20 md:py-24 lg:px-10">
          <span className="gh-heading-eyebrow inline-flex items-center gap-2">
            <FlaskConical className="h-3.5 w-3.5" />
            Home health tests
          </span>
          <h1
            className="mt-6 max-w-3xl text-[clamp(2.25rem,5vw,4.25rem)] leading-[1.05] tracking-[-0.02em] text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            {title}
          </h1>
          {description ? (
            <p className="mt-5 max-w-2xl text-[1.05rem] leading-relaxed text-[var(--color-text-muted)] md:text-[1.15rem]">
              {description}
            </p>
          ) : null}
          <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-[13px] text-[var(--color-text-muted)]">
            <li className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--color-brand-primary)]" />
              ISO-certified labs
            </li>
            <li className="inline-flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--color-brand-primary)]" />
              Results in 24–72h
            </li>
            <li className="inline-flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-[var(--color-brand-primary)]" />
              Clinician-reviewed summaries
            </li>
          </ul>
        </div>
      </section>

      {/* GRID */}
      <section className="bg-white">
        <div className="mx-auto w-full max-w-[1240px] px-6 py-16 lg:px-10 lg:py-20">
          {items.length === 0 ? (
            <div className="mx-auto max-w-md rounded-3xl border border-[var(--color-border)] bg-[var(--color-background-soft)] p-10 text-center">
              <h2
                className="text-2xl tracking-tight text-[var(--color-text-primary)]"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                Catalogue is loading.
              </h2>
              <p className="mt-3 text-[14.5px] text-[var(--color-text-muted)]">
                Our home test menu is being verified. Check back shortly.
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((it) => (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--color-border)] bg-white transition hover:-translate-y-[2px] hover:shadow-[0_22px_50px_-22px_rgba(27,77,62,0.30)]"
                  >
                    <div className="relative aspect-[5/3] overflow-hidden bg-[var(--color-background-soft)]">
                      {it.imageSrc ? (
                        <Image
                          src={it.imageSrc}
                          alt={it.title}
                          fill
                          sizes="(min-width:1024px) 380px, (min-width:768px) 50vw, 100vw"
                          className="object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <h3 className="text-[17px] font-bold tracking-tight text-[var(--color-text-primary)]">
                        {it.title}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-[14px] leading-relaxed text-[var(--color-text-muted)]">
                        {it.shortDescription}
                      </p>
                      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[var(--color-text-muted)]">
                        {it.sampleType ? <li>{it.sampleType}</li> : null}
                        {it.resultsTimeline ? <li>{it.resultsTimeline}</li> : null}
                      </ul>
                      <div className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
                        <span
                          className="text-[1.4rem] leading-none tracking-tight text-[var(--color-brand-primary)]"
                          style={{ fontFamily: "var(--font-cormorant)" }}
                        >
                          {it.price}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--color-brand-primary)] underline-offset-4 group-hover:underline">
                          {it.ctaLabel}
                          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
