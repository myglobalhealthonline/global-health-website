import Link from "next/link";
import { ArrowLeft, ExternalLink, Printer } from "lucide-react";
import {
  fetchDoctorConsultation,
  fetchDoctorExams,
  fetchDoctorInternalMessages,
} from "@/lib/api/doctor-api";
import { ConsultationForm } from "./_components/consultation-form";
import { ExamResultsList } from "./_components/exam-results-list";
import { InternalMessagesThread } from "@/components/chat/InternalMessagesThread";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Doctor appointment workspace. Server-fetches the appointment context +
 * consultation row + exam results + internal messages once, then hands
 * each section to a client component that refetches its own slice on
 * mutation. This avoids one huge "load everything on every keystroke"
 * client while keeping the initial render snappy.
 */
export default async function DoctorAppointmentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [consultRes, examsRes, messagesRes] = await Promise.all([
    fetchDoctorConsultation(id),
    fetchDoctorExams(id),
    fetchDoctorInternalMessages(id),
  ]);

  if (!consultRes.ok) {
    return (
      <div className="gh-card p-6">
        <Link
          href="/doctor/appointments"
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="size-3.5" /> Back to appointments
        </Link>
        <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
          {consultRes.message}
        </p>
      </div>
    );
  }

  const { appointment, consultation } = consultRes.data;
  const exams = examsRes.ok ? examsRes.data.items : [];
  const messages = messagesRes.ok ? messagesRes.data.items : [];
  const signed = consultation?.status === "SIGNED";

  return (
    <>
      <Link
        href="/doctor/appointments"
        className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to appointments
      </Link>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Appointment
          </p>
          <h2 className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
            {appointment.fullName}
          </h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            {appointment.consultationType} ·{" "}
            {appointment.scheduledAt
              ? new Date(appointment.scheduledAt).toLocaleString()
              : "Not scheduled"}{" "}
            · {appointment.countryCode.toUpperCase()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {appointment.meetingUrl ? (
            <a
              href={appointment.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="gh-btn gh-btn-primary"
            >
              <ExternalLink className="size-3.5" /> Join call
            </a>
          ) : null}
          <Link
            href={`/print/consults/${id}`}
            target="_blank"
            className="gh-btn gh-btn-soft"
          >
            <Printer className="size-3.5" /> Print summary
          </Link>
        </div>
      </header>

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}
      >
        <div className="grid gap-4">
          <section className="gh-card p-6">
            <div className="flex items-center justify-between gap-3">
              <h3
                className="m-0 text-[var(--color-text-primary)]"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 16,
                  fontWeight: 800,
                }}
              >
                Consultation note
              </h3>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] ${
                  signed
                    ? "bg-[var(--color-status-success-bg)] text-[var(--color-status-success-text)]"
                    : "bg-[var(--color-background-soft)] text-[var(--color-text-muted)]"
                }`}
              >
                {signed ? "Signed" : "Draft"}
              </span>
            </div>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
              SOAP format. Save anytime; sign when complete — signed notes
              are locked.
            </p>
            <ConsultationForm
              appointmentId={appointment.id}
              initial={
                consultation
                  ? {
                      chiefComplaint: consultation.chiefComplaint ?? "",
                      subjective: consultation.subjective ?? "",
                      objective: consultation.objective ?? "",
                      assessment: consultation.assessment ?? "",
                      plan: consultation.plan ?? "",
                      status: consultation.status,
                      signedAt: consultation.signedAt,
                    }
                  : {
                      chiefComplaint: "",
                      subjective: "",
                      objective: "",
                      assessment: "",
                      plan: "",
                      status: "DRAFT",
                      signedAt: null,
                    }
              }
            />
          </section>

          <section className="gh-card p-6">
            <h3
              className="m-0 text-[var(--color-text-primary)]"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              Exam results
            </h3>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
              Log lab / imaging results. Use the external link field to
              point at a partner-lab portal.
            </p>
            <ExamResultsList appointmentId={appointment.id} initialItems={exams} />
          </section>
        </div>

        <aside className="grid gap-4 self-start">
          <section className="gh-card p-6">
            <h3
              className="m-0 text-[var(--color-text-primary)]"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              Patient
            </h3>
            <dl className="mt-3 grid gap-2 text-[13px]">
              <Row label="Email" value={appointment.email} />
              <Row label="Phone" value={appointment.phone ?? "—"} />
              <Row
                label="Date of birth"
                value={
                  appointment.dateOfBirth
                    ? new Date(appointment.dateOfBirth).toLocaleDateString()
                    : "—"
                }
              />
              <Row label="Status" value={appointment.status} />
              <Row
                label="Booked"
                value={new Date(appointment.createdAt).toLocaleString()}
              />
            </dl>
            {appointment.notes ? (
              <div className="mt-4 rounded-md border border-[var(--color-border)] bg-[var(--color-background-soft)] p-3 text-[13px]">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  Booking notes
                </p>
                <p className="mt-1 whitespace-pre-wrap text-[var(--color-text-primary)]">
                  {appointment.notes}
                </p>
              </div>
            ) : null}
          </section>

          <section className="gh-card p-6">
            <h3
              className="m-0 text-[var(--color-text-primary)]"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              Internal notes (doctor ↔ admin)
            </h3>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
              Not patient-visible. Use for handoff context.
            </p>
            <InternalMessagesThread
              appointmentId={appointment.id}
              initialItems={messages}
              postEndpoint={`/api/doctor/appointments/${appointment.id}/internal-messages`}
              currentRole="DOCTOR"
            />
          </section>
        </aside>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[var(--color-border)]/60 py-1">
      <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
        {label}
      </dt>
      <dd className="text-right text-[var(--color-text-primary)]">{value}</dd>
    </div>
  );
}
