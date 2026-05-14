import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "backend";
import { getAllowedNextStatuses } from "backend/appointments/status-transitions";
import { requireAdminUser } from "@/lib/admin/require-admin";
import { StatusActions } from "./_components/status-actions";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function AppointmentDetailPage({ params }: PageProps) {
  await requireAdminUser();
  const { id } = await params;
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      country: { select: { code: true, name: true } },
      service: { select: { title: true, slug: true } },
      doctor: { select: { name: true, slug: true } },
    },
  });
  if (!appointment) notFound();

  const next = getAllowedNextStatuses(appointment.status);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/appointments"
        className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-brand-primary)] hover:underline"
      >
        <ChevronLeft className="size-3.5" aria-hidden /> Back to appointments
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="gh-eyebrow">Appointment · {appointment.country.code}</p>
          <h1 className="gh-h2 mt-2">{appointment.patientName}</h1>
          <p className="text-sm text-[var(--color-text-muted)]">{appointment.patientEmail}</p>
        </div>
        <span className="gh-badge gh-badge-neutral">{appointment.status}</span>
      </header>

      <section className="gh-card grid gap-4 p-6 sm:grid-cols-2">
        <Field label="Service" value={appointment.service.title} />
        <Field label="Country" value={`${appointment.country.code} · ${appointment.country.name}`} />
        <Field label="Doctor" value={appointment.doctor?.name ?? "—"} />
        <Field label="Phone" value={appointment.patientPhone ?? "—"} />
        <Field label="Submitted" value={appointment.createdAt.toISOString().replace("T", " ").slice(0, 16)} />
        <Field label="Last updated" value={appointment.updatedAt.toISOString().replace("T", " ").slice(0, 16)} />
      </section>

      {appointment.notes ? (
        <section className="gh-card grid gap-2 p-6">
          <h2 className="gh-h3">Notes</h2>
          <p className="whitespace-pre-wrap text-sm text-[var(--color-text-body)]">{appointment.notes}</p>
        </section>
      ) : null}

      <section className="gh-card grid gap-3 p-6">
        <h2 className="gh-h3">Update status</h2>
        {next.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            Terminal state — no further transitions allowed.
          </p>
        ) : (
          <StatusActions appointmentId={appointment.id} allowed={next} />
        )}
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-1 text-sm text-[var(--color-text-primary)]">{value}</p>
    </div>
  );
}
