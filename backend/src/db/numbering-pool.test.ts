import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const db = readFileSync(join(__dirname, "prisma.ts"), "utf8");

describe("numbering pool ownership", () => {
  it("caps, exports, and shuts down the one dedicated raw counter pool", () => {
    assert.match(db, /export const numberingPool/);
    assert.match(db, /max: env\.NUMBERING_POOL_MAX/);
    assert.match(db, /await numberingPool\.end\(\)\.catch/);
    assert.match(db, /total: workloadBudget\.total \+ env\.SCHEDULER_LOCK_POOL_MAX \+ env\.NUMBERING_POOL_MAX/);
  });

  it("moves every counter generator to the shared pool", () => {
    for (const file of ["../lib/global-health-number.ts", "../lib/invoice-number.ts", "../lib/order-number.ts"]) {
      const source = readFileSync(join(__dirname, file), "utf8");
      assert.match(source, /import \{ numberingPool \} from "\.\.\/db\/prisma\.js"/);
      assert.match(source, /numberingPool\.connect\(\)/);
      assert.doesNotMatch(source, /new Pool\(/);
    }
  });
});
