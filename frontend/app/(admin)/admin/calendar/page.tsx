import { CalendarRange } from "lucide-react";
import { PageHeader, AdminCard } from "@/components/portal-atoms";
import { fetchAdminCalendar, fetchAdminDoctors } from "@/lib/admin/admin-api";
import {
  monthGridRangeIso,
  parseYearMonth,
} from "@/components/calendar/calendar-utils";
import type { CalendarItem } from "@/components/calendar/calendar-types";
import { AdminCalendarUI } from "./ui";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    ym?: string;
    doctorId?: string;
    type?: string;
    country?: string;
  }>;
};

export default async function AdminCalendarPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { year, month } = parseYearMonth(sp.ym);
  const { fromIso, toIso } = monthGridRangeIso(year, month);

  const [calendar, doctors] = await Promise.all([
    fetchAdminCalendar({
      from: fromIso,
      to: toIso,
      doctorId: sp.doctorId,
      consultationType: sp.type,
      countryCode: sp.country,
    }),
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

  const doctorOptions = doctors.ok
    ? doctors.data.items.map((d) => ({ id: d.id, name: d.fullName }))
    : [];

  // Country + type filter options derived from the doctor roster + the
  // consultations in view (plus whatever filter is currently applied so it
  // never disappears from its own dropdown).
  const countrySet = new Set<string>();
  if (doctors.ok) {
    for (const d of doctors.data.items) {
      if (d.country?.code) countrySet.add(d.country.code);
      for (const ac of d.additionalCountries ?? []) {
        if (ac.country?.code) countrySet.add(ac.country.code);
      }
    }
  }
  if (sp.country) countrySet.add(sp.country);
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
          items={items}
          doctorOptions={doctorOptions}
          typeOptions={typeOptions}
          countryOptions={countryOptions}
          filters={{
            doctorId: sp.doctorId ?? "",
            type: sp.type ?? "",
            country: sp.country ?? "",
          }}
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
