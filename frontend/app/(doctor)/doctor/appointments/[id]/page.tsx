import Link from "next/link";
import { ArrowLeft, ExternalLink, Globe2, MapPin, Printer } from "lucide-react";
import {
  fetchDoctorConsultation,
  fetchDoctorConsultationServices,
  fetchDoctorDocuments,
  fetchDoctorExams,
  fetchDoctorFormSubmissions,
  fetchDoctorFormTemplates,
  fetchDoctorInternalMessages,
  fetchDoctorInvoice,
} from "@/lib/api/doctor-api";
import { ConsultationForm } from "./_components/consultation-form";
import { ExamResultsList } from "./_components/exam-results-list";
import { ServicesUsedList } from "./_components/services-used-list";
import { ShareConsultationButton } from "./_components/share-button";
import { AppointmentActions } from "./_components/appointment-actions";
import { FormFillSection } from "./_components/form-fill";
import { FollowUpButton } from "./_components/follow-up-button";
import { DocumentsList } from "./_components/documents-list";
import { InternalMessagesThread } from "@/components/chat/InternalMessagesThread";
import { DoctorConsultationChatSection } from "./_components/consultation-chat-section";

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
  const [
    consultRes,
    examsRes,
    messagesRes,
    invoiceRes,
    submissionsRes,
    templatesRes,
    documentsRes,
  ] = await Promise.all([
    fetchDoctorConsultation(id),
    fetchDoctorExams(id),
    fetchDoctorInternalMessages(id),
    fetchDoctorInvoice(id),
    fetchDoctorFormSubmissions(id),
    fetchDoctorFormTemplates(),
    fetchDoctorDocuments(id),
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
  const invoice = invoiceRes.ok ? invoiceRes.data.invoice : null;
  const submissions = submissionsRes.ok ? submissionsRes.data.items : [];
  const templates = templatesRes.ok ? templatesRes.data.items : [];
  const documents = documentsRes.ok ? documentsRes.data.items : [];
  const consultationMode = appointment.consultationMode ?? "ONLINE";
  const followUpFromId = appointment.followUpFromAppointmentId ?? null;
  const signed = consultation?.status === "SIGNED";
  // Services-used are scoped by consultationId, so we can only fetch
  // them once the row exists. Hit the API conditionally to skip a 404
  // for fresh appointments.
  const servicesRes = consultation
    ? await fetchDoctorConsultationServices(consultation.id)
    : null;
  const servicesUsed =
    servicesRes && servicesRes.ok ? servicesRes.data.items : [];

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
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] ${
                consultationMode === "ONLINE"
                  ? "bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {consultationMode === "ONLINE" ? (
                <Globe2 className="size-3" aria-hidden />
              ) : (
                <MapPin className="size-3" aria-hidden />
              )}
              {consultationMode === "ONLINE" ? "Online" : "In person"}
            </span>
            {followUpFromId ? (
              <Link
                href={`/doctor/appointments/${followUpFromId}`}
                className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-violet-800 hover:underline"
              >
                Follow-up of original →
              </Link>
            ) : null}
          </div>
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
            href={`/print/appointments/${id}`}
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
            <h3
              className="m-0 text-[var(--color-text-primary)]"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              Meeting & status
            </h3>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
              Paste the video link the patient will use, and move the
              appointment forward as you progress.
            </p>
            <AppointmentActions
              appointmentId={appointment.id}
              initialMeetingUrl={appointment.meetingUrl}
              initialStatus={appointment.status}
              initialScheduledAt={appointment.scheduledAt}
              initialMode={consultationMode}
            />
            <div className="mt-4 border-t border-[var(--color-border)] pt-4">
              <FollowUpButton appointmentId={appointment.id} />
            </div>
          </section>

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

            <div className="mt-6 border-t border-[var(--color-border)] pt-5">
              <h4
                className="m-0 text-[var(--color-text-primary)]"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 14,
                  fontWeight: 800,
                }}
              >
                Services rendered
              </h4>
              <p className="mt-1 text-[12.5px] text-[var(--color-text-muted)]">
                Log services performed during this consult — feeds the invoice.
              </p>
              <ServicesUsedList
                consultationId={consultation?.id ?? null}
                initialItems={servicesUsed}
                locked={signed}
              />
            </div>

            <div className="mt-6 border-t border-[var(--color-border)] pt-5">
              <h4
                className="m-0 text-[var(--color-text-primary)]"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 14,
                  fontWeight: 800,
                }}
              >
                Share with a colleague
              </h4>
              <p className="mt-1 text-[12.5px] text-[var(--color-text-muted)]">
                7-day signed link. Recipient sees the consult only — no
                portal access.
              </p>
              <div className="mt-2">
                {consultation ? (
                  <ShareConsultationButton
                    consultationId={consultation.id}
                    disabled={!signed}
                  />
                ) : (
                  <p className="text-[12px] text-[var(--color-text-muted)]">
                    Save a draft first.
                  </p>
                )}
              </div>
            </div>
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
              Forms
            </h3>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
              Fill an intake / consent / follow-up form on the
              patient&apos;s behalf. New submissions show below.
            </p>
            <FormFillSection appointmentId={appointment.id} templates={templates} />
          </section>

          {submissions.length > 0 ? (
            <section className="gh-card p-6">
              <h3
                className="m-0 text-[var(--color-text-primary)]"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 16,
                  fontWeight: 800,
                }}
              >
                Form submissions
              </h3>
              <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
                Answers the patient (or admin on their behalf) filled
                in for this appointment.
              </p>
              <ul className="mt-3 grid gap-3">
                {submissions.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-md border border-[var(--color-border)] bg-white p-3"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                        {s.template.title}
                      </p>
                      <Link
                        href={`/print/forms/${s.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-brand-primary)] hover:underline"
                      >
                        <Printer className="size-3" /> Print
                      </Link>
                    </div>
                    <p className="text-[11.5px] text-[var(--color-text-muted)]">
                      submitted {new Date(s.submittedAt).toLocaleString()}
                    </p>
                    <dl className="mt-2 grid gap-1.5 text-[13px]">
                      {(s.answers ?? []).map((a, i) => {
                        const def = s.template.fields.find((f) => f.key === a.key);
                        return (
                          <div key={i} className="flex gap-2">
                            <dt className="min-w-[40%] text-[var(--color-text-muted)]">
                              {def?.label ?? a.key}
                            </dt>
                            <dd className="text-[var(--color-text-primary)] whitespace-pre-wrap">
                              {a.value === null || a.value === ""
                                ? "—"
                                : String(a.value)}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

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

          <section className="gh-card p-6">
            <h3
              className="m-0 text-[var(--color-text-primary)]"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              Documents
            </h3>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
              Attach PDFs, scans, or photos to this appointment. Stored
              in encrypted object storage; only you and admin can see
              them.
            </p>
            <DocumentsList
              appointmentId={appointment.id}
              initialItems={documents}
            />
          </section>
        </div>

        <aside className="grid gap-4 self-start">
          {invoice ? (
            <section className="gh-card p-6">
              <h3
                className="m-0 text-[var(--color-text-primary)]"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 16,
                  fontWeight: 800,
                }}
              >
                Invoice
              </h3>
              <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
                Read-only view. Admin issues + refunds.
              </p>
              <dl className="mt-3 grid gap-2 text-[13px]">
                <Row label="Status" value={invoice.paymentStatus} />
                <Row
                  label="Booked amount"
                  value={
                    invoice.amountCents != null && invoice.currencyCode
                      ? formatMoney(invoice.amountCents, invoice.currencyCode)
                      : "—"
                  }
                />
                {(() => {
                  const buckets = Object.entries(
                    invoice.lineTotalsByCurrency ?? {},
                  ).filter(([, v]) => v > 0);
                  if (buckets.length === 0) {
                    return <Row label="Line total" value="—" />;
                  }
                  if (buckets.length === 1) {
                    const [code, total] = buckets[0]!;
                    return (
                      <Row
                        label="Line total"
                        value={formatMoney(total, code === "—" ? "EUR" : code)}
                      />
                    );
                  }
                  return (
                    <>
                      {buckets.map(([code, total]) => (
                        <Row
                          key={code}
                          label={`Line total (${code})`}
                          value={formatMoney(total, code === "—" ? "EUR" : code)}
                        />
                      ))}
                    </>
                  );
                })()}
                <Row
                  label="Paid"
                  value={
                    invoice.paidAt
                      ? new Date(invoice.paidAt).toLocaleString()
                      : "—"
                  }
                />
              </dl>
              <Link
                href={`/print/invoices/${appointment.id}`}
                target="_blank"
                className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-md border border-[var(--color-border)] px-3 py-2 text-[12.5px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)]"
              >
                <Printer className="size-3.5" /> Print invoice
              </Link>
            </section>
          ) : null}

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

          <section className="gh-card p-6">
            <h3
              className="m-0 text-[var(--color-text-primary)]"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              Patient chat
            </h3>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
              Direct channel with the patient. Chat auto-locks 24h after
              the appointment completes — you can re-open it here.
            </p>
            <div className="mt-4">
              <DoctorConsultationChatSection appointmentId={appointment.id} />
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

function formatMoney(cents: number, code: string) {
  const v = cents / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
    }).format(v);
  } catch {
    return `${v.toFixed(2)} ${code}`;
  }
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
