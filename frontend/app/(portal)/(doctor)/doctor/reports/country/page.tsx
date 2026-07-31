import Link from "next/link";
import { ArrowLeft, CalendarCheck, CircleSlash, CreditCard, Stethoscope } from "lucide-react";
import { fetchDoctorCountryConsultations } from "@/lib/api/doctor-api";
import {
  AdminEmptyState,
  AdminSummaryStrip,
  Btn,
  PageHeader,
  Pill,
} from "@/components/portal-atoms";
import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";
import {
  doctorAppointmentView,
  doctorAppointmentViewTone,
} from "@/lib/api/appointment-status-labels";
import { getPortalLocale } from "@/lib/i18n/get-portal-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

/**
 * Country-director oversight: every consultation in the markets an admin has
 * granted this doctor, across ALL doctors. Read-only by design — no drill-in
 * link, no patient contact details, no money. The backend is the authority on
 * which countries are visible; this page only renders what it returns.
 */
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function pick(sp: SearchParams, key: string): string | undefined {
  const v = sp[key];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

export default async function DoctorCountryConsultationsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const locale = await getPortalLocale();
  const { doctor: d } = loadLocaleBundle(locale);
  const sp = searchParams ? await searchParams : {};
  const from = pick(sp, "from");
  const to = pick(sp, "to");
  const countryCode = pick(sp, "countryCode");
  const consultationType = pick(sp, "consultationType");
  const status = pick(sp, "status");
  const paymentStatus = pick(sp, "paymentStatus");
  const doctorId = pick(sp, "doctorId");
  const search = pick(sp, "search");
  const page = pick(sp, "page");

  const result = await fetchDoctorCountryConsultations({
    from,
    to,
    countryCode,
    consultationType,
    status,
    paymentStatus,
    doctorId,
    search,
    page,
  });

  const header = (
    <PageHeader
      eyebrow={d.countryConsultations.eyebrow}
      title={d.countryConsultations.title}
      description={d.countryConsultations.description}
      actions={
        <Btn
          href="/doctor/reports"
          variant="ghost"
          iconLeft={<ArrowLeft className="size-3.5" />}
        >
          {d.countryConsultations.backToReports}
        </Btn>
      }
    />
  );

  // 403 (not a director / country not granted) and transport failures land in
  // the same place — the message from the backend already explains which.
  if (!result.ok) {
    return (
      <>
        {header}
        <div className="gh-card p-6">
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            {result.status === 403 ? d.countryConsultations.noAccess : result.message}
          </p>
        </div>
      </>
    );
  }

  const data = result.data;
  const items = data.items;
  // Only offer the country filter when the grant covers more than one market —
  // with a single grant it could only ever narrow to the value already shown.
  const showCountryFilter = data.countries.length > 1;
  const countFor = (statusValue: string) =>
    data.counts.byStatus.find((r) => r.status === statusValue)?.count ?? 0;
  const paidCount =
    data.counts.byPayment.find((r) => r.paymentStatus === "PAID")?.count ?? 0;

  const viewStatusText: Record<string, string> = {
    waiting_payment: d.appointments.statusWaitingPayment,
    confirmed: d.appointments.statusConfirmed,
    cancelled: d.appointments.statusCancelled,
    concluded: d.appointments.statusConcluded,
  };
  const typeText: Record<string, string> = {
    general: d.appointments.typeGeneral,
    specialist: d.appointments.typeSpecialist,
    prescription: d.appointments.typePrescription,
    "health-test": d.appointments.typeHealthTest,
    "follow-up": d.appointments.typeFollowUp,
  };
  const paymentText: Record<string, string> = {
    UNPAID: d.reports.paymentUnpaid,
    PENDING: d.reports.paymentPending,
    PAID: d.reports.paymentPaid,
    REFUNDED: d.reports.paymentRefunded,
    FAILED: d.reports.paymentFailed,
  };

  type Row = (typeof items)[number];
  const fields: ColumnPriorityField<Row>[] = [
    {
      key: "date",
      label: d.countryConsultations.colDate,
      priority: 1,
      render: (r) => (
        <span className="text-xs text-[var(--portal-muted)]">
          {/* Unscheduled requests have no scheduledAt — fall back to when the
              request came in rather than rendering an empty cell. */}
          {new Date(r.scheduledAt ?? r.createdAt).toLocaleDateString()}
          {r.scheduledAt ? null : (
            <span className="ml-1 italic">({d.countryConsultations.unscheduled})</span>
          )}
        </span>
      ),
    },
    {
      key: "patient",
      label: d.countryConsultations.colPatient,
      priority: 1,
      cardPrimary: true,
      render: (r) => (
        <span className="font-semibold text-[var(--portal-text)]">{r.patientName}</span>
      ),
    },
    {
      key: "doctor",
      label: d.countryConsultations.colDoctor,
      priority: 1,
      render: (r) => (
        <span className="text-[var(--portal-text)]">
          {r.doctorName ?? d.countryConsultations.unassigned}
        </span>
      ),
    },
    {
      key: "type",
      label: d.common.type,
      priority: 2,
      render: (r) => (
        <span className="text-xs capitalize">
          {typeText[r.consultationType] ?? r.consultationType.replace(/-/g, " ")}
        </span>
      ),
    },
    {
      key: "status",
      label: d.countryConsultations.colStatus,
      priority: 2,
      render: (r) => {
        const view = doctorAppointmentView(r.status, r.paymentStatus);
        return <Pill tone={doctorAppointmentViewTone(view)}>{viewStatusText[view]}</Pill>;
      },
    },
    {
      key: "payment",
      label: d.reports.filterPayment,
      priority: 2,
      render: (r) => (
        <span className="text-xs">{paymentText[r.paymentStatus] ?? r.paymentStatus}</span>
      ),
    },
    ...(showCountryFilter
      ? [
          {
            key: "country",
            label: d.common.country,
            priority: 3 as const,
            render: (r: Row) => (
              <span className="text-xs uppercase">{r.countryCode}</span>
            ),
          },
        ]
      : []),
  ];

  // Preserve every active filter when paging — a bare ?page=2 would silently
  // reset the range and show a different result set than the one being paged.
  const pageHref = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({
      from,
      to,
      countryCode,
      consultationType,
      status,
      paymentStatus,
      doctorId,
      search,
    })) {
      if (value) params.set(key, value);
    }
    params.set("page", String(target));
    return `/doctor/reports/country?${params.toString()}`;
  };

  return (
    <>
      {header}

      <AdminSummaryStrip
        className="mb-4"
        items={[
          {
            label: d.countryConsultations.tileTotal,
            value: String(data.total),
            tone: "brand",
            icon: <CalendarCheck className="size-4" aria-hidden />,
          },
          {
            label: d.countryConsultations.tileConcluded,
            value: String(countFor("COMPLETED")),
            icon: <Stethoscope className="size-4" aria-hidden />,
          },
          {
            label: d.countryConsultations.tileCancelled,
            value: String(countFor("CANCELLED")),
            icon: <CircleSlash className="size-4" aria-hidden />,
          },
          {
            label: d.countryConsultations.tilePaid,
            value: String(paidCount),
            icon: <CreditCard className="size-4" aria-hidden />,
          },
        ]}
      />

      <form
        className="gh-card gh-doctor-filter-card gh-doctor-filter-grid mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4"
        method="get"
      >
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">{d.common.from}</span>
          <input type="date" name="from" defaultValue={from ?? ""} className="gh-input" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">{d.common.to}</span>
          <input type="date" name="to" defaultValue={to ?? ""} className="gh-input" />
        </label>
        {showCountryFilter ? (
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">{d.common.country}</span>
            <select name="countryCode" defaultValue={countryCode ?? ""} className="gh-select">
              <option value="">{d.common.any}</option>
              {data.countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">{d.countryConsultations.filterDoctor}</span>
          <select name="doctorId" defaultValue={doctorId ?? ""} className="gh-select">
            <option value="">{d.common.any}</option>
            {data.doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">{d.common.type}</span>
          <select
            name="consultationType"
            defaultValue={consultationType ?? ""}
            className="gh-select"
          >
            <option value="">{d.common.any}</option>
            <option value="general">{d.appointments.typeGeneral}</option>
            <option value="specialist">{d.appointments.typeSpecialist}</option>
            <option value="prescription">{d.appointments.typePrescription}</option>
            <option value="health-test">{d.appointments.typeHealthTest}</option>
            <option value="follow-up">{d.appointments.typeFollowUp}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">{d.reports.filterApptStatus}</span>
          <select name="status" defaultValue={status ?? ""} className="gh-select">
            <option value="">{d.common.any}</option>
            <option value="REQUEST_RECEIVED">{d.reports.statusCreated}</option>
            <option value="UNDER_REVIEW">{d.reports.statusUnderReview}</option>
            <option value="CONTACTED">{d.reports.statusContacted}</option>
            <option value="COMPLETED">{d.reports.statusConcluded}</option>
            <option value="CANCELLED">{d.reports.statusCancelled}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">{d.reports.filterPayment}</span>
          <select name="paymentStatus" defaultValue={paymentStatus ?? ""} className="gh-select">
            <option value="">{d.common.any}</option>
            <option value="UNPAID">{d.reports.paymentUnpaid}</option>
            <option value="PENDING">{d.reports.paymentPending}</option>
            <option value="PAID">{d.reports.paymentPaid}</option>
            <option value="REFUNDED">{d.reports.paymentRefunded}</option>
            <option value="FAILED">{d.reports.paymentFailed}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">{d.countryConsultations.filterSearch}</span>
          <input
            type="search"
            name="search"
            defaultValue={search ?? ""}
            placeholder={d.countryConsultations.filterSearchPlaceholder}
            className="gh-input"
          />
        </label>
        <div className="gh-doctor-filter-actions flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-4">
          <button type="submit" className="gh-btn gh-btn-primary text-sm">
            {d.common.apply}
          </button>
          <Link href="/doctor/reports/country" className="gh-btn text-sm">
            {d.common.reset}
          </Link>
        </div>
      </form>

      <section className="gh-card gh-doctor-report-card p-4">
        <ColumnPriorityTable
          fields={fields}
          rows={items}
          getRowKey={(r) => r.id}
          emptyState={
            <AdminEmptyState
              className="gh-doctor-empty-state"
              title={d.countryConsultations.emptyTitle}
              description={d.countryConsultations.emptyDesc}
            />
          }
        />
        {items.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--portal-line)] pt-3">
            <p className="m-0 text-portal-meta text-[var(--portal-muted)]">
              {d.countryConsultations.pageOf
                .replace("{page}", String(data.page))
                .replace("{totalPages}", String(data.totalPages))
                .replace("{total}", String(data.total))}
            </p>
            <div className="flex items-center gap-2">
              {data.page > 1 ? (
                <Link href={pageHref(data.page - 1)} className="gh-btn text-sm">
                  {d.common.previous}
                </Link>
              ) : null}
              {data.page < data.totalPages ? (
                <Link href={pageHref(data.page + 1)} className="gh-btn text-sm">
                  {d.common.next}
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
