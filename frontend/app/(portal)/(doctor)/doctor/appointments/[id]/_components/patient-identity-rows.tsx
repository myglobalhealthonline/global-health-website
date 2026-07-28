"use client";

import { useId, useRef, useState, useTransition } from "react";
import { Check, Pencil, Plus, X } from "lucide-react";

export type PatientIdentityFieldsCopy = {
  utente: string;
  /** Portugal's NIF. */
  nif: string;
  /** Brazil's CPF. Same column as `nif` — only the market label differs. */
  cpf: string;
  idCard: string;
  pharmacy: string;
  add: string;
  edit: string;
  save: string;
  cancel: string;
  saveFailed: string;
};

/** The PatientProfile columns this card writes. Keys match the PATCH body of
 *  /api/doctor/patients/:email/profile one-for-one, and the `identityFields`
 *  list the consultation endpoint returns for the appointment's market. */
export type PatientIdentityFieldKey =
  | "utenteNumber"
  | "taxIdNumber"
  | "nationalIdNumber"
  | "preferredPharmacy";

type Values = Record<PatientIdentityFieldKey, string | null>;

const MAX_LENGTHS: Record<PatientIdentityFieldKey, number> = {
  utenteNumber: 64,
  taxIdNumber: 64,
  nationalIdNumber: 64,
  preferredPharmacy: 200,
};

/**
 * Editable identity + pharmacy rows for the patient-context card, for whichever
 * fields the appointment's market discloses.
 *
 * The booking form does not always capture what a consultation needs. In PT
 * that is the Número de Utente (SNS number for electronic prescription), the
 * NIF and Cartão de Cidadão that `buildPatientIdLine` prints on
 * prescriptions/certificates, and the pharmacy the script is sent to; in BR it
 * is the CPF, which the same helper already prints on Brazilian documents.
 * When the patient left one blank the doctor can fill it inline mid-consult
 * instead of leaving the workspace for the patient chart.
 *
 * `fields` comes from the backend rather than being derived here, so the values
 * that were disclosed and the rows offered for editing cannot drift apart.
 *
 * Writes go to the existing doctor profile PATCH, which already validates,
 * authorizes (MedicalAccessLog `UPDATED`) and PHI-encrypts these columns. It
 * strips the ID numbers back out of its response by design, so the saved
 * draft — not the response — is what this component renders afterwards.
 */
export function PatientIdentityRows({
  email,
  fields,
  labels,
  initial,
  copy,
}: {
  email: string;
  fields: readonly PatientIdentityFieldKey[];
  /** Per-market label for each field — PT calls `taxIdNumber` NIF, BR CPF. */
  labels: Partial<Record<PatientIdentityFieldKey, string>>;
  initial: Values;
  copy: PatientIdentityFieldsCopy;
}) {
  const [values, setValues] = useState<Values>(initial);
  const [editing, setEditing] = useState<PatientIdentityFieldKey | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Focus returns to the trigger on cancel/save so keyboard users are not
  // dropped back at the top of the rail.
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  function open(field: PatientIdentityFieldKey, trigger: HTMLButtonElement | null) {
    triggerRef.current = trigger;
    setError(null);
    setDraft(values[field] ?? "");
    setEditing(field);
  }

  function close() {
    setEditing(null);
    setError(null);
    triggerRef.current?.focus();
  }

  function save(field: PatientIdentityFieldKey) {
    const next = draft.trim() === "" ? null : draft.trim();
    if (next === (values[field] ?? null)) {
      close();
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch(
        `/api/doctor/patients/${encodeURIComponent(email)}/profile`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ [field]: next }),
        },
      );
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.message ?? copy.saveFailed);
        return;
      }
      setValues((prev) => ({ ...prev, [field]: next }));
      close();
    });
  }

  return (
    <>
      {fields.map((field) => (
        <EditableRow
          key={field}
          label={labels[field] ?? field}
          value={values[field]}
          maxLength={MAX_LENGTHS[field]}
          editing={editing === field}
          pending={pending}
          draft={draft}
          error={editing === field ? error : null}
          copy={copy}
          onOpen={(trigger) => open(field, trigger)}
          onDraftChange={setDraft}
          onSave={() => save(field)}
          onCancel={close}
        />
      ))}
    </>
  );
}

