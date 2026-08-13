/**
 * The heading every booking-wizard step shares. Lifted out of `page.tsx` when
 * the benefit step arrived as its own component — a second copy would have
 * drifted the moment one of them was restyled.
 */
export function BookingSectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-brand-primary)]">
        {eyebrow}
      </p>
      <h2 className="mt-2 max-w-[18ch] text-[clamp(2rem,4vw,3.2rem)] font-extrabold leading-[1.02] tracking-[-0.035em] text-[var(--color-text-primary)]">
        {title}
      </h2>
      <p className="mt-3 max-w-[58ch] text-[length:var(--text-body)] leading-relaxed text-[var(--color-text-muted)]">
        {description}
      </p>
    </header>
  );
}
