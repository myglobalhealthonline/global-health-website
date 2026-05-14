"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult, FieldErrors } from "@/lib/admin/action-result";

type CountryOption = { id: string; code: string; name: string; currency: string };
type CategoryOption = { id: string; name: string; type: "GENERAL" | "SPECIALIST" };

type Values = {
  id?: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  type: "GENERAL" | "SPECIALIST" | "PRESCRIPTION" | "HEALTH_TEST";
  countryId: string;
  categoryId: string;
  priceCents: number | null;
  currency: string;
  durationMin: string;
  imageUrl: string;
  metaTitle: string;
  metaDescription: string;
  active: boolean;
  featured: boolean;
  status?: "DRAFT" | "PUBLISHED";
};

export function ServiceForm({
  initial,
  countries,
  categories,
  action,
  mode,
}: {
  initial: Values;
  countries: CountryOption[];
  categories: CategoryOption[];
  action: (formData: FormData) => Promise<ActionResult>;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [type, setType] = useState(initial.type);

  const needsCategory = type === "GENERAL" || type === "SPECIALIST";
  const categoryOptions = categories.filter((c) => c.type === type);

  function submit(intent: "save" | "publish" | "draft") {
    return (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form);
      data.set("intent", intent);
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
    };
  }

  function errFor(field: string) {
    const errs = fieldErrors[field];
    return errs && errs.length > 0 ? errs[0] : null;
  }

  return (
    <form onSubmit={submit("save")} className="grid gap-5">
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}

      <section className="gh-card grid gap-4 p-6">
        <h2 className="gh-h3">Identity</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type" error={errFor("type")}>
            <select
              name="type"
              value={type}
              onChange={(e) => setType(e.target.value as Values["type"])}
              className="gh-select"
            >
              <option value="GENERAL">General consultation</option>
              <option value="SPECIALIST">Specialist consultation</option>
              <option value="PRESCRIPTION">Prescription</option>
              <option value="HEALTH_TEST">Health test</option>
            </select>
          </Field>
          <Field label="Country" error={errFor("countryId")}>
            <select name="countryId" defaultValue={initial.countryId} required className="gh-select">
              <option value="">Select a country…</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Title" error={errFor("title")}>
            <input name="title" defaultValue={initial.title} required className="gh-input" />
          </Field>
          <Field label="URL slug" error={errFor("slug")}>
            <input name="slug" defaultValue={initial.slug} required className="gh-input" placeholder="cardiology-consultation" />
          </Field>
          {needsCategory ? (
            <Field label="Category" error={errFor("categoryId")}>
              <select name="categoryId" defaultValue={initial.categoryId} className="gh-select">
                <option value="">— None —</option>
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <input type="hidden" name="categoryId" value="" />
          )}
        </div>
      </section>

      <section className="gh-card grid gap-4 p-6">
        <h2 className="gh-h3">Content</h2>
        <Field label="Summary" error={errFor("summary")}>
          <textarea name="summary" defaultValue={initial.summary} required className="gh-textarea" rows={3} />
        </Field>
        <Field label="Description" error={errFor("description")}>
          <textarea name="description" defaultValue={initial.description} className="gh-textarea" rows={8} />
        </Field>
      </section>

      <section className="gh-card grid gap-4 p-6">
        <h2 className="gh-h3">Pricing &amp; duration</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Price (decimal)" help="Stored as integer cents" error={errFor("priceCents")}>
            <input
              name="priceCents"
              type="number"
              step="0.01"
              defaultValue={initial.priceCents !== null ? (initial.priceCents / 100).toString() : ""}
              className="gh-input"
              placeholder="75.00"
            />
          </Field>
          <Field label="Currency override" help="Leave blank to use country default" error={errFor("currency")}>
            <input name="currency" defaultValue={initial.currency} className="gh-input uppercase" placeholder="EUR" />
          </Field>
          <Field label="Duration (minutes)" error={errFor("durationMin")}>
            <input
              name="durationMin"
              type="number"
              min={0}
              defaultValue={initial.durationMin}
              className="gh-input"
              placeholder="30"
            />
          </Field>
        </div>
      </section>

      <section className="gh-card grid gap-4 p-6">
        <h2 className="gh-h3">Media &amp; SEO</h2>
        <Field label="Image URL" error={errFor("imageUrl")}>
          <input name="imageUrl" defaultValue={initial.imageUrl} className="gh-input" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Meta title" error={errFor("metaTitle")}>
            <input name="metaTitle" defaultValue={initial.metaTitle} className="gh-input" />
          </Field>
          <Field label="Meta description" error={errFor("metaDescription")}>
            <input name="metaDescription" defaultValue={initial.metaDescription} className="gh-input" />
          </Field>
        </div>
      </section>

      <section className="gh-card grid gap-3 p-6">
        <h2 className="gh-h3">Visibility</h2>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="active"
            defaultChecked={initial.active}
            className="size-4 rounded border-[var(--color-border)]"
          />
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">Active</span>
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={initial.featured}
            className="size-4 rounded border-[var(--color-border)]"
          />
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">Featured on country home</span>
        </label>
        {mode === "edit" && initial.status ? (
          <p className="text-xs text-[var(--color-text-muted)]">
            Current status: <strong>{initial.status === "PUBLISHED" ? "Published" : "Draft"}</strong>
          </p>
        ) : null}
      </section>

      {error ? (
        <p role="alert" className="gh-status-error rounded-md px-4 py-3 text-sm">
          {error}
        </p>
      ) : null}

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-[var(--color-border)] bg-[var(--color-background-page)]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <button type="submit" onClick={submit("draft") as never} disabled={isPending} className="gh-btn gh-btn-soft text-sm">
          Save as draft
        </button>
        <button type="submit" onClick={submit("publish") as never} disabled={isPending} className="gh-btn gh-btn-primary text-sm">
          {isPending ? "Saving…" : mode === "create" ? "Publish" : "Save & publish"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  help,
  error,
  children,
}: {
  label: string;
  help?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label className="gh-field-label">{label}</label>
      {children}
      {help && !error ? <p className="text-xs text-[var(--color-text-muted)]">{help}</p> : null}
      {error ? <p className="text-xs text-[var(--color-status-error-text)]">{error}</p> : null}
    </div>
  );
}
