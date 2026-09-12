"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { Check, Pencil, Plus, X } from "lucide-react";
import {
  fiscalCountryOptions,
  fiscalLabelForCountry,
  normalizeFiscalCountry,
  type CountryTaxIdEntry,
} from "@/lib/patient/country-tax-ids";

export type CountryFiscalNumbersCopy = {
  title: string;
  /** Shown when the patient has no fiscal number on any country. */
  empty: string;
  /** Names the country whose document is being produced right now. */
  usedForThisDocument: string;
  /** Warning on the document country's row when it is still blank. */
  missingForThisDocument: string;
  addAnother: string;
  country: string;
  number: string;
  add: string;
  edit: string;
  save: string;
  cancel: string;
  remove: string;
  saveFailed: string;
};

export const DEFAULT_COUNTRY_FISCAL_COPY: CountryFiscalNumbersCopy = {
  title: "Fiscal numbers by country",
  empty: "No fiscal number on file for any country.",
  usedForThisDocument: "Used on documents issued here",
  missingForThisDocument: "Not on file — documents issued here will show no fiscal number.",
  addAnother: "Add a country",
  country: "Country",
  number: "Fiscal number",
  add: "Add",
  edit: "Edit",
  save: "Save",
  cancel: "Cancel",
  remove: "Remove",
  saveFailed: "Could not save. Try again.",
};

/**
 * The per-country fiscal numbers a patient holds, and the editor for them.
 *
 * A patient consulting in two countries has two of these numbers — an Irish PPS
 * and a Portuguese NIF, a Portuguese NIF and a Brazilian CPF — and the document
 * issued in each country must carry the one valid THERE. The single
 * `PatientProfile.taxIdNumber` column cannot express that, so these live in
 * their own table and this component is the one editor for it, mounted in all
 * three portals: the doctor's appointment rail (where the number for the
 * country being prescribed into is the one that matters), the admin patient
 * record, and the patient's own profile. Every mount writes the same rows, so a
 * number a doctor adds mid-consult appears on the patient's profile and in the
 * admin record immediately.
 *
 * `endpointBase` is the portal's own guarded route — each backend endpoint
 * authorizes and audit-logs for its own actor, which is why there is no shared
 * one.
 *
 * `highlightCountry` is the country whose document is about to be generated.
 * Its row is always rendered, even with nothing on file, because a blank there
 * is the thing the doctor needs to see and can fix in place.
 */
