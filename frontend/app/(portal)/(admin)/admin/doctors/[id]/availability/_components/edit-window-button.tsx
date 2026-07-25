"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { PortalDialog } from "@/components/PortalDialog";
import { BASE_SLOT_MINUTES } from "@/lib/constants";

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

function minutesToHHmm(mins: number) {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

type EditWindowButtonProps = {
  availability: {
    id: string;
    weekday: number;
    startMinute: number;
    endMinute: number;
    isActive: boolean;
  };
  /** Server action that patches the window — receives this dialog's form. */
  action: (formData: FormData) => void;
};

/**
 * Row-level "edit" trigger for a doctor's weekly availability window. The form
 * lives inside a PortalDialog (portalled to <body>), so the submit button in
 * the dialog footer reaches it via the `form` attribute rather than nesting.
 *
 * Fields are uncontrolled and keyed on `open` so re-opening the dialog after a
 * cancel re-seeds them from the stored row instead of keeping stale edits.
 */
export function EditWindowButton({ availability: w, action }: EditWindowButtonProps) {
  const [open, setOpen] = useState(false);
  const formId = `edit-window-${w.id}`;
  const label = `${WEEKDAYS[w.weekday]?.label ?? w.weekday} ${minutesToHHmm(
    w.startMinute,
  )}–${minutesToHHmm(w.endMinute)}`;

  return (
    <>
      <button
        type="button"
        aria-label={`Edit availability window ${label}`}
        className="gh-icon-btn inline-flex items-center justify-center"
        onClick={() => setOpen(true)}
      >
        <Pencil className="size-3.5" aria-hidden />
      </button>

      <PortalDialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Edit ${label}`}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="gh-btn gh-btn-soft"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" form={formId} className="gh-btn gh-btn-primary">
              Save changes
            </button>
          </div>
        }
      >
        <form key={String(open)} id={formId} action={action} className="grid gap-3">
          <input type="hidden" name="availabilityId" value={w.id} />
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">Day of week</span>
            <select
              name="weekday"
              defaultValue={String(w.weekday)}
              required
              className="gh-select"
            >
              {WEEKDAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">From (clinic time)</span>
              <input
                type="time"
                name="startTime"
                defaultValue={minutesToHHmm(w.startMinute)}
                required
                className="gh-input"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">To (clinic time)</span>
              <input
                type="time"
                name="endTime"
                defaultValue={minutesToHHmm(w.endMinute)}
                required
                className="gh-input"
              />
            </label>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={w.isActive}
              className="size-4"
            />
            <span className="gh-field-label">Active</span>
          </label>
          <p className="text-portal-meta text-[var(--color-text-muted)]">
            Paused windows stop generating new slots. Saving clears future open
            slots and regenerates them on the fixed {BASE_SLOT_MINUTES}-min base
            grid — booked appointments are kept.
          </p>
        </form>
      </PortalDialog>
    </>
  );
}
