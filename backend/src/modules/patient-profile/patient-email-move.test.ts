import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Prisma } from "@prisma/client";
import { movePatientEmailReferences } from "./patient-email-move.js";

/**
 * The helper's whole job is breadth — every table that stores a patient's
 * address by value has to move together, or the record splits across two
 * addresses. A fake transaction client records the calls so the test can
 * assert on that breadth without a database.
 */
type Call = { model: string; where: unknown; data: unknown };

function fakeTx(counts: Record<string, number> = {}) {
  const calls: Call[] = [];
  const model = (name: string) => ({
    updateMany: async (args: { where: unknown; data: unknown }) => {
      calls.push({ model: name, where: args.where, data: args.data });
      return { count: counts[name] ?? 0 };
    },
  });
  const tx = {
    appointment: model("appointment"),
    order: model("order"),
    orderItem: model("orderItem"),
    cartItem: model("cartItem"),
    medicalNote: model("medicalNote"),
    generatedDocument: model("generatedDocument"),
    crossBorderPrescriptionRequest: model("crossBorderPrescriptionRequest"),
    membershipEnrollment: model("membershipEnrollment"),
    patientUploadLink: model("patientUploadLink"),
    brazilConsentSubmission: model("brazilConsentSubmission"),
  } as unknown as Prisma.TransactionClient;
  return { tx, calls };
}

describe("movePatientEmailReferences", () => {
  it("moves every table that stores the address by value", async () => {
    const { tx, calls } = fakeTx();
    await movePatientEmailReferences(tx, "old@example.com", "new@example.com");

    assert.deepEqual(
      calls.map((c) => c.model).sort(),
      [
        "appointment",
        "brazilConsentSubmission",
        "cartItem",
        "crossBorderPrescriptionRequest",
        "generatedDocument",
        "medicalNote",
        "membershipEnrollment",
        "order",
        "orderItem",
        "patientUploadLink",
      ],
    );
  });

  it("matches case-insensitively — form-entered rows are never normalised", async () => {
    const { tx, calls } = fakeTx();
    await movePatientEmailReferences(tx, "Sara@Gmail.com", "pn.sarah@gmail.com");

    const appointment = calls.find((c) => c.model === "appointment");
    assert.deepEqual(appointment?.where, {
      email: { equals: "Sara@Gmail.com", mode: "insensitive" },
    });
  });

  it("writes the new address lowercased, matching User.email's own normalisation", async () => {
    const { tx, calls } = fakeTx();
    await movePatientEmailReferences(tx, "old@example.com", "  PN.Sarah@Gmail.com  ");

    assert.deepEqual(calls.find((c) => c.model === "order")?.data, {
      email: "pn.sarah@gmail.com",
    });
    // The per-row columns use their own field name, not `email`.
    assert.deepEqual(calls.find((c) => c.model === "medicalNote")?.data, {
      patientEmail: "pn.sarah@gmail.com",
    });
  });

  it("is a no-op when the address only differs by case or whitespace", async () => {
    const { tx, calls } = fakeTx();
    const counts = await movePatientEmailReferences(
      tx,
      "Sara@Gmail.com",
      " sara@gmail.com ",
    );

    assert.deepEqual(calls, []);
    assert.deepEqual(counts, {});
  });

  it("reports only the tables that actually had rows", async () => {
    const { tx } = fakeTx({ appointment: 2, order: 2 });
    const counts = await movePatientEmailReferences(
      tx,
      "sara@gmail.com",
      "pn.sarah@gmail.com",
    );

    assert.deepEqual(counts, { appointment: 2, order: 2 });
  });
});
