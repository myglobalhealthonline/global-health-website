import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  fetchAdminAppointmentById,
  patchAdminAppointmentStatus,
} from "@/lib/admin/admin-api";

export const dynamic = "force-dynamic";

const statusOptions = [
  "REQUEST_RECEIVED",
  "UNDER_REVIEW",
  "CONTACTED",
  "CANCELLED",
  "COMPLETED",
] as const;

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

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string; success?: string }>;
};

export default async function AdminAppointmentDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};
  const result = await fetchAdminAppointmentById(id);

  async function updateStatusAction(formData: FormData) {
    "use server";

    const nextStatus = String(formData.get("status") ?? "");
    if (!statusOptions.includes(nextStatus as (typeof statusOptions)[number])) {
      redirect(`/admin/appointments/${id}?error=Invalid status`);
    }

    const updateResult = await patchAdminAppointmentStatus(id, nextStatus);
    if (!updateResult.ok) {
      redirect(`/admin/appointments/${id}?error=${encodeURIComponent(updateResult.message)}`);
    }

    revalidatePath("/admin/appointments");
    revalidatePath(`/admin/appointments/${id}`);
    redirect(`/admin/appointments/${id}?success=Status updated`);
  }

  if (!result.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Appointment Detail</h1>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Could not load appointment: {result.message}
        </p>
        <div className="mt-6">
          <Link href="/admin/appointments" className="gh-link text-[var(--color-brand-primary)]">
            Back to queue
          </Link>
        </div>
      </section>
    );
  }

  const appointment = result.data.appointment;

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Appointment Detail</h1>
        <Link href="/admin/appointments" className="gh-link text-[var(--color-brand-primary)]">
          Back to queue
        </Link>
      </div>

      {messages.error ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {messages.error}
        </p>
      ) : null}
      {messages.success ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {messages.success}
        </p>
      ) : null}

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Patient</dt>
          <dd className="mt-1 text-[var(--color-text-primary)]">{appointment.fullName}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Email</dt>
          <dd className="mt-1 text-[var(--color-text-primary)]">{appointment.email}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Phone</dt>
          <dd className="mt-1 text-[var(--color-text-primary)]">{appointment.phone ?? "No phone provided"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Country</dt>
          <dd className="mt-1 uppercase text-[var(--color-text-primary)]">{appointment.country}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Consultation type</dt>
          <dd className="mt-1 text-[var(--color-text-primary)]">{appointment.consultationType}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Current status</dt>
          <dd className="mt-1 text-[var(--color-text-primary)]">{appointment.status}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Created</dt>
          <dd className="mt-1 text-[var(--color-text-primary)]">{formatDate(appointment.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Updated</dt>
          <dd className="mt-1 text-[var(--color-text-primary)]">{formatDate(appointment.updatedAt)}</dd>
        </div>
      </dl>

      <div className="mt-6 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Notes</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-text-muted)]">
          {appointment.notes ?? "No notes provided"}
        </p>
      </div>

      <form action={updateStatusAction} className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex min-w-[220px] flex-col gap-2">
          <span className="gh-field-label">Update status</span>
          <select name="status" className="gh-select" defaultValue={appointment.status}>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="gh-btn gh-btn-primary">
          Save status
        </button>
      </form>
    </section>
  );
}
