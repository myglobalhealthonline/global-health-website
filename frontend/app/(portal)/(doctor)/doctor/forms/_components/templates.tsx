"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Trash2 } from "lucide-react";
import type { FormFieldDef, FormTemplateDto } from "@/lib/api/doctor-api";
import { formatAppDateTimeShort } from "@/lib/format-datetime";
import { AdminEmptyState, Btn } from "@/components/portal-atoms";
import { FormSection } from "@/components/FormSection";
import { PortalDialog } from "@/components/PortalDialog";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";

/**
 * Form templates manager. Tiny inline builder — title + description +
 * a list of fields. Each field has key/label/type/required. Choice
 * fields expose an "options" textarea (one per line).
 *
 * Templates with `ownedBySelf=false` are shared / admin-managed and
 * appear read-only in the list; we surface a "Use" hint on those rows
 * (they're picked from the appointment workspace, not here).
 */
const FIELD_TYPES: FormFieldDef["type"][] = [
  "text",
  "longtext",
  "choice",
  "number",
  "date",
];

/** Mirrors the API's per-field caps in `backend/src/routes/forms.route.ts`. */
const KEY_MAX_LENGTH = 64;
const FIELDS_MAX_COUNT = 50;

type DraftField = {
  key: string;
  label: string;
  type: FormFieldDef["type"];
  required: boolean;
  optionsText: string;
  helper: string;
};

function emptyField(): DraftField {
  return { key: "", label: "", type: "text", required: false, optionsText: "", helper: "" };
}

// Type-only import (erased at build time) — no runtime locale-loading code
// ships to the client bundle; the component only receives plain strings via props.
// ponytail: cs/de/ro doctor.json are partial locale stubs (missing many keys), so the
// exact per-locale union type doesn't structurally match; loosen to Record<string, string>.
type FormsStrings = { [key: string]: string };

type ApiErrorBody = {
  ok?: boolean;
  message?: string;
  details?: {
    formErrors?: string[];
    fieldErrors?: Record<string, string[]>;
  };
};

/**
 * The API answers a rejected payload with a bare headline ("Invalid template")
 * plus a zod `flatten()` in `details`. Showing only the headline left the
 * doctor staring at an error with nothing to act on, so fold the per-field
 * messages into the banner.
 */
function describeApiError(json: ApiErrorBody, fallback: string): string {
  const headline = json.message ?? fallback;
  const detail = [
    ...(json.details?.formErrors ?? []),
    ...Object.values(json.details?.fieldErrors ?? {}).flat(),
  ].filter(Boolean);
  return detail.length > 0 ? `${headline}: ${detail.join("; ")}` : headline;
}

