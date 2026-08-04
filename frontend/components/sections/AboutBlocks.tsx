import type { ReactNode } from "react";
import { HeroPlusImage } from "@/components/sections/HeroPlusImage";

/**
 * Shared About-page building blocks — the plus-masked hero panel with its
 * floating glass badges, and the numbered pillar card.
 *
 * Extracted from the global `/about` page so the six country About pages
 * render the SAME design language instead of a flatter lookalike. Both pages
 * import from here; neither owns a private copy.
 */

export type AboutFloat = { icon: ReactNode; title: string; subtitle: string };

/** Fixed positions/delays — three badges, always in this order. */
const FLOAT_POSITIONS = [
  "-right-6 top-[12%] [animation-delay:0s]",
  "-right-6 top-[56%] [animation-delay:1.4s]",
  "-left-6 bottom-[5%] [animation-delay:0.7s]",
] as const;

export function AboutArchPanel({
  src,
  alt,
  floats,
}: {
  src: string;
  alt: string;
  /** Up to three badges; extras are ignored (only three positions exist). */
  floats: AboutFloat[];
}) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[600px]">
      <HeroPlusImage src={src} alt={alt} />
      {floats.slice(0, FLOAT_POSITIONS.length).map((float, i) => (
        <div
          key={float.title}
          className={`gh-glass-emerald gh-floaty absolute z-10 flex max-w-[232px] items-center gap-2.5 rounded-2xl px-3.5 py-3 ${FLOAT_POSITIONS[i]}`}
        >
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(176,241,34,0.12)] text-[var(--color-brand-accent)]">
            {float.icon}
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] font-bold leading-tight text-white">
              {float.title}
            </span>
            <span className="block text-[11.5px] leading-tight text-white/70">
              {float.subtitle}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

export function Pillar({
  icon,
  eyebrow,
  title,
  body,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <article>
      <div className="flex items-center gap-3">
        <span className="inline-flex size-10 items-center justify-center rounded-full border border-[rgba(29,75,54,0.20)] bg-[rgba(29,75,54,0.08)] text-[var(--color-brand-primary)]">
          {icon}
        </span>
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-text-muted)] [font-variant-numeric:tabular-nums]">
          {eyebrow}
        </span>
      </div>
      <h3 className="mt-5 text-xl font-extrabold tracking-[-0.015em] text-[var(--color-text-primary)]">
        {title}
      </h3>
      <p className="mt-3 max-w-[42ch] text-[length:var(--text-body)] leading-relaxed text-[var(--color-text-muted)]">
        {body}
      </p>
    </article>
  );
}
