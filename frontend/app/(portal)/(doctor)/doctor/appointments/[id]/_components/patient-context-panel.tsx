import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { FormSection } from "@/components/FormSection";
import {
  PatientAddressRow,
  PatientDateOfBirthRow,
  PatientIdentityRows,
  type PatientIdentityFieldKey,
  type PatientIdentityFieldsCopy,
} from "./patient-identity-rows";
import { IdentityVerificationCard } from "./identity-verification-card";

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
  identityFields: PatientIdentityFieldsCopy;
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
  addressState?: string | null;
  addressPostalCode?: string | null;
}): string | null {
  // Brazil's UF rides with the city — "01310-100 São Paulo — SP". Null
  // everywhere else, so the line is unchanged in the other markets.
  const cityLine = [
    [a.addressPostalCode, a.addressCity].filter(Boolean).join(" "),
    a.addressState,
  ]
    .filter((p) => Boolean(p && p.trim()))
    .join(" — ");
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
    /** Booking-time snapshot. Display fallback only — the editable row writes
     *  `profileDateOfBirth`. */
    dateOfBirth?: string | null;
    profileDateOfBirth?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    addressCity?: string | null;
    addressState?: string | null;
    addressPostalCode?: string | null;
    utenteNumber?: string | null;
    taxIdNumber?: string | null;
    nationalIdNumber?: string | null;
    passportNumber?: string | null;
    preferredPharmacy?: string | null;
    pharmacy?: string | null;
    consultationLanguageCode?: string | null;
    identityFields?: string[] | null;
    createdAt: string;
    notes?: string | null;
  };
  statusText: string;
  copy: PatientContextCopy;
}) {
  const address = formatAddress(appointment);
  // Which identity rows to offer. Presence of a value can't be the gate: the
  // whole point is to render an "add" affordance on a field the patient left
  // blank. The backend decides (see patient-identity-fields.ts) and sends the
  // list, so the rows offered here always match the values it disclosed.
  const identityFields = (appointment.identityFields ?? []) as PatientIdentityFieldKey[];
  // One column, three labels: PT's NIF is BR's CPF is everyone else's tax ID.
  // Only the wording is market-specific — the field itself is universal.
  const country = appointment.countryCode.toLowerCase();
  const isBrazil = country === "br";
  const isPortugal = country === "pt";
  const isIreland = country === "ie";
  const identityLabels: Partial<Record<PatientIdentityFieldKey, string>> = {
    utenteNumber: copy.utenteNumber,
    taxIdNumber: isBrazil
      ? copy.identityFields.cpf
      : isPortugal
        ? copy.identityFields.nif
        : copy.identityFields.taxId,
    nationalIdNumber: isPortugal
      ? copy.identityFields.idCard
      : copy.identityFields.nationalId,
    passportNumber: copy.identityFields.passport,
    preferredPharmacy: copy.identityFields.pharmacy,
  };
  return (
    <FormSection title={copy.patient}>
      <div className="gh-form-section__span-2">
        <dl className="grid gap-2 text-portal-compact">
          {appointment.globalHealthNumber ? (
            <Row label={copy.ghn} value={appointment.globalHealthNumber} />
          ) : null}
          <Row label={copy.email} value={appointment.email} />
          {/* Phone stays read-only on purpose: a verified patient's number can
              only be changed by the patient or an admin, and the doctor PATCH
              excludes it (see applyPatientProfileUpdate's actor guard). */}
          <Row label={copy.phone} value={appointment.phone ?? "—"} />
          {/* Reads and writes the PROFILE's DOB, falling back to the booking
              snapshot for display when the profile has none. */}
          <PatientDateOfBirthRow
            email={appointment.email}
            value={appointment.profileDateOfBirth ?? appointment.dateOfBirth ?? null}
            copy={copy.identityFields}
          />
          <PatientAddressRow
            email={appointment.email}
            initial={{
              addressLine1: appointment.addressLine1 ?? null,
              addressLine2: appointment.addressLine2 ?? null,
              addressCity: appointment.addressCity ?? null,
              addressState: appointment.addressState ?? null,
              addressPostalCode: appointment.addressPostalCode ?? null,
            }}
            showState={isBrazil}
            formatted={address}
            copy={copy.identityFields}
          />
          {/* Editable identity rows, every market. Each renders an "add"
              affordance when the patient left it blank at booking, so the
              doctor can fill it mid-consult rather than leaving the workspace.
              The empty-list branch is unreachable today (the backend returns
              the full set) but is kept so narrowing the policy later degrades
              to read-only rows instead of dropping values silently. */}
          {identityFields.length > 0 ? (
            <PatientIdentityRows
              email={appointment.email}
              fields={identityFields}
              labels={identityLabels}
              initial={{
                utenteNumber: appointment.utenteNumber ?? null,
                taxIdNumber: appointment.taxIdNumber ?? null,
                nationalIdNumber: appointment.nationalIdNumber ?? null,
                passportNumber: appointment.passportNumber ?? null,
                // Falls back to the pharmacy captured on this booking when the
                // profile has none — the doctor sees a value either way, and
                // saving promotes it onto the profile for the next visit.
                preferredPharmacy:
                  appointment.preferredPharmacy ?? appointment.pharmacy ?? null,
              }}
              copy={copy.identityFields}
            />
          ) : appointment.utenteNumber ? (
            <Row label={copy.utenteNumber} value={appointment.utenteNumber} />
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
        {/* Ireland only: identity verification gates whether a controlled
            prescription can claim the patient was checked. Gated here rather
            than inside the card so no other market pays for the fetch. */}
        {isIreland ? <IdentityVerificationCard email={appointment.email} /> : null}
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
