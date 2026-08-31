import { describe, expect, it } from "vitest";
import { readBoundedBody } from "./read-bounded-body";

const stream = (...chunks: number[][]) => new ReadableStream<Uint8Array>({ start(controller) { for (const chunk of chunks) controller.enqueue(Uint8Array.from(chunk)); controller.close(); } });
describe("readBoundedBody", () => {
  it("preserves bytes within the cap", async () => expect([...await readBoundedBody(stream([1, 2], [3]), 3) ?? []]).toEqual([1, 2, 3]));
  it("stops a chunked body as soon as it crosses the cap", async () => expect(await readBoundedBody(stream([1, 2], [3, 4]), 3)).toBeNull());
});
