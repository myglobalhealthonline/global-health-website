"use client";

import {
  useEffect,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

/**
 * Submit controls that lock themselves while their server action is in
 * flight, so the admin editors can't send the same payload twice.
 *
 * Native `disabled` does the work: a disabled submit button dispatches no
 * `click`, is skipped by keyboard activation, and is not an implicit
 * submitter — so mouse, keyboard and Enter all close with one attribute and
 * no click-guard state of our own to get out of step.
 *
 * Same shape as the manual-booking form's local `SubmitButton`
 * (`admin/appointments/_components/manual-booking-form.tsx`), promoted here
 * because the doctor and service editors need the identical thing.
 */

/* ── Cross-island pending state ──────────────────────────────────────────
 * `useFormStatus` only reads the nearest ANCESTOR form, and the doctor
 * editor has a second "Save changes" in the sidebar — a sibling of the form,
 * tied to it by `form="doctor-edit-form"`. It needs the same pending flag,
 * so the in-form button publishes what `useFormStatus` tells it and the
 * outside one subscribes.
 *
 * Deliberately NOT a `submit` listener on the outside button: the editor's
 * error branch redirects to the SAME route, which is a soft navigation, so
 * client state at that tree position survives and a locally-held `pending`
 * would latch disabled forever after a failed save. React owns the real
 * signal; this store only carries it across the gap.
 *
 * Same module-level store + listener-set shape as
 * `lib/hooks/use-unsaved-changes.ts`, which solves the same cross-island
 * problem for dirty state. */
const pendingForms = new Set<string>();
const pendingListeners = new Set<() => void>();

function subscribeFormPending(listener: () => void) {
  pendingListeners.add(listener);
  return () => {
    pendingListeners.delete(listener);
  };
}

/** Exported for the unit suite — the store is the load-bearing part. */
export function setFormPending(formId: string, pending: boolean) {
  if (pending) pendingForms.add(formId);
  else pendingForms.delete(formId);
  for (const listener of pendingListeners) listener();
}

export function isFormPending(formId: string) {
  return pendingForms.has(formId);
}

type SubmitProps = {
  children: ReactNode;
  /** Label while the action runs. Defaults to the idle label. */
  busyLabel?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

function SubmitBody({
  pending,
  busyLabel,
  children,
}: {
  pending: boolean;
  busyLabel?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {pending ? busyLabel ?? children : children}
    </>
  );
}

/** A disabled button drops focus to `<body>`, and an attribute change on an
 *  unfocused element is announced by nothing — so the busy state gets a live
 *  region of its own. A `<span>` adds no form control, so the FormData the
 *  server action parses is unchanged. */
function BusyAnnouncement({ label }: { label: ReactNode }) {
  return (
    <span aria-live="polite" className="sr-only">
      {label}
    </span>
  );
}

/**
 * For a button INSIDE its `<form>` — the ordinary case.
 *
 * Pass `formId` when the same form also has a submit control outside it; the
 * button then publishes its pending state for that control to read.
 */
export function PendingSubmitButton({
  children,
  busyLabel,
  className = "gh-btn gh-btn-primary",
  style,
  formId,
}: SubmitProps & { formId?: string }) {
  const { pending } = useFormStatus();

  useEffect(() => {
    if (!formId) return;
    setFormPending(formId, pending);
    return () => setFormPending(formId, false);
  }, [formId, pending]);

  return (
    <>
      <button
        type="submit"
        className={className}
        style={style}
        disabled={pending}
        aria-busy={pending}
      >
        <SubmitBody pending={pending} busyLabel={busyLabel}>
          {children}
        </SubmitBody>
      </button>
      <BusyAnnouncement label={pending ? busyLabel ?? children : null} />
    </>
  );
}

/**
 * For a button OUTSIDE the form it submits (`form="…"`). The doctor editor
 * has one: the practising-in card sits in the sidebar, so its "Save changes"
 * is a sibling of the form, not a descendant.
 *
 * Requires the in-form `PendingSubmitButton` to carry the matching `formId`.
 */
export function ExternalSubmitButton({
  formId,
  children,
  busyLabel,
  className = "gh-btn gh-btn-primary",
  style,
}: SubmitProps & { formId: string }) {
  const pending = useSyncExternalStore(
    subscribeFormPending,
    () => isFormPending(formId),
    () => false,
  );

  return (
    <>
      <button
        type="submit"
        form={formId}
        className={className}
        style={style}
        disabled={pending}
        aria-busy={pending}
      >
        <SubmitBody pending={pending} busyLabel={busyLabel}>
          {children}
        </SubmitBody>
      </button>
      <BusyAnnouncement label={pending ? busyLabel ?? children : null} />
    </>
  );
}
