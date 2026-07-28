"use client";

import { useId, useRef, useState, useTransition } from "react";
import { Check, Pencil, Plus, X } from "lucide-react";

export type PatientIdentityFieldsCopy = {
  utente: string;
  /** Portugal's NIF. */
  nif: string;
  /** Brazil's CPF. Same column as `nif` — only the market label differs. */
  cpf: string;
  /** Every other market's label for the same column. */
  taxId: string;
  /** Portugal's Cartão de Cidadão. */
  idCard: string;
  /** Every other market's label for the same column. */
  nationalId: string;
  passport: string;
  pharmacy: string;
  dateOfBirth: string;
  address: string;
  addressLine1: string;
  addressLine2: string;
  addressCity: string;
  addressState: string;
  addressPostalCode: string;
  add: string;
  edit: string;
  save: string;
  cancel: string;
  saveFailed: string;
};

/** The PatientProfile columns this card writes. Keys match the PATCH body of
 *  /api/doctor/patients/:email/profile one-for-one, and the `identityFields`
 *  list the consultation endpoint returns. */
export type PatientIdentityFieldKey =
  | "utenteNumber"
  | "taxIdNumber"
  | "nationalIdNumber"
  | "passportNumber"
  | "preferredPharmacy";

type Values = Record<PatientIdentityFieldKey, string | null>;

const MAX_LENGTHS: Record<PatientIdentityFieldKey, number> = {
  utenteNumber: 64,
  taxIdNumber: 64,
  nationalIdNumber: 64,
  passportNumber: 64,
  preferredPharmacy: 200,
};

/**
 * PATCH one or more profile columns. Shared by every editor here so they agree
 * on error handling.
 *
 * The endpoint already validates, authorizes (MedicalAccessLog `UPDATED`) and
 * PHI-encrypts these columns, and strips the ID numbers back out of its
 * response by design — so the saved draft, not the response, is what the
 * caller renders afterwards.
 */
async function patchProfile(
  email: string,
  body: Record<string, string | null>,
): Promise<{ ok: true } | { ok: false; message?: string }> {
  const res = await fetch(`/api/doctor/patients/${encodeURIComponent(email)}/profile`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    message?: string;
  };
  if (!res.ok || !json.ok) return { ok: false, message: json.message };
  return { ok: true };
}

/**
 * Editable identity + pharmacy rows for the patient-context card.
 *
 * The booking form does not always capture what a consultation needs — the
 * Número de Utente that reaches PT national records, the NIF/CPF and national
 * ID that `buildPatientIdLine` prints on prescriptions and certificates, the
 * pharmacy a script is sent to. When the patient left one blank the doctor
 * fills it inline mid-consult instead of leaving the workspace.
 *
 * `fields` comes from the backend rather than being derived here, so the values
 * that were disclosed and the rows offered for editing cannot drift apart.
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
      const res = await patchProfile(email, { [field]: next });
      if (!res.ok) {
        setError(res.message ?? copy.saveFailed);
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

/**
 * Editable date of birth.
 *
 * Reads and writes the PROFILE's DOB, not the appointment's booking-time
 * snapshot — writing one and displaying the other would make a successful save
 * look like it reverted on the next load. The backend sends the profile value
 * as `profileDateOfBirth` for exactly this reason.
 */
export function PatientDateOfBirthRow({
  email,
  value,
  copy,
}: {
  email: string;
  /** ISO datetime, or null when the patient never gave one. */
  value: string | null;
  copy: PatientIdentityFieldsCopy;
}) {
  const inputId = useId();
  // `<input type="date">` speaks YYYY-MM-DD; the column is a DateTime.
  const toInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
  const [stored, setStored] = useState<string | null>(value);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // A DOB in the future is always a typo, and the column feeds age-based
  // clinical decisions, so the picker refuses one outright.
  const today = new Date().toISOString().slice(0, 10);

  function open(trigger: HTMLButtonElement | null) {
    triggerRef.current = trigger;
    setError(null);
    setDraft(toInput(stored));
    setEditing(true);
  }

  function close() {
    setEditing(false);
    setError(null);
    triggerRef.current?.focus();
  }

  function save() {
    const day = draft.trim();
    if (day === toInput(stored)) {
      close();
      return;
    }
    // Midnight UTC: the schema wants a full ISO datetime, and a DOB carries no
    // meaningful time-of-day, so pinning it avoids a timezone shifting the day.
    const next = day === "" ? null : `${day}T00:00:00.000Z`;
    setError(null);
    startTransition(async () => {
      const res = await patchProfile(email, { dateOfBirth: next });
      if (!res.ok) {
        setError(res.message ?? copy.saveFailed);
        return;
      }
      setStored(next);
      close();
    });
  }

  if (editing) {
    return (
      <div className="border-b border-[var(--portal-line)]/60 py-1.5">
        <dt>
          <label
            htmlFor={inputId}
            className="text-portal-thead font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]"
          >
            {copy.dateOfBirth}
          </label>
        </dt>
        <dd className="mt-1">
          <div className="flex items-center gap-1.5">
            <input
              id={inputId}
              type="date"
              autoFocus
              value={draft}
              max={today}
              disabled={pending}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  save();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  close();
                }
              }}
              className="gh-input min-w-0 flex-1"
            />
            <IconButton
              onClick={save}
              disabled={pending}
              label={copy.save}
              icon={<Check className="size-4" aria-hidden />}
            />
            <IconButton
              onClick={close}
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

  return (
    <ReadRow
      label={copy.dateOfBirth}
      // Rendered from the ISO day, not `toLocaleDateString`, so a server render
      // and the browser can't disagree on the format and hydrate mismatched.
      value={stored ? toInput(stored) : null}
      copy={copy}
      onOpen={open}
    />
  );
}

