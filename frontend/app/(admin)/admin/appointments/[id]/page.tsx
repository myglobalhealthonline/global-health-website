import Link from "next/link";
import { cookies } from "next/headers";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarClock, LayoutDashboard, MessageSquare, UserRound } from "lucide-react";
import { MANUAL_BOOKING_COOKIE } from "@/lib/admin/manual-booking-cookie";
import {
  fetchAdminAppointmentById,
  fetchAdminClinicsByCountryCode,
  fetchAdminDoctors,
  fetchAdminInternalMessages,
  patchAdminAppointmentSchedule,
  patchAdminAppointmentStatus,
  patchAdminAppointmentUpdate,
} from "@/lib/admin/admin-api";
import { formatAppDateTime, formatAppDateTimeWithZone } from "@/lib/format-datetime";
import { formatOrderDisplayId } from "@/lib/format-order-display";
import { InternalMessagesThread } from "@/components/chat/InternalMessagesThread";
import { AdminAppointmentChat } from "../_components/admin-appointment-chat";
import {
  getAllowedNextStatuses,
  isTerminalAppointmentStatus,
} from "@/lib/admin/appointment-status";
import { FlagBadge } from "../../_components/flag-badge";
import { SetCrumbTitle } from "../../_components/crumb-title";
import { ScheduleTzOffsetInput } from "../_components/schedule-tz-offset";
import { ScheduleSlotInput } from "../_components/schedule-slot-input";
import { AdminAppointmentTabs } from "./_components/appointment-tabs";
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

/** Only allow http(s) URLs as hrefs — these come from query params, so a
 *  `javascript:`/`data:` URI must never be rendered as a clickable link. */
function safeHttpUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : null;
}

// This page renders on the server, so a bare `toLocaleString` would resolve
// to the Node host's timezone (UTC in prod) and print an hour that disagrees
// with the order pages. Always go through the shared formatter's explicit
// display zone.
const formatDate = formatAppDateTime;

/** Clinic zone — the fallback for legacy bookings with no captured patient tz. */
const CLINIC_TZ = "Europe/Dublin";

// Human name for the raw consultationType enum, matching the patient-facing
// labels in locales/en/account.json (the admin API only returns the enum).
// Falls back to a title-cased form for any unmapped value.
const CONSULTATION_NAMES: Record<string, string> = {
  general: "GP consultation",
  specialist: "Specialist consultation",
  prescription: "Online prescription",
  health_test: "Health test",
  home_delivery: "Home delivery",
};

function consultationName(type: string): string {
  const key = type.toLowerCase().replace(/[\s-]+/g, "_");
  return (
    CONSULTATION_NAMES[key] ??
    type
      .replace(/[-_]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ")
  );
}

function statusToneFor(status: string): PillTone {
  if (status === "COMPLETED") return "published";
  if (status === "CANCELLED") return "inactive";
  if (status === "CONTACTED") return "active";
  if (status === "UNDER_REVIEW") return "pending";
  return "neutral";
}

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
    <div className={full ? "gh-admin-appointment-field-row sm:col-span-2" : "gh-admin-appointment-field-row"}>
      <p className="text-portal-thead font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-portal-body text-[var(--color-text-primary)]">{value}</p>
    </div>
  );
}

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    error?: string;
    success?: string;
    /** Set after admin-initiated manual booking. The actual recovery
     *  secrets (temp password + invite/payment links) are read from a
     *  short-lived httpOnly cookie, NOT the URL. */
    manualBooked?: string;
  }>;
};

type ManualBookingRecovery = {
  tempPassword: string;
  setPasswordUrl: string;
  paymentUrl: string;
  emailQueued: string;
};

