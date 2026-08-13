import type { ReactNode } from "react";
import { HeroPlusImage } from "@/components/sections/HeroPlusImage";

export type ContactFloat = {
  /** Small glyph, or `null` for the pinging status dot used by the first card. */
  icon: ReactNode | null;
  title: string;
  subtitle: string;
};

/**
 * Hero right-hand panel: the arch image plus up to three floating glass
 * badges. Extracted from `app/(global)/contact/page.tsx` so the per-country
 * contact pages render the same hero furniture instead of a bare column —
 * the country pages shipped without it and lost the image and the badges.
 *
 * Positions are fixed (right-top, right-middle, left-bottom) and the
 * animation delays are staggered, matching the original markup exactly.
 */
export function ContactArchPanel({
  src = "/images/stock/contact.jpg",
  alt,
  floats,
}: {
  src?: string;
  alt: string;
  floats: ContactFloat[];
}) {
  const positions = [
    { className: "-right-6 top-[12%]", delay: "0s" },
    { className: "-right-6 top-[56%]", delay: "1.4s" },
    { className: "-left-6 bottom-[5%]", delay: "0.7s" },
  ];

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[600px]">
      <HeroPlusImage src={src} alt={alt} />

      {floats.slice(0, positions.length).map((float, i) => (
        <div
          key={float.title}
          className={`gh-glass-emerald gh-floaty absolute ${positions[i].className} z-10 flex items-center gap-2.5 rounded-2xl px-3.5 py-3`}
          style={{ maxWidth: 232, animationDelay: positions[i].delay }}
        >
          {float.icon === null ? (
            <span className="relative flex size-2.5 shrink-0">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--color-brand-accent)] opacity-60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-[var(--color-brand-accent)]" />
            </span>
          ) : (
            <span
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-[var(--color-brand-accent)]"
              style={{ background: "rgba(176,241,34,0.12)" }}
            >
              {float.icon}
            </span>
          )}
          <span className="min-w-0">
            <span className="block text-[13px] font-bold leading-tight text-white">
              {float.title}
            </span>
            <span className="block text-[11.5px] leading-tight text-white/55">
              {float.subtitle}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
