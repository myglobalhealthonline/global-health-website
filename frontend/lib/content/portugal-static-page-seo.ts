export type PortugalStaticPageSeo = Readonly<{
  title: string;
  description: string;
  h1: string;
  lede?: string;
}>;

const COPY: Record<string, PortugalStaticPageSeo> = {
  pricing: {
    title: "Planos mensais ainda indisponíveis | Global Health Portugal",
    description:
      "Os planos mensais ainda não estão disponíveis em Portugal. Consulte os serviços online e os preços apresentados antes de marcar.",
    h1: "Planos mensais ainda não disponíveis em Portugal",
    lede:
      "Os planos mensais ainda não estão disponíveis em Portugal. Pode consultar os serviços online e os preços apresentados antes de marcar.",
  },
  faq: {
    title: "Perguntas frequentes sobre consultas online | Portugal",
    description:
      "Respostas sobre marcações, pagamentos, videochamadas, privacidade e situações em que uma consulta online pode não ser adequada.",
    h1: "Perguntas frequentes sobre consultas online",
    lede:
      "Respostas sobre marcações, pagamentos, videochamadas e privacidade, incluindo situações em que uma consulta online pode não ser adequada.",
  },
};

export function portugalStaticPageSeo(
  countryCode: string | null,
  locale: string,
  path: string,
): PortugalStaticPageSeo | null {
  return countryCode === "pt" && locale === "pt" ? COPY[path] ?? null : null;
}
