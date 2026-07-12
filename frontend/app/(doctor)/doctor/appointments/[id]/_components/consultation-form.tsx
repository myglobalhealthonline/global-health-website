"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";

type SoapState = {
  chiefComplaint: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  status: "DRAFT" | "SIGNED";
  signedAt: string | null;
};

export type ConsultationFormCopy = {
  fieldChiefComplaint: string;
  fieldSubjective: string;
  fieldSubjectiveHelper: string;
  fieldObjective: string;
  fieldObjectiveHelper: string;
  fieldAssessment: string;
  fieldAssessmentHelper: string;
  fieldPlan: string;
  fieldPlanHelper: string;
  signConfirm: string;
  couldNotSave: string;
  saved: string;
  networkError: string;
  couldNotSign: string;
  signed: string;
  signedAt: string;
  draftHint: string;
  saving: string;
  saveDraft: string;
  saveAndSign: string;
};

/**
 * SOAP note editor + sign button. PATCH on save, POST on sign. The form
 * is read-only once `status === "SIGNED"` — server already rejects edits
 * with a 409 if someone races, but disabling the inputs makes the
 * intent clear in the UI.
 */
export function ConsultationForm({
  appointmentId,
  initial,
  copy,
}: {
  appointmentId: string;
  initial: SoapState;
  copy: ConsultationFormCopy;
}) {
  const router = useRouter();
  const [state, setState] = useState<SoapState>(initial);
  // Baseline for dirty-tracking (typed-note-lost fix, doctor audit 03/UX-001).
  // Re-baselined to the just-saved text on a successful save so the guard
  // clears; not derived from `initial` since that prop never changes after
  // mount (SSR-only), unlike the patient-side forms that refetch client-side.
  const [baseline, setBaseline] = useState<SoapState>(initial);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<
    { kind: "success" | "error"; text: string } | null
  >(null);
  const signed = state.status === "SIGNED";

  const dirty =
    !signed &&
    (state.chiefComplaint !== baseline.chiefComplaint ||
      state.subjective !== baseline.subjective ||
      state.objective !== baseline.objective ||
      state.assessment !== baseline.assessment ||
      state.plan !== baseline.plan);
  useUnsavedChanges(dirty);

  function update<K extends keyof SoapState>(key: K, value: SoapState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function save() {
    setMessage(null);
    const savedValues = state;
    startTransition(async () => {
      const payload = {
        chiefComplaint: state.chiefComplaint.trim() || null,
        subjective: state.subjective.trim() || null,
        objective: state.objective.trim() || null,
        assessment: state.assessment.trim() || null,
        plan: state.plan.trim() || null,
      };
      try {
        const res = await fetch(
          `/api/doctor/appointments/${appointmentId}/consultation`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        const json = (await res.json()) as {
          ok?: boolean;
          message?: string;
          data?: { consultation?: SoapState & { signedAt?: string | null } };
        };
        if (!res.ok || !json.ok) {
          setMessage({ kind: "error", text: json.message ?? copy.couldNotSave });
          return;
        }
        if (json.data?.consultation) {
          setState((prev) => ({
            ...prev,
            status: json.data!.consultation!.status,
            signedAt: json.data!.consultation!.signedAt ?? null,
          }));
        }
        setMessage({ kind: "success", text: copy.saved });
        setBaseline(savedValues);
        router.refresh();
      } catch {
        setMessage({ kind: "error", text: copy.networkError });
      }
    });
  }

  function sign() {
    setMessage(null);
    if (!confirm(copy.signConfirm)) {
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/doctor/appointments/${appointmentId}/consultation/sign`,
          { method: "POST" },
        );
        const json = (await res.json()) as {
          ok?: boolean;
          message?: string;
          data?: { consultation?: SoapState & { signedAt?: string | null } };
        };
        if (!res.ok || !json.ok) {
          setMessage({ kind: "error", text: json.message ?? copy.couldNotSign });
          return;
        }
        if (json.data?.consultation) {
          setState((prev) => ({
            ...prev,
            status: json.data!.consultation!.status,
            signedAt: json.data!.consultation!.signedAt ?? null,
          }));
        }
        setMessage({ kind: "success", text: copy.signed });
        router.refresh();
      } catch {
        setMessage({ kind: "error", text: copy.networkError });
      }
    });
  }

  return (
    <div className="mt-4 grid gap-3">
      <Field
        label={copy.fieldChiefComplaint}
        value={state.chiefComplaint}
        onChange={(v) => update("chiefComplaint", v)}
        disabled={signed}
        rows={2}
      />
      <Field
        label={copy.fieldSubjective}
        helper={copy.fieldSubjectiveHelper}
        value={state.subjective}
        onChange={(v) => update("subjective", v)}
        disabled={signed}
        rows={5}
      />
      <Field
        label={copy.fieldObjective}
        helper={copy.fieldObjectiveHelper}
        value={state.objective}
        onChange={(v) => update("objective", v)}
        disabled={signed}
        rows={5}
      />
      <Field
        label={copy.fieldAssessment}
        helper={copy.fieldAssessmentHelper}
        value={state.assessment}
        onChange={(v) => update("assessment", v)}
        disabled={signed}
        rows={4}
      />
      <Field
        label={copy.fieldPlan}
        helper={copy.fieldPlanHelper}
        value={state.plan}
        onChange={(v) => update("plan", v)}
        disabled={signed}
        rows={5}
      />

      {message ? (
        <p
          className={`${
            message.kind === "success" ? "gh-status-success" : "gh-status-warning"
          } rounded-md border px-4 py-2 text-sm`}
        >
          {message.text}
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-portal-meta text-[var(--portal-muted)]">
          {signed
            ? copy.signedAt.replace(
                "{date}",
                state.signedAt ? new Date(state.signedAt).toLocaleString() : "",
              )
            : copy.draftHint}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={pending || signed}
            className="gh-btn gh-btn-soft"
          >
            {pending ? copy.saving : copy.saveDraft}
          </button>
          <button
            type="button"
            onClick={sign}
            disabled={pending || signed}
            className="gh-btn gh-btn-primary"
          >
            {signed ? copy.signed : copy.saveAndSign}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  helper,
  value,
  onChange,
  disabled,
  rows,
}: {
  label: string;
  helper?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  rows: number;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="gh-field-label">{label}</span>
      <textarea
        className="gh-input min-h-[4rem] resize-y"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={rows}
      />
      {helper ? (
        <span className="text-[11.5px] text-[var(--portal-muted)]">
          {helper}
        </span>
      ) : null}
    </label>
  );
}
