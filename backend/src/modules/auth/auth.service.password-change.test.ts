import assert from "node:assert/strict";
import { before, describe, it, mock } from "node:test";
import bcrypt from "bcryptjs";

const currentPassword = "Old-password-123!";
const updateCalls: Array<Record<string, unknown>> = [];
const revokedUserIds: string[] = [];

let changeUserPassword: (typeof import("./auth.service.js"))["changeUserPassword"];

before(async () => {
  const passwordHash = await bcrypt.hash(currentPassword, 4);
  const baseUser = {
    id: "user_1",
    email: "patient@example.test",
    fullName: "Patient One",
    phone: null,
    dateOfBirth: null,
    role: "PATIENT",
    emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
    isActive: true,
    mustChangePassword: false,
    deletionScheduledAt: null,
    preferredLocale: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    passwordHash,
    tokenVersion: 7,
  };

  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        user: {
          findUnique: async () => ({ ...baseUser }),
          update: async ({ data }: { data: Record<string, unknown> }) => {
            updateCalls.push(data);
            return { ...baseUser, ...data, passwordHash: String(data.passwordHash) };
          },
        },
      },
    },
  });
  mock.module("../two-factor/login-otp.service.js", {
    namedExports: {
      revokeTrustedDevices: async (userId: string) => {
        revokedUserIds.push(userId);
      },
    },
  });

  ({ changeUserPassword } = await import("./auth.service.js"));
});

describe("changeUserPassword session revocation", () => {
  it("increments tokenVersion and revokes trusted devices after checking the current password", async () => {
    await changeUserPassword("user_1", currentPassword, "New-password-456!");

    assert.equal(updateCalls.length, 1);
    assert.deepEqual(updateCalls[0]?.tokenVersion, { increment: 1 });
    assert.equal(updateCalls[0]?.mustChangePassword, false);
    assert.deepEqual(revokedUserIds, ["user_1"]);
  });
});
