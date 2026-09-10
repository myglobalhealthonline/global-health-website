import assert from "node:assert/strict";
import { test } from "node:test";
import { buildReviewInviteEmail } from "./templates.js";

test("every localized review email has one button and two secondary text links", () => {
  for (const localeCode of ["en", "cs", "pt", "es", "ro", "pt-br"]) {
    for (const reminder of [false, true]) {
      const link = "https://example.test/reviews/rate?token=synthetic&lang=" + localeCode;
      const { html, text } = buildReviewInviteEmail({ link, localeCode, reminder });
      assert.equal((html.match(/padding:16px 24px/g) ?? []).length, 1);
      assert.equal((html.match(/color:#52645B;text-decoration:underline/g) ?? []).length, 2);
      assert.equal((html.match(/token=synthetic&amp;lang=/g) ?? []).length, 3);
      assert.ok(html.includes('bgcolor="#B0F122"'));
      assert.ok(html.includes('align="center" style="margin:16px auto;"'));
      assert.ok(text.includes(link));
    }
  }
});
