/**
 * Stats band — dark luxury version.
 * Forest-night canvas, lime tabular numerics, white/50 labels.
 * Asymmetric: eyebrow + headline left, 2×2 stat grid right.
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
      style={{
        background: "var(--color-background-dark)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "clamp(64px,8vw,112px) 0",
      }}
    >
      <div
        className="mx-auto grid items-center gap-16 px-5 md:px-10 lg:grid-cols-[1fr_1.4fr]"
        style={{ maxWidth: "var(--container-width)" }}
      >
        {/* Left — headline */}
        <div>
          <p
            className="text-[11px] font-bold tracking-[0.22em] uppercase"
            style={{ color: "var(--color-brand-accent)" }}
          >
            The platform
          </p>
          <h2
            className="mt-4 font-extrabold leading-[1.02] tracking-[-0.03em]"
            style={{
              fontSize: "clamp(2rem, 4vw + 0.5rem, 3.5rem)",
              color: "rgba(255,255,255,0.95)",
              maxWidth: "18ch",
            }}
          >
            Built for people who shouldn&apos;t have to{" "}
            <span style={{ color: "var(--color-brand-accent)" }}>wait</span>.
          </h2>
          <p
            className="mt-5 leading-relaxed"
            style={{
              fontSize: "var(--text-body-lg)",
              color: "rgba(255,255,255,0.50)",
              maxWidth: "38ch",
            }}
          >
            Same-day access to licensed clinicians. No waiting rooms,
            no referral chains, no upsells.
          </p>
        </div>

        {/* Right — 2×2 stat grid */}
        <dl
          className="grid grid-cols-2"
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "var(--radius-card)",
            overflow: "hidden",
          }}
        >
          {items.slice(0, 4).map((it, i) => (
            <div
              key={`${it.label}-${it.value}`}
              className="flex flex-col gap-2 p-7 sm:p-8"
              style={{
                borderRight: i % 2 === 0 ? "1px solid rgba(255,255,255,0.08)" : "none",
                borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.08)" : "none",
                background:
                  i === 0
                    ? "rgba(176,241,34,0.04)"
                    : "rgba(255,255,255,0.02)",
              }}
            >
              <dd
                className="font-extrabold leading-none tracking-[-0.04em] [font-variant-numeric:tabular-nums]"
                style={{
                  fontSize: "clamp(2.2rem,4.5vw,3.25rem)",
                  color: "var(--color-brand-accent)",
                }}
              >
                {it.value}
              </dd>
              <dt
                className="text-[11px] font-bold uppercase tracking-[0.18em]"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                {it.label}
              </dt>
              {it.caption ? (
                <p
                  className="text-sm leading-snug"
                  style={{ color: "rgba(255,255,255,0.28)", maxWidth: "18ch" }}
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
