"use client";

import { AlertCircle, Stethoscope, User } from "lucide-react";

export type DocumentContext = {
  countryCode: string;
  countryLabel: string;
  hasDocxTemplate: boolean;
  patient: {
    fullName: string;
    email: string;
    birthDate: string;
    address: string;
    patientIdLine: string | null;
    consultationDate: string;
    pharmacy: string | null;
  };
  doctor: {
    name: string;
    registrationLine: string;
    registrationVerified: boolean;
    registrationMissing: boolean;
  };
};

export type DocumentContextBannerCopy = {
  noDocxTemplate: string;
  registrationMissing: string;
  patientHeading: string;
  patientAutoNote: string;
  prescriberHeading: string;
  templateLine: string;
  rowName: string;
  rowId: string;
  rowDateOfBirth: string;
  rowAddress: string;
  rowConsultationDate: string;
  rowPharmacy: string;
  rowDoctor: string;
  rowRegistration: string;
};

// ponytail: this component has no current caller (consultation-documents-modal.tsx
// only imports the `DocumentContext` type from here) — copy stays optional
// with an English fallback so it's safe if/when it gets rendered.
const DEFAULT_COPY: DocumentContextBannerCopy = {
  noDocxTemplate:
    "Branded Word templates are not available for {country}; PDFs use the HTML layout instead.",
  registrationMissing:
    "Your medical registration for this country is missing. Add it in your doctor profile so it appears on generated documents.",
  patientHeading: "Patient (from records)",
  patientAutoNote: "Filled automatically on every PDF — you only enter clinical content below.",
  prescriberHeading: "Prescriber (from your profile)",
  templateLine: "Template: {country} ({code})",
  rowName: "Name",
  rowId: "ID",
  rowDateOfBirth: "Date of birth",
  rowAddress: "Address",
  rowConsultationDate: "Consultation date",
  rowPharmacy: "Pharmacy",
  rowDoctor: "Doctor",
  rowRegistration: "Registration",
};

export function DocumentContextBanner({
  context,
  copy = DEFAULT_COPY,
}: {
  context: DocumentContext;
  copy?: DocumentContextBannerCopy;
}) {
  const { patient, doctor } = context;

  return (
    <div className="space-y-3">
      {!context.hasDocxTemplate ? (
        <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {copy.noDocxTemplate.replace("{country}", context.countryLabel)}
        </p>
      ) : null}
      {doctor.registrationMissing ? (
        <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {copy.registrationMissing}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-[var(--portal-line)] bg-[var(--portal-well)] p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--portal-primary)]">
            <User className="size-3.5" aria-hidden />
            {copy.patientHeading}
          </p>
          <dl className="mt-2 grid gap-1.5 text-[13px]">
            <Row label={copy.rowName} value={patient.fullName} />
            {patient.patientIdLine ? (
              <Row label={copy.rowId} value={patient.patientIdLine} />
            ) : null}
            <Row label={copy.rowDateOfBirth} value={patient.birthDate} />
            <Row label={copy.rowAddress} value={patient.address} />
            <Row label={copy.rowConsultationDate} value={patient.consultationDate} />
            {patient.pharmacy ? <Row label={copy.rowPharmacy} value={patient.pharmacy} /> : null}
          </dl>
          <p className="mt-2 text-[11px] text-[var(--portal-muted)]">{copy.patientAutoNote}</p>
        </div>
        <div className="rounded-md border border-[var(--portal-line)] bg-[var(--portal-well)] p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--portal-primary)]">
            <Stethoscope className="size-3.5" aria-hidden />
            {copy.prescriberHeading}
          </p>
          <dl className="mt-2 grid gap-1.5 text-[13px]">
            <Row label={copy.rowDoctor} value={doctor.name} />
            <Row label={copy.rowRegistration} value={doctor.registrationLine} />
          </dl>
          <p className="mt-2 text-[11px] text-[var(--portal-muted)]">
            {copy.templateLine
              .replace("{country}", context.countryLabel)
              .replace("{code}", context.countryCode.toUpperCase())}
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold text-[var(--portal-muted)]">{label}</dt>
      <dd className="font-medium text-[var(--portal-text)]">{value}</dd>
    </div>
  );
}
