import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  fetchAdminAppointmentById,
  fetchAdminInternalMessages,
  patchAdminAppointmentSchedule,
  patchAdminAppointmentStatus,
} from "@/lib/admin/admin-api";
import { InternalMessagesThread } from "@/components/chat/InternalMessagesThread";
import { AdminAppointmentChat } from "../_components/admin-appointment-chat";
import {
  getAllowedNextStatuses,
  isTerminalAppointmentStatus,
} from "@/lib/admin/appointment-status";
import { FlagBadge } from "../../_components/flag-badge";
import { ScheduleTzOffsetInput } from "../_components/schedule-tz-offset";
import { ScheduleSlotInput } from "../_components/schedule-slot-input";
import {
  AdminCard,
  Btn,
  PageHeader,
  Pill,
  type PillTone,
} from "../../_components/atoms";

export const dynamic = "force-dynamic";

// (Server-side datetime-local conversion removed — `ScheduleSlotInput`
// now does the ISO→local-input formatting in the browser so the prefill
// matches the admin's wall clock, not the Node server's timezone.)

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

function statusToneFor(status: string): PillTone {
  if (status === "COMPLETED") return "published";
  if (status === "CANCELLED") return "inactive";
  if (status === "CONTACTED") return "active";
  if (status === "UNDER_REVIEW") return "pending";
  return "neutral";
}

const cardTitleStyle = {
  margin: 0,
  fontFamily: "var(--font-display)",
  fontSize: 16,
  fontWeight: 800,
  color: "var(--color-text-primary)",
} as const;

