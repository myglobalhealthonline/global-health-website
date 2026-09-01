import { describe, expect, it } from "vitest";

import { getServiceSeo } from "@/data/service-seo";
import { COUNTRY_CONTACT } from "@/lib/content/country-contact";
import { getMarketFaq } from "@/lib/content/country-faq";

describe("Portugal public FAQ copy", () => {
  it("keeps questions accurate without repeating the head term throughout the hub", () => {
    const document = getMarketFaq("pt", "pt", "pt");
    expect(document?.exact).toBe(true);

    const questions = document!.groups.flatMap((group) =>
      group.items.map((item) => item.question),
    );
    expect(questions).toContain(
      "Quanto tempo demora até ser atendido numa consulta online em Portugal?",
    );
    expect(
      questions.filter((question) => /consulta(?: médica)? online/i.test(question)),
    ).toHaveLength(3);
  });

  it("does not promise certificate validity, immediate availability, or issuance", () => {
    const document = getMarketFaq("pt", "pt", "pt")!;
    const hubCopy = JSON.stringify(document.groups);
    const contactCopy = JSON.stringify(COUNTRY_CONTACT.pt.copy.pt);
    const consultation = getServiceSeo("pt", "consulta-medica")!;
    const certificate = getServiceSeo("pt", "medical-exam")!;

    for (const copy of [
      hubCopy,
      contactCopy,
      consultation.description,
      certificate.description,
    ]) {
      expect(copy).not.toMatch(
        /mesmo valor legal|atendimento no mesmo dia|obtenha atestado|documento garantido/i,
      );
    }
  });
});
