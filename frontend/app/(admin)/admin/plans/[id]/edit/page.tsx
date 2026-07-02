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
  patchAdminPlan,
  postAdminPlanConsultationRule,
  postAdminPlanHealthTestRule,
  postAdminPlanPerk,
  putAdminPlanTranslation,
} from "@/lib/admin/plans-api";
import { parsePlanForm } from "@/lib/admin/plan-form-parse";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import type { LocaleCode } from "@/lib/i18n/types";
import type { PublicPlan } from "@/data/pricing-plans";
import { PricingPlanCard } from "@/app/(site)/[country]/[lang]/pricing/_components/PricingPlanCard";
import { PlanFields } from "../../../_components/plan-fields";
import { PlanTranslationTabs } from "../../../_components/plan-translation-tabs";
import { PlanEditTabs } from "../../../_components/plan-edit-tabs";
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

const PLAN_TYPE_LABEL: Record<string, string> = {
  ESSENTIAL: "Essential Care",
  COMPREHENSIVE: "Comprehensive Care",
  PREMIUM: "Premium Wellness Care",
};

// Human-readable labels so the admin sees plain English, not raw enum keys.
const PERK_LABELS: Record<string, string> = {
  SPECIALIST_DISCOUNT: "Specialist discount",
  FAMILY_USAGE: "Family usage",
  WELLNESS_REDEMPTION: "Wellness redemption",
  TEST_KIT_REDEMPTION: "Test-kit redemption",
  HIGHER_DISCOUNT_TIER: "Higher discount tier",
};
const UNLOCK_MODE_LABELS: Record<string, string> = {
  MONTH_1: "Immediately (from month 1)",
  AFTER_PAID_MONTHS: "After N paid months",
  MANUAL_APPROVAL: "Manual admin approval",
  NOT_AVAILABLE: "Not available",
};
const SERVICE_KIND_LABELS: Record<string, string> = {
  GENERAL: "General",
  SPECIALIST: "Specialist",
  PRESCRIPTION: "Prescription",
};

/**
 * Sensible default "Includes" bullets derived from the plan, used to pre-fill
 * the English tab so the admin has a concrete editable starting point (instead
 * of a blank box). Mirrors the public card's auto bullets.
 */
