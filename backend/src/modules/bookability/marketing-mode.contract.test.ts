import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = join(__dirname, "..");
const doctors = readFileSync(join(root, "doctors", "doctors.service.ts"), "utf8");
const services = readFileSync(join(root, "services", "services.service.ts"), "utf8");
const routes = readFileSync(join(__dirname, "..", "..", "routes", "country-scoped.route.ts"), "utf8");

describe("marketing collection mode", () => {
  it("returns explicit UNKNOWN before live bookability calls", () => {
    for (const source of [doctors, services]) {
      const marketing = source.indexOf("const summaries = options.marketing");
      const live = source.indexOf(": await map", marketing + 1);
      assert.ok(marketing >= 0);
      assert.ok(source.slice(marketing, live).includes('state: "UNKNOWN"'));
    }
  });

  it("keeps live default and exposes marketing only as an opt-in route mode", () => {
    assert.match(doctors, /options: \{ marketing\?: boolean \} = \{\}/);
    assert.match(services, /options: \{ marketing\?: boolean \} = \{\}/);
    assert.match(routes, /mode: z\.enum\(\["live", "marketing"\]\)\.optional\(\)/);
    assert.match(routes, /marketing: query\.data\.mode === "marketing"/);
  });
});
