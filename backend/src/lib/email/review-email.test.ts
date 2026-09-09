import assert from "node:assert/strict";
import { test } from "node:test";
import { buildReviewInviteEmail } from "./templates.js";

test("every localized review email has three email-safe action buttons and escaped links", () => {
  for (const localeCode of ["en", "cs", "pt", "es", "ro", "pt-br"]) {
    for (const reminder of [false, true]) {
      const link = "https://example.test/reviews/rate?token=synthetic&lang=" + localeCode;
      const { html, text } = buildReviewInviteEmail({ link, localeCode, reminder });
      assert.equal((html.match(/padding:16px 24px/g) ?? []).length, 3);
      assert.equal((html.match(/token=synthetic&amp;lang=/g) ?? []).length, 3);
      assert.ok(html.includes('bgcolor="#B0F122"'));
      assert.ok(text.includes(link));
    }
  }
});
