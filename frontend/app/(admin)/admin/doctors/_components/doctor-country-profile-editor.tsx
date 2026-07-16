import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import {
  type AdminDoctorMarketDto,
  patchAdminDoctorMarket,
} from "@/lib/admin/admin-api";
import { SITE_CACHE_TAGS } from "@/lib/api/site-content-api";
import { AdminCard } from "../../_components/atoms";
import { CountryProfileTabs } from "./country-profile-tabs";

type Props = {
  doctorId: string;
  doctorSlug: string;
  markets: AdminDoctorMarketDto[];
};

function cleanString(value: FormDataEntryValue | null): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function keywordsFromCsv(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

/**
 * Per-country doctor profile editor for the admin Edit page. Title, bio and
 * SEO are managed by country (selector shown only for multi-country doctors)
 * and by language; registration and payout are per country. FAQs are managed
 * separately at the doctor level (see DoctorFaqsCard).
 */
export function DoctorCountryProfileEditor({ doctorId, doctorSlug, markets }: Props) {
  async function saveMarket(formData: FormData) {
    "use server";
    await requireAdminAction();
    const countryId = String(formData.get("countryId") ?? "");
    const countryCode = String(formData.get("countryCode") ?? "");
    if (!countryId) {
      redirect(
        `/admin/doctors/${doctorId}/edit?error=${encodeURIComponent(
          "Country is required for a country profile",
        )}`,
      );
    }

    const localeCodes = String(formData.get("locales") ?? "")
      .split(",")
      .map((locale) => locale.trim().toUpperCase())
      .filter(Boolean);

    const translations = localeCodes.map((locale) => ({
      locale,
      title: cleanString(formData.get(`title_${locale}`)),
      bio: cleanString(formData.get(`bio_${locale}`)),
      seoTitle: cleanString(formData.get(`seoTitle_${locale}`)),
      seoDescription: cleanString(formData.get(`seoDescription_${locale}`)),
      seoKeywords: keywordsFromCsv(formData.get(`seoKeywords_${locale}`)),
    }));

    // Payout / IBAN is doctor-owned (entered in the doctor portal). Admins
    // never submit bank details from here.
    const body = {
      active: formData.get("active") === "on",
      sortOrder: Number(formData.get("sortOrder") ?? 0),
      chamberEntity: cleanString(formData.get("chamberEntity")),
      registrationNumber: cleanString(formData.get("registrationNumber")),
      registrationUrl: cleanString(formData.get("registrationUrl")),
      division: cleanString(formData.get("division")),
      isVerified: formData.get("isVerified") === "on",
      translations,
    };

    const result = await patchAdminDoctorMarket(doctorId, countryId, body);
    if (!result.ok) {
      redirect(
        `/admin/doctors/${doctorId}/edit?error=${encodeURIComponent(result.message)}`,
      );
    }
    revalidatePath(`/admin/doctors/${doctorId}`);
    revalidatePath(`/admin/doctors/${doctorId}/edit`);
    revalidateTag(SITE_CACHE_TAGS.globalDoctors(), "max");
    if (countryCode) {
      revalidateTag(SITE_CACHE_TAGS.countryDoctors(countryCode), "max");
      revalidateTag(SITE_CACHE_TAGS.countryDoctorBySlug(countryCode, doctorSlug), "max");
    }
    redirect(
      `/admin/doctors/${doctorId}/edit?success=${encodeURIComponent(
        "Country profile saved",
      )}`,
    );
  }

  return (
    <AdminCard className="gh-admin-doctor-country-editor">
      <h3 className="m-0 [font-family:var(--font-display)] text-base font-extrabold text-[var(--color-text-primary)]">
        Country profile
      </h3>
      <p className="mb-4 mt-1 text-portal-compact text-[var(--color-text-muted)]">
        {markets.length > 1
          ? "Pick a country, then edit that country's title, bio and SEO by language, plus registration and payout. Each country saves on its own."
          : "Edit the doctor's title, bio and SEO by language, plus registration and payout."}
      </p>

      {markets.length === 0 ? (
        <p className="text-portal-compact text-[var(--color-text-muted)]">
          No country rows exist yet. Save the main profile form once to generate
          the primary country row.
        </p>
      ) : (
        <CountryProfileTabs markets={markets} saveMarket={saveMarket} />
      )}
    </AdminCard>
  );
}
