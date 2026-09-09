import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

type Row = { id: string; doctorId: string; startAt: Date; endAt: Date; status: "OPEN" };
type Window = { weekday: number; startMinute: number; endMinute: number; slotDurationMinutes: number; effectiveFrom: Date; effectiveUntil: Date };
let doctorIds: string[];
let active: Record<string, boolean>;
let windows: Record<string, Window[]>;
let rows: Row[];
let insertCalls = 0;
let failingDoctor: string | undefined;
let afterSelection: (() => void) | undefined;
let delayedInsert: { doctorId: string; wait: () => Promise<void> } | undefined;
let windowReads: Record<string, number>;
let reconcileReads: Record<string, number>;
let deletedStarts: string[];
let windowReadBudget = Infinity;
let pageCursors: Array<string | undefined>;
let api: typeof import("./doctor-availability.service.js");
let invalidate: (typeof import("./availability-cache-bus.js"))["invalidateAvailabilityCaches"];
const tomorrow = new Date();
tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
tomorrow.setUTCHours(0, 0, 0, 0);
const dayAfter = new Date(tomorrow.getTime() + 86_400_000);
const instant = (hour: number) => new Date(tomorrow.getTime() + hour * 3_600_000).toISOString();
const windowAt = (hour: number): Window => ({
  weekday: tomorrow.getUTCDay(), startMinute: hour * 60, endMinute: hour * 60 + 30,
  slotDurationMinutes: 30, effectiveFrom: tomorrow, effectiveUntil: tomorrow,
});
function deferred() {
  let release!: () => void;
  let entered!: () => void;
  const ready = new Promise<void>((resolve) => { entered = resolve; });
  return {
    ready,
    wait: async () => { entered(); await new Promise<void>((resolve) => { release = resolve; }); },
    release: () => release(),
  };
}
const read = (doctorId: string) => api.listOpenSlotsForDoctorAndService(doctorId, 30, tomorrow, dayAfter, { skipExpiredRelease: true });

before(async () => {
  mock.module("../../db/prisma.js", { namedExports: { prisma: {
    doctor: {
      findMany: async ({ where, take }: { where: { id?: { gt: string } }; take: number }) => {
        pageCursors.push(where.id?.gt);
        const selected = doctorIds.filter((id) => active[id] && (!where.id || id > where.id.gt)).sort().slice(0, take).map((id) => ({ id }));
        afterSelection?.(); afterSelection = undefined;
        return selected;
      },
      findUnique: async ({ where, select }: { where: { id: string }; select: { active?: boolean } }) => select.active
        ? { active: active[where.id] ?? false }
        : { bookingPausedFrom: null, bookingPausedUntil: null, country: { bookingSetting: { timezone: "UTC" } } },
    },
    doctorAvailability: { findMany: async ({ where }: { where: { doctorId: string } }) => {
      if (--windowReadBudget < 0) throw new Error("fixture stopped repeated coverage retries");
      windowReads[where.doctorId] = (windowReads[where.doctorId] ?? 0) + 1;
      if (where.doctorId === failingDoctor) throw new Error("fixture window read failure");
      return [...(windows[where.doctorId] ?? [])];
    } },
    doctorAvailabilityException: { findMany: async () => [] },
    doctorTimeSlot: {
      findMany: async ({ where }: { where: { doctorId: string; status?: string; isAdHoc?: boolean; startAt?: { gte?: Date; lt?: Date } } }) => {
        if (where.status === "HELD") return [];
        if (where.isAdHoc === false) reconcileReads[where.doctorId] = (reconcileReads[where.doctorId] ?? 0) + 1;
        return rows.filter((row) => row.doctorId === where.doctorId
          && (!where.startAt?.gte || row.startAt >= where.startAt.gte)
          && (!where.startAt?.lt || row.startAt < where.startAt.lt))
          .sort((a, b) => a.startAt.getTime() - b.startAt.getTime()).map((row) => ({ ...row }));
      },
      createMany: async ({ data }: { data: Array<{ doctorId: string; startAt: Date; endAt: Date }> }) => {
        insertCalls += 1;
        if (delayedInsert?.doctorId === data[0]?.doctorId) {
          const wait = delayedInsert.wait; delayedInsert = undefined; await wait();
        }
        let count = 0;
        for (const item of data) {
          if (rows.some((row) => row.doctorId === item.doctorId && +row.startAt === +item.startAt)) continue;
          rows.push({ ...item, id: `${item.doctorId}:${item.startAt.toISOString()}`, status: "OPEN" });
          count += 1;
        }
        return { count };
      },
      deleteMany: async ({ where }: { where: { doctorId: string; id: { in: string[] } } }) => {
        const removed = rows.filter((row) => row.doctorId === where.doctorId && where.id.in.includes(row.id));
        deletedStarts.push(...removed.map((row) => row.startAt.toISOString()));
        rows = rows.filter((row) => !removed.includes(row));
        return { count: removed.length };
      },
    },
  } } });
  api = await import("./doctor-availability.service.js");
  ({ invalidateAvailabilityCaches: invalidate } = await import("./availability-cache-bus.js"));
});

