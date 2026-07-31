import "server-only";
import {
  parseLocaleTranslations,
  type LocaleFieldValue,
} from "@/lib/admin/translation-form-parse";

/** Translatable doctor fields exposed in the tabs (title is primary). */
export const DOCTOR_TRANSLATABLE_FIELDS = [
  "title",
  "bio",
  "seoTitle",
  "seoDescription",
] as const;

function numberOr(value: FormDataEntryValue | null, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Parse a money input (major units, e.g. "30.50") to integer cents, or null
 *  when blank/invalid. Used for the per-doctor cross-border price + payout. */
function moneyToCents(value: FormDataEntryValue | null): number | null {
  const s = String(value ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function parseDoctorBodyFromForm(formData: FormData, defaultLocale: string) {
  const specialtyIds = formData
    .getAll("specialtyIds")
    .map((v) => String(v).trim())
    .filter(Boolean);

  // Extra countries beyond the primary `countryId` — drives the Doctor ↔
  // Country M:N join. Empty array clears all extras. Filtered to drop the
  // primary country so the join table never tries to dupe it.
  const primaryCountryId = String(formData.get("countryId") ?? "").trim();
  const additionalCountryIds = formData
    .getAll("additionalCountryIds")
    .map((v) => String(v).trim())
    .filter((id) => id !== "" && id !== primaryCountryId);

  const languages = String(formData.get("languagesCsv") ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  const qualifications = String(formData.get("qualifications") ?? "")
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);

  // Per-locale CMS content (title/bio/SEO). Base columns are seeded from the
  // default-locale tab so the Doctor base row stays authoritative there.
  const translations: LocaleFieldValue[] = parseLocaleTranslations(
    formData,
    DOCTOR_TRANSLATABLE_FIELDS,
  );
  const base = translations.find((t) => t.locale === defaultLocale.toUpperCase());

  return {
    countryId: String(formData.get("countryId") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    fullName: String(formData.get("fullName") ?? "").trim(),
    title: base?.title ?? "",
    bio: base?.bio ?? "",
    medicalRegistrationUrl: String(formData.get("medicalRegistrationUrl") ?? "").trim(),
    qualifications,
    whatsappNumber: String(formData.get("whatsappNumber") ?? "").trim(),
    languages,
    seoTitle: base?.seoTitle ?? "",
    seoDescription: base?.seoDescription ?? "",
    specialtyIds,
    additionalCountryIds,
    translations,
    profileImagePath: String(formData.get("profileImagePath") ?? "").trim(),
    profileImageAltText: String(formData.get("profileImageAltText") ?? "").trim(),
    profileImageTitle: String(formData.get("profileImageTitle") ?? "").trim(),
    profileImageCaption: String(formData.get("profileImageCaption") ?? "").trim(),
    profileImageDescription: String(formData.get("profileImageDescription") ?? "").trim(),
    profileImageFocalX: numberOr(formData.get("profileImageFocalX"), 50),
    profileImageFocalY: numberOr(formData.get("profileImageFocalY"), 50),
    profileImageZoom: numberOr(formData.get("profileImageZoom"), 1),
    active: formData.get("active") === "on",
    canCreateManualAppointments:
      formData.get("canCreateManualAppointments") === "on",
    canRequestCrossJurisdictionRx:
      formData.get("canRequestCrossJurisdictionRx") === "on",
    trustpilotInviteEnabled: formData.get("trustpilotInviteEnabled") === "on",
    // Country-director master switch + the markets it covers. The ids are
    // DoctorCountry.countryId values; the backend scopes the write by doctorId,
    // so an id outside the doctor's own markets simply matches nothing.
    isCountryDirector: formData.get("isCountryDirector") === "on",
    directorCountryIds: formData
      .getAll("directorCountryIds")
      .map((v) => String(v).trim())
      .filter(Boolean),
    crossBorderRxEnabled: formData.get("crossBorderRxEnabled") === "on",
    // Per-country price + payout. The form renders a hidden
    // `crossBorderRxCountryId` per country row plus `crossBorderRxPrice_<id>` /
    // `crossBorderRxPayout_<id>` inputs; enumerate the ids to rebuild the array.
    crossBorderRxCountries: formData
      .getAll("crossBorderRxCountryId")
      .map(String)
      .filter(Boolean)
      .map((countryId) => ({
        countryId,
        priceCents: moneyToCents(formData.get(`crossBorderRxPrice_${countryId}`)),
        payoutCents: moneyToCents(formData.get(`crossBorderRxPayout_${countryId}`)),
      })),
  };
}
