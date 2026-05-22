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
    <section className="bg-[var(--color-background-dark)]">
      <div className="mx-auto max-w-[var(--container-width)] px-8 md:px-16 gh-section">
        <p
          className="text-[11px] font-bold tracking-[0.2em] uppercase text-[var(--color-brand-accent)]"
        >
          The platform
        </p>
        <h2
          className="
            mt-4 max-w-[22ch]
            font-extrabold tracking-[-0.03em] leading-[1.02]
            text-white
            text-[clamp(2rem,4vw+0.5rem,3.5rem)]
          "
        >
          Built for people who shouldn&apos;t have to{" "}
          <span style={{ color: "var(--color-brand-accent)" }}>wait</span>.
        </h2>

        <dl
          className="mt-16 grid gap-y-12 gap-x-8 grid-cols-2 lg:grid-cols-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "clamp(40px,5vw,64px)" }}
        >
          {items.map((it) => (
            <div key={`${it.label}-${it.value}`} className="flex flex-col gap-3">
              <dt
                className="text-[11px] font-bold uppercase tracking-[0.14em]"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                {it.label}
              </dt>
              <dd
                className="
                  font-extrabold tracking-[-0.04em] leading-none
                  text-white
                  [font-variant-numeric:tabular-nums]
                  text-[length:var(--text-display)]
                "
              >
                {it.value}
              </dd>
              {it.caption ? (
                <p className="text-sm max-w-[20ch]" style={{ color: "rgba(255,255,255,0.38)" }}>
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
