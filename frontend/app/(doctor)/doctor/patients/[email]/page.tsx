import Link from "next/link";
import { ArrowLeft, Cake, CalendarCheck, ChevronRight, ExternalLink, FileCheck, Globe } from "lucide-react";
import { fetchDoctorPatientDetail } from "@/lib/api/doctor-api";
import { formatAppDate, formatAppDateTime } from "@/lib/format-datetime";
import { AdminEmptyState, AdminSummaryStrip, PageHeader, Pill } from "@/components/portal-atoms";
import { PortalMobileCard } from "@/components/PortalMobileCard";
import { PatientProfilePanel } from "./_components/patient-profile-panel";
import { ConsultationHistoryPanel } from "./_components/consultation-history-panel";
import { PatientSafetyStrip } from "./_components/patient-safety-strip";
import { PatientRecordTabs } from "./_components/patient-record-tabs";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
// ponytail: cs/de/ro doctor.json don't yet carry the newer patients.* keys
// (only en/pt/es do), so the unioned bundle type lacks them for those
// locales. Cast to the full (en) shape here rather than editing locale
// JSON, which is out of scope for this change.
import type EnDoctorLocale from "@/locales/en/doctor.json";
type PatientsCopy = typeof EnDoctorLocale.patients;

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ email: string }> };

