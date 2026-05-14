import type { AppointmentStatus } from "@prisma/client";

export type { AppointmentStatus };

/**
 * Allowed status transitions for the new Prisma `AppointmentStatus` enum.
 * Keep the admin UI in sync.
 *
 * Matrix:
 *   PENDING   → CONFIRMED | CANCELLED
 *   CONFIRMED → COMPLETED | CANCELLED
 * Terminal: CANCELLED, COMPLETED
 */
const allowedTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED"],
  CANCELLED: [],
  COMPLETED: [],
};

export class InvalidAppointmentStatusTransitionError extends Error {
  readonly code = "INVALID_STATUS_TRANSITION";
  constructor(
    readonly from: string,
    readonly to: AppointmentStatus,
  ) {
    super(`Invalid status transition: ${from} → ${to}.`);
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
  if (!allowedTransitions[from].includes(to)) {
    throw new InvalidAppointmentStatusTransitionError(from, to);
  }
}

export function getAllowedNextStatuses(from: AppointmentStatus): AppointmentStatus[] {
  return [...allowedTransitions[from]];
}
