import assert from "node:assert/strict";
import { it } from "node:test";
import { AvailabilityDependencyCache } from "./availability-dependency-cache.js";

it("evicts values and dependency metadata together and never restores an invalidated evicted read", async () => {
  const cache = new AvailabilityDependencyCache<number>(2, 60_000);
  let finish!: () => void;
  let started!: () => void;
  const ready = new Promise<void>((resolve) => { started = resolve; });
  let calls = 0;
  const load = async () => {
    const value = ++calls;
    if (value === 1) {
      started();
      await new Promise<void>((resolve) => { finish = resolve; });
    }
    return value;
  };
  const first = cache.resolve("a", { countryCode: "ie", doctorIds: ["a"] }, load);
  await ready;
  await cache.resolve("b", { countryCode: "pt", doctorIds: ["b"] }, async () => 10);
  await cache.resolve("c", { countryCode: "es", doctorIds: ["c"] }, async () => 20);
  assert.equal(cache.size, 2);
  cache.invalidate({ doctorIds: ["a"] });
  finish();
  assert.equal(await first, 2);
  assert.equal(cache.size, 2);
  assert.equal(await cache.resolve("c", { countryCode: "es" }, async () => 99), 20);
  cache.invalidate({ countryCodes: [" IE "] });
  assert.equal(cache.size, 1);
  cache.invalidate();
  assert.equal(cache.size, 0);
});

it("expires metadata with values and removes rejected reads", async () => {
  const cache = new AvailabilityDependencyCache<number>(2, -1);
  let calls = 0;
  const read = () => cache.resolve("a", { countryCode: "ie" }, async () => ++calls);
  assert.equal(await read(), 1);
  assert.equal(await read(), 2);
  assert.equal(cache.size, 1);
  await assert.rejects(cache.resolve("bad", { countryCode: "ie" }, async () => { throw new Error("failed"); }));
  assert.equal(cache.size, 1);
});
