import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createContextualClient, WorkloadContext } from "./workload-context.js";

describe("WorkloadContext", () => {
  it("isolates concurrent scheduler work and restores request work after failure", async () => {
    const request = { name: "request" };
    const scheduler = { name: "scheduler" };
    const context = new WorkloadContext(request, scheduler);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });

    const scheduled = context.runScheduler(async () => {
      assert.equal(context.client, scheduler);
      await gate;
      assert.equal(context.client, scheduler);
      throw new Error("expected");
    });
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(context.client, request);
    release();
    await assert.rejects(scheduled, /expected/);
    assert.equal(context.client, request);
  });

  it("keeps parallel request work on the request client", async () => {
    const request = { name: "request" };
    const scheduler = { name: "scheduler" };
    const context = new WorkloadContext(request, scheduler);
    await Promise.all([
      Promise.resolve().then(() => assert.equal(context.client, request)),
      Promise.resolve().then(() => assert.equal(context.client, request)),
      context.runScheduler(async () => assert.equal(context.client, scheduler)),
    ]);
  });

  it("delegates model, raw query, and transaction calls to the selected client", async () => {
    type FakeClient = {
      name: string;
      model: { findMany: () => string };
      $queryRaw: (strings: TemplateStringsArray, ...values: unknown[]) => string;
      $queryRawUnsafe: (sql: string) => string;
      $transaction: {
        (work: (tx: { owner: string }) => string): string;
        (operations: readonly string[]): string;
      };
    };
    const makeClient = (name: string): FakeClient => ({
      name,
      model: { findMany: () => `${name}:model` },
      $queryRaw(strings, ...values) { return `${this.name}:tagged:${strings[0]}${values.join(",")}`; },
      $queryRawUnsafe(sql) { return `${this.name}:raw:${sql}`; },
      $transaction(input: ((tx: { owner: string }) => string) | readonly string[]) {
        return typeof input === "function"
          ? input({ owner: this.name })
          : `${this.name}:array:${input.join(",")}`;
      },
    } as FakeClient);
    const request = makeClient("request");
    const scheduler = makeClient("scheduler");
    const context = new WorkloadContext(request, scheduler);
    const client = createContextualClient(context);

    assert.equal(client.model.findMany(), "request:model");
    assert.equal(client.$queryRaw`SELECT ${1}`, "request:tagged:SELECT 1");
    assert.equal(client.$queryRawUnsafe("SELECT 1"), "request:raw:SELECT 1");
    assert.equal(client.$transaction((tx) => tx.owner), "request");
    assert.equal(client.$transaction(["one", "two"]), "request:array:one,two");
    await context.runScheduler(async () => {
      assert.equal(client.model.findMany(), "scheduler:model");
      assert.equal(client.$queryRaw`SELECT ${2}`, "scheduler:tagged:SELECT 2");
      assert.equal(client.$queryRawUnsafe("SELECT 1"), "scheduler:raw:SELECT 1");
      assert.equal(client.$transaction((tx) => tx.owner), "scheduler");
      assert.equal(client.$transaction(["one", "two"]), "scheduler:array:one,two");
    });
  });
});
