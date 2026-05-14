import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { requireAdminUser } from "@/lib/admin/require-admin";
import { listAdminCountries } from "@/lib/api/admin-countries";
import { FlagBadge } from "../_components/flag-badge";
import { SearchInput } from "../_components/search-input";

export const dynamic = "force-dynamic";

export default async function AdminCountriesPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  await requireAdminUser();
  const params = (searchParams ? await searchParams : {}) as { q?: string };
  const q = params.q?.trim();

  const result = await listAdminCountries({ q, limit: 100 });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="gh-eyebrow">Country axis</p>
          <h1 className="gh-h2 mt-2">Countries</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Each country drives a public clinic site. Edit hero copy, currency, and contact details here.
          </p>
        </div>
        <Link href="/admin/countries/new" className="gh-btn gh-btn-primary text-sm">
          <Plus className="size-4" aria-hidden /> Add country
        </Link>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput placeholder="Search by name, code, slug…" />
        {q ? (
          <span className="text-xs text-[var(--color-text-muted)]">
            {result.ok ? result.data.total : 0} match{result.ok && result.data.total === 1 ? "" : "es"} for &ldquo;{q}&rdquo;
          </span>
        ) : null}
      </div>

      {!result.ok ? (
        <p className="gh-status-error rounded-md px-4 py-3 text-sm">
          Could not load countries: {result.error.message}
        </p>
      ) : (
        <section className="gh-card overflow-hidden p-0">
          <table>
            <thead>
              <tr>
                <th>Country</th>
                <th>Slug</th>
                <th>Currency</th>
                <th>Status</th>
                <th>Active</th>
                <th>Doctors / Services</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {result.data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-[var(--color-text-muted)]">
                    {q ? `No countries match “${q}”.` : "No countries yet. Add your first one to get started."}
                  </td>
                </tr>
              ) : (
                result.data.items.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <FlagBadge code={c.slug} size={20} />
                        <div className="flex flex-col">
                          <span className="font-semibold text-[var(--color-text-primary)]">{c.name}</span>
                          <span className="text-xs text-[var(--color-text-muted)]">{c.code}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <code className="rounded bg-[var(--color-background-soft)] px-1.5 py-0.5 text-xs">{c.slug}</code>
                    </td>
                    <td>
                      {c.currency}
                      {c.currencySymbol ? <span className="ml-1 text-[var(--color-text-muted)]">({c.currencySymbol})</span> : null}
                    </td>
                    <td>
                      <span className={`gh-badge ${c.status === "PUBLISHED" ? "gh-badge-success" : "gh-badge-neutral"}`}>
                        {c.status === "PUBLISHED" ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td>
                      <span className={`gh-badge ${c.active ? "gh-badge-success" : "gh-badge-warning"}`}>
                        {c.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="text-sm text-[var(--color-text-muted)]">
                      {c.counts?.doctorLinks ?? 0} · {c.counts?.services ?? 0}
                    </td>
                    <td>
                      <Link
                        href={`/admin/countries/${c.id}`}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-brand-primary)] hover:underline"
                      >
                        Edit <ArrowRight className="size-3.5" aria-hidden />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
