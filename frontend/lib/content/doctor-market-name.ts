import type { CountryCode } from "@/data/countries";

/**
 * Per-market display name for the handful of clinicians listed in more than
 * one country.
 *
 * `Doctor.fullName` is a single global column while `seoTitle` is per-market
 * (`DoctorMarketTranslation`). A cross-listed doctor therefore contradicts
 * itself on its own page: the `<title>` comes from the market row, while the
 * H1, `og:title`, Physician-schema `name` and roster card all come from the
 * global name. Measured live 2026-08-20:
 *
 *   /ireland/en/doctors/khoiamul-islam  title "Dr Khoiamul Islam …"
 *                                       H1/og/schema "MUDr. Khoiamul Islam"
 *   /czechia/cs/doctors/dr-ahmed-maklad title "MUDr. Ahmed Maklad …"
 *                                       H1/og/schema "Dr Ahmed Maklad"
 *
 * The honorific is market convention, not a typo: "MUDr." is the expected
 * form for a Czech-qualified doctor on a Czech page (and a trust signal in
 * Czech SERPs), and reads as foreign on an Irish one. So the fix is to make
 * the name market-scoped, not to pick one honorific globally.
 *
 * Exactly three doctors are cross-listed sitewide — `khoiamul-islam` and
 * `dr-ahmed-maklad` (Czechia + Ireland) and `dr-tiago-miguel-figueira`
 * (Ireland + Portugal, already consistent) — verified against sitemap.xml on
 * 2026-08-20. That is a table, not a schema change.
 *
 * ponytail: hardcoded map. Promote to a nullable
 * `DoctorMarketTranslation.displayName` column plus an admin field if the
 * list outgrows a handful, or as soon as a non-engineer needs to edit it.
 */
const MARKET_DISPLAY_NAME: Readonly<Record<string, string>> = {
  "khoiamul-islam|ie": "Dr Khoiamul Islam",
  "khoiamul-islam|cz": "MUDr. Khoiamul Islam",
  "dr-ahmed-maklad|cz": "MUDr. Ahmed Maklad",
};

/**
 * The name to show for `doctorSlug` on `countryCode`'s pages. Falls back to
 * the global `fullName` for every doctor without an entry, and whenever the
 * route did not resolve a market (legacy/global paths), so single-market
 * doctors are untouched.
 */
export function marketDisplayName(
  doctorSlug: string,
  countryCode: CountryCode | string | undefined | null,
  fullName: string,
): string {
  if (!countryCode) return fullName;
  return (
    MARKET_DISPLAY_NAME[`${doctorSlug.toLowerCase()}|${countryCode.toLowerCase()}`] ?? fullName
  );
}
