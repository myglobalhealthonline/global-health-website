import Link from "next/link";
import { Search, UserRound } from "lucide-react";
import { fetchAdminPatients, fetchAdminCountries, type AdminPatientSearchItem } from "@/lib/admin/admin-api";
import { getActiveCountry, scopedCountryCode } from "@/lib/admin/admin-scope";
import { ScopeBanner } from "../_components/scope-banner";
import { AdminCard, AdminEmptyState, AdminSummaryStrip, Btn, PageHeader } from "../_components/atoms";
import { AdminPatientsTable } from "./_components/admin-patients-table";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function readParam(sp: SearchParams, key: string): string | undefined {
  const v = sp[key];
  if (typeof v === "string" && v.trim() !== "") return v.trim();
  return undefined;
}

export default async function AdminPatientsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = searchParams ? await searchParams : {};
  const ghn = readParam(sp, "ghn");
  const email = readParam(sp, "email");
  const phone = readParam(sp, "phone");
  const taxId = readParam(sp, "taxId");
  const name = readParam(sp, "name");
  const idNumber = readParam(sp, "idNumber");
  const plan = readParam(sp, "plan");
  const page = Number(readParam(sp, "page") ?? "1") || 1;

  // Resolve the cookie-scoped country and apply it as the default filter, so
  // Patients behaves like the other country-scoped sections. An explicit
  // ?countryCode= in the URL wins (and "all countries" clears it).
  const countriesResult = await fetchAdminCountries();
  const countriesForScope = countriesResult.ok ? countriesResult.data.countries : [];
  const activeCountry = await getActiveCountry(countriesForScope);
  // `countryCode=all` explicitly drops the scope. Needed because patients whose
  // country could not be determined (no dial-code match, no address country)
  // belong to no folder and would otherwise be unreachable from this page.
  const rawCountry = readParam(sp, "countryCode");
  const showAll = rawCountry === "all";
  const countryCode = showAll ? undefined : scopedCountryCode(rawCountry, activeCountry);

  const result = await fetchAdminPatients({ ghn, email, phone, taxId, name, idNumber, plan, countryCode, page: String(page), pageSize: "25" });

  // Keep the active scope + filters on the pagination links.
  const pageQuery = (target: number) =>
    new URLSearchParams({
      ...(ghn ? { ghn } : {}),
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
      ...(taxId ? { taxId } : {}),
      ...(name ? { name } : {}),
      ...(idNumber ? { idNumber } : {}),
      ...(plan ? { plan } : {}),
      ...(showAll ? { countryCode: "all" } : countryCode ? { countryCode } : {}),
      page: String(target),
    }).toString();

  const items: AdminPatientSearchItem[] = result?.ok ? result.data.items : [];
  const pagination = result?.ok ? result.data.pagination : null;
  const idVerified = items.filter((p) => p.idVerificationStatus === "VERIFIED").length;
  const contactVerified = items.filter(
    (p) => p.emailVerificationStatus === "VERIFIED" || p.phoneVerificationStatus === "VERIFIED",
  ).length;

  return (
    <>
      <PageHeader
        eyebrow={showAll ? "All countries" : (activeCountry?.name ?? "All countries")}
        title="Patients"
        description="Search by name, GHN, email, phone, fiscal number, ID card, or healthcare plan."
        actions={
          <>
            <Btn href="/admin/patients/duplicates" variant="secondary">
              Duplicates
            </Btn>
            <Btn href="/admin/patients/new" variant="primary" iconLeft={<UserRound className="size-3.5" />}>
              New patient
            </Btn>
          </>
        }
      />

      {showAll ? (
        <div className="gh-admin-scope-banner gh-admin-scope-banner--empty mb-5">
          <span className="min-w-0">
            <span className="font-semibold text-[var(--portal-text)]">All countries</span> · showing
            patients from every country, including those with no country set.
          </span>
          <Link href="/admin/patients" className="font-semibold text-[var(--portal-primary)] hover:underline">
            Back to country scope
          </Link>
        </div>
      ) : (
        <ScopeBanner activeCountry={activeCountry} clearHref="/admin/patients?countryCode=all" />
      )}

      <AdminCard padding={0} className="gh-admin-patients-list">
        {result?.ok ? (
          <div className="border-b border-[var(--color-border)] px-4 pt-4">
            <AdminSummaryStrip
              items={[
                {
                  label: "Patients shown",
                  value: pagination?.total ?? items.length,
                  hint: "Current search result",
                  tone: "brand",
                },
                {
                  label: "ID verified",
                  value: idVerified,
                  hint: "Visible page",
                  tone: idVerified > 0 ? "success" : "neutral",
                },
                {
                  label: "Contact verified",
                  value: contactVerified,
                  hint: "Email or phone",
                  tone: contactVerified > 0 ? "success" : "neutral",
                },
              ]}
            />
          </div>
        ) : null}
        <form className="gh-admin-support-filter-row flex flex-wrap items-end gap-3 border-b border-[var(--color-border)] p-4">
          {/* Keep the active scope across searches — without this, submitting
              the form drops ?countryCode=all back to the cookie-scoped country. */}
          {showAll ? <input type="hidden" name="countryCode" value="all" /> : null}
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">Global Health Number</span>
            <input
              name="ghn"
              defaultValue={ghn ?? ""}
              placeholder="GH-2026-000001"
              className="gh-input w-52"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">Email</span>
            <input
              name="email"
              defaultValue={email ?? ""}
              placeholder="patient@email.com"
              className="gh-input w-64"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">Phone number</span>
            <input
              name="phone"
              defaultValue={phone ?? ""}
              placeholder="+353 871234567"
              className="gh-input w-52"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">Fiscal number</span>
            <input
              name="taxId"
              defaultValue={taxId ?? ""}
              placeholder="NIF / PPS / CPF"
              className="gh-input w-52"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">Name</span>
            <input
              name="name"
              defaultValue={name ?? ""}
              placeholder="Patient name"
              className="gh-input w-52"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">ID card / passport</span>
            <input
              name="idNumber"
              defaultValue={idNumber ?? ""}
              placeholder="ID or passport number"
              className="gh-input w-52"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">Healthcare plan</span>
            <input
              name="plan"
              defaultValue={plan ?? ""}
              placeholder="Plan name"
              className="gh-input w-52"
            />
          </label>
          <button type="submit" className="gh-btn-primary flex items-center gap-1.5">
            <Search className="size-3.5" aria-hidden />
            Search
          </button>
        </form>

        {result && !result.ok ? (
          <p className="px-6 py-10 text-center text-sm text-[var(--color-status-warning-text)]">
            {result.message}
          </p>
        ) : items.length === 0 ? (
          <AdminEmptyState
            icon={<UserRound className="size-8" aria-hidden />}
            title="No patients found"
            description="Try a different Global Health Number or email. New patient records appear here after registration or a manual booking."
          />
        ) : (
          <>
            <AdminPatientsTable items={items} />

            {pagination && pagination.totalPages > 1 ? (
              <div className="gh-admin-support-pagination flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3">
                <p className="text-sm text-[var(--color-text-muted)]">
                  {pagination.total} result{pagination.total !== 1 ? "s" : ""}
                </p>
                <div className="flex gap-2">
                  {page > 1 ? (
                    <Link href={`/admin/patients?${pageQuery(page - 1)}`} className="gh-btn-ghost text-sm">
                      ← Prev
                    </Link>
                  ) : null}
                  {page < pagination.totalPages ? (
                    <Link href={`/admin/patients?${pageQuery(page + 1)}`} className="gh-btn-ghost text-sm">
                      Next →
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        )}
      </AdminCard>
    </>
  );
}
