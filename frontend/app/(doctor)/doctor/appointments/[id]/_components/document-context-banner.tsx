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

export function DocumentContextBanner({ context }: { context: DocumentContext }) {
  const { patient, doctor } = context;

  return (
    <div className="space-y-3">
      {!context.hasDocxTemplate ? (
        <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Branded Word templates are not available for {context.countryLabel}; PDFs use
          the HTML layout instead.
        </p>
      ) : null}
      {doctor.registrationMissing ? (
        <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Your medical registration for this country is missing. Add it in your doctor
          profile so it appears on generated documents.
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-[var(--portal-line)] bg-[var(--portal-well)] p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--portal-primary)]">
            <User className="size-3.5" aria-hidden />
            Patient (from records)
          </p>
          <dl className="mt-2 grid gap-1.5 text-[13px]">
            <Row label="Name" value={patient.fullName} />
            {patient.patientIdLine ? (
              <Row label="ID" value={patient.patientIdLine} />
            ) : null}
            <Row label="Date of birth" value={patient.birthDate} />
            <Row label="Address" value={patient.address} />
            <Row label="Consultation date" value={patient.consultationDate} />
            {patient.pharmacy ? <Row label="Pharmacy" value={patient.pharmacy} /> : null}
          </dl>
          <p className="mt-2 text-[11px] text-[var(--portal-muted)]">
            Filled automatically on every PDF — you only enter clinical content below.
          </p>
        </div>
        <div className="rounded-md border border-[var(--portal-line)] bg-[var(--portal-well)] p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--portal-primary)]">
            <Stethoscope className="size-3.5" aria-hidden />
            Prescriber (from your profile)
          </p>
          <dl className="mt-2 grid gap-1.5 text-[13px]">
            <Row label="Doctor" value={doctor.name} />
            <Row label="Registration" value={doctor.registrationLine} />
          </dl>
          <p className="mt-2 text-[11px] text-[var(--portal-muted)]">
            Template: {context.countryLabel} ({context.countryCode.toUpperCase()})
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
