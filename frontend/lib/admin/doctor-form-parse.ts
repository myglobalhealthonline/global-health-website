import "server-only";

export function parseDoctorBodyFromForm(formData: FormData) {
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

  return {
    countryId: String(formData.get("countryId") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    fullName: String(formData.get("fullName") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    bio: String(formData.get("bio") ?? "").trim(),
    imcRegistration: String(formData.get("imcRegistration") ?? "").trim(),
    medicalRegistrationUrl: String(formData.get("medicalRegistrationUrl") ?? "").trim(),
    qualifications,
    whatsappNumber: String(formData.get("whatsappNumber") ?? "").trim(),
    languages,
    seoTitle: String(formData.get("seoTitle") ?? "").trim(),
    seoDescription: String(formData.get("seoDescription") ?? "").trim(),
    specialtyIds,
    additionalCountryIds,
    profileImagePath: String(formData.get("profileImagePath") ?? "").trim(),
    active: formData.get("active") === "on",
  };
}
