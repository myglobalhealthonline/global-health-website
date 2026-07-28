/**
 * Pure helpers for the patient-identity + address blocks on generated
 * PDFs. Lives in its own module so unit tests can import them without
 * pulling in the whole service (which transitively imports Prisma +
 * the env validator).
 */

/**
 * Pick the right ID label for the country and use whichever ID the
 * patient has on file. Falls back through tax → national → passport so
 * the most-relevant value lands on the document. Returns null when no
 * IDs are stored.
 */
export function buildPatientIdLine(
  countryCode: string,
  profile: {
    nationalIdNumber: string | null;
    taxIdNumber: string | null;
    passportNumber: string | null;
  } | null,
): string | null {
  if (!profile) return null;
  const upper = countryCode.toUpperCase();
  // Country-specific tax ID labels for the line that goes on Rx.
  const taxLabel =
    {
      PT: "NIF",
      BR: "CPF",
      IE: "PPS",
      ES: "DNI",
      SP: "DNI",
      CZ: "Rodné číslo",
      RM: "CNP",
      RO: "CNP",
    }[upper] ?? "Tax ID";
  if (profile.taxIdNumber) {
    return `${taxLabel}: ${profile.taxIdNumber}`;
  }
  if (profile.nationalIdNumber) {
    const nationalLabel =
      {
        PT: "Cartão de Cidadão",
        BR: "RG",
        ES: "DNI",
        SP: "DNI",
        CZ: "Občanský průkaz",
        RM: "CI",
        RO: "CI",
      }[upper] ?? "National ID";
    return `${nationalLabel}: ${profile.nationalIdNumber}`;
  }
  if (profile.passportNumber) {
    return `Passport: ${profile.passportNumber}`;
  }
  return null;
}

export function buildAddressLines(profile: {
  addressLine1: string | null;
  addressLine2: string | null;
  addressCity: string | null;
  addressState?: string | null;
  addressPostalCode: string | null;
  addressCountryCode: string | null;
}): string[] {
  const out: string[] = [];
  if (profile.addressLine1) out.push(profile.addressLine1);
  if (profile.addressLine2) out.push(profile.addressLine2);
  // "1000-001 Lisboa" everywhere; Brazil adds the UF — "01310-100 São Paulo — SP".
  const cityLine = [profile.addressPostalCode, profile.addressCity]
    .filter(Boolean)
    .join(" ");
  const cityStateLine = [cityLine, profile.addressState].filter(Boolean).join(" — ");
  if (cityStateLine) out.push(cityStateLine);
  if (profile.addressCountryCode) out.push(profile.addressCountryCode);
  return out;
}
