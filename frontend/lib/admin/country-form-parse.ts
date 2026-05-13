import "server-only";

export function parseDomainsFromForm(formData: FormData): { domain: string; isPrimary?: boolean }[] | undefined {
  const domains: { domain: string; isPrimary?: boolean }[] = [];
  const d1 = String(formData.get("domainPrimary") ?? "").trim();
  const d2 = String(formData.get("domainSecondary") ?? "").trim();
  if (d1) domains.push({ domain: d1, isPrimary: true });
  if (d2) domains.push({ domain: d2, isPrimary: false });
  return domains.length ? domains : undefined;
}

export function parseSupportedLocales(formData: FormData): string[] {
  return formData.getAll("supportedLocales").map(String);
}
