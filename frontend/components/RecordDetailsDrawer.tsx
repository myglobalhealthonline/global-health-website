"use client";

import { useCallback, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AppSheet, type AppSheetSize, type AppSheetTheme } from "@/components/AppSheet";

/**
 * RecordDetailsDrawer — wraps AppSheet with the record-header/sections/footer
 * shape used by the portal "quick view" drawers (DRAWER_ARCHITECTURE_PLAN
 * §1/§5, e.g. D-01..D-06). Per-field empty convention: render `"—"` (em
 * dash), never leave a field blank — callers pass it through `render()`.
 *
 * URL binding (optional): pass `paramKey` + `paramValue` to sync open state
 * to `?<paramKey>=<paramValue>` via shallow `router.replace` (no scroll, no
 * history entry per navigation) — deep link opens it, close/back removes the
 * param. Omit both for action-only drawers that don't need a URL.
 */
export function RecordDetailsDrawer({
  open,
  onOpenChange,
  paramKey,
  paramValue,
  title,
  eyebrow,
  summary,
  footer,
  loading = false,
  loadingSkeleton,
  error,
  onRetry,
  dirty = false,
  size = "md",
  theme = "portal",
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Query param name this drawer's open state binds to, e.g. "order". */
  paramKey?: string;
  /** Value written to the URL when open, e.g. the record id. */
  paramValue?: string;
  title: ReactNode;
  eyebrow?: ReactNode;
  /** Summary row under the title — key facts (status pill, total, etc). */
  summary?: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
  loadingSkeleton?: ReactNode;
  error?: ReactNode;
  onRetry?: () => void;
  /** Confirm before closing when a form inside the drawer is dirty. */
  dirty?: boolean;
  size?: AppSheetSize;
  theme?: AppSheetTheme;
  children?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [confirmingClose, setConfirmingClose] = useState(false);

  const clearParam = useCallback(() => {
    if (!paramKey) return;
    const next = new URLSearchParams(searchParams.toString());
    next.delete(paramKey);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [paramKey, pathname, router, searchParams]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next && dirty && !confirmingClose) {
        if (!window.confirm("Discard unsaved changes?")) return;
      }
      setConfirmingClose(false);
      if (!next) clearParam();
      onOpenChange(next);
    },
    [dirty, confirmingClose, clearParam, onOpenChange],
  );

  // Deep-link open: if paramKey/paramValue are supplied, the parent page is
  // expected to read searchParams and pass `open` accordingly — this
  // component only owns the close/clear side of the binding.
  void paramValue;

  return (
    <AppSheet
      open={open}
      onOpenChange={handleOpenChange}
      size={size}
      theme={theme}
      ariaLabel={typeof title === "string" ? title : undefined}
      header={
        <div className="gh-record-drawer__title-block">
          {eyebrow ? <span className="gh-record-drawer__eyebrow">{eyebrow}</span> : null}
          <h2 className="gh-record-drawer__title">{title}</h2>
          {summary ? <div className="gh-record-drawer__summary">{summary}</div> : null}
        </div>
      }
      footer={footer}
    >
      {error ? (
        <div className="gh-record-drawer__error" role="alert">
          <p>{error}</p>
          {onRetry ? (
            <button type="button" className="gh-record-drawer__retry" onClick={onRetry}>
              Retry
            </button>
          ) : null}
        </div>
      ) : loading ? (
        loadingSkeleton ?? <RecordDetailsDrawerSkeleton />
      ) : (
        <div className="gh-record-drawer__sections">{children}</div>
      )}
    </AppSheet>
  );
}

/** Default skeleton — 3 section-shaped bars. Callers can pass their own via `loadingSkeleton`. */
function RecordDetailsDrawerSkeleton() {
  return (
    <div className="gh-record-drawer__skeleton" aria-hidden>
      <div className="gh-record-drawer__skeleton-line" style={{ width: "60%" }} />
      <div className="gh-record-drawer__skeleton-line" style={{ width: "90%" }} />
      <div className="gh-record-drawer__skeleton-line" style={{ width: "75%" }} />
      <div className="gh-record-drawer__skeleton-line" style={{ width: "40%" }} />
    </div>
  );
}

/** Section wrapper — heading + field list, for use inside a drawer's children. */
export function RecordDetailsSection({
  title,
  children,
}: {
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="gh-record-drawer__section">
      <h3 className="gh-record-drawer__section-title">{title}</h3>
      <div className="gh-record-drawer__section-body">{children}</div>
    </section>
  );
}

/** Single field row. Value defaults to an em dash when nullish/empty — the
 *  drawer's per-field empty convention (never a blank section). */
export function RecordDetailsField({
  label,
  value,
}: {
  label: ReactNode;
  value: ReactNode;
}) {
  const isEmpty = value === null || value === undefined || value === "";
  return (
    <div className="gh-record-drawer__field">
      <span className="gh-record-drawer__field-label">{label}</span>
      <span className="gh-record-drawer__field-value">{isEmpty ? "—" : value}</span>
    </div>
  );
}
