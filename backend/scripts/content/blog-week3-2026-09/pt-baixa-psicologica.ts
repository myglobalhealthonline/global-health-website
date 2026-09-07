/**
 * Portugal — Week 3 editorial article.
 *
 * Primary keyword: "baixa psicológica" — 1,900/mo, KD 0, informational.
 * Secondary: "baixa psicológica paga a 100" — 880/mo, KD 0;
 *            "baixa por burnout paga a 100" — 320/mo, KD 0.
 * OpenSEO research 2026-09-07 (location 2620, pt). SERP: bank and HR
 * blogs; AI Overview present. Angle: a clinic answering the two things
 * those pages get vague about — who can actually issue it, and the exact
 * percentages, including the "paga a 100%" myth.
 *
 * Facts anchored to the Segurança Social Guia Prático do Subsídio de
 * Doença (2026), Decreto-Lei 28/2004, Decreto-Lei 2/2024, the Ordem dos
 * Médicos note on CIT issuance and SNS 24 pages, read 2026-09-07. Stays
 * separate from the existing "quanto se recebe" and "autodeclaração" posts
 * by focusing on the mental-health-specific questions.
 */
import { cite, lead, p, ul, warn, type Article } from "../blog-seo-2026-08/template.js";
import type { LocalePost, PostSet } from "../blog-seo-2026-08/types.js";

const SS_GUIA = "https://www.seg-social.pt/ptss/pssd/documento/cmdde8gsx000qi12yzi40plc6";
const SS_SUBSIDIO = "https://www.seg-social.pt/subsidio-de-doenca";
const SS_INCAPACIDADE = "https://www.seg-social.pt/incapacidade-temporaria";
const SS_SVI = "https://www.seg-social.pt/ptss/pssd/documento/cmc20y16i00szkl2ykdlcewrc";
const DL_2_2024 = "https://diariodarepublica.pt/dr/detalhe/decreto-lei/2-2024-836117864";
const OM_CIT = "https://ordemdosmedicos.pt/emissao-de-cit-alargada-ao-sector-privado-social-e-servicos-de-urgencia";
const SNS24_CIT = "https://www.sns24.gov.pt/servico/aceder-ao-certificado-de-incapacidade-temporaria/";
const SNS24_PSI = "https://www.sns24.gov.pt/servico/aconselhamento-psicologico-no-sns-24/";

const base = "https://www.myglobalhealth.online/portugal/pt";
const links = {
  blog: `${base}/blog`,
  doctors: `${base}/doctors`,
  contact: `${base}/contact`,
  service: `${base}/services/saude-mental`,
  baixa: `${base}/services/baixa-medica`,
  valorGuide: `${base}/blog/baixa-medica-quanto-se-recebe-como-calcular`,
  autoGuide: `${base}/blog/autodeclaracao-de-doenca-ou-baixa-medica`,
};
const AUTHOR = { initials: "GH", name: "Global Health Medical Team", line: "Global Health" } as const;

