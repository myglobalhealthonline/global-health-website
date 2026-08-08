import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LocaleCode } from "@prisma/client";
import {
  buildCardContentFromRow,
  countryDisplayName,
  resolveCardLocale,
  type CardContentRow,
} from "./membership-card-content.js";
import enCopy from "./email-copy/en.json";
import csCopy from "./email-copy/cs.json";

/**
 * §24/§25/§43 — the shared card builder.
 *
 * Pure: every case here is a row literal in, strings out, no database. That is
 * deliberate — these are the properties that would otherwise only be checked by
 * looking at a rendered card, and the ones a careless change breaks silently
 * (a flat benefit list, a dependent told the family's allowance is theirs, a
 * member written to in the partner's language after setting their own).
 */

const IE = "ie-id";
const CZ = "cz-id";

function row(overrides: Partial<CardContentRow> = {}): CardContentRow {
  const base = {
    id: "enr-1",
    membershipId: "GH-MEMB-ABCD1234",
    email: "member@example.com",
    firstName: "Alex",
    lastName: "Doyle",
    status: "ACTIVE",
    startDate: new Date("2026-01-01"),
    endDate: new Date("2027-12-31"),
    memberType: "PRIMARY",
    preferredLocale: null,
    cardIssuedAt: null,
    primaryEnrollment: null,
    user: null,
    plan: {
      name: "Partner Plan",
      primaryCountryId: IE,
      primaryCountry: { code: "ie", defaultLocale: LocaleCode.EN },
      translations: [],
      countries: [
        { countryId: IE, country: { code: "ie", currency: { code: "EUR" } } },
        { countryId: CZ, country: { code: "cz", currency: { code: "CZK" } } },
      ],
    },
    level: {
      name: "Standard",
      allowancePool: "PER_PERSON",
      cardBackgroundHex: null,
      translations: [],
      benefits: [
        {
          id: "b-ie",
          countryId: IE,
          serviceKind: "GENERAL",
          benefitType: "ALLOWANCE",
          allowanceCount: 6,
          percentOff: null,
          fixedPriceCents: null,
          service: null,
        },
        {
          id: "b-cz",
          countryId: CZ,
          serviceKind: "SPECIALIST",
          benefitType: "PERCENT",
          allowanceCount: null,
          percentOff: 20,
          fixedPriceCents: null,
          service: null,
        },
      ],
    },
  };
  return { ...base, ...overrides } as CardContentRow;
}

describe("locale precedence (§25)", () => {
  it("prefers the linked account over everything else", () => {
    const locale = resolveCardLocale(
      row({
        user: { email: "a@b.c", preferredLocale: LocaleCode.DE },
        preferredLocale: LocaleCode.CS,
      }),
    );
    assert.equal(locale, LocaleCode.DE);
  });

  it("NEVER lets the CSV value override a linked account", () => {
    // The whole point of the ordering: a member who sets their language in the
    // portal must not keep receiving mail in whatever the partner's
    // spreadsheet said, with no way to correct it from the portal they used.
    const linked = resolveCardLocale(
      row({
        user: { email: "a@b.c", preferredLocale: LocaleCode.EN },
        preferredLocale: LocaleCode.CS,
      }),
    );
    assert.equal(linked, LocaleCode.EN, "the account wins even when the CSV disagrees");
  });

  it("falls back to the enrollment's own value while unlinked", () => {
    assert.equal(resolveCardLocale(row({ preferredLocale: LocaleCode.CS })), LocaleCode.CS);
  });

  it("falls back to the primary country's default when neither is set", () => {
    const r = row();
    r.plan.primaryCountry.defaultLocale = LocaleCode.PT;
    assert.equal(resolveCardLocale(r), LocaleCode.PT);
  });

  it("falls back to English when the country has no default either", () => {
    const r = row();
    // The column is non-null in the schema, but a partially-selected row from a
    // future caller must not silently produce `undefined` as a locale.
    (r.plan.primaryCountry as { defaultLocale: LocaleCode | null }).defaultLocale = null;
    assert.equal(resolveCardLocale(r), LocaleCode.EN);
  });
});

