import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Plus } from "lucide-react";
import { prisma } from "backend";
import { requireAdminUser } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  GENERAL: "General",
  SPECIALIST: "Specialist",
  PRESCRIPTION: "Prescription",
  HEALTH_TEST: "Health test",
};

type PageProps = {
  params: Promise<{ country: string }>;
  searchParams?: Promise<{ type?: string }>;
};

export default async function CountryServicesPage({ params, searchParams }: PageProps) {
  await requireAdminUser();
  const { country: slug } = await params;
  const sp = (searchParams ? await searchParams : {}) as { type?: string };
  const typeFilter = sp.type && ["GENERAL", "SPECIALIST", "PRESCRIPTION", "HEALTH_TEST"].includes(sp.type)
    ? (sp.type as "GENERAL" | "SPECIALIST" | "PRESCRIPTION" | "HEALTH_TEST")
    : null;

  const country = await prisma.country.findUnique({ where: { slug } });
  if (!country) notFound();

  const services = await prisma.service.findMany({
    where: { countryId: country.id, ...(typeFilter ? { type: typeFilter } : {}) },
    orderBy: [{ updatedAt: "desc" }],
    include: { category: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="gh-eyebrow">{country.code} · {country.name}</p>
          <h1 className="gh-h2 mt-2">Services</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Consultations, prescriptions, and health tests for {country.name}.
          </p>
        </div>
        <Link href="/admin/services/new" className="gh-btn gh-btn-primary text-sm">
          <Plus className="size-4" aria-hidden /> Add service
        </Link>
      </header>

      <div className="flex flex-wrap gap-2">
        <FilterChip href={`/admin/${slug}/services`} active={typeFilter === null} label="All" />
        {(["GENERAL", "SPECIALIST", "PRESCRIPTION", "HEALTH_TEST"] as const).map((t) => (
          <FilterChip
            key={t}
            href={`/admin/${slug}/services?type=${t}`}
            active={typeFilter === t}
            label={TYPE_LABEL[t]}
          />
        ))}
      </div>

      <section className="gh-card overflow-hidden p-0">
        <table>
          <thead>
            <tr>
              <th>Title</th>
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
                <td colSpan={6} className="py-12 text-center text-sm text-[var(--color-text-muted)]">
                  No services in {country.name} match the filter.
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
                    <span className="gh-badge gh-badge-neutral">{TYPE_LABEL[s.type]}</span>
                  </td>
                  <td className="text-xs text-[var(--color-text-muted)]">{s.category?.name ?? "—"}</td>
                  <td className="text-sm">
                    {s.priceCents !== null
                      ? `${(s.priceCents / 100).toFixed(2)} ${s.currency ?? country.currency}`
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

function FilterChip({ href, active, label }: { href: string; active: boolean; label: string }) {
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
