import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { prisma } from "backend";
import { requireAdminUser } from "@/lib/admin/require-admin";
import { FlagBadge } from "../_components/flag-badge";
import { SearchInput } from "../_components/search-input";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string };

export default async function AdminDoctorsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  await requireAdminUser();
  const params = (searchParams ? await searchParams : {}) as SearchParams;
  const q = params.q?.trim();

  const doctors = await prisma.doctor.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
            { title: { contains: q, mode: "insensitive" } },
            { registrationNumber: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      countryLinks: {
        include: { country: { select: { code: true, slug: true, name: true } } },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="gh-eyebrow">Public profiles</p>
          <h1 className="gh-h2 mt-2">Doctors</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Marketing/directory records shown on the public site. Doctors do not log in here.
          </p>
        </div>
        <Link href="/admin/doctors/new" className="gh-btn gh-btn-primary text-sm">
          <Plus className="size-4" aria-hidden /> Add doctor
        </Link>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput placeholder="Search by name, slug, title, registration…" />
        {q ? (
          <span className="text-xs text-[var(--color-text-muted)]">
            {doctors.length} result{doctors.length === 1 ? "" : "s"} for &ldquo;{q}&rdquo;
          </span>
        ) : null}
      </div>

      <section className="gh-card overflow-hidden p-0">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Title</th>
              <th>Countries</th>
              <th>Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {doctors.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-[var(--color-text-muted)]">
                  {q ? `No doctors match “${q}”.` : "No doctors yet. Add your first profile."}
                </td>
              </tr>
            ) : (
              doctors.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div className="flex flex-col">
                      <span className="font-semibold text-[var(--color-text-primary)]">{d.name}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">{d.slug}</span>
                    </div>
                  </td>
                  <td className="text-sm">{d.title}</td>
                  <td>
                    <div className="flex flex-wrap items-center gap-2">
                      {d.countryLinks.map((link) => (
                        <span
                          key={link.id}
                          title={link.country.name}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            link.active
                              ? "border-[var(--color-border)] bg-[var(--color-background-soft)] text-[var(--color-text-primary)]"
                              : "border-[var(--color-status-warning-border)] bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)]"
                          }`}
                        >
                          <FlagBadge code={link.country.slug} size={10} />
                          {link.country.code}
                        </span>
                      ))}
                      {d.countryLinks.length === 0 ? (
                        <span className="text-xs text-[var(--color-text-muted)]">No countries assigned</span>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <span className={`gh-badge ${d.active ? "gh-badge-success" : "gh-badge-warning"}`}>
                      {d.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <Link
                      href={`/admin/doctors/${d.id}`}
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
    </div>
  );
}