describe("benefits grouped by country (§25)", () => {
  it("groups rows under their own country rather than one flat list", () => {
    const content = buildCardContentFromRow(row(), enCopy.card);
    assert.equal(content.benefitsByCountry.length, 2);
    assert.deepEqual(
      content.benefitsByCountry.map((g) => g.countryCode),
      ["IE", "CZ"],
    );
    assert.equal(content.benefitsByCountry[0].lines.length, 1);
    assert.equal(content.benefitsByCountry[1].lines.length, 1);
  });

  it("puts the primary country first, then the rest alphabetically", () => {
    const r = row();
    r.plan.primaryCountryId = CZ;
    const content = buildCardContentFromRow(r, enCopy.card);
    assert.deepEqual(
      content.benefitsByCountry.map((g) => g.countryCode),
      ["CZ", "IE"],
    );
  });

  it("prices a FIXED benefit in ITS OWN country's currency, never the plan's", () => {
    const r = row();
    r.level.benefits[1] = {
      ...r.level.benefits[1],
      benefitType: "FIXED",
      percentOff: null,
      fixedPriceCents: 90000,
    };
    const content = buildCardContentFromRow(r, enCopy.card);
    const czech = content.benefitsByCountry.find((g) => g.countryCode === "CZ")!;
    assert.match(czech.lines[0].text, /CZK|Kč/, `expected koruna, got: ${czech.lines[0].text}`);
    assert.doesNotMatch(czech.lines[0].text, /€/, "a Czech fixed price must not be shown in euro");
  });

  it("names countries in the member's own language", () => {
    assert.equal(countryDisplayName("cz", LocaleCode.EN), "Czechia");
    assert.equal(countryDisplayName("cz", LocaleCode.DE), "Tschechien");
    // A malformed code degrades to the code rather than throwing mid-send —
    // one bad row must not cost an import its whole batch of cards.
    assert.equal(countryDisplayName("not-a-code", LocaleCode.EN), "NOT-A-CODE");
  });

  it("drops a benefit row whose country the plan does not cover", () => {
    const r = row();
    r.level.benefits[1] = { ...r.level.benefits[1], countryId: "not-covered" };
    const content = buildCardContentFromRow(r, enCopy.card);
    assert.deepEqual(
      content.benefitsByCountry.map((g) => g.countryCode),
      ["IE"],
    );
  });
});

describe("covered countries on the card (§24.1)", () => {
  it("lists CONFIGURED countries only, primary first", () => {
    const content = buildCardContentFromRow(row(), enCopy.card);
    assert.deepEqual(content.countryCodes, ["IE", "CZ"]);
  });

  it("omits a covered country that has no benefit rows", () => {
    // Coverage is not configuration (§20): a country with no rows gives no
    // benefit at all, and printing its code on the card would be a lie the
    // member only discovers at a desk abroad.
    const r = row();
    r.plan.countries.push({ countryId: "pt-id", country: { code: "pt", currency: { code: "EUR" } } });
    const content = buildCardContentFromRow(r, enCopy.card);
    assert.deepEqual(content.countryCodes, ["IE", "CZ"]);
  });
});

