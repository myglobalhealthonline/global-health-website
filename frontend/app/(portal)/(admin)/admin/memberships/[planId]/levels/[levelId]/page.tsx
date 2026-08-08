import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowLeft } from "lucide-react";
import { SetCrumbTitle } from "@/components/crumb-title";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { fetchAdminCountryById, fetchAdminServices } from "@/lib/admin/admin-api";
import {
  copyMembershipPrimaryRules,
  createMembershipBenefit,
  deleteMembershipBenefit,
  deleteMembershipLevel,
  fetchMembershipBenefits,
  fetchMembershipPlan,
  putMembershipLevelTranslation,
  updateMembershipBenefit,
  updateMembershipLevel,
} from "@/lib/admin/memberships-api";
import {
  parseMembershipBenefitForm,
  parseMembershipLevelForm,
} from "@/lib/admin/membership-form-parse";
import { displayNameFrom } from "@/lib/admin/display-name";
import { AdminCard, Btn, PageHeader, Pill, SectionHeader } from "../../../../_components/atoms";
import { ConfirmDeleteButton } from "../../../../_components/confirm-delete-button";
import { MembershipBenefitTable } from "../../../_components/membership-benefit-table";
import type { ServiceOption } from "../../../_components/membership-benefit-fields";
import {
  MembershipCountryTabs,
  type CountryTab,
} from "../../../_components/membership-country-tabs";
import { MembershipLevelFields } from "../../../_components/membership-level-form";
import { MembershipTranslationTabs } from "../../../_components/membership-translation-tabs";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ planId: string; levelId: string }>;
  searchParams?: Promise<{
    error?: string;
    success?: string;
    /** Which covered country's benefit rules are being edited (§26). */
    country?: string;
  }>;
};

