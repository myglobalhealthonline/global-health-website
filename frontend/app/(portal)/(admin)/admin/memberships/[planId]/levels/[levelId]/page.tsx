import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowLeft } from "lucide-react";
import { SetCrumbTitle } from "@/components/crumb-title";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { fetchAdminCountryById, fetchAdminServices } from "@/lib/admin/admin-api";
import {
  createMembershipBenefit,
  deleteMembershipBenefit,
  deleteMembershipLevel,
  fetchMembershipBenefits,
  fetchMembershipPlan,
  putMembershipLevelTranslation,
  updateMembershipLevel,
} from "@/lib/admin/memberships-api";
import {
  parseMembershipBenefitForm,
  parseMembershipLevelForm,
} from "@/lib/admin/membership-form-parse";
import { displayNameFrom } from "@/lib/admin/display-name";
import { AdminCard, Btn, PageHeader, Pill, SectionHeader } from "../../../../_components/atoms";
import { ConfirmDeleteButton } from "../../../../_components/confirm-delete-button";
import { MembershipBenefitTable, type ServiceOption } from "../../../_components/membership-benefit-table";
import { MembershipLevelFields } from "../../../_components/membership-level-form";
import { MembershipTranslationTabs } from "../../../_components/membership-translation-tabs";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ planId: string; levelId: string }>;
  searchParams?: Promise<{ error?: string; success?: string }>;
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

  const [benefitsResult, countryResult] = await Promise.all([
    fetchMembershipBenefits(levelId),
    fetchAdminCountryById(plan.countryId),
  ]);
  const benefits = benefitsResult.ok ? benefitsResult.data.benefits : [];

  // The service picker is scoped to the plan's country and to consultations —
  // the same two rules the backend enforces (§18, cross-country leakage), so an
  // admin can't pick something that will bounce.
  const [generalResult, specialistResult] = await Promise.all([
    fetchAdminServices({ countryId: plan.countryId, kind: "GENERAL", pageSize: "100" }),
    fetchAdminServices({ countryId: plan.countryId, kind: "SPECIALIST", pageSize: "100" }),
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

  async function saveLevelAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const parsed = parseMembershipLevelForm(formData);
    if (!parsed.ok) redirect(`${backTo}?error=${encodeURIComponent(parsed.error)}`);
    const result = await updateMembershipLevel(levelId, parsed.data);
    if (!result.ok) redirect(`${backTo}?error=${encodeURIComponent(result.message)}`);
    revalidatePath(backTo);
    redirect(`${backTo}?success=${encodeURIComponent("Level saved")}`);
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
      if (!result.ok) redirect(`${backTo}?error=${encodeURIComponent(result.message)}`);
    }
    revalidatePath(backTo);
    redirect(`${backTo}?success=${encodeURIComponent("Translations saved")}`);
  }

  async function addBenefitAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const parsed = parseMembershipBenefitForm(formData);
    if (!parsed.ok) redirect(`${backTo}?error=${encodeURIComponent(parsed.error)}`);
    const result = await createMembershipBenefit(levelId, parsed.data);
    if (!result.ok) redirect(`${backTo}?error=${encodeURIComponent(result.message)}`);
    revalidatePath(backTo);
    redirect(`${backTo}?success=${encodeURIComponent("Benefit added")}`);
  }

  async function removeBenefitAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const benefitId = String(formData.get("benefitId") ?? "");
    if (benefitId) {
      const result = await deleteMembershipBenefit(benefitId);
      if (!result.ok) redirect(`${backTo}?error=${encodeURIComponent(result.message)}`);
    }
    revalidatePath(backTo);
    redirect(`${backTo}?success=${encodeURIComponent("Benefit removed")}`);
  }

  async function removeLevelAction() {
    "use server";
    await requireAdminAction();
    const result = await deleteMembershipLevel(levelId);
    if (!result.ok) redirect(`${backTo}?error=${encodeURIComponent(result.message)}`);
    revalidatePath(`/admin/memberships/${planId}`);
    redirect(`/admin/memberships/${planId}?success=${encodeURIComponent("Level deleted")}`);
  }

  const levelTitle = displayNameFrom(level.name, level.translations);
  const canDelete = level._count.enrollments === 0 && plan.levels.length > 1;

  return (
    <>
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
        description={`${plan.country.name} · ${level._count.enrollments} member${
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
            description="What this level gives members. A rule for one service always beats the rule for its type, so you can carve a single service out of a broader rule."
          />
          <div className="p-6">
            <MembershipBenefitTable
              benefits={benefits}
              services={services}
              createBenefitAction={addBenefitAction}
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
