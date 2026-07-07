import { useId } from "react";
import Image from "next/image";

export type HeroPlusImageProps = {
  src: string;
  alt: string;
  className?: string;
};

/** Medical plus glyph: top arm + middle bar + bottom arm, one connected
 *  path. viewBox is 0-100 so the shape scales fluidly with its container.
 *  Vertical and horizontal arms share the same 36-unit thickness (32-68)
 *  so the plus reads as a true, evenly-weighted medical cross. */
const PLUS_PATH =
  "M32 2 Q32 0 34 0 H66 Q68 0 68 2 V32 H96 Q100 32 100 36 V64 Q100 68 96 68 H68 V98 Q68 100 66 100 H34 Q32 100 32 98 V68 H4 Q0 68 0 64 V36 Q0 32 4 32 H32 Z";

/**
 * Real medical plus-shaped image mask for hero portraits. The photo is a
 * Next.js <Image> (AVIF/WebP + responsive srcset + priority LCP loading),
 * clipped INSIDE the plus via `clip-path: url(#id)` referencing an SVG
 * clipPath that reuses the exact same PLUS_PATH the outline strokes draw —
 * so the clip and the ring never drift apart. Used by DoctorsHero and
 * PageHero's default-variant hero image slot (pricing, blog, contact, about).
 */
export function HeroPlusImage({ src, alt, className }: HeroPlusImageProps) {
  const uid = useId();
  const clipId = `hero-plus-clip-${uid}`;

  return (
    <div className={`gh2-plus-shadow relative h-full w-full ${className ?? ""}`}>
      {/* 0x0 defs-only SVG: supplies the clipPath used below via url(#id).
          objectBoundingBox + scale(0.01) maps PLUS_PATH's 0-100 coordinate
          space onto the 0-1 bounding-box space CSS clip-path needs, so an
          HTML element of any size can reuse the same path the SVG outline
          below draws — clip and ring can never drift apart. */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <clipPath id={clipId} clipPathUnits="objectBoundingBox" transform="scale(0.01 0.01)">
            <path d={PLUS_PATH} />
          </clipPath>
        </defs>
      </svg>

      {/* Photo, clipped to the plus. Sits inside a 100/114 (≈87.7%) inset
          box centered in the component so it lines up with the -7..107
          viewBox margin the outline ring below is drawn in. */}
      <div
        className="absolute overflow-hidden"
        style={{ inset: "6.14%", clipPath: `url(#${clipId})` }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          priority
          fetchPriority="high"
          sizes="(min-width: 1024px) 620px, 100vw"
          className="object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(8,42,32,0) 55%, rgba(8,42,32,0.6) 100%)",
          }}
        />
      </div>

      <svg
        viewBox="-7 -7 114 114"
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
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
    </div>
  );
}
