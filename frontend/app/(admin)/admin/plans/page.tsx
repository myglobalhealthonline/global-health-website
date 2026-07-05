import Link from "next/link";
import { revalidatePath } from "next/cache";
import { BadgeCent, Plus, ChevronUp, ChevronDown } from "lucide-react";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { fetchAdminCountries } from "@/lib/admin/admin-api";
import { getActiveCountry } from "@/lib/admin/admin-scope";
import { deleteAdminPlan, fetchAdminPlans, postAdminPlanReorder } from "@/lib/admin/plans-api";
import {
  AdminCard,
  AdminEmptyState,
  AdminSummaryStrip,
  AdminTable,
  Btn,
  IconBtn,
  PageHeader,
  Pill,
  Td,
  Th,
  Thead,
  Tr,
} from "../_components/atoms";
import { ConfirmDeleteButton } from "../_components/confirm-delete-button";
import { PortalMobileCard } from "@/components/PortalMobileCard";

export const dynamic = "force-dynamic";

function formatMoney(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

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
          <div className="gh-admin-plan-table-wrap gh-admin-deep-table-wrap overflow-x-auto">
          <AdminTable>
            <Thead>
              <Th>Plan</Th>
              <Th>Price / mo</Th>
              <Th>Credits (GP / wellness)</Th>
              <Th>What&apos;s set up</Th>
              <Th>Subscribers</Th>
              <Th>Status</Th>
              <Th>Order</Th>
              <Th>Actions</Th>
            </Thead>
            <tbody>
              {plans.map((plan, index) => (
                <Tr key={plan.id}>
                  <Td>
                    <div className="flex flex-col">
                      <span className="font-semibold text-[var(--color-text-primary)]">
                        {plan.name}
                        {plan.isFeatured ? (
                          <span className="ml-2 align-middle">
                            <Pill tone="brand">{plan.badgeLabel ?? "Featured"}</Pill>
                          </span>
                        ) : null}
                      </span>
                      <span className="font-mono text-xs text-[var(--color-text-muted)]">{plan.slug}</span>
                    </div>
                  </Td>
                  <Td>{formatMoney(plan.monthlyPriceCents, plan.currencyCode)}</Td>
                  <Td>
                    {plan.monthlyConsultationCredits} / {plan.wellnessCreditsPerMonth}
                  </Td>
                  <Td>
                    <span className="text-[13px] text-[var(--color-text-muted)]">
                      {plan._count.consultationRules} visits · {plan._count.perkRules} perks
                      {plan._count.healthTestRules > 0 ? ` · ${plan._count.healthTestRules} kits` : ""}
                    </span>
                  </Td>
                  <Td>{plan._count.subscriptions}</Td>
                  <Td>
                    {plan.isActive ? (
                      <Pill tone="active">Active</Pill>
                    ) : (
                      <Pill tone="inactive">Inactive</Pill>
                    )}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      <form action={movePlanAction}>
                        <input type="hidden" name="id" value={plan.id} />
                        <input type="hidden" name="direction" value="up" />
                        <input type="hidden" name="countryId" value={active.id} />
                        <IconBtn type="submit" ariaLabel={`Move ${plan.name} up`} disabled={index === 0}>
                          <ChevronUp className="size-4" />
                        </IconBtn>
                      </form>
                      <form action={movePlanAction}>
                        <input type="hidden" name="id" value={plan.id} />
                        <input type="hidden" name="direction" value="down" />
                        <input type="hidden" name="countryId" value={active.id} />
                        <IconBtn
                          type="submit"
                          ariaLabel={`Move ${plan.name} down`}
                          disabled={index === plans.length - 1}
                        >
                          <ChevronDown className="size-4" />
                        </IconBtn>
                      </form>
                    </div>
                  </Td>
                  <Td>
                    <div className="gh-admin-plan-row-actions flex items-center gap-3">
                      <Link
                        href={`/admin/plans/${plan.id}/edit`}
                        className="text-[13px] font-semibold text-[var(--color-brand-primary)] hover:underline"
                      >
                        Edit
                      </Link>
                      {plan.isActive ? (
                        <form action={deactivatePlanAction}>
                          <input type="hidden" name="id" value={plan.id} />
                          <ConfirmDeleteButton
                            message={`Deactivate "${plan.name}"? Existing subscribers keep their plan; it just hides from new signups.`}
                            className="text-[13px] font-semibold text-[var(--color-status-error-text)] hover:underline"
                          >
                            Deactivate
                          </ConfirmDeleteButton>
                        </form>
                      ) : null}
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </AdminTable>
          </div>
          <div className="gh-admin-mobile-list">
            {plans.map((plan, index) => (
              <PortalMobileCard
                key={plan.id}
                tone={plan.isActive ? "success" : "neutral"}
                title={plan.name}
                subtitle={plan.slug}
                statusPill={
                  <Pill tone={plan.isActive ? "active" : "inactive"}>
                    {plan.isActive ? "Active" : "Inactive"}
                  </Pill>
                }
                meta={[
                  { label: "Price", value: formatMoney(plan.monthlyPriceCents, plan.currencyCode) },
                  { label: "Credits", value: `${plan.monthlyConsultationCredits} / ${plan.wellnessCreditsPerMonth}` },
                  {
                    label: "Rules",
                    value: plan._count.consultationRules + plan._count.perkRules + plan._count.healthTestRules,
                  },
                  { label: "Subscribers", value: plan._count.subscriptions },
                ]}
                actions={
                  <div className="flex items-center gap-2">
                    <form action={movePlanAction}>
                      <input type="hidden" name="id" value={plan.id} />
                      <input type="hidden" name="direction" value="up" />
                      <input type="hidden" name="countryId" value={active.id} />
                      <IconBtn type="submit" ariaLabel={`Move ${plan.name} up`} disabled={index === 0}>
                        <ChevronUp className="size-4" />
                      </IconBtn>
                    </form>
                    <form action={movePlanAction}>
                      <input type="hidden" name="id" value={plan.id} />
                      <input type="hidden" name="direction" value="down" />
                      <input type="hidden" name="countryId" value={active.id} />
                      <IconBtn
                        type="submit"
                        ariaLabel={`Move ${plan.name} down`}
                        disabled={index === plans.length - 1}
                      >
                        <ChevronDown className="size-4" />
                      </IconBtn>
                    </form>
                    <Btn href={`/admin/plans/${plan.id}/edit`} variant="soft" size="sm">Edit plan</Btn>
                  </div>
                }
              />
            ))}
          </div>
        </AdminCard>
        </>
      )}
    </>
  );
}
