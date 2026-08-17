import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Building2, Plus } from "lucide-react";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import {
  corporateDoctorMarkets,
  deleteCorporatePlanService,
  deleteCorporateRule,
  fetchCorporateCompanies,
  fetchCorporatePlans,
  patchCorporatePlan,
  patchCorporatePlanService,
  patchCorporateRule,
  postCorporatePlanRule,
  postCorporatePlanService,
  type CorporateCoverage,
  type CorporatePlanServiceRole,
  type CorporateRuleInput,
  type CorporateServiceKind,
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
import {
  COVERAGE_LABELS,
  PLAN_SERVICE_ROLE_LABELS,
  RULE_TARGET_LABELS,
  companyStatusLabel,
  companyStatusTone,
  formatCents,
  ruleLabel,
} from "./_lib";

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
  const sortOrder = Number(formData.get("sortOrder"));
  const result = await patchCorporatePlan(planId, {
    annualPricePerEmployeeCents: Math.round(priceEuros * 100),
    ...(Number.isFinite(maxBeneficiaries) && maxBeneficiaries >= 0
      ? { maxBeneficiariesPerEmployee: Math.round(maxBeneficiaries) }
      : {}),
    // Blank clears the field rather than storing an empty string — the matrix
    // renders these, and "" would print an empty tier chip.
    tier: String(formData.get("tier") ?? "").trim() || null,
    priceNote: String(formData.get("priceNote") ?? "").trim() || null,
    ...(Number.isFinite(sortOrder) && sortOrder >= 0 ? { sortOrder: Math.round(sortOrder) } : {}),
  });
  if (!result.ok) {
    redirect(`/admin/corporate?error=${encodeURIComponent(result.message)}`);
  }
  revalidatePath("/admin/corporate");
  redirect(`/admin/corporate?success=${encodeURIComponent("Plan updated")}`);
}

/**
 * Coverage fields shared by the create + edit rule forms. Returns the payload,
 * or a message when the combination cannot price anything — the API rejects
 * those too, but catching it here names the field instead of the row.
 */
function readRuleForm(formData: FormData): CorporateRuleInput | { error: string } {
  const coverage = String(formData.get("coverage") ?? "DISCOUNT") as CorporateCoverage;
  const discountPercent = Number(formData.get("discountPercent") ?? 0);
  const copayEuros = String(formData.get("copayAmount") ?? "").trim();
  const annualLimitRaw = String(formData.get("annualLimit") ?? "").trim();
  const annualLimit = annualLimitRaw ? Number(annualLimitRaw) : null;

  if (coverage === "DISCOUNT" && (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent > 100)) {
    return { error: "A discount rule needs a percentage between 1 and 100" };
  }
  if (coverage === "COPAY" && (!copayEuros || !Number.isFinite(Number(copayEuros)) || Number(copayEuros) < 0)) {
    return { error: "A co-pay rule needs the amount the member pays" };
  }
  if (annualLimit != null && (!Number.isFinite(annualLimit) || annualLimit < 1)) {
    return { error: "An annual limit must be 1 or more — leave it blank for unlimited" };
  }
  return {
    coverage,
    // Always sent: the column is required. Only read for DISCOUNT.
    discountPercent: coverage === "DISCOUNT" && Number.isFinite(discountPercent) ? discountPercent : 0,
    copayCents: coverage === "COPAY" ? Math.round(Number(copayEuros) * 100) : null,
    annualLimit,
    limitGroup: String(formData.get("limitGroup") ?? "").trim() || null,
    appliesToBeneficiaries: formData.get("appliesToBeneficiaries") === "on",
    isActive: formData.get("isActive") === "on",
  };
}

