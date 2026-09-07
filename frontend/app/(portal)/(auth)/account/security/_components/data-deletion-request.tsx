"use client";

import { useState } from "react";
import { FileWarning } from "lucide-react";
import { PortalDialog } from "@/components/PortalDialog";
import { formatAppDate } from "@/lib/format-datetime";

/** The subset of `DataDeletionRequest` the account portal renders. */
export type DataDeletionRequestSummary = {
  id: string;
  requestStatus: string;
  requestedAt: string;
};

/** A request in one of these states is still with the privacy team, so the
 *  patient must not stack a second one on top of it. COMPLETED / REJECTED are
 *  finished, and asking again after either is legitimate. */
const OPEN_STATUSES = new Set(["SUBMITTED", "UNDER_REVIEW", "PARTIALLY_COMPLETED"]);

export function isDeletionRequestOpen(request: DataDeletionRequestSummary | null): boolean {
  return request !== null && OPEN_STATUSES.has(request.requestStatus);
}

export type DataDeletionI18n = {
  formalRequestCta: string;
  formalRequestDialogTitle: string;
  formalRequestDialogBody: string;
  formalRequestReasonLabel: string;
  formalRequestReasonPlaceholder: string;
  formalRequestSubmit: string;
  formalRequestSubmitting: string;
  formalRequestPending: string;
  formalRequestFailed: string;
  cancel: string;
};

/**
 * PR-2: the formal, admin-reviewed GDPR erasure request. The backend endpoint
 * and the /admin review queue already existed; nothing in the frontend called
 * them. Sits beside the self-service 30-day deletion as the secondary action:
 * that one the patient schedules and cancels themselves, this one the privacy
 * team reviews and can reject or satisfy by anonymising retained records.
 */
export function DataDeletionRequestAction({
  i18n,
  request,
  onSubmitted,
}: {
  i18n: DataDeletionI18n;
  request: DataDeletionRequestSummary | null;
  onSubmitted: (request: DataDeletionRequestSummary) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isDeletionRequestOpen(request) && request) {
    return (
      <p className="gh-status-info rounded-[var(--radius-card-sm)] border px-3 py-2 text-sm">
        {i18n.formalRequestPending.replace("{date}", formatAppDate(request.requestedAt))}
      </p>
    );
  }

  async function onConfirm() {
    setSubmitting(true);
    setError(null);
    let json: {
      ok?: boolean;
      data?: { requestId?: string };
      message?: string;
    } = {};
    try {
      const res = await fetch("/api/account/data-deletion", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(reason.trim() ? { reason: reason.trim() } : {}),
      });
      json = (await res.json().catch(() => ({}))) as typeof json;
    } catch {
      json = {};
    }
    setSubmitting(false);
    if (json.ok && json.data?.requestId) {
      setOpen(false);
      setReason("");
      onSubmitted({
        id: json.data.requestId,
        requestStatus: "SUBMITTED",
        requestedAt: new Date().toISOString(),
      });
      return;
    }
    setError(json.message ?? i18n.formalRequestFailed);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[var(--portal-line-strong)] px-4 py-2 text-sm font-semibold text-[var(--portal-text-2)] hover:bg-[var(--portal-well)] sm:w-auto"
      >
        <FileWarning className="size-4" aria-hidden />
        {i18n.formalRequestCta}
      </button>

      {error && !open ? (
        <p role="alert" className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      {open ? (
        <PortalDialog
          open
          onClose={() => {
            if (!submitting) setOpen(false);
          }}
          title={i18n.formalRequestDialogTitle}
          width="sm"
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="rounded-md border border-[var(--portal-line-strong)] px-4 py-2 text-sm font-semibold text-[var(--portal-text-2)] hover:bg-[var(--portal-well)] disabled:opacity-60"
              >
                {i18n.cancel}
              </button>
              <button
                type="button"
                onClick={() => void onConfirm()}
                disabled={submitting}
                className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {submitting ? i18n.formalRequestSubmitting : i18n.formalRequestSubmit}
              </button>
            </div>
          }
        >
          <p className="text-sm text-[var(--portal-muted)]">{i18n.formalRequestDialogBody}</p>
          <label className="mt-4 block text-sm font-medium text-[var(--portal-text)]">
            {i18n.formalRequestReasonLabel}
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder={i18n.formalRequestReasonPlaceholder}
              className="mt-1 w-full rounded-md border border-[var(--portal-line)] bg-[var(--portal-surface)] px-3 py-2 text-sm text-[var(--portal-text)]"
            />
          </label>
          {error ? (
            <p role="alert" className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </p>
          ) : null}
        </PortalDialog>
      ) : null}
    </>
  );
}
