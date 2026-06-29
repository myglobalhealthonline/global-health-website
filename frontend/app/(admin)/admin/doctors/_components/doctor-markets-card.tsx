import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import {
  type AdminDoctorMarketDto,
  patchAdminDoctorMarket,
} from "@/lib/admin/admin-api";
import { SITE_CACHE_TAGS } from "@/lib/api/site-content-api";
import { AdminCard } from "../../_components/atoms";

const FAQ_SLOTS = 6;

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

function translationFor(market: AdminDoctorMarketDto, locale: string) {
  const normalized = locale.toUpperCase();
  return (
    market.translations.find((entry) => entry.locale.toUpperCase() === normalized) ??
    null
  );
}

function faqsFor(market: AdminDoctorMarketDto, locale: string) {
  const normalized = locale.toUpperCase();
  return market.faqs
    .filter((entry) => entry.locale.toUpperCase() === normalized)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.question.localeCompare(b.question))
    .slice(0, FAQ_SLOTS);
}

export function DoctorMarketsCard({ doctorId, doctorSlug, markets }: Props) {
  async function saveMarket(formData: FormData) {
    "use server";
    await requireAdminAction();
    const countryId = String(formData.get("countryId") ?? "");
    const countryCode = String(formData.get("countryCode") ?? "");
    if (!countryId) {
      redirect(
        `/admin/doctors/${doctorId}?error=${encodeURIComponent(
          "Country is required for a market profile",
        )}`,
      );
    }

    const localeCodes = String(formData.get("locales") ?? "")
      .split(",")
      .map((locale) => locale.trim().toUpperCase())
      .filter(Boolean);

    const translations = localeCodes.map((locale) => ({
      locale,
      bio: cleanString(formData.get(`bio_${locale}`)),
      seoTitle: cleanString(formData.get(`seoTitle_${locale}`)),
      seoDescription: cleanString(formData.get(`seoDescription_${locale}`)),
      seoKeywords: keywordsFromCsv(formData.get(`seoKeywords_${locale}`)),
    }));

    const faqs = localeCodes.flatMap((locale) => {
      const rows = [];
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

    const bankIban = cleanString(formData.get("bankIban"));
    const body = {
      active: formData.get("active") === "on",
      sortOrder: Number(formData.get("sortOrder") ?? 0),
      chamberEntity: cleanString(formData.get("chamberEntity")),
      registrationNumber: cleanString(formData.get("registrationNumber")),
      division: cleanString(formData.get("division")),
      isVerified: formData.get("isVerified") === "on",
      translations,
      faqs,
      bank: {
        accountHolder: cleanString(formData.get("bankAccountHolder")),
        bic: cleanString(formData.get("bankBic")),
        ...(bankIban ? { iban: bankIban } : {}),
      },
    };

    const result = await patchAdminDoctorMarket(doctorId, countryId, body);
    if (!result.ok) {
      redirect(
        `/admin/doctors/${doctorId}?error=${encodeURIComponent(result.message)}`,
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
      `/admin/doctors/${doctorId}?success=${encodeURIComponent(
        "Doctor market profile saved",
      )}`,
    );
  }

  return (
    <AdminCard>
      <h3 className="m-0 [font-family:var(--font-display)] text-base font-extrabold text-[var(--color-text-primary)]">
        Country profiles
      </h3>
      <p className="mb-4 mt-1 text-[13px] text-[var(--color-text-muted)]">
        Per-country public bio, SEO, FAQs, registration, and payout details.
        Doctor portal edits can update bio, registration, and payout; SEO and
        FAQs stay admin-only.
      </p>

      {markets.length === 0 ? (
        <p className="text-[13px] text-[var(--color-text-muted)]">
          No country rows exist yet. Save the doctor edit page once to generate
          the primary country row.
        </p>
      ) : (
        <div className="grid gap-4">
          {markets.map((market) => {
            const locales = market.supportedLocales.length
              ? market.supportedLocales
              : [{ code: market.country.defaultLocale, isDefault: true }];
            const localeCsv = locales.map((locale) => locale.code.toUpperCase()).join(",");
            return (
              <form
                key={market.countryId}
                action={saveMarket}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4"
              >
                <input type="hidden" name="countryId" value={market.countryId} />
                <input type="hidden" name="countryCode" value={market.country.code} />
                <input type="hidden" name="locales" value={localeCsv} />

                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="m-0 text-[15px] font-bold text-[var(--color-text-primary)]">
                      {market.country.name} ({market.country.code.toUpperCase()})
                    </p>
                    <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
                      Default locale: {market.country.defaultLocale}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[13px]">
                    <label className="inline-flex items-center gap-2">
                      <input name="active" type="checkbox" defaultChecked={market.active} />
                      Active
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        name="isVerified"
                        type="checkbox"
                        defaultChecked={market.isVerified}
                      />
                      Registration verified
                    </label>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-[90px_1fr_1fr_90px]">
                  <label className="flex flex-col gap-1">
                    <span className="gh-field-label">Sort</span>
                    <input
                      name="sortOrder"
                      type="number"
                      min={0}
                      max={1000}
                      defaultValue={market.sortOrder}
                      className="gh-input"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="gh-field-label">Registration body</span>
                    <input
                      name="chamberEntity"
                      maxLength={64}
                      defaultValue={market.chamberEntity ?? ""}
                      className="gh-input"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="gh-field-label">Registration number</span>
                    <input
                      name="registrationNumber"
                      maxLength={64}
                      defaultValue={market.registrationNumber ?? ""}
                      className="gh-input"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="gh-field-label">Division</span>
                    <input
                      name="division"
                      maxLength={120}
                      defaultValue={market.division ?? ""}
                      className="gh-input"
                    />
                  </label>
                </div>

                <div className="mt-4 grid gap-4">
                  {locales.map((locale) => {
                    const code = locale.code.toUpperCase();
                    const translation = translationFor(market, code);
                    const faqRows = faqsFor(market, code);
                    return (
                      <section
                        key={code}
                        className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] p-3"
                      >
                        <h4 className="m-0 text-[13px] font-bold text-[var(--color-text-primary)]">
                          {code}
                          {locale.isDefault ? " default" : ""}
                        </h4>
                        <div className="mt-3 grid gap-3">
                          <label className="flex flex-col gap-1">
                            <span className="gh-field-label">Market bio</span>
                            <textarea
                              name={`bio_${code}`}
                              rows={5}
                              maxLength={12000}
                              defaultValue={translation?.bio ?? ""}
                              className="gh-input min-h-32 resize-y"
                            />
                          </label>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="flex flex-col gap-1">
                              <span className="gh-field-label">SEO title</span>
                              <input
                                name={`seoTitle_${code}`}
                                maxLength={160}
                                defaultValue={translation?.seoTitle ?? ""}
                                className="gh-input"
                              />
                            </label>
                            <label className="flex flex-col gap-1">
                              <span className="gh-field-label">SEO keywords</span>
                              <input
                                name={`seoKeywords_${code}`}
                                maxLength={500}
                                defaultValue={(translation?.seoKeywords ?? []).join(", ")}
                                className="gh-input"
                                placeholder="cardiology, telehealth"
                              />
                            </label>
                          </div>
                          <label className="flex flex-col gap-1">
                            <span className="gh-field-label">Meta description</span>
                            <textarea
                              name={`seoDescription_${code}`}
                              rows={2}
                              maxLength={320}
                              defaultValue={translation?.seoDescription ?? ""}
                              className="gh-input resize-y"
                            />
                          </label>
                          <div className="grid gap-2">
                            <span className="gh-field-label">FAQs</span>
                            {Array.from({ length: FAQ_SLOTS }, (_, index) => {
                              const faq = faqRows[index] ?? null;
                              return (
                                <div
                                  key={`${code}-${index}`}
                                  className="grid gap-2 rounded border border-[var(--color-border)] bg-[var(--color-background-soft)] p-2 sm:grid-cols-[1fr_1fr_120px_70px_auto]"
                                >
                                  <input
                                    name={`faq_${code}_${index}_question`}
                                    defaultValue={faq?.question ?? ""}
                                    className="gh-input"
                                    maxLength={500}
                                    placeholder="Question"
                                  />
                                  <input
                                    name={`faq_${code}_${index}_answer`}
                                    defaultValue={faq?.answer ?? ""}
                                    className="gh-input"
                                    maxLength={4000}
                                    placeholder="Answer"
                                  />
                                  <input
                                    name={`faq_${code}_${index}_category`}
                                    defaultValue={faq?.category ?? ""}
                                    className="gh-input"
                                    maxLength={120}
                                    placeholder="Category"
                                  />
                                  <input
                                    name={`faq_${code}_${index}_sortOrder`}
                                    type="number"
                                    min={0}
                                    max={1000}
                                    defaultValue={faq?.sortOrder ?? index}
                                    className="gh-input"
                                    aria-label="FAQ sort order"
                                  />
                                  <label className="inline-flex items-center gap-1 text-[12px]">
                                    <input
                                      name={`faq_${code}_${index}_isActive`}
                                      type="checkbox"
                                      defaultChecked={faq?.isActive ?? true}
                                    />
                                    Active
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </section>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] p-3">
                  <h4 className="m-0 text-[13px] font-bold text-[var(--color-text-primary)]">
                    Payout details
                  </h4>
                  <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
                    IBAN is encrypted. Leave IBAN blank to keep the current
                    value: {market.bank.ibanMasked ?? "none on file"}.
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <label className="flex flex-col gap-1">
                      <span className="gh-field-label">Account holder</span>
                      <input
                        name="bankAccountHolder"
                        maxLength={160}
                        defaultValue={market.bank.accountHolder ?? ""}
                        className="gh-input"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="gh-field-label">BIC / SWIFT</span>
                      <input
                        name="bankBic"
                        maxLength={16}
                        defaultValue={market.bank.bic ?? ""}
                        className="gh-input font-mono"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="gh-field-label">New IBAN</span>
                      <input
                        name="bankIban"
                        maxLength={42}
                        className="gh-input font-mono"
                        placeholder="Leave blank to keep"
                      />
                    </label>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button type="submit" className="gh-btn gh-btn-primary">
                    Save {market.country.name}
                  </button>
                </div>
              </form>
            );
          })}
        </div>
      )}
    </AdminCard>
  );
}
