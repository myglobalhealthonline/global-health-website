import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { prisma } from "backend";
import { requireAdminUser } from "@/lib/admin/require-admin";
import { FlagBadge } from "../_components/flag-badge";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  GENERAL: "General",
  SPECIALIST: "Specialist",
  PRESCRIPTION: "Prescription",
  HEALTH_TEST: "Health test",
};

type SearchParams = { type?: string; country?: string };

export default async function AdminServicesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  await requireAdminUser();
  const params = (searchParams ? await searchParams : {}) as SearchParams;
  const typeFilter = params.type && ["GENERAL", "SPECIALIST", "PRESCRIPTION", "HEALTH_TEST"].includes(params.type)
    ? (params.type as "GENERAL" | "SPECIALIST" | "PRESCRIPTION" | "HEALTH_TEST")
    : null;
  const countryFilter = params.country || null;

  const [services, countries] = await Promise.all([
    prisma.service.findMany({
      where: {
        ...(typeFilter ? { type: typeFilter } : {}),
        ...(countryFilter ? { country: { slug: countryFilter } } : {}),
      },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        country: { select: { code: true, name: true, slug: true } },
        category: { select: { name: true, slug: true } },
      },
    }),
    prisma.country.findMany({ orderBy: [{ sortOrder: "asc" }], select: { id: true, code: true, name: true, slug: true } }),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="gh-eyebrow">Country-scoped, four types</p>
          <h1 className="gh-h2 mt-2">Services</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            One table backs general consultations, specialist consultations, prescriptions, and health tests.
          </p>
        </div>
        <Link href="/admin/services/new" className="gh-btn gh-btn-primary text-sm">
          <Plus className="size-4" aria-hidden /> Add service
        </Link>
      </header>

      <div className="flex flex-wrap gap-3">
        <FilterChip href="/admin/services" current={typeFilter} label="All types" />
        {(["GENERAL", "SPECIALIST", "PRESCRIPTION", "HEALTH_TEST"] as const).map((t) => (
          <FilterChip
            key={t}
            href={`/admin/services?type=${t}${countryFilter ? `&country=${countryFilter}` : ""}`}
            current={typeFilter}
            value={t}
            label={TYPE_LABEL[t]}
          />
        ))}
        <span className="ml-auto text-xs text-[var(--color-text-muted)]">
          Country:
        </span>
        <select
          defaultValue={countryFilter ?? ""}
          onChange={undefined}
          className="gh-select h-9 text-xs"
          disabled
        >
          <option value="">All</option>
          {countries.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.code}
            </option>
          ))}
        </select>
      </div>

      <section className="gh-card overflow-hidden p-0">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Country</th>
              <th>Type</th>
              <th>Category</th>
              <th>Price</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {services.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-[var(--color-text-muted)]">
                  No services match the current filter.
                </td>
              </tr>
            ) : (
              services.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="flex flex-col">
                      <span className="font-semibold text-[var(--color-text-primary)]">{s.title}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">{s.slug}</span>
                    </div>
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <FlagBadge code={s.country.slug} size={14} />
                      {s.country.code}
                    </span>
                  </td>
                  <td>
                    <span className="gh-badge gh-badge-neutral">{TYPE_LABEL[s.type]}</span>
                  </td>
                  <td className="text-xs text-[var(--color-text-muted)]">{s.category?.name ?? "—"}</td>
                  <td className="text-sm">
                    {s.priceCents !== null
                      ? `${(s.priceCents / 100).toFixed(2)} ${s.currency ?? ""}`
                      : "—"}
                  </td>
                  <td>
                    <span className={`gh-badge ${s.status === "PUBLISHED" ? "gh-badge-success" : "gh-badge-neutral"}`}>
                      {s.status === "PUBLISHED" ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td>
                    <Link
                      href={`/admin/services/${s.id}`}
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

function FilterChip({
  href,
  current,
  value,
  label,
}: {
  href: string;
  current: string | null;
  value?: string;
  label: string;
}) {
  const active = value ? current === value : current === null;
  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "bg-[var(--color-brand-primary)] text-white"
          : "bg-[var(--color-background-soft)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-panel)]"
      }`}
    >
      {label}
    </Link>
  );
}
