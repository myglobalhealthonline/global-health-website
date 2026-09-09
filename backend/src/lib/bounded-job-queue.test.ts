import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BoundedJobQueue } from "./bounded-job-queue.js";

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

describe("BoundedJobQueue", () => {
  it("limits concurrency, coalesces active work, drains, and releases after failure", async () => {
    const calls: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const queue = new BoundedJobQueue(2);
    queue.enqueue("a", async () => { calls.push("a"); await gate; });
    queue.enqueue("a", async () => { calls.push("duplicate"); });
    queue.enqueue("b", async () => { calls.push("b"); throw new Error("expected"); });
    queue.enqueue("c", async () => { calls.push("c"); });
    await flush();
    // b rejects immediately, so its freed permit can start c before the
    // first event-loop turn. The queue must still never run the duplicate a.
    assert.deepEqual(calls.sort(), ["a", "b", "c"]);
    assert.equal(queue.activeCount, 1);
    release();
    await flush(); await flush();
    assert.deepEqual(calls.sort(), ["a", "b", "c"]);
    assert.equal(queue.activeCount, 0);
    assert.equal(queue.queuedCount, 0);
  });

  it("cancels queued jobs on stop", async () => {
    const calls: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const queue = new BoundedJobQueue(1);
    queue.enqueue("a", async () => { calls.push("a"); await gate; });
    queue.enqueue("queued", async () => { calls.push("queued"); });
    await flush();
    assert.equal(queue.queuedCount, 1);
    queue.stop();
    queue.enqueue("b", async () => { calls.push("b"); });
    release();
    await flush();
    assert.deepEqual(calls, ["a"]);
    assert.equal(queue.activeCount, 0);
    assert.equal(queue.queuedCount, 0);
  });

  it("never starts a third job until one of two permits is released", async () => {
    const calls: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const queue = new BoundedJobQueue(2);
    for (const name of ["a", "b", "c"]) {
      queue.enqueue(name, async () => { calls.push(name); await gate; });
    }
    queue.enqueue("c", async () => { calls.push("duplicate"); });
    await flush();
    assert.deepEqual(calls, ["a", "b"]);
    assert.equal(queue.queuedCount, 1);
    release();
    await flush();
    assert.deepEqual(calls, ["a", "b", "c"]);
    assert.equal(queue.activeCount, 0);
  });
});
