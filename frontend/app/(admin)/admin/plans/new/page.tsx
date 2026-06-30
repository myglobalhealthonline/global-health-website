import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowLeft } from "lucide-react";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { fetchAdminCountries } from "@/lib/admin/admin-api";
import { postAdminPlan } from "@/lib/admin/plans-api";
import { parsePlanForm, type PlanType } from "@/lib/admin/plan-form-parse";
import { PlanFields } from "../../_components/plan-fields";
import { AdminCard, Btn, PageHeader } from "../../_components/atoms";

export const dynamic = "force-dynamic";

const PLAN_TYPES: { value: PlanType; label: string; blurb: string }[] = [
  { value: "ESSENTIAL", label: "Essential Care", blurb: "1 GP credit / month. No wellness." },
  { value: "COMPREHENSIVE", label: "Comprehensive Care", blurb: "2 GP credits / month. No wellness." },
  { value: "PREMIUM", label: "Premium Wellness Care", blurb: "3 GP credits / month + wellness credits + health-kit redemption." },
];

type PageProps = { searchParams?: Promise<{ countryId?: string; planType?: string; error?: string }> };

export default async function AdminNewPlanPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const countryId = sp.countryId?.trim();
  const planType = PLAN_TYPES.some((t) => t.value === sp.planType)
    ? (sp.planType as PlanType)
    : undefined;
  const createError = sp.error;

  const countriesResult = await fetchAdminCountries();
  if (!countriesResult.ok) {
    return (
      <>
        <PageHeader eyebrow="Subscriptions" title="New plan" />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load countries: {countriesResult.message}
          </p>
        </AdminCard>
      </>
    );
  }
  const countries = countriesResult.data.countries.map((c) => ({ id: c.id, code: c.code, name: c.name }));

  if (!countryId) {
    return (
      <>
        <PageHeader
          eyebrow="Subscriptions"
          title="New plan"
          description="Choose a country first — plans are configured per country."
          actions={
            <Btn href="/admin/plans" variant="ghost" iconLeft={<ArrowLeft className="size-3.5" />}>
              Cancel
            </Btn>
          }
        />
        <AdminCard>
          <form method="get" className="gh-admin-plan-country-form flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">Country</span>
              <select name="countryId" className="gh-select min-w-[240px]" required defaultValue="">
                <option value="">Select…</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code.toUpperCase()})
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="gh-btn gh-btn-primary">
              Continue
            </button>
          </form>
        </AdminCard>
      </>
    );
  }

  // Step 2 — pick the plan type (immutable after create; sets defaults + which
  // sections show). Carries countryId forward.
  if (!planType) {
    return (
      <>
        <PageHeader
          eyebrow="Subscriptions"
          title="New plan — choose a tier"
          description="Pick the plan tier. This sets the defaults and which sections appear, and can't be changed after the plan is created."
          actions={
            <Btn href="/admin/plans" variant="ghost" iconLeft={<ArrowLeft className="size-3.5" />}>
              Cancel
            </Btn>
          }
        />
        <AdminCard>
          <form method="get" className="gh-admin-plan-type-form flex flex-col gap-3">
            <input type="hidden" name="countryId" value={countryId} />
            {PLAN_TYPES.map((t) => (
              <button
                key={t.value}
                type="submit"
                name="planType"
                value={t.value}
                className="gh-admin-plan-type-card flex flex-col items-start gap-0.5 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] px-4 py-3 text-left transition-colors hover:border-[var(--color-brand-accent)] hover:bg-[var(--color-surface-2)]"
              >
                <span className="font-semibold text-[var(--color-text-primary)]">{t.label}</span>
                <span className="text-[13px] text-[var(--color-text-muted)]">{t.blurb}</span>
              </button>
            ))}
          </form>
        </AdminCard>
      </>
    );
  }

  async function createPlanAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const qs = `countryId=${encodeURIComponent(countryId ?? "")}&planType=${encodeURIComponent(planType ?? "")}`;
    const parsed = parsePlanForm(formData, { includeCountry: true });
    if (!parsed.ok) {
      redirect(`/admin/plans/new?${qs}&error=${encodeURIComponent(parsed.error)}`);
    }
    const result = await postAdminPlan(parsed.data);
    if (!result.ok) {
      redirect(`/admin/plans/new?${qs}&error=${encodeURIComponent(result.message)}`);
    }
    revalidatePath("/admin/plans");
    redirect(`/admin/plans/${result.data.plan.id}/edit?success=${encodeURIComponent("Plan created — billing set up. Now add doctor visits, perks, and card text below.")}`);
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
        title="New plan — basics & price"
        description="Fill in the name, price, and what's included. Billing is set up automatically when you save. You'll add doctor visits, perks, and card text on the next screen."
        actions={
          <Btn href="/admin/plans" variant="ghost">
            Cancel
          </Btn>
        }
      />
      {createError ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">{createError}</p>
      ) : null}
      <AdminCard>
        <form action={createPlanAction} className="gh-admin-plan-form flex flex-col gap-8">
          <PlanFields countries={countries} pinnedCountryId={countryId} planType={planType} />
          <div className="gh-admin-plan-actions flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] pt-6">
            <button type="submit" className="gh-btn gh-btn-primary">
              Create plan
            </button>
            <Link
              href="/admin/plans"
              className="text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              Cancel
            </Link>
          </div>
        </form>
      </AdminCard>
    </>
  );
}
