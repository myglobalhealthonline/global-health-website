"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pill, Plus, Trash2 } from "lucide-react";
import {
  deletePrescription,
  issuePrescription,
  type DoctorPrescription,
} from "@/lib/api/doctor-prescriptions-client";

type Props = {
  appointmentId: string;
  initialItems: DoctorPrescription[];
  consultationLocked: boolean;
};

export function PrescriptionsList({
  appointmentId,
  initialItems,
  consultationLocked,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState<DoctorPrescription[]>(initialItems);
  const [open, setOpen] = useState(false);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
      setError("Drug name is required");
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

  async function onDelete(id: string) {
    if (!window.confirm("Delete this prescription? This cannot be undone.")) return;
    startTransition(async () => {
      const res = await deletePrescription(id);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setItems((prev) => prev.filter((p) => p.id !== id));
      router.refresh();
    });
  }

  return (
    <div>
      {/* List of issued prescriptions */}
      {items.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-[var(--color-text-primary)]">
            <Pill className="size-4 text-[var(--color-brand-primary)]" aria-hidden />
            No prescriptions recorded
          </p>
          <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
            {consultationLocked
              ? "No prescriptions were issued during this consultation."
              : "Issue a prescription here when medication is part of the follow-up plan."}
          </p>
        </div>
      ) : (
        <ul className="mt-3 grid gap-2">
          {items.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-background-soft)] p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                  <Pill className="mr-1.5 inline size-4" aria-hidden />
                  {p.drugName}
                  {p.dose ? (
                    <span className="ml-2 text-[var(--color-text-muted)]">
                      · {p.dose}
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
                  {[
                    p.frequency,
                    p.durationDays != null ? `${p.durationDays} day(s)` : null,
                    p.refills > 0
                      ? `${p.refills} refill${p.refills === 1 ? "" : "s"}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
                {p.instructions ? (
                  <p className="mt-1 text-[12px] text-[var(--color-text-body)] whitespace-pre-wrap">
                    {p.instructions}
                  </p>
                ) : null}
              </div>
              {!consultationLocked ? (
                <button
                  type="button"
                  onClick={() => onDelete(p.id)}
                  disabled={busy}
                  className="inline-flex items-center justify-center rounded-md p-1.5 text-[var(--color-status-error-text)] hover:bg-rose-50 disabled:opacity-60"
                  aria-label={`Delete ${p.drugName}`}
                  title="Delete"
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
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-1.5 text-[13px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)]"
            >
              <Plus className="size-3.5" aria-hidden />
              Issue prescription
            </button>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex min-w-0 flex-col gap-1">
                  <span className="gh-field-label">
                    Drug name <span className="text-rose-500">*</span>
                  </span>
                  <input
                    type="text"
                    value={drugName}
                    onChange={(e) => setDrugName(e.target.value)}
                    placeholder="e.g. Amoxicillin"
                    maxLength={200}
                    className="gh-input"
                    required
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-1">
                  <span className="gh-field-label">Dose / strength</span>
                  <input
                    type="text"
                    value={dose}
                    onChange={(e) => setDose(e.target.value)}
                    placeholder="e.g. 500 mg capsule"
                    maxLength={120}
                    className="gh-input"
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-1">
                  <span className="gh-field-label">Frequency</span>
                  <input
                    type="text"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    placeholder="e.g. 1 cap every 8h"
                    maxLength={120}
                    className="gh-input"
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-1">
                  <span className="gh-field-label">Duration (days)</span>
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    placeholder="e.g. 7"
                    className="gh-input"
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-1">
                  <span className="gh-field-label">Refills</span>
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
                <span className="gh-field-label">Instructions / notes</span>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="e.g. Take with food. Avoid alcohol."
                  className="gh-input"
                />
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="gh-btn gh-btn-primary text-sm disabled:opacity-60"
                >
                  {busy ? "Issuing…" : "Issue prescription"}
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
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Consultation is signed — prescriptions are locked.
        </p>
      )}
    </div>
  );
}
