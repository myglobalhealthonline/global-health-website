import Link from "next/link";
import { UsersRound } from "lucide-react";
import { fetchAdminUsers, type AdminUserDto } from "@/lib/admin/admin-api";
import { AdminCard, AdminEmptyState, AdminSummaryStrip, PageHeader, Pill } from "../_components/atoms";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function readParam(sp: SearchParams, key: string): string | undefined {
  const v = sp[key];
  if (typeof v === "string" && v.trim() !== "") return v.trim();
  return undefined;
}

/**
 * Admin patient + admin-user list. Search by name/email, filter by role
 * or active state. Pagination is server-rendered — clicking the next/prev
 * link bumps the `page` query param.
 */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = searchParams ? await searchParams : {};
  const page = Number(readParam(sp, "page") ?? "1") || 1;
  const search = readParam(sp, "search");
  const role = readParam(sp, "role");
  const isActive = readParam(sp, "isActive");

  const result = await fetchAdminUsers({
    page: String(page),
    pageSize: "25",
    ...(search ? { search } : {}),
    ...(role ? { role } : {}),
    ...(isActive ? { isActive } : {}),
  });
  const users = result.ok ? result.data.items : [];
  const adminsShown = users.filter((u) => u.role === "ADMIN").length;
  const activeShown = users.filter((u) => u.isActive).length;
  const verifiedShown = users.filter((u) => u.emailVerifiedAt).length;

  return (
    <>
      <PageHeader
        eyebrow="Global"
        title="Users"
        description="Patients + admin accounts. Search by name/email, filter by role or status."
      />

      <AdminCard padding={0} className="gh-admin-users-list">
        {result.ok ? (
          <div className="border-b border-[var(--color-border)] px-4 pt-4">
            <AdminSummaryStrip
              items={[
                {
                  label: "Users shown",
                  value: result.data.pagination.total,
                  hint: "Matching filters",
                  tone: "brand",
                },
                {
                  label: "Admins visible",
                  value: adminsShown,
                  hint: "Current page",
                  tone: adminsShown > 0 ? "warning" : "neutral",
                },
                {
                  label: "Active accounts",
                  value: activeShown,
                  hint: `${verifiedShown} email verified`,
                  tone: activeShown > 0 ? "success" : "neutral",
                },
              ]}
            />
          </div>
        ) : null}
        <form className="gh-admin-support-filter-row flex flex-wrap items-end gap-3 border-b border-[var(--color-border)] p-4">
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">Search</span>
            <input
              name="search"
              defaultValue={search ?? ""}
              placeholder="Name or email"
              className="gh-input"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">Role</span>
            <select name="role" defaultValue={role ?? ""} className="gh-select">
              <option value="">Any</option>
              <option value="PATIENT">Patient</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">Status</span>
            <select name="isActive" defaultValue={isActive ?? ""} className="gh-select">
              <option value="">Any</option>
              <option value="true">Active</option>
              <option value="false">Suspended</option>
            </select>
          </label>
          <button type="submit" className="gh-btn gh-btn-primary text-sm">
            Apply
          </button>
        </form>

        {!result.ok ? (
          <p className="gh-status-warning m-4 rounded-md border px-4 py-3 text-sm">
            {result.message}
          </p>
        ) : result.data.items.length === 0 ? (
          <AdminEmptyState
            icon={<UsersRound className="size-8" aria-hidden />}
            title="No users match those filters"
            description="Clear the search, role, or status filters to broaden the account list."
          />
        ) : (
          <>
          <div className="gh-admin-support-table-wrap gh-admin-deep-table-wrap overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-[var(--color-background-soft)] text-left text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Verified</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold text-right">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {result.data.items.map((u: AdminUserDto) => (
                <tr key={u.id}>
                  <td className="px-4 py-2 font-semibold text-[var(--color-text-primary)]">
                    {u.email}
                  </td>
                  <td className="px-4 py-2">{u.fullName}</td>
                  <td className="px-4 py-2">
                    <Pill tone={u.role === "ADMIN" ? "published" : "neutral"}>
                      {u.role}
                    </Pill>
                  </td>
                  <td className="px-4 py-2">
                    <Pill tone={u.isActive ? "active" : "inactive"}>
                      {u.isActive ? "Active" : "Suspended"}
                    </Pill>
                  </td>
                  <td className="px-4 py-2 text-xs text-[var(--color-text-muted)]">
                    {u.emailVerifiedAt
                      ? new Date(u.emailVerifiedAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-xs text-[var(--color-text-muted)]">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="text-xs font-semibold text-emerald-700 hover:underline"
                    >
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="gh-admin-mobile-list">
            {result.data.items.map((u: AdminUserDto) => (
              <article key={u.id} className="gh-admin-mobile-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="gh-admin-mobile-card-title break-all">{u.email}</h3>
                    <p className="gh-admin-mobile-card-meta">{u.fullName || "No name set"}</p>
                  </div>
                  <Pill tone={u.isActive ? "active" : "inactive"}>
                    {u.isActive ? "Active" : "Suspended"}
                  </Pill>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Pill tone={u.role === "ADMIN" ? "published" : "neutral"}>{u.role}</Pill>
                  <Pill tone={u.emailVerifiedAt ? "active" : "neutral"}>
                    {u.emailVerifiedAt ? "Email verified" : "Email unverified"}
                  </Pill>
                </div>
                <p className="gh-admin-mobile-card-meta">
                  Created {new Date(u.createdAt).toLocaleDateString()}
                </p>
                <div className="gh-admin-mobile-actions">
                  <Link href={`/admin/users/${u.id}`} className="gh-btn gh-btn-secondary text-sm">
                    Open user
                  </Link>
                </div>
              </article>
            ))}
          </div>
          </>
        )}

        {result.ok && result.data.pagination.totalPages > 1 ? (
          <div className="gh-admin-support-pagination flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3 text-xs text-[var(--color-text-muted)]">
            <span>
              Page {result.data.pagination.page} of{" "}
              {result.data.pagination.totalPages} ({result.data.pagination.total} users)
            </span>
            <div className="flex gap-2">
              {result.data.pagination.page > 1 ? (
                <Link
                  href={{
                    pathname: "/admin/users",
                    query: { ...sp, page: String(result.data.pagination.page - 1) },
                  }}
                  className="rounded-md border border-[var(--color-border)] px-2 py-1 font-semibold hover:bg-[var(--color-background-soft)]"
                >
                  ← Prev
                </Link>
              ) : null}
              {result.data.pagination.page < result.data.pagination.totalPages ? (
                <Link
                  href={{
                    pathname: "/admin/users",
                    query: { ...sp, page: String(result.data.pagination.page + 1) },
                  }}
                  className="rounded-md border border-[var(--color-border)] px-2 py-1 font-semibold hover:bg-[var(--color-background-soft)]"
                >
                  Next →
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </AdminCard>
    </>
  );
}
