import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Building2, Plus } from "lucide-react";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import {
  fetchCorporateCompanies,
  fetchCorporatePlans,
  patchCorporatePlan,
  patchCorporateRule,
} from "@/lib/admin/admin-api/corporate";
import {
  AdminCard,
  AdminEmptyState,
  AdminTable,
  Btn,
  PageHeader,
  Pill,
  SectionHeader,
  Td,
  Th,
  Thead,
  Tr,
} from "../_components/atoms";
import { companyStatusLabel, companyStatusTone, formatCents, ruleLabel } from "./_lib";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ query?: string; status?: string; success?: string; error?: string }>;
};

async function updatePlanAction(formData: FormData) {
  "use server";
  await requireAdminAction();
  const planId = String(formData.get("planId") ?? "").trim();
  const priceEuros = Number(formData.get("annualPricePerEmployee"));
  const maxBeneficiaries = Number(formData.get("maxBeneficiariesPerEmployee"));
  if (!planId || !Number.isFinite(priceEuros) || priceEuros < 0) {
    redirect(`/admin/corporate?error=${encodeURIComponent("Enter a valid annual price")}`);
  }
  const result = await patchCorporatePlan(planId, {
    annualPricePerEmployeeCents: Math.round(priceEuros * 100),
    ...(Number.isFinite(maxBeneficiaries) && maxBeneficiaries >= 0
      ? { maxBeneficiariesPerEmployee: Math.round(maxBeneficiaries) }
      : {}),
  });
  if (!result.ok) {
    redirect(`/admin/corporate?error=${encodeURIComponent(result.message)}`);
  }
  revalidatePath("/admin/corporate");
  redirect(`/admin/corporate?success=${encodeURIComponent("Plan updated")}`);
}

async function updateRuleAction(formData: FormData) {
  "use server";
  await requireAdminAction();
  const ruleId = String(formData.get("ruleId") ?? "").trim();
  const discountPercent = Number(formData.get("discountPercent"));
  if (!ruleId || !Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    redirect(`/admin/corporate?error=${encodeURIComponent("Discount must be between 0 and 100")}`);
  }
  const result = await patchCorporateRule(ruleId, {
    discountPercent,
    appliesToBeneficiaries: formData.get("appliesToBeneficiaries") === "on",
  });
  if (!result.ok) {
    redirect(`/admin/corporate?error=${encodeURIComponent(result.message)}`);
  }
  revalidatePath("/admin/corporate");
  redirect(`/admin/corporate?success=${encodeURIComponent("Benefit rule updated")}`);
}

