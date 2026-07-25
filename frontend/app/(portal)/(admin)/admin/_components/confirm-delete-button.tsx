"use client";

import { useRef, useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { PortalDialog } from "@/components/PortalDialog";

type ConfirmDeleteButtonProps = {
  /** Dialog body copy explaining the consequence of the action. */
  message: string;
  /** Optional className for the trigger button. Defaults to icon-style. */
  className?: string;
  /** Optional aria-label override for the trigger button. */
  ariaLabel?: string;
  /** Dialog title. Defaults to a generic "Confirm delete" — pass the real
   *  entity name (e.g. `Delete Dr. Smith?`) for higher-stakes deletes. */
  title?: ReactNode;
  /** Render children instead of the default Trash2 icon (e.g., "Delete permanently"). */
  children?: ReactNode;
  /** Inline style override (kept for parity with existing IconBtn usages). */
  style?: React.CSSProperties;
  /**
   * When set, the confirm dialog requires the admin to type this exact
   * string (e.g. the doctor's full name or a country slug) before the
   * destructive button enables. Use for the highest-stakes deletes only —
   * lower-stakes deletes (assets, etc.) should leave this unset.
   */
  requireTypedConfirmation?: string;
  /** Disable the trigger entirely (e.g. form is in an invalid state). */
  disabled?: boolean;
};

/**
 * Reusable submit button that gates form submission behind a PortalDialog
 * confirmation (danger-styled). Use INSIDE a <form action={serverAction}> —
 * this button only intercepts the click and, once confirmed, programmatically
 * submits the form; the server action still does the work.
 */
export function ConfirmDeleteButton({
  message,
  className,
  ariaLabel,
  title,
  children,
  style,
  requireTypedConfirmation,
  disabled,
}: ConfirmDeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [typedValue, setTypedValue] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Default styling kicks in only when caller didn't pass className —
  // i.e. the icon-only variant used in list-row trash buttons.
  const usingDefault = className == null;
  const finalClassName = className ?? "gh-icon-btn gh-confirm-delete-button inline-flex items-center justify-center";
  const finalStyle =
    style ?? (usingDefault ? { color: "var(--color-status-error-text)" } : undefined);

  const canConfirm = !requireTypedConfirmation || typedValue.trim() === requireTypedConfirmation;

  function handleConfirm() {
    setOpen(false);
    setTypedValue("");
    // Submit the enclosing form so the caller's server action runs.
    triggerRef.current?.form?.requestSubmit();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel ?? "Delete"}
        className={finalClassName}
        style={finalStyle}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {children ?? <Trash2 className="size-3.5" aria-hidden />}
      </button>

      <PortalDialog
        open={open}
        onClose={() => {
          setOpen(false);
          setTypedValue("");
        }}
        title={title ?? "Confirm delete"}
        danger
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="gh-btn gh-btn-soft"
              onClick={() => {
                setOpen(false);
                setTypedValue("");
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="gh-btn gh-btn-danger"
              disabled={!canConfirm}
              onClick={handleConfirm}
            >
              {children ?? "Delete"}
            </button>
          </div>
        }
      >
        <p className="text-sm text-[var(--color-text-primary)]">{message}</p>
        {requireTypedConfirmation ? (
          <label className="mt-4 flex flex-col gap-1 text-xs text-[var(--color-text-muted)]">
            <span>
              Type <strong className="font-mono">{requireTypedConfirmation}</strong> to confirm
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
        ) : null}
      </PortalDialog>
    </>
  );
}
