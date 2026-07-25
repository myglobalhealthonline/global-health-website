import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { type AdminDoctorFaqsDto, putAdminDoctorFaqs } from "@/lib/admin/admin-api";
import { SITE_CACHE_TAGS } from "@/lib/api/site-content-api";
import { AdminCard } from "../../_components/atoms";
import { FAQ_SLOTS, FaqLanguageTabs } from "./faq-language-tabs";

type Props = {
  doctorId: string;
  doctorSlug: string;
  countryCodes: string[];
  data: AdminDoctorFaqsDto;
};

function cleanString(value: FormDataEntryValue | null): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Doctor-level FAQ card (Preview/detail page). One FAQ set per doctor, edited
 * by language, shown on every country's public profile.
 */
export function DoctorFaqsCard({ doctorId, doctorSlug, countryCodes, data }: Props) {
  async function saveFaqs(formData: FormData) {
    "use server";
    await requireAdminAction();

    const localeCodes = String(formData.get("locales") ?? "")
      .split(",")
      .map((locale) => locale.trim().toUpperCase())
      .filter(Boolean);

    const faqs = localeCodes.flatMap((locale) => {
      const rows: Array<{
        locale: string;
        question: string;
        answer: string;
        category: string | null;
        sortOrder: number;
        isActive: boolean;
      }> = [];
      for (let index = 0; index < FAQ_SLOTS; index += 1) {
        const question = cleanString(formData.get(`faq_${locale}_${index}_question`));
        const answer = cleanString(formData.get(`faq_${locale}_${index}_answer`));
        if (!question || !answer) continue;
        rows.push({
          locale,
          question,
          answer,
          category: cleanString(formData.get(`faq_${locale}_${index}_category`)),
          sortOrder: Number(formData.get(`faq_${locale}_${index}_sortOrder`) ?? index),
          isActive: formData.get(`faq_${locale}_${index}_isActive`) === "on",
        });
      }
      return rows;
    });

    const result = await putAdminDoctorFaqs(doctorId, faqs);
    if (!result.ok) {
      redirect(`/admin/doctors/${doctorId}?error=${encodeURIComponent(result.message)}`);
    }
    revalidatePath(`/admin/doctors/${doctorId}`);
    revalidateTag(SITE_CACHE_TAGS.globalDoctors(), "max");
    for (const code of countryCodes) {
      revalidateTag(SITE_CACHE_TAGS.countryDoctors(code), "max");
      revalidateTag(SITE_CACHE_TAGS.countryDoctorBySlug(code, doctorSlug), "max");
    }
    redirect(`/admin/doctors/${doctorId}?success=${encodeURIComponent("FAQs saved")}`);
  }

  return (
    <AdminCard className="gh-admin-doctor-faqs-card">
      <h3 className="m-0 [font-family:var(--font-display)] text-base font-extrabold text-[var(--color-text-primary)]">
        FAQs
      </h3>
      <p className="mb-4 mt-1 text-portal-compact text-[var(--color-text-muted)]">
        One FAQ set per doctor, edited by language and shown on every country
        profile. Admin-managed.
      </p>
      <FaqLanguageTabs data={data} saveFaqs={saveFaqs} />
    </AdminCard>
  );
}
