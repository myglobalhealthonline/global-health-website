import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { SITE_CACHE_TAGS } from "@/lib/api/site-content-api";
import {
  fetchAdminCountryById,
  fetchAdminInsuranceCompanies,
  fetchAdminInsuranceCoverage,
  createAdminInsuranceCompany,
  updateAdminInsuranceCompany,
  deleteAdminInsuranceCompany,
  putAdminInsuranceCoverage,
} from "@/lib/admin/admin-api";
import {
  AdminCard,
  AdminTable,
  Btn,
  PageHeader,
  Pill,
  Td,
  Th,
  Thead,
  Tr,
} from "../../../_components/atoms";
import { FlagBadge } from "../../../_components/flag-badge";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string; edit?: string; company?: string }>;
};

function centsToInput(cents: number | null): string {
  return cents == null ? "" : (cents / 100).toFixed(2);
}

function formatMoney(cents: number | null, currency: string | null): string {
  if (cents == null) return "—";
  const amount = (cents / 100).toFixed(2);
  return currency ? `${amount} ${currency}` : amount;
}

export default async function CountryInsuranceCompaniesAdmin({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};

  const [countryRes, companiesRes] = await Promise.all([
    fetchAdminCountryById(id),
    fetchAdminInsuranceCompanies(id),
  ]);

  if (!countryRes.ok) {
    return (
      <>
        <PageHeader eyebrow="Country" title="Insurance companies" />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            {countryRes.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const c = countryRes.data.country;
  const companies = companiesRes.ok ? companiesRes.data.insuranceCompanies : [];
  const base = `/admin/countries/${id}/insurance-companies`;

  // Editing an existing company, opening the "new" form, or managing coverage.
  const editId = sp.edit ?? null;
  const editCompany = editId ? companies.find((co) => co.id === editId) ?? null : null;
  const isNewForm = editId === "";

  const companyIdForCoverage = sp.company ?? null;
  const coverageRes = companyIdForCoverage
    ? await fetchAdminInsuranceCoverage(id, companyIdForCoverage)
    : null;
  const coverageCompany = companyIdForCoverage
    ? companies.find((co) => co.id === companyIdForCoverage) ?? null
    : null;

  async function saveCompanyAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const companyId = String(formData.get("companyId") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const pricingMode = String(formData.get("pricingMode") ?? "FIXED") === "PERCENT" ? "PERCENT" : "FIXED";
    const percentRaw = String(formData.get("discountPercent") ?? "").trim();
    if (!name) {
      redirect(`${base}?error=${encodeURIComponent("Company name is required")}`);
    }
    if (pricingMode === "PERCENT" && percentRaw === "") {
      redirect(`${base}?error=${encodeURIComponent("A discount % is required for percentage companies")}`);
    }
    const body = {
      name,
      pricingMode,
      discountPercent: pricingMode === "PERCENT" ? Math.round(Number(percentRaw) || 0) : null,
      isActive: formData.get("isActive") === "on",
      sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
    };
    const result = companyId
      ? await updateAdminInsuranceCompany(id, companyId, body)
      : await createAdminInsuranceCompany(id, body);
    if (!result.ok) {
      redirect(`${base}?error=${encodeURIComponent(result.message)}`);
    }
    revalidateTag(SITE_CACHE_TAGS.countryServices(c.code), "max");
    revalidateTag(SITE_CACHE_TAGS.globalServices(), "max");
    redirect(`${base}?success=${encodeURIComponent("Insurance company saved")}`);
  }

  async function deleteCompanyAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const companyId = String(formData.get("companyId") ?? "");
    if (companyId) {
      const result = await deleteAdminInsuranceCompany(id, companyId);
      if (!result.ok) {
        redirect(`${base}?error=${encodeURIComponent(result.message)}`);
      }
    }
    revalidateTag(SITE_CACHE_TAGS.countryServices(c.code), "max");
    revalidateTag(SITE_CACHE_TAGS.globalServices(), "max");
    redirect(`${base}?success=${encodeURIComponent("Insurance company deleted")}`);
  }

  async function saveCoverageAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const companyId = String(formData.get("companyId") ?? "");
    const serviceIds = String(formData.get("serviceIds") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const items = serviceIds.map((serviceId) => {
      const covered = formData.get(`covered_${serviceId}`) === "on";
      const priceRaw = String(formData.get(`price_${serviceId}`) ?? "").trim();
      const overridePriceCents = priceRaw === "" ? null : Math.round(Number(priceRaw) * 100);
      return { serviceId, covered, overridePriceCents };
    });
    const result = await putAdminInsuranceCoverage(id, companyId, { items });
    if (!result.ok) {
      redirect(`${base}?company=${companyId}&error=${encodeURIComponent(result.message)}`);
    }
    revalidateTag(SITE_CACHE_TAGS.countryServices(c.code), "max");
    revalidateTag(SITE_CACHE_TAGS.globalServices(), "max");
    redirect(`${base}?company=${companyId}&success=${encodeURIComponent("Coverage saved")}`);
  }

  return (
    <>
      <Link
        href={`/admin/countries/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to {c.name}
      </Link>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <FlagBadge code={c.code} size={14} />
            {c.name}
          </span>
        }
        title="Insurance companies"
        description="Register insurance companies for this market. Each covers selected services at a negotiated price — a fixed amount per service, or a percentage discount off the base price."
        actions={
          <Btn href={`${base}?edit=`} variant="primary" size="md">
            <Plus className="size-3.5" /> New company
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

      <AdminCard padding={0} className="overflow-hidden">
        <div className="overflow-x-auto">
          <AdminTable>
            <Thead>
              <Th>Name</Th>
              <Th>Pricing</Th>
              <Th>Services</Th>
              <Th>Status</Th>
              <Th align="right">Actions</Th>
            </Thead>
            <tbody>
              {companies.length === 0 ? (
                <Tr>
                  <Td>
                    <span className="text-[12px] text-[var(--color-text-muted)]">
                      No insurance companies yet.
                    </span>
                  </Td>
                  <Td></Td>
                  <Td></Td>
                  <Td></Td>
                  <Td></Td>
                </Tr>
              ) : (
                companies.map((co) => (
                  <Tr key={co.id}>
                    <Td>{co.name}</Td>
                    <Td>
                      {co.pricingMode === "PERCENT"
                        ? `${co.discountPercent ?? 0}% discount`
                        : "Fixed price"}
                    </Td>
                    <Td>{co._count?.coverages ?? 0}</Td>
                    <Td>
                      <Pill tone={co.isActive ? "published" : "inactive"}>
                        {co.isActive ? "Active" : "Inactive"}
                      </Pill>
                    </Td>
                    <Td align="right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`${base}?company=${co.id}`} className="gh-btn gh-btn-soft text-[12px]">
                          Manage services
                        </Link>
                        <Link href={`${base}?edit=${co.id}`} className="gh-btn gh-btn-soft text-[12px]">
                          Edit
                        </Link>
                        <form action={deleteCompanyAction} className="inline">
                          <input type="hidden" name="companyId" value={co.id} />
                          <button
                            type="submit"
                            className="gh-btn gh-btn-danger flex items-center gap-1 text-[12px]"
                            aria-label={`Delete ${co.name}`}
                          >
                            <Trash2 className="size-3" aria-hidden />
                          </button>
                        </form>
                      </div>
                    </Td>
                  </Tr>
                ))
              )}
            </tbody>
          </AdminTable>
        </div>
      </AdminCard>

      {editId !== null ? (
        <AdminCard className="mt-4">
          <h3
            className="m-0 text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
          >
            {editCompany ? "Edit" : "New"} insurance company
          </h3>
          <form action={saveCompanyAction} className="mt-4 grid gap-4">
            <input type="hidden" name="companyId" value={editCompany?.id ?? ""} />
            <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Company name</span>
                <input
                  name="name"
                  defaultValue={editCompany?.name ?? ""}
                  placeholder="MediCare Seguros"
                  className="gh-input"
                  required
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Sort order</span>
                <input
                  name="sortOrder"
                  type="number"
                  min={0}
                  max={9999}
                  defaultValue={editCompany?.sortOrder ?? 0}
                  className="gh-input"
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Pricing mode</span>
                <select
                  name="pricingMode"
                  defaultValue={editCompany?.pricingMode ?? "FIXED"}
                  className="gh-input"
                >
                  <option value="FIXED">Fixed price per service</option>
                  <option value="PERCENT">Percentage discount</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Discount %</span>
                <input
                  name="discountPercent"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={editCompany?.discountPercent ?? ""}
                  placeholder="20"
                  className="gh-input"
                />
              </label>
            </div>
            <p className="m-0 text-[12px] text-[var(--color-text-muted)]">
              Fixed: set a new price per service on the &ldquo;Manage services&rdquo; screen. Percentage:
              the discount % applies automatically to every covered service&apos;s base price.
            </p>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={editCompany?.isActive ?? true}
                className="size-4"
              />
              <span className="text-[13px] text-[var(--color-text-body)]">Active (selectable at booking)</span>
            </label>
            <div className="flex items-center gap-3">
              <button type="submit" className="gh-btn gh-btn-primary">
                Save company
              </button>
              <Link href={base} className="gh-btn gh-btn-soft">
                Cancel
              </Link>
            </div>
          </form>
        </AdminCard>
      ) : null}

      {coverageCompany && coverageRes?.ok ? (
        <AdminCard className="mt-4">
          <h3
            className="m-0 text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
          >
            Services covered by {coverageCompany.name}
          </h3>
          <p className="mt-1 mb-4 text-[12px] text-[var(--color-text-muted)]">
            {coverageCompany.pricingMode === "PERCENT"
              ? `Checked services get a ${coverageCompany.discountPercent ?? 0}% discount off their base price (computed automatically).`
              : "Check a service and type the new fixed price the patient pays under this insurance."}
          </p>
          <form action={saveCoverageAction} className="grid gap-4">
            <input type="hidden" name="companyId" value={coverageCompany.id} />
            <input
              type="hidden"
              name="serviceIds"
              value={coverageRes.data.services.map((s) => s.serviceId).join(",")}
            />
            <div className="overflow-x-auto">
              <AdminTable>
                <Thead>
                  <Th>Covered</Th>
                  <Th>Service</Th>
                  <Th>Base price</Th>
                  <Th>Insurance price</Th>
                </Thead>
                <tbody>
                  {coverageRes.data.services.length === 0 ? (
                    <Tr>
                      <Td></Td>
                      <Td>
                        <span className="text-[12px] text-[var(--color-text-muted)]">
                          This country has no active services yet.
                        </span>
                      </Td>
                      <Td></Td>
                      <Td></Td>
                    </Tr>
                  ) : (
                    coverageRes.data.services.map((s) => (
                      <Tr key={s.serviceId}>
                        <Td>
                          <input
                            type="checkbox"
                            name={`covered_${s.serviceId}`}
                            defaultChecked={s.covered}
                            className="size-4"
                            aria-label={`Cover ${s.name}`}
                          />
                        </Td>
                        <Td>{s.name}</Td>
                        <Td>{formatMoney(s.basePriceCents, s.currencyCode)}</Td>
                        <Td>
                          {coverageCompany.pricingMode === "FIXED" ? (
                            <input
                              type="number"
                              name={`price_${s.serviceId}`}
                              step="0.01"
                              min={0}
                              defaultValue={centsToInput(s.overridePriceCents)}
                              placeholder="0.00"
                              className="gh-input max-w-[120px]"
                              aria-label={`Insurance price for ${s.name}`}
                            />
                          ) : (
                            <span className="text-[13px]">
                              {formatMoney(s.insurancePriceCents, s.currencyCode)}
                            </span>
                          )}
                        </Td>
                      </Tr>
                    ))
                  )}
                </tbody>
              </AdminTable>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" className="gh-btn gh-btn-primary">
                Save coverage
              </button>
              <Link href={base} className="gh-btn gh-btn-soft">
                Done
              </Link>
            </div>
          </form>
        </AdminCard>
      ) : null}
    </>
  );
}
