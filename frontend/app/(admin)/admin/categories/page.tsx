import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { prisma } from "backend";
import { requireAdminUser } from "@/lib/admin/require-admin";
import { CountryEnableMatrix } from "./_components/country-enable-matrix";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requireAdminUser();

  const [categories, countries] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
      include: { countries: { select: { countryId: true, active: true } } },
    }),
    prisma.country.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, code: true, name: true } }),
  ]);

  const general = categories.filter((c) => c.type === "GENERAL");
  const specialist = categories.filter((c) => c.type === "SPECIALIST");

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="gh-eyebrow">Global pool · per-country enablement</p>
          <h1 className="gh-h2 mt-2">Categories</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Categories live globally. Toggle which countries surface them on their public clinic site.
          </p>
        </div>
        <Link href="/admin/categories/new" className="gh-btn gh-btn-primary text-sm">
          <Plus className="size-4" aria-hidden /> Add category
        </Link>
      </header>

      {[
        { title: "Specialist", rows: specialist },
        { title: "General", rows: general },
      ].map(({ title, rows }) => (
        <section key={title} className="space-y-3">
          <h2 className="gh-h3 text-[var(--color-text-primary)]">{title}</h2>
          <div className="gh-card overflow-hidden p-0">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  {countries.map((c) => (
                    <th key={c.id} className="text-center">{c.code}</th>
                  ))}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((cat) => {
                  const enabledIds = new Set(cat.countries.filter((l) => l.active).map((l) => l.countryId));
                  return (
                    <tr key={cat.id}>
                      <td className="font-semibold text-[var(--color-text-primary)]">{cat.name}</td>
                      <td>
                        <code className="rounded bg-[var(--color-background-soft)] px-1.5 py-0.5 text-xs">
                          {cat.slug}
                        </code>
                      </td>
                      {countries.map((country) => (
                        <td key={country.id} className="text-center">
                          <CountryEnableMatrix
                            categoryId={cat.id}
                            countryId={country.id}
                            enabled={enabledIds.has(country.id)}
                          />
                        </td>
                      ))}
                      <td>
                        <Link
                          href={`/admin/categories/${cat.id}`}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-brand-primary)] hover:underline"
                        >
                          Edit <ArrowRight className="size-3.5" aria-hidden />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
