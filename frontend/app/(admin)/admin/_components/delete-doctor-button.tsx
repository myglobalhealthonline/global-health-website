"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { PortalDialog } from "@/components/PortalDialog";
import type { DoctorDeleteBlockers, DoctorDeleteImpact } from "@/lib/admin/admin-api";

type DeleteDoctorButtonProps = {
  doctorId: string;
  /** Typed into the confirm field to arm the delete. Also used in the copy. */
  doctorName: string;
  className?: string;
  ariaLabel?: string;
  style?: React.CSSProperties;
  /** Render instead of the default trash icon (e.g. "Delete permanently"). */
  children?: ReactNode;
};

const BLOCKER_LABELS: Record<keyof DoctorDeleteBlockers, [string, string]> = {
  consultations: ["consultation", "consultations"],
  prescriptions: ["prescription", "prescriptions"],
  examResults: ["exam result", "exam results"],
  generatedDocuments: ["generated document", "generated documents"],
  appointmentDocuments: ["attached document", "attached documents"],
  medicalNotes: ["medical note", "medical notes"],
};

function describeBlockers(blockers: DoctorDeleteBlockers): string {
  return Object.entries(blockers)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => {
      const [singular, plural] = BLOCKER_LABELS[key as keyof DoctorDeleteBlockers];
      return `${count} ${count === 1 ? singular : plural}`;
    })
    .join(", ");
}

type LoadState =
  | { status: "loading" }
  | { status: "ready"; impact: DoctorDeleteImpact }
  | { status: "error"; message: string };

/**
 * Delete trigger for a doctor profile. On open it asks the backend what the
 * delete would touch, then adapts:
 *
 *  - retained medical records exist -> refuse, point at Deactivate
 *  - future appointments exist      -> warn with the count, delete once confirmed
 *  - nothing linked                 -> plain permanent-delete confirm
 *
 * Use INSIDE a <form action={serverAction}> — on confirm this submits the form,
 * adding `force=true` only when the admin actually saw the appointment warning.
 */
export function DeleteDoctorButton({
  doctorId,
  doctorName,
  className,
  ariaLabel,
  style,
  children,
}: DeleteDoctorButtonProps) {
  const [open, setOpen] = useState(false);
  const [typedValue, setTypedValue] = useState("");
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const triggerRef = useRef<HTMLButtonElement>(null);

  const usingDefault = className == null;
  const finalClassName =
    className ?? "gh-icon-btn gh-confirm-delete-button inline-flex items-center justify-center";
  const finalStyle =
    style ?? (usingDefault ? { color: "var(--color-status-error-text)" } : undefined);

  const loadImpact = useCallback(async () => {
    setLoad({ status: "loading" });
    try {
      const response = await fetch(`/api/admin/doctors/${doctorId}/delete-impact`, {
        cache: "no-store",
      });
      const json = (await response.json()) as {
        ok?: boolean;
        message?: string;
        data?: DoctorDeleteImpact;
      };
      if (!response.ok || !json.ok || !json.data) {
        setLoad({ status: "error", message: json.message ?? "Could not check linked records." });
        return;
      }
      setLoad({ status: "ready", impact: json.data });
    } catch {
      setLoad({ status: "error", message: "Could not reach the server to check linked records." });
    }
  }, [doctorId]);

  function handleOpen() {
    setOpen(true);
    setTypedValue("");
    void loadImpact();
  }

  function handleClose() {
    setOpen(false);
    setTypedValue("");
  }

  const blocked = load.status === "ready" && load.impact.blocked;
  const futureAppointments = load.status === "ready" ? load.impact.futureAppointments : 0;

  // Only force past the appointment guard when we actually showed the warning.
  // If the check failed we submit unforced and let the backend decide.
  const force = load.status === "ready" && !blocked && futureAppointments > 0;

  const canConfirm =
    load.status !== "loading" && !blocked && typedValue.trim() === doctorName;

  function handleConfirm() {
    if (!canConfirm) return;
    setOpen(false);
    setTypedValue("");
    triggerRef.current?.form?.requestSubmit();
  }

  return (
    <>
      <input type="hidden" name="force" value={force ? "true" : "false"} />
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel ?? `Delete ${doctorName}`}
        className={finalClassName}
        style={finalStyle}
        onClick={handleOpen}
      >
        {children ?? <Trash2 className="size-3.5" aria-hidden />}
      </button>

      <PortalDialog
        open={open}
        onClose={handleClose}
        title={blocked ? `Cannot delete Dr. ${doctorName}` : `Delete Dr. ${doctorName}?`}
        danger
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="gh-btn gh-btn-soft" onClick={handleClose}>
              {blocked ? "Close" : "Cancel"}
            </button>
            {blocked ? null : (
              <button
                type="button"
                className="gh-btn gh-btn-danger"
                disabled={!canConfirm}
                onClick={handleConfirm}
              >
                {futureAppointments > 0 ? "Delete anyway" : "Delete"}
              </button>
            )}
          </div>
        }
      >
        {load.status === "loading" ? (
          <p className="text-sm text-[var(--color-text-muted)]">Checking linked records…</p>
        ) : null}

        {load.status === "error" ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-[var(--color-status-error-text)]">{load.message}</p>
            <p className="text-sm text-[var(--color-text-muted)]">
              You can still delete — the server re-checks and will refuse if medical records exist.
            </p>
            <button
              type="button"
              className="gh-btn gh-btn-soft self-start"
              onClick={() => void loadImpact()}
            >
              Retry check
            </button>
          </div>
        ) : null}

        {load.status === "ready" && load.impact.blocked ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-[var(--color-text-primary)]">
              This doctor has {describeBlockers(load.impact.blockers)} on file. Medical records must
              be retained, so this profile cannot be deleted.
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
              Deactivate the profile instead — it hides the doctor from the public listing and keeps
              the records intact.
            </p>
          </div>
        ) : null}

        {load.status === "ready" && !load.impact.blocked ? (
          <div className="flex flex-col gap-2">
            {load.impact.futureAppointments > 0 ? (
              <p className="text-sm text-[var(--color-text-primary)]">
                There {load.impact.futureAppointments === 1 ? "is" : "are"}{" "}
                <strong>
                  {load.impact.futureAppointments} future appointment
                  {load.impact.futureAppointments === 1 ? "" : "s"}
                </strong>{" "}
                linked to this doctor. Are you sure you want to delete?
              </p>
            ) : (
              <p className="text-sm text-[var(--color-text-primary)]">
                Permanently delete doctor &quot;{doctorName}&quot;? This removes their profile and
                cannot be undone.
              </p>
            )}
            {load.impact.futureAppointments + load.impact.pastAppointments > 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                The {load.impact.futureAppointments + load.impact.pastAppointments} linked
                appointment
                {load.impact.futureAppointments + load.impact.pastAppointments === 1 ? "" : "s"} are
                kept, but become unassigned — reassign them from the Appointments page.
              </p>
            ) : null}
          </div>
        ) : null}

        {blocked ? null : (
          <label className="mt-4 flex flex-col gap-1 text-xs text-[var(--color-text-muted)]">
            <span>
              Type <strong className="font-mono">{doctorName}</strong> to confirm
            </span>
            <input
              type="text"
              className="gh-input"
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </label>
        )}
      </PortalDialog>
    </>
  );
}
