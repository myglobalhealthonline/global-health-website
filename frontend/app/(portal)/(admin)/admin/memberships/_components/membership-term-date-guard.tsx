"use client";

import { useEffect, useRef, useState } from "react";
import { PortalDialog } from "@/components/PortalDialog";

/**
 * Submit button for the member detail form that stops on a changed term start
 * date.
 *
 * `MembershipAllowanceBalance` is keyed on `(benefitId, holderEnrollmentId,
 * termStart)`, deliberately — a renewal creates a NEW counter rather than
 * resetting the old one (§3.5). The consequence nobody expects is that
 * correcting a typo in `startDate` does the same thing: the old balance is
 * orphaned and the next spend opens a fresh counter at the full allocation.
 * Nothing errors, and nobody finds out until the units are gone twice.
 *
 * **The count is the whole family's**, not this row's, because a dependent's
 * term follows its primary — so re-dating a primary re-dates every counter
 * hanging off that family at once.
 *
 * A dialog rather than a block: re-dating is sometimes exactly right (a term
 * genuinely started later), and the admin adjust exists to repair the counter
 * afterwards. What was missing was being told.
 */
export function MembershipTermDateGuard({
  originalStartDate,
  peopleAffected,
  unitsSpent,
  children,
}: {
  /** `YYYY-MM-DD`, matching the date input's own value format. */
  originalStartDate: string;
  /** The primary plus its live dependents — everyone whose term this date is. */
  peopleAffected: number;
  /** Units already spent on the current term, across that family. */
  unitsSpent: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    formRef.current = buttonRef.current?.form ?? null;
  }, []);

  const changedDate = (): string | null => {
    const input = formRef.current?.elements.namedItem("startDate");
    if (!(input instanceof HTMLInputElement)) return null;
    return input.value && input.value !== originalStartDate ? input.value : null;
  };

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    // Nothing spent means nothing to orphan, so the ordinary save applies.
    if (unitsSpent === 0 || !changedDate()) return;
    event.preventDefault();
    setOpen(true);
  }

  const submit = () => {
    setOpen(false);
    // `requestSubmit` so the server action still runs — this button only
    // interposes on the click.
    formRef.current?.requestSubmit();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="submit"
        className="gh-btn gh-btn-primary"
        onClick={handleClick}
      >
        {children}
      </button>

      <PortalDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Change the term start date?"
        danger
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="gh-btn gh-btn-soft" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" className="gh-btn gh-btn-danger" onClick={submit}>
              Change the date
            </button>
          </div>
        }
      >
        <p className="text-sm text-[var(--color-text-primary)]">
          Included visits are counted per term start date, so moving it starts a fresh count. The{" "}
          <strong>
            {unitsSpent} visit{unitsSpent === 1 ? "" : "s"}
          </strong>{" "}
          already used on the current term
          {peopleAffected > 1 ? (
            <>
              {" "}
              — across all <strong>{peopleAffected}</strong> people on this membership, since
              dependents follow the primary&apos;s dates —
            </>
          ) : null}{" "}
          will no longer be counted, and the next booking will start again from the full
          allowance.
        </p>
        <p className="mt-3 text-sm text-[var(--color-text-muted)]">
          If the date is genuinely wrong, change it and then use “Adjust allowance” to put the used
          count back.
        </p>
      </PortalDialog>
    </>
  );
}
