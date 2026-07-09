"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pill, Plus, Trash2 } from "lucide-react";
import {
  deletePrescription,
  issuePrescription,
  type DoctorPrescription,
} from "@/lib/api/doctor-prescriptions-client";
import { PortalDialog } from "@/components/PortalDialog";
import { Btn } from "@/components/portal-atoms";

export type PrescriptionsListCopy = {
  noneTitle: string;
  noneDescriptionLocked: string;
  noneDescriptionUnlocked: string;
  deleteAria: string;
  deleteTitle: string;
  drugRequired: string;
  issuePrescription: string;
  drugNameLabel: string;
  drugNamePlaceholder: string;
  doseLabel: string;
  dosePlaceholder: string;
  frequencyLabel: string;
  frequencyPlaceholder: string;
  durationLabel: string;
  durationPlaceholder: string;
  refillsLabel: string;
  instructionsLabel: string;
  instructionsPlaceholder: string;
  issuing: string;
  cancel: string;
  lockedNotice: string;
  durationDaysSuffix: string;
  refillsSuffix: string;
  deleteDialogTitle: string;
  deleteDialogBody: string;
  deleteDialogDefaultDrug: string;
};

type Props = {
  appointmentId: string;
  initialItems: DoctorPrescription[];
  consultationLocked: boolean;
  copy: PrescriptionsListCopy;
};

