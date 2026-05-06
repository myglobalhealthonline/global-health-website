import "server-only";

export function parseDoctorBodyFromForm(formData: FormData) {
  const specialtyIds = formData
    .getAll("specialtyIds")
    .map((v) => String(v).trim())
    .filter(Boolean);

  const languages = String(formData.get("languagesCsv") ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  return {
    countryId: String(formData.get("countryId") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    fullName: String(formData.get("fullName") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    bio: String(formData.get("bio") ?? "").trim(),
    imcRegistration: String(formData.get("imcRegistration") ?? "").trim(),
    whatsappNumber: String(formData.get("whatsappNumber") ?? "").trim(),
    languages,
    specialtyIds,
    profileImagePath: String(formData.get("profileImagePath") ?? "").trim(),
    active: formData.get("active") === "on",
  };
}
