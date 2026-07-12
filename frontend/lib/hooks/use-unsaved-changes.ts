"use client";

import { useEffect } from "react";

/**
 * Shared unsaved-changes guard (patient-audit 17-002 / 18-002 / 19-001).
 *
 * Module-level dirty counter, incremented while any mounted form reports
 * `isDirty`. Two consumers read it:
 *  - `useUnsavedChanges` itself, for the `beforeunload` guard (hard nav:
 *    refresh/close/external link).
 *  - `UnsavedChangesGuard` (`components/UnsavedChangesGuard.tsx`, mounted
 *    once in the account layout), for the in-app click-intercept + confirm
 *    dialog, since Next's App Router has no router-transition events to
 *    hook into directly.
 */
type Listener = () => void;

let dirtyCount = 0;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

export function isUnsavedChangesActive() {
  return dirtyCount > 0;
}

export function subscribeUnsavedChanges(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Used only by the confirm dialog's "Discard changes" action — the
 *  navigation it triggers unmounts every dirty form, so their own cleanup
 *  would otherwise race the guard's own reset. */
export function forceClearUnsavedChanges() {
  dirtyCount = 0;
  notify();
}

/** Registers a form's dirty state with the shared guard. Call with the
 *  form's own `isDirty` boolean (e.g. `JSON.stringify(values) !== JSON.stringify(initial)`). */
export function useUnsavedChanges(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;
    dirtyCount++;
    notify();
    return () => {
      dirtyCount = Math.max(0, dirtyCount - 1);
      notify();
    };
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);
}
