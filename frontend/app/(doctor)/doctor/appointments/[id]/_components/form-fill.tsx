"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FilePlus2 } from "lucide-react";
import type { FormTemplateDto } from "@/lib/api/doctor-api";

/**
 * Doctor-side form-fill UI. Lets the doctor pick a template the patient
 * (or a guest) would normally fill, log answers on the patient's behalf,
 * and post them. The submission shows up in the "Form submissions"
 * panel above. Once submitted, the form clears and the page refreshes
 * so the new row renders.
 */
export function FormFillSection({
  appointmentId,
  templates,
}: {
  appointmentId: string;
  templates: FormTemplateDto[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [templateId, setTemplateId] = useState<string>("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const activeTemplates = useMemo(
    () => templates.filter((t) => t.isActive),
    [templates],
  );
  const currentTemplate = activeTemplates.find((t) => t.id === templateId);

  if (activeTemplates.length === 0) {
    return (
      <p className="text-[13px] text-[var(--color-text-muted)]">
        No active form templates. Build one at{" "}
        <Link
          href="/doctor/forms"
          className="font-semibold text-[var(--color-brand-primary)] hover:underline"
        >
          /doctor/forms
        </Link>
        .
      </p>
    );
  }

  function set(field: string, value: string) {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!currentTemplate) {
      setError("Pick a template.");
      return;
    }
    const payloadAnswers: Array<{ key: string; value: string | null }> = [];
    for (const field of currentTemplate.fields) {
      const raw = answers[field.key] ?? "";
      const trimmed = raw.trim();
      if (field.required && trimmed === "") {
        setError(`"${field.label}" is required.`);
        return;
      }
      payloadAnswers.push({ key: field.key, value: trimmed === "" ? null : trimmed });
    }
    startTransition(async () => {
      const res = await fetch(
        `/api/doctor/appointments/${appointmentId}/form-submissions`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            templateId: currentTemplate.id,
            answers: payloadAnswers,
          }),
        },
      );
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setError(json.message ?? "Could not submit");
        return;
      }
      setTemplateId("");
      setAnswers({});
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="mt-3 grid gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="gh-field-label">Template</span>
        <select
          className="gh-select"
          value={templateId}
          onChange={(e) => {
            setTemplateId(e.target.value);
            setAnswers({});
          }}
        >
          <option value="">Pick a template…</option>
          {activeTemplates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
              {t.ownedBySelf ? "" : " (shared)"}
            </option>
          ))}
        </select>
      </label>

      {currentTemplate ? (
        <div className="grid gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-background-soft)] p-3">
          {currentTemplate.description ? (
            <p className="text-[12.5px] text-[var(--color-text-muted)]">
              {currentTemplate.description}
            </p>
          ) : null}
          {currentTemplate.fields.map((field) => {
            const value = answers[field.key] ?? "";
            return (
              <label key={field.key} className="flex flex-col gap-1">
                <span className="gh-field-label">
                  {field.label}
                  {field.required ? (
                    <span className="ml-1 text-[var(--color-brand-primary)]">*</span>
                  ) : null}
                </span>
                {field.type === "longtext" ? (
                  <textarea
                    className="gh-input min-h-[5rem] resize-y"
                    value={value}
                    onChange={(e) => set(field.key, e.target.value)}
                  />
                ) : field.type === "choice" ? (
                  <select
                    className="gh-select"
                    value={value}
                    onChange={(e) => set(field.key, e.target.value)}
                  >
                    <option value="">—</option>
                    {(field.options ?? []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={
                      field.type === "number"
                        ? "number"
                        : field.type === "date"
                          ? "date"
                          : "text"
                    }
                    className="gh-input"
                    value={value}
                    onChange={(e) => set(field.key, e.target.value)}
                  />
                )}
                {field.helper ? (
                  <span className="text-[11.5px] text-[var(--color-text-muted)]">
                    {field.helper}
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
      ) : null}

      {error ? (
        <p className="gh-status-warning rounded-md border px-3 py-2 text-[12.5px]">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending || !currentTemplate}
          className="gh-btn gh-btn-primary"
        >
          <FilePlus2 className="size-3.5" />{" "}
          {pending ? "Submitting…" : "Submit form"}
        </button>
      </div>
    </form>
  );
}