describe("shared-pool wording (§43)", () => {
  it("tells a SHARED dependent the allowance is shared, not theirs", () => {
    const content = buildCardContentFromRow(
      row({
        memberType: "DEPENDENT",
        primaryEnrollment: { membershipId: "GH-MEMB-ABCD1234" },
        level: { ...row().level, allowancePool: "SHARED" },
      }),
      enCopy.card,
    );
    assert.equal(content.sharesPool, true);
    const allowance = content.benefitsByCountry[0].lines[0];
    assert.equal(allowance.sharedPool, true);
    assert.match(allowance.text, /shared with your primary member/);
  });

  it("does NOT claim sharing for a dependent on a PER_PERSON level", () => {
    // §43 as first written applied the wording to every dependent, but a
    // PER_PERSON dependent genuinely holds their own units and "shared with
    // your primary" is then simply false.
    const content = buildCardContentFromRow(
      row({
        memberType: "DEPENDENT",
        primaryEnrollment: { membershipId: "GH-MEMB-ABCD1234" },
      }),
      enCopy.card,
    );
    assert.equal(content.sharesPool, false);
    assert.doesNotMatch(content.benefitsByCountry[0].lines[0].text, /shared/i);
    assert.match(content.benefitsByCountry[0].lines[0].text, /6 included/);
  });

  it("never promises a bare unit count to a shared dependent in any locale", () => {
    for (const [locale, copy] of [
      [LocaleCode.EN, enCopy.card],
      [LocaleCode.CS, csCopy.card],
    ] as const) {
      const content = buildCardContentFromRow(
        row({
          memberType: "DEPENDENT",
          primaryEnrollment: { membershipId: "GH-MEMB-ABCD1234" },
          preferredLocale: locale,
          level: { ...row().level, allowancePool: "SHARED" },
        }),
        copy,
      );
      const line = content.benefitsByCountry[0].lines[0];
      assert.equal(line.sharedPool, true, `${locale} lost the shared flag`);
      assert.notEqual(
        line.text,
        content.benefitsByCountry[0].lines[0].text.replace(/,.*/, ""),
        `${locale} produced the unshared wording`,
      );
      assert.ok(line.text.length > 20, `${locale} copy looks like the bare count`);
    }
  });

  it("shows the primary's number on a dependent's card", () => {
    const content = buildCardContentFromRow(
      row({
        memberType: "DEPENDENT",
        membershipId: "GH-MEMB-ABCD1234-D1",
        primaryEnrollment: { membershipId: "GH-MEMB-ABCD1234" },
      }),
      enCopy.card,
    );
    assert.equal(content.primaryMembershipId, "GH-MEMB-ABCD1234");
  });
});

describe("the card's own fields (§24.1)", () => {
  it("reads the term as a month/year while it is running", () => {
    const content = buildCardContentFromRow(row(), enCopy.card);
    assert.match(content.validThrough, /2027/);
    assert.doesNotMatch(content.validThrough, /Ended|From/);
  });

  it("says a future term has not started, rather than reading as live", () => {
    const content = buildCardContentFromRow(
      row({ startDate: new Date("2099-01-01"), endDate: null }),
      enCopy.card,
    );
    assert.match(content.validThrough, /^From /);
  });

  it("says open-ended when there is no end date", () => {
    const content = buildCardContentFromRow(row({ endDate: null }), enCopy.card);
    assert.equal(content.validThrough, enCopy.card.valueOpenEnded);
  });

  it("marks a term that has already ended", () => {
    const content = buildCardContentFromRow(
      row({ startDate: new Date("2020-01-01"), endDate: new Date("2021-01-01") }),
      enCopy.card,
    );
    assert.match(content.validThrough, /^Ended /);
  });

  it("carries no palette when the level has no colour set", () => {
    assert.equal(buildCardContentFromRow(row(), enCopy.card).palette, null);
  });

  it("derives the whole palette from the level's one stored hex", () => {
    const content = buildCardContentFromRow(
      row({ level: { ...row().level, cardBackgroundHex: "#F5F0E6" } }),
      enCopy.card,
    );
    assert.equal(content.palette?.background, "#F5F0E6");
    assert.equal(content.palette?.foreground, "#08150F", "a pale face must take dark ink");
    assert.ok(content.palette?.chrome, "chrome derives too, or a pale card keeps a lime border");
  });

  it("translates the plan and level names when a translation exists", () => {
    const r = row({ preferredLocale: LocaleCode.CS });
    r.plan.translations = [{ locale: LocaleCode.CS, name: "Partnerský program" }];
    r.level.translations = [{ locale: LocaleCode.CS, name: "Standardní" }];
    const content = buildCardContentFromRow(r, csCopy.card);
    assert.equal(content.planName, "Partnerský program");
    assert.equal(content.levelName, "Standardní");
  });

  it("falls back to the untranslated name rather than showing a blank", () => {
    const content = buildCardContentFromRow(row({ preferredLocale: LocaleCode.RO }), enCopy.card);
    assert.equal(content.planName, "Partner Plan");
    assert.equal(content.levelName, "Standard");
  });
});
