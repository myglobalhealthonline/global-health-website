"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type SoapState = {
  chiefComplaint: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  status: "DRAFT" | "SIGNED";
  signedAt: string | null;
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
}: {
  appointmentId: string;
  initial: SoapState;
}) {
  const router = useRouter();
  const [state, setState] = useState<SoapState>(initial);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<
    { kind: "success" | "error"; text: string } | null
  >(null);
  const signed = state.status === "SIGNED";

  function update<K extends keyof SoapState>(key: K, value: SoapState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function save() {
    setMessage(null);
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
          setMessage({ kind: "error", text: json.message ?? "Could not save" });
          return;
        }
        if (json.data?.consultation) {
          setState((prev) => ({
            ...prev,
            status: json.data!.consultation!.status,
            signedAt: json.data!.consultation!.signedAt ?? null,
          }));
        }
        setMessage({ kind: "success", text: "Saved" });
        router.refresh();
      } catch {
        setMessage({ kind: "error", text: "Network error" });
      }
    });
  }

  function sign() {
    setMessage(null);
    if (
      !confirm(
        "Sign this consultation? Once signed, the note is locked and can't be edited.",
      )
    ) {
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
          setMessage({ kind: "error", text: json.message ?? "Could not sign" });
          return;
        }
        if (json.data?.consultation) {
          setState((prev) => ({
            ...prev,
            status: json.data!.consultation!.status,
            signedAt: json.data!.consultation!.signedAt ?? null,
          }));
        }
        setMessage({ kind: "success", text: "Signed" });
        router.refresh();
      } catch {
        setMessage({ kind: "error", text: "Network error" });
      }
    });
  }

  return (
    <div className="mt-4 grid gap-3">
      <Field
        label="Chief complaint"
        value={state.chiefComplaint}
        onChange={(v) => update("chiefComplaint", v)}
        disabled={signed}
        rows={2}
      />
      <Field
        label="Subjective"
        helper="What the patient reports — history, symptoms, context."
        value={state.subjective}
        onChange={(v) => update("subjective", v)}
        disabled={signed}
        rows={5}
      />
      <Field
        label="Objective"
        helper="Observable findings — vitals, exam, results reviewed."
        value={state.objective}
        onChange={(v) => update("objective", v)}
        disabled={signed}
        rows={5}
      />
      <Field
        label="Assessment"
        helper="Clinical impression / differential."
        value={state.assessment}
        onChange={(v) => update("assessment", v)}
        disabled={signed}
        rows={4}
      />
      <Field
        label="Plan"
        helper="Prescriptions, follow-up, referrals."
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
        <p className="text-[12px] text-[var(--color-text-muted)]">
          {signed
            ? `Signed ${state.signedAt ? new Date(state.signedAt).toLocaleString() : ""}`
            : "Drafts are visible to you and admin until signed."}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={pending || signed}
            className="gh-btn gh-btn-soft"
          >
            {pending ? "Saving…" : "Save draft"}
          </button>
          <button
            type="button"
            onClick={sign}
            disabled={pending || signed}
            className="gh-btn gh-btn-primary"
          >
            {signed ? "Signed" : "Save & sign"}
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
        <span className="text-[11.5px] text-[var(--color-text-muted)]">
          {helper}
        </span>
      ) : null}
    </label>
  );
}