/** The address columns, edited together. */
export type PatientAddressValues = {
  addressLine1: string | null;
  addressLine2: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressPostalCode: string | null;
};

const ADDRESS_MAX_LENGTHS: Record<keyof PatientAddressValues, number> = {
  addressLine1: 200,
  addressLine2: 200,
  addressCity: 120,
  addressState: 120,
  addressPostalCode: 32,
};

/**
 * Address as one grouped editor rather than five separate rows.
 *
 * Five inline rows would triple the height of a 320px rail and read as five
 * unrelated facts; an address is one fact. Opening it swaps the summary line
 * for the parts, and saving PATCHes them in a single request so the address can
 * never be left half-written.
 */
export function PatientAddressRow({
  email,
  initial,
  /** Brazil is the only market that collects a state/UF — see
   *  booking-address-copy.ts. Elsewhere the input is offered only when a value
   *  is already on file, so it can be corrected but not invented. */
  showState,
  formatted,
  copy,
}: {
  email: string;
  initial: PatientAddressValues;
  showState: boolean;
  /** The read-only summary line, formatted by the panel. */
  formatted: string | null;
  copy: PatientIdentityFieldsCopy;
}) {
  const [stored, setStored] = useState<PatientAddressValues>(initial);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PatientAddressValues>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const groupId = useId();

  const parts: Array<{ key: keyof PatientAddressValues; label: string }> = [
    { key: "addressLine1", label: copy.addressLine1 },
    { key: "addressLine2", label: copy.addressLine2 },
    { key: "addressCity", label: copy.addressCity },
    ...(showState || stored.addressState
      ? [{ key: "addressState" as const, label: copy.addressState }]
      : []),
    { key: "addressPostalCode", label: copy.addressPostalCode },
  ];

  function open(trigger: HTMLButtonElement | null) {
    triggerRef.current = trigger;
    setError(null);
    setDraft(stored);
    setEditing(true);
  }

  function close() {
    setEditing(false);
    setError(null);
    triggerRef.current?.focus();
  }

  function save() {
    const body: Record<string, string | null> = {};
    for (const { key } of parts) {
      const next = (draft[key] ?? "").trim() || null;
      if (next !== (stored[key] ?? null)) body[key] = next;
    }
    if (Object.keys(body).length === 0) {
      close();
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await patchProfile(email, body);
      if (!res.ok) {
        setError(res.message ?? copy.saveFailed);
        return;
      }
      setStored((prev) => ({ ...prev, ...(body as Partial<PatientAddressValues>) }));
      close();
    });
  }

  if (editing) {
    return (
      <div
        role="group"
        aria-labelledby={groupId}
        className="border-b border-[var(--portal-line)]/60 py-1.5"
      >
        <dt
          id={groupId}
          className="text-portal-thead font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]"
        >
          {copy.address}
        </dt>
        <dd className="mt-1 space-y-1.5">
          {parts.map(({ key, label }, i) => (
            <label key={key} className="block">
              <span className="sr-only">{label}</span>
              <input
                autoFocus={i === 0}
                value={draft[key] ?? ""}
                placeholder={label}
                maxLength={ADDRESS_MAX_LENGTHS[key]}
                disabled={pending}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, [key]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    save();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    close();
                  }
                }}
                className="gh-input w-full"
              />
            </label>
          ))}
          <div className="flex items-center justify-end gap-1.5 pt-0.5">
            <IconButton
              onClick={save}
              disabled={pending}
              label={copy.save}
              icon={<Check className="size-4" aria-hidden />}
            />
            <IconButton
              onClick={close}
              disabled={pending}
              label={copy.cancel}
              icon={<X className="size-4" aria-hidden />}
            />
          </div>
          {error ? (
            <p role="alert" className="text-portal-meta text-[var(--portal-danger-text)]">
              {error}
            </p>
          ) : null}
        </dd>
      </div>
    );
  }

  // After a save the parts are authoritative; before one, the panel's formatted
  // summary is richer (it falls back to the appointment's own snapshot).
  const summary =
    [stored.addressLine1, stored.addressLine2, stored.addressCity]
      .some((v) => v && v.trim())
      ? [
          stored.addressLine1,
          stored.addressLine2,
          [
            [stored.addressPostalCode, stored.addressCity].filter(Boolean).join(" "),
            stored.addressState,
          ]
            .filter((p) => p && p.trim())
            .join(" — "),
        ]
          .filter((p) => p && p.trim())
          .join(", ")
      : formatted;

  return <ReadRow label={copy.address} value={summary} copy={copy} onOpen={open} />;
}

/**
 * The collapsed state shared by every editor above: the value plus a pencil,
 * or an "add" affordance when it is empty.
 *
 * Presence of a value can't gate the row — the whole point is to offer the
 * affordance on a field the patient left blank.
 */
function ReadRow({
  label,
  value,
  copy,
  onOpen,
}: {
  label: string;
  value: string | null;
  copy: PatientIdentityFieldsCopy;
  onOpen: (trigger: HTMLButtonElement | null) => void;
}) {
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

  return <ReadRow label={label} value={value} copy={copy} onOpen={onOpen} />;
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
