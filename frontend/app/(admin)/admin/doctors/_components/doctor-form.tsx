"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult, FieldErrors } from "@/lib/admin/action-result";

type CountryOption = { id: string; code: string; name: string };
type CountryAssignment = { countryId: string; sortOrder: number; active: boolean };

type Values = {
  id?: string;
  slug: string;
  name: string;
  title: string;
  bio: string;
  imageUrl: string;
  registrationNumber: string;
  yearsExperience: string;
  languages: string;
  active: boolean;
  countries: CountryAssignment[];
};

export function DoctorForm({
  initial,
  countries,
  action,
  submitLabel,
}: {
  initial: Values;
  countries: CountryOption[];
  action: (formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [assignments, setAssignments] = useState<CountryAssignment[]>(initial.countries);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    // Encode assignments as repeating fields
    assignments.forEach((a) => {
      data.append("countryAssignmentId", a.countryId);
      data.set(`countrySort-${a.countryId}`, String(a.sortOrder));
      if (a.active) data.set(`countryActive-${a.countryId}`, "on");
    });
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

  function toggle(countryId: string) {
    setAssignments((prev) => {
      const exists = prev.find((a) => a.countryId === countryId);
      if (exists) return prev.filter((a) => a.countryId !== countryId);
      return [...prev, { countryId, sortOrder: prev.length, active: true }];
    });
  }

  function updateSort(countryId: string, value: number) {
    setAssignments((prev) => prev.map((a) => (a.countryId === countryId ? { ...a, sortOrder: value } : a)));
  }

  function toggleActive(countryId: string) {
    setAssignments((prev) =>
      prev.map((a) => (a.countryId === countryId ? { ...a, active: !a.active } : a)),
    );
  }

  function errFor(field: string) {
    const errs = fieldErrors[field];
    return errs && errs.length > 0 ? errs[0] : null;
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="grid gap-5">
        {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}

        <section className="gh-card grid gap-4 p-6">
          <h2 className="gh-h3">Profile</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="URL slug" error={errFor("slug")}>
              <input name="slug" defaultValue={initial.slug} required className="gh-input" placeholder="dr-john-smith" />
            </Field>
            <Field label="Name" error={errFor("name")}>
              <input name="name" defaultValue={initial.name} required className="gh-input" placeholder="Dr. John Smith" />
            </Field>
            <Field label="Title" error={errFor("title")}>
              <input name="title" defaultValue={initial.title} required className="gh-input" placeholder="GP / MD" />
            </Field>
            <Field label="Years of experience" error={errFor("yearsExperience")}>
              <input
                name="yearsExperience"
                defaultValue={initial.yearsExperience}
                type="number"
                min={0}
                max={80}
                className="gh-input"
                placeholder="10"
              />
            </Field>
            <Field label="Registration number" error={errFor("registrationNumber")}>
              <input
                name="registrationNumber"
                defaultValue={initial.registrationNumber}
                className="gh-input"
                placeholder="IMC 123456"
              />
            </Field>
            <Field label="Image URL" error={errFor("imageUrl")}>
              <input name="imageUrl" defaultValue={initial.imageUrl} className="gh-input" placeholder="https://..." />
            </Field>
            <Field label="Languages (comma-separated)" error={errFor("languages")}>
              <input
                name="languages"
                defaultValue={initial.languages}
                className="gh-input"
                placeholder="English, Portuguese"
              />
            </Field>
          </div>
          <Field label="Bio" error={errFor("bio")}>
            <textarea name="bio" defaultValue={initial.bio} className="gh-textarea" rows={8} />
          </Field>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="active"
              defaultChecked={initial.active}
              className="size-4 rounded border-[var(--color-border)]"
            />
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">Active</span>
          </label>
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
      </div>

      <aside className="gh-card grid h-fit gap-3 p-6">
        <h2 className="gh-h3">Country assignments</h2>
        <p className="text-xs text-[var(--color-text-muted)]">
          A doctor can appear in multiple countries with different sort order and visibility.
        </p>
        <ul className="grid gap-2">
          {countries.map((country) => {
            const a = assignments.find((x) => x.countryId === country.id);
            const enabled = Boolean(a);
            return (
              <li
                key={country.id}
                className={`rounded-[var(--radius-card-sm)] border p-3 ${enabled ? "border-[var(--color-border-strong)] bg-[var(--color-background-soft)]" : "border-[var(--color-border)]"}`}
              >
                <label className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {country.code} · {country.name}
                  </span>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => toggle(country.id)}
                    className="size-4 rounded border-[var(--color-border)]"
                  />
                </label>
                {a ? (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="text-xs text-[var(--color-text-muted)]">
                      Sort
                      <input
                        type="number"
                        value={a.sortOrder}
                        onChange={(e) => updateSort(country.id, Number(e.target.value) || 0)}
                        className="gh-input mt-1 h-9 text-xs"
                        min={0}
                        max={999}
                      />
                    </label>
                    <label className="flex items-end gap-2 text-xs text-[var(--color-text-muted)]">
                      <input
                        type="checkbox"
                        checked={a.active}
                        onChange={() => toggleActive(country.id)}
                        className="size-4 rounded border-[var(--color-border)]"
                      />
                      <span>Visible</span>
                    </label>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </aside>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label className="gh-field-label">{label}</label>
      {children}
      {error ? <p className="text-xs text-[var(--color-status-error-text)]">{error}</p> : null}
    </div>
  );
}
