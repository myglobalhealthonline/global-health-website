import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowLeft } from "lucide-react";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { fetchAdminCountries, fetchAdminServices, fetchAdminHealthTests } from "@/lib/admin/admin-api";
import {
  deleteAdminPlanConsultationRule,
  deleteAdminPlanHealthTestRule,
  deleteAdminPlanPerk,
  fetchAdminPlanById,
  fetchAdminPlanPreview,
  patchAdminPlan,
  postAdminPlanConsultationRule,
  postAdminPlanHealthTestRule,
  postAdminPlanPerk,
  putAdminPlanTranslation,
} from "@/lib/admin/plans-api";
import { parsePlanForm } from "@/lib/admin/plan-form-parse";
import { PlanFields } from "../../../_components/plan-fields";
import { PlanTranslationTabs } from "../../../_components/plan-translation-tabs";
import { AdminCard, Btn, PageHeader, Pill, SectionHeader } from "../../../_components/atoms";
import { ConfirmDeleteButton } from "../../../_components/confirm-delete-button";

export const dynamic = "force-dynamic";

const PERK_KEYS = [
  "SPECIALIST_DISCOUNT",
  "FAMILY_USAGE",
  "WELLNESS_REDEMPTION",
  "TEST_KIT_REDEMPTION",
  "HIGHER_DISCOUNT_TIER",
] as const;
const UNLOCK_MODES = ["MONTH_1", "AFTER_PAID_MONTHS", "MANUAL_APPROVAL", "NOT_AVAILABLE"] as const;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string; previewLocale?: string }>;
};

