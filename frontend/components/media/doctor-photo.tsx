import type { CSSProperties } from "react";
import { User } from "lucide-react";

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

/**
 * Generic silhouette placeholder shown in doctor portrait tiles when no
 * photo is uploaded (replaces the old initials-letter tile).
 */
export function DoctorAvatarFallback({ iconSize = "34%" }: { iconSize?: string }) {
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{
        background:
          "radial-gradient(120% 90% at 20% 0%, rgba(176,241,34,0.14), transparent 55%), linear-gradient(160deg, #1D4B36 0%, #0F2E25 100%)",
      }}
      aria-hidden
    >
      <User style={{ width: iconSize, height: iconSize, color: "rgba(255,255,255,0.45)" }} strokeWidth={1.4} />
    </div>
  );
}

function clampPct(n: number): number {
  return Math.min(100, Math.max(0, n));
}

function clampZoom(n: number): number {
  return Math.min(3, Math.max(1, n));
}
