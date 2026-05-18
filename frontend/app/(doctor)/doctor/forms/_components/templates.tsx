"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import type { FormFieldDef, FormTemplateDto } from "@/lib/api/doctor-api";
import { formatAppDateTimeShort } from "@/lib/format-datetime";

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

export function FormTemplatesClient({ initial }: { initial: FormTemplateDto[] }) {
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
      setError("Title is required.");
      return;
    }
    if (payloadFields.length === 0) {
      setError("Add at least one field.");
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
        setError(json.message ?? "Could not save template.");
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
    if (!confirm("Delete this template?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/doctor/form-templates/${id}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setError(json.message ?? "Could not delete.");
        return;
      }
      setItems((prev) => prev.filter((t) => t.id !== id));
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}>
      <div className="gh-card p-6">
        <h3
          className="m-0 text-[var(--color-text-primary)]"
          style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
        >
          Your templates
        </h3>
        {items.length === 0 ? (
          <p className="mt-4 text-[13px] text-[var(--color-text-muted)]">
            No templates yet. Use the form on the right.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {items.map((t) => (
              <li
                key={t.id}
                className="rounded-md border border-[var(--color-border)] bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                      {t.title}
                      {t.ownedBySelf ? null : (
                        <span className="ml-2 rounded-full bg-[var(--color-background-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                          Shared
                        </span>
                      )}
                    </p>
                    {t.description ? (
                      <p className="text-[12.5px] text-[var(--color-text-muted)]">
                        {t.description}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[11.5px] text-[var(--color-text-muted)]">
                      {t.fields.length} fields · updated{" "}
                      {formatAppDateTimeShort(t.updatedAt)}
                    </p>
                  </div>
                  {t.ownedBySelf ? (
                    <button
                      type="button"
                      onClick={() => remove(t.id)}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-status-error)]"
                      aria-label="Delete template"
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

      <form onSubmit={create} className="gh-card p-6">
        <h3
          className="m-0 text-[var(--color-text-primary)]"
          style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
        >
          New template
        </h3>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
          Build a simple form. Pick choice for radio-style options.
        </p>
        <div className="mt-3 grid gap-3">
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">Title</span>
            <input
              className="gh-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">Description</span>
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
              className="rounded-md border border-[var(--color-border)] p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                  Field {i + 1}
                </p>
                {fields.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeField(i)}
                    className="text-[11px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-status-error)]"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <div className="mt-2 grid gap-2">
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Label</span>
                  <input
                    className="gh-input"
                    value={f.label}
                    onChange={(e) => updateField(i, { label: e.target.value })}
                    maxLength={200}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Type</span>
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
                    <span className="gh-field-label">Options (one per line)</span>
                    <textarea
                      className="gh-input min-h-[3.5rem] resize-y"
                      value={f.optionsText}
                      onChange={(e) => updateField(i, { optionsText: e.target.value })}
                    />
                  </label>
                ) : null}
                <label className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={f.required}
                    onChange={(e) => updateField(i, { required: e.target.checked })}
                    className="size-4"
                  />
                  Required
                </label>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addField}
            className="inline-flex items-center gap-1 self-start text-[13px] font-semibold text-[var(--color-brand-primary)] hover:underline"
          >
            <Plus className="size-3.5" /> Add field
          </button>

          {error ? (
            <p className="gh-status-warning rounded-md border px-3 py-2 text-[12.5px]">
              {error}
            </p>
          ) : null}

          <button type="submit" disabled={pending} className="gh-btn gh-btn-primary">
            {pending ? "Saving…" : "Create template"}
          </button>
        </div>
      </form>
    </div>
  );
}
