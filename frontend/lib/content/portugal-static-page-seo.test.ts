import { describe, expect, it } from "vitest";

import { portugalStaticPageSeo } from "./portugal-static-page-seo";

describe("portugalStaticPageSeo", () => {
  it("keeps unavailable membership copy accurate on Portugal pricing", () => {
    expect(portugalStaticPageSeo("pt", "pt", "pricing")).toEqual({
      title: "Planos mensais ainda indisponíveis | Global Health Portugal",
      description:
        "Os planos mensais ainda não estão disponíveis em Portugal. Consulte os serviços online e os preços apresentados antes de marcar.",
      h1: "Planos mensais ainda não disponíveis em Portugal",
      lede:
        "Os planos mensais ainda não estão disponíveis em Portugal. Pode consultar os serviços online e os preços apresentados antes de marcar.",
    });
  });

  it("gives the Portugal FAQ a descriptive search title and H1", () => {
    expect(portugalStaticPageSeo("pt", "pt", "faq")).toEqual({
      title: "Perguntas frequentes sobre consultas online | Portugal",
      description:
        "Respostas sobre marcações, pagamentos, videochamadas, privacidade e situações em que uma consulta online pode não ser adequada.",
      h1: "Perguntas frequentes sobre consultas online",
      lede:
        "Respostas sobre marcações, pagamentos, videochamadas e privacidade, incluindo situações em que uma consulta online pode não ser adequada.",
    });
  });

  it("does not affect another market or locale", () => {
    expect(portugalStaticPageSeo("ie", "pt", "pricing")).toBeNull();
    expect(portugalStaticPageSeo("pt", "en", "pricing")).toBeNull();
    expect(portugalStaticPageSeo("pt", "pt", "about")).toBeNull();
  });
});