export function FormTemplatesClient({
  initial,
  strings,
}: {
  initial: FormTemplateDto[];
  strings: FormsStrings;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<DraftField[]>([emptyField()]);

  // Draft always starts blank (see emptyField()), so "dirty" is just "does
  // the draft still equal that blank starting point" — no separate baseline
  // needed. Auto-clears on submit success (state resets to blank there).
  const isDraftFieldDirty = (f: DraftField) =>
    f.key !== "" ||
    f.label !== "" ||
    f.type !== "text" ||
    f.required ||
    f.optionsText !== "" ||
    f.helper !== "";
  const draftDirty =
    title.trim() !== "" ||
    description.trim() !== "" ||
    fields.length > 1 ||
    fields.some(isDraftFieldDirty);
  useUnsavedChanges(draftDirty);

  function resetDraft() {
    setError(null);
    setTitle("");
    setDescription("");
    setFields([emptyField()]);
  }

  /** Dialog close (X / Escape / backdrop) — confirm before discarding a dirty draft. */
  function closeDialog() {
    if (draftDirty && !confirm(strings.discardConfirm)) return;
    resetDraft();
    setDialogOpen(false);
  }

  function updateField(index: number, patch: Partial<DraftField>) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function addField() {
    setFields((prev) =>
      prev.length >= FIELDS_MAX_COUNT ? prev : [...prev, emptyField()],
    );
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  /**
   * `key` is never typed by hand — the builder slugifies it from the label,
   * which this dialog lets run to 200 chars while the API caps keys at 64.
   * A question-style label ("Declaro que li, compreendi e concordo com todos
   * os itens acima…") overflowed that cap and the whole POST came back
   * "Invalid template", with no field the doctor could edit to fix it. Clamp
   * to the API limit here, and de-duplicate so two labels that truncate to
   * the same slug don't silently share one answer key.
   */
  function serialiseFields(): FormFieldDef[] {
    const used = new Set<string>();
    return fields
      .filter((f) => f.label.trim() !== "")
      .map((f, index) => {
        const slug =
          f.key.trim() || f.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
        const base =
          slug.slice(0, KEY_MAX_LENGTH).replace(/^_+|_+$/g, "") || `field_${index + 1}`;
        let key = base;
        for (let n = 2; used.has(key); n += 1) {
          const suffix = `_${n}`;
          key = `${base.slice(0, KEY_MAX_LENGTH - suffix.length)}${suffix}`;
        }
        used.add(key);
        const opts =
          f.type === "choice"
            ? f.optionsText
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean)
            : undefined;
        return {
          key,
          label: f.label.trim(),
          type: f.type,
          required: f.required,
          ...(opts && opts.length > 0 ? { options: opts } : {}),
          ...(f.helper.trim() ? { helper: f.helper.trim() } : {}),
        };
      });
  }

  function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const payloadFields = serialiseFields();
    if (title.trim() === "") {
      setError(strings.titleRequired);
      return;
    }
    if (payloadFields.length === 0) {
      setError(strings.fieldRequired);
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/doctor/form-templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          fields: payloadFields,
        }),
      });
      const json = (await res.json()) as ApiErrorBody & {
        data?: { template?: FormTemplateDto };
      };
      if (!res.ok || !json.ok) {
        setError(describeApiError(json, strings.saveFailed));
        return;
      }
      if (json.data?.template) {
        setItems((prev) => [
          { ...json.data!.template!, ownedBySelf: true } as FormTemplateDto,
          ...prev,
        ]);
      }
      resetDraft();
      setDialogOpen(false);
      router.refresh();
    });
  }

  function remove(id: string, title: string) {
    if (!confirm(strings.deleteConfirm.replace("{title}", title))) return;
    startTransition(async () => {
      const res = await fetch(`/api/doctor/form-templates/${id}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as ApiErrorBody;
      if (!res.ok || !json.ok) {
        setError(describeApiError(json, strings.deleteFailed));
        return;
      }
      setItems((prev) => prev.filter((t) => t.id !== id));
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4">
      <FormSection
        title={strings.yourTemplates}
        className="gh-doctor-template-list"
        right={
          <Btn
            variant="primary"
            size="sm"
            iconLeft={<Plus className="size-3.5" aria-hidden />}
            onClick={() => setDialogOpen(true)}
          >
            {strings.newTemplate}
          </Btn>
        }
      >
        <div className="gh-form-section__span-2">
        {items.length === 0 ? (
          <AdminEmptyState
            className="gh-doctor-empty-state mt-4"
            icon={<FileText className="size-5" aria-hidden />}
            assetSrc="/images/portal/obsidian/empty-documents.svg"
            title={strings.emptyTitle}
            description={strings.emptyDesc}
          />
        ) : (
          <ul className="gh-doctor-template-items mt-4 grid gap-3">
            {items.map((t) => (
              <li
                key={t.id}
                className="gh-doctor-template-row rounded-md border border-[var(--portal-line)] bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-portal-body font-semibold text-[var(--portal-text)]">
                      {t.title}
                      {t.ownedBySelf ? null : (
                        <span className="ml-2 rounded-full bg-[var(--portal-well)] px-2 py-0.5 text-portal-micro font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]">
                          {strings.sharedBadge}
                        </span>
                      )}
                    </p>
                    {t.description ? (
                      <p className="text-portal-label text-[var(--portal-muted)]">
                        {t.description}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[11.5px] text-[var(--portal-muted)]">
                      {strings.fieldsUpdated
                        .replace("{count}", String(t.fields.length))
                        .replace("{date}", formatAppDateTimeShort(t.updatedAt))}
                    </p>
                  </div>
                  {t.ownedBySelf ? (
                    <button
                      type="button"
                      onClick={() => remove(t.id, t.title)}
                      className="inline-flex items-center gap-1 text-portal-meta font-semibold text-[var(--portal-muted)] hover:text-[var(--portal-danger)]"
                      aria-label={strings.deleteTemplateAria}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        </div>
      </FormSection>

      <PortalDialog
        open={dialogOpen}
        onClose={closeDialog}
        title={strings.newTemplate}
        width="lg"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeDialog} className="gh-btn gh-btn-secondary">
              {strings.cancel}
            </button>
            <button
              type="submit"
              form="doctor-new-template-form"
              disabled={pending}
              className="gh-btn gh-btn-primary"
            >
              {pending ? strings.saving : strings.createTemplate}
            </button>
          </div>
        }
      >
        <p className="mb-3 text-portal-label text-[var(--portal-muted)]">
          {strings.newTemplateDesc}
        </p>
        <form
          id="doctor-new-template-form"
          onSubmit={create}
          className="gh-doctor-template-form"
          noValidate
        >
        <div className="grid gap-3">
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">{strings.titleField}</span>
            <input
              className="gh-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">{strings.descriptionField}</span>
            <textarea
              className="gh-input min-h-[3.5rem] resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
            />
          </label>

          {fields.map((f, i) => (
            <div
              key={i}
              className="gh-doctor-template-field rounded-md border border-[var(--portal-line)] p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-portal-thead font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]">
                  {strings.fieldN.replace("{n}", String(i + 1))}
                </p>
                {fields.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeField(i)}
                    className="text-portal-thead font-semibold text-[var(--portal-muted)] hover:text-[var(--portal-danger)]"
                  >
                    {strings.removeField}
                  </button>
                ) : null}
              </div>
              <div className="mt-2 grid gap-2">
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">{strings.labelField}</span>
                  <input
                    className="gh-input"
                    value={f.label}
                    onChange={(e) => updateField(i, { label: e.target.value })}
                    maxLength={200}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">{strings.typeField}</span>
                  <select
                    className="gh-select"
                    value={f.type}
                    onChange={(e) =>
                      updateField(i, { type: e.target.value as FormFieldDef["type"] })
                    }
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                {f.type === "choice" ? (
                  <label className="flex flex-col gap-1">
                    <span className="gh-field-label">{strings.optionsField}</span>
                    <textarea
                      className="gh-input min-h-[3.5rem] resize-y"
                      value={f.optionsText}
                      onChange={(e) => updateField(i, { optionsText: e.target.value })}
                    />
                  </label>
                ) : null}
                <label className="flex items-center gap-2 text-portal-compact">
                  <input
                    type="checkbox"
                    checked={f.required}
                    onChange={(e) => updateField(i, { required: e.target.checked })}
                    className="size-4"
                  />
                  {strings.requiredField}
                </label>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addField}
            disabled={fields.length >= FIELDS_MAX_COUNT}
            className="inline-flex items-center gap-1 self-start text-portal-compact font-semibold text-[var(--portal-primary)] hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:no-underline"
          >
            <Plus className="size-3.5" /> {strings.addField}
          </button>

          {error ? (
            <p className="gh-status-warning rounded-md border px-3 py-2 text-portal-label">
              {error}
            </p>
          ) : null}
        </div>
        </form>
      </PortalDialog>
    </div>
  );
}
