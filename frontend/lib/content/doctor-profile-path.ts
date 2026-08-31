/** Public doctor profile route for localized internal links. */
export function buildDoctorProfilePath(
  countrySlug: string | null | undefined,
  locale: string,
  doctorSlug: string,
): string | null {
  if (!countrySlug) return null;
  return `/${countrySlug}/${locale.toLowerCase()}/doctors/${doctorSlug}`;
}
