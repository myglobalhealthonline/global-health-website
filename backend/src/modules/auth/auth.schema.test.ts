import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  changePasswordBodySchema,
  forgotPasswordBodySchema,
  loginBodySchema,
  registerBodySchema,
  resetPasswordBodySchema,
} from "../../validations/auth.schema.js";

describe("auth validation", () => {
  it("register accepts valid patient payload", () => {
    const result = registerBodySchema.safeParse({
      email: "patient@example.com",
      password: "very-secure-password",
      fullName: "Patient Example",
      phone: "+3531234567",
    });
    assert.equal(result.success, true);
  });

  it("register rejects short password", () => {
    const result = registerBodySchema.safeParse({
      email: "patient@example.com",
      password: "short",
      fullName: "Patient Example",
    });
    assert.equal(result.success, false);
  });

  it("login requires email and password", () => {
    assert.equal(loginBodySchema.safeParse({ email: "a@b.com", password: "x" }).success, true);
    assert.equal(loginBodySchema.safeParse({ email: "a@b.com", password: "" }).success, false);
  });

  it("forgot-password accepts a valid email", () => {
    assert.equal(forgotPasswordBodySchema.safeParse({ email: "patient@example.com" }).success, true);
  });

  it("reset-password requires token and strong-enough password", () => {
    assert.equal(
      resetPasswordBodySchema.safeParse({ token: "abc123tokenvalue", password: "new-password-123" }).success,
      true,
    );
    assert.equal(resetPasswordBodySchema.safeParse({ token: "short", password: "new-password-123" }).success, false);
  });

  it("change-password accepts a current + strong new password", () => {
    const r = changePasswordBodySchema.safeParse({
      currentPassword: "anything-1",
      newPassword: "new-password-123",
    });
    assert.equal(r.success, true);
  });

  it("change-password rejects a short new password", () => {
    const r = changePasswordBodySchema.safeParse({
      currentPassword: "anything",
      newPassword: "short",
    });
    assert.equal(r.success, false);
  });

  it("change-password requires a non-empty current password", () => {
    const r = changePasswordBodySchema.safeParse({
      currentPassword: "",
      newPassword: "new-password-123",
    });
    assert.equal(r.success, false);
  });
});
