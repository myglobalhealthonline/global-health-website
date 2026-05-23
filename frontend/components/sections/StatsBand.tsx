/**
 * Editorial stats band — four tabular numerics on a white surface.
 * Forest-primary values, muted labels, one-line captions.
 * White surface breaks the pattern between the dark ServiceCatalog
 * and the soft FeaturedDoctor / DoctorWall sections.
 */

export type StatBandItem = {
  value: string;
  label: string;
  caption?: string;
};

export function StatsBand({ items }: { items: StatBandItem[] }) {
  if (!items || items.length === 0) return null;
  return (
    <section
      className="bg-[var(--color-background-page)]"
      style={{ borderTop: "1px solid var(--color-border)" }}
    >
      <div className="mx-auto max-w-[var(--container-width)] px-8 md:px-16 gh-section">
        <p
          className="text-[11px] font-bold tracking-[0.2em] uppercase text-[var(--color-brand-primary)]"
        >
          The platform
        </p>
        <h2
          className="
            mt-4 max-w-[22ch]
            font-extrabold tracking-[-0.03em] leading-[1.02]
            text-[var(--color-text-primary)]
            text-[clamp(2rem,4vw+0.5rem,3.5rem)]
          "
        >
          Built for people who shouldn&apos;t have to{" "}
          <span className="text-[var(--color-brand-primary)]">wait</span>.
        </h2>

        <dl
          className="mt-16 grid gap-y-12 gap-x-8 grid-cols-2 lg:grid-cols-4"
          style={{ borderTop: "1px solid var(--color-border)", paddingTop: "clamp(40px,5vw,64px)" }}
        >
          {items.map((it) => (
            <div key={`${it.label}-${it.value}`} className="flex flex-col gap-3">
              <dt
                className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]"
              >
                {it.label}
              </dt>
              <dd
                className="
                  font-extrabold tracking-[-0.04em] leading-none
                  text-[var(--color-text-primary)]
                  [font-variant-numeric:tabular-nums]
                  text-[length:var(--text-h1)]
                "
              >
                {it.value}
              </dd>
              {it.caption ? (
                <p
                  className="text-sm max-w-[20ch] text-[var(--color-text-muted)]"
                >
                  {it.caption}
                </p>
              ) : null}
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
