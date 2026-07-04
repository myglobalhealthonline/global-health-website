import { useId } from "react";

export type HeroPlusImageProps = {
  src: string;
  alt: string;
  className?: string;
};

/** Medical plus glyph: top arm + middle bar + bottom arm, one connected
 *  path. viewBox is 0-100 so the shape scales fluidly with its container. */
const PLUS_PATH =
  "M38 2 Q38 0 40 0 H60 Q62 0 62 2 V32 H96 Q100 32 100 36 V64 Q100 68 96 68 H62 V98 Q62 100 60 100 H40 Q38 100 38 98 V68 H4 Q0 68 0 64 V36 Q0 32 4 32 H38 Z";

/**
 * Real medical plus-shaped image mask for hero portraits. The photo is
 * clipped INSIDE the plus via an SVG clipPath (not a rectangular photo with
 * a plus icon on top). Used by DoctorsHero and PageHero's default-variant
 * hero image slot (pricing, blog, contact, about).
 */
export function HeroPlusImage({ src, alt, className }: HeroPlusImageProps) {
  const uid = useId();
  const clipId = `hero-plus-clip-${uid}`;
  const tintId = `hero-plus-tint-${uid}`;

  return (
    <svg
      viewBox="-7 -7 114 114"
      role="img"
      aria-label={alt}
      className={`gh2-plus-shadow h-full w-full ${className ?? ""}`}
    >
      <defs>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          <path d={PLUS_PATH} />
        </clipPath>
        <linearGradient id={tintId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="55%" stopColor="rgba(8,42,32,0)" />
          <stop offset="100%" stopColor="rgba(8,42,32,0.6)" />
        </linearGradient>
      </defs>

      <image
        href={src}
        x="0"
        y="0"
        width="100"
        height="100"
        preserveAspectRatio="xMidYMid slice"
        clipPath={`url(#${clipId})`}
      />
      <rect
        x="0"
        y="0"
        width="100"
        height="100"
        fill={`url(#${tintId})`}
        clipPath={`url(#${clipId})`}
      />
      {/* Double outline — outer dark-green ring + inner lime ring, gap between */}
      <path
        d={PLUS_PATH}
        transform="translate(50 50) scale(1.09) translate(-50 -50)"
        fill="none"
        stroke="rgba(8,58,42,0.85)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={PLUS_PATH}
        fill="none"
        stroke="rgba(176,241,34,0.65)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
