"use client";

import { useEffect, useRef, useState } from "react";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";
import { observeForm } from "./form-events";

/**
 * Registers the `<form>` it sits in with the shared unsaved-changes guard —
 * the same `useUnsavedChanges` + `UnsavedChangesGuard` pair the account and
 * doctor portals use, so the admin editors warn with the identical dialog and
 * `beforeunload` prompt rather than a second convention.
 *
 * Those portals' forms are controlled clients that can diff values against
 * their initial state. The doctor and service editors are server-rendered and
 * uncontrolled — every field is a `defaultValue` the server action reads back
 * out of FormData — so dirtiness comes from the form's own bubbled `input` /
 * `change` events instead. Coarser (typing a character and deleting it still
 * counts as dirty) but it needs no rewrite of two large editors into
 * controlled state, which is exactly the kind of change that quietly alters a
 * submitted payload.
 *
 * Renders nothing: no markup to disturb the layout, and no named control to
 * disturb the FormData.
 */
export function UnsavedFormTracker() {
  const [dirty, setDirty] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    // Delegated from the document, not the form: the doctor editor's
    // profile-photo card and practising-in checkboxes are submitted through
    // `form="doctor-edit-form"` from outside the form element, and their
    // events never bubble through it. `observeForm` filters by `.form`.
    return observeForm(form, { onDirty: setDirty }, form.ownerDocument);
  }, []);

  useUnsavedChanges(dirty);

  return <span ref={ref} hidden aria-hidden />;
}
