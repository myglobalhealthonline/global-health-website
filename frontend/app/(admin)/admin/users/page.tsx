import Link from "next/link";
import { fetchAdminUsers, type AdminUserDto } from "@/lib/admin/admin-api";
import { AdminCard, PageHeader, Pill } from "../_components/atoms";

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

  return (
    <>
      <PageHeader
        eyebrow="Global"
        title="Users"
        description="Patients + admin accounts. Search by name/email, filter by role or status."
      />

      <AdminCard padding={0}>
        <form className="flex flex-wrap items-end gap-3 border-b border-[var(--color-border)] p-4">
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
          <p className="m-4 text-sm text-[var(--color-text-muted)]">
            No users match those filters.
          </p>
        ) : (
          <table className="w-full text-sm">
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
        )}

        {result.ok && result.data.pagination.totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3 text-xs text-[var(--color-text-muted)]">
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
