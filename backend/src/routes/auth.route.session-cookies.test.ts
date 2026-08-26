import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { env } from "../config/env.js";
import { TRUSTED_DEVICE_COOKIE_NAME } from "../utils/auth-session.js";
import { clearRevokedSessionCookies } from "./auth.route.js";

describe("password-change response session cleanup", () => {
  it("clears the current auth and trusted-device cookies", () => {
    const cleared: string[] = [];
    clearRevokedSessionCookies({
      clearCookie(name: string) {
        cleared.push(name);
      },
    });

    assert.deepEqual(cleared, [env.AUTH_COOKIE_NAME, TRUSTED_DEVICE_COOKIE_NAME]);
  });
});
