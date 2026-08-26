import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const repoRoot = resolve(__dirname, "../../..");
const workflow = readFileSync(`${repoRoot}/.github/workflows/ci.yml`, "utf8");

function stepBlock(name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = workflow.match(new RegExp(`- name: ${escaped}([\\s\\S]*?)(?=\\n\\s{6}- name:|\\n\\s{2}[a-zA-Z0-9_-]+:|$)`));
  assert.ok(match, `CI step not found: ${name}`);
  return match[0];
}

describe("blocking CI security gates", () => {
  for (const name of [
    "Scan (PR — baseline against base branch, only new findings block)",
    "Scan (push — full scan, known baseline findings expected)",
    "Run custom authorization rules (per-file)",
    "Scan Dockerfile + compose config",
    "Scan built image",
  ]) {
    it(`${name} is blocking`, () => {
      assert.doesNotMatch(stepBlock(name), /continue-on-error:\s*true/);
    });
  }

  it("keeps authorization E2E advisory until the isolated stack is proven green", () => {
    assert.match(
      stepBlock("Run E2E (auth setup + authorization boundaries)"),
      /continue-on-error:\s*true/,
    );
  });
});
