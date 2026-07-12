import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { FormSection } from "@/components/FormSection";

export type PatientContextCopy = {
  patient: string;
  ghn: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  consultationLanguage: string;
  statusLabel: string;
  booked: string;
  bookingNotes: string;
  openPatientChart: string;
  editHealthDataHint: string;
};

/**
 * Patient-context card — shared by the ≥lg persistent rail and the below-lg
 * "Patient" tab (C1-C3). Same component rendered in both places rather than
 * two hand-maintained copies; which one is visible at a given width is a
 * pure CSS concern (`portal.css` `.gh-doctor-context-rail` / `#gh-tab-patient`).
 */
export function PatientContextPanel({
  appointment,
  statusText,
  copy,
}: {
  appointment: {
    globalHealthNumber?: string | null;
    email: string;
    phone?: string | null;
    dateOfBirth?: string | null;
    consultationLanguageCode?: string | null;
    createdAt: string;
    notes?: string | null;
  };
  statusText: string;
  copy: PatientContextCopy;
}) {
  return (
    <FormSection title={copy.patient}>
      <div className="gh-form-section__span-2">
        <dl className="grid gap-2 text-portal-compact">
          {appointment.globalHealthNumber ? (
            <Row label={copy.ghn} value={appointment.globalHealthNumber} />
          ) : null}
          <Row label={copy.email} value={appointment.email} />
          <Row label={copy.phone} value={appointment.phone ?? "—"} />
          <Row
            label={copy.dateOfBirth}
            value={
              appointment.dateOfBirth
                ? new Date(appointment.dateOfBirth).toLocaleDateString()
                : "—"
            }
          />
          {appointment.consultationLanguageCode ? (
            <Row
              label={copy.consultationLanguage}
              value={appointment.consultationLanguageCode.toUpperCase()}
            />
          ) : null}
          <Row label={copy.statusLabel} value={statusText} />
          <Row
            label={copy.booked}
            value={new Date(appointment.createdAt).toLocaleString()}
          />
        </dl>
        {appointment.notes ? (
          <div className="mt-4 rounded-md border border-[var(--portal-line)] bg-[var(--portal-well)] p-3 text-portal-compact">
            <p className="text-portal-thead font-bold uppercase tracking-[0.12em] text-[var(--portal-muted)]">
              {copy.bookingNotes}
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
          <ExternalLink className="size-3.5" aria-hidden /> {copy.openPatientChart}
        </Link>
        <p className="mt-1 text-portal-meta text-[var(--portal-muted)]">
          {copy.editHealthDataHint}
        </p>
      </div>
    </FormSection>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[var(--portal-line)]/60 py-1">
      <dt className="text-portal-thead font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]">
        {label}
      </dt>
      <dd className="text-right text-[var(--portal-text)]">{value}</dd>
    </div>
  );
}
