import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { FormSection } from "@/components/FormSection";
import {
  PtPatientIdentityRows,
  type PtPatientFieldsCopy,
} from "./pt-patient-identity-rows";

export type PatientContextCopy = {
  patient: string;
  ghn: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  utenteNumber: string;
  consultationLanguage: string;
  statusLabel: string;
  booked: string;
  bookingNotes: string;
  openPatientChart: string;
  editHealthDataHint: string;
  ptFields: PtPatientFieldsCopy;
};

/**
 * One-line postal address. Country code is deliberately left off — the
 * appointment card already carries the market context, and repeating it
 * reads as noise in the narrow rail.
 */
function formatAddress(a: {
  addressLine1?: string | null;
  addressLine2?: string | null;
  addressCity?: string | null;
  addressPostalCode?: string | null;
}): string | null {
  const cityLine = [a.addressPostalCode, a.addressCity].filter(Boolean).join(" ");
  const parts = [a.addressLine1, a.addressLine2, cityLine].filter(
    (p): p is string => Boolean(p && p.trim()),
  );
  return parts.length ? parts.join(", ") : null;
}

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
    countryCode: string;
    phone?: string | null;
    dateOfBirth?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    addressCity?: string | null;
    addressPostalCode?: string | null;
    utenteNumber?: string | null;
    taxIdNumber?: string | null;
    nationalIdNumber?: string | null;
    preferredPharmacy?: string | null;
    pharmacy?: string | null;
    consultationLanguageCode?: string | null;
    createdAt: string;
    notes?: string | null;
  };
  statusText: string;
  copy: PatientContextCopy;
}) {
  const address = formatAddress(appointment);
  // NIF / Cartão de Cidadão / pharmacy are a Portugal-only block. Unlike the
  // rows above, presence can't be the gate: the whole point is to render an
  // "add" affordance when the patient left the field blank, so the market has
  // to be checked explicitly. Country codes are stored lowercase.
  const isPortugal = appointment.countryCode.toLowerCase() === "pt";
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
          {address ? <Row label={copy.address} value={address} /> : null}
          {/* PT-only: the backend returns this solely for markets with
              `collectUtenteNumber`, so presence is the gate here. */}
          {appointment.utenteNumber ? (
            <Row label={copy.utenteNumber} value={appointment.utenteNumber} />
          ) : null}
          {isPortugal ? (
            <PtPatientIdentityRows
              email={appointment.email}
              initial={{
                taxIdNumber: appointment.taxIdNumber ?? null,
                nationalIdNumber: appointment.nationalIdNumber ?? null,
                // Falls back to the pharmacy captured on this booking when the
                // profile has none — the doctor sees a value either way, and
                // saving promotes it onto the profile for the next visit.
                preferredPharmacy:
                  appointment.preferredPharmacy ?? appointment.pharmacy ?? null,
              }}
              copy={copy.ptFields}
            />
          ) : null}
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
      {/* Addresses are long enough to overflow the narrow rail — wrap rather
          than push the label off the row. */}
      <dd className="text-right break-words text-[var(--portal-text)]">{value}</dd>
    </div>
  );
}
