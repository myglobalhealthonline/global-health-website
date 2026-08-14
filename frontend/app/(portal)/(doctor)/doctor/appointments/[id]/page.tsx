import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  FileStack,
  FileText,
  Globe2,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Printer,
  Stethoscope,
  User,
} from "lucide-react";
import { formatAppDualTz } from "@/lib/format-datetime";
import {
  fetchDoctorConsultation,
  fetchDoctorConsultationServices,
  fetchDoctorCrossBorderRxMoreInfo,
  fetchDoctorDocuments,
  fetchDoctorGeneratedDocuments,
  fetchDoctorMe,
  fetchDoctorFormSubmissions,
  fetchDoctorFormTemplates,
  fetchDoctorInternalMessages,
  fetchDoctorPermissions,
} from "@/lib/api/doctor-api";
import { ConsultationForm } from "./_components/consultation-form";
import { CrossBorderRxButton } from "./_components/cross-border-rx-button";
import { ServicesUsedList } from "./_components/services-used-list";
import { ShareConsultationButton } from "./_components/share-button";
import { AppointmentActions } from "./_components/appointment-actions";
import { MeetingLinkCta } from "./_components/meeting-link-cta";
import { FormFillSection } from "./_components/form-fill";
import { FollowUpButton } from "./_components/follow-up-button";
import { AppointmentDocumentsTab } from "./_components/appointment-documents-tab";
import { InternalMessagesThread } from "@/components/chat/InternalMessagesThread";
import { DoctorConsultationChatSection } from "./_components/consultation-chat-section";
import { AppointmentTabs } from "./_components/appointment-tabs";
import { FinalizeChecklist } from "./_components/finalize-checklist";
import {
  ConsultationDocumentsSection,
  ConsultationDocumentsTrigger,
} from "./_components/consultation-documents-section";
import { BrazilConsentPanel } from "./_components/brazil-consent-panel";
import { MedicalAccessDeniedNotice } from "../../_components/medical-access-denied";
import { PatientContextPanel } from "./_components/patient-context-panel";
import { ReferringRecordPanel } from "./_components/referring-record-panel";
import { CrossBorderMoreInfoPanel } from "./_components/cross-border-more-info-panel";
import { AdminSummaryStrip } from "@/components/portal-atoms";
import { FormSection } from "@/components/FormSection";
import { getPortalLocale } from "@/lib/i18n/get-portal-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { doctorAppointmentView } from "@/lib/api/appointment-status-labels";
import { SetCrumbTitle } from "@/components/crumb-title";

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
  const locale = await getPortalLocale();
  const { doctor: d } = loadLocaleBundle(locale);
  // Same shared lexicon + collapsing logic as the appointments list
  // (lib/api/appointment-status-labels.ts) and the same locale keys
  // (d.appointments.status*), so the patient-context "Status" readout here
  // reads identically to the list row for the same appointment. The
  // Appointment status *select* below (appointment-actions.tsx) is a
  // separate, intentionally more granular workflow-stage editor — it still
  // uses its own five-value vocabulary since collapsing it would make
  // distinct backend states indistinguishable in the dropdown.
  const doctorViewStatusText: Record<string, string> = {
    waiting_payment: d.appointments.statusWaitingPayment,
    confirmed: d.appointments.statusConfirmed,
    cancelled: d.appointments.statusCancelled,
    concluded: d.appointments.statusConcluded,
  };
  const [
    consultRes,
    messagesRes,
    submissionsRes,
    templatesRes,
    documentsRes,
    generatedDocsRes,
    meRes,
    permsRes,
    moreInfoRes,
  ] = await Promise.all([
    fetchDoctorConsultation(id),
    fetchDoctorInternalMessages(id),
    fetchDoctorFormSubmissions(id),
    fetchDoctorFormTemplates(),
    fetchDoctorDocuments(id),
    fetchDoctorGeneratedDocuments(id),
    fetchDoctorMe(),
    fetchDoctorPermissions(),
    fetchDoctorCrossBorderRxMoreInfo(id),
  ]);

  if (!consultRes.ok) {
    return (
      <div className="gh-card p-6">
        <Link
          href="/doctor/appointments"
          className="mb-3 inline-flex items-center gap-1.5 text-portal-compact font-semibold text-[var(--portal-muted)] hover:text-[var(--portal-text)]"
        >
          <ArrowLeft className="size-3.5" /> {d.appointmentDetail.back}
        </Link>
        {consultRes.deniedAccess ? (
          <MedicalAccessDeniedNotice
            appointmentId={id}
            denial={consultRes.deniedAccess}
            copy={d.medicalAccessDenied}
          />
        ) : (
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            {consultRes.message}
          </p>
        )}
      </div>
    );
  }

  const { appointment, consultation } = consultRes.data;
  const messages = messagesRes.ok ? messagesRes.data.items : [];
  const submissions = submissionsRes.ok ? submissionsRes.data.items : [];
  const templates = templatesRes.ok ? templatesRes.data.items : [];
  const documents = documentsRes.ok ? documentsRes.data.items : [];
  const pendingSendCount = generatedDocsRes.ok ? generatedDocsRes.data.queue.length : 0;
  const doctorName = meRes.ok ? meRes.data.doctor.fullName : d.portal.sectionLabel;
  const canRequestCrossJurisdictionRx =
    permsRes.ok && permsRes.data.canRequestCrossJurisdictionRx;
  const pendingMoreInfo = moreInfoRes.ok ? moreInfoRes.data.pending : null;
  const documentsTabBadge =
    pendingSendCount > 0 ? String(pendingSendCount) : null;
  const consultationMode = appointment.consultationMode ?? "ONLINE";
  const followUpFromId = appointment.followUpFromAppointmentId ?? null;
  const signed = consultation?.status === "SIGNED";
  // Finalize-checklist readiness signals (doctor audit 03/UX-002·UX-006),
  // derived from data already fetched above — no new API calls.
  const noteRecorded = Boolean(
    consultation &&
      (consultation.chiefComplaint ||
        consultation.subjective ||
        consultation.objective ||
        consultation.assessment ||
        consultation.plan ||
        consultation.note),
  );
  const timeReached = !appointment.scheduledAt || new Date(appointment.scheduledAt) <= new Date();
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
  // Cross-jurisdiction prescription: labels for the referring doctor's
  // disclosed record. Shares the inbox block so the two surfaces can't drift.
  const referringRecordCopy = {
    sourceRecordTitle: d.crossBorderRxInbox.sourceRecordTitle,
    sourceRecordDesc: d.crossBorderRxInbox.sourceRecordDesc,
    fromLabel: d.crossBorderRxInbox.fromLabel,
    requestedOn: d.crossBorderRxInbox.requestedOn,
    summaryHeading: d.crossBorderRxInbox.summaryHeading,
    soapConsentNote: d.crossBorderRxInbox.soapConsentNote,
    soapChiefComplaint: d.crossBorderRxInbox.soapChiefComplaint,
    soapSubjective: d.crossBorderRxInbox.soapSubjective,
    soapObjective: d.crossBorderRxInbox.soapObjective,
    soapAssessment: d.crossBorderRxInbox.soapAssessment,
    soapPlan: d.crossBorderRxInbox.soapPlan,
    soapNote: d.crossBorderRxInbox.soapNote,
    soapEmpty: d.crossBorderRxInbox.soapEmpty,
    sourceDocumentsNote: d.crossBorderRxInbox.sourceDocumentsNote,
    moreInfoTitle: d.crossBorderRxMoreInfo.title,
    moreInfoQuestionLabel: d.crossBorderRxMoreInfo.questionLabel,
    moreInfoAnswerLabel: d.crossBorderRxMoreInfo.answerLabel,
    moreInfoAwaitingAnswer: d.crossBorderRxMoreInfo.awaitingAnswer,
  };
  // Shared by both renderers of the patient-context card (>=lg rail, <lg tab).
  const patientContextCopy = {
    patient: d.appointmentDetail.patient,
    ghn: d.appointmentDetail.ghn,
    email: d.appointmentDetail.email,
    phone: d.appointmentDetail.phone,
    dateOfBirth: d.common.dateOfBirth,
    address: d.appointmentDetail.address,
    utenteNumber: d.appointmentDetail.utenteNumber,
    consultationLanguage: d.appointmentDetail.consultationLanguage,
    statusLabel: d.appointmentDetail.statusLabel,
    booked: d.appointmentDetail.booked,
    bookingNotes: d.appointmentDetail.bookingNotes,
    openPatientChart: d.appointmentDetail.openPatientChart,
    editHealthDataHint: d.appointmentDetail.editHealthDataHint,
    // Editable identity/address/DOB rows, offered in every market. The
    // document names stay in their own market's terms in every locale — a NIF
    // and a CPF name real documents, not generic concepts — while `taxId` and
    // `nationalId` are the neutral wording for markets that have neither.
    identityFields: {
      utente: d.appointmentDetail.utenteNumber,
      nif: d.appointmentDetail.ptNif,
      cpf: d.appointmentDetail.brCpf,
      taxId: d.appointmentDetail.taxId,
      idCard: d.appointmentDetail.ptIdCard,
      nationalId: d.appointmentDetail.nationalId,
      passport: d.appointmentDetail.passport,
      pharmacy: d.appointmentDetail.ptPharmacy,
      dateOfBirth: d.common.dateOfBirth,
      address: d.appointmentDetail.address,
      addressLine1: d.appointmentDetail.addressLine1,
      addressLine2: d.appointmentDetail.addressLine2,
      addressCity: d.appointmentDetail.addressCity,
      addressState: d.appointmentDetail.addressState,
      addressPostalCode: d.appointmentDetail.addressPostalCode,
      add: d.appointmentDetail.ptFieldAdd,
      edit: d.appointmentDetail.ptFieldEdit,
      save: d.appointmentDetail.ptFieldSave,
      cancel: d.appointmentDetail.ptFieldCancel,
      saveFailed: d.appointmentDetail.ptFieldSaveFailed,
    },
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
      <SetCrumbTitle label={appointment.fullName} />
      <Link
        href="/doctor/appointments"
        className="mb-2 inline-flex items-center gap-1.5 text-portal-compact font-semibold text-[var(--portal-muted)] hover:text-[var(--portal-text)]"
      >
        <ArrowLeft className="size-3.5" /> {d.appointmentDetail.back}
      </Link>

      <header className="gh-doctor-appointment-header mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-portal-thead font-bold uppercase tracking-[0.18em] text-[var(--portal-muted)]">
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
          <p className="mt-0.5 inline-flex items-center gap-1 text-sm text-[var(--portal-muted)]">
            <Stethoscope className="size-3.5" aria-hidden /> {doctorName}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-portal-thead font-bold uppercase tracking-[0.08em] ${
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
                className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-portal-thead font-bold uppercase tracking-[0.08em] text-violet-800 hover:underline"
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
          ) : consultationMode === "ONLINE" ? (
            <MeetingLinkCta label={d.appointmentDetail.createMeetingLink} />
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
            icon: <FileText aria-hidden />,
          },
          {
            label: d.appointmentDetail.documents,
            value: documents.length + pendingSendCount,
            hint:
              pendingSendCount > 0
                ? d.appointmentDetail.waitingToSend.replace("{count}", String(pendingSendCount))
                : d.appointmentDetail.documentsHint,
            tone: pendingSendCount > 0 ? "warning" : "neutral",
            icon: <FileStack aria-hidden />,
          },
          {
            label: d.appointmentDetail.messages,
            value: messages.length,
            hint: d.appointmentDetail.messagesHint,
            tone: messages.length > 0 ? "success" : "neutral",
            icon: <MessageSquare aria-hidden />,
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
            icon: <LayoutDashboard aria-hidden />,
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
                      clinicTimezone={appointment.clinicTimezone}
                      copy={d.appointmentActions}
                    />
                  </div>
                </FormSection>

                <FormSection title={d.appointmentDetail.finalize}>
                  <div className="gh-form-section__span-2">
                    <FinalizeChecklist
                      appointmentId={appointment.id}
                      initialFinalized={appointment.finalized ?? false}
                      initialFilesUploaded={appointment.filesUploaded ?? false}
                      cancelled={appointment.status === "CANCELLED"}
                      noteRecorded={noteRecorded}
                      timeReached={timeReached}
                      copy={d.finalizeChecklist}
                    />
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
            icon: <Stethoscope aria-hidden />,
            badge: signed ? d.common.signed : d.common.draft,
            panel: (
              <FormSection
                title={d.appointmentDetail.consultationNote}
                description={d.appointmentDetail.consultationNoteDesc}
                right={
                  <div className="flex items-center gap-2">
                    <ConsultationDocumentsTrigger appointmentId={appointment.id} copy={consultationDocsCopy} />
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-portal-thead font-bold uppercase tracking-[0.08em] ${
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
                  {pendingMoreInfo ? (
                    <CrossBorderMoreInfoPanel
                      appointmentId={appointment.id}
                      initial={pendingMoreInfo}
                      copy={d.crossBorderRxMoreInfo}
                    />
                  ) : null}
                  {appointment.crossBorderSource ? (
                    <ReferringRecordPanel
                      record={appointment.crossBorderSource}
                      copy={referringRecordCopy}
                    />
                  ) : null}
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
                            noteFormat: consultation.noteFormat,
                            note: consultation.note ?? "",
                            status: consultation.status,
                            signedAt: consultation.signedAt,
                          }
                        : {
                            chiefComplaint: "",
                            subjective: "",
                            objective: "",
                            assessment: "",
                            plan: "",
                            noteFormat: "SOAP",
                            note: "",
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
                    <p className="mt-1 text-portal-label text-[var(--portal-muted)]">
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
                    <p className="mt-1 text-portal-label text-[var(--portal-muted)]">
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
                        <p className="text-portal-meta text-[var(--portal-muted)]">
                          {d.appointmentDetail.saveDraftFirst}
                        </p>
                      )}
                    </div>
                  </div>

                  {canRequestCrossJurisdictionRx ? (
                    <div className="mt-6 border-t border-[var(--portal-line)] pt-5">
                      <h4
                        className="m-0 text-[var(--portal-text)]"
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 14,
                          fontWeight: 800,
                        }}
                      >
                        {d.crossBorderRx.title}
                      </h4>
                      <p className="mt-1 text-portal-label text-[var(--portal-muted)]">
                        {d.crossBorderRx.description}
                      </p>
                      <div className="mt-2">
                        <CrossBorderRxButton
                          appointmentId={appointment.id}
                          copy={d.crossBorderRx}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </FormSection>
            ),
          },
          {
            id: "forms",
            label: d.appointmentDetail.tabForms,
            icon: <FileStack aria-hidden />,
            badge: submissions.length > 0 ? String(submissions.length) : null,
            panel: (
              <div className="grid gap-4" data-tour="appointment-forms">
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
                              <p className="text-portal-compact font-semibold text-[var(--portal-text)]">
                                {s.template.title}
                              </p>
                              <Link
                                href={`/print/forms/${s.id}`}
                                target="_blank"
                                className="inline-flex items-center gap-1 text-portal-meta font-semibold text-[var(--portal-primary)] hover:underline"
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
                            <dl className="mt-2 grid gap-1.5 text-portal-compact">
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
            icon: <FileStack aria-hidden />,
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
                    sendDocumentCopy={d.sendDocumentForm}
                    uploadLinkCopy={d.patientUploadLinkCard}
                    reviewCopy={d.documentsReviewSendPanel}
                  />
                </div>
              </FormSection>
            ),
          },
          {
            id: "messages",
            label: d.appointmentDetail.tabMessages,
            icon: <MessageSquare aria-hidden />,
            panel: (
              <div className="grid gap-4">
                <div id="patient-chat" className="scroll-mt-24">
                  <FormSection
                    title={d.appointmentDetail.patientChat}
                    description={d.appointmentDetail.patientChatDesc}
                  >
                    <div className="gh-form-section__span-2">
                      <DoctorConsultationChatSection appointmentId={appointment.id} labels={d.consultationChat} />
                    </div>
                  </FormSection>
                </div>

                {/* `id` is the deep-link target for the notification bell
                    (`?tab=messages#internal-notes`). */}
                <div id="internal-notes" className="scroll-mt-24">
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
                      labels={{
                        emptyState: d.appointmentDetail.internalNotesEmptyState,
                        authorDoctor: d.appointmentDetail.internalNotesAuthorDoctor,
                        authorAdmin: d.appointmentDetail.internalNotesAuthorAdmin,
                        placeholderFromDoctor: d.appointmentDetail.internalNotesPlaceholderFromDoctor,
                        placeholderFromAdmin: d.appointmentDetail.internalNotesPlaceholderFromAdmin,
                        postNote: d.appointmentDetail.internalNotesPostNote,
                        postFailed: d.appointmentDetail.internalNotesPostFailed,
                      }}
                    />
                  </div>
                </FormSection>
                </div>
              </div>
            ),
          },
          {
            // Sub-lg fallback for the patient-context rail (C1-C3, TASK §1):
            // never a floating card above the tabs — a dedicated tab instead.
            // Hidden at >=lg via CSS since the rail already shows this content.
            id: "patient",
            label: d.appointmentDetail.patient,
            icon: <User aria-hidden />,
            panel: (
              <PatientContextPanel
                appointment={appointment}
                statusText={doctorViewStatusText[doctorAppointmentView(appointment.status, appointment.paymentStatus)]}
                copy={patientContextCopy}
              />
            ),
          },
        ]}
      />
      </div>

      <aside className="gh-doctor-context-rail">
        <PatientContextPanel
          appointment={appointment}
          statusText={doctorViewStatusText[doctorAppointmentView(appointment.status, appointment.paymentStatus)]}
          copy={patientContextCopy}
        />
        {/* Patient billing/invoice is intentionally NOT shown to doctors —
            they see only their own per-service payout under Finance →
            Invoices. Admin owns patient invoicing. */}
      </aside>
      </div>
    </div>
  );
}
