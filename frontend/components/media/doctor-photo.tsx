import type { CSSProperties } from "react";

/**
 * Doctor profile-image focal point + zoom system.
 *
 * `focalX`/`focalY` are 0-100 (percent from top-left, matching CSS
 * `object-position`). `zoom` is 1-3. All three come from the Asset row
 * (backend defaults: 50/50/1) and flow through every render site so a
 * doctor's chosen crop follows their photo everywhere it appears.
 *
 * Callers must give the image's container `overflow: hidden` — this only
 * returns positioning/scale, it never crops on its own.
 */
export function focalStyle(x = 50, y = 50, zoom = 1): CSSProperties {
  const pos = `${clampPct(x)}% ${clampPct(y)}%`;
  return {
    objectFit: "cover",
    objectPosition: pos,
    ...(zoom > 1
      ? { transform: `scale(${clampZoom(zoom)})`, transformOrigin: pos }
      : {}),
  };
}

function clampPct(n: number): number {
  return Math.min(100, Math.max(0, n));
}

function clampZoom(n: number): number {
  return Math.min(3, Math.max(1, n));
}