async function updateRuleAction(formData: FormData) {
  "use server";
  await requireAdminAction();
  const ruleId = String(formData.get("ruleId") ?? "").trim();
  const input = readRuleForm(formData);
  if (!ruleId || "error" in input) {
    redirect(
      `/admin/corporate?error=${encodeURIComponent("error" in input ? input.error : "Rule not found")}`,
    );
  }
  const result = await patchCorporateRule(ruleId, input);
  if (!result.ok) {
    redirect(`/admin/corporate?error=${encodeURIComponent(result.message)}`);
  }
  revalidatePath("/admin/corporate");
  redirect(`/admin/corporate?success=${encodeURIComponent("Benefit rule updated")}`);
}

async function addRuleAction(formData: FormData) {
  "use server";
  await requireAdminAction();
  const planId = String(formData.get("planId") ?? "").trim();
  const target = String(formData.get("target") ?? "").trim();
  const input = readRuleForm(formData);
  if (!planId || !target || "error" in input) {
    redirect(
      `/admin/corporate?error=${encodeURIComponent(
        "error" in input ? input.error : "Choose what the rule covers",
      )}`,
    );
  }
  // A pinned service id wins over the kind select: pinning is per-country, so
  // the admin pastes the Service id they mean rather than picking from a list of
  // every service in every market.
  const serviceId = String(formData.get("serviceId") ?? "").trim() || null;
  const result = await postCorporatePlanRule(planId, {
    ...input,
    serviceId,
    serviceKind: serviceId ? null : (target as CorporateServiceKind),
  });
  if (!result.ok) {
    redirect(`/admin/corporate?error=${encodeURIComponent(result.message)}`);
  }
  revalidatePath("/admin/corporate");
  redirect(`/admin/corporate?success=${encodeURIComponent("Benefit rule added")}`);
}

async function removeRuleAction(formData: FormData) {
  "use server";
  await requireAdminAction();
  const ruleId = String(formData.get("ruleId") ?? "").trim();
  if (ruleId) await deleteCorporateRule(ruleId);
  revalidatePath("/admin/corporate");
  redirect(`/admin/corporate?success=${encodeURIComponent("Benefit rule removed")}`);
}

