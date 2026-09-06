"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { PortalDialog } from "@/components/PortalDialog";
import type { CountryDeleteImpact } from "@/lib/admin/admin-api";
import {
  COUNTRY_BLOCKER_LABELS,
  COUNTRY_CONFIG_LABELS,
  canConfirmCountryDelete,
  describeCounts,
  parseCountryImpactResponse,
  type CountryImpactLoad,
} from "./country-delete-impact";

type DeleteCountryButtonProps = {
  countryId: string;
  countryName: string;
  /** Typed into the confirm field to arm the delete — the country slug. */
  confirmValue: string;
  className?: string;
  ariaLabel?: string;
  style?: React.CSSProperties;
  /** Render instead of the default trash icon (e.g. "Delete permanently"). */
  children?: ReactNode;
};

/**
 * Permanent-delete trigger for a country (AZ-3).
 *
 * A country is the root of an 80-table cascade closure, so on open this asks
 * the backend what a delete would touch and refuses to arm when the market
 * still holds membership, financial, appointment, patient, clinical, legal or
 * corporate history.
 *
 * This is a WARNING, not the guard. `purgeAdminCountry` recomputes every
 * blocker inside the deletion transaction, under a row lock, and rejects with
 * a 409 whatever this dialog showed or the admin confirmed. Nothing here is
 * load-bearing for safety, which is why an impact request that fails still
 * lets the admin proceed — the server decides.
 *
 * Same shape as `DeleteDoctorButton`, and on the same `PortalDialog`: this is
 * the established pattern for a delete that needs an impact check, not a
 * second modal framework. `ConfirmDeleteButton` stays untouched for the plain
 * type-to-confirm deletes it serves everywhere else.
 *
 * Use INSIDE a <form action={serverAction}> — on confirm it submits the form.
 */
export function DeleteCountryButton({
  countryId,
  countryName,
  confirmValue,
  className,
  ariaLabel,
  style,
  children,
}: DeleteCountryButtonProps) {
  const [open, setOpen] = useState(false);
  const [typedValue, setTypedValue] = useState("");
  const [pending, setPending] = useState(false);
  const [load, setLoad] = useState<CountryImpactLoad>({ status: "loading" });
  const triggerRef = useRef<HTMLButtonElement>(null);

  const usingDefault = className == null;
  const finalClassName =
    className ?? "gh-icon-btn gh-confirm-delete-button inline-flex items-center justify-center";
  const finalStyle =
    style ?? (usingDefault ? { color: "var(--color-status-error-text)" } : undefined);

  const loadImpact = useCallback(async () => {
    setLoad({ status: "loading" });
    try {
      const response = await fetch(`/api/admin/countries/${countryId}/delete-impact`, {
        cache: "no-store",
      });
      const json = (await response.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        data?: CountryDeleteImpact;
      } | null;
      setLoad(parseCountryImpactResponse(response.status, json));
    } catch {
      setLoad({ status: "error", message: "Could not reach the server to check linked records." });
    }
  }, [countryId]);

  function handleOpen() {
    setOpen(true);
    setTypedValue("");
    setPending(false);
    void loadImpact();
  }

  function handleClose() {
    setOpen(false);
    setTypedValue("");
  }

  const blocked = load.status === "ready" && load.impact.blocked;
  const canConfirm = canConfirmCountryDelete({
    load,
    typedValue,
    requiredValue: confirmValue,
    pending,
  });

  function handleConfirm() {
    if (!canConfirm) return;
    // The form submit navigates, so `pending` only has to survive until then —
    // it exists to swallow a second click while the first is in flight.
    setPending(true);
    setOpen(false);
    setTypedValue("");
    triggerRef.current?.form?.requestSubmit();
  }

  const configSummary =
    load.status === "ready"
      ? describeCounts(load.impact.removableConfiguration, COUNTRY_CONFIG_LABELS)
      : "";
  const detachedSummary =
    load.status === "ready"
      ? describeCounts(load.impact.detachedRecords, {
          blogPosts: ["blog post", "blog posts"],
          faqs: ["FAQ", "FAQs"],
          reviews: ["review", "reviews"],
        })
      : "";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel ?? `Delete ${countryName}`}
        className={finalClassName}
        style={finalStyle}
        disabled={pending}
        onClick={handleOpen}
      >
        {children ?? <Trash2 className="size-3.5" aria-hidden />}
      </button>

      <PortalDialog
        open={open}
        onClose={handleClose}
        title={blocked ? `Cannot delete ${countryName}` : `Delete ${countryName}?`}
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
                Delete permanently
              </button>
            )}
          </div>
        }
      >
        {load.status === "loading" ? (
          <p className="text-sm text-[var(--color-text-muted)]">Checking linked records…</p>
        ) : null}

        {load.status === "missing" ? (
          <p className="text-sm text-[var(--color-text-primary)]">
            This country no longer exists — it may already have been deleted. Refresh the list.
          </p>
        ) : null}

        {load.status === "error" ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-[var(--color-status-error-text)]">{load.message}</p>
            <p className="text-sm text-[var(--color-text-muted)]">
              You can still delete — the server re-checks and refuses if any linked records exist.
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
              This country still has {describeCounts(load.impact.blockers, COUNTRY_BLOCKER_LABELS)}{" "}
              on file. Deleting it would remove or orphan those records, so it cannot be deleted.
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
              Deactivate the country instead — it disappears from the public site and every record
              stays intact.
            </p>
          </div>
        ) : null}

        {load.status === "ready" && !load.impact.blocked ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-[var(--color-text-primary)]">
              Permanently delete {countryName}? Nothing durable is linked to this market, so this
              removes its configuration only. It cannot be undone.
            </p>
            {configSummary ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                This deletes {configSummary}.
              </p>
            ) : null}
            {detachedSummary ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                {detachedSummary} stay, but lose their country link.
              </p>
            ) : null}
          </div>
        ) : null}

        {blocked || load.status === "missing" ? null : (
          <label className="mt-4 flex flex-col gap-1 text-xs text-[var(--color-text-muted)]">
            <span>
              Type <strong className="font-mono">{confirmValue}</strong> to confirm
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
