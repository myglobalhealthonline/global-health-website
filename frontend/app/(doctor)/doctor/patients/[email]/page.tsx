import Link from "next/link";
import { ArrowLeft, ChevronRight, ExternalLink } from "lucide-react";
import { fetchDoctorPatientDetail } from "@/lib/api/doctor-api";
import { AdminEmptyState, AdminSummaryStrip, PageHeader, Pill } from "@/components/portal-atoms";
import { PortalMobileCard } from "@/components/PortalMobileCard";
import { PatientProfilePanel } from "./_components/patient-profile-panel";
import { ConsultationHistoryPanel } from "./_components/consultation-history-panel";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ email: string }> };

export default async function DoctorPatientDetailPage({ params }: PageProps) {
  const { email } = await params;
  const decoded = decodeURIComponent(email);
  const result = await fetchDoctorPatientDetail(decoded);

  if (!result.ok) {
    return (
      <div className="gh-card p-6">
        <Link
          href="/doctor/patients"
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--portal-muted)] hover:text-[var(--portal-text)]"
        >
          <ArrowLeft className="size-3.5" /> Back to patients
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
        className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--portal-muted)] hover:text-[var(--portal-text)]"
      >
        <ArrowLeft className="size-3.5" /> Back to patients
      </Link>
      <PageHeader
        eyebrow="Patient record"
        title={patient.fullName}
        description="Clinical history, signed consultations, and appointment documents visible to your doctor role. Direct patient contact remains inside appointment chat."
      />

      <AdminSummaryStrip
        className="mb-4"
        items={[
          {
            label: "Country",
            value: patient.countryCode.toUpperCase(),
            hint: "Booking market",
            tone: "brand",
          },
          {
            label: "Appointments",
            value: patient.appointmentCount,
            hint: "With you",
            tone: "neutral",
          },
          {
            label: "Signed consults",
            value: patient.signedConsultCount,
            hint: "Locked clinical notes",
            tone: patient.signedConsultCount > 0 ? "success" : "neutral",
          },
        ]}
      />

      <div className="gh-doctor-detail-grid gh-doctor-patient-detail-layout grid gap-4">
        <div className="grid gap-4">
        <section className="gh-card gh-doctor-patient-history-card p-6">
          <h3
            className="m-0 text-[var(--portal-text)]"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              fontWeight: 800,
            }}
          >
            Appointment history
          </h3>
          <p className="mt-1 text-[13px] text-[var(--portal-muted)]">
            Every appointment this patient has had with you. Open one to
            jump into the workspace.
          </p>
          {appointments.length === 0 ? (
            <AdminEmptyState
              className="gh-doctor-empty-state mt-4"
              title="No appointments yet"
              description="When this patient books with you, consultation history will appear here."
            />
          ) : (
            <>
            <div className="hidden md:block gh-doctor-table-wrap mt-4 overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]">
                  <th className="py-2 text-left">When</th>
                  <th className="py-2 text-left">Type</th>
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2 text-left">Payment</th>
                  <th className="py-2 text-left">Consult</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => (
                  <tr key={a.id} className="border-t border-[var(--portal-line)]">
                    <td className="py-2.5">
                      {a.scheduledAt
                        ? new Date(a.scheduledAt).toLocaleString()
                        : new Date(a.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 capitalize">{a.consultationType}</td>
                    <td className="py-2.5 text-[12px]">{a.status}</td>
                    <td className="py-2.5 text-[12px]">{a.paymentStatus}</td>
                    <td className="py-2.5 text-[12px]">
                      {a.consultation
                        ? a.consultation.status === "SIGNED"
                          ? "Signed"
                          : "Draft"
                        : "—"}
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        {a.meetingUrl ? (
                          <a
                            href={a.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--portal-primary)] hover:underline"
                          >
                            <ExternalLink className="size-3" /> Join
                          </a>
                        ) : null}
                        <Link
                          href={`/doctor/appointments/${a.id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-[var(--portal-line)] px-2 py-1 text-[12px] font-semibold text-[var(--portal-text)] hover:bg-[var(--portal-well)]"
                        >
                          Open <ChevronRight className="size-3" />
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
                      ? new Date(a.scheduledAt).toLocaleString()
                      : new Date(a.createdAt).toLocaleDateString()
                  }
                  statusPill={
                    <Pill tone={a.status === "COMPLETED" ? "active" : a.status === "CANCELLED" ? "inactive" : "pending"} withDot>
                      {a.status.replace(/_/g, " ")}
                    </Pill>
                  }
                  tone={a.status === "COMPLETED" ? "success" : a.status === "CANCELLED" ? "danger" : "neutral"}
                  meta={[
                    { label: "Payment", value: a.paymentStatus },
                    {
                      label: "Consult",
                      value: a.consultation
                        ? a.consultation.status === "SIGNED"
                          ? "Signed"
                          : "Draft"
                        : "No note",
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
                          <ExternalLink className="size-3" /> Join
                        </a>
                      ) : null}
                      <Link
                        href={`/doctor/appointments/${a.id}`}
                        className="gh-btn gh-btn-soft text-sm"
                      >
                        Open workspace <ChevronRight className="size-3" />
                      </Link>
                    </>
                  }
                />
              ))}
            </div>
            </>
          )}
        </section>

        <section className="gh-card gh-doctor-patient-history-card p-6">
          <h3
            className="m-0 text-[var(--portal-text)]"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              fontWeight: 800,
            }}
          >
            Consultation history
          </h3>
          <p className="mt-1 text-[13px] text-[var(--portal-muted)]">
            Medical notes, generated PDFs, and uploaded files across appointments.
          </p>
          <div className="mt-4">
            <ConsultationHistoryPanel patientEmail={patient.email} />
          </div>
        </section>

        {/* Documents card hidden from doctor portal per GDPR plan —
            doctors view (but don't download) docs inside the appointment
            workspace via the existing per-appointment Documents tab.
            Admin retains the all-documents archive under /admin/users. */}
        </div>

        <aside className="gh-doctor-side-stack grid gap-4 self-start">
          <PatientProfilePanel email={patient.email} />
          <section className="gh-card gh-doctor-summary-card p-6">
            <h3
              className="m-0 text-[var(--portal-text)]"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              Summary
            </h3>
            <dl className="mt-3 grid gap-2 text-[13px]">
              <Row label="Country" value={patient.countryCode.toUpperCase()} />
              <Row
                label="Date of birth"
                value={
                  patient.dateOfBirth
                    ? new Date(patient.dateOfBirth).toLocaleDateString()
                    : "—"
                }
              />
              <Row
                label="First seen"
                value={new Date(patient.firstSeen).toLocaleDateString()}
              />
              <Row
                label="Total appointments"
                value={String(patient.appointmentCount)}
              />
              <Row
                label="Signed consults"
                value={String(patient.signedConsultCount)}
              />
            </dl>
          </section>
        </aside>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[var(--portal-line)]/60 py-1">
      <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]">
        {label}
      </dt>
      <dd className="text-right text-[var(--portal-text)]">{value}</dd>
    </div>
  );
}
