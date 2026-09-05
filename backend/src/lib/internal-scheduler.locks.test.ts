import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

/**
 * Every scheduler job takes its own Postgres advisory lock so a horizontally
 * scaled deployment runs each tick once. Reusing a key is silent: the two jobs
 * simply start excluding each other, and the slower one is skipped for as long
 * as the other is running. Adding a job is exactly when that happens, so this
 * asserts the keys stay distinct — and that every declared key is actually
 * wired to a tick.
 *
 * Source-level on purpose: importing the scheduler pulls in every job module
 * (and a live pg pool) to assert something that is a property of the file.
 */
const source = readFileSync(join(__dirname, "internal-scheduler.ts"), "utf8");

describe("internal scheduler advisory locks", () => {
  const declarations = [...source.matchAll(/^const (LOCK_[A-Z_]+) = (\d+);$/gm)].map(
    (m) => ({ name: m[1]!, key: m[2]! }),
  );

  it("declares a lock per job", () => {
    assert.ok(declarations.length >= 15, `found only ${declarations.length} lock keys`);
    assert.ok(
      declarations.some((d) => d.name === "LOCK_APPOINTMENT_REMINDERS"),
      "the 24h appointment-reminder enqueue tick has its own lock",
    );
  });

  it("gives every job a distinct key", () => {
    const keys = declarations.map((d) => d.key);
    const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
    assert.deepEqual(dupes, [], `duplicate advisory-lock keys: ${dupes.join(", ")}`);
  });

  it("uses every declared key in a tick", () => {
    for (const { name } of declarations) {
      const uses = source.split(name).length - 1;
      assert.ok(uses >= 2, `${name} is declared but never passed to withAdvisoryLock`);
    }
  });

  it("schedules the appointment-reminder enqueue on an interval and on boot", () => {
    assert.match(
      source,
      /setInterval\(\(\) => void tickAppointmentReminders\(log\), APPOINTMENT_REMINDER_INTERVAL_MS\)/,
    );
    assert.match(source, /void tickAppointmentReminders\(log\);\n {4}\}, startupJitterMs\)/);
  });
});
