import type { AppointmentStatus } from "../../validations/admin-appointments.schema.js";

/**
 * Allowed status transitions (Phase 2.1). Keep in sync with docs and frontend
 * `getAllowedNextStatuses` in `frontend/lib/admin/appointment-status.ts`.
 *
 * Matrix:
 * - REQUEST_RECEIVED -> UNDER_REVIEW | CONTACTED | CANCELLED
 * - UNDER_REVIEW -> CONTACTED | CANCELLED
 * - CONTACTED -> COMPLETED | CANCELLED
 * Terminal: CANCELLED, COMPLETED (no outgoing transitions)
 * Blocked: any transition from terminal; CONTACTED/UNDER_REVIEW -> REQUEST_RECEIVED
 */
const allowedTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
  REQUEST_RECEIVED: ["UNDER_REVIEW", "CONTACTED", "CANCELLED"],
  UNDER_REVIEW: ["CONTACTED", "CANCELLED"],
  CONTACTED: ["COMPLETED", "CANCELLED"],
  CANCELLED: [],
  COMPLETED: [],
};

export class InvalidAppointmentStatusTransitionError extends Error {
  readonly code = "INVALID_STATUS_TRANSITION";

  constructor(
    readonly from: string,
    readonly to: AppointmentStatus,
  ) {
    super(
      `Invalid status transition: cannot change from ${from} to ${to}. Only specific moves are allowed.`,
    );
    this.name = "InvalidAppointmentStatusTransitionError";
  }
}

export class UnrecognizedAppointmentStatusError extends Error {
  constructor(readonly stored: string) {
    super(`Unrecognized appointment status stored: ${stored}`);
    this.name = "UnrecognizedAppointmentStatusError";
  }
}

function isAppointmentStatus(value: string): value is AppointmentStatus {
  return Object.prototype.hasOwnProperty.call(allowedTransitions, value);
}

export function assertValidStatusTransition(from: string, to: AppointmentStatus): void {
  if (!isAppointmentStatus(from)) {
    throw new UnrecognizedAppointmentStatusError(from);
  }
  const next = allowedTransitions[from];
  if (!next.includes(to)) {
    throw new InvalidAppointmentStatusTransitionError(from, to);
  }
}

export function getAllowedNextStatuses(from: AppointmentStatus): AppointmentStatus[] {
  return [...allowedTransitions[from]];
}
