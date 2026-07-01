"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import {
  addFamilyMember,
  listFamilyMembers,
  removeFamilyMember,
  updateFamilyMember,
  type FamilyMember,
  type FamilyMemberInput,
} from "@/lib/api/family-client";

// TODO(i18n): move these into account.json once the shared types settle.
const T = {
  breadcrumb: "Account",
  title: "Family members",
  subtitle:
    "Add the people you book consultations for. Approve who may use your plan credits and discounts.",
  loading: "Loading family members…",
  empty: "You have not added any family members yet.",
  addHeading: "Add a family member",
  fullName: "Full name",
  fullNamePlaceholder: "e.g. Maria Santos",
  relationship: "Relationship",
  relationshipPlaceholder: "e.g. Spouse, Child, Parent",
  dateOfBirth: "Date of birth",
  email: "Email",
  emailPlaceholder: "optional@example.com",
  canUseCredits: "Can use plan benefits",
  canUseCreditsHelp:
    "Can use plan credits & discounts for their consultations.",
  add: "Add member",
  adding: "Adding…",
  save: "Save",
  saving: "Saving…",
  cancel: "Cancel",
  edit: "Edit",
  remove: "Remove",
  deleting: "Removing…",
  confirmRemove: "Remove this family member?",
  optional: "optional",
  benefitsOn: "Plan benefits enabled",
  benefitsOff: "Plan benefits off",
  noRelationship: "No relationship set",
} as const;

const emptyForm: FamilyMemberInput = {
  fullName: "",
  relationship: "",
  dateOfBirth: "",
  email: "",
  canUseCredits: false,
};

const TODAY = new Date().toISOString().slice(0, 10);

/** Trim/strip empties so we never POST empty strings for optional fields. */
function toPayload(form: FamilyMemberInput): FamilyMemberInput {
  return {
    fullName: form.fullName.trim(),
    relationship: form.relationship?.trim() || undefined,
    dateOfBirth: form.dateOfBirth?.trim() || undefined,
    email: form.email?.trim() || undefined,
    canUseCredits: form.canUseCredits ?? false,
  };
}

