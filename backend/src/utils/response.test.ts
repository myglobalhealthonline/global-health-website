import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";
import { errorResponse } from "./response.js";

/**
 * Clients render `message` and ignore `details`, so a validation 400 has to
 * carry the failing field in the message or the user sees a dead end
 * ("Invalid market profile update" for a mistyped IBAN).
 */
describe("errorResponse", () => {
  const schema = z.object({
    iban: z.string().refine(() => false, { message: "Invalid IBAN" }),
  });

  it("folds the first zod field error into the message", () => {
    const parsed = schema.safeParse({ iban: "PT50007000000634495123" });
    assert.equal(parsed.success, false);
    if (parsed.success) return;
    const res = errorResponse("Invalid market profile update", parsed.error.flatten());
    assert.equal(res.message, "Invalid market profile update: iban: Invalid IBAN");
  });

  it("falls back to form-level errors", () => {
    const res = errorResponse("Invalid update", {
      fieldErrors: {},
      formErrors: ["Provide at least one field to update"],
    });
    assert.equal(res.message, "Invalid update: Provide at least one field to update");
  });

  it("leaves non-zod details and plain messages untouched", () => {
    assert.equal(errorResponse("Could not update profile").message, "Could not update profile");
    assert.equal(errorResponse("Nope", { retryAfter: 30 }).message, "Nope");
  });
});
