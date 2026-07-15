/**
 * Lime accent seam rendered at a section's top/bottom edge, replacing a
 * hard edge-to-edge border: a faint hairline runs the full width with a
 * short, brighter glowing segment centered — the section boundary reads
 * as a deliberate accent instead of a flat cut.
 *
 * Must be the first child inside a `.gh-medical-pattern` section — the
 * `gh-medical-pattern-layer` class is what that system uses to exempt a
 * decorative child from its `> *:not(...)` z-index/position takeover, and
 * an actual element (not `::before`) avoids colliding with the pattern's
 * own `::before` texture on the same node.
 */
export function SectionSeam({
  position = "top",
}: {
  position?: "top" | "bottom";
  /** Kept for call-site compatibility; every seam is lime now regardless of section theme. */
  theme?: "light" | "dark";
}) {
  const rgb = "176,241,34";
  return (
    <div aria-hidden className="gh-medical-pattern-layer absolute inset-x-0" style={{ [position]: 0, height: 1 }}>
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(90deg, transparent, rgba(${rgb},0.35) 50%, transparent)` }}
      />
      <div
        className="absolute left-1/2 top-1/2 w-1/3 max-w-[220px] -translate-x-1/2 -translate-y-1/2"
        style={{
          height: 2,
          background: `linear-gradient(90deg, transparent, rgba(${rgb},0.85) 50%, transparent)`,
          filter: "blur(0.5px)",
        }}
      />
    </div>
  );
}