async function addPlanServiceAction(formData: FormData) {
  "use server";
  await requireAdminAction();
  const planId = String(formData.get("planId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const doctorId = String(formData.get("doctorId") ?? "").trim();
  const countryCode = String(formData.get("countryCode") ?? "").trim();
  const durationMinutes = Number(formData.get("durationMinutes"));
  const role = String(formData.get("role") ?? "INCLUDED") as CorporatePlanServiceRole;
  if (!planId || !name || !doctorId) {
    redirect(
      `/admin/corporate?error=${encodeURIComponent("Name and assigned doctor are required")}`,
    );
  }
  const result = await postCorporatePlanService(planId, {
    name,
    doctorId,
    role,
    countryCode: countryCode || null,
    durationMinutes:
      Number.isFinite(durationMinutes) && durationMinutes > 0 ? Math.round(durationMinutes) : 30,
  });
  if (!result.ok) {
    redirect(`/admin/corporate?error=${encodeURIComponent(result.message)}`);
  }
  revalidatePath("/admin/corporate");
  redirect(`/admin/corporate?success=${encodeURIComponent("Consultation added to plan")}`);
}

async function updatePlanServiceAction(formData: FormData) {
  "use server";
  await requireAdminAction();
  const id = String(formData.get("planServiceId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const doctorId = String(formData.get("doctorId") ?? "").trim();
  const countryCode = String(formData.get("countryCode") ?? "").trim();
  const durationMinutes = Number(formData.get("durationMinutes"));
  const role = String(formData.get("role") ?? "INCLUDED") as CorporatePlanServiceRole;
  if (!id || !name || !doctorId) {
    redirect(
      `/admin/corporate?error=${encodeURIComponent("Name and assigned doctor are required")}`,
    );
  }
  const result = await patchCorporatePlanService(id, {
    name,
    doctorId,
    role,
    countryCode: countryCode || null,
    // An unchecked checkbox posts nothing, so absence means "off" here.
    isActive: formData.get("isActive") === "on",
    ...(Number.isFinite(durationMinutes) && durationMinutes > 0
      ? { durationMinutes: Math.round(durationMinutes) }
      : {}),
  });
  if (!result.ok) {
    redirect(`/admin/corporate?error=${encodeURIComponent(result.message)}`);
  }
  revalidatePath("/admin/corporate");
  redirect(`/admin/corporate?success=${encodeURIComponent("Consultation updated")}`);
}

async function removePlanServiceAction(formData: FormData) {
  "use server";
  await requireAdminAction();
  const id = String(formData.get("planServiceId") ?? "").trim();
  if (id) await deleteCorporatePlanService(id);
  revalidatePath("/admin/corporate");
  redirect(`/admin/corporate?success=${encodeURIComponent("Consultation removed from plan")}`);
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
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Tier</span>
                  <input
                    name="tier"
                    className="gh-input w-32"
                    maxLength={60}
                    placeholder="Premium"
                    defaultValue={plan.tier ?? ""}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  {/* The range is not monotonic in price — Basic + (€350) sits
                      above Standard (€180) — so matrix order is explicit. */}
                  <span className="gh-field-label">Matrix order</span>
                  <input
                    type="number"
                    name="sortOrder"
                    min={0}
                    max={999}
                    step={1}
                    className="gh-input w-24"
                    defaultValue={plan.sortOrder}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Price note</span>
                  <input
                    name="priceNote"
                    className="gh-input w-72"
                    maxLength={240}
                    placeholder="Price pending — season delays"
                    defaultValue={plan.priceNote ?? ""}
                  />
                </label>
                <Btn type="submit" variant="secondary" size="sm">
                  Save plan
                </Btn>
                <span className="text-portal-meta text-[var(--color-text-muted)]">
                  Currently {formatCents(plan.annualPricePerEmployeeCents, plan.currencyCode)} per
                  employee per year
                </span>
              </form>
            </div>
            <div className="border-t border-[var(--color-border)] px-5 py-4">
              <p className="gh-field-label mb-1">Corporate consultations</p>
              <p className="mb-3 text-portal-meta text-[var(--color-text-muted)]">
                Free for enrolled members and booked only from the member
                portal — never listed publicly, never charged, and never part
                of a doctor payout. Each one runs on its assigned doctor&rsquo;s
                ordinary availability.
              </p>
              {plan.includedServices.length === 0 ? (
                <p className="mb-3 text-sm text-[var(--color-text-muted)]">
                  No consultations yet — add the ones this plan includes.
                </p>
              ) : (
                <ul className="m-0 mb-4 flex list-none flex-col gap-2 p-0">
                  {plan.includedServices.map((ps) => (
                    <li key={ps.id}>
                      <form
                        action={updatePlanServiceAction}
                        className="flex flex-wrap items-end gap-3"
                      >
                        <input type="hidden" name="planServiceId" value={ps.id} />
                        <label className="flex flex-col gap-1">
                          <span className="gh-field-label">Name</span>
                          <input
                            name="name"
                            className="gh-input w-64"
                            required
                            maxLength={240}
                            defaultValue={ps.name}
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="gh-field-label">Assigned doctor</span>
                          <select
                            name="doctorId"
                            className="gh-select w-64"
                            defaultValue={ps.doctorId}
                          >
                            {plansResult.data.doctorOptions.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.fullName} — {corporateDoctorMarkets(opt)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="gh-field-label">Country</span>
                          <select
                            name="countryCode"
                            className="gh-select w-44"
                            defaultValue={ps.countryCode ?? ""}
                          >
                            <option value="">All countries</option>
                            {plansResult.data.countryOptions.map((opt) => (
                              <option key={opt.code} value={opt.code}>
                                {opt.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="gh-field-label">Duration (min)</span>
                          <input
                            type="number"
                            name="durationMinutes"
                            className="gh-input w-28"
                            min={5}
                            max={240}
                            step={5}
                            defaultValue={ps.durationMinutes}
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="gh-field-label">Role</span>
                          <select name="role" className="gh-select w-56" defaultValue={ps.role}>
                            {Object.entries(PLAN_SERVICE_ROLE_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="inline-flex items-center gap-1.5 pb-2 text-portal-compact text-[var(--color-text-muted)]">
                          <input type="checkbox" name="isActive" defaultChecked={ps.isActive} />
                          Active
                        </label>
                        <Btn type="submit" variant="secondary" size="sm">
                          Save
                        </Btn>
                      </form>
                      <form action={removePlanServiceAction} className="mt-1">
                        <input type="hidden" name="planServiceId" value={ps.id} />
                        <Btn type="submit" variant="ghost" size="sm">
                          Remove
                        </Btn>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
              <form action={addPlanServiceAction} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="planId" value={plan.id} />
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Consultation name</span>
                  <input
                    name="name"
                    className="gh-input w-64"
                    required
                    maxLength={240}
                    placeholder="Fit-for-Work Consultation"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Assigned doctor</span>
                  <select name="doctorId" className="gh-select w-64" required defaultValue="">
                    <option value="" disabled>
                      Choose a doctor…
                    </option>
                    {plansResult.data.doctorOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.fullName} — {corporateDoctorMarkets(opt)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Country</span>
                  {/* Blank = every market the plan serves. A pinned country
                      must be one of the markets listed next to the assigned
                      doctor (primary or an extra listing) — the API refuses
                      the pair otherwise. */}
                  <select name="countryCode" className="gh-select w-44" defaultValue="">
                    <option value="">All countries</option>
                    {plansResult.data.countryOptions.map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Duration (min)</span>
                  <input
                    type="number"
                    name="durationMinutes"
                    className="gh-input w-28"
                    min={5}
                    max={240}
                    step={5}
                    defaultValue={30}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Role</span>
                  <select name="role" className="gh-select w-56" defaultValue="INCLUDED">
                    {Object.entries(PLAN_SERVICE_ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <Btn type="submit" variant="secondary" size="sm">
                  Add consultation
                </Btn>
              </form>
            </div>
            <div className="border-t border-[var(--color-border)] px-5 py-4">
              <p className="gh-field-label mb-1">Coverage rules</p>
              <p className="mb-3 text-portal-meta text-[var(--color-text-muted)]">
                What the plan does to the price of a PUBLIC catalogue
                consultation. Included = free, co-pay = the member pays that
                fixed amount whatever the service costs, discount = a
                percentage off. A service with no rule is simply not covered.
                When two rules could apply, the one that leaves the member
                paying least wins.
              </p>
              {plan.benefitRules.length === 0 ? (
                <p className="mb-3 text-sm text-[var(--color-text-muted)]">
                  No coverage rules yet — run the corporate seed, or add one below.
                </p>
              ) : (
                <ul className="m-0 mb-4 flex list-none flex-col gap-3 p-0">
                  {plan.benefitRules.map((rule) => (
                    <li key={rule.id}>
                      <form
                        action={updateRuleAction}
                        className="flex flex-wrap items-end gap-3"
                      >
                        <input type="hidden" name="ruleId" value={rule.id} />
                        <span className="min-w-[16rem] pb-2 text-sm font-semibold text-[var(--color-text-primary)]">
                          {ruleLabel(rule, plan.currencyCode)}
                        </span>
                        <label className="flex flex-col gap-1">
                          <span className="gh-field-label">Coverage</span>
                          <select
                            name="coverage"
                            className="gh-select w-40"
                            defaultValue={rule.coverage}
                          >
                            {Object.entries(COVERAGE_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="gh-field-label">Discount %</span>
                          <input
                            type="number"
                            name="discountPercent"
                            min={0}
                            max={100}
                            step="0.5"
                            defaultValue={rule.discountPercent}
                            className="gh-input w-24"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="gh-field-label">
                            Co-pay ({plan.currencyCode})
                          </span>
                          <input
                            type="number"
                            name="copayAmount"
                            min={0}
                            step="0.01"
                            className="gh-input w-28"
                            defaultValue={
                              rule.copayCents == null ? "" : (rule.copayCents / 100).toFixed(2)
                            }
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="gh-field-label">Limit / year</span>
                          <input
                            type="number"
                            name="annualLimit"
                            min={1}
                            max={365}
                            step={1}
                            placeholder="∞"
                            className="gh-input w-24"
                            defaultValue={rule.annualLimit ?? ""}
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          {/* Same group on two rules = ONE shared counter, which
                              is how "physiotherapy or chiropractic, up to 5x"
                              is 5 across both. */}
                          <span className="gh-field-label">Shared limit group</span>
                          <input
                            name="limitGroup"
                            className="gh-input w-40"
                            maxLength={60}
                            placeholder="physio-chiro"
                            defaultValue={rule.limitGroup ?? ""}
                          />
                        </label>
                        <label className="inline-flex items-center gap-1.5 pb-2 text-portal-compact text-[var(--color-text-muted)]">
                          <input
                            type="checkbox"
                            name="appliesToBeneficiaries"
                            defaultChecked={rule.appliesToBeneficiaries}
                          />
                          Families
                        </label>
                        <label className="inline-flex items-center gap-1.5 pb-2 text-portal-compact text-[var(--color-text-muted)]">
                          <input type="checkbox" name="isActive" defaultChecked={rule.isActive} />
                          Active
                        </label>
                        <Btn type="submit" variant="secondary" size="sm">
                          Save
                        </Btn>
                      </form>
                      <form action={removeRuleAction} className="mt-1">
                        <input type="hidden" name="ruleId" value={rule.id} />
                        <Btn type="submit" variant="ghost" size="sm">
                          Remove
                        </Btn>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
              <form action={addRuleAction} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="planId" value={plan.id} />
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Covers</span>
                  <select name="target" className="gh-select w-56" defaultValue="GENERAL">
                    {Object.entries(RULE_TARGET_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">…or pin one service (id)</span>
                  <input
                    name="serviceId"
                    className="gh-input w-56"
                    maxLength={40}
                    placeholder="cmr85udfk0000ckjuyy97rf4l"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Coverage</span>
                  <select name="coverage" className="gh-select w-40" defaultValue="DISCOUNT">
                    {Object.entries(COVERAGE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Discount %</span>
                  <input
                    type="number"
                    name="discountPercent"
                    min={0}
                    max={100}
                    step="0.5"
                    className="gh-input w-24"
                    defaultValue={15}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Co-pay ({plan.currencyCode})</span>
                  <input
                    type="number"
                    name="copayAmount"
                    min={0}
                    step="0.01"
                    className="gh-input w-28"
                    placeholder="20.00"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Limit / year</span>
                  <input
                    type="number"
                    name="annualLimit"
                    min={1}
                    max={365}
                    step={1}
                    placeholder="∞"
                    className="gh-input w-24"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Shared limit group</span>
                  <input
                    name="limitGroup"
                    className="gh-input w-40"
                    maxLength={60}
                    placeholder="physio-chiro"
                  />
                </label>
                <label className="inline-flex items-center gap-1.5 pb-2 text-portal-compact text-[var(--color-text-muted)]">
                  <input type="checkbox" name="appliesToBeneficiaries" defaultChecked />
                  Families
                </label>
                <label className="inline-flex items-center gap-1.5 pb-2 text-portal-compact text-[var(--color-text-muted)]">
                  <input type="checkbox" name="isActive" defaultChecked />
                  Active
                </label>
                <Btn type="submit" variant="secondary" size="sm">
                  Add rule
                </Btn>
              </form>
              <p className="mt-2 text-portal-meta text-[var(--color-text-muted)]">
                Pinning to one service — the physiotherapy / chiropractic co-pay,
                for example — needs the Service id, because a service row exists
                per country. Copy it from the service&rsquo;s admin page.
              </p>
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
            <span className="ml-auto text-portal-compact text-[var(--color-text-muted)]">
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
                      <span className="font-mono text-portal-meta">{c.countryCode.toUpperCase()}</span>
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