export default async function AdminMembershipLevelPage({ params, searchParams }: PageProps) {
  const { planId, levelId } = await params;
  const sp = searchParams ? await searchParams : {};

  const planResult = await fetchMembershipPlan(planId);
  if (!planResult.ok) {
    if (planResult.status === 404) notFound();
    return (
      <>
        <PageHeader eyebrow="Memberships" title="Level" />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load this programme: {planResult.message}
          </p>
        </AdminCard>
      </>
    );
  }
  const plan = planResult.data.plan;
  const level = plan.levels.find((l) => l.id === levelId);
  if (!level) notFound();

  // Which covered country's rules are on screen (§26). An unknown or absent
  // `?country=` falls back to the primary, so every pre-phase-7 link still
  // lands somewhere valid.
  const activeCountryId =
    sp.country && plan.countries.some((c) => c.countryId === sp.country)
      ? sp.country
      : plan.primaryCountryId;
  const activeCountry =
    plan.countries.find((c) => c.countryId === activeCountryId)?.country ?? plan.primaryCountry;
  const isPrimaryCountry = activeCountryId === plan.primaryCountryId;

  const [benefitsResult, countryResult, activeCountryResult] = await Promise.all([
    fetchMembershipBenefits(levelId),
    fetchAdminCountryById(plan.primaryCountryId),
    // `fetchAdminCountryById` is request-cached, so this is free when the open
    // tab IS the primary.
    fetchAdminCountryById(activeCountryId),
  ]);
  // §22: a FIXED price is stored in this country's currency and nothing
  // converts it, so the form has to name the currency next to the field —
  // otherwise 800 gets typed into a EUR row by someone thinking in CZK.
  const activeCurrency = activeCountryResult.ok
    ? activeCountryResult.data.country.currency.code
    : null;
  // The list spans every covered country; the editor shows one at a time.
  const allBenefits = benefitsResult.ok ? benefitsResult.data.benefits : [];
  const benefits = allBenefits.filter((b) => b.countryId === activeCountryId);

  const countryTabs: CountryTab[] = plan.countries.map((entry) => ({
    countryId: entry.countryId,
    code: entry.country.code,
    name: entry.country.name,
    isPrimary: entry.countryId === plan.primaryCountryId,
    benefitCount: allBenefits.filter((b) => b.countryId === entry.countryId).length,
  }));

  // The service picker is scoped to the country whose tab is open, not to the
  // plan's primary — a benefit row's service must live in the country that row
  // configures (§21.3), and the composite FK refuses anything else.
  const [generalResult, specialistResult] = await Promise.all([
    fetchAdminServices({ countryId: activeCountryId, kind: "GENERAL", pageSize: "100" }),
    fetchAdminServices({ countryId: activeCountryId, kind: "SPECIALIST", pageSize: "100" }),
  ]);
  const services: ServiceOption[] = [
    ...(generalResult.ok ? generalResult.data.items : []),
    ...(specialistResult.ok ? specialistResult.data.items : []),
  ]
    .map((s) => ({
      id: s.id,
      name: s.name,
      kind: s.kind,
      basePriceCents: s.basePriceCents,
      currencyCode: s.currencyCode,
    }))
    .sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));

  const country = countryResult.ok ? countryResult.data.country : null;
  const defaultLocale = (country?.defaultLocale ?? "EN").toUpperCase();
  const localeTabs = (country?.countryLocales ?? [])
    .map((l) => ({
      code: l.locale.toUpperCase(),
      isDefault: l.locale.toUpperCase() === defaultLocale,
    }))
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.code.localeCompare(b.code));
  const tabs = localeTabs.length > 0 ? localeTabs : [{ code: defaultLocale, isDefault: true }];

  const backTo = `/admin/memberships/${planId}/levels/${levelId}`;
  // Every redirect below has to come back to the tab the admin was on, or
  // saving a Portuguese rule silently returns them to the Irish one. A plain
  // string, not a helper, because an inline server action can close over data
  // but not over a function.
  const countryParam = isPrimaryCountry ? "" : `country=${encodeURIComponent(activeCountryId)}&`;

  async function saveLevelAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const parsed = parseMembershipLevelForm(formData);
    if (!parsed.ok) redirect(`${backTo}?${countryParam}error=${encodeURIComponent(parsed.error)}`);
    const result = await updateMembershipLevel(levelId, parsed.data);
    if (!result.ok) redirect(`${backTo}?${countryParam}error=${encodeURIComponent(result.message)}`);
    revalidatePath(backTo);
    redirect(`${backTo}?${countryParam}success=${encodeURIComponent("Level saved")}`);
  }

  async function saveTranslationsAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    for (const tab of tabs) {
      const name = String(formData.get(`tr_${tab.code}_name`) ?? "").trim();
      const description = String(formData.get(`tr_${tab.code}_description`) ?? "").trim();
      if (!name) continue;
      const result = await putMembershipLevelTranslation(levelId, tab.code, {
        name,
        description: description === "" ? null : description,
      });
      if (!result.ok) redirect(`${backTo}?${countryParam}error=${encodeURIComponent(result.message)}`);
    }
    revalidatePath(backTo);
    redirect(`${backTo}?${countryParam}success=${encodeURIComponent("Translations saved")}`);
  }

  async function addBenefitAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const parsed = parseMembershipBenefitForm(formData);
    if (!parsed.ok) redirect(`${backTo}?${countryParam}error=${encodeURIComponent(parsed.error)}`);
    // The open tab decides which country the row configures. The backend
    // defaults to the primary when this is absent, which is exactly the silent
    // wrong answer once a plan covers more than one country.
    const result = await createMembershipBenefit(levelId, {
      ...parsed.data,
      countryId: activeCountryId,
    });
    if (!result.ok) redirect(`${backTo}?${countryParam}error=${encodeURIComponent(result.message)}`);
    revalidatePath(backTo);
    redirect(`${backTo}?${countryParam}success=${encodeURIComponent("Benefit added")}`);
  }

  /**
   * Copy the primary country's kind-level rules into this one (§26). Additive
   * only: nothing already configured here is touched, and `FIXED` rows are
   * skipped because their amounts are in the primary country's currency and
   * nothing converts money (§39).
   */
  async function copyPrimaryRulesAction() {
    "use server";
    await requireAdminAction();
    const result = await copyMembershipPrimaryRules(planId, activeCountryId);
    if (!result.ok) redirect(`${backTo}?${countryParam}error=${encodeURIComponent(result.message)}`);
    revalidatePath(backTo);
    const { copied, skippedFixed, skippedExisting } = result.data;
    // Both skip reasons, separately: "yours, left alone" and "we cannot convert
    // money" are different answers and an admin has to act on them differently.
    const parts = [`Copied ${copied} rule${copied === 1 ? "" : "s"}`];
    if (skippedFixed > 0) {
      parts.push(
        `${skippedFixed} fixed-price rule${skippedFixed === 1 ? "" : "s"} skipped — set the price in this country's currency yourself`,
      );
    }
    if (skippedExisting > 0) {
      parts.push(`${skippedExisting} already set up here and left alone`);
    }
    redirect(`${backTo}?${countryParam}success=${encodeURIComponent(parts.join(". "))}`);
  }

  // PATCH takes the whole row, not a patch (the invariants are cross-field), so
  // the edit dialog posts exactly what the add form posts plus the id.
  async function editBenefitAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const benefitId = String(formData.get("benefitId") ?? "");
    if (!benefitId) redirect(`${backTo}?${countryParam}error=${encodeURIComponent("Missing benefit")}`);
    const parsed = parseMembershipBenefitForm(formData);
    if (!parsed.ok) redirect(`${backTo}?${countryParam}error=${encodeURIComponent(parsed.error)}`);
    const result = await updateMembershipBenefit(benefitId, parsed.data);
    if (!result.ok) redirect(`${backTo}?${countryParam}error=${encodeURIComponent(result.message)}`);
    revalidatePath(backTo);
    redirect(`${backTo}?${countryParam}success=${encodeURIComponent("Benefit saved")}`);
  }

  async function removeBenefitAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const benefitId = String(formData.get("benefitId") ?? "");
    if (benefitId) {
      const result = await deleteMembershipBenefit(benefitId);
      if (!result.ok) redirect(`${backTo}?${countryParam}error=${encodeURIComponent(result.message)}`);
    }
    revalidatePath(backTo);
    redirect(`${backTo}?${countryParam}success=${encodeURIComponent("Benefit removed")}`);
  }

  async function removeLevelAction() {
    "use server";
    await requireAdminAction();
    const result = await deleteMembershipLevel(levelId);
    if (!result.ok) redirect(`${backTo}?${countryParam}error=${encodeURIComponent(result.message)}`);
    revalidatePath(`/admin/memberships/${planId}`);
    redirect(`/admin/memberships/${planId}?success=${encodeURIComponent("Level deleted")}`);
  }

  const levelTitle = displayNameFrom(level.name, level.translations);
  const canDelete = level._count.enrollments === 0 && plan.levels.length > 1;

  return (
    <>
      <SetCrumbTitle segment={planId} label={displayNameFrom(plan.name, plan.translations)} />
      <SetCrumbTitle label={levelTitle} />
      <Link
        href={`/admin/memberships/${planId}`}
        className="mb-2 inline-flex items-center gap-1.5 text-portal-compact font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to {displayNameFrom(plan.name, plan.translations)}
      </Link>
      <PageHeader
        eyebrow="Membership level"
        title={levelTitle}
        description={`${plan.primaryCountry.name} · ${level._count.enrollments} member${
          level._count.enrollments === 1 ? "" : "s"
        } on this level`}
        actions={
          <div className="flex items-center gap-2">
            {level.isDefault ? <Pill tone="brand">Default</Pill> : null}
            {level.isActive ? <Pill tone="active">Active</Pill> : <Pill tone="inactive">Inactive</Pill>}
          </div>
        }
      />

      {sp.error ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {sp.error}
        </p>
      ) : null}
      {sp.success ? (
        <p className="gh-status-success mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {sp.success}
        </p>
      ) : null}

      <div className="flex flex-col gap-6">
        <AdminCard padding={0}>
          <SectionHeader
            title="Benefits"
            description={
              countryTabs.length > 1
                ? "What this level gives members, per country. A rule for one service always beats the rule for its type, so you can carve a single service out of a broader rule."
                : "What this level gives members. A rule for one service always beats the rule for its type, so you can carve a single service out of a broader rule."
            }
          />
          <MembershipCountryTabs
            tabs={countryTabs}
            activeCountryId={activeCountryId}
            hrefFor={(countryId) =>
              countryId === plan.primaryCountryId
                ? backTo
                : `${backTo}?country=${encodeURIComponent(countryId)}`
            }
          />
          <div className="flex flex-col gap-6 p-6">
            {/* Coverage is not configuration (§20). An empty tab is not "nothing
                to do here" — it is members getting no benefit in a country the
                programme claims to cover, so it is said loudly and once. */}
            {benefits.length === 0 && countryTabs.length > 1 ? (
              <div className="gh-status-warning flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
                <span>
                  <strong>{activeCountry.name} is not configured.</strong> Members get no benefit
                  here at all — not even an included visit from the shared pool.
                </span>
                {!isPrimaryCountry ? (
                  <form action={copyPrimaryRulesAction}>
                    <Btn type="submit" variant="soft" size="sm">
                      Copy {plan.primaryCountry.name}&apos;s rules
                    </Btn>
                  </form>
                ) : null}
              </div>
            ) : null}

            {!isPrimaryCountry && benefits.length > 0 ? (
              <form action={copyPrimaryRulesAction} className="flex justify-end">
                <Btn type="submit" variant="ghost" size="sm">
                  Add anything missing from {plan.primaryCountry.name}
                </Btn>
              </form>
            ) : null}

            <MembershipBenefitTable
              benefits={benefits}
              services={services}
              currencyCode={activeCurrency}
              createBenefitAction={addBenefitAction}
              updateBenefitAction={editBenefitAction}
              deleteBenefitAction={removeBenefitAction}
            />
          </div>
        </AdminCard>

        <AdminCard padding={0}>
          <SectionHeader
            title="Member-facing text"
            description="The level name and description as members read them, per language."
          />
          <form action={saveTranslationsAction} className="flex flex-col gap-6 p-6">
            <MembershipTranslationTabs
              idPrefix="Level"
              locales={tabs}
              defaultLocale={defaultLocale}
              initialTranslations={level.translations.map((t) => ({
                locale: t.locale,
                name: t.name,
                description: t.description,
              }))}
              baseFallback={{ name: level.name, description: null }}
            />
            <div className="flex justify-end border-t border-[var(--color-border)] pt-6">
              <button type="submit" className="gh-btn gh-btn-primary">
                Save translations
              </button>
            </div>
          </form>
        </AdminCard>

        <AdminCard padding={0}>
          <SectionHeader title="Level settings" />
          <form action={saveLevelAction} className="flex flex-col gap-6 p-6">
            <MembershipLevelFields level={level} />
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--color-border)] pt-6">
              <button type="submit" className="gh-btn gh-btn-primary">
                Save level
              </button>
            </div>
          </form>
        </AdminCard>

        {canDelete ? (
          <AdminCard padding={0}>
            <SectionHeader
              title="Delete level"
              description="Only possible while no one has ever been enrolled on it. Otherwise mark it inactive so the history survives."
            />
            <form action={removeLevelAction} className="flex justify-end p-6">
              <ConfirmDeleteButton
                message={`Delete "${levelTitle}"? Its benefits go with it. This cannot be undone.`}
                className="gh-btn gh-btn-ghost text-[var(--color-status-error-text)]"
              >
                Delete level
              </ConfirmDeleteButton>
            </form>
          </AdminCard>
        ) : null}
      </div>

      {!canDelete && level._count.enrollments > 0 ? (
        <p className="mt-4 text-portal-compact text-[var(--color-text-muted)]">
          This level has members, so it can&apos;t be deleted. Untick “Active” above to stop it
          applying to new bookings.
        </p>
      ) : null}

      <div className="mt-6 flex justify-end">
        <Btn href={`/admin/memberships/${planId}`} variant="ghost">
          Done
        </Btn>
      </div>
    </>
  );
}
