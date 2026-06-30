/**
 * Country flag badge — renders a real SVG via the `flag-icons` package.
 *
 * Accepts either an ISO 3166-1 alpha-2 code (`ie`, `br`, `mt`, …) or one
 * of our internal country slugs (`ireland`, `brazil`, `malta`, …). The
 * legacy slugs `sp` (Spain) and `rm` (Romania) are mapped to the correct
 * ISO codes `es` and `ro`.
 *
 * `flag-icons` covers every ISO 3166-1 country, so as long as we resolve
 * to a real 2-letter ISO code the flag renders. The `NAME_TO_ISO` table
 * lets admin-defined country rows that store the English name as a slug
 * (`brazil`, `malta`, `germany`, …) still resolve. Anything unknown
 * falls back to the brand gradient.
 *
 * `flag-icons/css/flag-icons.min.css` is imported once in
 * `app/layout.tsx`, so this component just emits the right CSS class.
 */

// Lowercased English country name → ISO 3166-1 alpha-2. Covers the
// countries admins are likely to add without a code release. Extend
// this when a new market needs flag support.
const NAME_TO_ISO: Record<string, string> = {
  // Seeded markets (legacy slug forms)
  ireland: "ie",
  portugal: "pt",
  spain: "es",
  czechia: "cz",
  "czech-republic": "cz",
  romania: "ro",
  // Legacy internal short codes from the data layer.
  sp: "es",
  rm: "ro",

  // Common admin-added markets — alphabetical.
  argentina: "ar",
  australia: "au",
  austria: "at",
  belgium: "be",
  brazil: "br",
  bulgaria: "bg",
  canada: "ca",
  chile: "cl",
  china: "cn",
  colombia: "co",
  croatia: "hr",
  cyprus: "cy",
  denmark: "dk",
  egypt: "eg",
  estonia: "ee",
  finland: "fi",
  france: "fr",
  germany: "de",
  greece: "gr",
  hungary: "hu",
  iceland: "is",
  india: "in",
  indonesia: "id",
  italy: "it",
  japan: "jp",
  latvia: "lv",
  lithuania: "lt",
  luxembourg: "lu",
  malta: "mt",
  mexico: "mx",
  morocco: "ma",
  netherlands: "nl",
  "new-zealand": "nz",
  norway: "no",
  pakistan: "pk",
  philippines: "ph",
  poland: "pl",
  qatar: "qa",
  "saudi-arabia": "sa",
  serbia: "rs",
  singapore: "sg",
  slovakia: "sk",
  slovenia: "si",
  "south-africa": "za",
  "south-korea": "kr",
  sweden: "se",
  switzerland: "ch",
  thailand: "th",
  turkey: "tr",
  uae: "ae",
  "united-arab-emirates": "ae",
  ukraine: "ua",
  uk: "gb",
  "united-kingdom": "gb",
  usa: "us",
  "united-states": "us",
  vietnam: "vn",
};

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
  // Resolve in order: explicit name map → already-ISO short code.
  const iso = NAME_TO_ISO[lower] ?? lower;

  // flag-icons squared = 4:3.
  const aspect = 4 / 3;

  if (!iso || iso.length !== 2 || !/^[a-z]{2}$/.test(iso)) {
    return (
      <span
        aria-hidden
        title={lower.toUpperCase()}
        className="gh-flag-badge gh-flag-badge--fallback"
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
      className={`gh-flag-badge fi fi-${iso}`}
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
