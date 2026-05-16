/**
 * Country flag badge — renders a real SVG via the `flag-icons` package.
 *
 * Accepts either an ISO 3166-1 alpha-2 code (`ie`, `pt`, `de`, `us`, …) or
 * one of our internal country slugs (`ireland`, `portugal`, `spain`,
 * `czechia`, `romania`). The legacy slug `sp` (Spain shorthand) and `rm`
 * (Romania) are mapped to the correct ISO codes `es` and `ro`.
 *
 * Imports `flag-icons/css/flag-icons.min.css` happen once in
 * `app/layout.tsx` so this component just emits the right CSS class.
 *
 * Gradient fallback kicks in only when an unknown code is passed in —
 * prevents the badge from collapsing if admin types something weird.
 */

const SLUG_TO_ISO: Record<string, string> = {
  ireland: "ie",
  portugal: "pt",
  spain: "es",
  czechia: "cz",
  romania: "ro",
  // Legacy internal codes from the data layer.
  sp: "es",
  rm: "ro",
};

// Last-resort gradients used only when the ISO code isn't recognised by
// flag-icons (which covers every country in the world, so this almost
// never fires).
const FALLBACK_GRADIENT =
  "linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-accent))";

export function FlagBadge({
  code,
  size = 18,
}: {
  code: string;
  size?: number;
}) {
  const lower = (code ?? "").toLowerCase().trim();
  const iso = SLUG_TO_ISO[lower] ?? lower;

  // `fi` is the base class; `fi-{iso}` selects the country.
  // Setting an inline width keeps the same calling contract as the old
  // gradient version (callers pass `size`).
  const aspect = 4 / 3; // flag-icons squared = 4:3 by default

  if (!iso || iso.length !== 2 || !/^[a-z]{2}$/.test(iso)) {
    return (
      <span
        aria-hidden
        title={lower.toUpperCase()}
        style={{
          display: "inline-block",
          width: Math.round(size * aspect),
          height: size,
          borderRadius: 3,
          background: FALLBACK_GRADIENT,
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.10)",
          flex: `0 0 ${Math.round(size * aspect)}px`,
        }}
      />
    );
  }

  return (
    <span
      className={`fi fi-${iso}`}
      title={iso.toUpperCase()}
      aria-hidden
      style={{
        display: "inline-block",
        width: Math.round(size * aspect),
        height: size,
        borderRadius: 3,
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.10)",
        flex: `0 0 ${Math.round(size * aspect)}px`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    />
  );
}
