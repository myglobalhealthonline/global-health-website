/**
 * Editorial stats band — four tabular numerics displayed at huge sizes
 * with a thin italic Cormorant caption above each. The numbers ARE the
 * visual, no icon shelf needed.
 *
 * Caller passes the live numbers. No defaults — if data is empty the
 * section renders null so the page doesn't have placeholder stats.
 */

export type StatBandItem = {
  value: string;
  label: string;
  caption?: string;
};

export function StatsBand({ items }: { items: StatBandItem[] }) {
  if (!items || items.length === 0) return null;
  return (
    <section className="bg-[var(--color-background-page)]">
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10 gh-section">
        <p
          className="gh-eyebrow text-[var(--color-brand-primary)]"
          style={{ letterSpacing: "0.18em" }}
        >
          The platform
        </p>
        <h2
          className="
            mt-3 max-w-[20ch]
            font-semibold tracking-[-0.025em] leading-[1.05]
            text-[var(--color-text-primary)]
            text-[clamp(2rem,4vw+0.5rem,3.5rem)]
          "
        >
          Built for people who shouldn't have to{" "}
          <span
            className="italic font-normal text-[var(--color-brand-primary)]"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            wait
          </span>
          .
        </h2>

        <dl
          className="
            mt-14 grid gap-y-12 gap-x-8
            grid-cols-2 lg:grid-cols-4
          "
        >
          {items.map((it) => (
            <div key={`${it.label}-${it.value}`} className="flex flex-col gap-2">
              <dt
                className="
                  italic font-normal text-base text-[var(--color-text-muted)]
                  border-b border-[var(--color-border)] pb-3
                "
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                {it.label}
              </dt>
              <dd
                className="
                  pt-1
                  font-semibold tracking-[-0.035em] leading-none
                  text-[var(--color-text-primary)]
                  [font-variant-numeric:tabular-nums]
                  text-[clamp(3.25rem,7vw,7rem)]
                "
              >
                {it.value}
              </dd>
              {it.caption ? (
                <p className="text-sm text-[var(--color-text-muted)] max-w-[20ch]">
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
