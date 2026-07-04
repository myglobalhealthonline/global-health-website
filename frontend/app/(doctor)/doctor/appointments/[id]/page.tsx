import Link from "next/link";
import { ArrowLeft, ExternalLink, Globe2, MapPin, Printer } from "lucide-react";
import { formatAppDualTz } from "@/lib/format-datetime";
import {
  fetchDoctorConsultation,
  fetchDoctorConsultationServices,
  fetchDoctorDocuments,
  fetchDoctorGeneratedDocuments,
  fetchDoctorMe,
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
import { AppointmentDocumentsTab } from "./_components/appointment-documents-tab";
import { InternalMessagesThread } from "@/components/chat/InternalMessagesThread";
import { DoctorConsultationChatSection } from "./_components/consultation-chat-section";
import { PrescriptionsList } from "./_components/prescriptions-list";
import { fetchDoctorPrescriptions } from "@/lib/api/prescriptions-api";
import { AppointmentTabs } from "./_components/appointment-tabs";
import { FinalizeChecklist } from "./_components/finalize-checklist";
import {
  ConsultationDocumentsSection,
  ConsultationDocumentsTrigger,
} from "./_components/consultation-documents-section";
import { BrazilConsentPanel } from "./_components/brazil-consent-panel";
import { AdminSummaryStrip } from "@/components/portal-atoms";
import { FormSection } from "@/components/FormSection";

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
    generatedDocsRes,
    meRes,
    prescriptionsRes,
  ] = await Promise.all([
    fetchDoctorConsultation(id),
    fetchDoctorExams(id),
    fetchDoctorInternalMessages(id),
    fetchDoctorInvoice(id),
    fetchDoctorFormSubmissions(id),
    fetchDoctorFormTemplates(),
    fetchDoctorDocuments(id),
    fetchDoctorGeneratedDocuments(id),
    fetchDoctorMe(),
    fetchDoctorPrescriptions(id),
  ]);

  if (!consultRes.ok) {
    return (
      <div className="gh-card p-6">
        <Link
          href="/doctor/appointments"
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--portal-muted)] hover:text-[var(--portal-text)]"
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
  const pendingSendCount = generatedDocsRes.ok ? generatedDocsRes.data.queue.length : 0;
  const doctorName = meRes.ok ? meRes.data.doctor.fullName : "Doctor";
  const documentsTabBadge =
    pendingSendCount > 0 ? String(pendingSendCount) : null;
  const prescriptions = prescriptionsRes.ok ? prescriptionsRes.data.items : [];
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
  // Calm mode — DESIGN.md §6.3/strategy Doctor plan: while a consultation
  // is actively in progress (scheduled time has passed, not yet wrapped
  // up), the form zone drops hover-lift chrome so nothing competes for
  // attention with the actual consult.
  const isLive = Boolean(
    appointment.scheduledAt &&
      new Date(appointment.scheduledAt) <= new Date() &&
      appointment.status !== "COMPLETED" &&
      appointment.status !== "CANCELLED" &&
      !signed,
  );

  return (
    <div
      className={`gh-doctor-appointment-workspace${isLive ? " gh-doctor-appointment-workspace--calm" : ""}`}
    >
      <Link
        href="/doctor/appointments"
        className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--portal-muted)] hover:text-[var(--portal-text)]"
      >
        <ArrowLeft className="size-3.5" /> Back to appointments
      </Link>

      <header className="gh-doctor-appointment-header mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--portal-muted)]">
            Appointment
          </p>
          <h2 className="mt-1 text-2xl font-bold text-[var(--portal-text)]">
            {appointment.fullName}
          </h2>
          <p className="text-sm text-[var(--portal-muted)]">
            {appointment.consultationType} ·{" "}
            {appointment.scheduledAt
              ? formatAppDualTz(
                  appointment.scheduledAt,
                  // Clinic timezone (Country.bookingSetting.timezone) = the
                  // doctor's working-hours zone. Falls back to the formatter's
                  // own default when the country has no booking setting.
                  appointment.clinicTimezone ?? null,
                  appointment.patientTimezone ?? null,
                )
              : "Not scheduled"}{" "}
            · {appointment.countryCode.toUpperCase()}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] ${
                consultationMode === "ONLINE"
                  ? "bg-[var(--portal-primary)]/10 text-[var(--portal-primary)]"
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

      <AdminSummaryStrip
        className="mb-4"
        items={[
          {
            label: "Consultation note",
            value: signed ? "Signed" : "Draft",
            hint: signed ? "Locked clinical record" : "Can still be edited",
            tone: signed ? "success" : "warning",
          },
          {
            label: "Documents",
            value: documents.length + pendingSendCount,
            hint:
              pendingSendCount > 0
                ? `${pendingSendCount} waiting to send`
                : "Uploads and generated PDFs",
            tone: pendingSendCount > 0 ? "warning" : "neutral",
          },
          {
            label: "Clinical items",
            value: exams.length + prescriptions.length,
            hint: "Exam results and prescriptions",
            tone: exams.length + prescriptions.length > 0 ? "brand" : "neutral",
          },
          {
            label: "Messages",
            value: messages.length,
            hint: "Internal handoff notes",
            tone: messages.length > 0 ? "success" : "neutral",
          },
        ]}
      />

      {/* Two-zone workspace (DESIGN.md §6.3/strategy Doctor plan): left =
          consultation form + checklist (tabs), right = persistent patient
          context that stays visible across every tab, not just Overview. */}
      <div className="gh-doctor-workspace-grid grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
      <AppointmentTabs
        tabs={[
          {
            id: "overview",
            label: "Overview",
            panel: (
              <div className="gh-doctor-appointment-overview grid gap-4">
                <FormSection
                  title="Meeting & status"
                  description="Paste the video link the patient will use, and move the appointment forward as you progress."
                >
                  <div className="gh-form-section__span-2">
                    <AppointmentActions
                      appointmentId={appointment.id}
                      initialMeetingUrl={appointment.meetingUrl}
                      initialStatus={appointment.status}
                      initialScheduledAt={appointment.scheduledAt}
                      initialMode={consultationMode}
                    />
                    <div className="mt-4 border-t border-[var(--portal-line)] pt-4">
                      <h4 className="text-sm font-bold text-[var(--portal-text)]">
                        Finalize
                      </h4>
                      <FinalizeChecklist
                        appointmentId={appointment.id}
                        initialFinalized={appointment.finalized ?? false}
                        initialNotesUploaded={appointment.notesUploaded ?? false}
                        initialFilesUploaded={appointment.filesUploaded ?? false}
                      />
                    </div>
                    <div className="mt-4 border-t border-[var(--portal-line)] pt-4">
                      <FollowUpButton appointmentId={appointment.id} />
                    </div>
                  </div>
                </FormSection>

                <FormSection title="Consultation documents">
                  <div className="gh-form-section__span-2">
                    <ConsultationDocumentsSection appointmentId={appointment.id} />
                  </div>
                </FormSection>

                {appointment.countryCode.toLowerCase() === "br" ? (
                  <FormSection title="Brazil consent">
                    <div className="gh-form-section__span-2">
                      <BrazilConsentPanel
                        appointmentId={appointment.id}
                        countryCode={appointment.countryCode}
                      />
                    </div>
                  </FormSection>
                ) : null}
              </div>
            ),
          },
          {
            id: "consultation",
            label: "Consultation",
            badge: signed ? "signed" : "draft",
            panel: (
              <FormSection
                title="Consultation note"
                description="SOAP format. Save anytime; sign when complete — signed notes are locked."
                right={
                  <div className="flex items-center gap-2">
                    <ConsultationDocumentsTrigger appointmentId={appointment.id} />
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] ${
                        signed
                          ? "bg-[var(--portal-success-soft)] text-[var(--portal-success-text)]"
                          : "bg-[var(--portal-well)] text-[var(--portal-muted)]"
                      }`}
                    >
                      {signed ? "Signed" : "Draft"}
                    </span>
                  </div>
                }
              >
                <div className="gh-form-section__span-2">
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

                  <div className="mt-6 border-t border-[var(--portal-line)] pt-5">
                    <h4
                      className="m-0 text-[var(--portal-text)]"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 14,
                        fontWeight: 800,
                      }}
                    >
                      Services rendered
                    </h4>
                    <p className="mt-1 text-[12.5px] text-[var(--portal-muted)]">
                      Log services performed during this consult — feeds the invoice.
                    </p>
                    <ServicesUsedList
                      consultationId={consultation?.id ?? null}
                      initialItems={servicesUsed}
                      locked={signed}
                    />
                  </div>

                  <div className="mt-6 border-t border-[var(--portal-line)] pt-5">
                    <h4
                      className="m-0 text-[var(--portal-text)]"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 14,
                        fontWeight: 800,
                      }}
                    >
                      Share with a colleague
                    </h4>
                    <p className="mt-1 text-[12.5px] text-[var(--portal-muted)]">
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
                        <p className="text-[12px] text-[var(--portal-muted)]">
                          Save a draft first.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </FormSection>
            ),
          },
          {
            id: "clinical",
            label: "Clinical",
            badge:
              exams.length + prescriptions.length > 0
                ? String(exams.length + prescriptions.length)
                : null,
            panel: (
              <div className="grid gap-4">
                <FormSection
                  title="Exam results"
                  description="Log lab / imaging results. Use the external link field to point at a partner-lab portal."
                >
                  <div className="gh-form-section__span-2">
                    <ExamResultsList appointmentId={appointment.id} initialItems={exams} />
                  </div>
                </FormSection>

                <FormSection
                  title="Prescriptions"
                  description="Clinical scripts issued during this consultation. Lock when the consult is signed."
                >
                  <div className="gh-form-section__span-2">
                    <PrescriptionsList
                      appointmentId={appointment.id}
                      initialItems={prescriptions}
                      consultationLocked={signed}
                    />
                  </div>
                </FormSection>
              </div>
            ),
          },
          {
            id: "forms",
            label: "Forms",
            badge: submissions.length > 0 ? String(submissions.length) : null,
            panel: (
              <div className="grid gap-4">
                <FormSection
                  title="Forms"
                  description="Fill an intake / consent / follow-up form on the patient's behalf. New submissions show below."
                >
                  <div className="gh-form-section__span-2">
                    <FormFillSection appointmentId={appointment.id} templates={templates} />
                  </div>
                </FormSection>

                {submissions.length > 0 ? (
                  <FormSection
                    title="Form submissions"
                    description="Answers the patient (or admin on their behalf) filled in for this appointment."
                  >
                    <div className="gh-form-section__span-2">
                      <ul className="grid gap-3">
                        {submissions.map((s) => (
                          <li
                            key={s.id}
                            className="gh-doctor-submission-card gh-admin-card rounded-md border border-[var(--portal-line)] p-3"
                          >
                            <div className="gh-doctor-submission-header flex items-baseline justify-between gap-3">
                              <p className="text-[13px] font-semibold text-[var(--portal-text)]">
                                {s.template.title}
                              </p>
                              <Link
                                href={`/print/forms/${s.id}`}
                                target="_blank"
                                className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--portal-primary)] hover:underline"
                              >
                                <Printer className="size-3" /> Print
                              </Link>
                            </div>
                            <p className="text-[11.5px] text-[var(--portal-muted)]">
                              submitted {new Date(s.submittedAt).toLocaleString()}
                            </p>
                            <dl className="mt-2 grid gap-1.5 text-[13px]">
                              {(s.answers ?? []).map((a, i) => {
                                const def = s.template.fields.find((f) => f.key === a.key);
                                return (
                                  <div key={i} className="flex gap-2">
                                    <dt className="min-w-[40%] text-[var(--portal-muted)]">
                                      {def?.label ?? a.key}
                                    </dt>
                                    <dd className="text-[var(--portal-text)] whitespace-pre-wrap">
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
                    </div>
                  </FormSection>
                ) : null}
              </div>
            ),
          },
          {
            id: "documents",
            label: "Documents",
            badge: documentsTabBadge,
            badgeAlert: Boolean(documentsTabBadge),
            panel: (
              <FormSection
                title="Documents"
                description="Generated consultation PDFs and files you attach to this appointment. Use View to open any document in the browser."
              >
                <div className="gh-form-section__span-2">
                  <AppointmentDocumentsTab
                    appointmentId={appointment.id}
                    scheduledAt={appointment.scheduledAt}
                    createdAt={appointment.createdAt}
                    consultationType={appointment.consultationType}
                    doctorName={doctorName}
                    initialUploads={documents}
                  />
                </div>
              </FormSection>
            ),
          },
          {
            id: "messages",
            label: "Messages",
            panel: (
              <div className="grid gap-4">
                <div id="patient-chat" className="scroll-mt-24">
                  <FormSection
                    title="Patient chat"
                    description="Direct channel with the patient. Chat auto-locks 24h after the appointment completes — you can re-open it here."
                  >
                    <div className="gh-form-section__span-2">
                      <DoctorConsultationChatSection appointmentId={appointment.id} />
                    </div>
                  </FormSection>
                </div>

                <FormSection
                  title="Internal notes (doctor ↔ admin)"
                  description="Not patient-visible. Use for handoff context."
                >
                  <div className="gh-form-section__span-2">
                    <InternalMessagesThread
                      appointmentId={appointment.id}
                      initialItems={messages}
                      postEndpoint={`/api/doctor/appointments/${appointment.id}/internal-messages`}
                      currentRole="DOCTOR"
                    />
                  </div>
                </FormSection>
              </div>
            ),
          },
        ]}
      />
      </div>

      <aside className="gh-doctor-context-rail grid gap-4 self-start lg:sticky lg:top-4">
        <FormSection title="Patient">
          <div className="gh-form-section__span-2">
            <dl className="grid gap-2 text-[13px]">
              {appointment.globalHealthNumber ? (
                <Row label="Global Health No." value={appointment.globalHealthNumber} />
              ) : null}
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
              {appointment.consultationLanguageCode ? (
                <Row label="Consultation language" value={appointment.consultationLanguageCode.toUpperCase()} />
              ) : null}
              <Row label="Status" value={appointment.status} />
              <Row
                label="Booked"
                value={new Date(appointment.createdAt).toLocaleString()}
              />
            </dl>
            {appointment.notes ? (
              <div className="mt-4 rounded-md border border-[var(--portal-line)] bg-[var(--portal-well)] p-3 text-[13px]">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--portal-muted)]">
                  Booking notes
                </p>
                <p className="mt-1 whitespace-pre-wrap text-[var(--portal-text)]">
                  {appointment.notes}
                </p>
              </div>
            ) : null}
          </div>
        </FormSection>

        {invoice ? (
          <FormSection title="Invoice" description="Read-only view. Admin issues + refunds.">
            <div className="gh-form-section__span-2">
              <dl className="grid gap-2 text-[13px]">
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
                className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-md border border-[var(--portal-line)] px-3 py-2 text-[12.5px] font-semibold text-[var(--portal-text)] hover:bg-[var(--portal-well)]"
              >
                <Printer className="size-3.5" /> Print invoice
              </Link>
            </div>
          </FormSection>
        ) : null}
      </aside>
      </div>
    </div>
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
    <div className="flex items-baseline justify-between gap-3 border-b border-[var(--portal-line)]/60 py-1">
      <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]">
        {label}
      </dt>
      <dd className="text-right text-[var(--portal-text)]">{value}</dd>
    </div>
  );
}
