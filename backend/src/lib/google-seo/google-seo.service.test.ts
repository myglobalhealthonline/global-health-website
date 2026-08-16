import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifySearchConsolePage,
  defaultSearchConsoleRange,
  summarizeSearchConsoleRows,
  type SearchConsoleRow,
} from "./google-seo.service.js";

describe("classifySearchConsolePage", () => {
  it("separates revenue, tools, informational, legacy, and other pages", () => {
    const cases = [
      ["https://www.myglobalhealth.online/", "revenue"],
      ["https://www.myglobalhealth.online/ireland/en", "revenue"],
      ["https://www.myglobalhealth.online/portugal/de", "revenue"],
      ["https://www.myglobalhealth.online/ireland/en/services/sick-certificate-ireland", "revenue"],
      ["https://www.myglobalhealth.online/spain/es/doctors/dr-alfredo-del-valle", "revenue"],
      ["https://www.myglobalhealth.online/ireland/en/lab-tests/vitamin-d-test", "revenue"],
      ["https://www.myglobalhealth.online/czechia/cs/tools/calorie-calculator", "tools"],
      ["https://www.myglobalhealth.online/blog", "informational"],
      ["https://www.myglobalhealth.online/ireland/en/blog", "informational"],
      ["https://www.myglobalhealth.online/ireland/en/blog/example", "informational"],
      ["https://www.myglobalhealth.online/ireland-doctors/dr-example", "legacy"],
      ["https://www.myglobalhealth.online/service-page/ie-medical-consultation", "legacy"],
      ["https://www.myglobalhealth.online/privacy", "other"],
    ] as const;

    for (const [page, expected] of cases) {
      assert.equal(classifySearchConsolePage(page), expected, page);
    }
  });
});

describe("summarizeSearchConsoleRows", () => {
  it("uses impression-weighted position and recomputes CTR", () => {
    const rows: SearchConsoleRow[] = [
      { keys: ["page-a"], clicks: 4, impressions: 20, ctr: 0.2, position: 2 },
      { keys: ["page-b"], clicks: 1, impressions: 80, ctr: 0.0125, position: 10 },
    ];

    assert.deepEqual(summarizeSearchConsoleRows(rows), {
      clicks: 5,
      impressions: 100,
      ctr: 0.05,
      position: 8.4,
      pages: 2,
    });
  });

  it("returns zeros for an empty segment", () => {
    assert.deepEqual(summarizeSearchConsoleRows([]), {
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
      pages: 0,
    });
  });
});

describe("defaultSearchConsoleRange", () => {
  it("returns 28 complete days ending three days before now", () => {
    assert.deepEqual(defaultSearchConsoleRange(new Date("2026-08-16T12:00:00.000Z")), {
      startDate: "2026-07-17",
      endDate: "2026-08-13",
    });
  });
});
