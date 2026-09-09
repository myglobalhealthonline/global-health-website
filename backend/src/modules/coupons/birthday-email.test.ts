import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LocaleCode } from "@prisma/client";
import { renderBirthdayEmail } from "./birthday-email.js";
import en from "./email-copy/en.json";
import pt from "./email-copy/pt.json";
import es from "./email-copy/es.json";
import cs from "./email-copy/cs.json";
import ro from "./email-copy/ro.json";
import de from "./email-copy/de.json";

const input = {
  fullName: "Alex Smith",
  locale: "EN" as LocaleCode,
  code: "BDAY-123",
  discountPercent: 25,
  validUntil: new Date("2026-09-10T00:30:00Z"),
  timezone: "America/Sao_Paulo",
  bookingUrl: "https://example.com/book?service=gp&coupon=BDAY-123",
  unsubscribeUrl: "https://example.com/unsubscribe?token=abc&source=birthday",
};

describe("renderBirthdayEmail", () => {
  const bundles = { EN: en, PT: pt, ES: es, CS: cs, RO: ro, DE: de };
  const tags = { EN: "en-IE", PT: "pt-PT", ES: "es-ES", CS: "cs-CZ", RO: "ro-RO", DE: "de-DE" };
  for (const locale of Object.keys(bundles) as LocaleCode[]) {
    it(`renders birthday copy, terms, expiry and links in ${locale}`, () => {
      const copy = bundles[locale].birthday;
      const result = renderBirthdayEmail({ ...input, locale });
      assert.equal(result.subject, copy.subject.replace("{discountPercent}", "25"));
      assert.ok(result.text.includes(copy.greetingNamed.replace("{name}", "Alex")));
      const expiry = new Intl.DateTimeFormat(tags[locale], {
        day: "numeric", month: "long", year: "numeric", hour: "2-digit",
        minute: "2-digit", timeZoneName: "short", timeZone: input.timezone,
      }).format(input.validUntil);
      for (const value of [copy.personalLock, copy.terms, copy.howTo, copy.cta,
        copy.unsubscribe, input.code, expiry]) {
        assert.ok(result.text.includes(value), value);
        assert.ok(result.html.includes(value), value);
      }
      assert.ok(result.text.includes(input.bookingUrl));
      assert.ok(result.text.includes(input.unsubscribeUrl));
      assert.ok(result.html.startsWith("<!doctype html>"));
      assert.doesNotMatch(result.text, /\{(?:name|discountPercent|validUntil|email)\}/);
      if (locale !== "EN") assert.notEqual(result.subject, renderBirthdayEmail(input).subject);
    });
  }

  it("escapes HTML content and link attributes without escaping plain text", () => {
    const name = `<Alex&"'>`;
    const code = `<script>alert("x")</script>&'`;
    const bookingUrl = `https://example.com/book?a="quoted"&b='<tag>'`;
    const unsubscribeUrl = `https://example.com/unsubscribe?a="quoted"&b='<tag>'`;
    const result = renderBirthdayEmail({ ...input, fullName: name, code, bookingUrl, unsubscribeUrl });
    assert.ok(result.html.includes("&lt;Alex&amp;&quot;&#39;&gt;"));
    assert.ok(result.html.includes("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;&#39;"));
    for (const url of [bookingUrl, unsubscribeUrl]) {
      assert.ok(result.text.includes(url));
      assert.ok(result.html.includes(`href="${url.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}"`));
    }
    assert.ok(result.text.includes(name));
    assert.ok(result.text.includes(code));
    assert.doesNotMatch(result.html, /<script>/);
    assert.doesNotMatch(result.text, /&(?:amp|lt|gt|quot);|&#39;/);
  });

  it("uses anonymous greetings and falls back to English", () => {
    for (const fullName of [undefined, null, "", "   "]) {
      assert.ok(renderBirthdayEmail({ ...input, fullName }).text.startsWith(en.birthday.greetingAnon));
    }
    for (const locale of ["XX", "toString"] as unknown as LocaleCode[]) {
      assert.deepEqual(renderBirthdayEmail({ ...input, locale }), renderBirthdayEmail(input));
    }
  });

  it("uses the requested timezone across a date boundary", () => {
    const local = renderBirthdayEmail(input);
    const utc = renderBirthdayEmail({ ...input, timezone: "UTC" });
    assert.ok(local.text.includes("9 September 2026"));
    assert.ok(utc.text.includes("10 September 2026"));
  });

  it("rejects unsafe or invalid links in either position", () => {
    for (const field of ["bookingUrl", "unsubscribeUrl"]) {
      for (const url of ["javascript:alert(1)", "data:text/html,test", "/relative", "invalid"]) {
        assert.throws(() => renderBirthdayEmail({ ...input, [field]: url }));
      }
    }
  });
});
