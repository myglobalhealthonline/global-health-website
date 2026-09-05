import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";
import Fastify, { type FastifyInstance, type FastifyPluginAsync } from "fastify";

/**
 * `POST /api/internal/run-reminders` no longer sends anything. It enqueues the
 * same durable outbox rows the internal hourly tick does, so the external cron
 * and the in-process scheduler can both run — and overlap — without
 * double-sending: the outbox keys collapse the repeats.
 *
 * Fully mocked — no DB, no SMTP (needs `--experimental-test-module-mocks`).
 */
describe("POST /api/internal/run-reminders", () => {
  const envMock: { CRON_SECRET: string | undefined } = { CRON_SECRET: "cron-secret-value" };
  const state: { calls: number; throws: Error | null } = { calls: 0, throws: null };
  let app: FastifyInstance;
  let DatabaseUnavailableError: typeof import("../modules/shared/db-errors.js")["DatabaseUnavailableError"];

  before(async () => {
    mock.module("../config/env.js", { namedExports: { env: envMock } });
    mock.module("../modules/appointments/appointment-reminder.service.js", {
      namedExports: {
        enqueueDueAppointmentReminders: async () => {
          state.calls++;
          if (state.throws) throw state.throws;
          return { scanned: 3, patientQueued: 2, doctorQueued: 1, created: 3 };
        },
      },
    });

    DatabaseUnavailableError = (await import("../modules/shared/db-errors.js"))
      .DatabaseUnavailableError;
    const route = (await import("./reminders.route.js"))
      .default as unknown as FastifyPluginAsync;
    app = Fastify();
    await app.register(route);
    await app.ready();
  });

  beforeEach(() => {
    envMock.CRON_SECRET = "cron-secret-value";
    state.calls = 0;
    state.throws = null;
  });

  const call = (headers: Record<string, string> = {}) =>
    app.inject({ method: "POST", url: "/api/internal/run-reminders", headers });

  it("refuses to run when no cron secret is configured", async () => {
    envMock.CRON_SECRET = undefined;
    const res = await call({ "x-cron-secret": "anything" });
    assert.equal(res.statusCode, 503);
    assert.equal(state.calls, 0);
  });

  it("rejects a missing or wrong secret", async () => {
    assert.equal((await call()).statusCode, 401);
    assert.equal((await call({ "x-cron-secret": "wrong" })).statusCode, 401);
    assert.equal(state.calls, 0, "nothing is enqueued for an unauthenticated caller");
  });

  it("enqueues via the same function the internal tick calls, and reports the counts", async () => {
    const res = await call({ "x-cron-secret": "cron-secret-value" });
    assert.equal(res.statusCode, 200, res.body);
    assert.equal(state.calls, 1);
    assert.deepEqual(res.json().data, {
      scanned: 3,
      patientQueued: 2,
      doctorQueued: 1,
      created: 3,
    });
  });

  it("reports a database outage as 503, not 500", async () => {
    state.throws = new DatabaseUnavailableError("db down");
    const res = await call({ "x-cron-secret": "cron-secret-value" });
    assert.equal(res.statusCode, 503);
  });
});
