"use client";

/**
 * Dirty-tracking for the plain, uncontrolled `<form action={serverAction}>`
 * the admin editors already render, as a pure function over an
 * add/removeEventListener pair.
 *
 * Kept out of the components so it is unit-testable: the frontend suite runs
 * without a DOM, and this is the only part of the fix with real logic.
 */

export type FormLike = Pick<
  HTMLFormElement,
  "addEventListener" | "removeEventListener"
>;

export type FormObservers = {
  /** `true` on the first edit, `false` again once the form is submitted or
   *  reset — a saved form must not keep warning about unsaved changes. */
  onDirty: (dirty: boolean) => void;
};

/**
 * Attaches the observers and returns the detach function.
 *
 * `root` is where the edit listeners go, and it defaults to the form itself.
 * The doctor editor has to pass the document instead: its profile-photo card
 * and practising-in checkboxes sit OUTSIDE the `<form>` and are tied to it
 * only by the HTML `form="doctor-edit-form"` attribute. That attribute
 * governs submission, not event propagation — those controls' `input` and
 * `change` events bubble up their real ancestors and never reach the form
 * node — so listening on the form alone would silently miss exactly the
 * fields the page goes out of its way to submit.
 *
 * The `target.form === form` filter is what keeps a document-level listener
 * honest: every form control exposes `.form`, and it resolves the `form`
 * attribute, so one comparison covers descendants and attribute-associated
 * controls alike and ignores everything else on the page.
 */
export function observeForm(
  form: FormLike,
  observers: FormObservers,
  root: FormLike = form,
): () => void {
  const bound: Array<[FormLike, string, EventListener]> = [];
  const on = (node: FormLike, type: string, fn: EventListener) => {
    node.addEventListener(type, fn);
    bound.push([node, type, fn]);
  };

  const { onDirty } = observers;
  const belongsToForm = (event: Event) =>
    (event.target as { form?: unknown } | null)?.form === form;
  const markDirty = (event: Event) => {
    if (belongsToForm(event)) onDirty(true);
  };
  const markClean = () => onDirty(false);

  // `input` covers typing; `change` covers the controls that never emit
  // `input` (checkbox, radio, select, file).
  on(root, "input", markDirty);
  on(root, "change", markDirty);
  // Submit and reset fire on the form itself, so they stay on the form even
  // when the edit listeners are delegated.
  on(form, "submit", markClean);
  on(form, "reset", markClean);

  return () => {
    for (const [node, type, fn] of bound) node.removeEventListener(type, fn);
  };
}
