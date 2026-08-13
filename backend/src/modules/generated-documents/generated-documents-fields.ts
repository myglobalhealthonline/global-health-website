/**
 * Pure helpers for the patient-identity + address blocks on generated
 * PDFs. Lives in its own module so unit tests can import them without
 * pulling in the whole service (which transitively imports Prisma +
 * the env validator).
 */

/**
 * Country-specific label for the health / tax identifier a prescription
 * carries (PPS in IE, NIF in PT, CPF in BR, ...). Exported so the
 * cross-border consent form can ask the patient for the right one.
 */
export function patientTaxIdLabel(countryCode: string): string {
  return (
    {
      PT: "NIF",
      BR: "CPF",
      IE: "PPS",
      ES: "DNI",
      SP: "DNI",
      CZ: "Rodné číslo",
      RM: "CNP",
      RO: "CNP",
    }[countryCode.toUpperCase()] ?? "Tax ID"
  );
}

/**
 * Pick the right ID label for the country and use whichever ID the
 * patient has on file. Falls back through tax → national → passport so
 * the most-relevant value lands on the document. Returns null when no
 * IDs are stored.
 *
 * `healthIdNumber` is the identifier captured FOR the issuing country
 * (cross-border Rx asks the patient for it at the payment step). When it
 * is present it always wins — it is the only value guaranteed to belong
 * to `countryCode`.
 *
 * Without it, the chart IDs are only used when they plausibly belong to
 * the issuing country: a profile whose address country differs from the
 * document country prints NO id line at all. Printing a Brazilian CPF
 * under the label "PPS" on an Irish prescription is worse than printing
 * nothing.
 */
export function buildPatientIdLine(
  countryCode: string,
  profile: {
    nationalIdNumber: string | null;
    taxIdNumber: string | null;
    passportNumber: string | null;
    addressCountryCode?: string | null;
  } | null,
  healthIdNumber?: string | null,
): string | null {
  const upper = countryCode.toUpperCase();
  const taxLabel = patientTaxIdLabel(upper);
  if (healthIdNumber && healthIdNumber.trim()) {
    return `${taxLabel}: ${healthIdNumber.trim()}`;
  }
  if (!profile) return null;
  // Foreign chart IDs never get a local label — see the doc comment.
  // `SP`/`RM` are legacy aliases of ES/RO in our country table.
  const alias = (c: string) => ({ SP: "ES", RM: "RO" })[c] ?? c;
  const profileCountry = profile.addressCountryCode?.trim().toUpperCase();
  if (profileCountry && alias(profileCountry) !== alias(upper)) return null;
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
