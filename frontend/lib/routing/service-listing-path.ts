/** Back-link target = the listing this service belongs to, by kind. */
export function listingPath(
  kind: string,
  country: string,
  lang: string,
  labels: { specialist: string; prescription: string; general: string },
): { href: string; label: string } {
  if (kind === "SPECIALIST") {
    return { href: `/${country}/${lang}/see-a-specialist`, label: labels.specialist };
  }
  if (kind === "PRESCRIPTION") {
    return { href: `/${country}/${lang}/prescriptions`, label: labels.prescription };
  }
  return { href: `/${country}/${lang}/gp-consultation-online`, label: labels.general };
}
