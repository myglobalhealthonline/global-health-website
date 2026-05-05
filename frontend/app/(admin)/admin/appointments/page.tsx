import Link from "next/link";
import { fetchAdminAppointments } from "@/lib/admin/admin-api";

export const dynamic = "force-dynamic";

function formatDate(dateIso: string) {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return dateIso;
  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminAppointmentsPage() {
  const result = await fetchAdminAppointments();

  if (!result.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Appointment Queue</h1>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Could not load appointments: {result.message}
        </p>
      </section>
    );
  }

  return (
    <section className="gh-card p-6 sm:p-8">
      <h1 className="gh-h2 text-[var(--color-text-primary)]">Appointment Queue</h1>
      <p className="gh-body mt-3 text-[var(--color-text-muted)]">
        Internal review queue. Status transitions happen from the detail page.
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
              <th className="px-3 py-2 font-semibold">Patient</th>
              <th className="px-3 py-2 font-semibold">Contact</th>
              <th className="px-3 py-2 font-semibold">Country</th>
              <th className="px-3 py-2 font-semibold">Consultation</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Created</th>
              <th className="px-3 py-2 font-semibold">Notes</th>
              <th className="px-3 py-2 font-semibold">Detail</th>
            </tr>
          </thead>
          <tbody>
            {result.data.items.map((appointment) => (
              <tr key={appointment.id} className="border-b border-[var(--color-border)] align-top">
                <td className="px-3 py-3 font-medium text-[var(--color-text-primary)]">{appointment.fullName}</td>
                <td className="px-3 py-3 text-[var(--color-text-muted)]">
                  <div>{appointment.email}</div>
                  <div>{appointment.phone ?? "No phone"}</div>
                </td>
                <td className="px-3 py-3 uppercase text-[var(--color-text-muted)]">{appointment.country}</td>
                <td className="px-3 py-3 text-[var(--color-text-muted)]">{appointment.consultationType}</td>
                <td className="px-3 py-3 text-[var(--color-text-primary)]">{appointment.status}</td>
                <td className="px-3 py-3 text-[var(--color-text-muted)]">{formatDate(appointment.createdAt)}</td>
                <td className="max-w-[20rem] px-3 py-3 text-[var(--color-text-muted)]">
                  {appointment.notesPreview ?? "No notes"}
                </td>
                <td className="px-3 py-3">
                  <Link href={`/admin/appointments/${appointment.id}`} className="gh-link text-[var(--color-brand-primary)]">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