function EditableRow({
  label,
  value,
  maxLength,
  editing,
  pending,
  draft,
  error,
  copy,
  onOpen,
  onDraftChange,
  onSave,
  onCancel,
}: {
  label: string;
  value: string | null;
  maxLength: number;
  editing: boolean;
  pending: boolean;
  draft: string;
  error: string | null;
  copy: PatientIdentityFieldsCopy;
  onOpen: (trigger: HTMLButtonElement | null) => void;
  onDraftChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const inputId = useId();

  if (editing) {
    return (
      <div className="border-b border-[var(--portal-line)]/60 py-1.5">
        <dt>
          <label
            htmlFor={inputId}
            className="text-portal-thead font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]"
          >
            {label}
          </label>
        </dt>
        <dd className="mt-1">
          <div className="flex items-center gap-1.5">
            <input
              id={inputId}
              autoFocus
              value={draft}
              maxLength={maxLength}
              disabled={pending}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={(e) => {
                // Enter/Escape are the expected exits for a one-field inline
                // editor; this row is not inside a <form>, so handle both here.
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSave();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  onCancel();
                }
              }}
              className="gh-input min-w-0 flex-1"
            />
            {/* Not `.gh-btn` — that primitive is 52px tall with 28px of side
                padding, which dwarfs a 320px rail. Plain utilities keep these
                square against the input. */}
            <IconButton
              onClick={onSave}
              disabled={pending}
              label={copy.save}
              icon={<Check className="size-4" aria-hidden />}
            />
            <IconButton
              onClick={onCancel}
              disabled={pending}
              label={copy.cancel}
              icon={<X className="size-4" aria-hidden />}
            />
          </div>
          {error ? (
            <p role="alert" className="mt-1 text-portal-meta text-[var(--portal-danger-text)]">
              {error}
            </p>
          ) : null}
        </dd>
      </div>
    );
  }

  // `items-center`, not the sibling rows' `items-baseline`: these rows carry a
  // 44px tap target, and baseline alignment would drop the label to sit on the
  // button's text line. The negative vertical margin keeps that target from
  // making the row visibly taller than the read-only rows above it.
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--portal-line)]/60 py-1">
      <dt className="text-portal-thead font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]">
        {label}
      </dt>
      <dd className="flex min-w-0 items-center justify-end gap-1 text-right">
        {value ? (
          <>
            <span className="break-words text-[var(--portal-text)]">{value}</span>
            <button
              type="button"
              onClick={(e) => onOpen(e.currentTarget)}
              aria-label={`${copy.edit} — ${label}`}
              title={copy.edit}
              className="-my-2 inline-flex min-h-[44px] shrink-0 items-center justify-center px-1.5 py-2 text-[var(--portal-muted)] hover:text-[var(--portal-primary)]"
            >
              <Pencil className="size-3.5" aria-hidden />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={(e) => onOpen(e.currentTarget)}
            className="-my-2 inline-flex min-h-[44px] shrink-0 items-center gap-1 py-2 font-semibold text-[var(--portal-primary)] hover:underline"
          >
            <Plus className="size-3.5" aria-hidden /> {copy.add}
          </button>
        )}
      </dd>
    </div>
  );
}

function IconButton({
  onClick,
  disabled,
  label,
  icon,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-card-sm)] border border-[var(--portal-line)] bg-[var(--portal-well)] text-[var(--portal-text)] transition-colors hover:border-[var(--portal-primary)] hover:text-[var(--portal-primary)] disabled:opacity-50"
    >
      {icon}
    </button>
  );
}
