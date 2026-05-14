"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult, FieldErrors } from "@/lib/admin/action-result";

type CountryFormValues = {
  id?: string;
  code: string;
  slug: string;
  name: string;
  currency: string;
  currencySymbol: string;
  languages: string; // comma-separated in the form
  phone: string;
  email: string;
  whatsapp: string;
  heroTitle: string;
  heroSubtitle: string;
  ctaLabel: string;
  active: boolean;
  status?: "DRAFT" | "PUBLISHED";
};

type Action = (formData: FormData) => Promise<ActionResult>;

export function CountryForm({
  mode,
  initial,
  action,
}: {
  mode: "create" | "edit";
  initial: CountryFormValues;
  action: Action;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

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

  function errFor(field: string): string | null {
    const errs = fieldErrors[field];
    return errs && errs.length > 0 ? errs[0] : null;
  }

  return (
    <form onSubmit={submit("save")} className="grid gap-6">
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}

      <section className="gh-card grid gap-5 p-6">
        <h2 className="gh-h3">Identity</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Country code" help="ISO 3166-1 alpha-2/3 (e.g. IE)" error={errFor("code")}>
            <input
              name="code"
              defaultValue={initial.code}
              required
              maxLength={4}
              className="gh-input uppercase"
              placeholder="IE"
            />
          </Field>
          <Field label="URL slug" help="Lowercase, used in /[slug] (e.g. ie, rm)" error={errFor("slug")}>
            <input
              name="slug"
              defaultValue={initial.slug}
              required
              maxLength={8}
              className="gh-input"
              placeholder="ie"
            />
          </Field>
          <Field label="Name" error={errFor("name")}>
            <input
              name="name"
              defaultValue={initial.name}
              required
              className="gh-input"
              placeholder="Ireland"
            />
          </Field>
        </div>
      </section>

      <section className="gh-card grid gap-5 p-6">
        <h2 className="gh-h3">Currency &amp; languages</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="ISO currency" error={errFor("currency")}>
            <input
              name="currency"
              defaultValue={initial.currency}
              required
              maxLength={8}
              className="gh-input uppercase"
              placeholder="EUR"
            />
          </Field>
          <Field label="Currency symbol" error={errFor("currencySymbol")}>
            <input
              name="currencySymbol"
              defaultValue={initial.currencySymbol}
              maxLength={8}
              className="gh-input"
              placeholder="€"
            />
          </Field>
        </div>
        <Field
          label="Languages"
          help="Comma-separated list shown on the country home page"
          error={errFor("languages")}
        >
          <input
            name="languages"
            defaultValue={initial.languages}
            className="gh-input"
            placeholder="English, Portuguese, Spanish"
          />
        </Field>
      </section>

      <section className="gh-card grid gap-5 p-6">
        <h2 className="gh-h3">Hero content</h2>
        <Field label="Hero title" error={errFor("heroTitle")}>
          <input
            name="heroTitle"
            defaultValue={initial.heroTitle}
            className="gh-input"
            placeholder="Online Medical Consultations in Ireland"
          />
        </Field>
        <Field label="Hero subtitle" error={errFor("heroSubtitle")}>
          <textarea
            name="heroSubtitle"
            defaultValue={initial.heroSubtitle}
            className="gh-textarea"
            placeholder="Licensed doctors, secure consultations, no waiting rooms."
          />
        </Field>
        <Field label="Primary CTA label" error={errFor("ctaLabel")}>
          <input
            name="ctaLabel"
            defaultValue={initial.ctaLabel}
            className="gh-input"
            placeholder="Book a Consultation"
          />
        </Field>
      </section>

      <section className="gh-card grid gap-5 p-6">
        <h2 className="gh-h3">Contact</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Phone" error={errFor("phone")}>
            <input name="phone" defaultValue={initial.phone} className="gh-input" placeholder="+353 ..." />
          </Field>
          <Field label="Email" error={errFor("email")}>
            <input
              type="email"
              name="email"
              defaultValue={initial.email}
              className="gh-input"
              placeholder="ie@myglobalhealth.online"
            />
          </Field>
          <Field label="WhatsApp" error={errFor("whatsapp")}>
            <input name="whatsapp" defaultValue={initial.whatsapp} className="gh-input" placeholder="+353 ..." />
          </Field>
        </div>
      </section>

      <section className="gh-card grid gap-5 p-6">
        <h2 className="gh-h3">Visibility</h2>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="active"
            defaultChecked={initial.active}
            className="size-4 rounded border-[var(--color-border)]"
          />
          <span className="text-sm">
            <span className="font-semibold text-[var(--color-text-primary)]">Active</span>
            <span className="block text-[var(--color-text-muted)]">
              Temporarily hide without losing publish state.
            </span>
          </span>
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
        <button
          type="submit"
          formNoValidate
          onClick={submit("draft") as never}
          disabled={isPending}
          className="gh-btn gh-btn-soft text-sm"
        >
          Save as draft
        </button>
        <button
          type="submit"
          onClick={submit("publish") as never}
          disabled={isPending}
          className="gh-btn gh-btn-primary text-sm"
        >
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
