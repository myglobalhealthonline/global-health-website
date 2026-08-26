import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const repoRoot = resolve(__dirname, "../../..");

function readRepoFile(path: string): string {
  return readFileSync(`${repoRoot}/${path}`, "utf8");
}

describe("retired integrations", () => {
  it("does not retain the retired Make invoice webhook in runtime source or deployment config", () => {
    const runtimeFiles = [
      "backend/src/modules/invoices/generate-invoice.service.ts",
      "backend/.env.example",
      "backend/railway.json",
      "backend/nixpacks.toml",
      "nixpacks.toml",
    ];
    const retiredMarkers = [
      "MAKE_INVOICE_WEBHOOK_URL",
      "hook.eu1.make.com",
      "sendPaymentWebhookToMake",
    ];

    for (const path of runtimeFiles) {
      const source = readRepoFile(path);
      for (const marker of retiredMarkers) {
        assert.equal(source.includes(marker), false, `${path} still contains ${marker}`);
      }
    }
  });
});