const pt: LocalePost = {
  locale: "PT",
  slug: "baixa-psicologica-como-pedir-quanto-recebe",
  title: "Baixa psicológica: quem a passa, quanto se recebe e porque não é paga a 100%",
  excerpt:
    "A baixa psicológica é uma baixa médica normal com um diagnóstico de saúde mental. Quem a pode emitir, os 55%, 60% e 70% que a Segurança Social paga, e o que muda no burnout.",
  seoTitle: "Baixa psicológica: como pedir e quanto se recebe",
  seoDescription:
    "Quem pode passar uma baixa psicológica em Portugal, como se pede, quanto paga a Segurança Social por escalão e porque não é paga a 100%.",
  category: "Saúde Mental",
  article: {
    lang: "pt-PT",
    tagline: "Medicina em Portugal, explicada sem atalhos",
    categoryLabel: "Saúde Mental",
    categoryHref: links.blog,
    eyebrow: "Portugal · Guia de baixa médica",
    h1: "Baixa psicológica: como pedir, quanto se recebe e o que é mito",
    deck: "É uma baixa médica como qualquer outra. Só um médico a emite, a Segurança Social paga por escalões e o burnout não dá direito a 100%.",
    intro:
      "A <strong>baixa psicológica</strong> não existe como categoria legal separada. É o Certificado de Incapacidade Temporária (CIT) normal, emitido por um médico, com um diagnóstico de saúde mental: ansiedade, depressão, burnout. Um psicólogo não a pode passar. A Segurança Social paga <strong>55% da remuneração de referência até 30 dias, 60% dos 31 aos 90 e 70% dos 91 aos 365</strong>, com três dias de espera. A única doença paga a 100% é a tuberculose, por isso a resposta a “baixa psicológica paga a 100” é não.",
    facts: [
      "Só um médico emite o CIT; o psicólogo acompanha, não certifica",
      "55% até 30 dias, 60% dos 31 aos 90, 70% dos 91 aos 365 dias",
      "Nenhuma baixa por saúde mental é paga a 100%",
    ],
    primaryCta: { label: "Guia Prático da Segurança Social", href: SS_GUIA },
    secondaryCta: { label: "Quanto se recebe: cálculo passo a passo", href: links.valorGuide },
    panelChip: "Em resumo",
    panelParas: [
      "Marque consulta com um médico, não com o psicólogo, quando precisar do certificado.",
      "O CIT segue eletronicamente para a Segurança Social; entregue cópia à entidade empregadora.",
      "Se a baixa se prolongar, pode ser chamado a uma verificação de incapacidade. Faltar significa perder o subsídio.",
    ],
    author: AUTHOR,
    reviewLine: "É necessária revisão clínica e linguística antes da publicação.",
    navLabel: "Neste guia",
    sections: [
      {
        id: "quem-passa",
        nav: "Quem a pode passar",
        eyebrow: "CIT e diagnóstico",
        h2: "Quem pode passar uma baixa psicológica",
        blocks: [
          lead("Qualquer médico que o avalie e conclua que não está em condições de trabalhar. O que conta é a incapacidade, não a especialidade."),
          p("Na prática são três portas: o médico de família, o psiquiatra quando já há acompanhamento e, desde 1 de março de 2024, qualquer médico do setor privado ou social, incluindo urgências e consultas online com médico inscrito na Ordem, porque o Decreto-Lei 2/2024 alargou a emissão do CIT a esses prestadores. O psicólogo fica de fora porque o CIT é um ato médico, como a própria Ordem dos Psicólogos explica aos utentes. O relatório do psicólogo ajuda a fundamentar a baixa, mas não a substitui."),
          ul([
            "<strong>Até 3 dias:</strong> autodeclaração de doença no SNS 24, duas vezes por ano, sem médico. Serve para uma crise curta, não para um burnout.",
            "<strong>Mais de 3 dias:</strong> CIT emitido por médico.",
            "<strong>Prazo de garantia:</strong> 6 meses de descontos e 12 dias de trabalho nos 4 meses anteriores.",
          ]),
          cite("Fontes: <a href=\"" + DL_2_2024 + "\" rel=\"nofollow noopener\" target=\"_blank\">Decreto-Lei n.º 2/2024</a>, <a href=\"" + OM_CIT + "\" rel=\"nofollow noopener\" target=\"_blank\">Ordem dos Médicos sobre a emissão de CIT</a> e <a href=\"" + SS_GUIA + "\" rel=\"nofollow noopener\" target=\"_blank\">Guia Prático do Subsídio de Doença</a>, consultados a 7 de setembro de 2026."),
        ],
      },
      {
        id: "quanto-recebe",
        nav: "Quanto se recebe",
        eyebrow: "Escalões de 2026",
        h2: "Quanto paga a Segurança Social numa baixa psicológica",
        blocks: [
          lead("Exatamente o mesmo que em qualquer outra baixa. A percentagem depende da duração, não do diagnóstico."),
          ul([
            "<strong>Até 30 dias:</strong> 55% da remuneração de referência.",
            "<strong>31 a 90 dias:</strong> 60%.",
            "<strong>91 a 365 dias:</strong> 70%.",
            "<strong>Mais de 365 dias:</strong> 75%.",
          ]),
          p("Os dois primeiros escalões sobem 5 pontos se a remuneração de referência for igual ou inferior a 500 euros, com três ou mais filhos até aos 16 anos ou um filho com bonificação por deficiência. Há três dias de espera, exceto em internamento, cirurgia de ambulatório ou tuberculose, e o limite é de 1.095 dias. O cálculo com números está no nosso <a href=\"" + links.valorGuide + "\">guia sobre o valor da baixa médica</a>."),
        ],
      },
      {
        id: "paga-a-100",
        nav: "Paga a 100%?",
        eyebrow: "O mito mais pesquisado",
        h2: "A baixa psicológica é paga a 100%?",
        blocks: [
          lead("Não. A percentagem depende apenas da duração da baixa, e isso vale para depressão, ansiedade e burnout."),
          p("A única situação paga a 100% é a tuberculose com mais de dois familiares a cargo. O internamento não dá 100%: só elimina os dias de espera. A ideia de que a baixa por depressão ou burnout é paga por inteiro vem de complementos que algumas empresas pagam por contrato coletivo. Existem, mas são um acordo com o empregador, não uma regra da Segurança Social."),
          warn("Se lhe prometerem 100%", "Se lhe disserem que “com o código certo” a baixa fica a 100%, desconfie. O médico regista o diagnóstico; a percentagem é fixada por lei em função dos dias, e nenhum diagnóstico de saúde mental a altera."),
          cite("<a href=\"" + SS_SUBSIDIO + "\" rel=\"nofollow noopener\" target=\"_blank\">Segurança Social — Subsídio de doença</a>."),
        ],
      },
      {
        id: "burnout",
        nav: "Burnout e depressão",
        eyebrow: "O que muda na prática",
        h2: "Baixa por burnout, ansiedade ou depressão: o que muda",
        blocks: [
          lead("Nos direitos não muda nada. Na consulta muda o acompanhamento."),
          p("O burnout não é, em rigor, um diagnóstico de doença: a classificação internacional de doenças da OMS (CID-11) descreve-o como um fenómeno ligado ao trabalho, não como doença. Isso não impede a baixa. O médico certifica a incapacidade que observa, normalmente descrita como reação ao stress, ansiedade ou episódio depressivo. O que muda é o acompanhamento: uma baixa que se limita a parar sem tratamento costuma prolongar-se. Espere um plano com psicologia, se necessário psiquiatria, e revisão a duas ou quatro semanas. Uma <a href=\"" + links.service + "\">consulta de saúde mental</a> com um médico da Global Health pode avaliar a situação e, se houver incapacidade, emitir o CIT, sem garantir a baixa nem a sua duração. Se a baixa se prolongar, o Sistema de Verificação de Incapacidades pode convocá-lo. Quem falta perde o subsídio."),
          cite("<a href=\"" + SS_SVI + "\" rel=\"nofollow noopener\" target=\"_blank\">Guia do Serviço de Verificação de Incapacidades</a>."),
        ],
      },
      {
        id: "como-pedir",
        nav: "Como pedir",
        eyebrow: "Passo a passo",
        h2: "Como pedir a baixa psicológica",
        blocks: [
          ul([
            "<strong>1. Consulta médica.</strong> Sintomas, duração, impacto no trabalho. Leve relatórios do psicólogo, se os tiver.",
            "<strong>2. CIT.</strong> Segue eletronicamente para a Segurança Social. Em papel, entregue-o em 5 dias úteis, ou o subsídio só conta desde a entrega.",
            "<strong>3. Empregador.</strong> Entregue a cópia, disponível no portal ou app SNS 24.",
            "<strong>4. Renovação.</strong> Marque a reavaliação antes da data de fim, não depois.",
          ]),
          p("Em crise, não espere pela consulta. A linha SNS 24, 808 24 24 24, tem aconselhamento psicológico 24 horas por dia, com psicólogos clínicos. Em risco imediato ligue 112."),
          cite("<a href=\"" + SS_INCAPACIDADE + "\" rel=\"nofollow noopener\" target=\"_blank\">Segurança Social — Incapacidade temporária</a>, <a href=\"" + SNS24_CIT + "\" rel=\"nofollow noopener\" target=\"_blank\">SNS 24 — aceder ao CIT</a> e <a href=\"" + SNS24_PSI + "\" rel=\"nofollow noopener\" target=\"_blank\">SNS 24 — aconselhamento psicológico</a>."),
        ],
      },
    ],
    linksEyebrow: "Global Health Portugal",
    linksH2: "Avaliação médica e apoio",
    linksLead: "O médico avalia a incapacidade e emite o CIT. A Segurança Social decide o subsídio.",
    links: [
      { label: "Consulta de saúde mental", href: links.service },
      { label: "Baixa médica online", href: links.baixa },
      { label: "Quanto se recebe na baixa médica", href: links.valorGuide },
      { label: "Autodeclaração de doença ou baixa médica", href: links.autoGuide },
      { label: "Médicos em Portugal", href: links.doctors },
      { label: "Contactar a Global Health", href: links.contact },
    ],
    ctaBox: {
      h3: "Precisa de avaliação médica?",
      text: "Um médico avalia a sua situação e, se houver incapacidade para o trabalho, emite o CIT. A consulta não garante a baixa.",
      primary: { label: "Marcar consulta de saúde mental", href: links.service },
      secondary: { label: "Ver médicos", href: links.doctors },
    },
    sourcesEyebrow: "Fontes oficiais",
    sourcesH2: "Fontes deste guia",
    sourcesLead: "Percentagens e prazos retirados das páginas da Segurança Social e da legislação em vigor, verificados a 7 de setembro de 2026.",
    sources: [
      { label: "Segurança Social — Guia Prático do Subsídio de Doença", href: SS_GUIA },
      { label: "Segurança Social — Subsídio de doença", href: SS_SUBSIDIO },
      { label: "Segurança Social — Incapacidade temporária", href: SS_INCAPACIDADE },
      { label: "Segurança Social — Serviço de Verificação de Incapacidades", href: SS_SVI },
      { label: "Decreto-Lei n.º 2/2024 — emissão de CIT no setor privado e social", href: DL_2_2024 },
      { label: "Ordem dos Médicos — emissão de CIT alargada", href: OM_CIT },
      { label: "SNS 24 — aconselhamento psicológico", href: SNS24_PSI },
    ],
    sourcesNote: "Confirme o seu caso na Segurança Social Direta. Complementos pagos pela empresa dependem do contrato coletivo.",
    faqEyebrow: "Perguntas frequentes",
    faqH2: "Dúvidas sobre a baixa psicológica",
    faqs: [
      { q: "O psicólogo pode passar baixa?", a: "Não. O CIT é emitido por um médico. O relatório do psicólogo pode fundamentar a decisão médica, mas não substitui o certificado." },
      { q: "A baixa por burnout é paga a 100%?", a: "Não. Paga 55% até 30 dias, 60% dos 31 aos 90 e 70% dos 91 aos 365. Só a tuberculose tem pagamento a 100%, e apenas com mais de dois familiares a cargo." },
      { q: "Posso pedir baixa psicológica numa consulta online?", a: "Sim, desde 2024, com um médico inscrito na Ordem dos Médicos. O médico decide se há incapacidade; a consulta não garante o certificado." },
      { q: "Posso sair de casa durante a baixa psicológica?", a: "A Segurança Social prevê a perda do subsídio a quem sai de casa sem autorização médica ou falta à verificação de incapacidade. Pergunte ao médico o que fica registado no seu caso." },
    ],
    disclaimerTitle: "Informação médica e social",
    disclaimer:
      "Artigo elaborado com apoio de IA e sujeito a revisão clínica e linguística antes da publicação. Informação geral válida a setembro de 2026; não é decisão da Segurança Social, aconselhamento individual nem garantia de emissão ou duração da baixa.",
  } satisfies Article,
};

export const PT_BAIXA_PSICOLOGICA: PostSet = {
  key: "pt-baixa-psicologica",
  countryCode: "pt",
  targetKeyword: "baixa psicológica",
  searchVolume: 1900,
  keywordDifficulty: 0,
  evidence:
    "OpenSEO 2026-09-07 (2620/pt): 'baixa psicológica' 1,900/KD0; 'baixa psicológica paga a 100' 880/KD0; 'baixa por burnout paga a 100' 320/KD0; 'baixa psiquiátrica é paga na totalidade' 260/KD0. Named in editorial-plan §7.3 (Portugal burnout leave). Distinct intent from the existing amount/calculation post.",
  serviceSlug: "saude-mental",
  authorDoctorId: "cmqwnkhcd00007gjummb923nm",
  authorDisplayName: "Global Health Medical Team",
  reviewerDoctorId: "cmqwnkoqe000c7gju26jtb7qt",
  reviewerDisplayName: "Dra. Margarida Domingues e Andrade",
  posts: [pt],
};
