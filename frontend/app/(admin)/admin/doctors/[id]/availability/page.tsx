import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import {
  deleteAdminDoctorAvailability,
  fetchAdminDoctorAvailability,
  fetchAdminDoctorById,
  postAdminDoctorAvailability,
} from "@/lib/admin/admin-api";
import { AdminCard, Btn, PageHeader, Pill } from "../../../_components/atoms";

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
  searchParams?: Promise<{ success?: string; error?: string }>;
};

export default async function AdminDoctorAvailabilityPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};
  const [doctorResult, availabilityResult] = await Promise.all([
    fetchAdminDoctorById(id),
    fetchAdminDoctorAvailability(id),
  ]);

  async function createAction(formData: FormData) {
    "use server";
    try {
      const weekday = Number(formData.get("weekday"));
      const startMinute = hhmmToMinutes(String(formData.get("startTime") ?? ""));
      const endMinute = hhmmToMinutes(String(formData.get("endTime") ?? ""));
      const slotDurationMinutes = Number(
        formData.get("slotDurationMinutes") ?? 30,
      );
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
        slotDurationMinutes,
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

  async function deleteAction(formData: FormData) {
    "use server";
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

  return (
    <>
      <Link
        href={`/admin/doctors/${id}`}
        className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to doctor
      </Link>
      <PageHeader
        eyebrow="Doctor"
        title={`${doctor.fullName} · Availability`}
        description="Weekly recurring windows. Patients booking from the doctor profile see open 30-minute slots in the next 14 days, claimed atomically on submit."
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

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}
      >
        <AdminCard>
          <h3
            className="m-0 text-[var(--color-text-primary)]"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              fontWeight: 800,
            }}
          >
            Weekly windows
          </h3>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            Times are stored as UTC for the MVP — pick the UTC offsets the
            doctor actually consults. (Local-tz support is on the roadmap.)
          </p>
          {!availabilityResult.ok ? (
            <p className="mt-4 gh-status-warning rounded-md border px-4 py-3 text-sm">
              {availabilityResult.message}
            </p>
          ) : windows.length === 0 ? (
            <p className="mt-4 text-[13px] text-[var(--color-text-muted)]">
              No availability windows yet. Add the doctor&apos;s first weekly
              window using the form to the right.
            </p>
          ) : (
            <table className="mt-4 w-full text-[13px]">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
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
                    <td className="py-2.5 text-right">
                      <form action={deleteAction} className="inline">
                        <input type="hidden" name="availabilityId" value={row.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-status-error)]"
                          aria-label="Delete window"
                        >
                          <Trash2 className="size-3.5" /> Remove
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </AdminCard>

        <AdminCard>
          <h3
            className="m-0 text-[var(--color-text-primary)]"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              fontWeight: 800,
            }}
          >
            Add window
          </h3>
          <form action={createAction} className="mt-3 grid gap-3">
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
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">From (UTC)</span>
                <input
                  type="time"
                  name="startTime"
                  defaultValue="09:00"
                  required
                  className="gh-input"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">To (UTC)</span>
                <input
                  type="time"
                  name="endTime"
                  defaultValue="17:00"
                  required
                  className="gh-input"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Slot length (minutes)</span>
              <select
                name="slotDurationMinutes"
                defaultValue="30"
                className="gh-select"
              >
                <option value="15">15</option>
                <option value="20">20</option>
                <option value="30">30</option>
                <option value="45">45</option>
                <option value="60">60</option>
              </select>
            </label>
            <button type="submit" className="gh-btn gh-btn-primary w-full">
              Add window
            </button>
          </form>
        </AdminCard>
      </div>
    </>
  );
}
