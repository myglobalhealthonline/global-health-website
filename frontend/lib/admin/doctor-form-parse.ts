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
    active: formData.get("active") === "on",
    canCreateManualAppointments:
      formData.get("canCreateManualAppointments") === "on",
  };
}
