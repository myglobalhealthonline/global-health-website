import assert from "node:assert/strict";
import test from "node:test";

import { isNiaTokenUsable, parseNiaState, parseNiaToken } from "./nia.js";

/**
 * The network calls need NIA; these cover the parts that decide whether a
 * prescription attempt succeeds or fails with a lapsed credential.
 */

test("the state is read whether NIA send it bare or wrapped", () => {
  assert.equal(parseNiaState("3"), "3");
  assert.equal(parseNiaState("  3\n"), "3");
  assert.equal(parseNiaState('{"stav":3}'), "3");
  assert.equal(parseNiaState('{"stav":"3"}'), "3");
  assert.equal(parseNiaState("nonsense"), "");
});

test("the token and both expiry windows are read", () => {
  // NIA use a space rather than a T, which Date() does not reliably accept.
  const body =
    '{"token":"eyJhbGc.abc.def","platOd":"2026-09-09 10:46:12",' +
    '"platDo":"2026-09-10 00:00:00","stahovaniDo":"2026-09-11 00:00:00"}';
  const t = parseNiaToken(body);
  assert.equal(t.token, "eyJhbGc.abc.def");
  // Prague midnight, not the server's. On Railway (UTC) a naive parse would
  // read this two hours early and throw away a still-valid token.
  assert.equal(t.validUntil?.toISOString(), "2026-09-09T22:00:00.000Z");
  assert.ok(t.downloadsValidUntil);
  // Downloads outlive prescribing — using the wrong one would let a doctor
  // attempt a prescription with a credential valid only for batch downloads.
  assert.ok(t.downloadsValidUntil!.getTime() > t.validUntil!.getTime());
});

test("a response without a token is refused rather than half-accepted", () => {
  assert.throws(() => parseNiaToken('{"platDo":"2026-09-10 00:00:00"}'), /returned no token/);
  assert.throws(() => parseNiaToken("<html>error</html>"), /was not JSON/);
});

test("a token close to expiry is already treated as unusable", () => {
  const now = new Date("2026-09-09T23:59:30Z");
  // SÚKL expire the prescribing window at midnight. A call started 30 seconds
  // before that lands after it, and a failed prescription attempt is far worse
  // than refusing early and asking the doctor to sign in again.
  assert.equal(isNiaTokenUsable(new Date("2026-09-10T00:00:00Z"), now), false);
  assert.equal(isNiaTokenUsable(new Date("2026-09-10T02:00:00Z"), now), true);
  assert.equal(isNiaTokenUsable(null, now), false);
});
