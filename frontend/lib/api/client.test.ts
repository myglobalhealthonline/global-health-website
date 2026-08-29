import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The module reads env at import time, so each case re-imports it under a
 * stubbed environment.
 */
async function load(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  return import("./client");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("acquireBuildSlot", () => {
  it("defaults to one in-flight read during a build when no env override is set", async () => {
    const m = await load({
      NEXT_PHASE: "phase-production-build",
      NEXT_BUILD_API_CONCURRENCY: undefined,
    });

    let secondEntered = false;
    const first = await m.acquireBuildSlot();
    const second = m.acquireBuildSlot().then((release) => {
      secondEntered = true;
      return release;
    });

    await Promise.resolve();
    expect(secondEntered).toBe(false);

    first();
    await Promise.resolve();
    await Promise.resolve();
    expect(secondEntered).toBe(true);
    (await second)();
  });

  it("is a no-op at runtime — a visitor's SSR is never queued", async () => {
    const m = await load({ NEXT_PHASE: undefined });
    // Ten concurrent acquires all resolve without anything being released.
    const releases = await Promise.all(Array.from({ length: 10 }, () => m.acquireBuildSlot()));
    expect(releases).toHaveLength(10);
    releases.forEach((release) => release());
  });

  it("caps concurrency during a build, and each release admits exactly one waiter", async () => {
    const m = await load({
      NEXT_PHASE: "phase-production-build",
      NEXT_BUILD_API_CONCURRENCY: "2",
    });

    let held = 0;
    let peak = 0;
    const releases: Array<() => void> = [];
    const enter = async () => {
      const release = await m.acquireBuildSlot();
      held += 1;
      peak = Math.max(peak, held);
      releases.push(() => {
        held -= 1;
        release();
      });
    };

    const running = Array.from({ length: 5 }, enter);
    await Promise.resolve();
    await Promise.resolve();
    expect(held).toBe(2);

    // Drain one at a time; the cap must hold for the whole queue.
    while (releases.length > 0) {
      releases.shift()!();
      await Promise.resolve();
      await Promise.resolve();
    }
    await Promise.all(running);
    expect(peak).toBe(2);
  });

  it("ignores a double release, so one slot cannot be handed out twice", async () => {
    const m = await load({
      NEXT_PHASE: "phase-production-build",
      NEXT_BUILD_API_CONCURRENCY: "1",
    });

    const first = await m.acquireBuildSlot();
    let secondEntered = false;
    const second = m.acquireBuildSlot().then((release) => {
      secondEntered = true;
      return release;
    });

    await Promise.resolve();
    expect(secondEntered).toBe(false);

    first();
    first(); // repeated release must not admit a second waiter's worth of slots
    await Promise.resolve();
    await Promise.resolve();
    expect(secondEntered).toBe(true);

    let thirdEntered = false;
    const third = m.acquireBuildSlot().then((release) => {
      thirdEntered = true;
      return release;
    });
    await Promise.resolve();
    expect(thirdEntered).toBe(false);

    (await second)();
    await Promise.resolve();
    await Promise.resolve();
    expect(thirdEntered).toBe(true);
    (await third)();
  });
});
