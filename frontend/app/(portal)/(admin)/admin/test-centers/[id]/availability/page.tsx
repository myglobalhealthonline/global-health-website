import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import {
  createAdminTestCenterAvailability,
  deleteAdminTestCenterAvailability,
  fetchAdminTestCenterAvailability,
  fetchAdminTestCenterById,
  fetchAdminTestCenterSlots,
  patchAdminTestCenterAvailability,
} from "@/lib/admin/admin-api/test-centers";
import { AdminCard, PageHeader, Pill } from "../../../_components/atoms";
import { ConfirmDeleteButton } from "../../../_components/confirm-delete-button";
import { EditWindowButton } from "../../../doctors/[id]/availability/_components/edit-window-button";
import { FormSection } from "@/components/FormSection";
import { SetCrumbTitle } from "@/components/crumb-title";
import type { CalendarItem } from "@/components/calendar/calendar-types";
import { parseWeekAnchor, weekRangeIso } from "@/components/calendar/calendar-utils";
import { BASE_SLOT_MINUTES } from "@/lib/constants";
import {
  endTimeToMinutes,
  minutesToTimeLabel,
  timeToMinutes,
} from "@/lib/time-of-day";
import { TestCenterAvailabilityWeek } from "./_components/test-center-availability-week";

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

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string; wk?: string }>;
};

/**
 * A test center's bookable inventory: the recurring weekly opening hours, and
 * the week grid of concrete slots they generate.
 *
 * Deliberately the same shape as the doctor availability page — same window
 * table, same grid, same dialogs — because "slots work exactly like a doctor's"
 * is the product rule. What it does NOT carry is the manual booking flow: that
 * arrives with manual test bookings in a later phase.
 */
export default async function AdminTestCenterAvailabilityPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};
  const basePath = `/admin/test-centers/${id}/availability`;

  // The centre + its windows first, because the week range has to be resolved
  // in the CENTRE's timezone — asking for "this week" in the server's zone
  // would fetch the wrong days for any centre not sitting on UTC.
  const [centerResult, availabilityResult] = await Promise.all([
    fetchAdminTestCenterById(id),
    fetchAdminTestCenterAvailability(id),
  ]);

  if (!centerResult.ok) {
    return (
      <AdminCard>
        <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
          {centerResult.message}
        </p>
      </AdminCard>
    );
  }

  const center = centerResult.data?.testCenter;
  if (!center) {
    return (
      <AdminCard>
        <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
          Test center not found.
        </p>
      </AdminCard>
    );
  }

  const windows = availabilityResult.ok
    ? (availabilityResult.data?.availability ?? [])
    : [];
  // The center's country timezone — its window minutes are wall clock in it, so
  // the grid must default to it or "09:00" renders as something else entirely.
  const centerTz = availabilityResult.ok
    ? (availabilityResult.data?.timeZone ?? "UTC")
    : "UTC";

  const weekAnchor = parseWeekAnchor(messages.wk, centerTz);
  const { fromIso, toIso } = weekRangeIso(weekAnchor, centerTz);
  const slotsResult = await fetchAdminTestCenterSlots(id, fromIso, toIso);

  // Slots map onto the shared CalendarItem shape the grid renders. Ids are
  // namespaced `s-` to match the other admin surfaces (see bareSlotId).
  const calendarItems: CalendarItem[] = slotsResult.ok
    ? (slotsResult.data?.slots ?? []).map((slot) => ({
        id: `s-${slot.id}`,
        kind: "slot" as const,
        startAt: slot.startAt,
        endAt: slot.endAt,
        status: slot.status,
        title: slot.status === "BLOCKED" ? "Blocked" : "Open",
        meta: { blockReason: slot.blockReason },
      }))
    : [];

  function back(message: string, ok: boolean): never {
    redirect(
      `${basePath}?${ok ? "success" : "error"}=${encodeURIComponent(message)}`,
    );
  }

  async function createAction(formData: FormData) {
    "use server";
    // The layout guard does not cover server actions — every one re-checks.
    await requireAdminAction();
    try {
      const weekday = Number(formData.get("weekday"));
      const startMinute = timeToMinutes(String(formData.get("startTime") ?? ""));
      const endMinute = endTimeToMinutes(String(formData.get("endTime") ?? ""));
      if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
        throw new Error("Invalid weekday");
      }
      if (endMinute <= startMinute) {
        throw new Error("End time must be after start time");
      }
      const res = await createAdminTestCenterAvailability(id, {
        weekday,
        startMinute,
        endMinute,
        slotDurationMinutes: BASE_SLOT_MINUTES,
      });
      if (!res.ok) back(res.message, false);
      revalidatePath(basePath);
      back("Opening hours added", true);
    } catch (err) {
      if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
      back(err instanceof Error ? err.message : "Could not save", false);
    }
  }

  async function updateAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    try {
      const availabilityId = String(formData.get("availabilityId") ?? "");
      if (!availabilityId) throw new Error("Missing id");
      const weekday = Number(formData.get("weekday"));
      const startMinute = timeToMinutes(String(formData.get("startTime") ?? ""));
      const endMinute = endTimeToMinutes(String(formData.get("endTime") ?? ""));
      // An unchecked checkbox sends nothing at all — absence means "paused".
      const isActive = formData.get("isActive") !== null;
      if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
        throw new Error("Invalid weekday");
      }
      if (endMinute <= startMinute) {
        throw new Error("End time must be after start time");
      }
      const res = await patchAdminTestCenterAvailability(id, availabilityId, {
        weekday,
        startMinute,
        endMinute,
        slotDurationMinutes: BASE_SLOT_MINUTES,
        isActive,
      });
      if (!res.ok) back(res.message, false);
      revalidatePath(basePath);
      back("Opening hours updated", true);
    } catch (err) {
      if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
      back(err instanceof Error ? err.message : "Could not save", false);
    }
  }

  async function deleteAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const availabilityId = String(formData.get("availabilityId") ?? "");
    if (!availabilityId) back("Missing id", false);
    const res = await deleteAdminTestCenterAvailability(id, availabilityId);
    if (!res.ok) back(res.message, false);
    revalidatePath(basePath);
    back("Opening hours removed", true);
  }

  return (
    <>
      <SetCrumbTitle label={center.name} />
      <Link
        href="/admin/test-centers"
        className="mb-2 inline-flex items-center gap-1.5 text-portal-compact font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to test centers
      </Link>
      <PageHeader
        eyebrow="Test centre"
        title={`${center.name} · Availability`}
        description="Week calendar of this centre's bookable slots. The recurring weekly opening hours below generate them, in the centre's country timezone."
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

      {!center.isActive ? (
        <p className="gh-status-warning mb-4 rounded-md border px-4 py-3 text-sm">
          This centre is inactive, so it generates no bookable slots. Opening
          hours set here are kept and take effect again when it is reactivated.
        </p>
      ) : null}

      <FormSection
        title="Week calendar"
        description="Open slots for this centre. Click a slot to block it (⃠ keeps the slot but marks it unavailable) or remove it (🗑 deletes it for that date only, leaving the weekly hours untouched); clicking a blocked slot re-opens it. Select several to act on them together."
      >
        <div className="gh-form-section__span-2 mt-4 min-w-0">
          {slotsResult.ok ? (
            <TestCenterAvailabilityWeek
              testCenterId={id}
              testCenterName={center.name}
              centerTz={centerTz}
              weekAnchor={weekAnchor}
              items={calendarItems}
            />
          ) : (
            <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
              {slotsResult.message}
            </p>
          )}
        </div>
      </FormSection>

      <div className="gh-admin-doctor-detail-layout gh-admin-doctor-availability-layout mt-4 grid gap-4">
        <FormSection
          title="Weekly opening hours"
          description={`Times are in the centre's country timezone (${centerTz}), set on the Country page. Patients booking a test here see these same times.`}
        >
          {!availabilityResult.ok ? (
            <p className="gh-form-section__span-2 mt-4 gh-status-warning rounded-md border px-4 py-3 text-sm">
              {availabilityResult.message}
            </p>
          ) : windows.length === 0 ? (
            <p className="gh-form-section__span-2 mt-4 text-portal-compact text-[var(--color-text-muted)]">
              No opening hours yet. Add this centre&apos;s first weekly window
              using the form to the right.
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
                      <td className="py-2.5">
                        {WEEKDAYS[row.weekday]?.label ?? row.weekday}
                      </td>
                      <td className="py-2.5 font-mono">
                        {minutesToTimeLabel(row.startMinute)}
                      </td>
                      <td className="py-2.5 font-mono">
                        {minutesToTimeLabel(row.endMinute)}
                      </td>
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
                              message="Remove these opening hours? Any open slots derived from them will be removed too."
                              className="inline-flex items-center gap-1 text-portal-meta font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-status-error)]"
                              ariaLabel="Delete opening hours"
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

        <FormSection title="Add opening hours">
          <form
            action={createAction}
            className="gh-admin-doctor-availability-form gh-form-section__span-2 mt-3 grid gap-3"
          >
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
                <span className="gh-field-label">From (centre time)</span>
                <input
                  type="time"
                  name="startTime"
                  defaultValue="09:00"
                  required
                  className="gh-input"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">To (centre time)</span>
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
              A test consumes consecutive base slots to fit its real length, so{" "}
              {BASE_SLOT_MINUTES} fits 15/30/45-min exams.
            </p>
            <button type="submit" className="gh-btn gh-btn-primary w-full">
              Add opening hours
            </button>
          </form>
        </FormSection>
      </div>
    </>
  );
}
