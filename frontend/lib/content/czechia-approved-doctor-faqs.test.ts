import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { applyCzechiaApprovedDoctorFaqs } from "./czechia-approved-doctor-faqs";

const unchanged = {
  id: "untouched",
  question: "Original question",
  answer: "Original answer",
  category: "general",
};

const approvedFaqIds: Record<string, string[]> = {
  "dr-ahmed-maklad": ["cmrl5zxt80009a0juv89gv0hs"],
  "khoiamul-islam": ["cmrl60dlo000ya0juiyioxt4v"],
  "mudr-romana-pavlu": ["cmrl60a88000sa0juznacdn72"],
  "mudr-vojtech-cerny": ["cmrl5zud70002a0juyprdpwtr", "cmrl5zukd0003a0jua02nny7w"],
  "mudr-yasmin-holz": [
    "cmrl601x4000ea0jutgyf2i2q",
    "cmrl6024a000fa0jumi26025q",
    "cmrl602bg000ga0jue0woiccy",
  ],
};

describe("applyCzechiaApprovedDoctorFaqs", () => {
  it.each([
    ["dr-ahmed-maklad", "cmrl5zxt80009a0juv89gv0hs", "Jak si rezervovat konzultaci s MUDr. Makladem?"],
    ["khoiamul-islam", "cmrl60dlo000ya0juiyioxt4v", "Jak si rezervovat konzultaci s MUDr. Islamem?"],
    ["mudr-romana-pavlu", "cmrl60a88000sa0juznacdn72", "Jak si rezervovat konzultaci s MUDr. Pavlů?"],
    ["mudr-vojtech-cerny", "cmrl5zud70002a0juyprdpwtr", "Je online konzultace s MUDr. Černým vhodná při náhlém nebo závažném zhoršení?"],
    ["mudr-yasmin-holz", "cmrl601x4000ea0jutgyf2i2q", "Jak ověřím možnost posouzení eNeschopenky při konzultaci s MUDr. Holz?"],
  ])("applies the approved Czech FAQ for %s", (slug, id, question) => {
    const source = [
      { id, question: "unsafe old copy", answer: "unsafe old answer", category: "booking" },
      ...(approvedFaqIds[slug] ?? []).slice(1).map((additionalId) => ({
        id: additionalId,
        question: "unsafe old copy",
        answer: "unsafe old answer",
      })),
      unchanged,
    ];
    const result = applyCzechiaApprovedDoctorFaqs("cz", "cs", slug, source)!;

    expect(result.find((faq) => faq.id === id)?.question).toBe(question);
    expect(result.find((faq) => faq.id === id)?.answer).not.toBe("unsafe old answer");
    expect(result.find((faq) => faq.id === id)?.category).toBe("booking");
    expect(result.find((faq) => faq.id === unchanged.id)).toBe(unchanged);
    expect(source[0]?.question).toBe("unsafe old copy");
  });

  it("suppresses a doctor's FAQ block when any approved ID is missing", () => {
    const source = [
      {
        id: "cmrl5zud70002a0juyprdpwtr",
        question: "old urgent question",
        answer: "old urgent answer",
      },
    ];

    expect(applyCzechiaApprovedDoctorFaqs("cz", "cs", "mudr-vojtech-cerny", source)).toEqual([]);
  });

  it("pins every approved FAQ question and answer to the reviewed copy", () => {
    const reviewedCopy = Object.entries(approvedFaqIds).flatMap(([slug, ids]) => {
      const source = ids.map((id) => ({ id, question: "old", answer: "old" }));
      return applyCzechiaApprovedDoctorFaqs("cz", "cs", slug, source)!.map(
        ({ id, question, answer }) => ({ id, question, answer }),
      );
    });

    expect(createHash("sha256").update(JSON.stringify(reviewedCopy)).digest("hex")).toBe(
      "791e15a8ab27000cb6a5a1b5c0d81ded5b2c0c3f468cc42414a21fbce090ae3d",
    );
  });

  it("leaves other locales and countries on their source FAQs", () => {
    const source = [{ id: "cmrl5zxt80009a0juv89gv0hs", question: "English", answer: "English" }];

    expect(applyCzechiaApprovedDoctorFaqs("cz", "en", "dr-ahmed-maklad", source)).toBe(source);
    expect(applyCzechiaApprovedDoctorFaqs("ie", "cs", "dr-ahmed-maklad", source)).toBe(source);
  });
});
