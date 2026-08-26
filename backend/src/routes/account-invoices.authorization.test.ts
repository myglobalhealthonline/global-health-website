import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAccountInvoiceOrderScope } from "./account-invoices.route.js";

describe("account invoice email fallback authorization", () => {
  it("keeps direct userId ownership for an unverified account but does not trust its email", () => {
    assert.deepEqual(
      buildAccountInvoiceOrderScope({
        id: "user_unverified",
        email: "victim@example.test",
        emailVerifiedAt: null,
      }),
      { userId: "user_unverified" },
    );
  });

  it("adds the case-insensitive guest-order email fallback after verification", () => {
    assert.deepEqual(
      buildAccountInvoiceOrderScope({
        id: "user_verified",
        email: "patient@example.test",
        emailVerifiedAt: "2026-08-26T00:00:00.000Z",
      }),
      {
        OR: [
          { userId: "user_verified" },
          { email: { equals: "patient@example.test", mode: "insensitive" } },
        ],
      },
    );
  });
});