function FieldRow({
  label,
  value,
  full = false,
}: {
  label: string;
  value: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
        {label}
      </dt>
      <dd className="mt-1 text-[14px] text-[var(--color-text-primary)]">{value}</dd>
    </div>
  );
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
  const [result, internalMessagesResult] = await Promise.all([
    fetchAdminAppointmentById(id),
    fetchAdminInternalMessages(id),
  ]);
  const internalMessages = internalMessagesResult.ok
    ? internalMessagesResult.data.items
    : [];

  async function updateStatusAction(formData: FormData) {
    "use server";

    const nextStatus = String(formData.get("status") ?? "").trim();
    if (!nextStatus) {
      redirect(`/admin/appointments/${id}?error=${encodeURIComponent("Choose a status")}`);
    }

    const latest = await fetchAdminAppointmentById(id);
    if (!latest.ok) {
      redirect(`/admin/appointments/${id}?error=${encodeURIComponent(latest.message)}`);
    }

    const currentStatus = latest.data.appointment.status;
    if (isTerminalAppointmentStatus(currentStatus)) {
      redirect(
        `/admin/appointments/${id}?error=${encodeURIComponent("This request is closed and cannot be updated")}`,
      );
    }

    const allowed = getAllowedNextStatuses(currentStatus);
    if (allowed.length === 0) {
      redirect(
        `/admin/appointments/${id}?error=${encodeURIComponent("No status updates are available for this record")}`,
      );
    }
    if (!allowed.includes(nextStatus)) {
      redirect(
        `/admin/appointments/${id}?error=${encodeURIComponent("That status change is not allowed from the current state")}`,
      );
    }

    const updateResult = await patchAdminAppointmentStatus(id, nextStatus);
    if (!updateResult.ok) {
      redirect(`/admin/appointments/${id}?error=${encodeURIComponent(updateResult.message)}`);
    }

    revalidatePath("/admin/appointments");
    revalidatePath(`/admin/appointments/${id}`);
    redirect(`/admin/appointments/${id}?success=Status updated`);
  }

  // Set call slot + Meet URL. The browser <input type="datetime-local">
  // returns a local-timezone string like "2026-05-16T14:30"; we convert
  // to a proper ISO with offset before sending to the backend.
  async function scheduleCallAction(formData: FormData) {
    "use server";

    const rawSlot = String(formData.get("scheduledAt") ?? "").trim();
    const rawUrl = String(formData.get("meetingUrl") ?? "").trim();
    // Browser's `getTimezoneOffset()` in minutes WEST of UTC. Comes from
    // the ScheduleTzOffsetInput client component. Falls back to 0 (UTC)
    // if for any reason the value isn't supplied.
    const rawTzOffset = String(formData.get("scheduledAtTzOffset") ?? "0").trim();
    const tzOffsetMin = Number.isFinite(Number(rawTzOffset))
      ? Number(rawTzOffset)
      : 0;

    let scheduledAt: string | null | undefined = undefined;
    if (rawSlot === "") {
      scheduledAt = null;
    } else {
      // The datetime-local input emits "YYYY-MM-DDTHH:mm" with no zone.
      // Parsing it as UTC ("…Z") gives a stable epoch we can shift by
      // the admin's actual offset to get the right absolute UTC instant.
      // This is independent of the Node server's TZ.
      const asUtcEpoch = Date.parse(`${rawSlot}:00Z`);
      if (!Number.isFinite(asUtcEpoch)) {
        redirect(
          `/admin/appointments/${id}?error=${encodeURIComponent("Invalid date/time")}`,
        );
      }
      const correctedEpoch = asUtcEpoch + tzOffsetMin * 60_000;
      scheduledAt = new Date(correctedEpoch).toISOString();
    }
    const meetingUrl: string | null = rawUrl === "" ? null : rawUrl;

    const result = await patchAdminAppointmentSchedule(id, {
      scheduledAt,
      meetingUrl,
    });
    if (!result.ok) {
      redirect(`/admin/appointments/${id}?error=${encodeURIComponent(result.message)}`);
    }

    revalidatePath("/admin/appointments");
    revalidatePath(`/admin/appointments/${id}`);
    // Backend tells us whether the email actually fired (only fires when
    // both fields are set AND at least one changed value).
    const success = result.data.emailed
      ? "Schedule saved. Email sent to patient with Meet link."
      : "Schedule saved.";
    redirect(`/admin/appointments/${id}?success=${encodeURIComponent(success)}`);
  }

  if (!result.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Operations"
          title="Appointment detail"
          actions={
            <Btn href="/admin/appointments" variant="ghost" iconLeft={<ArrowLeft className="size-3.5" />}>
              Back
            </Btn>
          }
        />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load appointment: {result.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const appointment = result.data.appointment;
  const terminal = isTerminalAppointmentStatus(appointment.status);
  const allowedNext = getAllowedNextStatuses(appointment.status);
  const canUpdate = !terminal && allowedNext.length > 0;

  return (
    <>
      <Link
        href="/admin/appointments"
        className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to queue
      </Link>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <FlagBadge code={appointment.country} size={14} />
            {appointment.country.toUpperCase()}
          </span>
        }
        title={appointment.fullName}
        description={`${appointment.consultationType} · ${formatDate(appointment.createdAt)}`}
        actions={
          <Pill tone={statusToneFor(appointment.status)}>
            {appointment.status.replace(/_/g, " ").toLowerCase()}
          </Pill>
        }
      />

      {messages.error ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {messages.error}
        </p>
      ) : null}
      {messages.success ? (
        <p className="gh-status-success mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {messages.success}
        </p>
      ) : null}

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}
      >
        <div className="grid gap-4">
          <AdminCard>
            <h3 style={cardTitleStyle}>Patient details</h3>
            <p className="mb-4 mt-1 text-[13px] text-[var(--color-text-muted)]">
              Contact info captured at booking.
            </p>
            <dl className="grid gap-4 sm:grid-cols-2">
              <FieldRow label="Full name" value={appointment.fullName} />
              <FieldRow label="Email" value={appointment.email} />
              <FieldRow
                label="Phone"
                value={appointment.phone ?? "No phone provided"}
              />
              <FieldRow label="Country" value={appointment.country.toUpperCase()} />
              <FieldRow label="Consultation type" value={appointment.consultationType} />
              <FieldRow
                label="Payment"
                value={
                  appointment.amountCents
                    ? `${appointment.paymentStatus} · ${(
                        appointment.amountCents / 100
                      ).toFixed(2)} ${appointment.currencyCode ?? ""}`
                    : "No price configured"
                }
              />
              <FieldRow
                label="Scheduled call"
                value={
                  appointment.scheduledAt
                    ? formatDate(appointment.scheduledAt)
                    : "Not scheduled yet"
                }
              />
              <FieldRow
                label="Meeting URL"
                value={
                  appointment.meetingUrl ? (
                    <a
                      href={appointment.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-[var(--color-brand-primary)]"
                    >
                      {appointment.meetingUrl}
                    </a>
                  ) : (
                    "No link set"
                  )
                }
              />
              <FieldRow label="Created" value={formatDate(appointment.createdAt)} />
              <FieldRow label="Updated" value={formatDate(appointment.updatedAt)} full />
            </dl>
          </AdminCard>

          <AdminCard>
            <h3 style={cardTitleStyle}>Notes</h3>
            <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--color-text-body)]">
              {appointment.notes ?? "No notes provided."}
            </p>
          </AdminCard>
        </div>

        <div className="grid gap-4 self-start">
          <AdminCard>
            <h3 style={cardTitleStyle}>Status</h3>
            <p className="mb-4 mt-1 text-[13px] text-[var(--color-text-muted)]">
              {terminal
                ? "This booking request is closed. Status updates are disabled."
                : canUpdate
                  ? "Move the request through the queue."
                  : "No status updates are available for this record."}
            </p>

            {canUpdate ? (
              <form action={updateStatusAction} className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="gh-field-label">Move status to</span>
                  <select
                    name="status"
                    className="gh-select"
                    defaultValue={allowedNext[0]}
                    required
                  >
                    {allowedNext.map((status) => (
                      <option key={status} value={status}>
                        {status.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" className="gh-btn gh-btn-primary w-full">
                  Save status
                </button>
              </form>
            ) : null}
          </AdminCard>

          {/* Patient ↔ admin chat for this appointment. Polling-based;
              only loads when this page is in view. */}
          <AdminCard>
            <h3 style={cardTitleStyle}>Patient chat</h3>
            <p className="mb-4 mt-1 text-[13px] text-[var(--color-text-muted)]">
              Pre-consult messages. The patient sees replies on /account/bookings.
            </p>
            <AdminAppointmentChat appointmentId={appointment.id} />
          </AdminCard>

          {/* Internal (doctor ↔ admin) per-appointment notes. NOT
              patient-visible. Same thread surface as on the doctor portal
              at /doctor/appointments/[id]. */}
          <AdminCard>
            <h3 style={cardTitleStyle}>Internal notes (doctor ↔ admin)</h3>
            <p className="mb-4 mt-1 text-[13px] text-[var(--color-text-muted)]">
              Handoff context between you and the doctor. Hidden from the
              patient.
            </p>
            <InternalMessagesThread
              appointmentId={appointment.id}
              initialItems={internalMessages}
              postEndpoint={`/api/admin/appointments/${appointment.id}/internal-messages`}
              currentRole="ADMIN"
            />
          </AdminCard>

          {/* Schedule the Google Meet call. Filling both fields and saving
              emails the patient with the link via SendGrid. */}
          <AdminCard>
            <h3 style={cardTitleStyle}>Schedule call</h3>
            <p className="mb-4 mt-1 text-[13px] text-[var(--color-text-muted)]">
              Set the slot and paste the Google Meet (or Zoom/Teams/Whereby/Daily)
              link. Saving emails the patient with the link.
            </p>

            <form action={scheduleCallAction} className="flex flex-col gap-3">
              {/* Browser-side TZ offset so the server can convert the
                  datetime-local string to a UTC ISO that matches the
                  admin's actual clock — independent of the Node server
                  timezone. */}
              <ScheduleTzOffsetInput />
              <label className="flex flex-col gap-1.5">
                <span className="gh-field-label">Slot (your local time)</span>
                {/* Client-side conversion of the stored UTC ISO into the
                    admin's browser-local datetime-local string. Avoids
                    server-timezone leakage on reopen. */}
                <ScheduleSlotInput
                  name="scheduledAt"
                  initialIso={appointment.scheduledAt}
                />
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  Leave blank to clear.
                </span>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="gh-field-label">Meeting URL</span>
                <input
                  type="url"
                  name="meetingUrl"
                  className="gh-input"
                  placeholder="https://meet.google.com/abc-defg-hij"
                  defaultValue={appointment.meetingUrl ?? ""}
                  maxLength={500}
                />
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  Allowed hosts: meet.google.com, zoom.us, teams.microsoft.com,
                  whereby.com, daily.co.
                </span>
              </label>

              <button type="submit" className="gh-btn gh-btn-primary w-full">
                Save schedule
              </button>
            </form>
          </AdminCard>
        </div>
      </div>
    </>
  );
}
