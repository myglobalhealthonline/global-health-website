"use client";

import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";

type ConfirmDeleteButtonProps = {
  /** Message shown in the browser confirm() dialog. */
  message: string;
  /** Optional className for outer button. Defaults to icon-style. */
  className?: string;
  /** Optional aria-label override. */
  ariaLabel?: string;
  /** Render children instead of the default Trash2 icon (e.g., "Delete permanently"). */
  children?: ReactNode;
  /** Inline style override (kept for parity with existing IconBtn usages). */
  style?: React.CSSProperties;
};

/**
 * Reusable submit button that gates form submission behind a window.confirm.
 * Use INSIDE a <form action={serverAction}> — this button only intercepts the
 * click; the form's server action still does the work.
 */
export function ConfirmDeleteButton({
  message,
  className,
  ariaLabel,
  children,
  style,
}: ConfirmDeleteButtonProps) {
  // Default styling kicks in only when caller didn't pass className —
  // i.e. the icon-only variant used in list-row trash buttons.
  const usingDefault = className == null;
  const finalClassName = className ?? "inline-flex items-center justify-center";
  const finalStyle =
    style ?? (usingDefault ? { color: "var(--color-status-error-text)" } : undefined);

  return (
    <button
      type="submit"
      aria-label={ariaLabel ?? "Delete"}
      className={finalClassName}
      style={finalStyle}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children ?? <Trash2 className="size-3.5" aria-hidden />}
    </button>
  );
}
