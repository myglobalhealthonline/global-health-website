import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "backend";
import { requireAdminUser } from "@/lib/admin/require-admin";
import { FlagBadge } from "../_components/flag-badge";
import { SearchInput } from "../_components/search-input";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  PENDING: "gh-badge-warning",
  CONFIRMED: "gh-badge-info",
  COMPLETED: "gh-badge-success",
  CANCELLED: "gh-badge-error",
};

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string }>;
}) {
  await requireAdminUser();
  const params = (searchParams ? await searchParams : {}) as { q?: string; status?: string };
  const q = params.q?.trim();
  const statusFilter =
    params.status && ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"].includes(params.status)
      ? (params.status as "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED")
      : null;

  const appointments = await prisma.appointment.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(q
        ? {
            OR: [
              { patientName: { contains: q, mode: "insensitive" } },
              { patientEmail: { contains: q, mode: "insensitive" } },
              { patientPhone: { contains: q, mode: "insensitive" } },
              { notes: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      country: { select: { code: true, slug: true } },
      service: { select: { title: true, slug: true } },
    },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="gh-eyebrow">Booking requests</p>
        <h1 className="gh-h2 mt-2">Appointments</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Review submitted requests and move them through the status pipeline.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput placeholder="Search by patient name, email, phone, notes…" />
        <div className="flex flex-wrap gap-2">
          {(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const).map((s) => {
            const href = `/admin/appointments${
              s === statusFilter ? "" : `?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`
            }`;
            const active = s === statusFilter;
            return (
              <Link
                key={s}
                href={active && !q ? "/admin/appointments" : href}
                className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-[var(--color-brand-primary)] text-white"
                    : "bg-[var(--color-background-soft)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-panel)]"
                }`}
              >
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </Link>
            );
          })}
        </div>
      </div>


      <section className="gh-card overflow-hidden p-0">
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Country</th>
              <th>Service</th>
              <th>Submitted</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {appointments.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-[var(--color-text-muted)]">
                  No appointment requests yet.
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
                  <td>
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <FlagBadge code={a.country.slug} size={14} />
                      {a.country.code}
                    </span>
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
