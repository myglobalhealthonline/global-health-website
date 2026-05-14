"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult, FieldErrors } from "@/lib/admin/action-result";

type Values = {
  id?: string;
  slug: string;
  name: string;
  type: "GENERAL" | "SPECIALIST";
  description: string;
  iconUrl: string;
};

export function CategoryForm({
  initial,
  action,
  submitLabel,
}: {
  initial: Values;
  action: (formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await action(data);
      if (result && result.ok === false) {
        setError(result.message);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      router.refresh();
    });
  }

  function errFor(field: string) {
    const errs = fieldErrors[field];
    return errs && errs.length > 0 ? errs[0] : null;
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <section className="gh-card grid gap-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <label className="gh-field-label">Slug</label>
            <input name="slug" defaultValue={initial.slug} required className="gh-input" placeholder="cardiology" />
            {errFor("slug") ? <p className="text-xs text-[var(--color-status-error-text)]">{errFor("slug")}</p> : null}
          </div>
          <div className="grid gap-1.5">
            <label className="gh-field-label">Name</label>
            <input name="name" defaultValue={initial.name} required className="gh-input" placeholder="Cardiology" />
          </div>
          <div className="grid gap-1.5">
            <label className="gh-field-label">Type</label>
            <select name="type" defaultValue={initial.type} className="gh-select">
              <option value="GENERAL">General</option>
              <option value="SPECIALIST">Specialist</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <label className="gh-field-label">Icon URL</label>
            <input name="iconUrl" defaultValue={initial.iconUrl} className="gh-input" placeholder="https://..." />
          </div>
        </div>
        <div className="grid gap-1.5">
          <label className="gh-field-label">Description</label>
          <textarea name="description" defaultValue={initial.description} className="gh-textarea" />
        </div>
      </section>

      {error ? (
        <p role="alert" className="gh-status-error rounded-md px-4 py-3 text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <button type="submit" disabled={isPending} className="gh-btn gh-btn-primary text-sm">
          {isPending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