export default async function AdminEditPlanPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};

  const planResult = await fetchAdminPlanById(id);
  if (!planResult.ok) {
    if (planResult.status === 404) notFound();
    return (
      <AdminCard>
        <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          Could not load plan: {planResult.message}
        </p>
      </AdminCard>
    );
  }
  const plan = planResult.data.plan;

  const [countriesResult, servicesResult, healthTestsResult] = await Promise.all([
    fetchAdminCountries(),
    fetchAdminServices({ countryId: plan.countryId, pageSize: "250", isActive: "true" }),
    fetchAdminHealthTests({ countryId: plan.countryId, pageSize: "250" }),
  ]);
  const countries = countriesResult.ok
    ? countriesResult.data.countries.map((c) => ({ id: c.id, code: c.code, name: c.name }))
    : [{ id: plan.countryId, code: plan.country.code, name: plan.country.name }];
  const countryRow = countriesResult.ok
    ? countriesResult.data.countries.find((c) => c.id === plan.countryId)
    : undefined;
  // Locale tabs: country default + any enabled CountryLocale (matches the CMS pattern).
  const defaultLocale = (countryRow?.defaultLocale ?? "EN").toUpperCase();
  const localeSet = new Set<string>([defaultLocale]);
  for (const l of countryRow?.countryLocales ?? []) localeSet.add(l.locale.toUpperCase());
  const locales = Array.from(localeSet);
  const localeTabs = locales.map((code) => ({ code, isDefault: code === defaultLocale }));

  // §36.11: never offer a PRESCRIPTION service in the plan picker.
  const services = (servicesResult.ok ? servicesResult.data.items : []).filter(
    (s) => s.kind !== "PRESCRIPTION",
  );
  const healthTests = healthTestsResult.ok ? healthTestsResult.data.items : [];

  const previewLocale = sp.previewLocale;
  const previewResult = await fetchAdminPlanPreview(plan.id, previewLocale);

  // ── Server actions ─────────────────────────────────────────────────────────
  async function updatePlanAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const parsed = parsePlanForm(formData);
    if (!parsed.ok) {
      redirect(`/admin/plans/${id}/edit?error=${encodeURIComponent(parsed.error)}`);
    }
    const result = await patchAdminPlan(id, parsed.data);
    revalidatePath(`/admin/plans/${id}/edit`);
    redirect(
      `/admin/plans/${id}/edit?${result.ok ? "success=Plan+saved" : `error=${encodeURIComponent(result.message)}`}`,
    );
  }

  async function addConsultationRuleAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    // UI choice maps onto backend fields (no enum change): FREE → PERCENT/100,
    // UNAVAILABLE → isActive:false (excluded from the snapshot → standard price).
    const choice = String(formData.get("discountMode") ?? "NONE");
    let discountMode = "NONE";
    let discountPercent: number | null = null;
    let fixedPriceCents: number | null = null;
    let isActive = true;
    if (choice === "PERCENT") {
      discountMode = "PERCENT";
      discountPercent = Number(formData.get("discountPercent") ?? 0) || 0;
    } else if (choice === "FIXED") {
      discountMode = "FIXED";
      fixedPriceCents = Math.round(Number(formData.get("fixedPrice") ?? 0) * 100);
    } else if (choice === "FREE") {
      discountMode = "PERCENT";
      discountPercent = 100;
    } else if (choice === "UNAVAILABLE") {
      isActive = false;
    }
    const body = {
      serviceId: String(formData.get("serviceId") ?? ""),
      isIncluded: formData.get("isIncluded") === "on",
      usesCredits: formData.get("usesCredits") === "on",
      creditsPerUse: Number(formData.get("creditsPerUse") ?? 1) || 1,
      discountMode,
      discountPercent,
      fixedPriceCents,
      unlockAfterPaidMonths: Number(formData.get("unlockAfterPaidMonths") ?? 0) || 0,
      familyUsable: formData.get("familyUsable") === "on",
      isActive,
    };
    const result = await postAdminPlanConsultationRule(id, body);
    revalidatePath(`/admin/plans/${id}/edit`);
    if (!result.ok) redirect(`/admin/plans/${id}/edit?error=${encodeURIComponent(result.message)}`);
    redirect(`/admin/plans/${id}/edit?success=Consultation+rule+saved`);
  }

  async function removeConsultationRuleAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    await deleteAdminPlanConsultationRule(id, String(formData.get("serviceId") ?? ""));
    revalidatePath(`/admin/plans/${id}/edit`);
  }

  async function addPerkAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const unlockMode = String(formData.get("unlockMode") ?? "MONTH_1");
    const body = {
      perkKey: String(formData.get("perkKey") ?? ""),
      unlockMode,
      unlockAfterPaidMonths:
        unlockMode === "AFTER_PAID_MONTHS" ? Number(formData.get("unlockAfterPaidMonths") ?? 0) : null,
    };
    const result = await postAdminPlanPerk(id, body);
    revalidatePath(`/admin/plans/${id}/edit`);
    if (!result.ok) redirect(`/admin/plans/${id}/edit?error=${encodeURIComponent(result.message)}`);
    redirect(`/admin/plans/${id}/edit?success=Perk+rule+saved`);
  }

  async function removePerkAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    await deleteAdminPlanPerk(id, String(formData.get("perkKey") ?? ""));
    revalidatePath(`/admin/plans/${id}/edit`);
  }

  async function addHealthTestRuleAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const body = {
      healthTestId: String(formData.get("healthTestId") ?? ""),
      requiredWellnessCredits: Number(formData.get("requiredWellnessCredits") ?? 1) || 1,
      unlockAfterPaidMonths: Number(formData.get("unlockAfterPaidMonths") ?? 0) || 0,
      isActive: true,
    };
    const result = await postAdminPlanHealthTestRule(id, body);
    revalidatePath(`/admin/plans/${id}/edit`);
    if (!result.ok) redirect(`/admin/plans/${id}/edit?error=${encodeURIComponent(result.message)}`);
    redirect(`/admin/plans/${id}/edit?success=Redemption+rule+saved`);
  }

  async function removeHealthTestRuleAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    await deleteAdminPlanHealthTestRule(id, String(formData.get("healthTestId") ?? ""));
    revalidatePath(`/admin/plans/${id}/edit`);
  }

  // Bulk-save all locale tabs in one submit (mirrors the Service CMS). Reads
  // `tr_<LOCALE>_<field>` for each locale; a blank name → skip (that language
  // falls back to the default). `features` is one bullet per line.
  async function saveTranslationsAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const errors: string[] = [];
    for (const locale of locales) {
      const name = String(formData.get(`tr_${locale}_name`) ?? "").trim();
      if (!name) continue;
      const features = String(formData.get(`tr_${locale}_features`) ?? "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const body = {
        name,
        shortDescription: String(formData.get(`tr_${locale}_shortDescription`) ?? "").trim() || null,
        longDescription: String(formData.get(`tr_${locale}_longDescription`) ?? "").trim() || null,
        notesTerms: String(formData.get(`tr_${locale}_notesTerms`) ?? "").trim() || null,
        features,
      };
      const result = await putAdminPlanTranslation(id, locale, body);
      if (!result.ok) errors.push(`${locale}: ${result.message}`);
    }
    revalidatePath(`/admin/plans/${id}/edit`);
    redirect(
      `/admin/plans/${id}/edit?${errors.length ? `error=${encodeURIComponent(errors.join("; "))}` : "success=Translations+saved"}`,
    );
  }

  return (
    <>
      <Link
        href="/admin/plans"
        className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to plans
      </Link>
      <PageHeader
        eyebrow="Subscriptions"
        title={plan.name}
        description={`${plan.country.name} · ${plan.slug} · Stripe Price ${plan.stripePriceId ?? "—"}`}
        actions={
          <Btn href={`/admin/plans/new?countryId=${encodeURIComponent(plan.countryId)}`} variant="ghost">
            New plan
          </Btn>
        }
      />

      {sp.success ? (
        <p className="gh-status-success mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">{sp.success}</p>
      ) : null}
      {sp.error ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">{sp.error}</p>
      ) : null}

      <div className="flex flex-col gap-6">
        {/* Plan fields */}
        <AdminCard padding={0}>
          <SectionHeader title="Plan details" description="Price, credits, and badges. A price change re-syncs the Stripe Price." />
          <form action={updatePlanAction} className="flex flex-col gap-8 p-6">
            <PlanFields countries={countries} initial={plan} pinnedCountryId={plan.countryId} />
            <div className="border-t border-[var(--color-border)] pt-6">
              <button type="submit" className="gh-btn gh-btn-primary">
                Save plan
              </button>
            </div>
          </form>
        </AdminCard>

        {/* Consultation rules */}
        <AdminCard padding={0}>
          <SectionHeader
            title="Consultation rules"
            description="Link services (GP / specialist) with credit, discount, fixed-price and unlock config. Prescription services are excluded."
          />
          <div className="p-6">
            {plan.consultationRules.length === 0 ? (
              <p className="mb-4 text-sm text-[var(--color-text-muted)]">No consultation rules yet.</p>
            ) : (
              <ul className="mb-6 flex flex-col gap-2">
                {plan.consultationRules.map((rule) => (
                  <li
                    key={rule.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] px-4 py-2.5"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold text-[var(--color-text-primary)]">{rule.service.name}</span>
                      <Pill tone={rule.service.kind === "SPECIALIST" ? "brand" : "neutral"}>{rule.service.kind}</Pill>
                      {rule.isIncluded ? <Pill tone="active">Included</Pill> : null}
                      {rule.usesCredits ? <Pill tone="published">{rule.creditsPerUse} credit/use</Pill> : null}
                      {rule.discountMode === "PERCENT" && rule.discountPercent === 100 ? (
                        <Pill tone="active">Free (100%)</Pill>
                      ) : rule.discountMode !== "NONE" ? (
                        <Pill tone="pending">
                          {rule.discountMode === "PERCENT"
                            ? `${rule.discountPercent ?? 0}% off`
                            : `${((rule.fixedPriceCents ?? 0) / 100).toFixed(2)} fixed`}
                        </Pill>
                      ) : null}
                      {rule.unlockAfterPaidMonths > 0 ? (
                        <Pill tone="draft">unlock @ {rule.unlockAfterPaidMonths}mo</Pill>
                      ) : null}
                      {!rule.isActive ? <Pill tone="inactive">not available</Pill> : null}
                    </div>
                    <form action={removeConsultationRuleAction}>
                      <input type="hidden" name="serviceId" value={rule.serviceId} />
                      <ConfirmDeleteButton
                        message={`Deactivate the rule for "${rule.service.name}"?`}
                        className="text-[13px] font-semibold text-[var(--color-status-error-text)] hover:underline"
                      >
                        Remove
                      </ConfirmDeleteButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <form action={addConsultationRuleAction} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-1.5 lg:col-span-2">
                <span className="gh-field-label">Service</span>
                <select name="serviceId" className="gh-select min-w-0" required defaultValue="">
                  <option value="">Select service…</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.kind})
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="gh-field-label">Discount</span>
                <select name="discountMode" className="gh-select min-w-0" defaultValue="NONE">
                  <option value="NONE">None (standard price)</option>
                  <option value="PERCENT">Percent %</option>
                  <option value="FIXED">Fixed price</option>
                  <option value="FREE">Free (100% off)</option>
                  <option value="UNAVAILABLE">Not available under plan</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="gh-field-label">Credits / use</span>
                <input name="creditsPerUse" type="number" min="1" defaultValue="1" className="gh-input min-w-0" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="gh-field-label">Discount %</span>
                <input name="discountPercent" type="number" min="0" max="100" step="0.01" className="gh-input min-w-0" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="gh-field-label">Fixed price (major)</span>
                <input name="fixedPrice" type="number" min="0" step="0.01" className="gh-input min-w-0" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="gh-field-label">Unlock after months</span>
                <input name="unlockAfterPaidMonths" type="number" min="0" defaultValue="0" className="gh-input min-w-0" />
              </label>
              <div className="flex flex-col gap-2 pt-1 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="isIncluded" className="size-4" /> Included
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="usesCredits" className="size-4" /> Uses credits
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="familyUsable" className="size-4" /> Family usable
                </label>
              </div>
              <div className="lg:col-span-4">
                <button type="submit" className="gh-btn gh-btn-secondary">
                  Add / update rule
                </button>
              </div>
            </form>
          </div>
        </AdminCard>

        {/* Perk rules */}
        <AdminCard padding={0}>
          <SectionHeader title="Perk unlock rules" description="When each perk unlocks. Manual approval is per-subscriber via the Subscriptions queue." />
          <div className="p-6">
            {plan.perkRules.length === 0 ? (
              <p className="mb-4 text-sm text-[var(--color-text-muted)]">No perk rules yet.</p>
            ) : (
              <ul className="mb-6 flex flex-col gap-2">
                {plan.perkRules.map((perk) => (
                  <li
                    key={perk.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] px-4 py-2.5 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[var(--color-text-primary)]">{perk.perkKey}</span>
                      <Pill tone="neutral">{perk.unlockMode}</Pill>
                      {perk.unlockMode === "AFTER_PAID_MONTHS" ? (
                        <Pill tone="draft">@ {perk.unlockAfterPaidMonths}mo</Pill>
                      ) : null}
                    </div>
                    <form action={removePerkAction}>
                      <input type="hidden" name="perkKey" value={perk.perkKey} />
                      <ConfirmDeleteButton
                        message={`Remove the ${perk.perkKey} perk rule?`}
                        className="text-[13px] font-semibold text-[var(--color-status-error-text)] hover:underline"
                      >
                        Remove
                      </ConfirmDeleteButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <form action={addPerkAction} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-1.5">
                <span className="gh-field-label">Perk</span>
                <select name="perkKey" className="gh-select min-w-0" required defaultValue="">
                  <option value="">Select perk…</option>
                  {PERK_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="gh-field-label">Unlock mode</span>
                <select name="unlockMode" className="gh-select min-w-0" defaultValue="MONTH_1">
                  {UNLOCK_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="gh-field-label">Unlock after months</span>
                <input name="unlockAfterPaidMonths" type="number" min="0" defaultValue="2" className="gh-input min-w-0" />
              </label>
              <div>
                <button type="submit" className="gh-btn gh-btn-secondary">
                  Add / update perk
                </button>
              </div>
            </form>
          </div>
        </AdminCard>

        {/* Health-test redemption rules — Premium only (wellness is strictly Premium). */}
        {plan.planType === "PREMIUM" ? (
        <AdminCard padding={0}>
          <SectionHeader title="Health-test redemption rules" description="Wellness-credit redemption per kit. Active subscription is always required (D6)." />
          <div className="p-6">
            {plan.healthTestRules.length === 0 ? (
              <p className="mb-4 text-sm text-[var(--color-text-muted)]">No redemption rules yet.</p>
            ) : (
              <ul className="mb-6 flex flex-col gap-2">
                {plan.healthTestRules.map((rule) => (
                  <li
                    key={rule.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] px-4 py-2.5 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[var(--color-text-primary)]">{rule.healthTest.title}</span>
                      <Pill tone="published">{rule.requiredWellnessCredits} wellness credits</Pill>
                      {rule.unlockAfterPaidMonths > 0 ? (
                        <Pill tone="draft">unlock @ {rule.unlockAfterPaidMonths}mo</Pill>
                      ) : null}
                      {!rule.isActive ? <Pill tone="inactive">inactive</Pill> : null}
                    </div>
                    <form action={removeHealthTestRuleAction}>
                      <input type="hidden" name="healthTestId" value={rule.healthTestId} />
                      <ConfirmDeleteButton
                        message={`Deactivate the redemption rule for "${rule.healthTest.title}"?`}
                        className="text-[13px] font-semibold text-[var(--color-status-error-text)] hover:underline"
                      >
                        Remove
                      </ConfirmDeleteButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <form action={addHealthTestRuleAction} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-1.5 lg:col-span-2">
                <span className="gh-field-label">Health test kit</span>
                <select name="healthTestId" className="gh-select min-w-0" required defaultValue="">
                  <option value="">Select kit…</option>
                  {healthTests.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="gh-field-label">Required wellness credits</span>
                <input name="requiredWellnessCredits" type="number" min="1" defaultValue="6" className="gh-input min-w-0" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="gh-field-label">Unlock after months</span>
                <input name="unlockAfterPaidMonths" type="number" min="0" defaultValue="0" className="gh-input min-w-0" />
              </label>
              <div className="lg:col-span-4">
                <button type="submit" className="gh-btn gh-btn-secondary">
                  Add / update redemption rule
                </button>
              </div>
            </form>
          </div>
        </AdminCard>
        ) : null}

        {/* Translations — tabbed per-locale editor, single save (mirrors Services). */}
        <AdminCard padding={0}>
          <SectionHeader title="Content &amp; translations" description="Per-locale plan copy + public-card bullets. One save covers all languages." />
          <form action={saveTranslationsAction} className="flex flex-col gap-6 p-6">
            <PlanTranslationTabs
              locales={localeTabs}
              defaultLocale={defaultLocale}
              initialTranslations={plan.translations.map((t) => ({
                locale: t.locale,
                name: t.name,
                shortDescription: t.shortDescription,
                longDescription: t.longDescription,
                notesTerms: t.notesTerms,
                features: t.features ?? [],
              }))}
              baseFallback={{
                name: plan.name,
                shortDescription: plan.shortDescription,
                longDescription: plan.longDescription,
                notesTerms: plan.notesTerms,
              }}
            />
            <div className="border-t border-[var(--color-border)] pt-6">
              <button type="submit" className="gh-btn gh-btn-primary">
                Save translations
              </button>
            </div>
          </form>
        </AdminCard>

        {/* Preview */}
        <AdminCard padding={0}>
          <SectionHeader
            title="Plan preview"
            description="Resolved plan as a subscriber sees it (translations applied)."
            right={
              <div className="flex gap-1.5">
                {locales.map((locale) => (
                  <Link
                    key={locale}
                    href={`/admin/plans/${plan.id}/edit?previewLocale=${locale}#preview`}
                    className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  >
                    {locale}
                  </Link>
                ))}
              </div>
            }
          />
          <div id="preview" className="p-6">
            {previewResult.ok ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-[var(--color-text-primary)]">{previewResult.data.preview.name}</h3>
                  <Pill tone="neutral">{previewResult.data.preview.resolvedLocale}</Pill>
                </div>
                <p className="text-2xl font-extrabold text-[var(--color-brand-primary)]">
                  {(plan.monthlyPriceCents / 100).toFixed(2)} {plan.currencyCode} <span className="text-sm font-medium text-[var(--color-text-muted)]">/ month</span>
                </p>
                {previewResult.data.preview.shortDescription ? (
                  <p className="text-sm text-[var(--color-text-body)]">{previewResult.data.preview.shortDescription}</p>
                ) : null}
                {previewResult.data.preview.longDescription ? (
                  <p className="text-sm text-[var(--color-text-muted)]">{previewResult.data.preview.longDescription}</p>
                ) : null}
                <p className="text-sm text-[var(--color-text-muted)]">
                  {plan.monthlyConsultationCredits} GP credit(s)/month · {plan.wellnessCreditsPerMonth} wellness/month
                </p>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">Could not load preview: {previewResult.message}</p>
            )}
          </div>
        </AdminCard>
      </div>
    </>
  );
}
