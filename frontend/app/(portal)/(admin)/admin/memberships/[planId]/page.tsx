import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowLeft, Plus } from "lucide-react";
import { SetCrumbTitle } from "@/components/crumb-title";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { fetchAdminCountries, fetchAdminCountryById } from "@/lib/admin/admin-api";
import {
  addMembershipPlanCountry,
  createMembershipLevel,
  fetchMembershipPlan,
  putMembershipPlanTranslation,
  removeMembershipPlanCountry,
  updateMembershipPlan,
} from "@/lib/admin/memberships-api";
import {
  parseMembershipLevelForm,
  parseMembershipPlanForm,
} from "@/lib/admin/membership-form-parse";
import { displayNameFrom } from "@/lib/admin/display-name";
import { AdminCard, Btn, PageHeader, Pill, SectionHeader } from "../../_components/atoms";
import { MembershipPlanCountries } from "../_components/membership-plan-countries";
import { MembershipPlanFields } from "../_components/membership-plan-form";
import { MembershipTranslationTabs } from "../_components/membership-translation-tabs";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ planId: string }>;
  searchParams?: Promise<{ error?: string; success?: string }>;
};

export default async function AdminMembershipPlanPage({ params, searchParams }: PageProps) {
  const { planId } = await params;
  const sp = searchParams ? await searchParams : {};

  const planResult = await fetchMembershipPlan(planId);
  if (!planResult.ok) {
    if (planResult.status === 404) notFound();
    return (
      <>
        <PageHeader eyebrow="Memberships" title="Programme" />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load this programme: {planResult.message}
          </p>
        </AdminCard>
      </>
    );
  }
  const plan = planResult.data.plan;

  const countryResult = await fetchAdminCountryById(plan.primaryCountryId);
  const country = countryResult.ok ? countryResult.data.country : null;
  const defaultLocale = (country?.defaultLocale ?? "EN").toUpperCase();
  // Tabs come from the country's own enabled locales, so a market that turns on
  // a language gets it here with no code change (§18 open item 1).
  const localeTabs = (country?.countryLocales ?? [])
    .map((l) => ({ code: l.locale.toUpperCase(), isDefault: l.locale.toUpperCase() === defaultLocale }))
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.code.localeCompare(b.code));
  const tabs = localeTabs.length > 0 ? localeTabs : [{ code: defaultLocale, isDefault: true }];

  // Candidates for the covered-country manager. Commission markets (Brazil) are
  // included since 2026-08-16: a fully covered line simply shows a commission of
  // zero on the fiscal document, which is what was collected, and the doctor is
  // still paid in full out of the membership fee.
  const countriesResult = await fetchAdminCountries();
  const covered = new Set(plan.countries.map((c) => c.countryId));
  const addableCountries = (countriesResult.ok ? countriesResult.data.countries : [])
    .filter((c) => c.isActive && !covered.has(c.id))
    .map((c) => ({ id: c.id, code: c.code, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const backTo = `/admin/memberships/${planId}`;

  async function addCountryAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const countryId = String(formData.get("countryId") ?? "");
    if (!countryId) redirect(`${backTo}?error=${encodeURIComponent("Select a country")}`);
    const result = await addMembershipPlanCountry(planId, countryId);
    if (!result.ok) redirect(`${backTo}?error=${encodeURIComponent(result.message)}`);
    revalidatePath(backTo);
    redirect(
      `${backTo}?success=${encodeURIComponent(
        "Country added. Set up its benefits — until you do, members get nothing there",
      )}`,
    );
  }

  async function removeCountryAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const countryId = String(formData.get("countryId") ?? "");
    if (!countryId) redirect(`${backTo}?error=${encodeURIComponent("Select a country")}`);
    const result = await removeMembershipPlanCountry(planId, countryId);
    if (!result.ok) redirect(`${backTo}?error=${encodeURIComponent(result.message)}`);
    revalidatePath(backTo);
    // The cascade count is surfaced, not buried: removing coverage deletes that
    // country's benefit rules, and an admin should not discover that by
    // re-adding the country to an empty tab.
    const removed = result.data.removedBenefits;
    redirect(
      `${backTo}?success=${encodeURIComponent(
        removed > 0
          ? `Country removed, along with ${removed} benefit rule${removed === 1 ? "" : "s"}. Existing bookings keep their price`
          : "Country removed. Existing bookings keep their price",
      )}`,
    );
  }

  async function savePlanAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const parsed = parseMembershipPlanForm(formData);
    if (!parsed.ok) redirect(`${backTo}?error=${encodeURIComponent(parsed.error)}`);
    const result = await updateMembershipPlan(planId, parsed.data);
    if (!result.ok) redirect(`${backTo}?error=${encodeURIComponent(result.message)}`);
    revalidatePath(backTo);
    revalidatePath("/admin/memberships");
    redirect(`${backTo}?success=${encodeURIComponent("Programme saved")}`);
  }

  async function saveTranslationsAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    for (const tab of tabs) {
      const name = String(formData.get(`tr_${tab.code}_name`) ?? "").trim();
      const description = String(formData.get(`tr_${tab.code}_description`) ?? "").trim();
      // An empty name means "no translation for this language" — the member
      // surface falls back to the country default, so skip rather than write a
      // blank row the backend would reject anyway.
      if (!name) continue;
      const result = await putMembershipPlanTranslation(planId, tab.code, {
        name,
        description: description === "" ? null : description,
      });
      if (!result.ok) redirect(`${backTo}?error=${encodeURIComponent(result.message)}`);
    }
    revalidatePath(backTo);
    redirect(`${backTo}?success=${encodeURIComponent("Translations saved")}`);
  }

  async function addLevelAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const parsed = parseMembershipLevelForm(formData);
    if (!parsed.ok) redirect(`${backTo}?error=${encodeURIComponent(parsed.error)}`);
    const result = await createMembershipLevel(planId, parsed.data);
    if (!result.ok) redirect(`${backTo}?error=${encodeURIComponent(result.message)}`);
    revalidatePath(backTo);
    redirect(`/admin/memberships/${planId}/levels/${result.data.level.id}`);
  }

  const title = displayNameFrom(plan.name, plan.translations);

  return (
    <>
      <SetCrumbTitle label={title} />
      <Link
        href="/admin/memberships"
        className="mb-2 inline-flex items-center gap-1.5 text-portal-compact font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to memberships
      </Link>
      <PageHeader
        eyebrow="Memberships"
        title={title}
        description={`${plan.primaryCountry.name} · ${plan._count.enrollments} member${
          plan._count.enrollments === 1 ? "" : "s"
        }`}
        actions={plan.isActive ? <Pill tone="active">Active</Pill> : <Pill tone="inactive">Inactive</Pill>}
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
            title="Members"
            description="Who is on this programme, and the partner list import."
          />
          <div className="flex flex-wrap items-center gap-3 p-6">
            <span className="text-sm text-[var(--color-text-muted)]">
              {plan._count.enrollments} member{plan._count.enrollments === 1 ? "" : "s"} enrolled
            </span>
            <div className="ml-auto flex gap-2">
              <Btn href={`/admin/memberships/${planId}/usage`} variant="ghost" size="sm">
                Usage report
              </Btn>
              <Btn href={`/admin/memberships/${planId}/import`} variant="ghost" size="sm">
                Import CSV
              </Btn>
              <Btn href={`/admin/memberships/${planId}/members`} variant="soft" size="sm">
                Manage members
              </Btn>
            </div>
          </div>
        </AdminCard>

        {/* Where the programme works. Above levels, because a level's benefit
            tabs come from this list. */}
        <AdminCard padding={0}>
          <SectionHeader
            title="Countries covered"
            description="Where members can use this programme. Benefits are configured per country inside each level — a country listed here with no rules gives members nothing."
          />
          <MembershipPlanCountries
            plan={plan}
            addable={addableCountries}
            addAction={addCountryAction}
            removeAction={removeCountryAction}
          />
        </AdminCard>

        {/* Levels — the thing an admin usually came here to configure. */}
        <AdminCard padding={0}>
          <SectionHeader
            title="Levels"
            description="Each level is a tier with its own benefits. Every programme keeps at least one, and one of them is the default used when an import doesn't name a level."
          />
          <div className="flex flex-col gap-3 p-6">
            {plan.levels.map((level) => (
              <div
                key={level.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] px-4 py-3"
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {displayNameFrom(level.name, level.translations)}
                    {level.isDefault ? (
                      <span className="ml-2 align-middle">
                        <Pill tone="brand">Default</Pill>
                      </span>
                    ) : null}
                    {!level.isActive ? (
                      <span className="ml-2 align-middle">
                        <Pill tone="inactive">Inactive</Pill>
                      </span>
                    ) : null}
                  </span>
                  <span className="text-portal-compact text-[var(--color-text-muted)]">
                    {level._count.benefits} benefit{level._count.benefits === 1 ? "" : "s"} ·{" "}
                    {level._count.enrollments} member{level._count.enrollments === 1 ? "" : "s"}
                    {level.familyEnabled
                      ? ` · family up to ${level.maxDependents} (${
                          level.allowancePool === "SHARED" ? "shared pool" : "own pool each"
                        })`
                      : ""}
                  </span>
                </div>
                <Btn href={`/admin/memberships/${planId}/levels/${level.id}`} variant="soft" size="sm">
                  Edit level
                </Btn>
              </div>
            ))}

            <form action={addLevelAction} className="flex flex-wrap items-end gap-3 border-t border-[var(--color-border)] pt-4">
              <label className="flex flex-col gap-1.5">
                <span className="gh-field-label">New level name</span>
                <input name="name" className="gh-input min-w-[200px]" required maxLength={200} placeholder="Gold" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="gh-field-label">Slug</span>
                <input
                  name="slug"
                  className="gh-input font-mono min-w-[160px]"
                  required
                  minLength={2}
                  maxLength={60}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  placeholder="gold"
                />
              </label>
              <input type="hidden" name="isActive" value="on" />
              <div className="ml-auto">
                <Btn type="submit" iconLeft={<Plus className="size-4" />}>
                  Add level
                </Btn>
              </div>
            </form>
          </div>
        </AdminCard>

        {/* Member-facing copy. */}
        <AdminCard padding={0}>
          <SectionHeader
            title="Member-facing text"
            description="What the member reads on their membership page and card, per language. One save covers every language."
          />
          <form action={saveTranslationsAction} className="flex flex-col gap-6 p-6">
            <MembershipTranslationTabs
              idPrefix="Programme"
              locales={tabs}
              defaultLocale={defaultLocale}
              initialTranslations={plan.translations.map((t) => ({
                locale: t.locale,
                name: t.name,
                description: t.description,
              }))}
              baseFallback={{ name: plan.name, description: null }}
            />
            <div className="flex justify-end border-t border-[var(--color-border)] pt-6">
              <button type="submit" className="gh-btn gh-btn-primary">
                Save translations
              </button>
            </div>
          </form>
        </AdminCard>

        {/* Settings + payer metadata last: set once, rarely revisited. */}
        <AdminCard>
          <form action={savePlanAction} className="flex flex-col gap-8">
            <MembershipPlanFields countries={[plan.primaryCountry]} initial={plan} />
            <div className="flex justify-end border-t border-[var(--color-border)] pt-6">
              <button type="submit" className="gh-btn gh-btn-primary">
                Save programme
              </button>
            </div>
          </form>
        </AdminCard>
      </div>
    </>
  );
}
