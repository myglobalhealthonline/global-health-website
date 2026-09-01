"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";
import { PortalDialog } from "@/components/PortalDialog";
import { Btn } from "@/components/portal-atoms";
import { finalizeAppointment } from "./finalize-appointment";

type SoapState = {
  chiefComplaint: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  noteFormat: "SOAP" | "FREEFORM";
  note: string;
  status: "DRAFT" | "SIGNED";
  signedAt: string | null;
};

export type ConsultationFormCopy = {
  formatSoap: string;
  formatFreeform: string;
  fieldChiefComplaint: string;
  fieldSubjective: string;
  fieldSubjectiveHelper: string;
  fieldObjective: string;
  fieldObjectiveHelper: string;
  fieldAssessment: string;
  fieldAssessmentHelper: string;
  fieldPlan: string;
  fieldPlanHelper: string;
  fieldNote: string;
  fieldNoteHelper: string;
  signConfirm: string;
  signDialogTitle: string;
  signDialogConfirm: string;
  cancel: string;
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

export type FinalizePromptCopy = {
  title: string;
  body: string;
  filesLabel: string;
  timePendingHint: string;
  confirm: string;
  finalizing: string;
  dismiss: string;
  finalized: string;
  couldNotFinalize: string;
};

/** Everything the post-sign finalize prompt needs. Omitted (or with
 *  `alreadyFinalized`) the form never raises the prompt. */
export type FinalizePromptConfig = {
  /** Appointment.finalized — nothing to prompt for when already true. */
  alreadyFinalized: boolean;
  /** Status is CANCELLED — a cancelled appointment can't be finalized. */
  cancelled: boolean;
  /** The appointment's scheduled time has passed (or is unset). */
  timeReached: boolean;
  /** Appointment.filesUploaded — pre-ticks the attestation in the prompt. */
  filesUploaded: boolean;
  copy: FinalizePromptCopy;
};

/**
 * SOAP note editor + sign button. PATCH on save, POST on sign. The form
 * is read-only once `status === "SIGNED"` — server already rejects edits
 * with a 409 if someone races, but disabling the inputs makes the
 * intent clear in the UI.
 *
 * Signing the note is where doctors think the consultation is done, but the
 * appointment is only payable once it is FINALIZED (Appointment.finalized) —
 * a separate action further down the page that was being missed, leaving
 * finished consultations off the payout statement. So a successful sign raises
 * the finalize prompt right here, at the moment the doctor believes they have
 * finished, rather than relying on them scrolling to the checklist.
 */
export function ConsultationForm({
  appointmentId,
  initial,
  copy,
  finalizePrompt,
}: {
  appointmentId: string;
  initial: SoapState;
  copy: ConsultationFormCopy;
  /** Omit to keep the form's old behaviour (sign, no prompt). */
  finalizePrompt?: FinalizePromptConfig;
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
  const [signConfirmOpen, setSignConfirmOpen] = useState(false);
  const signed = state.status === "SIGNED";

  // Post-sign finalize prompt.
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [finalizeFiles, setFinalizeFiles] = useState(
    finalizePrompt?.filesUploaded ?? false,
  );
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [finalizePending, startFinalizeTransition] = useTransition();
  // Local, so the prompt can't be raised twice in one session after the
  // doctor finalizes from it (the server state only arrives on refresh).
  const [finalizedHere, setFinalizedHere] = useState(false);
  const canPromptFinalize = Boolean(
    finalizePrompt &&
      !finalizePrompt.alreadyFinalized &&
      !finalizePrompt.cancelled &&
      !finalizedHere,
  );

  const dirty =
    !signed &&
    (state.chiefComplaint !== baseline.chiefComplaint ||
      state.subjective !== baseline.subjective ||
      state.objective !== baseline.objective ||
      state.assessment !== baseline.assessment ||
      state.plan !== baseline.plan ||
      state.noteFormat !== baseline.noteFormat ||
      state.note !== baseline.note);
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
        noteFormat: state.noteFormat,
        note: state.note.trim() || null,
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
    setSignConfirmOpen(true);
  }

  function confirmSign() {
    setSignConfirmOpen(false);
    const savedValues = state;
    startTransition(async () => {
      try {
        const saveRes = await fetch(
          `/api/doctor/appointments/${appointmentId}/consultation`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              chiefComplaint: state.chiefComplaint.trim() || null,
              subjective: state.subjective.trim() || null,
              objective: state.objective.trim() || null,
              assessment: state.assessment.trim() || null,
              plan: state.plan.trim() || null,
              noteFormat: state.noteFormat,
              note: state.note.trim() || null,
            }),
          },
        );
        const saveJson = (await saveRes.json()) as { ok?: boolean; message?: string };
        if (!saveRes.ok || !saveJson.ok) {
          setMessage({ kind: "error", text: saveJson.message ?? copy.couldNotSave });
          return;
        }

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
        setBaseline(savedValues);
        setMessage({ kind: "success", text: copy.signed });
        // The note is final — ask for the finalize now, while the doctor is
        // still on this consultation and thinks of it as finished.
        if (canPromptFinalize) {
          setFinalizeError(null);
          setFinalizeOpen(true);
        }
        router.refresh();
      } catch {
        setMessage({ kind: "error", text: copy.networkError });
      }
    });
  }

  function confirmFinalize() {
    if (!finalizePrompt) return;
    setFinalizeError(null);
    startFinalizeTransition(async () => {
      try {
        const result = await finalizeAppointment(appointmentId);
        if (!result.ok) {
          setFinalizeError(result.message ?? finalizePrompt.copy.couldNotFinalize);
          return;
        }
        setFinalizedHere(true);
        setFinalizeOpen(false);
        setMessage({ kind: "success", text: finalizePrompt.copy.finalized });
        router.refresh();
      } catch {
        setFinalizeError(copy.networkError);
      }
    });
  }

  const isFreeform = state.noteFormat === "FREEFORM";

  return (
    <div className="mt-4 grid gap-3" data-tour="soap-form">
      <div className="flex gap-2">
        <button
          type="button"
          aria-pressed={!isFreeform}
          onClick={() => update("noteFormat", "SOAP")}
          disabled={signed}
          className={
            !isFreeform
              ? "gh-btn gh-btn-primary px-3 py-1.5 text-portal-label"
              : "gh-btn gh-btn-soft px-3 py-1.5 text-portal-label"
          }
        >
          {copy.formatSoap}
        </button>
        <button
          type="button"
          aria-pressed={isFreeform}
          onClick={() => update("noteFormat", "FREEFORM")}
          disabled={signed}
          className={
            isFreeform
              ? "gh-btn gh-btn-primary px-3 py-1.5 text-portal-label"
              : "gh-btn gh-btn-soft px-3 py-1.5 text-portal-label"
          }
        >
          {copy.formatFreeform}
        </button>
      </div>

      <Field
        label={copy.fieldChiefComplaint}
        value={state.chiefComplaint}
        onChange={(v) => update("chiefComplaint", v)}
        disabled={signed}
        rows={2}
      />
      {isFreeform ? (
        <Field
          label={copy.fieldNote}
          helper={copy.fieldNoteHelper}
          value={state.note}
          onChange={(v) => update("note", v)}
          disabled={signed}
          rows={12}
        />
      ) : (
        <>
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
        </>
      )}

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

      <PortalDialog
        open={signConfirmOpen}
        onClose={() => setSignConfirmOpen(false)}
        title={copy.signDialogTitle}
        danger
        footer={
          <>
            <Btn variant="ghost" onClick={() => setSignConfirmOpen(false)}>
              {copy.cancel}
            </Btn>
            <Btn variant="danger" disabled={pending} onClick={confirmSign}>
              {pending ? copy.saving : copy.signDialogConfirm}
            </Btn>
          </>
        }
      >
        <p className="text-sm" style={{ color: "var(--portal-text-2)" }}>
          {copy.signConfirm}
        </p>
      </PortalDialog>

      {finalizePrompt ? (
        <PortalDialog
          open={finalizeOpen}
          onClose={() => setFinalizeOpen(false)}
          title={finalizePrompt.copy.title}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setFinalizeOpen(false)}>
                {finalizePrompt.copy.dismiss}
              </Btn>
              <Btn
                variant="primary"
                disabled={
                  finalizePending || !finalizePrompt.timeReached || !finalizeFiles
                }
                onClick={confirmFinalize}
              >
                {finalizePending
                  ? finalizePrompt.copy.finalizing
                  : finalizePrompt.copy.confirm}
              </Btn>
            </>
          }
        >
          <div className="grid gap-3">
            <p className="text-sm" style={{ color: "var(--portal-text-2)" }}>
              {finalizePrompt.copy.body}
            </p>

            {/* Same manual attestation the finalize checklist asks for — the
                system can't know which documents this consultation needed. */}
            <label className="flex items-center gap-2 rounded-md border border-[var(--portal-line)] bg-[var(--portal-well)] px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={finalizeFiles}
                onChange={(e) => setFinalizeFiles(e.target.checked)}
              />
              {finalizePrompt.copy.filesLabel}
            </label>

            {/* Same readiness rule the finalize checklist enforces — the
                server has no time guard, so the UI is what keeps a doctor
                from closing a consultation that hasn't happened yet. */}
            {!finalizePrompt.timeReached ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                {finalizePrompt.copy.timePendingHint}
              </p>
            ) : null}

            {finalizeError ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                {finalizeError}
              </p>
            ) : null}
          </div>
        </PortalDialog>
      ) : null}
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
