"use client";

/**
 * DoctorTourDemo — sample-data walkthrough block rendered on the doctor
 * appointments page, only while the onboarding tour (PortalTour) is active.
 * Gives the tour something concrete to spotlight for the consultation-
 * workspace steps (SOAP note, forms, documents) without touching real data
 * or navigating into a real appointment.
 */

import { useSyncExternalStore } from "react";
import { Video } from "lucide-react";
import { AppointmentCard } from "@/components/AppointmentCard";
import { Pill } from "@/components/portal-atoms";

export type DoctorTourDemoStrings = {
  badge: string;
  patientName: string;
  consultationType: string;
  statusConfirmed: string;
  join: string;
  open: string;
  soapTitle: string;
  chiefComplaint: string;
  chiefComplaintSample: string;
  subjective: string;
  subjectiveSample: string;
  objective: string;
  objectiveSample: string;
  assessment: string;
  assessmentSample: string;
  plan: string;
  planSample: string;
  saveDraft: string;
  saveSign: string;
  formsTitle: string;
  formTemplateName: string;
  fillForm: string;
  documentsTitle: string;
  documentPrescription: string;
  documentReferral: string;
  documentCertificate: string;
  generate: string;
  documentsQueueNote: string;
};

/** PortalTour writes `gh_tour_active` and fires `gh:tour:state` on every
 *  change, so sessionStorage IS the store — subscribe to the event and read
 *  the flag, instead of mirroring it into local state from an effect. */
function subscribeTourState(onChange: () => void) {
  window.addEventListener("gh:tour:state", onChange);
  return () => window.removeEventListener("gh:tour:state", onChange);
}

function isTourActive(): boolean {
  try {
    return sessionStorage.getItem("gh_tour_active") === "1";
  } catch {
    return false;
  }
}

export function DoctorTourDemo({ strings: s }: { strings: DoctorTourDemoStrings }) {
  const active = useSyncExternalStore(subscribeTourState, isTourActive, () => false);

  if (!active) return null;

  return (
    <div className="gh-card gh-tour-demo mb-4 p-4">
      <span className="gh-tour-demo__badge">{s.badge}</span>

      <div className="gh-tour-demo__section" data-tour="demo-appointment">
        <AppointmentCard
          time="09:30"
          timeMeta={s.consultationType}
          person={s.patientName}
          service={s.consultationType}
          tone="info"
          statusPill={<Pill tone="active">{s.statusConfirmed}</Pill>}
          action={
            <span className="inline-flex items-center gap-2">
              <button type="button" disabled className="gh-btn gh-btn-primary text-sm">
                <Video className="size-3.5" aria-hidden /> {s.join}
              </button>
              <button type="button" disabled className="gh-btn gh-btn-soft text-sm">
                {s.open}
              </button>
            </span>
          }
        />
      </div>

      <div className="gh-tour-demo__section" data-tour="demo-soap">
        <p className="gh-tour-demo__section-title">{s.soapTitle}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="gh-field-label">{s.chiefComplaint}</span>
            <input readOnly value={s.chiefComplaintSample} className="gh-input" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="gh-field-label">{s.subjective}</span>
            <input readOnly value={s.subjectiveSample} className="gh-input" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="gh-field-label">{s.objective}</span>
            <input readOnly value={s.objectiveSample} className="gh-input" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="gh-field-label">{s.assessment}</span>
            <input readOnly value={s.assessmentSample} className="gh-input" />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="gh-field-label">{s.plan}</span>
            <input readOnly value={s.planSample} className="gh-input" />
          </label>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button type="button" disabled className="gh-btn gh-btn-soft text-sm">
            {s.saveDraft}
          </button>
          <button type="button" disabled className="gh-btn gh-btn-primary text-sm">
            {s.saveSign}
          </button>
        </div>
      </div>

      <div className="gh-tour-demo__section" data-tour="demo-forms">
        <p className="gh-tour-demo__section-title">{s.formsTitle}</p>
        <div className="gh-tour-demo__row">
          <span className="text-sm">{s.formTemplateName}</span>
          <button type="button" disabled className="gh-btn gh-btn-soft text-sm">
            {s.fillForm}
          </button>
        </div>
      </div>

      <div className="gh-tour-demo__section" data-tour="demo-documents">
        <p className="gh-tour-demo__section-title">{s.documentsTitle}</p>
        {[s.documentPrescription, s.documentReferral, s.documentCertificate].map((label) => (
          <div className="gh-tour-demo__row" key={label}>
            <span className="text-sm">{label}</span>
            <button type="button" disabled className="gh-btn gh-btn-soft text-sm">
              {s.generate}
            </button>
          </div>
        ))}
        <p className="gh-tour-demo__note">{s.documentsQueueNote}</p>
      </div>
    </div>
  );
}
