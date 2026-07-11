"use client";

import { useCallback, useEffect, useState } from "react";
import { Info, Loader2, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import {
  addFamilyMember,
  listFamilyMembers,
  removeFamilyMember,
  updateFamilyMember,
  type FamilyMember,
  type FamilyMemberInput,
} from "@/lib/api/family-client";
import { Btn, PageHeader } from "@/components/portal-atoms";
import { PortalDialog } from "@/components/PortalDialog";

type FamilyCopy = ReturnType<
  typeof import("@/lib/i18n/load-locale")["loadLocaleBundle"]
>["account"]["family"];

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

export function FamilyPanel({
  t,
  familyEligible,
}: {
  t: FamilyCopy;
  familyEligible: boolean;
}) {
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
    // Fetch-on-mount/refetch-on-dep-change — refetch itself is the setState source.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refetch();
  }, [refetch]);

  return (
    <div className="gh-patient-page gh-patient-family-page">
      <PageHeader
        eyebrow={t.breadcrumb}
        title={
          <span className="inline-flex items-center gap-2">
            <Users className="size-6 text-[var(--portal-primary)]" aria-hidden />
            {t.title}
          </span>
        }
        description={t.subtitle}
      />

      {!familyEligible ? (
        <div className="mb-5 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{t.tierBanner}</span>
        </div>
      ) : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <FamilyMetric label={t.membersMetric} value={String(items.length)} hint={t.membersMetricHint} />
        <FamilyMetric
          label={t.benefitsMetric}
          value={String(items.filter((member) => member.canUseCredits).length)}
          hint={t.benefitsMetricHint}
        />
        <FamilyMetric
          label={t.profilesMetric}
          value={items.length > 0 ? t.profilesActive : t.profilesNotStarted}
          hint={t.profilesMetricHint}
        />
      </div>

      <AddMemberForm t={t} onAdded={refetch} />

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
          <div className="h-4 w-44 rounded bg-[var(--portal-well)]" />
          <div className="mt-4 grid gap-3">
            <div className="h-20 rounded-lg bg-[var(--portal-well)]" />
            <div className="h-20 rounded-lg bg-[var(--portal-well)]" />
          </div>
        </div>
      ) : items.length === 0 && !error ? (
        <div className="gh-patient-empty-state mt-6 gh-card flex flex-col items-center gap-2 p-10 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-[var(--portal-well)]">
            <Users className="size-6 text-[var(--portal-muted)]" aria-hidden />
          </span>
          <p className="text-base font-bold text-[var(--portal-text)]">{t.emptyHeading}</p>
          <p className="max-w-sm text-sm text-[var(--portal-muted)]">{t.empty}</p>
        </div>
      ) : (
        <ul className="gh-patient-family-list mt-6 space-y-3">
          {items.map((member) => (
            <li key={member.id}>
              <MemberRow t={t} member={member} onChanged={refetch} />
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
    <div className="rounded-lg border border-[var(--portal-line)] bg-white/80 p-3">
      <p className="text-portal-thead font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-[var(--portal-text)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--portal-muted)]">{hint}</p>
    </div>
  );
}

function AddMemberForm({ t, onAdded }: { t: FamilyCopy; onAdded: () => Promise<void> }) {
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
      <form onSubmit={onSubmit} method="post" className="gh-patient-form-card gh-card space-y-4 p-6">
      <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--portal-muted)]">
        {t.addHeading}
      </h2>

      <label className="block">
        <span className="gh-field-label">{t.fullName}</span>
        <input
          type="text"
          required
          maxLength={120}
          value={form.fullName}
          onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
          placeholder={t.fullNamePlaceholder}
          className="gh-input mt-1 min-w-0"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="gh-field-label">
            {t.relationship}{" "}
            <span className="font-normal text-[var(--portal-muted)]">({t.optional})</span>
          </span>
          <input
            type="text"
            maxLength={60}
            value={form.relationship ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}
            placeholder={t.relationshipPlaceholder}
            className="gh-input mt-1 min-w-0"
          />
        </label>

        <label className="block">
          <span className="gh-field-label">
            {t.dateOfBirth}{" "}
            <span className="font-normal text-[var(--portal-muted)]">({t.optional})</span>
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
          {t.email}{" "}
          <span className="font-normal text-[var(--portal-muted)]">({t.optional})</span>
        </span>
        <input
          type="email"
          value={form.email ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder={t.emailPlaceholder}
          className="gh-input mt-1 min-w-0"
        />
      </label>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={form.canUseCredits ?? false}
          onChange={(e) => setForm((f) => ({ ...f, canUseCredits: e.target.checked }))}
          className="mt-0.5 size-4 shrink-0 accent-[var(--portal-primary)]"
        />
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-[var(--portal-text)]">
            {t.canUseCredits}
          </span>
          <span className="text-xs text-[var(--portal-muted)]">
            {t.canUseCreditsHelp}
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
        {submitting ? t.adding : t.add}
      </button>
    </form>
  );
}

function MemberRow({
  t,
  member,
  onChanged,
}: {
  t: FamilyCopy;
  member: FamilyMember;
  onChanged: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <EditMemberForm
        t={t}
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
      t={t}
      member={member}
      onEdit={() => setEditing(true)}
      onChanged={onChanged}
    />
  );
}

function MemberDisplay({
  t,
  member,
  onEdit,
  onChanged,
}: {
  t: FamilyCopy;
  member: FamilyMember;
  onEdit: () => void;
  onChanged: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const [busyToggle, setBusyToggle] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function onDelete() {
    setConfirmOpen(true);
  }

  async function confirmDelete() {
    setConfirmOpen(false);
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
          <p className="truncate text-sm font-bold text-[var(--portal-text)]" title={member.fullName}>
            {member.fullName}
          </p>
          <p className="text-xs text-[var(--portal-muted)]">
            {member.relationship || t.noRelationship}
            {member.dateOfBirth ? ` · ${member.dateOfBirth.slice(0, 10)}` : ""}
          </p>
          {member.email ? (
            <p
              title={member.email}
              className="break-words text-xs text-[var(--portal-muted)] [overflow-wrap:anywhere]"
            >
              {member.email}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            aria-label={`${t.edit} ${member.fullName}`}
            className="rounded-md p-2 text-[var(--portal-muted)] transition hover:bg-[var(--portal-well)] hover:text-[var(--portal-text)]"
          >
            <Pencil className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            aria-label={`${t.remove} ${member.fullName}`}
            className="rounded-md p-2 text-[var(--portal-muted)] transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60"
          >
            {deleting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="size-4" aria-hidden />
            )}
          </button>
        </div>
      </div>

      <label className="mt-3 flex items-center gap-2 border-t border-[var(--portal-line)] pt-3">
        <input
          type="checkbox"
          checked={member.canUseCredits}
          disabled={busyToggle}
          onChange={(e) => void onToggleCredits(e.target.checked)}
          className="size-4 shrink-0 accent-[var(--portal-primary)] disabled:opacity-60"
        />
        <span className="text-xs font-semibold text-[var(--portal-text)]">
          {member.canUseCredits ? t.benefitsOn : t.benefitsOff}
        </span>
        <span className="text-xs text-[var(--portal-muted)]">— {t.canUseCreditsHelp}</span>
      </label>

      {msg ? (
        <p role="alert" className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {msg}
        </p>
      ) : null}

      <PortalDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={`${t.remove} ${member.fullName}`}
        danger
        footer={
          <>
            <Btn variant="ghost" onClick={() => setConfirmOpen(false)}>
              {t.cancel}
            </Btn>
            <Btn variant="danger" onClick={() => void confirmDelete()}>
              {t.remove}
            </Btn>
          </>
        }
      >
        <p className="text-sm" style={{ color: "var(--portal-text-2)" }}>
          {t.confirmRemove}
        </p>
      </PortalDialog>
    </div>
  );
}

function EditMemberForm({
  t,
  member,
  onDone,
  onCancel,
}: {
  t: FamilyCopy;
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
      <form onSubmit={onSubmit} method="post" className="gh-patient-form-card gh-card space-y-4 p-4">
      <label className="block">
        <span className="gh-field-label">{t.fullName}</span>
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
          <span className="gh-field-label">{t.relationship}</span>
          <input
            type="text"
            maxLength={60}
            value={form.relationship ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}
            className="gh-input mt-1 min-w-0"
          />
        </label>
        <label className="block">
          <span className="gh-field-label">{t.dateOfBirth}</span>
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
        <span className="gh-field-label">{t.email}</span>
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
          className="mt-0.5 size-4 shrink-0 accent-[var(--portal-primary)]"
        />
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-[var(--portal-text)]">
            {t.canUseCredits}
          </span>
          <span className="text-xs text-[var(--portal-muted)]">{t.canUseCreditsHelp}</span>
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
          {saving ? t.saving : t.save}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 rounded-md border border-[var(--portal-line)] px-4 py-2 text-sm font-semibold text-[var(--portal-text)] transition hover:bg-[var(--portal-well)]"
        >
          <X className="size-4" aria-hidden />
          {t.cancel}
        </button>
      </div>
    </form>
  );
}
