import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  irelandGpHubContent,
  irelandSpecialistHubContent,
  type IrelandConsultationHubContent,
} from "./ireland-consultation-hubs.js";

const hubs: IrelandConsultationHubContent[] = [
  irelandGpHubContent,
  irelandSpecialistHubContent,
];

describe("Ireland consultation hub content", () => {
  it("assigns one canonical commercial query to each indexed hub", () => {
    assert.equal(irelandGpHubContent.canonicalPath, "/ireland/en/gp-consultation-online");
    assert.equal(irelandGpHubContent.primaryKeyword, "online gp ireland");
    assert.equal(
      irelandSpecialistHubContent.canonicalPath,
      "/ireland/en/see-a-specialist",
    );
    assert.equal(
      irelandSpecialistHubContent.primaryKeyword,
      "online specialist consultation ireland",
    );
  });

  it("keeps search snippets useful and within editorial limits", () => {
    for (const hub of hubs) {
      assert.ok(hub.seoTitle.length >= 35, `${hub.pageKey} title is too short`);
      assert.ok(hub.seoTitle.length <= 60, `${hub.pageKey} title is too long`);
      assert.ok(
        hub.seoDescription.length >= 120,
        `${hub.pageKey} description is too short`,
      );
      assert.ok(
        hub.seoDescription.length <= 160,
        `${hub.pageKey} description is too long`,
      );
    }
  });

  it("provides complete authored sections instead of thin keyword copy", () => {
    for (const hub of hubs) {
      assert.ok(hub.heroTitle.length > 20);
      assert.ok(hub.heroSubtitle.length > 80);
      assert.ok(hub.intro.length > 140);
      assert.ok(hub.whoForItems.length >= 6);
      assert.ok(hub.whyChooseItems.length >= 5);
      assert.ok(hub.faq.length >= 7);
      assert.ok(hub.disclaimerParagraphs.length >= 4);
      assert.equal(
        new Set(hub.faq.map(({ question }) => question.toLowerCase())).size,
        hub.faq.length,
      );
    }
  });

  it("keeps the split GP headline equal to the authored H1", () => {
    assert.equal(
      [irelandGpHubContent.heroTitleLead, irelandGpHubContent.heroTitleAccent]
        .filter(Boolean)
        .join(" "),
      irelandGpHubContent.heroTitle,
    );
  });

  it("avoids unsupported absolutes and guaranteed clinical outcomes", () => {
    const prohibited = [
      /only multilingual/i,
      /guaranteed (?:appointment|diagnosis|document|outcome|prescription|result)/i,
      /accepted by (?:all )?irish employers/i,
      /same clinical standards as in-person/i,
      /most patients are seen within hours/i,
      /prescription(?:s)? (?:will|are guaranteed)/i,
    ];

    for (const hub of hubs) {
      const copy = JSON.stringify(hub);
      for (const pattern of prohibited) {
        assert.doesNotMatch(copy, pattern, `${hub.pageKey} contains ${pattern}`);
      }
    }
  });

  it("keeps static hub copy free of hardcoded prices and turnaround promises", () => {
    for (const hub of hubs) {
      const staticCopy = JSON.stringify({
        seoTitle: hub.seoTitle,
        seoDescription: hub.seoDescription,
        faq: hub.faq,
      });

      assert.doesNotMatch(staticCopy, /€\s?\d/);
      assert.doesNotMatch(hub.seoTitle, /same-?day/i);
    }
  });

  it("states emergency and clinical-discretion limits on both pages", () => {
    for (const hub of hubs) {
      const limitations = hub.disclaimerParagraphs.join(" ");
      assert.match(limitations, /112/);
      assert.match(limitations, /not suitable for (?:a )?medical emergenc/i);
      assert.match(limitations, /clinical (?:assessment|judgement|decision)/i);
    }
  });

  it("keeps the specialist copy led by the dynamic service catalogue", () => {
    const visibleCopy = JSON.stringify({
      seoDescription: irelandSpecialistHubContent.seoDescription,
      heroSubtitle: irelandSpecialistHubContent.heroSubtitle,
      whoForItems: irelandSpecialistHubContent.whoForItems,
      whyChooseItems: irelandSpecialistHubContent.whyChooseItems,
      faq: irelandSpecialistHubContent.faq,
    });

    assert.match(visibleCopy, /service cards/i);
    assert.doesNotMatch(visibleCopy, /current (?:ireland )?services include/i);
    assert.doesNotMatch(visibleCopy, /no GP referral is required/i);
  });
});
