"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Btn, IconBtn } from "@/components/portal-atoms";
import { PortalDialog } from "@/components/PortalDialog";
import { Trash2 } from "lucide-react";
import { interpolate } from "@/lib/subscription/format";
import {
  addMembershipDependent,
  removeMembershipDependent,
  type MemberDependentView,
} from "@/lib/api/me-memberships";

/**
 * Member-added dependents (§10). The cap comes from the level, and the server
 * re-checks it — this panel hides the button at the cap for clarity, not as
 * the enforcement.
 *
 * Only dependents the *member* added can be removed here. Ones an admin or a
 * CSV import created are shown without a remove control, because the member
 * did not put them there and taking them out is an audited admin action.
 */
export function MembershipDependentsPanel({
  enrollmentId,
  dependents,
  family,
  t,
}: {
  enrollmentId: string;
  dependents: MemberDependentView[];
  family: { maxDependents: number; used: number };
  t: Record<string, string>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", relationship: "" });

  const atCap = family.used >= family.maxDependents;

  async function onAdd(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const res = await addMembershipDependent(enrollmentId, {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email,
      relationship: form.relationship.trim() || undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setOpen(false);
    setForm({ firstName: "", lastName: "", email: "", relationship: "" });
    router.refresh();
  }

  async function onRemove(id: string) {
    setBusy(true);
    const res = await removeMembershipDependent(id);
    setBusy(false);
    if (res.ok) router.refresh();
    else setError(res.message);
  }

  return (
    <section className="gh-card p-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{t.dependentsTitle}</h2>
          <p className="text-sm opacity-70">
            {interpolate(t.dependentsCap, { used: family.used, max: family.maxDependents })}
          </p>
        </div>
        {atCap ? null : (
          <Btn variant="secondary" onClick={() => setOpen(true)}>
            {t.dependentsAdd}
          </Btn>
        )}
      </header>

      {dependents.length === 0 ? (
        <p className="text-sm opacity-70">{t.dependentsNone}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {dependents.map((dependent) => (
            <li
              key={dependent.id}
              className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
              style={{ background: "var(--portal-surface-2, rgba(0,0,0,0.03))" }}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {dependent.firstName} {dependent.lastName}
                </p>
                <p className="truncate text-xs opacity-70">
                  {dependent.membershipId} ·{" "}
                  {dependent.linked ? t.dependentsLinked : t.dependentsPending}
                </p>
              </div>
              {dependent.removableByMember ? (
                <IconBtn
                  ariaLabel={t.dependentsRemove}
                  disabled={busy}
                  onClick={() => onRemove(dependent.id)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </IconBtn>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {error ? (
        <p className="mt-3 text-sm" role="alert" style={{ color: "var(--portal-danger, #b42318)" }}>
          {error}
        </p>
      ) : null}

      <PortalDialog open={open} onClose={() => setOpen(false)} title={t.dependentsAdd}>
        <form onSubmit={onAdd} className="flex flex-col gap-4">
          {(
            [
              ["firstName", t.depFirstName, "text"],
              ["lastName", t.depLastName, "text"],
              ["email", t.depEmail, "email"],
              ["relationship", t.depRelationship, "text"],
            ] as const
          ).map(([field, label, type]) => (
            <label key={field} className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">{label}</span>
              <input
                className="gh-input"
                type={type}
                required={field !== "relationship"}
                value={form[field]}
                onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
              />
            </label>
          ))}
          <div className="flex justify-end gap-2">
            <Btn type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t.depCancel}
            </Btn>
            <Btn type="submit" disabled={busy}>
              {busy ? t.depSaving : t.depSave}
            </Btn>
          </div>
        </form>
      </PortalDialog>
    </section>
  );
}
