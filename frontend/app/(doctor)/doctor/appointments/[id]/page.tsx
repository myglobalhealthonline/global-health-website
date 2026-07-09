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
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

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
  const locale = await getPageLocale();
  const { doctor: d } = loadLocaleBundle(locale);
  const statusValueText: Record<string, string> = {
    REQUEST_RECEIVED: d.appointmentDetail.statusCreated,
    UNDER_REVIEW: d.appointmentDetail.statusSent,
    CONTACTED: d.appointmentDetail.statusContacted,
    COMPLETED: d.appointmentDetail.statusConcluded,
    CANCELLED: d.appointmentDetail.statusCancelled,
  };
  const [
    consultRes,
    examsRes,
    messagesRes,
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
          <ArrowLeft className="size-3.5" /> {d.appointmentDetail.back}
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
  const submissions = submissionsRes.ok ? submissionsRes.data.items : [];
  const templates = templatesRes.ok ? templatesRes.data.items : [];
  const documents = documentsRes.ok ? documentsRes.data.items : [];
  const pendingSendCount = generatedDocsRes.ok ? generatedDocsRes.data.queue.length : 0;
  const doctorName = meRes.ok ? meRes.data.doctor.fullName : d.portal.sectionLabel;
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
  // Modal needs many more strings than the section/trigger blurb — merge
  // the two JSON sections into one flat copy object shared by all three
  // renderers of ConsultationDocumentsModal.
  const consultationDocsCopy = {
    ...d.consultationDocuments,
    ...d.consultationDocumentsModal,
  };
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
        <ArrowLeft className="size-3.5" /> {d.appointmentDetail.back}
      </Link>

      <header className="gh-doctor-appointment-header mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--portal-muted)]">
            {d.appointmentDetail.eyebrow}
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
              : d.appointmentDetail.notScheduled}{" "}
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
              {consultationMode === "ONLINE" ? d.appointmentDetail.online : d.appointmentDetail.inPerson}
            </span>
            {followUpFromId ? (
              <Link
                href={`/doctor/appointments/${followUpFromId}`}
                className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-violet-800 hover:underline"
              >
                {d.appointmentDetail.followUpOfOriginal}
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
              <ExternalLink className="size-3.5" /> {d.appointmentDetail.joinCall}
            </a>
          ) : null}
          <Link
            href={`/print/appointments/${id}`}
            target="_blank"
            className="gh-btn gh-btn-soft"
          >
            <Printer className="size-3.5" /> {d.appointmentDetail.printSummary}
          </Link>
        </div>
      </header>

      <AdminSummaryStrip
        className="mb-4"
        items={[
          {
            label: d.appointmentDetail.consultationNote,
            value: signed ? d.common.signed : d.common.draft,
            hint: signed ? d.appointmentDetail.signedHint : d.appointmentDetail.draftHint,
            tone: signed ? "success" : "warning",
          },
          {
            label: d.appointmentDetail.documents,
            value: documents.length + pendingSendCount,
            hint:
              pendingSendCount > 0
                ? d.appointmentDetail.waitingToSend.replace("{count}", String(pendingSendCount))
                : d.appointmentDetail.documentsHint,
            tone: pendingSendCount > 0 ? "warning" : "neutral",
          },
          {
            label: d.appointmentDetail.clinicalItems,
            value: exams.length + prescriptions.length,
            hint: d.appointmentDetail.clinicalItemsHint,
            tone: exams.length + prescriptions.length > 0 ? "brand" : "neutral",
          },
          {
            label: d.appointmentDetail.messages,
            value: messages.length,
            hint: d.appointmentDetail.messagesHint,
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
        ariaLabel={d.appointmentDetail.tabsAriaLabel}
        tabs={[
          {
            id: "overview",
            label: d.appointmentDetail.tabOverview,
            panel: (
              <div className="gh-doctor-appointment-overview grid gap-4">
                <FormSection
                  title={d.appointmentDetail.meetingStatusTitle}
                  description={d.appointmentDetail.meetingStatusDesc}
                >
                  <div className="gh-form-section__span-2">
                    <AppointmentActions
                      appointmentId={appointment.id}
                      initialMeetingUrl={appointment.meetingUrl}
                      initialStatus={appointment.status}
                      initialScheduledAt={appointment.scheduledAt}
                      initialMode={consultationMode}
                      copy={d.appointmentActions}
                    />
                    <div className="mt-4 border-t border-[var(--portal-line)] pt-4">
                      <h4 className="text-sm font-bold text-[var(--portal-text)]">
                        {d.appointmentDetail.finalize}
                      </h4>
                      <FinalizeChecklist
                        appointmentId={appointment.id}
                        initialFinalized={appointment.finalized ?? false}
                        initialNotesUploaded={appointment.notesUploaded ?? false}
                        initialFilesUploaded={appointment.filesUploaded ?? false}
                        copy={d.finalizeChecklist}
                      />
                    </div>
                    <div className="mt-4 border-t border-[var(--portal-line)] pt-4">
                      <FollowUpButton appointmentId={appointment.id} copy={d.followUpButton} />
                    </div>
                  </div>
                </FormSection>

                <FormSection title={d.appointmentDetail.consultationDocuments}>
                  <div className="gh-form-section__span-2">
                    <ConsultationDocumentsSection appointmentId={appointment.id} copy={consultationDocsCopy} />
                  </div>
                </FormSection>

                {appointment.countryCode.toLowerCase() === "br" ? (
                  <FormSection title={d.appointmentDetail.brazilConsent}>
                    <div className="gh-form-section__span-2">
                      <BrazilConsentPanel
                        appointmentId={appointment.id}
                        countryCode={appointment.countryCode}
                        copy={d.brazilConsent}
                      />
                    </div>
                  </FormSection>
                ) : null}
              </div>
            ),
          },
          {
            id: "consultation",
            label: d.appointmentDetail.tabConsultation,
            badge: signed ? d.common.signed : d.common.draft,
            panel: (
              <FormSection
                title={d.appointmentDetail.consultationNote}
                description={d.appointmentDetail.consultationNoteDesc}
                right={
                  <div className="flex items-center gap-2">
                    <ConsultationDocumentsTrigger appointmentId={appointment.id} copy={consultationDocsCopy} />
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] ${
                        signed
                          ? "bg-[var(--portal-success-soft)] text-[var(--portal-success-text)]"
                          : "bg-[var(--portal-well)] text-[var(--portal-muted)]"
                      }`}
                    >
                      {signed ? d.common.signed : d.common.draft}
                    </span>
                  </div>
                }
              >
                <div className="gh-form-section__span-2">
                  <ConsultationForm
                    appointmentId={appointment.id}
                    copy={d.consultationForm}
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
                      {d.appointmentDetail.servicesRendered}
                    </h4>
                    <p className="mt-1 text-[12.5px] text-[var(--portal-muted)]">
                      {d.appointmentDetail.servicesRenderedDesc}
                    </p>
                    <ServicesUsedList
                      consultationId={consultation?.id ?? null}
                      initialItems={servicesUsed}
                      locked={signed}
                      copy={d.servicesUsedList}
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
                      {d.appointmentDetail.shareColleague}
                    </h4>
                    <p className="mt-1 text-[12.5px] text-[var(--portal-muted)]">
                      {d.appointmentDetail.shareColleagueDesc}
                    </p>
                    <div className="mt-2">
                      {consultation ? (
                        <ShareConsultationButton
                          consultationId={consultation.id}
                          disabled={!signed}
                          copy={d.shareButton}
                        />
                      ) : (
                        <p className="text-[12px] text-[var(--portal-muted)]">
                          {d.appointmentDetail.saveDraftFirst}
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
            label: d.appointmentDetail.tabClinical,
            badge:
              exams.length + prescriptions.length > 0
                ? String(exams.length + prescriptions.length)
                : null,
            panel: (
              <div className="grid gap-4">
                <FormSection
                  title={d.appointmentDetail.examResults}
                  description={d.appointmentDetail.examResultsDesc}
                >
                  <div className="gh-form-section__span-2">
                    <ExamResultsList appointmentId={appointment.id} initialItems={exams} copy={d.examResultsList} />
                  </div>
                </FormSection>

                <FormSection
                  title={d.appointmentDetail.prescriptions}
                  description={d.appointmentDetail.prescriptionsDesc}
                >
                  <div className="gh-form-section__span-2">
                    <PrescriptionsList
                      appointmentId={appointment.id}
                      initialItems={prescriptions}
                      consultationLocked={signed}
                      copy={d.prescriptionsList}
                    />
                  </div>
                </FormSection>
              </div>
            ),
          },
          {
            id: "forms",
            label: d.appointmentDetail.tabForms,
            badge: submissions.length > 0 ? String(submissions.length) : null,
            panel: (
              <div className="grid gap-4">
                <FormSection
                  title={d.appointmentDetail.tabForms}
                  description={d.appointmentDetail.formsDesc}
                >
                  <div className="gh-form-section__span-2">
                    <FormFillSection appointmentId={appointment.id} templates={templates} copy={d.formFill} />
                  </div>
                </FormSection>

                {submissions.length > 0 ? (
                  <FormSection
                    title={d.appointmentDetail.formSubmissions}
                    description={d.appointmentDetail.formSubmissionsDesc}
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
                                <Printer className="size-3" /> {d.common.print}
                              </Link>
                            </div>
                            <p className="text-[11.5px] text-[var(--portal-muted)]">
                              {d.appointmentDetail.submittedAt.replace(
                                "{date}",
                                new Date(s.submittedAt).toLocaleString(),
                              )}
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
            label: d.appointmentDetail.tabDocuments,
            badge: documentsTabBadge,
            badgeAlert: Boolean(documentsTabBadge),
            panel: (
              <FormSection
                title={d.appointmentDetail.documents}
                description={d.appointmentDetail.documentsDesc}
              >
                <div className="gh-form-section__span-2">
                  <AppointmentDocumentsTab
                    appointmentId={appointment.id}
                    scheduledAt={appointment.scheduledAt}
                    createdAt={appointment.createdAt}
                    consultationType={appointment.consultationType}
                    doctorName={doctorName}
                    initialUploads={documents}
                    copy={d.appointmentDocumentsTab}
                    modalCopy={consultationDocsCopy}
                    uploadCopy={d.documentUploadForm}
                    reviewCopy={d.documentsReviewSendPanel}
                  />
                </div>
              </FormSection>
            ),
          },
          {
            id: "messages",
            label: d.appointmentDetail.tabMessages,
            panel: (
              <div className="grid gap-4">
                <div id="patient-chat" className="scroll-mt-24">
                  <FormSection
                    title={d.appointmentDetail.patientChat}
                    description={d.appointmentDetail.patientChatDesc}
                  >
                    <div className="gh-form-section__span-2">
                      <DoctorConsultationChatSection appointmentId={appointment.id} copy={d.consultationChat} />
                    </div>
                  </FormSection>
                </div>

                <FormSection
                  title={d.appointmentDetail.internalNotes}
                  description={d.appointmentDetail.internalNotesDesc}
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
        <FormSection title={d.appointmentDetail.patient}>
          <div className="gh-form-section__span-2">
            <dl className="grid gap-2 text-[13px]">
              {appointment.globalHealthNumber ? (
                <Row label={d.appointmentDetail.ghn} value={appointment.globalHealthNumber} />
              ) : null}
              <Row label={d.appointmentDetail.email} value={appointment.email} />
              <Row label={d.appointmentDetail.phone} value={appointment.phone ?? "—"} />
              <Row
                label={d.common.dateOfBirth}
                value={
                  appointment.dateOfBirth
                    ? new Date(appointment.dateOfBirth).toLocaleDateString()
                    : "—"
                }
              />
              {appointment.consultationLanguageCode ? (
                <Row label={d.appointmentDetail.consultationLanguage} value={appointment.consultationLanguageCode.toUpperCase()} />
              ) : null}
              <Row label={d.appointmentDetail.statusLabel} value={statusValueText[appointment.status] ?? appointment.status} />
              <Row
                label={d.appointmentDetail.booked}
                value={new Date(appointment.createdAt).toLocaleString()}
              />
            </dl>
            {appointment.notes ? (
              <div className="mt-4 rounded-md border border-[var(--portal-line)] bg-[var(--portal-well)] p-3 text-[13px]">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--portal-muted)]">
                  {d.appointmentDetail.bookingNotes}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-[var(--portal-text)]">
                  {appointment.notes}
                </p>
              </div>
            ) : null}
            <Link
              href={`/doctor/patients/${encodeURIComponent(appointment.email)}`}
              className="gh-btn gh-btn-soft mt-4 inline-flex items-center gap-2 text-sm"
            >
              <ExternalLink className="size-3.5" aria-hidden /> {d.appointmentDetail.openPatientChart}
            </Link>
            <p className="mt-1 text-[12px] text-[var(--portal-muted)]">
              {d.appointmentDetail.editHealthDataHint}
            </p>
          </div>
        </FormSection>

        {/* Patient billing/invoice is intentionally NOT shown to doctors —
            they see only their own per-service payout under Finance →
            Invoices. Admin owns patient invoicing. */}
      </aside>
      </div>
    </div>
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
