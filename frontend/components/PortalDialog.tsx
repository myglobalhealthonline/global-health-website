"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { IconBtn } from "@/components/portal-atoms";

export type PortalDialogWidth = "sm" | "lg" | "full";

/**
 * PortalDialog — DESIGN.md §5.13. L4 white panel, focus trap + Esc + return
 * focus, mobile bottom-sheet. New primitive shared by all three portals;
 * absorbs confirm-delete-button, consultation-documents-modal,
 * delete-account-button, EventDetailDialog — migrated one at a time.
 */
export function PortalDialog({
  open,
  onClose,
  title,
  danger = false,
  width = "sm",
  footer,
  noBodyPadding = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** 5px danger dot before the title — destructive dialogs. */
  danger?: boolean;
  width?: PortalDialogWidth;
  footer?: ReactNode;
  /** Edge-to-edge body for content that supplies its own padding/scroll
   *  (e.g. an embedded chat thread). */
  noBodyPadding?: boolean;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  // Portal to <body> so the fixed overlay escapes any ancestor stacking context
  // (lux glass cards use backdrop-filter/transform, which would otherwise trap it
  // behind sibling cards). Mount-gated to stay SSR-safe.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe mount flag, must run post-hydration
  useEffect(() => setMounted(true), []);

  // Callers rarely memoize `onClose` (a fresh arrow/function each render is
  // the norm), so it can't be a dependency below — the effect it would
  // trigger steals focus back to the panel's first element (see below),
  // which would refire on every keystroke in any field inside the dialog.
  // A ref keeps the Escape handler on the latest callback without that.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    function queryFocusable(): NodeListOf<HTMLElement> | undefined {
      return panel?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
    }
    queryFocusable()?.[0]?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      // Query fresh on every Tab press — content can change while open
      // (tabs, async-loaded fields), so a mount-time snapshot goes stale.
      const focusable = queryFocusable();
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
    // Intentionally omits `onClose` — see onCloseRef above. Re-running this
    // effect on every render would steal focus back to the panel's first
    // focusable element (its header close button), not wherever the user
    // is currently typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="gh-portal-dialog-overlay" role="presentation" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gh-portal-dialog-title"
        className={`gh-portal-dialog gh-portal-dialog--${width}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="gh-portal-dialog__header">
          <h2 id="gh-portal-dialog-title" className="gh-portal-dialog__title">
            {danger ? <span aria-hidden className="gh-portal-dialog__danger-dot" /> : null}
            {title}
          </h2>
          <IconBtn ariaLabel="Close" onClick={onClose}>
            <X className="size-4" aria-hidden />
          </IconBtn>
        </div>
        <div className={`gh-portal-dialog__body${noBodyPadding ? " gh-portal-dialog__body--flush" : ""}`}>
          {children}
        </div>
        {footer ? <div className="gh-portal-dialog__footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