export default async function AdminCorporatePage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const [plansResult, companiesResult] = await Promise.all([
    fetchCorporatePlans(),
    fetchCorporateCompanies({ query: sp.query, status: sp.status }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Global"
        title="Corporate"
        description="Private corporate plan — companies, employee benefits, and the shared Corporate Standard plan."
        actions={
          <Btn
            href="/admin/corporate/new"
            variant="primary"
            size="md"
            iconLeft={<Plus className="size-3.5" aria-hidden />}
          >
            New company
          </Btn>
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

      {/* ── Plan card ─────────────────────────────────────────── */}
      {!plansResult.ok ? (
        <AdminCard className="mb-5">
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load corporate plans: {plansResult.message}
          </p>
        </AdminCard>
      ) : (
        plansResult.data.plans.map((plan) => (
          <AdminCard key={plan.id} padding={0} className="mb-5 overflow-hidden">
            <SectionHeader
              title={`${plan.name} plan`}
              description={`${plan._count.companies} companies · max ${plan.maxBeneficiariesPerEmployee} beneficiaries per employee`}
              right={
                <Pill tone={plan.isActive ? "active" : "inactive"}>
                  {plan.isActive ? "Active" : "Inactive"}
                </Pill>
              }
            />
            <div className="border-t border-[var(--color-border)] px-5 py-4">
              <form
                action={updatePlanAction}
                className="flex flex-wrap items-end gap-3"
              >
                <input type="hidden" name="planId" value={plan.id} />
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">
                    Annual price / employee ({plan.currencyCode})
                  </span>
                  <input
                    type="number"
                    name="annualPricePerEmployee"
                    min={0}
                    step="0.01"
                    defaultValue={(plan.annualPricePerEmployeeCents / 100).toFixed(2)}
                    className="gh-input w-40"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Max beneficiaries / employee</span>
                  <input
                    type="number"
                    name="maxBeneficiariesPerEmployee"
                    min={0}
                    max={20}
                    step={1}
                    defaultValue={plan.maxBeneficiariesPerEmployee}
                    className="gh-input w-40"
                    required
                  />
                </label>
                <Btn type="submit" variant="secondary" size="sm">
                  Save plan
                </Btn>
                <span className="text-[12px] text-[var(--color-text-muted)]">
                  Currently {formatCents(plan.annualPricePerEmployeeCents, plan.currencyCode)} per
                  employee per year
                </span>
              </form>
            </div>
            <div className="border-t border-[var(--color-border)] px-5 py-4">
              <p className="gh-field-label mb-3">Benefit rules</p>
              {plan.benefitRules.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">
                  No benefit rules yet — run the corporate seed.
                </p>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                  {plan.benefitRules.map((rule) => (
                    <li key={rule.id}>
                      <form
                        action={updateRuleAction}
                        className="flex flex-wrap items-center gap-3"
                      >
                        <input type="hidden" name="ruleId" value={rule.id} />
                        <span className="min-w-[18rem] text-sm font-semibold text-[var(--color-text-primary)]">
                          {ruleLabel(rule)}
                        </span>
                        {!rule.isActive ? <Pill tone="inactive">Inactive</Pill> : null}
                        <label className="inline-flex items-center gap-1.5 text-[13px] text-[var(--color-text-muted)]">
                          Discount %
                          <input
                            type="number"
                            name="discountPercent"
                            min={0}
                            max={100}
                            step="0.5"
                            defaultValue={rule.discountPercent}
                            className="gh-input w-24"
                            required
                          />
                        </label>
                        <label className="inline-flex items-center gap-1.5 text-[13px] text-[var(--color-text-muted)]">
                          <input
                            type="checkbox"
                            name="appliesToBeneficiaries"
                            defaultChecked={rule.appliesToBeneficiaries}
                          />
                          Applies to beneficiaries
                        </label>
                        <Btn type="submit" variant="ghost" size="sm">
                          Save rule
                        </Btn>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </AdminCard>
        ))
      )}

      {/* ── Companies ─────────────────────────────────────────── */}
      <AdminCard padding={0} className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-border)] px-5 py-3.5">
          <form method="get" className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              name="query"
              placeholder="Search companies…"
              defaultValue={sp.query ?? ""}
              className="gh-input w-56"
            />
            <select name="status" defaultValue={sp.status ?? ""} className="gh-select">
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="EXPIRED">Expired</option>
            </select>
            <Btn type="submit" variant="ghost" size="sm">
              Filter
            </Btn>
          </form>
          {companiesResult.ok ? (
            <span className="ml-auto text-[13px] text-[var(--color-text-muted)]">
              {companiesResult.data.companies.length} companies
            </span>
          ) : null}
        </div>

        {!companiesResult.ok ? (
          <p className="gh-status-warning m-5 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load companies: {companiesResult.message}
          </p>
        ) : companiesResult.data.companies.length === 0 ? (
          <AdminEmptyState
            icon={<Building2 className="size-8" aria-hidden />}
            title="No corporate companies"
            description="Onboard a company to grant its employees corporate benefits."
            action={
              <Btn href="/admin/corporate/new" variant="soft" size="sm">
                New company
              </Btn>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <AdminTable>
              <Thead>
                <Th>Name</Th>
                <Th>Country</Th>
                <Th>Plan</Th>
                <Th>Status</Th>
                <Th align="right">Employees</Th>
                <Th align="right">Beneficiaries</Th>
                <Th>Admin login</Th>
                <Th>Created</Th>
              </Thead>
              <tbody>
                {companiesResult.data.companies.map((c) => (
                  <Tr key={c.id}>
                    <Td>
                      <a
                        href={`/admin/corporate/${c.id}`}
                        className="font-bold text-[var(--color-text-primary)] hover:underline"
                      >
                        {c.name}
                      </a>
                    </Td>
                    <Td>
                      <span className="font-mono text-[12px]">{c.countryCode.toUpperCase()}</span>
                    </Td>
                    <Td>{c.planName}</Td>
                    <Td>
                      <Pill tone={companyStatusTone(c.status)}>
                        {companyStatusLabel(c.status)}
                      </Pill>
                    </Td>
                    <Td align="right">{c.employeeCount}</Td>
                    <Td align="right">{c.beneficiaryCount}</Td>
                    <Td>
                      <span aria-label={c.hasAdminLogin ? "Has admin login" : "No admin login"}>
                        {c.hasAdminLogin ? "✓" : "✗"}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-[var(--color-text-muted)]">
                        {new Date(c.createdAt).toLocaleDateString("en-IE", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </AdminTable>
          </div>
        )}
      </AdminCard>
    </>
  );
}
