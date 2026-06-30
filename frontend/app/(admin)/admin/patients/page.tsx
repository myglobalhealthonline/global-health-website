import Link from "next/link";
import { Search } from "lucide-react";
import { fetchAdminPatients, type AdminPatientSearchItem, type VerificationStatus } from "@/lib/admin/admin-api";
import { AdminCard, PageHeader, Pill } from "../_components/atoms";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function readParam(sp: SearchParams, key: string): string | undefined {
  const v = sp[key];
  if (typeof v === "string" && v.trim() !== "") return v.trim();
  return undefined;
}

function verificationTone(status: VerificationStatus): "active" | "inactive" | "pending" | "neutral" {
  switch (status) {
    case "VERIFIED": return "active";
    case "REJECTED": return "inactive";
    case "PENDING": return "pending";
    default: return "neutral";
  }
}

function StatusBadge({ status }: { status: VerificationStatus }) {
  const label = status === "NOT_VERIFIED" ? "Not verified" : status.charAt(0) + status.slice(1).toLowerCase();
  return <Pill tone={verificationTone(status)}>{label}</Pill>;
}

export default async function AdminPatientsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = searchParams ? await searchParams : {};
  const ghn = readParam(sp, "ghn");
  const email = readParam(sp, "email");
  const page = Number(readParam(sp, "page") ?? "1") || 1;

  const result = await fetchAdminPatients({ ghn, email, page: String(page), pageSize: "25" });

  const items: AdminPatientSearchItem[] = result?.ok ? result.data.items : [];
  const pagination = result?.ok ? result.data.pagination : null;

  return (
    <>
      <PageHeader
        eyebrow="Global"
        title="Patients"
        description="All registered patients — filter by Global Health Number or email."
      />

      <AdminCard padding={0} className="gh-admin-patients-list">
        <form className="gh-admin-support-filter-row flex flex-wrap items-end gap-3 border-b border-[var(--color-border)] p-4">
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
          <p className="px-6 py-10 text-center text-sm text-[var(--color-text-muted)]">
            No patients found.
          </p>
        ) : (
          <>
            <div className="gh-admin-support-table-wrap overflow-x-auto">
              <table className="gh-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>GHN</th>
                    <th>ID</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Joined</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="font-medium text-[var(--color-text-primary)]">
                          {p.fullName ?? "—"}
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)]">{p.email}</div>
                      </td>
                      <td>
                        <code className="rounded bg-[var(--color-surface-raised)] px-1.5 py-0.5 text-xs">
                          {p.globalHealthNumber ?? "—"}
                        </code>
                      </td>
                      <td><StatusBadge status={p.idVerificationStatus} /></td>
                      <td><StatusBadge status={p.emailVerificationStatus} /></td>
                      <td><StatusBadge status={p.phoneVerificationStatus} /></td>
                      <td className="text-[var(--color-text-muted)]">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <Link
                          href={`/admin/patients/${encodeURIComponent(p.email)}`}
                          className="gh-link text-sm font-medium"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && pagination.totalPages > 1 ? (
              <div className="gh-admin-support-pagination flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3">
                <p className="text-sm text-[var(--color-text-muted)]">
                  {pagination.total} result{pagination.total !== 1 ? "s" : ""}
                </p>
                <div className="flex gap-2">
                  {page > 1 ? (
                    <Link
                      href={`/admin/patients?${new URLSearchParams({ ...(ghn ? { ghn } : {}), ...(email ? { email } : {}), page: String(page - 1) })}`}
                      className="gh-btn-ghost text-sm"
                    >
                      ← Prev
                    </Link>
                  ) : null}
                  {page < pagination.totalPages ? (
                    <Link
                      href={`/admin/patients?${new URLSearchParams({ ...(ghn ? { ghn } : {}), ...(email ? { email } : {}), page: String(page + 1) })}`}
                      className="gh-btn-ghost text-sm"
                    >
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
