/**
 * Allowed status transitions for the new Prisma `AppointmentStatus` enum.
 * Keep the admin UI in sync.
 *
 * Matrix:
 *   PENDING   → CONFIRMED | CANCELLED
 *   CONFIRMED → COMPLETED | CANCELLED
 * Terminal: CANCELLED, COMPLETED
 */
const allowedTransitions = {
    PENDING: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["COMPLETED", "CANCELLED"],
    CANCELLED: [],
    COMPLETED: [],
};
export class InvalidAppointmentStatusTransitionError extends Error {
    constructor(from, to) {
        super(`Invalid status transition: ${from} → ${to}.`);
        this.from = from;
        this.to = to;
        this.code = "INVALID_STATUS_TRANSITION";
        this.name = "InvalidAppointmentStatusTransitionError";
    }
}
export class UnrecognizedAppointmentStatusError extends Error {
    constructor(stored) {
        super(`Unrecognized appointment status stored: ${stored}`);
        this.stored = stored;
        this.name = "UnrecognizedAppointmentStatusError";
    }
}
function isAppointmentStatus(value) {
    return Object.prototype.hasOwnProperty.call(allowedTransitions, value);
}
export function assertValidStatusTransition(from, to) {
    if (!isAppointmentStatus(from)) {
        throw new UnrecognizedAppointmentStatusError(from);
    }
    if (!allowedTransitions[from].includes(to)) {
        throw new InvalidAppointmentStatusTransitionError(from, to);
    }
}
export function getAllowedNextStatuses(from) {
    return [...allowedTransitions[from]];
}
//# sourceMappingURL=status-transitions.js.map