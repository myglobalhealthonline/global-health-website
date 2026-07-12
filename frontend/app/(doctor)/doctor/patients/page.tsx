import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { fetchDoctorPatients } from "@/lib/api/doctor-api";
import {
  AdminSummaryStrip,
  PageHeader,
} from "@/components/portal-atoms";
import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function pick(sp: SearchParams, key: string): string | undefined {
  const v = sp[key];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

export default async function DoctorPatientsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = searchParams ? await searchParams : {};
  const q = pick(sp, "q")?.toLowerCase();
  const result = await fetchDoctorPatients();
  const locale = await getPageLocale();
  const { doctor: d } = loadLocaleBundle(locale);

  // Filter client-side (deduped patient list is bounded already — the
  // /api/doctor/patients endpoint caps source rows at 500). A
  // server-side search adds plumbing without buying much UX win until
  // a doctor breaches the cap.
  // Search now matches name only — phone was stripped from the DTO per
  // GDPR plan, and email is intentionally hidden from doctor view so
  // searching it would be a back-door reveal of which patient owns
  // which address. Doctor's typical lookup is by name + country anyway.
  const items = !result.ok
    ? []
    : q
      ? result.data.items.filter((p) => p.fullName.toLowerCase().includes(q))
      : result.data.items;
  const totalPatients = result.ok ? result.data.items.length : 0;
  const fields: ColumnPriorityField<(typeof items)[number]>[] = [
    {
      key: "patient",
      label: d.patients.colPatient,
      priority: 1,
      render: (p) => <span className="font-semibold text-[var(--portal-text)]">{p.fullName}</span>,
    },
    {
      key: "country",
      label: d.common.country,
      priority: 2,
      render: (p) => <span className="text-xs uppercase">{p.countryCode}</span>,
    },
    {
      key: "firstSeen",
      label: d.common.firstSeen,
      priority: 2,
      render: (p) => (
        <span className="text-xs text-[var(--portal-muted)]">
          {new Date(p.firstSeen).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "bookings",
      label: d.patients.colBookings,
      priority: 2,
      align: "right",
      render: (p) => <span className="font-semibold">{p.appointmentCount}</span>,
    },
    {
      key: "open",
      label: d.patients.colOpen,
      priority: 2,
      align: "right",
      desktopOnly: true,
      render: (p) => (
        <Link
          href={`/doctor/patients/${encodeURIComponent(p.email)}`}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--portal-line)] px-2.5 py-1.5 text-xs font-semibold text-[var(--portal-text)] hover:bg-[var(--portal-well)]"
        >
          {d.common.open} <ChevronRight className="size-3.5" />
        </Link>
      ),
    },
  ];
  const totalBookings = result.ok
    ? result.data.items.reduce((sum, patient) => sum + patient.appointmentCount, 0)
    : 0;
  const countries = result.ok
    ? new Set(result.data.items.map((patient) => patient.countryCode)).size
    : 0;

  return (
    <>
      <PageHeader
        eyebrow={d.patients.eyebrow}
        title={d.patients.title}
        description={d.patients.description}
      />

      {/* Search first, stats compact — the list must be reachable without
          scrolling past 3 full-size stat cards on short/mobile (audit 06-001). */}
      <div className="gh-card gh-doctor-filter-card mb-4 p-4">
        <form className="gh-doctor-filter-actions flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 sm:min-w-[260px]">
            <span className="gh-field-label">{d.common.search}</span>
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder={d.patients.searchPlaceholder}
              className="gh-input"
            />
          </label>
          <button type="submit" className="gh-btn gh-btn-primary text-sm">
            {d.common.apply}
          </button>
          {q ? (
            <Link href="/doctor/patients" className="gh-btn gh-btn-soft text-sm">
              {d.common.reset}
            </Link>
          ) : null}
        </form>
      </div>

      {result.ok ? (
        <AdminSummaryStrip
          className="mb-4"
          compact
          items={[
            {
              label: d.patients.statPatients,
              value: totalPatients,
              hint: q ? d.patients.matchingSearch.replace("{count}", String(items.length)) : d.patients.visiblePanel,
              tone: "brand",
            },
            {
              label: d.patients.statBookings,
              value: totalBookings,
              hint: d.patients.acrossHistory,
              tone: "neutral",
            },
            {
              label: d.patients.statMarkets,
              value: countries,
              hint: d.patients.countriesRepresented,
              tone: "success",
            },
          ]}
        />
      ) : null}

      {!result.ok ? (
        <div className="gh-card p-6">
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            {result.message}
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="gh-card gh-doctor-empty-state p-10 text-center text-sm text-[var(--portal-muted)]">
          {q ? d.patients.emptySearch : d.patients.emptyNone}
        </div>
      ) : (
        <div className="gh-card gh-doctor-table-card p-0 overflow-hidden">
          {/* Email and phone remain excluded from this doctor-scoped list. */}
          <ColumnPriorityTable
            fields={fields}
            rows={items}
            getRowKey={(p) => p.email}
            cardTone={() => "brand"}
            cardActions={(p) => (
              <Link
                href={`/doctor/patients/${encodeURIComponent(p.email)}`}
                className="gh-btn gh-btn-soft text-sm"
              >
                {d.patients.openRecord} <ChevronRight className="size-3.5" />
              </Link>
            )}
          />
        </div>
      )}
    </>
  );
}
