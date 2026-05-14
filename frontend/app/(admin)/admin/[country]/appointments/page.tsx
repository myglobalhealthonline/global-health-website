import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { prisma } from "backend";
import { requireAdminUser } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  PENDING: "gh-badge-warning",
  CONFIRMED: "gh-badge-info",
  COMPLETED: "gh-badge-success",
  CANCELLED: "gh-badge-error",
};

type PageProps = { params: Promise<{ country: string }> };

export default async function CountryAppointmentsPage({ params }: PageProps) {
  await requireAdminUser();
  const { country: slug } = await params;
  const country = await prisma.country.findUnique({ where: { slug } });
  if (!country) notFound();

  const appointments = await prisma.appointment.findMany({
    where: { countryId: country.id },
    orderBy: { createdAt: "desc" },
    include: { service: { select: { title: true } } },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="gh-eyebrow">{country.code} · {country.name}</p>
        <h1 className="gh-h2 mt-2">Appointments</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Booking requests submitted from the {country.name} clinic site.
        </p>
      </header>

      <section className="gh-card overflow-hidden p-0">
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Service</th>
              <th>Submitted</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {appointments.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-[var(--color-text-muted)]">
                  No appointment requests for {country.name} yet.
                </td>
              </tr>
            ) : (
              appointments.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="flex flex-col">
                      <span className="font-semibold text-[var(--color-text-primary)]">{a.patientName}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">{a.patientEmail}</span>
                    </div>
                  </td>
                  <td className="text-sm">{a.service.title}</td>
                  <td className="text-xs text-[var(--color-text-muted)]">
                    {a.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                  </td>
                  <td>
                    <span className={`gh-badge ${STATUS_BADGE[a.status] ?? "gh-badge-neutral"}`}>{a.status}</span>
                  </td>
                  <td>
                    <Link
                      href={`/admin/appointments/${a.id}`}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-brand-primary)] hover:underline"
                    >
                      Open <ArrowRight className="size-3.5" aria-hidden />
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
