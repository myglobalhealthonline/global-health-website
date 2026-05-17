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

/**
 * Pull the four `bookingSetting.*` form fields into the nested object
 * shape the backend expects. We only include keys that were actually in
 * the form — empty/missing keys leave the existing row untouched. Form
 * inputs MUST be named with the `bookingSetting.` prefix.
 */
export function parseBookingSettingFromForm(formData: FormData):
  | {
      bookingEnabled?: boolean;
      requirePhone?: boolean;
      requireDateOfBirth?: boolean;
      timezone?: string;
    }
  | undefined {
  // `bookingEnabled` checkbox: present + "on" → true. Absent (unchecked
  // or no input at all) → we don't know if the form rendered it. Use a
  // sentinel input we render alongside each checkbox to disambiguate.
  // For now, treat presence of EITHER the checkbox value OR the sentinel
  // as "the form rendered this section" — checkbox absent means false.
  const has =
    formData.has("bookingSetting.bookingEnabled") ||
    formData.has("bookingSetting.requirePhone") ||
    formData.has("bookingSetting.requireDateOfBirth") ||
    formData.has("bookingSetting.timezone");
  if (!has) return undefined;

  const timezoneRaw = String(formData.get("bookingSetting.timezone") ?? "").trim();
  return {
    bookingEnabled: formData.get("bookingSetting.bookingEnabled") === "on",
    requirePhone: formData.get("bookingSetting.requirePhone") === "on",
    requireDateOfBirth: formData.get("bookingSetting.requireDateOfBirth") === "on",
    ...(timezoneRaw !== "" ? { timezone: timezoneRaw } : {}),
  };
}