export default async function AdminAppointmentDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};
  // Read manual-booking recovery secrets from the short-lived httpOnly
  // cookie set by the create action (never from the URL).
  let manualBooking: ManualBookingRecovery | null = null;
  if (messages.manualBooked === "1") {
    const raw = (await cookies()).get(MANUAL_BOOKING_COOKIE)?.value;
    if (raw) {
      try {
        manualBooking = JSON.parse(raw) as ManualBookingRecovery;
      } catch {
        manualBooking = null;
      }
    }
  }
  const [result, internalMessagesResult] = await Promise.all([
    fetchAdminAppointmentById(id),
    fetchAdminInternalMessages(id),
  ]);
  const internalMessages = internalMessagesResult.ok
    ? internalMessagesResult.data.items
    : [];

  async function updateStatusAction(formData: FormData) {
    "use server";
    await requireAdminAction();

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
    await requireAdminAction();

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

    // Delivery mode. Form sends "ONLINE" or "IN_PERSON". Default stays
    // ONLINE; flipping to IN_PERSON unlocks the clinic picker block.
    const rawMode = String(formData.get("consultationMode") ?? "").trim();
    const consultationModePatch: "ONLINE" | "IN_PERSON" | undefined =
      rawMode === "ONLINE" || rawMode === "IN_PERSON" ? rawMode : undefined;

    // Clinic / location for in-person consults. The form submits ONE of:
    // - `clinicId=<id>` when a known clinic is picked
    // - `clinicId=__custom__` + `locationAddress=<text>` for free-text
    // - `clinicId=` (empty) to clear both
    // The two fields are mutually exclusive at the backend (XOR refine).
    const rawClinic = String(formData.get("clinicId") ?? "").trim();
    const rawLocation = String(formData.get("locationAddress") ?? "").trim();
    let clinicIdPatch: string | null | undefined = undefined;
    let locationAddressPatch: string | null | undefined = undefined;
    if (formData.has("clinicId")) {
      if (rawClinic === "" || rawClinic === "__none__") {
        clinicIdPatch = null;
        locationAddressPatch = null;
      } else if (rawClinic === "__custom__") {
        clinicIdPatch = null;
        locationAddressPatch = rawLocation || null;
      } else {
        clinicIdPatch = rawClinic;
        locationAddressPatch = null;
      }
    }

    const result = await patchAdminAppointmentSchedule(id, {
      scheduledAt,
      meetingUrl,
      ...(consultationModePatch !== undefined
        ? { consultationMode: consultationModePatch }
        : {}),
      ...(clinicIdPatch !== undefined ? { clinicId: clinicIdPatch } : {}),
      ...(locationAddressPatch !== undefined
        ? { locationAddress: locationAddressPatch }
        : {}),
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

  // Reassign the booking to a different doctor. Routed through the
  // /update endpoint (NOT /schedule) so it runs the full notification
  // path: patient + new + previous doctor, each by email AND WhatsApp,
  // and syncs OrderItem.doctorId so future reminders follow the change.
  async function reassignDoctorAction(formData: FormData) {
    "use server";
    await requireAdminAction();

    const rawDoctor = String(formData.get("doctorId") ?? "").trim();
    const changeReason = String(formData.get("changeReason") ?? "").trim();

    const result = await patchAdminAppointmentUpdate(id, {
      doctorId: rawDoctor === "" ? null : rawDoctor,
      changeReason,
    });
    if (!result.ok) {
      redirect(`/admin/appointments/${id}?error=${encodeURIComponent(result.message)}`);
    }

    revalidatePath("/admin/appointments");
    revalidatePath(`/admin/appointments/${id}`);
    let message = "Doctor reassigned. Patient and doctor notified by email + WhatsApp.";
    if (result.data.meetingUrl) {
      message += " New Meet link generated.";
    }
    redirect(`/admin/appointments/${id}?success=${encodeURIComponent(message)}`);
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

  const isInPerson = appointment.consultationMode === "IN_PERSON";
  const clinicsResult = isInPerson
    ? await fetchAdminClinicsByCountryCode(appointment.country)
    : null;
  const clinicOptions = clinicsResult && clinicsResult.ok
    ? clinicsResult.data.clinics
    : [];

  // Doctors available in this appointment's country, for the reassign
  // control. Filtered to active only — matches the orders-page panel.
  const doctorsResult = await fetchAdminDoctors({
    countryCode: appointment.country,
    pageSize: "100",
  });
  const allDoctors =
    doctorsResult.ok && doctorsResult.data.items ? doctorsResult.data.items : [];
  const doctors = allDoctors.filter((d) => d.active);
  // Name lookup runs over the UNFILTERED list — a booking can still be
  // assigned to a doctor who has since been deactivated, and the overview
  // must name them even though the reassign <select> hides them.
  const assignedDoctor = appointment.doctorId
    ? (allDoctors.find((d) => d.id === appointment.doctorId) ?? null)
    : null;

  const assignedClinic = appointment.clinicId
    ? (clinicOptions.find((c) => c.id === appointment.clinicId) ?? null)
    : null;
  const locationLabel = assignedClinic
    ? [assignedClinic.name, assignedClinic.city].filter(Boolean).join(" · ")
    : (appointment.locationAddress ?? "No location set");

  // Prefer the booked order-line name ("IE - General Consultation"); fall
  // back to a label mapped from the raw consultationType enum.
  const consultationDisplay =
    appointment.serviceName ?? consultationName(appointment.consultationType);

  return (
    <>
      {/* Replaces the opaque id crumb ("cmrtif3u…") with the patient name. */}
      <SetCrumbTitle label={appointment.fullName} />
      <Link
        href="/admin/appointments"
        className="mb-2 inline-flex items-center gap-1.5 text-portal-compact font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
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
        description={`${consultationDisplay} · ${formatDate(appointment.createdAt)}`}
        icon={<UserRound aria-hidden />}
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

      {manualBooking ? (
        <div className="gh-admin-appointment-recovery mb-4 rounded-[var(--radius-card-sm)] border border-[var(--color-border-strong)] bg-[var(--color-background-soft)] px-4 py-3 text-sm">
          <p className="font-bold text-[var(--color-text-primary)]">
            Manual booking created.
            {manualBooking.emailQueued === "1"
              ? " Pre-payment automation started (WhatsApp + reservation email)."
              : " Automation failed — copy the details below and share manually."}
          </p>
          <dl className="mt-2 grid gap-1 text-portal-compact text-[var(--color-text-body)]">
            {manualBooking.tempPassword ? (
              <div>
                <dt className="inline font-semibold">Temp password:</dt>{" "}
                <code className="rounded bg-[var(--color-background-page)] px-2 py-0.5 font-mono">
                  {manualBooking.tempPassword}
                </code>
              </div>
            ) : (
              <div className="text-[var(--color-text-muted)]">
                Existing patient — their existing password is untouched.
                Share the set-password URL below if they need to reset.
              </div>
            )}
            {safeHttpUrl(manualBooking.setPasswordUrl) ? (
              <div className="break-all">
                <dt className="inline font-semibold">Set-password URL (7d):</dt>{" "}
                <a
                  className="text-[var(--color-primary)] underline"
                  href={safeHttpUrl(manualBooking.setPasswordUrl)!}
                  rel="noopener noreferrer"
                >
                  {manualBooking.setPasswordUrl}
                </a>
              </div>
            ) : null}
            {safeHttpUrl(manualBooking.paymentUrl) ? (
              <div className="break-all">
                <dt className="inline font-semibold">Stripe payment URL:</dt>{" "}
                <a
                  className="text-[var(--color-primary)] underline"
                  href={safeHttpUrl(manualBooking.paymentUrl)!}
                  rel="noopener noreferrer"
                >
                  {manualBooking.paymentUrl}
                </a>
              </div>
            ) : (
              <div className="text-[var(--color-text-muted)]">
                Stripe not configured — invoice this booking manually.
              </div>
            )}
          </dl>
        </div>
      ) : null}

      <AdminAppointmentTabs
        ariaLabel="Appointment sections"
        tabs={[
          {
            id: "overview",
            label: "Overview",
            icon: <LayoutDashboard aria-hidden />,
            panel: (
              <div className="grid gap-4">
                <AdminCard>
                  <h3 className="gh-admin-card-title">Patient details</h3>
                  <p className="mb-4 mt-1 text-portal-compact text-[var(--color-text-muted)]">
                    Contact info captured at booking.
                  </p>
                  <div className="gh-admin-appointment-detail-grid">
                    <FieldRow label="Full name" value={appointment.fullName} />
                    <FieldRow label="Email" value={appointment.email} />
                    <FieldRow
                      label="Phone"
                      value={appointment.phone ?? "No phone provided"}
                    />
                    <FieldRow label="Country" value={appointment.country.toUpperCase()} />
                    <FieldRow label="Consultation" value={consultationDisplay} />
                    <FieldRow
                      label="Order"
                      value={
                        appointment.orderId ? (
                          <Link
                            href={`/admin/orders/${appointment.orderId}`}
                            className="underline text-[var(--color-brand-primary)]"
                          >
                            {formatOrderDisplayId({
                              id: appointment.orderId,
                              orderNumber: appointment.orderNumber,
                            })}
                          </Link>
                        ) : (
                          "No linked order"
                        )
                      }
                    />
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
                      label="Assigned doctor"
                      value={
                        assignedDoctor
                          ? `${assignedDoctor.fullName}${assignedDoctor.active ? "" : " (inactive)"}`
                          : appointment.doctorId
                            ? "Assigned — doctor not in this country's list"
                            : "Unassigned"
                      }
                    />
                    <FieldRow
                      label="Mode"
                      value={isInPerson ? "In person (at a clinic)" : "Online (video call)"}
                    />
                    {/* Rendered in the timezone the patient booked in and
                        named by country — the exact string their booking
                        notifications show. Falls back to the clinic zone for
                        legacy bookings that captured no patient timezone. */}
                    <FieldRow
                      label="Scheduled call"
                      value={
                        appointment.scheduledAt
                          ? formatAppDateTimeWithZone(
                              appointment.scheduledAt,
                              appointment.patientTimezone ?? CLINIC_TZ,
                            )
                          : "Not scheduled yet"
                      }
                    />
                    {isInPerson ? (
                      <FieldRow label="Location" value={locationLabel} />
                    ) : null}
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
                  </div>
                </AdminCard>

                <AdminCard>
                  <h3 className="gh-admin-card-title">Notes</h3>
                  <p className="mt-3 whitespace-pre-wrap text-portal-body leading-relaxed text-[var(--color-text-body)]">
                    {appointment.notes ?? "No notes provided."}
                  </p>
                </AdminCard>

                <AdminCard>
                  <h3 className="gh-admin-card-title">Status</h3>
                  <p className="mb-4 mt-1 text-portal-compact text-[var(--color-text-muted)]">
                    {terminal
                      ? "This booking request is closed. Status updates are disabled."
                      : canUpdate
                        ? "Move the request through the queue."
                        : "No status updates are available for this record."}
                  </p>

                  {canUpdate ? (
                    <form action={updateStatusAction} className="gh-admin-appointment-side-form">
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
              </div>
            ),
          },
          {
            id: "schedule",
            label: "Schedule",
            icon: <CalendarClock aria-hidden />,
            panel: (
              <div className="grid gap-4">
                {/* Schedule the Google Meet call. Filling both fields and
                    saving emails the patient with the link via SendGrid. */}
                <AdminCard>
                  <h3 className="gh-admin-card-title">Schedule call</h3>
                  <p className="mb-4 mt-1 text-portal-compact text-[var(--color-text-muted)]">
                    Set the slot and paste the Google Meet (or Zoom/Teams/Whereby/Daily)
                    link. Saving emails the patient with the link.
                  </p>

                  <form action={scheduleCallAction} className="gh-admin-appointment-side-form">
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
                      <span className="text-portal-thead text-[var(--color-text-muted)]">
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
                      <span className="text-portal-thead text-[var(--color-text-muted)]">
                        Allowed hosts: meet.google.com, zoom.us, teams.microsoft.com,
                        whereby.com, daily.co.
                      </span>
                    </label>

                    <label className="flex flex-col gap-1.5">
                      <span className="gh-field-label">Mode</span>
                      <select
                        name="consultationMode"
                        defaultValue={appointment.consultationMode ?? "ONLINE"}
                        className="gh-select"
                      >
                        <option value="ONLINE">Online (video call)</option>
                        <option value="IN_PERSON">In person (at a clinic)</option>
                      </select>
                      <span className="text-portal-thead text-[var(--color-text-muted)]">
                        In-person hides the Meet link + shows a venue picker. Save
                        the form once to switch modes, then re-open to see the picker.
                      </span>
                    </label>

                    {isInPerson ? (
                      <fieldset className="gh-admin-appointment-venue">
                        <legend className="px-1 text-portal-thead font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                          Where (in-person)
                        </legend>
                        <label className="flex flex-col gap-1.5">
                          <span className="gh-field-label">Clinic</span>
                          <select
                            name="clinicId"
                            defaultValue={
                              appointment.clinicId
                                ? appointment.clinicId
                                : appointment.locationAddress
                                  ? "__custom__"
                                  : "__none__"
                            }
                            className="gh-select"
                          >
                            <option value="__none__">— No location set —</option>
                            {clinicOptions.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                                {c.city ? ` · ${c.city}` : ""}
                              </option>
                            ))}
                            <option value="__custom__">Other (custom address)…</option>
                          </select>
                          <span className="text-portal-thead text-[var(--color-text-muted)]">
                            Pick from {appointment.country.toUpperCase()} clinics, or
                            switch to a free-text address below.
                          </span>
                        </label>
                        <label className="flex flex-col gap-1.5">
                          <span className="gh-field-label">
                            Custom address (used only when &ldquo;Other&rdquo; is selected)
                          </span>
                          <input
                            type="text"
                            name="locationAddress"
                            className="gh-input"
                            placeholder="Street, city, postal code"
                            defaultValue={appointment.locationAddress ?? ""}
                            maxLength={500}
                          />
                        </label>
                      </fieldset>
                    ) : null}

                    <button type="submit" className="gh-btn gh-btn-primary w-full">
                      Save schedule
                    </button>
                  </form>
                </AdminCard>

                {/* Reassign the booking to a different doctor. Goes through
                    the /update endpoint so patient + new + previous doctor
                    are all notified (email + WhatsApp) and future reminders
                    follow the new doctor. */}
                <AdminCard>
                  <h3 className="gh-admin-card-title">Assigned doctor</h3>
                  <p className="mb-4 mt-1 text-portal-compact text-[var(--color-text-muted)]">
                    Reassign this booking if the original doctor is unavailable.
                    The patient and both doctors are notified by email + WhatsApp,
                    and all future reminders switch to the new doctor.
                  </p>

                  <form action={reassignDoctorAction} className="gh-admin-appointment-side-form">
                    <label className="flex flex-col gap-1.5">
                      <span className="gh-field-label">Doctor</span>
                      <select
                        name="doctorId"
                        className="gh-select"
                        defaultValue={appointment.doctorId ?? ""}
                      >
                        <option value="">Unassigned</option>
                        {doctors.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.fullName}
                          </option>
                        ))}
                      </select>
                      {!doctorsResult.ok ? (
                        <span className="text-portal-thead text-[var(--color-text-muted)]">
                          Could not load doctors: {doctorsResult.message}
                        </span>
                      ) : null}
                    </label>

                    <label className="flex flex-col gap-1.5">
                      <span className="gh-field-label">
                        Reason for change{" "}
                        <span className="text-[var(--color-text-muted)]">(required)</span>
                      </span>
                      <textarea
                        name="changeReason"
                        className="gh-input min-h-[96px]"
                        required
                        minLength={10}
                        maxLength={500}
                        placeholder="Explain why the doctor is being changed (shown to patient and doctor)."
                      />
                    </label>

                    <button type="submit" className="gh-btn gh-btn-primary w-full">
                      Reassign &amp; notify
                    </button>
                  </form>
                </AdminCard>
              </div>
            ),
          },
          {
            id: "messages",
            label: "Messages",
            icon: <MessageSquare aria-hidden />,
            panel: (
              <div className="grid gap-4">
                {/* Patient ↔ admin chat for this appointment. Polling-based;
                    only loads when this panel is active. `id` is the
                    deep-link target for the notification bell
                    (`?tab=messages#patient-chat`). */}
                <div id="patient-chat" className="scroll-mt-24">
                  <AdminCard>
                    <h3 className="gh-admin-card-title">Patient chat</h3>
                    <p className="mb-4 mt-1 text-portal-compact text-[var(--color-text-muted)]">
                      Pre-consult messages. The patient sees replies in their Messages tab.
                    </p>
                    <AdminAppointmentChat appointmentId={appointment.id} />
                  </AdminCard>
                </div>

                {/* Internal (doctor ↔ admin) per-appointment notes. NOT
                    patient-visible. Same thread surface as on the doctor
                    portal at /doctor/appointments/[id]. */}
                <AdminCard>
                  <h3 className="gh-admin-card-title">Internal notes (doctor ↔ admin)</h3>
                  <p className="mb-4 mt-1 text-portal-compact text-[var(--color-text-muted)]">
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
              </div>
            ),
          },
        ]}
      />
    </>
  );
}
