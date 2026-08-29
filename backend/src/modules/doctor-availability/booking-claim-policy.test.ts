import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Prisma } from "@prisma/client";
import {
  assertBookingClaimAllowed,
  BookingClaimUnavailableError,
} from "./doctor-availability.service.js";

const claimed = {
  doctorId: "doctor-1",
  startAt: new Date("2030-01-07T10:00:00.000Z"),
  endAt: new Date("2030-01-07T10:30:00.000Z"),
};

type PolicyRow = {
  bookingPausedFrom: Date | null;
  bookingPausedUntil: Date | null;
  country: { bookingSetting: { bookingEnabled: boolean } | null };
  assignedDoctors: Array<{
    doctor: {
      bookingPausedFrom: Date | null;
      bookingPausedUntil: Date | null;
    };
  }>;
};

function allowedPolicy(overrides: Partial<PolicyRow> = {}): PolicyRow {
  return {
    bookingPausedFrom: null,
    bookingPausedUntil: null,
    country: { bookingSetting: { bookingEnabled: true } },
    assignedDoctors: [
      {
        doctor: {
          bookingPausedFrom: null,
          bookingPausedUntil: null,
        },
      },
    ],
    ...overrides,
  };
}

function policyClient(row: PolicyRow | null): Prisma.TransactionClient {
  return {
    service: {
      findFirst: async () => row,
    },
  } as unknown as Prisma.TransactionClient;
}

const context = {
  countryCode: "IE",
  serviceId: "service-1",
  doctorId: "doctor-1",
};

describe("atomic booking claim policy", () => {
  it("allows an active public service, enabled country, approved doctor and clear span", async () => {
    await assert.doesNotReject(
      assertBookingClaimAllowed(policyClient(allowedPolicy()), claimed, context),
    );
  });

  it("rejects when the country disabled booking", async () => {
    await assert.rejects(
      assertBookingClaimAllowed(
        policyClient(
          allowedPolicy({ country: { bookingSetting: { bookingEnabled: false } } }),
        ),
        claimed,
        context,
      ),
      BookingClaimUnavailableError,
    );
  });

  it("rejects when lifecycle, country, visibility, or assignment filters find no policy row", async () => {
    await assert.rejects(
      assertBookingClaimAllowed(policyClient(null), claimed, context),
      BookingClaimUnavailableError,
    );
    await assert.rejects(
      assertBookingClaimAllowed(
        policyClient(allowedPolicy({ assignedDoctors: [] })),
        claimed,
        context,
      ),
      BookingClaimUnavailableError,
    );
  });

  it("rejects a service pause that overlaps any part of the full claimed span", async () => {
    await assert.rejects(
      assertBookingClaimAllowed(
        policyClient(
          allowedPolicy({
            bookingPausedFrom: new Date("2030-01-07T10:15:00.000Z"),
            bookingPausedUntil: null,
          }),
        ),
        claimed,
        context,
      ),
      BookingClaimUnavailableError,
    );
  });

  it("rejects a doctor pause that overlaps any part of the full claimed span", async () => {
    await assert.rejects(
      assertBookingClaimAllowed(
        policyClient(
          allowedPolicy({
            assignedDoctors: [
              {
                doctor: {
                  bookingPausedFrom: new Date("2030-01-07T09:45:00.000Z"),
                  bookingPausedUntil: new Date("2030-01-07T10:15:00.000Z"),
                },
              },
            ],
          }),
        ),
        claimed,
        context,
      ),
      BookingClaimUnavailableError,
    );
  });

  it("uses half-open pause boundaries, allowing a pause that starts at the claim end", async () => {
    await assert.doesNotReject(
      assertBookingClaimAllowed(
        policyClient(
          allowedPolicy({
            bookingPausedFrom: claimed.endAt,
            bookingPausedUntil: null,
          }),
        ),
        claimed,
        context,
      ),
    );
  });
});
