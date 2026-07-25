import { revalidatePath } from "next/cache";
import { BadgeCent, Plus } from "lucide-react";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { fetchAdminCountries } from "@/lib/admin/admin-api";
import { getActiveCountry } from "@/lib/admin/admin-scope";
import { deleteAdminPlan, fetchAdminPlans, postAdminPlanReorder } from "@/lib/admin/plans-api";
import { AdminCard, AdminEmptyState, AdminSummaryStrip, Btn, PageHeader } from "../_components/atoms";
import { AdminPlansTable } from "./_components/admin-plans-table";

export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  const countriesResult = await fetchAdminCountries();
  const countries = countriesResult.ok ? countriesResult.data.countries : [];
  const active = await getActiveCountry(countries);

  async function deactivatePlanAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const id = String(formData.get("id") ?? "");
    if (id) await deleteAdminPlan(id);
    revalidatePath("/admin/plans");
  }

  const newHref = active ? `/admin/plans/new?countryId=${encodeURIComponent(active.id)}` : "/admin/plans/new";

  // ponytail: reorder swaps this plan's displayOrder with its neighbor in the
  // already-sorted, already-country-scoped list (see fetchAdminPlans orderBy
  // in plans.service.ts) — no drag-and-drop lib, just two-item PATCH.
  async function movePlanAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const id = String(formData.get("id") ?? "");
    const direction = String(formData.get("direction") ?? "");
    const countryId = String(formData.get("countryId") ?? "");
    if (!id || (direction !== "up" && direction !== "down")) return;

    const result = await fetchAdminPlans({ countryId, includeInactive: "true" });
    if (!result.ok) return;
    const list = result.data.plans;
    const index = list.findIndex((p) => p.id === id);
    if (index === -1) return;
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= list.length) return;

    const current = list[index];
    const neighbor = list[swapIndex];
    await postAdminPlanReorder([
      { id: current.id, displayOrder: neighbor.displayOrder },
      { id: neighbor.id, displayOrder: current.displayOrder },
    ]);
    revalidatePath("/admin/plans");
  }

  if (!active) {
    return (
      <>
        <PageHeader
          eyebrow="Subscriptions"
          title="Plans"
          description="Pick a country in the top bar — plans are configured per country."
        />
        <AdminCard>
          <p className="text-sm text-[var(--color-text-muted)]">
            Select a country from the picker above to manage its subscription plans.
          </p>
        </AdminCard>
      </>
    );
  }

  const plansResult = await fetchAdminPlans({ countryId: active.id, includeInactive: "true" });
  const plans = plansResult.ok ? plansResult.data.plans : [];
  const activePlans = plans.filter((plan) => plan.isActive).length;
  const featuredPlans = plans.filter((plan) => plan.isFeatured).length;
  const subscriberCount = plans.reduce((sum, plan) => sum + plan._count.subscriptions, 0);

  return (
    <>
      <PageHeader
        eyebrow="Subscriptions"
        title="Plans"
        description={`Monthly subscription plans for ${active.name}. Create, configure, reorder, and deactivate.`}
        actions={
          <Btn href={newHref} iconLeft={<Plus className="size-4" />}>
            New plan
          </Btn>
        }
      />

      {!plansResult.ok ? (
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load plans: {plansResult.message}
          </p>
        </AdminCard>
      ) : plans.length === 0 ? (
        <AdminCard>
          <AdminEmptyState
            icon={<BadgeCent className="size-8" aria-hidden />}
            title={`No plans yet for ${active.name}`}
            description="Create a plan to define monthly pricing, consultation credits, wellness benefits, and public subscription positioning."
            action={<Btn href={newHref} variant="soft" size="sm">Create first plan</Btn>}
          />
        </AdminCard>
      ) : (
        <>
        <AdminSummaryStrip
          items={[
            { label: "Plans", value: plans.length, hint: `${activePlans} active`, tone: "brand" },
            { label: "Featured", value: featuredPlans, hint: "Highlighted to patients", tone: "success" },
            { label: "Subscribers", value: subscriberCount, hint: "Across visible and inactive plans", tone: "neutral" },
          ]}
        />
        <AdminCard padding={0} className="gh-admin-plan-list overflow-hidden">
          <AdminPlansTable
            plans={plans}
            countryId={active.id}
            movePlanAction={movePlanAction}
            deactivatePlanAction={deactivatePlanAction}
          />
        </AdminCard>
        </>
      )}
    </>
  );
}
