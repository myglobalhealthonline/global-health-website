import "server-only";

/** Availability is live operational data. A failed read must stay distinct
 * from an empty (but successful) appointment list so patients can retry. */
export class AvailabilityUnavailableError extends Error {
  constructor(message = "Live appointment availability is temporarily unavailable") {
    super(message);
    this.name = "AvailabilityUnavailableError";
  }
}

const AVAILABILITY_TIMEOUT_MS = 8_000;

export async function fetchLiveAvailability(
  input: RequestInfo | URL,
  init: RequestInit,
): Promise<Response> {
  try {
    const response = await fetch(input, {
      ...init,
      signal: AbortSignal.timeout(AVAILABILITY_TIMEOUT_MS),
    });
    return response;
  } catch (error) {
    if (error instanceof AvailabilityUnavailableError) throw error;
    throw new AvailabilityUnavailableError();
  }
}
