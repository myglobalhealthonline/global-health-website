import { CalendarRange } from "lucide-react";
import { PageHeader, AdminCard } from "@/components/portal-atoms";
import {
  fetchAdminCalendar,
  fetchAdminCountries,
  fetchAdminDoctors,
  type AdminDoctorDto,
} from "@/lib/admin/admin-api";
import { getActiveCountry, scopedCountryCode } from "@/lib/admin/admin-scope";
import {
  monthGridRangeIso,
  parseWeekAnchor,
  parseYearMonth,
  weekRangeIso,
} from "@/components/calendar/calendar-utils";
import type { CalendarItem } from "@/components/calendar/calendar-types";
import { ADMIN_CALENDAR_DEFAULT_TZ } from "@/lib/timezones";
import { AdminCalendarUI } from "./ui";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    ym?: string;
    wk?: string;
    view?: string;
    doctorId?: string;
    type?: string;
    country?: string;
  }>;
};

/** Does this doctor serve `code`, either as their primary country or as an
 *  active additional market? Mirrors the admin doctor roster's country filter
 *  (and the calendar endpoint's own scope). */
function servesCountry(doctor: AdminDoctorDto, code: string): boolean {
  if (doctor.country?.code?.toLowerCase() === code) return true;
  return (doctor.additionalCountries ?? []).some(
    (ac) => ac.active && ac.country?.code?.toLowerCase() === code,
  );
}

export default async function AdminCalendarPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { year, month } = parseYearMonth(sp.ym);
  // Week is the default: it's the view that shows real time-of-day shape, and
  // it matches the doctor availability grid. Month stays a click away.
  const view = sp.view === "month" ? "month" : "week";
  const weekAnchor = parseWeekAnchor(sp.wk, ADMIN_CALENDAR_DEFAULT_TZ);

  // Each view fetches only the window it draws. The week window is padded ±1
  // day because the range is built in the default tz while the admin can
  // re-read the grid in any other one — the padding covers items that shift a
  // column under that offset (the month grid already pads for the same reason).
  const { fromIso, toIso } =
    view === "week"
      ? (() => {
          const w = weekRangeIso(weekAnchor, ADMIN_CALENDAR_DEFAULT_TZ);
          return {
            fromIso: new Date(new Date(w.fromIso).getTime() - 86400000).toISOString(),
            toIso: new Date(new Date(w.toIso).getTime() + 86400000).toISOString(),
          };
        })()
      : monthGridRangeIso(year, month);

  // The header country picker (cookie scope) is the default country filter, so
  // switching to Spain scopes the grid + the doctor dropdown without touching
  // the URL. An explicit `country` in the URL still wins, and `country=all`
  // is the deliberate opt-out that ignores the picker for this page.
  const countriesResult = await fetchAdminCountries();
  const countriesForScope = countriesResult.ok ? countriesResult.data.countries : [];
  const activeCountry = await getActiveCountry(countriesForScope);
  const countryCode =
    sp.country === "all" ? undefined : scopedCountryCode(sp.country, activeCountry);

  const [calendar, doctors] = await Promise.all([
    fetchAdminCalendar({
      from: fromIso,
      to: toIso,
      doctorId: sp.doctorId,
      consultationType: sp.type,
      countryCode,
    }),
    // Fetched unscoped: the roster is small, and keeping every doctor lets the
    // dropdown still name a doctorId that falls outside the current scope
    // instead of rendering a blank select.
    fetchAdminDoctors({ pageSize: "100" }),
  ]);

  const consultations = calendar.ok ? calendar.data.consultations : [];
  const slots = calendar.ok ? calendar.data.slots : [];

  // Doctor → primary-country map so an open slot can deep-link into the
  // manual-booking form (which is country-scoped).
  const doctorCountry = new Map<string, string>();
  if (doctors.ok) {
    for (const d of doctors.data.items) {
      if (d.country?.code) doctorCountry.set(d.id, d.country.code);
    }
  }

  const items: CalendarItem[] = [
    ...consultations.map((c) => ({
      id: `c-${c.id}`,
      kind: "consultation" as const,
      startAt: c.scheduledAt,
      endAt: c.endAt,
      status: c.status,
      title: c.patientName,
      meta: {
        // Both sides carry doctorId: the week grid only hides a slot beneath a
        // consultation of the SAME doctor, so one doctor's booking can't blank
        // out the rest of the roster's open slots.
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
    ...slots.map((s) => ({
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
        countryCode: doctorCountry.get(s.doctorId) ?? null,
      },
    })),
  ];

  const allDoctors = doctors.ok ? doctors.data.items : [];
  const doctorOptions = allDoctors
    .filter((d) => !countryCode || servesCountry(d, countryCode))
    .map((d) => ({ id: d.id, name: d.fullName }));

  // A doctorId can outlive the scope it was picked under (the header country
  // picker only refreshes — it doesn't rewrite the URL). Keep it named in the
  // dropdown so the admin can see why the grid is empty.
  if (sp.doctorId && !doctorOptions.some((o) => o.id === sp.doctorId)) {
    const outside = allDoctors.find((d) => d.id === sp.doctorId);
    doctorOptions.unshift({
      id: sp.doctorId,
      name: outside ? `${outside.fullName} (outside ${countryCode?.toUpperCase()})` : "Selected doctor",
    });
  }

  // Country + type filter options derived from the doctor roster + the
  // consultations in view (plus whatever filter is currently applied so it
  // never disappears from its own dropdown).
  const countrySet = new Set<string>();
  for (const d of allDoctors) {
    if (d.country?.code) countrySet.add(d.country.code);
    for (const ac of d.additionalCountries ?? []) {
      if (ac.country?.code) countrySet.add(ac.country.code);
    }
  }
  if (countryCode) countrySet.add(countryCode);
  const countryOptions = [...countrySet].sort();

  const typeSet = new Set<string>(consultations.map((c) => c.consultationType));
  if (sp.type) typeSet.add(sp.type);
  const typeOptions = [...typeSet].sort();

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <CalendarRange className="size-3.5" aria-hidden /> Schedule
          </span>
        }
        title="Calendar"
        description="All doctors' availability and scheduled consultations. Filter by doctor, consultation type, or country. Click an open slot's Book action to start a manual booking."
        icon={<CalendarRange aria-hidden />}
      />

      {calendar.ok ? (
        <AdminCalendarUI
          year={year}
          month={month}
          view={view}
          weekAnchor={weekAnchor}
          items={items}
          doctorOptions={doctorOptions}
          typeOptions={typeOptions}
          countryOptions={countryOptions}
          filters={{
            doctorId: sp.doctorId ?? "",
            type: sp.type ?? "",
            // "all" is the select's value for the unscoped option, so an
            // unfiltered calendar keeps a real selection instead of a blank.
            country: countryCode ?? "all",
          }}
          countryParam={sp.country ?? ""}
        />
      ) : (
        <AdminCard>
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            {calendar.message}
          </p>
        </AdminCard>
      )}
    </>
  );
}
