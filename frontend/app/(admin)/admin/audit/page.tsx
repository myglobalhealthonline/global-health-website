import Link from "next/link";
import { prisma } from "backend";
import { requireSuperAdmin } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type SearchParams = {
  entity?: string;
  actor?: string;
  country?: string;
  page?: string;
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  await requireSuperAdmin();
  const params = (searchParams ? await searchParams : {}) as SearchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const where: Record<string, unknown> = {};
  if (params.entity) where.entity = params.entity;
  if (params.country) where.countryId = params.country;
  if (params.actor) where.userId = params.actor;

  const [items, total, countries, users] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: { user: { select: { email: true, name: true } } },
    }),
    prisma.adminAuditLog.count({ where }),
    prisma.country.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, code: true } }),
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
      orderBy: { email: "asc" },
      select: { id: true, email: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const entities = ["Country", "Category", "CategoryCountry", "Doctor", "Service", "User", "Appointment"];

  return (
    <div className="space-y-6">
      <header>
        <p className="gh-eyebrow">Compliance trail</p>
        <h1 className="gh-h2 mt-2">Audit log</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Every admin mutation is recorded here. Read-only.
        </p>
      </header>

      <form className="gh-card grid gap-3 p-4 sm:grid-cols-[1fr_1fr_1fr_auto]" method="get">
        <select name="entity" defaultValue={params.entity ?? ""} className="gh-select h-10 text-sm">
          <option value="">All entities</option>
          {entities.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <select name="actor" defaultValue={params.actor ?? ""} className="gh-select h-10 text-sm">
          <option value="">All actors</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.email}</option>
          ))}
        </select>
        <select name="country" defaultValue={params.country ?? ""} className="gh-select h-10 text-sm">
          <option value="">All countries</option>
          {countries.map((c) => (
            <option key={c.id} value={c.id}>{c.code}</option>
          ))}
        </select>
        <button type="submit" className="gh-btn gh-btn-soft text-sm">Filter</button>
      </form>

      <section className="gh-card overflow-hidden p-0">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Country</th>
              <th>Metadata</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-[var(--color-text-muted)]">
                  No audit entries match the filter.
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id}>
                  <td className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                    {row.createdAt.toISOString().replace("T", " ").slice(0, 19)}
                  </td>
                  <td className="text-sm">
                    {row.user?.email ?? row.userId.slice(0, 8)}
                  </td>
                  <td>
                    <code className="rounded bg-[var(--color-background-soft)] px-1.5 py-0.5 text-xs">
                      {row.action}
                    </code>
                  </td>
                  <td className="text-xs">
                    {row.entity}
                    {row.entityId ? (
                      <span className="ml-1 text-[var(--color-text-muted)]">{row.entityId.slice(0, 8)}…</span>
                    ) : null}
                  </td>
                  <td className="text-xs text-[var(--color-text-muted)]">
                    {row.countryId ? countries.find((c) => c.id === row.countryId)?.code ?? "—" : "—"}
                  </td>
                  <td className="text-xs">
                    {row.metadata ? (
                      <details>
                        <summary className="cursor-pointer text-[var(--color-brand-primary)]">JSON</summary>
                        <pre className="mt-1 max-w-md overflow-auto rounded bg-[var(--color-background-soft)] p-2 text-[10px] leading-tight">
                          {JSON.stringify(row.metadata, null, 2)}
                        </pre>
                      </details>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <nav className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
        <span>
          Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
        </span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link
              href={`?${new URLSearchParams({ ...params, page: String(page - 1) } as Record<string, string>).toString()}`}
              className="gh-btn gh-btn-soft text-xs"
            >
              Previous
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              href={`?${new URLSearchParams({ ...params, page: String(page + 1) } as Record<string, string>).toString()}`}
              className="gh-btn gh-btn-soft text-xs"
            >
              Next
            </Link>
          ) : null}
        </div>
      </nav>
    </div>
  );
}
