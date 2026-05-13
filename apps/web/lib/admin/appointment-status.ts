/**
 * Mirrors backend `appointment-status-transitions.ts` for admin UI only.
 * Keep transition lists aligned when changing workflow rules.
 */
const nextByCurrent: Record<string, readonly string[]> = {
  REQUEST_RECEIVED: ["UNDER_REVIEW", "CONTACTED", "CANCELLED"],
  UNDER_REVIEW: ["CONTACTED", "CANCELLED"],
  CONTACTED: ["COMPLETED", "CANCELLED"],
  CANCELLED: [],
  COMPLETED: [],
};

const terminalStatuses = new Set(["CANCELLED", "COMPLETED"]);

export function getAllowedNextStatuses(current: string): string[] {
  return [...(nextByCurrent[current] ?? [])];
}

export function isTerminalAppointmentStatus(status: string): boolean {
  return terminalStatuses.has(status);
}
