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
  putAdminPlanTranslation,
} from "@/lib/admin/plans-api";
import { parsePlanForm } from "@/lib/admin/plan-form-parse";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import type { LocaleCode } from "@/lib/i18n/types";
import type { PublicPlan } from "@/data/pricing-plans";
import { PricingPlanCard } from "@/app/[country]/[lang]/pricing/_components/PricingPlanCard";
import { PlanFields, PLAN_TYPE_LABEL } from "../../../_components/plan-fields";
import { PlanConsultationsFields } from "../../../_components/plan-consultations-fields";
import { PlanTranslationTabs } from "../../../_components/plan-translation-tabs";
import { PlanEditTabs } from "../../../_components/plan-edit-tabs";
import { AdminCard, Btn, PageHeader, Pill, SectionHeader } from "../../../_components/atoms";
import { ConfirmDeleteButton } from "../../../_components/confirm-delete-button";
import { displayNameFrom } from "@/lib/admin/display-name";
import { SetCrumbTitle } from "@/components/crumb-title";

export const dynamic = "force-dynamic";

// Perk rules are no longer authored here: only WELLNESS_REDEMPTION and
// TEST_KIT_REDEMPTION are read at runtime (redemption.service.ts), and with no
// perk row redemption is unlocked by default. The other three keys never
// affected pricing — the specialist discount lives on the Consultations tab.
// These labels remain so pre-existing rows can be read and removed.
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

  // Only the two consultation kinds can ever carry a plan benefit — checkout
  // plan-prices GENERAL_CONSULTATION / SPECIALIST_CONSULTATION lines only, and
  // §36.11 rejects PRESCRIPTION outright.
  const services = (servicesResult.ok ? servicesResult.data.items : []).filter(
    (s) => s.kind === "GENERAL" || s.kind === "SPECIALIST",
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
    // Admin preview only — never reaches a sitemap, so it carries no date.
    updatedAt: null,
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

  /**
   * Reconcile every consultation rule from the two tick-lists in one submit.
   *
   * The plan-level choice is the source of truth: a ticked GP service becomes a
   * credit rule, a ticked specialist service takes its own percent discount or
   * fixed price, and an unticked service loses its rule entirely (so it prices
   * at full price). `unlockAfterPaidMonths` is always 0 — the resolver takes
   * max(plan floor, rule), so the plan-level setting is the only timing knob.
   */
  async function saveConsultationsAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const fail = (message: string): never =>
      redirect(`/admin/plans/${id}/edit?error=${encodeURIComponent(message)}`);

    const gpChecked = new Set(formData.getAll("gpServiceIds").map(String));
    const specialistChecked = new Set(formData.getAll("specialistServiceIds").map(String));
    const creditsPerUse = Number(formData.get("creditsPerUse") ?? 1) || 1;

    /** Per-service fixed price in cents. Blank / 0 / junk = not set. */
    const fixedPriceCentsFor = (serviceId: string): number | null => {
      const raw = String(formData.get(`fixedPrice_${serviceId}`) ?? "").trim();
      if (raw === "") return null;
      const value = Number(raw);
      if (!Number.isFinite(value) || value <= 0) return null;
      return Math.round(value * 100);
    };

    /** Per-service discount percentage. Blank / 0 / out of range = not set. */
    const discountPercentFor = (serviceId: string): number | null => {
      const raw = String(formData.get(`discountPercent_${serviceId}`) ?? "").trim();
      if (raw === "") return null;
      const value = Number(raw);
      if (!Number.isFinite(value) || value <= 0 || value > 100) return null;
      return value;
    };

    // Every ticked specialist service needs one of the two prices.
    const unpriced = services.filter(
      (s) =>
        specialistChecked.has(s.id) &&
        fixedPriceCentsFor(s.id) === null &&
        discountPercentFor(s.id) === null,
    );
    if (unpriced.length > 0) {
      fail(
        `Set a discount % (1-100) or a fixed price for: ${unpriced.map((s) => s.name).join(", ")}.`,
      );
    }

    // A rule is only rewritten when something actually changed — an unchanged
    // plan saves nothing and existing subscribers' snapshots stay untouched.
    const existingByService = new Map(plan.consultationRules.map((r) => [r.serviceId, r]));
    const errors: string[] = [];

    for (const service of services) {
      const existing = existingByService.get(service.id);
      const wantsCredit = service.kind === "GENERAL" && gpChecked.has(service.id);
      const wantsDiscount = service.kind === "SPECIALIST" && specialistChecked.has(service.id);

      if (!wantsCredit && !wantsDiscount) {
        if (existing) {
          const result = await deleteAdminPlanConsultationRule(id, service.id);
          if (!result.ok) errors.push(`${service.name}: ${result.message}`);
        }
        continue;
      }

      // A fixed price wins over a percentage when both are filled in.
      const fixed = wantsDiscount ? fixedPriceCentsFor(service.id) : null;
      const percent = wantsDiscount && fixed === null ? discountPercentFor(service.id) : null;
      const body = {
        serviceId: service.id,
        isIncluded: wantsCredit,
        usesCredits: wantsCredit,
        creditsPerUse: wantsCredit ? creditsPerUse : 1,
        discountMode: wantsDiscount ? (fixed !== null ? "FIXED" : "PERCENT") : "NONE",
        discountPercent: percent,
        fixedPriceCents: fixed,
        unlockAfterPaidMonths: 0,
        // Family usage is a plan-level property (Premium-only); the backend
        // forces this false on non-Premium plans anyway.
        familyUsable: plan.familyEnabled,
        isActive: true,
      };
      const unchanged =
        existing &&
        existing.isActive &&
        existing.isIncluded === body.isIncluded &&
        existing.usesCredits === body.usesCredits &&
        existing.creditsPerUse === body.creditsPerUse &&
        existing.discountMode === body.discountMode &&
        (existing.discountPercent ?? null) === body.discountPercent &&
        (existing.fixedPriceCents ?? null) === body.fixedPriceCents &&
        existing.unlockAfterPaidMonths === 0 &&
        existing.familyUsable === body.familyUsable;
      if (unchanged) continue;

      const result = await postAdminPlanConsultationRule(id, body);
      if (!result.ok) errors.push(`${service.name}: ${result.message}`);
    }

    revalidatePath(`/admin/plans/${id}/edit`);
    redirect(
      `/admin/plans/${id}/edit?${errors.length ? `error=${encodeURIComponent(errors.join("; "))}` : "success=Consultations+saved"}`,
    );
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
      <SetCrumbTitle label={displayNameFrom(plan.name, plan.translations)} />
      <Link
        href="/admin/plans"
        className="mb-2 inline-flex items-center gap-1.5 text-portal-compact font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to plans
      </Link>
      <PageHeader
        eyebrow="Subscriptions"
        title={displayNameFrom(plan.name, plan.translations)}
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

      <p className="gh-admin-plan-editor-note mb-4 text-sm text-[var(--color-text-muted)]">
        Set up the plan one tab at a time. Each tab saves on its own — press the button inside it.
        Existing subscribers keep their current terms until renewal.
      </p>

      <div className="gh-admin-plan-editor">
      <PlanEditTabs
        defaultTabId={sp.previewLocale ? "preview" : undefined}
        tabs={[
          {
            id: "basics",
            label: "Plan & price",
            content: (
              <AdminCard padding={0}>
                <SectionHeader title="Plan & price" description="Name, monthly price, the monthly allowance, and how the card looks. Saving updates billing automatically." />
          <form action={updatePlanAction} className="flex flex-col gap-8 p-6">
            <PlanFields countries={countries} initial={plan} pinnedCountryId={plan.countryId} />
            <div className="flex justify-end border-t border-[var(--color-border)] pt-6">
              <button type="submit" className="gh-btn gh-btn-primary">
                Save plan
              </button>
            </div>
          </form>
              </AdminCard>
            ),
          },
          {
            id: "consultations",
            label: "Consultations",
            content: (
              <AdminCard padding={0}>
                <SectionHeader
                  title="Consultations"
                  description="What the plan covers: which GP visits the monthly allowance pays for, and the plan's specialist discount. Prescriptions are never covered."
                />
                <form action={saveConsultationsAction} className="flex flex-col gap-6 p-6">
                  <PlanConsultationsFields
                    services={services}
                    rules={plan.consultationRules}
                    benefitsUnlockAfterPaidMonths={plan.benefitsUnlockAfterPaidMonths}
                  />
                  <div className="flex justify-end border-t border-[var(--color-border)] pt-6">
                    <button type="submit" className="gh-btn gh-btn-primary">
                      Save consultations
                    </button>
                  </div>
                </form>

                {/* Perk rows predate the plan-level model above. Nothing here can
                    be added any more — only WELLNESS_REDEMPTION / TEST_KIT_REDEMPTION
                    still gate anything, and with no row redemption is open by
                    default. Shown so leftovers can be cleared. */}
                {plan.perkRules.length > 0 ? (
                  <div className="border-t border-[var(--color-border)] p-6">
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                      Old benefit rules
                    </h3>
                    <p className="mb-3 text-xs text-[var(--color-text-muted)]">
                      Left over from the previous editor. Only the two redemption rules still do
                      anything (they gate home test kits); the rest have no effect on pricing and
                      can be removed.
                    </p>
                    <ul className="flex flex-col gap-2">
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
                            {perk.perkKey === "WELLNESS_REDEMPTION" || perk.perkKey === "TEST_KIT_REDEMPTION" ? (
                              <Pill tone="active">gates test kits</Pill>
                            ) : (
                              <Pill tone="inactive">no effect</Pill>
                            )}
                          </div>
                          <form action={removePerkAction}>
                            <input type="hidden" name="perkKey" value={perk.perkKey} />
                            <ConfirmDeleteButton
                              message={`Remove the "${PERK_LABELS[perk.perkKey] ?? perk.perkKey}" rule?`}
                              className="text-portal-compact font-semibold text-[var(--color-status-error-text)] hover:underline"
                            >
                              Remove
                            </ConfirmDeleteButton>
                          </form>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
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
                        className="text-portal-compact font-semibold text-[var(--color-status-error-text)] hover:underline"
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
                <input
                  name="unlockAfterPaidMonths"
                  type="number"
                  min="0"
                  defaultValue={plan.benefitsUnlockAfterPaidMonths}
                  className="gh-input min-w-0"
                />
                <span className="text-xs text-[var(--color-text-muted)]">
                  Matches the plan&apos;s unlock setting. Kit redemption has its own gate — it does
                  not inherit the plan-level one.
                </span>
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
            <div className="flex justify-end border-t border-[var(--color-border)] pt-6">
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
