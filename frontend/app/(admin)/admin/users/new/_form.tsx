"use client";

import { useState, useTransition, type FormEvent } from "react";
import { inviteUserAction } from "../actions";
import type { ActionResult, FieldErrors } from "@/lib/admin/action-result";

export function InviteForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result: ActionResult = await inviteUserAction(data);
      if (result && result.ok === false) {
        setError(result.message);
        setFieldErrors(result.fieldErrors ?? {});
      }
    });
  }

  function errFor(field: string) {
    const errs = fieldErrors[field];
    return errs && errs.length > 0 ? errs[0] : null;
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <section className="gh-card grid gap-4 p-6">
        <div className="grid gap-1.5">
          <label className="gh-field-label">Email</label>
          <input name="email" type="email" required className="gh-input" placeholder="name@myglobalhealth.online" />
          {errFor("email") ? <p className="text-xs text-[var(--color-status-error-text)]">{errFor("email")}</p> : null}
        </div>
        <div className="grid gap-1.5">
          <label className="gh-field-label">Name (optional)</label>
          <input name="name" className="gh-input" placeholder="Full name" />
        </div>
        <div className="grid gap-1.5">
          <label className="gh-field-label">Role</label>
          <select name="role" defaultValue="ADMIN" className="gh-select">
            <option value="ADMIN">ADMIN</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
          </select>
        </div>
        <div className="grid gap-1.5">
          <label className="gh-field-label">Initial password</label>
          <input
            name="password"
            type="text"
            required
            minLength={12}
            className="gh-input"
            placeholder="At least 12 characters"
          />
          {errFor("password") ? (
            <p className="text-xs text-[var(--color-status-error-text)]">{errFor("password")}</p>
          ) : (
            <p className="text-xs text-[var(--color-text-muted)]">
              Share this password with the user out-of-band. They&apos;ll change it after first sign-in (v1.1).
            </p>
          )}
        </div>
      </section>

      {error ? (
        <p role="alert" className="gh-status-error rounded-md px-4 py-3 text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <button type="submit" disabled={isPending} className="gh-btn gh-btn-primary text-sm">
          {isPending ? "Creating…" : "Create user"}
        </button>
      </div>
    </form>
  );
}
