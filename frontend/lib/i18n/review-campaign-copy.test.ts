import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { getReviewCampaignCopy, reviewCampaignMessages } from "./review-campaign-copy";
describe("review campaign language coverage", () => {
 it.each(["en", "cs", "pt", "es", "ro", "pt-br"])("has complete %s copy", (locale) => {
  const copy = getReviewCampaignCopy(locale);
  expect(Object.keys(copy)).toEqual(Object.keys(reviewCampaignMessages.en));
  for (const text of Object.values(copy)) expect(text.trim().length).toBeGreaterThan(0);
 });
 it("keeps patient and email dictionaries identical", () => {
  expect(readFileSync("lib/i18n/review-campaign-copy.ts", "utf8")).toBe(readFileSync("../backend/src/lib/i18n/review-campaign-copy.ts", "utf8"));
 });
 it("keeps Brazilian wording distinct", () => { expect(getReviewCampaignCopy("pt-BR").title).not.toBe(getReviewCampaignCopy("pt").title); });
});
