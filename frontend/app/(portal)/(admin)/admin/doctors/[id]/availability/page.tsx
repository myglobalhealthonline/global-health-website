import Link from "next/link";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import {
  deleteAdminDoctorAvailability,
  fetchAdminCalendar,
  fetchAdminClinicsByCountryCode,
  fetchAdminCountries,
  fetchAdminDoctorAvailability,
  fetchAdminDoctorById,
  fetchAdminServices,
  patchAdminDoctorAvailability,
  postAdminDoctorAvailability,
  postAdminManualBooking,
} from "@/lib/admin/admin-api";
import { AdminCard, Btn, PageHeader, Pill } from "../../../_components/atoms";
import { ConfirmDeleteButton } from "../../../_components/confirm-delete-button";
import { FormSection } from "@/components/FormSection";
import type { CalendarItem } from "@/components/calendar/calendar-types";
import {
  parseWeekAnchor,
  weekRangeIso,
} from "@/components/calendar/calendar-utils";
import { BASE_SLOT_MINUTES } from "@/lib/constants";
import { dialCodeForCountry } from "@/lib/phone/dial-codes";
import {
  hasErrors,
  parseDiscountPercent,
  validateManualBooking,
} from "@/lib/admin/manual-booking-validation";
import { AvailabilityWeek } from "./_components/availability-week";
import { EditWindowButton } from "./_components/edit-window-button";

export const dynamic = "force-dynamic";

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

function minutesToHHmm(mins: number) {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function hhmmToMinutes(value: string): number {
  const [h, m] = value.split(":").map((s) => parseInt(s, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) {
    throw new Error("Invalid time");
  }
  return h * 60 + m;
}

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string; wk?: string }>;
};

export default async function AdminDoctorAvailabilityPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};
  const [doctorResult, availabilityResult, countriesResult] = await Promise.all([
    fetchAdminDoctorById(id),
    fetchAdminDoctorAvailability(id),
    fetchAdminCountries(),
  ]);

  async function createAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    try {
      const weekday = Number(formData.get("weekday"));
      const startMinute = hhmmToMinutes(String(formData.get("startTime") ?? ""));
      const endMinute = hhmmToMinutes(String(formData.get("endTime") ?? ""));
      if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
        throw new Error("Invalid weekday");
      }
      if (endMinute <= startMinute) {
        throw new Error("End time must be after start time");
      }
      const res = await postAdminDoctorAvailability(id, {
        weekday,
        startMinute,
        endMinute,
        slotDurationMinutes: BASE_SLOT_MINUTES,
      });
      if (!res.ok) {
        redirect(
          `/admin/doctors/${id}/availability?error=${encodeURIComponent(res.message)}`,
        );
      }
      revalidatePath(`/admin/doctors/${id}/availability`);
      redirect(
        `/admin/doctors/${id}/availability?success=${encodeURIComponent("Availability window added")}`,
      );
    } catch (err) {
      if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
      const message = err instanceof Error ? err.message : "Could not save";
      redirect(
        `/admin/doctors/${id}/availability?error=${encodeURIComponent(message)}`,
      );
    }
  }

  async function updateAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    try {
      const availabilityId = String(formData.get("availabilityId") ?? "");
      if (!availabilityId) {
        throw new Error("Missing id");
      }
      const weekday = Number(formData.get("weekday"));
      const startMinute = hhmmToMinutes(String(formData.get("startTime") ?? ""));
      const endMinute = hhmmToMinutes(String(formData.get("endTime") ?? ""));
      // An unchecked checkbox sends nothing at all — absence means "paused".
      const isActive = formData.get("isActive") !== null;
      if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
        throw new Error("Invalid weekday");
      }
      if (endMinute <= startMinute) {
        throw new Error("End time must be after start time");
      }
      // effectiveFrom/Until are deliberately absent: the admin form doesn't
      // expose them, and omitting them leaves any doctor-set dates untouched.
      const res = await patchAdminDoctorAvailability(id, availabilityId, {
        weekday,
        startMinute,
        endMinute,
        // Normalises any legacy window that still carries another grid step.
        slotDurationMinutes: BASE_SLOT_MINUTES,
        isActive,
      });
      if (!res.ok) {
        redirect(
          `/admin/doctors/${id}/availability?error=${encodeURIComponent(res.message)}`,
        );
      }
      revalidatePath(`/admin/doctors/${id}/availability`);
      redirect(
        `/admin/doctors/${id}/availability?success=${encodeURIComponent("Availability window updated")}`,
      );
    } catch (err) {
      if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
      const message = err instanceof Error ? err.message : "Could not save";
      redirect(
        `/admin/doctors/${id}/availability?error=${encodeURIComponent(message)}`,
      );
    }
  }

  async function deleteAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const availabilityId = String(formData.get("availabilityId") ?? "");
    if (!availabilityId) {
      redirect(`/admin/doctors/${id}/availability?error=Missing+id`);
    }
    const res = await deleteAdminDoctorAvailability(id, availabilityId);
    if (!res.ok) {
      redirect(
        `/admin/doctors/${id}/availability?error=${encodeURIComponent(res.message)}`,
      );
    }
    revalidatePath(`/admin/doctors/${id}/availability`);
    redirect(
      `/admin/doctors/${id}/availability?success=${encodeURIComponent("Availability window removed")}`,
    );
  }

  if (!doctorResult.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Doctor"
          title="Availability"
          actions={
            <Btn
              href={`/admin/doctors/${id}`}
              variant="ghost"
              iconLeft={<ArrowLeft className="size-3.5" />}
            >
              Back
            </Btn>
          }
        />
        <AdminCard>
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            {doctorResult.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const { doctor } = doctorResult.data;
  const windows = availabilityResult.ok ? availabilityResult.data.items : [];

  // ── Week calendar (booked consultations + open slots for this doctor) ──────
  const countryCode = doctor.country.code;
  const clinicTz =
    (countriesResult.ok
      ? countriesResult.data.countries.find((c) => c.code === countryCode)
          ?.bookingSetting?.timezone
      : null) ?? "Europe/Dublin";
  const weekAnchor = parseWeekAnchor(messages.wk, clinicTz);
  const { fromIso, toIso } = weekRangeIso(weekAnchor, clinicTz);

  const [calendarResult, servicesResult, clinicsResult] = await Promise.all([
    fetchAdminCalendar({ from: fromIso, to: toIso, doctorId: id }),
    fetchAdminServices({ countryCode, pageSize: "100" }),
    fetchAdminClinicsByCountryCode(countryCode),
  ]);

  // Same slots+consultations → CalendarItem mapping the admin calendar uses.
  const calendarItems: CalendarItem[] = calendarResult.ok
    ? [
        ...calendarResult.data.consultations.map((c) => ({
          id: `c-${c.id}`,
          kind: "consultation" as const,
          startAt: c.scheduledAt,
          endAt: c.endAt,
          status: c.status,
          title: c.patientName,
          meta: {
            // Both sides carry doctorId: the grid only hides a slot beneath a
            // consultation of the SAME doctor.
            doctorId: c.doctorId ?? null,
            doctorName: c.doctorName,
            patientName: c.patientName,
            consultationType: c.consultationType,
            meetingUrl: c.meetingUrl,
            countryCode: c.countryCode,
            orderId: c.orderId ?? null,
            orderNumber: c.orderNumber ?? null,
          },
        })),
        ...calendarResult.data.slots.map((s) => ({
          id: `s-${s.id}`,
          kind: "slot" as const,
          startAt: s.startAt,
          endAt: s.endAt,
          status: s.status,
          title: s.status,
          meta: {
            doctorId: s.doctorId,
            doctorName: s.doctorName,
            blockReason: s.blockReason,
          },
        })),
      ]
    : [];

  // Services this doctor is actually assigned to (the slim dialog inverts the
  // manual-booking flow: doctor is fixed, so it drives the service list).
  const assignedServiceIds = new Set(
    doctor.assignedServices.map((a) => a.serviceId),
  );
  const services = servicesResult.ok
    ? servicesResult.data.items
        .filter((s) => s.isActive && assignedServiceIds.has(s.id))
        .map((s) => ({
          id: s.id,
          name: s.name,
          durationMinutes: s.durationMinutes,
        }))
    : [];
  const clinics =
    clinicsResult.ok && Array.isArray(clinicsResult.data.clinics)
      ? clinicsResult.data.clinics.map((c) => ({
          id: c.id,
          name: c.name,
          city: c.city ?? null,
        }))
      : [];

  // Book directly from an OPEN slot. Doctor + slot are fixed by the calendar
  // click; the backend claims the slot atomically (OPEN→HELD) and rejects a
  // race with SlotNotAvailableError. Re-validated server-side as a hard guard.
  async function bookAction(formData: FormData) {
    "use server";
    await requireAdminAction();

    const readStr = (key: string): string =>
      (formData.get(key)?.toString() ?? "").trim();
    const readOpt = (key: string): string | null => {
      const v = readStr(key);
      return v === "" ? null : v;
    };

    const back = (message: string, ok: boolean): never => {
      const kind = ok ? "success" : "error";
      redirect(
        `/admin/doctors/${id}/availability?wk=${encodeURIComponent(
          weekAnchor,
        )}&${kind}=${encodeURIComponent(message)}`,
      );
    };

    const consultationMode =
      (readStr("consultationMode") as "ONLINE" | "IN_PERSON") || "ONLINE";
    const serviceId = readStr("serviceId");
    const doctorId = readStr("doctorId");
    const timeSlotId = readStr("timeSlotId");
    const durationRaw = Number(readStr("durationMinutes"));
    const durationMinutes = Number.isFinite(durationRaw) && durationRaw > 0
      ? durationRaw
      : null;
    const phone = readStr("phone");
    const clinicId =
      consultationMode === "IN_PERSON" ? readOpt("clinicId") : null;
    const locationAddress =
      consultationMode === "IN_PERSON" ? readOpt("locationAddress") : null;

    const validation = validateManualBooking({
      fullName: readStr("fullName"),
      email: readStr("email"),
      phone,
      serviceId,
      doctorId,
      timeSlotId,
      consultationMode,
      clinicId: clinicId ?? "",
      locationAddress: locationAddress ?? "",
    });
    if (hasErrors(validation)) {
      back(
        Object.values(validation)[0] ?? "Please complete all required fields.",
        false,
      );
    }

    // Optional discount — a malformed value stops the booking instead of
    // silently charging the full price.
    const discount = parseDiscountPercent(readOpt("discountPercent"));
    if (discount.error) back(discount.error, false);

    const result = await postAdminManualBooking({
      patient: {
        email: readStr("email"),
        fullName: readStr("fullName"),
        phone,
        dateOfBirth: readOpt("dateOfBirth"),
      },
      serviceId,
      doctorId,
      timeSlotId,
      durationMinutes,
      consultationMode,
      clinicId,
      locationAddress,
      notes: readOpt("notes"),
      countryCode: readStr("countryCode"),
      discountPercent: discount.value,
    });

    if (!result.ok) {
      back(result.message, false);
    }
    revalidatePath(`/admin/doctors/${id}/availability`);
    back(
      result.ok && result.data.free
        ? "Appointment booked and comped in full — recorded as paid."
        : discount.value
          ? `Appointment booked with a ${discount.value}% discount — reservation email sent.`
          : "Appointment booked — reservation email sent.",
      true,
    );
  }

  return (
    <>
      <Link
        href={`/admin/doctors/${id}`}
        className="mb-2 inline-flex items-center gap-1.5 text-portal-compact font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to doctor
      </Link>
      <PageHeader
        eyebrow="Doctor"
        title={`${doctor.fullName} · Availability`}
        description="Week calendar of booked appointments and open slots — click an open time to book. Recurring weekly windows below generate the slots (clinic timezone)."
      />

      {messages.error ? (
        <p className="gh-status-warning mb-4 rounded-md border px-4 py-3 text-sm">
          {messages.error}
        </p>
      ) : null}
      {messages.success ? (
        <p className="gh-status-success mb-4 rounded-md border px-4 py-3 text-sm">
          {messages.success}
        </p>
      ) : null}

      <FormSection
        title="Week calendar"
        description="Booked appointments and open slots for this doctor. Click a green (open) time to book directly — patient, service, and mode are filled in a quick dialog; the doctor and time come from the slot you clicked."
      >
        <div className="gh-form-section__span-2 mt-4 min-w-0">
          {calendarResult.ok ? (
            <AvailabilityWeek
              doctorId={id}
              doctorName={doctor.fullName}
              countryCode={countryCode}
              clinicTz={clinicTz}
              weekAnchor={weekAnchor}
              items={calendarItems}
              services={services}
              clinics={clinics}
              defaultDialCode={dialCodeForCountry(countryCode)}
              bookAction={bookAction}
            />
          ) : (
            <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
              {calendarResult.message}
            </p>
          )}
        </div>
      </FormSection>

      <div className="gh-admin-doctor-detail-layout gh-admin-doctor-availability-layout mt-4 grid gap-4">
        <FormSection
          title="Weekly windows"
          description="Times are in the doctor's country clinic timezone (set on the Country page). The doctor portal and patients booking this clinic see these same times."
        >
          {!availabilityResult.ok ? (
            <p className="gh-form-section__span-2 mt-4 gh-status-warning rounded-md border px-4 py-3 text-sm">
              {availabilityResult.message}
            </p>
          ) : windows.length === 0 ? (
            <p className="gh-form-section__span-2 mt-4 text-portal-compact text-[var(--color-text-muted)]">
              No availability windows yet. Add the doctor&apos;s first weekly
              window using the form to the right.
            </p>
          ) : (
            <div className="gh-admin-doctor-availability-table-wrap gh-form-section__span-2 mt-4 overflow-x-auto">
            <table className="gh-admin-doctor-availability-table w-full text-portal-compact">
              <thead>
                <tr className="text-portal-thead font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                  <th className="py-2 text-left">Day</th>
                  <th className="py-2 text-left">From</th>
                  <th className="py-2 text-left">To</th>
                  <th className="py-2 text-left">Slot</th>
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {windows.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--color-border)]">
                    <td className="py-2.5">{WEEKDAYS[row.weekday]?.label ?? row.weekday}</td>
                    <td className="py-2.5 font-mono">{minutesToHHmm(row.startMinute)}</td>
                    <td className="py-2.5 font-mono">{minutesToHHmm(row.endMinute)}</td>
                    <td className="py-2.5">{row.slotDurationMinutes} min</td>
                    <td className="py-2.5">
                      <Pill tone={row.isActive ? "active" : "inactive"}>
                        {row.isActive ? "Active" : "Paused"}
                      </Pill>
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        <EditWindowButton availability={row} action={updateAction} />
                        <form action={deleteAction} className="inline">
                          <input type="hidden" name="availabilityId" value={row.id} />
                          <ConfirmDeleteButton
                            message="Remove this availability window? Any open slots derived from it will be unbookable."
                            className="inline-flex items-center gap-1 text-portal-meta font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-status-error)]"
                            ariaLabel="Delete availability window"
                          >
                            <Trash2 className="size-3.5" aria-hidden /> Remove
                          </ConfirmDeleteButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </FormSection>

        <FormSection title="Add window">
          <form action={createAction} className="gh-admin-doctor-availability-form gh-form-section__span-2 mt-3 grid gap-3">
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Day of week</span>
              <select name="weekday" defaultValue="1" required className="gh-select">
                {WEEKDAYS.map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="gh-admin-doctor-time-grid grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">From (clinic time)</span>
                <input
                  type="time"
                  name="startTime"
                  defaultValue="09:00"
                  required
                  className="gh-input"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">To (clinic time)</span>
                <input
                  type="time"
                  name="endTime"
                  defaultValue="17:00"
                  required
                  className="gh-input"
                />
              </label>
            </div>
            {/* Base grid is fixed product-wide — stated, not chosen. */}
            <p className="text-portal-meta text-[var(--color-text-muted)]">
              Slots are generated on a fixed {BASE_SLOT_MINUTES}-min base grid.
              Consultations consume consecutive base slots to fit their real
              length, so {BASE_SLOT_MINUTES} fits 15/30/45-min consults.
            </p>
            <button type="submit" className="gh-btn gh-btn-primary w-full">
              Add window
            </button>
          </form>
        </FormSection>
      </div>
    </>
  );
}