function defaultPlanFeatures(p: {
  monthlyConsultationCredits: number;
  wellnessCreditsPerMonth: number;
  planType: string;
  consultationRules: Array<{ service: { kind: string }; isActive: boolean; discountMode: string }>;
}): string[] {
  const gp = p.monthlyConsultationCredits;
  const out = [
    `${gp} online GP consultation credit${gp === 1 ? "" : "s"} each month`,
    "Secure online and video consultations",
    "Online booking and access to your records",
  ];
  const hasSpecialistDiscount = p.consultationRules.some(
    (r) => r.service.kind === "SPECIALIST" && r.isActive && r.discountMode !== "NONE",
  );
  if (hasSpecialistDiscount) out.push("Discounts on selected specialist consultations");
  if (p.planType === "PREMIUM" && p.wellnessCreditsPerMonth > 0) {
    const w = p.wellnessCreditsPerMonth;
    out.push(`${w} wellness credit${w === 1 ? "" : "s"} each month`);
    out.push("Redeem wellness credits for home health-test kits");
  }
  return out;
}

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

  // Live card preview — build the real PublicPlan shape from the current plan +
  // the chosen locale, then render the SAME PricingPlanCard the public site uses
  // (mirrors serializePublicPlan / derivePerkUnlockMonths). Built from local
  // data so it's always fresh and works even for inactive/unsaved plans.
  const previewLocaleUpper = (sp.previewLocale ?? defaultLocale).toUpperCase();
  const previewLang = previewLocaleUpper.toLowerCase() as LocaleCode;
  const { subscription: previewBundle } = loadLocaleBundle(previewLang);
  const previewTr =
    plan.translations.find((t) => t.locale.toUpperCase() === previewLocaleUpper) ??
    plan.translations.find((t) => t.locale.toUpperCase() === defaultLocale.toUpperCase());
  const previewUnlockMonths = (() => {
    const months: number[] = [];
    for (const pk of plan.perkRules) {
      if (pk.unlockMode === "AFTER_PAID_MONTHS" && pk.unlockAfterPaidMonths && pk.unlockAfterPaidMonths > 0) {
        months.push(pk.unlockAfterPaidMonths);
      }
    }
    for (const r of plan.consultationRules) {
      if (r.isActive && r.unlockAfterPaidMonths > 0) months.push(r.unlockAfterPaidMonths);
    }
    return months.length ? Math.min(...months) : null;
  })();
  const previewPlan: PublicPlan = {
    id: plan.id,
    slug: plan.slug,
    name: previewTr?.name ?? plan.name,
    shortDescription: previewTr?.shortDescription ?? plan.shortDescription,
    longDescription: previewTr?.longDescription ?? plan.longDescription,
    badgeLabel: plan.badgeLabel,
    isFeatured: plan.isFeatured,
    displayOrder: plan.displayOrder,
    monthlyPriceCents: plan.monthlyPriceCents,
    currencyCode: plan.currencyCode,
    billingInterval: plan.billingInterval,
    monthlyConsultationCredits: plan.monthlyConsultationCredits,
    wellnessCreditsPerMonth: plan.wellnessCreditsPerMonth,
    features: previewTr?.features ?? [],
    perkUnlockMonths: previewUnlockMonths,
    perks: plan.perkRules.map((pk) => ({
      perkKey: pk.perkKey,
      unlockMode: pk.unlockMode,
      unlockAfterPaidMonths: pk.unlockAfterPaidMonths,
    })),
    wellnessKits: plan.healthTestRules
      .filter((r) => r.isActive)
      .map((r) => ({
        healthTestId: r.healthTestId,
        name: r.healthTest.title,
        slug: r.healthTest.slug,
        requiredWellnessCredits: r.requiredWellnessCredits,
        unlockAfterPaidMonths: r.unlockAfterPaidMonths,
      })),
  };

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
    const result = await deleteAdminPlanConsultationRule(id, String(formData.get("serviceId") ?? ""));
    revalidatePath(`/admin/plans/${id}/edit`);
    redirect(
      `/admin/plans/${id}/edit?${result.ok ? "success=Consultation+rule+removed" : `error=${encodeURIComponent(result.message)}`}`,
    );
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
    const result = await deleteAdminPlanPerk(id, String(formData.get("perkKey") ?? ""));
    revalidatePath(`/admin/plans/${id}/edit`);
    redirect(
      `/admin/plans/${id}/edit?${result.ok ? "success=Perk+rule+removed" : `error=${encodeURIComponent(result.message)}`}`,
    );
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
    const result = await deleteAdminPlanHealthTestRule(id, String(formData.get("healthTestId") ?? ""));
    revalidatePath(`/admin/plans/${id}/edit`);
    redirect(
      `/admin/plans/${id}/edit?${result.ok ? "success=Redemption+rule+removed" : `error=${encodeURIComponent(result.message)}`}`,
    );
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
        className="gh-admin-area-hero gh-admin-area-plans"
        eyebrow="Subscriptions"
        title={plan.name}
        description={`${PLAN_TYPE_LABEL[plan.planType] ?? plan.planType} plan for ${plan.country.name}. Edit each section below, then press its Save button — changes go live straight away.`}
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

      <p className="gh-admin-area-hero gh-admin-area-plans gh-admin-plan-editor-note mb-4 text-sm text-[var(--color-text-muted)]">
        Set up the plan one tab at a time. Each tab saves on its own — press the button inside it.
        Existing subscribers keep their current terms until renewal.
      </p>

      <div className="gh-admin-area-hero gh-admin-area-plans gh-admin-plan-editor">
      <PlanEditTabs
        defaultTabId={sp.previewLocale ? "preview" : undefined}
        tabs={[
          {
            id: "basics",
            label: "Basics & price",
            content: (
              <AdminCard padding={0}>
                <SectionHeader title="Basics & price" description="Name, monthly price, and what's included each month. Saving updates billing automatically." />
          <form action={updatePlanAction} className="flex flex-col gap-8 p-6">
            <PlanFields countries={countries} initial={plan} pinnedCountryId={plan.countryId} />
            <div className="border-t border-[var(--color-border)] pt-6">
              <button type="submit" className="gh-btn gh-btn-primary">
                Save plan
              </button>
            </div>
          </form>
              </AdminCard>
            ),
          },
          {
            id: "visits",
            label: "Doctor visits",
            content: (
              <AdminCard padding={0}>
                <SectionHeader
                  title="Doctor visits & discounts"
            description="Which consultations this plan covers and what members pay for each. GP visits are usually covered by the monthly allowance; specialist visits usually get a discount. Prescriptions are never included."
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
                      <Pill tone={rule.service.kind === "SPECIALIST" ? "brand" : "neutral"}>
                        {SERVICE_KIND_LABELS[rule.service.kind] ?? rule.service.kind}
                      </Pill>
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
                        message={`Remove the rule for "${rule.service.name}"? This deletes it from the plan.`}
                        className="text-[13px] font-semibold text-[var(--color-status-error-text)] hover:underline"
                      >
                        Remove
                      </ConfirmDeleteButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <p className="mb-4 rounded-[var(--radius-card-sm)] bg-[var(--color-background-soft)] px-4 py-3 text-[13px] text-[var(--color-text-body)]">
              <span className="font-semibold">Add or update a visit:</span> 1) pick the service, 2) choose what members pay,
              3) (optional) set when it unlocks. Re-adding the same service updates it.
            </p>
            <form action={addConsultationRuleAction} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-1.5 lg:col-span-2">
                <span className="gh-field-label">Service (consultation)</span>
                <select name="serviceId" className="gh-select min-w-0" required defaultValue="">
                  <option value="">Select a service…</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({SERVICE_KIND_LABELS[s.kind] ?? s.kind})
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 lg:col-span-2">
                <span className="gh-field-label">What members pay</span>
                <select name="discountMode" className="gh-select min-w-0" defaultValue="NONE">
                  <option value="NONE">Full price (no discount)</option>
                  <option value="PERCENT">Percent discount</option>
                  <option value="FIXED">Fixed price</option>
                  <option value="FREE">Free (included)</option>
                  <option value="UNAVAILABLE">Not available on this plan</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="gh-field-label">Discount %</span>
                <input name="discountPercent" type="number" min="0" max="100" step="0.01" className="gh-input min-w-0" placeholder="e.g. 10" />
                <span className="text-xs text-[var(--color-text-muted)]">Only if &ldquo;Percent discount&rdquo;.</span>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="gh-field-label">Fixed price</span>
                <input name="fixedPrice" type="number" min="0" step="0.01" className="gh-input min-w-0" placeholder="e.g. 15.00" />
                <span className="text-xs text-[var(--color-text-muted)]">Only if &ldquo;Fixed price&rdquo;.</span>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="gh-field-label">Credits used per visit</span>
                <input name="creditsPerUse" type="number" min="1" defaultValue="1" className="gh-input min-w-0" />
                <span className="text-xs text-[var(--color-text-muted)]">If it uses the monthly allowance.</span>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="gh-field-label">Unlock after (months)</span>
                <input name="unlockAfterPaidMonths" type="number" min="0" defaultValue={plan.benefitsUnlockAfterPaidMonths} className="gh-input min-w-0" />
                <span className="text-xs text-[var(--color-text-muted)]">0 = available right away.</span>
              </label>
              <div className="flex flex-col gap-2 pt-1 text-sm lg:col-span-2">
                <span className="gh-field-label">Covered by the plan?</span>
                <label className="flex items-center gap-2" title="Free as part of the plan — no extra charge">
                  <input type="checkbox" name="isIncluded" className="size-4" /> Included free with the plan
                </label>
                <label className="flex items-center gap-2" title="Each visit spends from the monthly credit allowance">
                  <input type="checkbox" name="usesCredits" className="size-4" /> Spends from the monthly visit allowance
                </label>
                <label className="flex items-center gap-2" title="Family members on the plan can use this">
                  <input type="checkbox" name="familyUsable" className="size-4" /> Family members can use it
                </label>
                <span className="text-xs text-[var(--color-text-muted)]">
                  Tip: GP visits are usually &ldquo;included&rdquo; + &ldquo;spends from allowance&rdquo;. Specialist visits usually use a discount above instead.
                </span>
              </div>
              <div className="lg:col-span-4">
                <button type="submit" className="gh-btn gh-btn-secondary">
                  Add / update visit
                </button>
              </div>
            </form>
          </div>
              </AdminCard>
            ),
          },
          {
            id: "perks",
            label: "Extra benefits",
            content: (
              <AdminCard padding={0}>
                <SectionHeader title="Extra benefits (perks)" description="Optional bonuses (e.g. a bigger specialist discount) that switch on automatically once a member has paid for a set number of months." />
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
                      <span className="font-semibold text-[var(--color-text-primary)]">
                        {PERK_LABELS[perk.perkKey] ?? perk.perkKey}
                      </span>
                      <Pill tone="neutral">{UNLOCK_MODE_LABELS[perk.unlockMode] ?? perk.unlockMode}</Pill>
                      {perk.unlockMode === "AFTER_PAID_MONTHS" ? (
                        <Pill tone="draft">@ {perk.unlockAfterPaidMonths}mo</Pill>
                      ) : null}
                    </div>
                    <form action={removePerkAction}>
                      <input type="hidden" name="perkKey" value={perk.perkKey} />
                      <ConfirmDeleteButton
                        message={`Remove the "${PERK_LABELS[perk.perkKey] ?? perk.perkKey}" perk rule?`}
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
                <span className="gh-field-label">Benefit</span>
                <select name="perkKey" className="gh-select min-w-0" required defaultValue="">
                  <option value="">Select a benefit…</option>
                  {PERK_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {PERK_LABELS[k] ?? k}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="gh-field-label">When it switches on</span>
                <select name="unlockMode" className="gh-select min-w-0" defaultValue="MONTH_1">
                  {UNLOCK_MODES.map((m) => (
                    <option key={m} value={m}>
                      {UNLOCK_MODE_LABELS[m] ?? m}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="gh-field-label">After how many months</span>
                <input name="unlockAfterPaidMonths" type="number" min="0" defaultValue={plan.benefitsUnlockAfterPaidMonths} className="gh-input min-w-0" />
                <span className="text-xs text-[var(--color-text-muted)]">Only used with &ldquo;After N paid months&rdquo;.</span>
              </label>
              <div>
                <button type="submit" className="gh-btn gh-btn-secondary">
                  Add / update benefit
                </button>
              </div>
            </form>
          </div>
              </AdminCard>
            ),
          },
          // Home test kits — Premium only (wellness is strictly Premium).
          ...(plan.planType === "PREMIUM"
            ? [{
                id: "kits",
                label: "Home test kits",
                content: (
              <AdminCard padding={0}>
                <SectionHeader title="Home test kits (Premium)" description="Home test kits a member can claim using their monthly wellness credits. They must have an active subscription." />
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
                        message={`Remove the redemption rule for "${rule.healthTest.title}"? This deletes it from the plan.`}
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
                <span className="gh-field-label">Test kit</span>
                <select name="healthTestId" className="gh-select min-w-0" required defaultValue="">
                  <option value="">Select a kit…</option>
                  {healthTests.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="gh-field-label">Wellness credits to claim</span>
                <input name="requiredWellnessCredits" type="number" min="1" defaultValue="6" className="gh-input min-w-0" />
                <span className="text-xs text-[var(--color-text-muted)]">How many credits a member spends for this kit.</span>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="gh-field-label">Unlock after (months)</span>
                <input name="unlockAfterPaidMonths" type="number" min="0" defaultValue="0" className="gh-input min-w-0" />
                <span className="text-xs text-[var(--color-text-muted)]">0 = available right away.</span>
              </label>
              <div className="lg:col-span-4">
                <button type="submit" className="gh-btn gh-btn-secondary">
                  Add / update kit
                </button>
              </div>
            </form>
          </div>
              </AdminCard>
                ),
              }]
            : []),
          {
            id: "text",
            label: "Pricing card text",
            content: (
              <AdminCard padding={0}>
                <SectionHeader title="Pricing card text" description="Exactly what customers read on the card — name, description, and bullet points — in each language. One save covers all languages." />
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
                features: defaultPlanFeatures(plan),
              }}
            />
            <div className="border-t border-[var(--color-border)] pt-6">
              <button type="submit" className="gh-btn gh-btn-primary">
                Save translations
              </button>
            </div>
          </form>
              </AdminCard>
            ),
          },
          {
            id: "preview",
            label: "Preview",
            content: (
              <AdminCard padding={0}>
                <SectionHeader
                  title="Preview"
            description="How the plan looks to a customer once saved. Click a language to preview it."
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
            <p className="mb-4 text-xs text-[var(--color-text-muted)]">
              This is the exact card customers see on the pricing page, in{" "}
              <span className="font-semibold">{previewLocaleUpper}</span>.
              Showing {previewPlan.features.length > 0 ? "your custom bullets" : "the default bullets (no custom bullets set in Pricing card text)"}.
            </p>
            <div className="flex justify-center rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-6 sm:p-10">
              <div className="w-full max-w-sm">
                <PricingPlanCard plan={previewPlan} t={previewBundle.pricing} note={previewBundle.note} ctaHref="#" />
              </div>
            </div>
            {!plan.isActive ? (
              <p className="mt-3 text-xs text-[var(--color-status-error-text)]">
                Note: this plan is set to hidden (not visible to customers). The card above is how it would look once you make it visible.
              </p>
            ) : null}
          </div>
              </AdminCard>
            ),
          },
        ]}
      />
      </div>
    </>
  );
}