export default async function DoctorPatientDetailPage({ params }: PageProps) {
  const { email } = await params;
  const decoded = decodeURIComponent(email);
  const result = await fetchDoctorPatientDetail(decoded);
  const locale = await getPageLocale();
  const { doctor: d } = loadLocaleBundle(locale);

  if (!result.ok) {
    return (
      <div className="gh-card p-6">
        <Link
          href="/doctor/patients"
          className="mb-3 inline-flex items-center gap-1.5 text-portal-compact font-semibold text-[var(--portal-muted)] hover:text-[var(--portal-text)]"
        >
          <ArrowLeft className="size-3.5" /> {d.patients.back}
        </Link>
        <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
          {result.message}
        </p>
      </div>
    );
  }

  const { patient, appointments } = result.data;

  return (
    <>
      <Link
        href="/doctor/patients"
        className="mb-2 inline-flex items-center gap-1.5 text-portal-compact font-semibold text-[var(--portal-muted)] hover:text-[var(--portal-text)]"
      >
        <ArrowLeft className="size-3.5" /> {d.patients.back}
      </Link>
      <PageHeader
        eyebrow={d.patients.recordEyebrow}
        title={patient.fullName}
        description={d.patients.recordDesc}
      />

      <PatientSafetyStrip email={patient.email} strings={d.patients as unknown as PatientsCopy} />

      <AdminSummaryStrip
        className="mb-4"
        items={[
          {
            label: d.common.country,
            value: patient.countryCode.toUpperCase(),
            hint: d.patients.bookingMarket,
            tone: "brand",
            icon: <Globe className="size-4" aria-hidden />,
          },
          {
            label: d.patients.appointments,
            value: patient.appointmentCount,
            hint: d.patients.withYou,
            tone: "neutral",
            icon: <CalendarCheck className="size-4" aria-hidden />,
          },
          {
            label: d.patients.signedConsults,
            value: patient.signedConsultCount,
            hint: d.patients.lockedNotes,
            tone: patient.signedConsultCount > 0 ? "success" : "neutral",
            icon: <FileCheck className="size-4" aria-hidden />,
          },
          {
            label: d.common.dateOfBirth,
            value: patient.dateOfBirth
              ? new Date(patient.dateOfBirth).toLocaleDateString()
              : "—",
            hint: d.patients.recordEyebrow,
            tone: "neutral",
            icon: <Cake className="size-4" aria-hidden />,
          },
        ]}
      />

      <PatientRecordTabs
        tabsAria={d.patients.recordEyebrow}
        tabHistoryLabel={d.patients.historyTitle}
        tabConsultLabel={d.patients.consultHistoryTitle}
        tabChartLabel={d.patients.chartTitle}
        historyPanel={
        <section className="gh-card gh-doctor-patient-history-card p-6">
          <h3
            className="m-0 text-[var(--portal-text)]"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              fontWeight: 800,
            }}
          >
            {d.patients.historyTitle}
          </h3>
          <p className="mt-1 text-portal-compact text-[var(--portal-muted)]">
            {d.patients.historyDesc}
          </p>
          {appointments.length === 0 ? (
            <AdminEmptyState
              className="gh-doctor-empty-state mt-4"
              assetSrc="/images/portal/obsidian/empty-queue.svg"
              title={d.patients.emptyHistoryTitle}
              description={d.patients.emptyHistoryDesc}
            />
          ) : (
            <>
            <div className="hidden md:block gh-doctor-table-wrap mt-4 overflow-x-auto">
            <table className="w-full text-portal-compact">
              <thead>
                <tr className="text-portal-thead font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]">
                  <th className="py-2 text-left">{d.patients.colWhen}</th>
                  <th className="py-2 text-left">{d.patients.colType}</th>
                  <th className="py-2 text-left">{d.patients.colStatus}</th>
                  <th className="py-2 text-left">{d.patients.colPayment}</th>
                  <th className="py-2 text-left">{d.patients.colConsult}</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => (
                  <tr key={a.id} className="border-t border-[var(--portal-line)]">
                    <td className="py-2.5">
                      {a.scheduledAt
                        ? formatAppDateTime(a.scheduledAt)
                        : formatAppDate(a.createdAt)}
                    </td>
                    <td className="py-2.5 capitalize">{a.consultationType}</td>
                    <td className="py-2.5 text-portal-meta">{a.status}</td>
                    <td className="py-2.5 text-portal-meta">{a.paymentStatus}</td>
                    <td className="py-2.5 text-portal-meta">
                      {a.consultation
                        ? a.consultation.status === "SIGNED"
                          ? d.common.signed
                          : d.common.draft
                        : "—"}
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        {a.meetingUrl ? (
                          <a
                            href={a.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-portal-meta font-semibold text-[var(--portal-primary)] hover:underline"
                          >
                            <ExternalLink className="size-3" /> {d.common.join}
                          </a>
                        ) : null}
                        <Link
                          href={`/doctor/appointments/${a.id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-[var(--portal-line)] px-2 py-1 text-portal-meta font-semibold text-[var(--portal-text)] hover:bg-[var(--portal-well)]"
                        >
                          {d.common.open} <ChevronRight className="size-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <div className="mt-4 grid gap-3 md:hidden">
              {appointments.map((a) => (
                <PortalMobileCard
                  key={a.id}
                  title={<span className="capitalize">{a.consultationType}</span>}
                  subtitle={
                    a.scheduledAt
                      ? formatAppDateTime(a.scheduledAt)
                      : formatAppDate(a.createdAt)
                  }
                  statusPill={
                    <Pill tone={a.status === "COMPLETED" ? "active" : a.status === "CANCELLED" ? "inactive" : "pending"} withDot>
                      {a.status.replace(/_/g, " ")}
                    </Pill>
                  }
                  tone={a.status === "COMPLETED" ? "success" : a.status === "CANCELLED" ? "danger" : "neutral"}
                  meta={[
                    { label: d.common.payment, value: a.paymentStatus },
                    {
                      label: d.patients.colConsult,
                      value: a.consultation
                        ? a.consultation.status === "SIGNED"
                          ? d.common.signed
                          : d.common.draft
                        : d.patients.noNote,
                    },
                  ]}
                  actions={
                    <>
                      {a.meetingUrl ? (
                        <a
                          href={a.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="gh-btn gh-btn-primary text-sm"
                        >
                          <ExternalLink className="size-3" /> {d.common.join}
                        </a>
                      ) : null}
                      <Link
                        href={`/doctor/appointments/${a.id}`}
                        className="gh-btn gh-btn-soft text-sm"
                      >
                        {d.patients.openWorkspace} <ChevronRight className="size-3" />
                      </Link>
                    </>
                  }
                />
              ))}
            </div>
            </>
          )}
        </section>
        }
        consultPanel={
        <section className="gh-card gh-doctor-patient-history-card p-6">
          <h3
            className="m-0 text-[var(--portal-text)]"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              fontWeight: 800,
            }}
          >
            {d.patients.consultHistoryTitle}
          </h3>
          <p className="mt-1 text-portal-compact text-[var(--portal-muted)]">
            {d.patients.consultHistoryDesc}
          </p>
          <div className="mt-4">
            <ConsultationHistoryPanel patientEmail={patient.email} strings={d.patients as unknown as PatientsCopy} />
          </div>
        </section>
        }
        chartPanel={
          <>
          <PatientProfilePanel email={patient.email} strings={d.patients as unknown as PatientsCopy} />
          {/* "Summary" card removed (07-006) — its non-duplicate value
              (DOB) moved into the stat strip above; the rest duplicated
              AdminSummaryStrip. Documents card stays out of the doctor
              portal per GDPR plan — doctors view (but don't download)
              docs inside the appointment workspace via the existing
              per-appointment Documents tab. Admin retains the
              all-documents archive under /admin/users. */}
          </>
        }
      />
    </>
  );
}
