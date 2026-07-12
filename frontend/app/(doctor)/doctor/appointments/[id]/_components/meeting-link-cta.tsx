"use client";

import { Video } from "lucide-react";
import { focusDoctorMeetingLink } from "@/lib/doctor-appointment-ui";

/**
 * Header primary-action fallback for UX-005: online appointments with no
 * meeting link yet show nothing where `Join call` would be. Clicking jumps
 * to Overview and focuses the meeting-URL field (`appointment-actions.tsx`)
 * instead of leaving the doctor to scroll and hunt for it.
 */
export function MeetingLinkCta({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => focusDoctorMeetingLink()}
      className="gh-btn gh-btn-primary"
    >
      <Video className="size-3.5" /> {label}
    </button>
  );
}