export default function AccountFamilyPage() {
  const [items, setItems] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const res = await listFamilyMembers();
    if (res.ok) {
      setItems(res.data.items);
      setError(null);
    } else {
      setError(res.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return (
    <div className="gh-patient-page gh-patient-family-page">
      <header className="gh-patient-page-header mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          {T.breadcrumb}
        </p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-[var(--color-text-primary)]">
          <Users className="size-6 text-[var(--color-brand-primary)]" aria-hidden />
          {T.title}
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">{T.subtitle}</p>
      </header>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <FamilyMetric label="Members" value={String(items.length)} hint="People you can book for" />
        <FamilyMetric
          label="Plan benefits"
          value={String(items.filter((member) => member.canUseCredits).length)}
          hint="Allowed to use credits"
        />
        <FamilyMetric
          label="Profiles"
          value={items.length > 0 ? "Active" : "Not started"}
          hint="Add family before booking"
        />
      </div>

      <AddMemberForm onAdded={refetch} />

      {error ? (
        <p
          role="alert"
          className="mt-6 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="gh-patient-empty-state mt-6 gh-card p-6">
          <div className="h-4 w-44 rounded bg-[var(--color-background-soft)]" />
          <div className="mt-4 grid gap-3">
            <div className="h-20 rounded-lg bg-[var(--color-background-soft)]" />
            <div className="h-20 rounded-lg bg-[var(--color-background-soft)]" />
          </div>
        </div>
      ) : items.length === 0 && !error ? (
        <div className="gh-patient-empty-state mt-6 gh-card flex flex-col items-center gap-2 p-10 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-[var(--color-background-soft)]">
            <Users className="size-6 text-[var(--color-text-muted)]" aria-hidden />
          </span>
          <p className="text-base font-bold text-[var(--color-text-primary)]">No family members yet</p>
          <p className="max-w-sm text-sm text-[var(--color-text-muted)]">{T.empty}</p>
        </div>
      ) : (
        <ul className="gh-patient-family-list mt-6 space-y-3">
          {items.map((member) => (
            <li key={member.id}>
              <MemberRow member={member} onChanged={refetch} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FamilyMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-white/80 p-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-[var(--color-text-primary)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">{hint}</p>
    </div>
  );
}

function AddMemberForm({ onAdded }: { onAdded: () => Promise<void> }) {
  const [form, setForm] = useState<FamilyMemberInput>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (form.fullName.trim() === "") return;
    setSubmitting(true);
    setMsg(null);
    const res = await addFamilyMember(toPayload(form));
    setSubmitting(false);
    if (res.ok) {
      setForm(emptyForm);
      await onAdded();
    } else {
      setMsg(res.message);
    }
  }

  return (
      <form onSubmit={onSubmit} className="gh-patient-form-card gh-card space-y-4 p-6">
      <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
        {T.addHeading}
      </h2>

      <label className="block">
        <span className="gh-field-label">{T.fullName}</span>
        <input
          type="text"
          required
          maxLength={120}
          value={form.fullName}
          onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
          placeholder={T.fullNamePlaceholder}
          className="gh-input mt-1 min-w-0"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="gh-field-label">
            {T.relationship}{" "}
            <span className="font-normal text-[var(--color-text-muted)]">({T.optional})</span>
          </span>
          <input
            type="text"
            maxLength={60}
            value={form.relationship ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}
            placeholder={T.relationshipPlaceholder}
            className="gh-input mt-1 min-w-0"
          />
        </label>

        <label className="block">
          <span className="gh-field-label">
            {T.dateOfBirth}{" "}
            <span className="font-normal text-[var(--color-text-muted)]">({T.optional})</span>
          </span>
          <input
            type="date"
            max={TODAY}
            value={form.dateOfBirth ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
            className="gh-input mt-1 min-w-0"
          />
        </label>
      </div>

      <label className="block">
        <span className="gh-field-label">
          {T.email}{" "}
          <span className="font-normal text-[var(--color-text-muted)]">({T.optional})</span>
        </span>
        <input
          type="email"
          value={form.email ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder={T.emailPlaceholder}
          className="gh-input mt-1 min-w-0"
        />
      </label>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={form.canUseCredits ?? false}
          onChange={(e) => setForm((f) => ({ ...f, canUseCredits: e.target.checked }))}
          className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand-primary)]"
        />
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">
            {T.canUseCredits}
          </span>
          <span className="text-xs text-[var(--color-text-muted)]">
            {T.canUseCreditsHelp}
          </span>
        </span>
      </label>

      {msg ? (
        <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {msg}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting || form.fullName.trim() === ""}
        className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
      >
        {submitting ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Plus className="size-4" aria-hidden />
        )}
        {submitting ? T.adding : T.add}
      </button>
    </form>
  );
}

function MemberRow({
  member,
  onChanged,
}: {
  member: FamilyMember;
  onChanged: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <EditMemberForm
        member={member}
        onDone={async () => {
          setEditing(false);
          await onChanged();
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }
  return (
    <MemberDisplay
      member={member}
      onEdit={() => setEditing(true)}
      onChanged={onChanged}
    />
  );
}

function MemberDisplay({
  member,
  onEdit,
  onChanged,
}: {
  member: FamilyMember;
  onEdit: () => void;
  onChanged: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const [busyToggle, setBusyToggle] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onDelete() {
    if (!window.confirm(T.confirmRemove)) return;
    setDeleting(true);
    setMsg(null);
    const res = await removeFamilyMember(member.id);
    if (res.ok) {
      await onChanged();
    } else {
      setMsg(res.message);
      setDeleting(false);
    }
  }

  async function onToggleCredits(next: boolean) {
    setBusyToggle(true);
    setMsg(null);
    const res = await updateFamilyMember(member.id, { canUseCredits: next });
    setBusyToggle(false);
    if (res.ok) {
      await onChanged();
    } else {
      setMsg(res.message);
    }
  }

  return (
    <div className="gh-patient-family-card gh-card p-4">
      <div className="gh-patient-family-card-header flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[var(--color-text-primary)]">
            {member.fullName}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {member.relationship || T.noRelationship}
            {member.dateOfBirth ? ` · ${member.dateOfBirth.slice(0, 10)}` : ""}
          </p>
          {member.email ? (
            <p className="truncate text-xs text-[var(--color-text-muted)]">{member.email}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            aria-label={`${T.edit} ${member.fullName}`}
            className="rounded-md p-2 text-[var(--color-text-muted)] transition hover:bg-[var(--color-background-soft)] hover:text-[var(--color-text-primary)]"
          >
            <Pencil className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            aria-label={`${T.remove} ${member.fullName}`}
            className="rounded-md p-2 text-[var(--color-text-muted)] transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60"
          >
            {deleting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="size-4" aria-hidden />
            )}
          </button>
        </div>
      </div>

      <label className="mt-3 flex items-center gap-2 border-t border-[var(--color-border)] pt-3">
        <input
          type="checkbox"
          checked={member.canUseCredits}
          disabled={busyToggle}
          onChange={(e) => void onToggleCredits(e.target.checked)}
          className="size-4 shrink-0 accent-[var(--color-brand-primary)] disabled:opacity-60"
        />
        <span className="text-xs font-semibold text-[var(--color-text-primary)]">
          {member.canUseCredits ? T.benefitsOn : T.benefitsOff}
        </span>
        <span className="text-xs text-[var(--color-text-muted)]">— {T.canUseCreditsHelp}</span>
      </label>

      {msg ? (
        <p role="alert" className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {msg}
        </p>
      ) : null}
    </div>
  );
}

function EditMemberForm({
  member,
  onDone,
  onCancel,
}: {
  member: FamilyMember;
  onDone: () => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FamilyMemberInput>({
    fullName: member.fullName,
    relationship: member.relationship ?? "",
    dateOfBirth: member.dateOfBirth ? member.dateOfBirth.slice(0, 10) : "",
    email: member.email ?? "",
    canUseCredits: member.canUseCredits,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (form.fullName.trim() === "") return;
    setSaving(true);
    setMsg(null);
    const res = await updateFamilyMember(member.id, toPayload(form));
    setSaving(false);
    if (res.ok) {
      await onDone();
    } else {
      setMsg(res.message);
    }
  }

  return (
      <form onSubmit={onSubmit} className="gh-patient-form-card gh-card space-y-4 p-4">
      <label className="block">
        <span className="gh-field-label">{T.fullName}</span>
        <input
          type="text"
          required
          maxLength={120}
          value={form.fullName}
          onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
          className="gh-input mt-1 min-w-0"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="gh-field-label">{T.relationship}</span>
          <input
            type="text"
            maxLength={60}
            value={form.relationship ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}
            className="gh-input mt-1 min-w-0"
          />
        </label>
        <label className="block">
          <span className="gh-field-label">{T.dateOfBirth}</span>
          <input
            type="date"
            max={TODAY}
            value={form.dateOfBirth ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
            className="gh-input mt-1 min-w-0"
          />
        </label>
      </div>

      <label className="block">
        <span className="gh-field-label">{T.email}</span>
        <input
          type="email"
          value={form.email ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          className="gh-input mt-1 min-w-0"
        />
      </label>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={form.canUseCredits ?? false}
          onChange={(e) => setForm((f) => ({ ...f, canUseCredits: e.target.checked }))}
          className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand-primary)]"
        />
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">
            {T.canUseCredits}
          </span>
          <span className="text-xs text-[var(--color-text-muted)]">{T.canUseCreditsHelp}</span>
        </span>
      </label>

      {msg ? (
        <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {msg}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving || form.fullName.trim() === ""}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
        >
          {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {saving ? T.saving : T.save}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-background-soft)]"
        >
          <X className="size-4" aria-hidden />
          {T.cancel}
        </button>
      </div>
    </form>
  );
}
