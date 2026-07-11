"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Trash2 } from "lucide-react";
import type { FormFieldDef, FormTemplateDto } from "@/lib/api/doctor-api";
import { formatAppDateTimeShort } from "@/lib/format-datetime";
import { AdminEmptyState } from "@/components/portal-atoms";
import { FormSection } from "@/components/FormSection";

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

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<DraftField[]>([emptyField()]);

  function updateField(index: number, patch: Partial<DraftField>) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function addField() {
    setFields((prev) => [...prev, emptyField()]);
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  function serialiseFields(): FormFieldDef[] {
    return fields
      .filter((f) => f.label.trim() !== "")
      .map((f) => {
        const key = f.key.trim() || f.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
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
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        data?: { template?: FormTemplateDto };
      };
      if (!res.ok || !json.ok) {
        setError(json.message ?? strings.saveFailed);
        return;
      }
      if (json.data?.template) {
        setItems((prev) => [
          { ...json.data!.template!, ownedBySelf: true } as FormTemplateDto,
          ...prev,
        ]);
      }
      setTitle("");
      setDescription("");
      setFields([emptyField()]);
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm(strings.deleteConfirm)) return;
    startTransition(async () => {
      const res = await fetch(`/api/doctor/form-templates/${id}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setError(json.message ?? strings.deleteFailed);
        return;
      }
      setItems((prev) => prev.filter((t) => t.id !== id));
      router.refresh();
    });
  }

  return (
    <div className="gh-doctor-detail-grid gh-doctor-templates-layout grid gap-4">
      <FormSection title={strings.yourTemplates} className="gh-doctor-template-list">
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
                      onClick={() => remove(t.id)}
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

      <FormSection
        title={strings.newTemplate}
        description={strings.newTemplateDesc}
        className="gh-doctor-template-form"
      >
        <form onSubmit={create} className="gh-form-section__span-2">
        <div className="grid gap-3">
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">{strings.titleField}</span>
            <input
              className="gh-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
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
                    required
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
            className="inline-flex items-center gap-1 self-start text-portal-compact font-semibold text-[var(--portal-primary)] hover:underline"
          >
            <Plus className="size-3.5" /> {strings.addField}
          </button>

          {error ? (
            <p className="gh-status-warning rounded-md border px-3 py-2 text-portal-label">
              {error}
            </p>
          ) : null}

          <button type="submit" disabled={pending} className="gh-btn gh-btn-primary">
            {pending ? strings.saving : strings.createTemplate}
          </button>
        </div>
        </form>
      </FormSection>
    </div>
  );
}