export function PrescriptionsList({
  appointmentId,
  initialItems,
  consultationLocked,
  copy,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState<DoctorPrescription[]>(initialItems);
  const [open, setOpen] = useState(false);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DoctorPrescription | null>(null);

  // Form state
  const [drugName, setDrugName] = useState("");
  const [dose, setDose] = useState("");
  const [frequency, setFrequency] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [instructions, setInstructions] = useState("");
  const [refills, setRefills] = useState("0");

  function resetForm() {
    setDrugName("");
    setDose("");
    setFrequency("");
    setDurationDays("");
    setInstructions("");
    setRefills("0");
    setError(null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!drugName.trim()) {
      setError(copy.drugRequired);
      return;
    }
    startTransition(async () => {
      const res = await issuePrescription(appointmentId, {
        drugName: drugName.trim(),
        dose: dose.trim() || undefined,
        frequency: frequency.trim() || undefined,
        durationDays: durationDays.trim() ? Number(durationDays) : null,
        instructions: instructions.trim() || undefined,
        refills: refills.trim() ? Number(refills) : 0,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setItems((prev) => [...prev, res.data.item]);
      resetForm();
      setOpen(false);
      router.refresh();
    });
  }

  function onDelete(p: DoctorPrescription) {
    setDeleteTarget(p);
  }

  function confirmDelete() {
    const target = deleteTarget;
    if (!target) return;
    setDeleteTarget(null);
    startTransition(async () => {
      const res = await deletePrescription(target.id);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setItems((prev) => prev.filter((p) => p.id !== target.id));
      router.refresh();
    });
  }

  return (
    <div>
      {/* List of issued prescriptions */}
      {items.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-[var(--portal-line)] bg-[var(--portal-well)] p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-[var(--portal-text)]">
            <Pill className="size-4 text-[var(--portal-primary)]" aria-hidden />
            {copy.noneTitle}
          </p>
          <p className="mt-1 text-[12px] text-[var(--portal-muted)]">
            {consultationLocked
              ? copy.noneDescriptionLocked
              : copy.noneDescriptionUnlocked}
          </p>
        </div>
      ) : (
        <ul className="mt-3 grid gap-2">
          {items.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-[var(--portal-line)] bg-[var(--portal-well)] p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-[var(--portal-text)]">
                  <Pill className="mr-1.5 inline size-4" aria-hidden />
                  {p.drugName}
                  {p.dose ? (
                    <span className="ml-2 text-[var(--portal-muted)]">
                      · {p.dose}
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-[12px] text-[var(--portal-muted)]">
                  {[
                    p.frequency,
                    p.durationDays != null
                      ? copy.durationDaysSuffix.replace("{n}", String(p.durationDays))
                      : null,
                    p.refills > 0
                      ? copy.refillsSuffix.replace("{n}", String(p.refills))
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
                {p.instructions ? (
                  <p className="mt-1 text-[12px] text-[var(--portal-text-2)] whitespace-pre-wrap">
                    {p.instructions}
                  </p>
                ) : null}
              </div>
              {!consultationLocked ? (
                <button
                  type="button"
                  onClick={() => onDelete(p)}
                  disabled={busy}
                  className="inline-flex items-center justify-center rounded-md p-1.5 text-[var(--portal-danger-text)] hover:bg-rose-50 disabled:opacity-60"
                  aria-label={copy.deleteAria.replace("{drug}", p.drugName)}
                  title={copy.deleteTitle}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {error ? (
        <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {error}
        </p>
      ) : null}

      {/* Add form */}
      {!consultationLocked ? (
        <div className="mt-4">
          {!open ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--portal-line)] bg-[var(--portal-surface)] px-3 py-1.5 text-[13px] font-semibold text-[var(--portal-text)] hover:bg-[var(--portal-well)]"
            >
              <Plus className="size-3.5" aria-hidden />
              {copy.issuePrescription}
            </button>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-3 rounded-md border border-[var(--portal-line)] bg-[var(--portal-surface)] p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex min-w-0 flex-col gap-1">
                  <span className="gh-field-label">
                    {copy.drugNameLabel} <span className="text-rose-500">*</span>
                  </span>
                  <input
                    type="text"
                    value={drugName}
                    onChange={(e) => setDrugName(e.target.value)}
                    placeholder={copy.drugNamePlaceholder}
                    maxLength={200}
                    className="gh-input"
                    required
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-1">
                  <span className="gh-field-label">{copy.doseLabel}</span>
                  <input
                    type="text"
                    value={dose}
                    onChange={(e) => setDose(e.target.value)}
                    placeholder={copy.dosePlaceholder}
                    maxLength={120}
                    className="gh-input"
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-1">
                  <span className="gh-field-label">{copy.frequencyLabel}</span>
                  <input
                    type="text"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    placeholder={copy.frequencyPlaceholder}
                    maxLength={120}
                    className="gh-input"
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-1">
                  <span className="gh-field-label">{copy.durationLabel}</span>
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    placeholder={copy.durationPlaceholder}
                    className="gh-input"
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-1">
                  <span className="gh-field-label">{copy.refillsLabel}</span>
                  <input
                    type="number"
                    min={0}
                    max={12}
                    value={refills}
                    onChange={(e) => setRefills(e.target.value)}
                    className="gh-input"
                  />
                </label>
              </div>
              <label className="flex min-w-0 flex-col gap-1">
                <span className="gh-field-label">{copy.instructionsLabel}</span>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder={copy.instructionsPlaceholder}
                  className="gh-input"
                />
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="gh-btn gh-btn-primary text-sm disabled:opacity-60"
                >
                  {busy ? copy.issuing : copy.issuePrescription}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                  }}
                  disabled={busy}
                  className="gh-btn gh-btn-soft text-sm disabled:opacity-60"
                >
                  {copy.cancel}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {copy.lockedNotice}
        </p>
      )}

      <PortalDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={copy.deleteDialogTitle}
        danger
        footer={
          <>
            <Btn variant="ghost" onClick={() => setDeleteTarget(null)}>
              {copy.cancel}
            </Btn>
            <Btn variant="danger" onClick={confirmDelete}>
              {copy.deleteTitle}
            </Btn>
          </>
        }
      >
        <p className="text-sm" style={{ color: "var(--portal-text-2)" }}>
          {copy.deleteDialogBody.replace(
            "{drug}",
            deleteTarget?.drugName ?? copy.deleteDialogDefaultDrug,
          )}
        </p>
      </PortalDialog>
    </div>
  );
}