beforeEach(async () => {
  windowReadBudget = Infinity; insertCalls = 0;
  doctorIds = []; active = {}; windows = {}; rows = []; windowReads = {}; reconcileReads = {};
  failingDoctor = undefined; afterSelection = undefined; delayedInsert = undefined; deletedStarts = []; pageCursors = [];
  invalidate();
  // An empty real scheduler pass wraps its private cursor without exposing test-only APIs.
  await api.prewarmDoctorSlotCoverage();
  pageCursors = [];
});

describe("slot prewarming and coverage lifecycle", () => {
  it("continues after a failed doctor and paginates beyond that doctor on the next tick", async () => {
    doctorIds = ["doctor-a", "doctor-b", "doctor-c"];
    for (const id of doctorIds) { active[id] = true; windows[id] = [windowAt(9)]; }
    failingDoctor = "doctor-a";
    const first = await api.prewarmDoctorSlotCoverage(2);
    assert.deepEqual(first, { doctors: 2, created: 1, failed: 1 });
    assert.equal(rows.some((row) => row.doctorId === "doctor-b"), true);
    const second = await api.prewarmDoctorSlotCoverage(2);
    assert.deepEqual(second, { doctors: 1, created: 1, failed: 0 });
    assert.equal(rows.some((row) => row.doctorId === "doctor-c"), true);
    assert.deepEqual(pageCursors, [undefined, "doctor-b"]);
    await api.prewarmDoctorSlotCoverage(2);
    assert.equal(pageCursors[2], undefined, "the final partial page wraps to the start");
    assert.equal(windowReads["doctor-a"], 2, "a failing doctor is revisited after the rest of the cohort");
  });

  it("does not certify a doctor suspended between selection and generation; the first active read fills the range", async () => {
    doctorIds = ["doctor-returning"];
    active["doctor-returning"] = true;
    windows["doctor-returning"] = [windowAt(9)];
    afterSelection = () => { active["doctor-returning"] = false; };
    assert.deepEqual(await api.prewarmDoctorSlotCoverage(), { doctors: 1, created: 0, failed: 0 });
    assert.equal(rows.length, 0);
    const before = windowReads["doctor-returning"];
    active["doctor-returning"] = true;
    // Deliberately omit a bus event: suspended generation must never certify
    // this range, even before the lifecycle writer's invalidation reaches it.
    assert.deepEqual((await read("doctor-returning")).map((row) => row.startAt), [instant(9)]);
    assert.ok(windowReads["doctor-returning"] > before);
    const after = windowReads["doctor-returning"];
    invalidate({ doctorIds: ["doctor-returning"] });
    await read("doctor-returning");
    assert.equal(windowReads["doctor-returning"], after, "successful active coverage survives an ordinary inventory event");
  });

  it("repairs an obsolete insert before returning and lets a queued refresh use current coverage", async () => {
    const id = "doctor-racing";
    active[id] = true; windows[id] = [windowAt(9)];
    const oldInsert = deferred();
    delayedInsert = { doctorId: id, wait: oldInsert.wait };
    const oldRead = read(id);
    await oldInsert.ready;
    windows[id] = [windowAt(10)];
    api.invalidateDoctorSlotCoverage(id);
    invalidate({ doctorIds: [id] });
    const newerRead = read(id);
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(insertCalls, 1, "a queued refresh cannot insert beside the old materializer");
    const beforeLateInsert = reconcileReads[id];
    oldInsert.release();
    const results = await Promise.all([oldRead, newerRead]);
    for (const result of results) assert.deepEqual(result.map((row) => row.startAt), [instant(10)]);
    assert.ok(reconcileReads[id] > beforeLateInsert, "obsolete inserted rows must be reconciled before coverage is certified");
    assert.deepEqual(deletedStarts, [instant(9)]);
    assert.deepEqual(rows.map((row) => row.startAt.toISOString()), [instant(10)]);
    assert.deepEqual((await read(id)).map((row) => row.startAt), [instant(10)]);
  });
  it("serializes different ranges and settles all queued callers without retry invalidation loops", async () => {
    const id = "doctor-two-ranges";
    active[id] = true; windows[id] = [windowAt(9)];
    const firstInsert = deferred();
    delayedInsert = { doctorId: id, wait: firstInsert.wait };
    const first = read(id);
    await firstInsert.ready;
    const second = api.listOpenSlotsForDoctorAndService(id, 30, tomorrow, new Date(dayAfter.getTime() + 86_400_000), { skipExpiredRelease: true });
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(insertCalls, 1, "a different range waits for the active materializer");
    windows[id] = [windowAt(10)];
    api.invalidateDoctorSlotCoverage(id);
    invalidate({ doctorIds: [id] });
    const refreshed = read(id);
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(insertCalls, 1, "invalidation cannot start a concurrent generation");
    // A finite fixture budget makes a retry livelock fail deterministically,
    // instead of leaving an unbounded microtask loop in the test process.
    windowReadBudget = 40;
    firstInsert.release();
    const results = await Promise.all([first, second, refreshed]);
    for (const result of results) assert.deepEqual(result.map((row) => row.startAt), [instant(10)]);
    assert.deepEqual(rows.map((row) => row.startAt.toISOString()), [instant(10)]);
    assert.deepEqual(deletedStarts, [instant(9)]);
    assert.equal(insertCalls, 2, "one obsolete insert and one corrected insert suffice for all ranges");
  });
});
