import Link from "next/link";
import { Search, UserRound } from "lucide-react";
import { fetchAdminPatients, type AdminPatientSearchItem, type VerificationStatus } from "@/lib/admin/admin-api";
import { AdminCard, AdminEmptyState, AdminSummaryStrip, PageHeader, Pill } from "../_components/atoms";
import { PortalMobileCard } from "@/components/PortalMobileCard";

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
  const idVerified = items.filter((p) => p.idVerificationStatus === "VERIFIED").length;
  const contactVerified = items.filter(
    (p) => p.emailVerificationStatus === "VERIFIED" || p.phoneVerificationStatus === "VERIFIED",
  ).length;

  return (
    <>
      <PageHeader
        eyebrow="Global"
        title="Patients"
        description="All registered patients — filter by Global Health Number or email."
      />

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
          <AdminEmptyState
            icon={<UserRound className="size-8" aria-hidden />}
            title="No patients found"
            description="Try a different Global Health Number or email. New patient records appear here after registration or a manual booking."
          />
        ) : (
          <>
            <div className="gh-admin-support-table-wrap gh-admin-deep-table-wrap overflow-x-auto">
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
            <div className="gh-admin-mobile-list">
              {items.map((p) => (
                <PortalMobileCard
                  key={p.id}
                  title={p.fullName ?? p.email}
                  subtitle={p.email}
                  statusPill={<StatusBadge status={p.idVerificationStatus} />}
                  meta={[
                    { label: "GHN", value: <code>{p.globalHealthNumber ?? "-"}</code> },
                    { label: "Joined", value: new Date(p.createdAt).toLocaleDateString() },
                    { label: "Email", value: <StatusBadge status={p.emailVerificationStatus} /> },
                    { label: "Phone", value: <StatusBadge status={p.phoneVerificationStatus} /> },
                  ]}
                  actions={
                    <Link
                      href={`/admin/patients/${encodeURIComponent(p.email)}`}
                      className="gh-btn gh-btn-secondary text-sm"
                    >
                      View patient
                    </Link>
                  }
                />
              ))}
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
