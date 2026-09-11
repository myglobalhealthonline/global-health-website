import { CalendarClock } from "lucide-react";
import { fetchDoctorAvailabilityRange } from "@/lib/api/doctor-availability-server";
import { fetchDoctorAppointments } from "@/lib/api/doctor-api";
import { AdminCard, PageHeader } from "@/components/portal-atoms";
import type { CalendarItem } from "@/components/calendar/calendar-types";
import {
  monthGridRangeIso,
  parseWeekAnchor,
  parseYearMonth,
  todayKey,
  weekRangeIso,
} from "@/components/calendar/calendar-utils";
import { DoctorAvailabilityUI } from "./_components/availability-ui";
import { getPortalLocale } from "@/lib/i18n/get-portal-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const dynamic = "force-dynamic";

/** A day either side of the fetched window. The range has to be computed
 *  before the response tells us the clinic timezone, so the padding absorbs
 *  the at-most-one-day disagreement between UTC and the clinic's calendar. */
const RANGE_PAD_MS = 24 * 60 * 60 * 1000;

function padIso(iso: string, deltaMs: number): string {
  return new Date(new Date(iso).getTime() + deltaMs).toISOString();
}

type PageProps = {
  searchParams?: Promise<{ view?: string; ym?: string; wk?: string }>;
};

/**
 * The doctor's one schedule surface: the week/month calendar, the recurring
 * weekly windows, and the bulk slot controls. It used to be two pages
 * (`/doctor/calendar` and this one) that fetched the same data, mapped it the
 * same way, and each offered a different form for adding availability.
 *
 * View state lives in the URL (`view`, `ym`, `wk`) exactly as the admin
 * calendar does it, so a week the doctor is reading survives a refresh, can be
 * linked to, and every mutation can simply `router.refresh()`.
 */
export default async function DoctorAvailabilityPage({ searchParams }: PageProps) {
  const locale = await getPortalLocale();
  const { doctor: d } = loadLocaleBundle(locale);
  const sp = searchParams ? await searchParams : {};

  // Week is the default view, so only "month" is ever spelled out in the URL.
  const view = sp.view === "month" ? "month" : "week";
  const { year, month } = parseYearMonth(sp.ym);
  // Provisional anchor in UTC: the real clinic zone only arrives with the
  // response below, and the ±1 day padding covers the difference.
  const provisionalAnchor = parseWeekAnchor(sp.wk, "UTC");
  const baseRange =
    view === "month"
      ? monthGridRangeIso(year, month)
      : weekRangeIso(provisionalAnchor, "UTC");
  const fromIso = padIso(baseRange.fromIso, -RANGE_PAD_MS);
  const toIso = padIso(baseRange.toIso, RANGE_PAD_MS);

  const [result, appointments] = await Promise.all([
    fetchDoctorAvailabilityRange(fromIso, toIso),
    fetchDoctorAppointments({ pageSize: "100", excludeLegacy: "true" }),
  ]);

  if (!result.ok) {
    return (
      <>
        <PageHeader
          eyebrow={
            <span className="inline-flex items-center gap-2">
              <CalendarClock className="size-3.5" aria-hidden /> {d.availability.eyebrow}
            </span>
          }
          title={d.availability.title}
        />
        <AdminCard>
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            {result.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const clinicTimezone = result.data.clinicTimezone;
  // With the real zone in hand, "this week" means the doctor's week — an
  // explicit `wk` is already timezone-independent and stands as given.
  const weekAnchor = sp.wk ? provisionalAnchor : todayKey(clinicTimezone);

  // One mapping for both views. Cancelled consultations are dropped: they are
  // not commitments and their slot has already been released.
  const consultations: CalendarItem[] = (
    appointments.ok ? appointments.data.items : []
  )
    .filter((a) => a.scheduledAt && a.status !== "CANCELLED")
    .map((a) => ({
      id: a.id,
      kind: "consultation" as const,
      startAt: a.scheduledAt as string,
      endAt: a.endAt,
      status: a.status,
      title: a.fullName,
      meta: {
        patientName: a.fullName,
        consultationType: a.consultationType,
        meetingUrl: a.meetingUrl,
        countryCode: a.countryCode,
      },
    }));

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <CalendarClock className="size-3.5" aria-hidden /> {d.availability.eyebrow}
          </span>
        }
        title={d.availability.title}
        description={d.availability.description}
      />

      <DoctorAvailabilityUI
        initialWindows={result.data.windows}
        initialSlots={result.data.slots}
        consultations={consultations}
        view={view}
        weekAnchor={weekAnchor}
        year={year}
        month={month}
        countryTimeZone={clinicTimezone}
        availableTimezones={result.data.availableTimezones ?? [clinicTimezone]}
        strings={d.availability}
        common={d.common}
        calendarStrings={d.calendar}
      />
    </>
  );
}
