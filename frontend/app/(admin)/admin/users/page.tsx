import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "backend";
import { requireSuperAdmin } from "@/lib/admin/require-admin";
import { UserRowActions } from "./_components/user-row-actions";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const me = await requireSuperAdmin();
  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="gh-eyebrow">Super admin</p>
          <h1 className="gh-h2 mt-2">Admin users</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Manage who can sign in to the admin portal.
          </p>
        </div>
        <Link href="/admin/users/new" className="gh-btn gh-btn-primary text-sm">
          <Plus className="size-4" aria-hidden /> Invite admin
        </Link>
      </header>

      <section className="gh-card overflow-hidden p-0">
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-semibold text-[var(--color-text-primary)]">{u.email}</td>
                <td className="text-sm">{u.name ?? "—"}</td>
                <td>
                  <span
                    className={`gh-badge ${u.role === "SUPER_ADMIN" ? "gh-badge-success" : u.role === "ADMIN" ? "gh-badge-info" : "gh-badge-neutral"}`}
                  >
                    {u.role}
                  </span>
                </td>
                <td>
                  <span className={`gh-badge ${u.active ? "gh-badge-success" : "gh-badge-warning"}`}>
                    {u.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="text-xs text-[var(--color-text-muted)]">
                  {u.createdAt.toISOString().slice(0, 10)}
                </td>
                <td>
                  {u.id === me.id ? (
                    <span className="text-xs text-[var(--color-text-muted)]">(you)</span>
                  ) : (
                    <UserRowActions userId={u.id} role={u.role} active={u.active} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