export function CountryFiscalNumbers({
  endpointBase,
  initial,
  highlightCountry = null,
  readOnly = false,
  copy = DEFAULT_COUNTRY_FISCAL_COPY,
}: {
  /** No trailing slash, e.g. `/api/doctor/patients/a%40b.com/country-tax-ids`. */
  endpointBase: string;
  initial: readonly CountryTaxIdEntry[];
  highlightCountry?: string | null;
  readOnly?: boolean;
  copy?: CountryFiscalNumbersCopy;
}) {
  const [entries, setEntries] = useState<CountryTaxIdEntry[]>(() => [...initial]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [addCountry, setAddCountry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const highlight = normalizeFiscalCountry(highlightCountry);

  // The document country always gets a row, even when empty — that blank is the
  // actionable state, not an absence worth hiding.
  const rows = useMemo(() => {
    const list = [...entries].sort((a, b) => a.countryCode.localeCompare(b.countryCode));
    if (highlight && !list.some((e) => e.countryCode === highlight)) {
      list.unshift({ countryCode: highlight, taxIdNumber: "" });
    }
    return list;
  }, [entries, highlight]);

  const options = useMemo(
    () => fiscalCountryOptions(entries.map((e) => e.countryCode)),
    [entries],
  );
  const addable = options.filter(
    (option) => !entries.some((e) => e.countryCode === option.code),
  );

  function apply(next: CountryTaxIdEntry[]) {
    setEntries(next);
    setEditing(null);
    setAdding(false);
    setAddCountry("");
    setDraft("");
  }

  function save(countryCode: string, value: string) {
    const next = value.trim();
    setError(null);
    startTransition(async () => {
      const res = await fetch(`${endpointBase}/${encodeURIComponent(countryCode)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        // An empty value is the documented way to clear the row — the backend
        // deletes it rather than storing a blank.
        body: JSON.stringify({ taxIdNumber: next === "" ? null : next }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        data?: { countryTaxIds?: CountryTaxIdEntry[] };
        countryTaxIds?: CountryTaxIdEntry[];
      };
      if (!res.ok || json.ok === false) {
        setError(json.message ?? copy.saveFailed);
        return;
      }
      // The endpoint answers with the whole resulting set, so the UI never has
      // to guess what the write left behind.
      const returned = json.data?.countryTaxIds ?? json.countryTaxIds;
      if (returned) {
        apply(returned);
        return;
      }
      apply(
        next === ""
          ? entries.filter((e) => e.countryCode !== countryCode)
          : [
              ...entries.filter((e) => e.countryCode !== countryCode),
              { countryCode, taxIdNumber: next },
            ],
      );
    });
  }

  return (
    <section className="mt-4 rounded-md border border-[var(--portal-line)] bg-[var(--portal-well)] p-3">
      <h3 className="text-portal-thead font-bold uppercase tracking-[0.12em] text-[var(--portal-muted)]">
        {copy.title}
      </h3>

      <dl className="mt-2 grid gap-1.5 text-portal-compact">
        {rows.length === 0 ? (
          <p className="text-portal-meta text-[var(--portal-muted)]">{copy.empty}</p>
        ) : null}
        {rows.map((entry) => (
          <FiscalRow
            key={entry.countryCode}
            entry={entry}
            isDocumentCountry={entry.countryCode === highlight}
            editing={editing === entry.countryCode}
            pending={pending}
            draft={draft}
            error={editing === entry.countryCode ? error : null}
            readOnly={readOnly}
            copy={copy}
            onOpen={() => {
              setError(null);
              setDraft(entry.taxIdNumber);
              setAdding(false);
              setEditing(entry.countryCode);
            }}
            onDraftChange={setDraft}
            onSave={() => save(entry.countryCode, draft)}
            onCancel={() => {
              setEditing(null);
              setError(null);
            }}
          />
        ))}
      </dl>

      {readOnly || addable.length === 0 ? null : adding ? (
        <AddRow
          options={addable}
          country={addCountry}
          draft={draft}
          pending={pending}
          error={editing === null ? error : null}
          copy={copy}
          onCountryChange={setAddCountry}
          onDraftChange={setDraft}
          onSave={() => {
            if (!addCountry || !draft.trim()) return;
            save(addCountry, draft);
          }}
          onCancel={() => {
            setAdding(false);
            setAddCountry("");
            setDraft("");
            setError(null);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setEditing(null);
            setDraft("");
            setAddCountry(addable[0]?.code ?? "");
            setAdding(true);
          }}
          className="mt-2 inline-flex min-h-[44px] items-center gap-1 py-1 font-semibold text-[var(--portal-primary)] hover:underline"
        >
          <Plus className="size-3.5" aria-hidden /> {copy.addAnother}
        </button>
      )}
    </section>
  );
}

function FiscalRow({
  entry,
  isDocumentCountry,
  editing,
  pending,
  draft,
  error,
  readOnly,
  copy,
  onOpen,
  onDraftChange,
  onSave,
  onCancel,
}: {
  entry: CountryTaxIdEntry;
  isDocumentCountry: boolean;
  editing: boolean;
  pending: boolean;
  draft: string;
  error: string | null;
  readOnly: boolean;
  copy: CountryFiscalNumbersCopy;
  onOpen: () => void;
  onDraftChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const inputId = useId();
  // "NIF (PT)" — the local word for the number plus the country it belongs to.
  // The country code is not decoration: two rows can otherwise read "Tax ID"
  // and "Tax ID" in markets with no local term.
  const label = `${fiscalLabelForCountry(entry.countryCode)} (${entry.countryCode})`;

  if (editing) {
    return (
      <div className="border-b border-[var(--portal-line)]/60 py-1.5 last:border-0">
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
              maxLength={64}
              disabled={pending}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={(e) => {
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
          {/* Clearing the field is the remove gesture — said plainly so nobody
              hunts for a delete button that does not exist. */}
          <p className="mt-1 text-portal-meta text-[var(--portal-muted)]">{copy.remove}</p>
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
    <div className="border-b border-[var(--portal-line)]/60 py-1 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <dt className="shrink-0 text-portal-thead font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]">
          {label}
        </dt>
        <dd className="flex min-w-0 flex-1 items-center justify-end gap-1 text-right">
          {entry.taxIdNumber ? (
            <span className="min-w-0 [overflow-wrap:anywhere] text-[var(--portal-text)]">
              {entry.taxIdNumber}
            </span>
          ) : null}
          {readOnly ? (
            entry.taxIdNumber ? null : (
              <span className="text-[var(--portal-muted)]">—</span>
            )
          ) : (
            <button
              type="button"
              onClick={onOpen}
              aria-label={`${entry.taxIdNumber ? copy.edit : copy.add} — ${label}`}
              title={entry.taxIdNumber ? copy.edit : copy.add}
              className={
                entry.taxIdNumber
                  ? "-my-2 inline-flex min-h-[44px] shrink-0 items-center justify-center px-1.5 py-2 text-[var(--portal-muted)] hover:text-[var(--portal-primary)]"
                  : "-my-2 inline-flex min-h-[44px] shrink-0 items-center gap-1 py-2 font-semibold text-[var(--portal-primary)] hover:underline"
              }
            >
              {entry.taxIdNumber ? (
                <Pencil className="size-3.5" aria-hidden />
              ) : (
                <>
                  <Plus className="size-3.5" aria-hidden /> {copy.add}
                </>
              )}
            </button>
          )}
        </dd>
      </div>
      {isDocumentCountry ? (
        <p
          className={
            entry.taxIdNumber
              ? "text-portal-meta text-[var(--portal-muted)]"
              : "text-portal-meta text-[var(--portal-danger-text)]"
          }
        >
          {entry.taxIdNumber ? copy.usedForThisDocument : copy.missingForThisDocument}
        </p>
      ) : null}
    </div>
  );
}

function AddRow({
  options,
  country,
  draft,
  pending,
  error,
  copy,
  onCountryChange,
  onDraftChange,
  onSave,
  onCancel,
}: {
  options: { code: string; name: string; label: string }[];
  country: string;
  draft: string;
  pending: boolean;
  error: string | null;
  copy: CountryFiscalNumbersCopy;
  onCountryChange: (v: string) => void;
  onDraftChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const selectId = useId();
  const inputId = useId();
  return (
    <div className="mt-2 space-y-1.5 border-t border-[var(--portal-line)]/60 pt-2">
      <label htmlFor={selectId} className="sr-only">
        {copy.country}
      </label>
      <select
        id={selectId}
        value={country}
        disabled={pending}
        onChange={(e) => onCountryChange(e.target.value)}
        className="gh-input w-full"
      >
        {options.map((option) => (
          <option key={option.code} value={option.code}>
            {option.name} — {option.label}
          </option>
        ))}
      </select>
      <label htmlFor={inputId} className="sr-only">
        {copy.number}
      </label>
      <div className="flex items-center gap-1.5">
        <input
          id={inputId}
          value={draft}
          maxLength={64}
          disabled={pending}
          placeholder={
            options.find((o) => o.code === country)?.label ?? copy.number
          }
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
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
        <IconButton
          onClick={onSave}
          disabled={pending || !country || !draft.trim()}
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
        <p role="alert" className="text-portal-meta text-[var(--portal-danger-text)]">
          {error}
        </p>
      ) : null}
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
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-card-sm)] border border-[var(--portal-line)] bg-[var(--portal-surface)] text-[var(--portal-text)] transition-colors hover:border-[var(--portal-primary)] hover:text-[var(--portal-primary)] disabled:opacity-50"
    >
      {icon}
    </button>
  );
}
