import { describe, expect, it } from "vitest";
import { getBookabilityActionProps } from "./bookability-presentation";

const messages = {
  notAcceptingOnlineBookings: "Not accepting online bookings",
  returningOn: "Appointments reopen {date}",
  nextAvailable: "Next available {date}",
};

describe("getBookabilityActionProps", () => {
  it("does not add next-slot copy to a BOOKABLE action", () => {
    expect(
      getBookabilityActionProps(
        { state: "BOOKABLE", reasonCode: null, nextAvailableAt: "2026-09-03T23:30:00.000Z" },
        "en",
        messages,
        "Europe/Bucharest",
      ).nextAvailableLabel,
    ).toBeUndefined();
  });

  it("uses the verified return slot only for RETURNING copy", () => {
    expect(
      getBookabilityActionProps(
        { state: "RETURNING", reasonCode: "DOCTOR_PAUSED", nextAvailableAt: "2026-09-17T09:00:00.000Z" },
        "en",
        messages,
        "UTC",
      ),
    ).toMatchObject({
      returningLabel: "Appointments reopen Thursday, September 17",
      nextAvailableLabel: "Next available Thursday, September 17",
    });
  });

  it("never invents a return date for indefinite unavailability", () => {
    expect(
      getBookabilityActionProps(
        { state: "UNAVAILABLE", reasonCode: "NO_OPEN_SLOT", nextAvailableAt: null },
        "en",
        messages,
        "UTC",
      ),
    ).toMatchObject({ unavailableLabel: "Not accepting online bookings" });
  });
});
