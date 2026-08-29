export type BookabilityState = "BOOKABLE" | "RETURNING" | "UNAVAILABLE";

export type BookabilityReasonCode =
  | "COUNTRY_PAUSED"
  | "DOCTOR_PAUSED"
  | "SERVICE_PAUSED"
  | "NO_APPROVED_DOCTOR"
  | "NO_OPEN_SLOT";

export type BookabilitySummary = {
  state: BookabilityState;
  reasonCode: BookabilityReasonCode | null;
  nextAvailableAt: string | null;
};

const FAIL_CLOSED_BOOKABILITY: BookabilitySummary = {
  state: "UNAVAILABLE",
  reasonCode: "NO_OPEN_SLOT",
  nextAvailableAt: null,
};

/**
 * Public catalogue/profile reads must not disappear just because the slot
 * inventory used to enrich them is temporarily unavailable. Keep the content
 * response alive, but fail closed so no booking action is advertised without
 * an authoritative result.
 */
export async function resolveBookabilityFailClosed(
  resolve: () => Promise<BookabilitySummary>,
): Promise<BookabilitySummary> {
  try {
    return await resolve();
  } catch {
    return { ...FAIL_CLOSED_BOOKABILITY };
  }
}

export type BookingPause = {
  bookingPausedFrom: Date | null;
  bookingPausedUntil: Date | null;
};

type CandidateSlot = {
  doctorId: string;
  startAt: string;
};

export function isPauseActiveAt(pause: BookingPause | null | undefined, at: Date): boolean {
  if (!pause?.bookingPausedFrom || pause.bookingPausedFrom > at) return false;
  return !pause.bookingPausedUntil || at < pause.bookingPausedUntil;
}

export function slotOverlapsPause(
  slot: { startAt: Date; endAt: Date },
  pause: BookingPause | null | undefined,
): boolean {
  if (!pause?.bookingPausedFrom) return false;
  const pauseEnd = pause.bookingPausedUntil?.getTime() ?? Number.POSITIVE_INFINITY;
  return slot.startAt.getTime() < pauseEnd && slot.endAt > pause.bookingPausedFrom;
}

function earliestVerifiedSlot(
  slots: CandidateSlot[],
  approvedDoctorIds: ReadonlySet<string>,
): string | null {
  let earliest: string | null = null;
  let earliestMs = Number.POSITIVE_INFINITY;
  for (const slot of slots) {
    if (!approvedDoctorIds.has(slot.doctorId)) continue;
    const at = Date.parse(slot.startAt);
    if (!Number.isFinite(at) || at >= earliestMs) continue;
    earliest = new Date(at).toISOString();
    earliestMs = at;
  }
  return earliest;
}

export function deriveBookability(args: {
  now: Date;
  countryBookingEnabled: boolean;
  approvedDoctorIds: string[];
  servicePause?: BookingPause | null;
  doctorPauses?: Record<string, BookingPause | undefined>;
  primarySlots: CandidateSlot[];
  lookaheadSlots: CandidateSlot[];
}): BookabilitySummary {
  if (!args.countryBookingEnabled) {
    return { state: "UNAVAILABLE", reasonCode: "COUNTRY_PAUSED", nextAvailableAt: null };
  }

  if (args.approvedDoctorIds.length === 0) {
    return {
      state: "UNAVAILABLE",
      reasonCode: "NO_APPROVED_DOCTOR",
      nextAvailableAt: null,
    };
  }

  const approved = new Set(args.approvedDoctorIds);
  const servicePaused = isPauseActiveAt(args.servicePause, args.now);
  const allDoctorsPaused = args.approvedDoctorIds.every((doctorId) =>
    isPauseActiveAt(args.doctorPauses?.[doctorId], args.now),
  );
  const pauseReason: BookabilityReasonCode | null = servicePaused
    ? "SERVICE_PAUSED"
    : allDoctorsPaused
      ? "DOCTOR_PAUSED"
      : null;

  const primary = earliestVerifiedSlot(args.primarySlots, approved);
  if (primary && !pauseReason) {
    return { state: "BOOKABLE", reasonCode: null, nextAvailableAt: primary };
  }

  const later = earliestVerifiedSlot(
    pauseReason ? [...args.primarySlots, ...args.lookaheadSlots] : args.lookaheadSlots,
    approved,
  );
  if (later) {
    return { state: "RETURNING", reasonCode: pauseReason ?? "NO_OPEN_SLOT", nextAvailableAt: later };
  }

  return {
    state: "UNAVAILABLE",
    reasonCode: pauseReason ?? "NO_OPEN_SLOT",
    nextAvailableAt: null,
  };
}
