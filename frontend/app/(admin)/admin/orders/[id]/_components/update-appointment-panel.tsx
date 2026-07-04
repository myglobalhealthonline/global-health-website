import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  fetchAdminAppointmentById,
  fetchAdminDoctors,
  patchAdminAppointmentUpdate,
} from "@/lib/admin/admin-api";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { AdminCard, SectionHeader } from "@/components/portal-atoms";
import { ScheduleTzOffsetInput } from "../../../appointments/_components/schedule-tz-offset";

type Props = {
  appointmentId: string;
  orderId: string;
  countryCode: string;
  returnPath: string;
  error?: string;
  success?: string;
};

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export async function UpdateAppointmentPanel({
  appointmentId,
  countryCode,
  returnPath,
  error,
  success,
}: Props) {
  const [appointmentResult, doctorsResult] = await Promise.all([
    fetchAdminAppointmentById(appointmentId),
    fetchAdminDoctors({ countryCode, pageSize: "100" }),
  ]);

  if (!appointmentResult.ok) {
    return (
      <AdminCard padding={0} className="gh-admin-order-appointment-panel">
        <SectionHeader title="Update appointment" />
        <p className="p-5 text-sm text-[var(--color-text-muted)]">
          Could not load appointment: {appointmentResult.message}
        </p>
      </AdminCard>
    );
  }

  const appointment = appointmentResult.data.appointment;
  const doctors =
    doctorsResult.ok && doctorsResult.data.items
      ? doctorsResult.data.items.filter((d) => d.active)
      : [];
  const formId = `update-appointment-${appointmentId}`;

  async function updateAppointmentAction(formData: FormData) {
    "use server";
    await requireAdminAction();

    const rawSlot = String(formData.get("scheduledAt") ?? "").trim();
    const rawDoctor = String(formData.get("doctorId") ?? "").trim();
    const changeReason = String(formData.get("changeReason") ?? "").trim();
    const rawTzOffset = String(formData.get("scheduledAtTzOffset") ?? "0").trim();
    const tzOffsetMin = Number.isFinite(Number(rawTzOffset)) ? Number(rawTzOffset) : 0;

    const payload: {
      scheduledAt?: string | null;
      doctorId?: string | null;
      changeReason: string;
    } = { changeReason };

    if (formData.has("scheduledAt")) {
      if (rawSlot === "") {
        payload.scheduledAt = null;
      } else {
        const asUtcEpoch = Date.parse(`${rawSlot}:00Z`);
        if (!Number.isFinite(asUtcEpoch)) {
          redirect(`${returnPath}?error=${encodeURIComponent("Invalid date/time")}`);
        }
        payload.scheduledAt = new Date(asUtcEpoch + tzOffsetMin * 60_000).toISOString();
      }
    }

    if (formData.has("doctorId")) {
      payload.doctorId = rawDoctor === "" ? null : rawDoctor;
    }

    const result = await patchAdminAppointmentUpdate(appointmentId, payload);
    if (!result.ok) {
      redirect(`${returnPath}?error=${encodeURIComponent(result.message)}`);
    }

    revalidatePath(returnPath);
    revalidatePath(`/admin/appointments/${appointmentId}`);
    revalidatePath("/admin/orders");

    let message = "Appointment updated. Patient and doctor notified.";
    if (result.data.meetingUrl) {
      message += " New Meet link generated.";
    }
    redirect(`${returnPath}?success=${encodeURIComponent(message)}`);
  }

  return (
    <AdminCard padding={0} className="gh-admin-order-appointment-panel">
      <SectionHeader title="Update appointment" />
      <div className="p-5">
        {error ? (
          <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-3 py-2 text-sm">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="gh-status-success mb-4 rounded-[var(--radius-card-sm)] border px-3 py-2 text-sm">
            {success}
          </p>
        ) : null}

        <form id={formId} action={updateAppointmentAction} className="gh-admin-order-appointment-form grid gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Consultation date & time</span>
            <input
              type="datetime-local"
              name="scheduledAt"
              className="gh-input"
              defaultValue={toDatetimeLocalValue(appointment.scheduledAt)}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Doctor</span>
            <select name="doctorId" className="gh-select" defaultValue={appointment.doctorId ?? ""}>
              <option value="">Unassigned</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName}
                </option>
              ))}
            </select>
            {!doctorsResult.ok ? (
              <span className="text-xs text-[var(--color-text-muted)]">
                Could not load doctors: {doctorsResult.message}
              </span>
            ) : null}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">
              Reason for change <span className="text-[var(--color-text-muted)]">(required)</span>
            </span>
            <textarea
              name="changeReason"
              className="gh-input min-h-[96px]"
              required
              minLength={10}
              maxLength={500}
              placeholder="Explain why this appointment is being changed (shown to patient and doctor)."
            />
          </label>

          <ScheduleTzOffsetInput formId={formId} />

          <button type="submit" className="gh-btn gh-btn-primary w-fit">
            Save changes & notify
          </button>
        </form>
      </div>
    </AdminCard>
  );
}
