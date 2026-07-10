import assert from "node:assert";
import { describe, it } from "node:test";
import { TtlCache } from "./ttl-cache.js";

describe("TtlCache", () => {
  it("returns a fresh value and evicts it once it expires", async () => {
    const cache = new TtlCache<string>(10);
    cache.set("a", "hello", 10);
    assert.equal(cache.get("a"), "hello");
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(cache.get("a"), undefined);
    // The expired entry must be deleted on read, not just skipped.
    assert.equal(cache.size, 0);
  });

  it("evicts the oldest entry once maxEntries is exceeded", () => {
    const cache = new TtlCache<number>(2);
    cache.set("a", 1, 60_000);
    cache.set("b", 2, 60_000);
    cache.set("c", 3, 60_000); // should evict "a" (oldest insertion)
    assert.equal(cache.size, 2);
    assert.equal(cache.get("a"), undefined);
    assert.equal(cache.get("b"), 2);
    assert.equal(cache.get("c"), 3);
  });

  it("re-setting an existing key does not count as growth", () => {
    const cache = new TtlCache<number>(2);
    cache.set("a", 1, 60_000);
    cache.set("b", 2, 60_000);
    cache.set("a", 99, 60_000);
    assert.equal(cache.size, 2);
    assert.equal(cache.get("a"), 99);
    assert.equal(cache.get("b"), 2);
  });
});
