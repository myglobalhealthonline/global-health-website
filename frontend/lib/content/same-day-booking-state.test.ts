import { describe, expect, it } from "vitest";
import { getSameDayEmptyMessage } from "./same-day-booking-state";

describe("getSameDayEmptyMessage", () => {
  it("uses policy-unavailable copy for country, service, and doctor restrictions", () => {
    for (const reasonCode of ["COUNTRY_PAUSED", "SERVICE_PAUSED", "NO_APPROVED_DOCTOR"] as const) {
      expect(
        getSameDayEmptyMessage(
          { state: "UNAVAILABLE", reasonCode, nextAvailableAt: null },
          { noSlots: "No times", unavailable: "Not accepting online bookings" },
        ),
      ).toBe("Not accepting online bookings");
    }
  });

  it("keeps ordinary no-slot copy for an active service without a matching time", () => {
    expect(
      getSameDayEmptyMessage(
        { state: "UNAVAILABLE", reasonCode: "NO_OPEN_SLOT", nextAvailableAt: null },
        { noSlots: "No times", unavailable: "Not accepting online bookings" },
      ),
    ).toBe("No times");
  });
});
