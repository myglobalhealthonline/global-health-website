import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Plus } from "lucide-react";
import { prisma } from "backend";
import { requireAdminUser } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ country: string }> };

export default async function CountryDoctorsPage({ params }: PageProps) {
  await requireAdminUser();
  const { country: slug } = await params;
  const country = await prisma.country.findUnique({ where: { slug } });
  if (!country) notFound();

  const links = await prisma.doctorCountry.findMany({
    where: { countryId: country.id },
    orderBy: [{ active: "desc" }, { sortOrder: "asc" }],
    include: { doctor: true },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="gh-eyebrow">{country.code} · {country.name}</p>
          <h1 className="gh-h2 mt-2">Doctors</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Doctors assigned to this country. Sort order controls display on the public team page.
          </p>
        </div>
        <Link href="/admin/doctors/new" className="gh-btn gh-btn-primary text-sm">
          <Plus className="size-4" aria-hidden /> Add doctor
        </Link>
      </header>

      <section className="gh-card overflow-hidden p-0">
        <table>
          <thead>
            <tr>
              <th>Sort</th>
              <th>Name</th>
              <th>Title</th>
              <th>Visible in {country.code}</th>
              <th>Profile active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {links.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-[var(--color-text-muted)]">
                  No doctors assigned to {country.name} yet.
                </td>
              </tr>
            ) : (
              links.map((link) => (
                <tr key={link.id}>
                  <td className="text-sm text-[var(--color-text-muted)]">{link.sortOrder}</td>
                  <td>
                    <div className="flex flex-col">
                      <span className="font-semibold text-[var(--color-text-primary)]">{link.doctor.name}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">{link.doctor.slug}</span>
                    </div>
                  </td>
                  <td className="text-sm">{link.doctor.title}</td>
                  <td>
                    <span className={`gh-badge ${link.active ? "gh-badge-success" : "gh-badge-warning"}`}>
                      {link.active ? "Visible" : "Hidden"}
                    </span>
                  </td>
                  <td>
                    <span className={`gh-badge ${link.doctor.active ? "gh-badge-success" : "gh-badge-warning"}`}>
                      {link.doctor.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <Link
                      href={`/admin/doctors/${link.doctor.id}`}
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
