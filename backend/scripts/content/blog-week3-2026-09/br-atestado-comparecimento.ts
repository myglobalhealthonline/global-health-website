/**
 * Brazil — Week 3 editorial article.
 *
 * Primary keyword: "atestado de comparecimento" — 8,100/mo, KD 0, informational.
 * Secondary: "declaração de comparecimento abona falta" — 2,900/mo, KD 0;
 *            "declaração de comparecimento serve como atestado" — 1,900/mo, KD 0.
 * OpenSEO research 2026-09-07 (location 2076, pt). SERP: gov.br, TST,
 * JusBrasil, HR blogs, Canva templates; AI Overview present. Angle: the
 * clinic's side of the question — what each document proves, what the
 * law guarantees, and what a doctor is and is not allowed to write.
 *
 * Facts anchored to Lei 605/1949, CLT art. 473 (incisos X, XI, XII and
 * the April 2026 §3º from Lei 15.377/2026), the TST explainer on the two
 * documents, CFM Resoluções 1.658/2002 and 2.314/2022 and the Código de
 * Ética Médica, read 2026-09-07. Separate from the existing "atestado
 * médico online: validade" post.
 */
import { cite, lead, p, ul, warn, type Article } from "../blog-seo-2026-08/template.js";
import type { LocalePost, PostSet } from "../blog-seo-2026-08/types.js";

const TST_DIFERENCA =
  "https://www.tst.jus.br/-/reportagem-especial-voce-sabe-qual-a-diferenca-entre-atestado-medico-e-atestado-de-comparecimento-";
const TST_LIMITE = "https://www.tst.jus.br/-/existe-limite-em-lei-para-atestados-de-comparecimento-|-quero-post";
const LEI_605 = "https://www2.camara.leg.br/legin/fed/lei/1940-1949/lei-605-5-janeiro-1949-367115-publicacaooriginal-1-pl.html";
const LEI_13767 = "https://www2.camara.leg.br/legin/fed/lei/2018/lei-13767-18-dezembro-2018-787479-publicacaooriginal-157014-pl.html";
const LEI_15377 = "https://www2.camara.leg.br/legin/fed/lei/2026/lei-15377-2-abril-2026-798915-publicacaooriginal-178735-pl.html";
const CFM_1658 = "https://portal.cfm.org.br/noticias/resolucao-cfm-n-o-1-658-2002";
const CFM_2314 = "https://sistemas.cfm.org.br/normas/arquivos/resolucoes/BR/2022/2314_2022.pdf";
const CEM_CAP_X = "https://crmpb.org.br/capitulo-x-documentos-medicos/";
const CLT_473 = "https://www.dgrh.unicamp.br/produtos/licenca-acompanhar-gestante-ou-filho-consulta-medica-clt/";
const TRT18 = "https://www.trt18.jus.br/portal/atestado-de-comparecimento-a-posto-de-saude-nao-e-valido-como-atestado-medico-diz-trt/";

const base = "https://www.myglobalhealth.online/brazil/pt";
const links = {
  blog: `${base}/blog`,
  doctors: `${base}/doctors`,
  contact: `${base}/contact`,
  service: `${base}/services/atestado-medico-online`,
  consulta: `${base}/services/consulta-clinica-online`,
  validadeGuide: `${base}/blog/atestado-medico-online-validade`,
};
const AUTHOR = { initials: "GH", name: "Equipe Médica Global Health", line: "Global Health" } as const;

const pt: LocalePost = {
  locale: "PT",
  slug: "atestado-de-comparecimento-abona-falta-diferenca-atestado-medico",
  title: "Atestado de comparecimento abona falta? A diferença para o atestado médico e o que a CLT garante",
  excerpt:
    "A declaração de comparecimento prova que você esteve na consulta. O atestado médico prova que você não podia trabalhar. Só o segundo abona o dia por lei. Veja as exceções da CLT e o que o médico pode escrever.",
  seoTitle: "Atestado de comparecimento abona falta? O que diz a lei",
  seoDescription:
    "Diferença entre atestado de comparecimento e atestado médico, quando a CLT garante a ausência, o que a declaração precisa ter e o que o médico pode dizer.",
  category: "Atestados e documentos",
  article: {
    lang: "pt-BR",
    tagline: "Cuidado médico a qualquer hora, em qualquer lugar",
    categoryLabel: "Atestados e documentos",
    categoryHref: links.blog,
    eyebrow: "Brasil · Guia de documentos médicos",
    h1: "Atestado de comparecimento abona falta? Entenda a diferença para o atestado médico",
    deck: "São dois documentos com funções diferentes. Um justifica o período em que você esteve na consulta; o outro justifica o dia em que você não tinha condições de trabalhar.",
    intro:
      "O <strong>atestado de comparecimento</strong>, também chamado de declaração de comparecimento, comprova que você esteve em uma consulta, exame ou terapia em determinado dia e turno. Ele <strong>não abona a falta do dia inteiro por lei</strong>: segundo o Tribunal Superior do Trabalho, justifica apenas o período do atendimento, e o restante depende da política da empresa ou da convenção coletiva. Quem abona a falta é o <strong>atestado médico</strong>, que só um médico assina e que declara que você estava incapacitado para o trabalho, com base na Lei 605/1949. A CLT garante ausências específicas, como até 3 dias por ano para exames preventivos de câncer.",
    facts: [
      "Declaração de comparecimento: justifica o turno da consulta, não o dia",
      "Atestado médico: abona a falta por doença comprovada (Lei 605/1949)",
      "CLT art. 473: até 3 dias/ano para exames preventivos de câncer",
    ],
    primaryCta: { label: "Explicação do TST sobre os dois documentos", href: TST_DIFERENCA },
    secondaryCta: { label: "Atestado médico online: validade", href: links.validadeGuide },
    panelChip: "O que este guia cobre",
    panelParas: [
      "Qual documento pedir ao sair da consulta, dependendo de como você está.",
      "As três situações em que a CLT garante a ausência mesmo sem doença.",
      "O que o médico pode e não pode escrever, inclusive sobre o CID.",
    ],
    author: AUTHOR,
    reviewLine: "Revisão clínica e editorial obrigatória antes da publicação.",
    navLabel: "Neste artigo",
    sections: [
      {
        id: "diferenca",
        nav: "A diferença",
        eyebrow: "Dois documentos, duas funções",
        h2: "Atestado de comparecimento e atestado médico: qual a diferença",
        blocks: [
          lead("Os dois nomes se parecem, mas cada documento afirma uma coisa diferente."),
          ul([
            "<strong>Declaração (ou atestado) de comparecimento:</strong> afirma que você esteve no local, em tal data e turno, para consulta, exame, terapia ou acompanhamento de alguém. Pode ser assinada por médico, dentista, psicólogo, fisioterapeuta ou pela recepção da unidade.",
            "<strong>Atestado médico:</strong> afirma que você estava sem condições de trabalhar por um período determinado. Só um médico assina, e o documento precisa trazer o dia, o horário e o tempo de repouso necessário.",
          ]),
          p("O TST resume assim: os dois justificam ausências ligadas à saúde, mas apenas o atestado médico cobre o dia inteiro. A declaração de comparecimento cobre o tempo em que você precisou se ausentar para o atendimento. O TRT da 18ª Região decidiu no mesmo sentido, negando validade como atestado médico a uma declaração de comparecimento em posto de saúde."),
          cite("<a href=\"" + TST_DIFERENCA + "\" rel=\"nofollow noopener\" target=\"_blank\">TST — Você sabe qual a diferença entre atestado médico e atestado de comparecimento?</a> e <a href=\"" + TRT18 + "\" rel=\"nofollow noopener\" target=\"_blank\">TRT-18</a>. Acesso em 7 de setembro de 2026."),
        ],
      },
      {
        id: "abona",
        nav: "Abona a falta?",
        eyebrow: "O que a lei garante",
        h2: "A declaração de comparecimento abona a falta?",
        blocks: [
          lead("Por lei, só o período do atendimento. O restante do dia depende da empresa ou da convenção coletiva."),
          p("A Lei 605/1949 diz que a doença do empregado, comprovada por atestado, é falta justificada e paga. Não fala em comparecimento a consulta. Se você foi ao médico às 9h e voltou às 11h, a declaração justifica essas duas horas. Se ficou em casa o dia todo só com ela, a empresa pode descontar o restante, salvo convenção coletiva ou regulamento interno mais favorável. Algumas empresas abonam o dia por política própria; confira a sua. Não há limite legal para o número de declarações, desde que verdadeiras e emitidas por profissional habilitado, como o TST já esclareceu."),
          warn("Peguei o atestado de comparecimento e não voltei ao trabalho", "Se você saiu da consulta sem condições de trabalhar, o documento certo é o atestado médico, e cabe ao médico avaliar isso. Ficar em casa só com a declaração de comparecimento, quando o médico não atestou incapacidade, pode ser tratado como falta parcial."),
          cite("<a href=\"" + LEI_605 + "\" rel=\"nofollow noopener\" target=\"_blank\">Lei 605/1949, art. 6º, §1º, f</a> e <a href=\"" + TST_LIMITE + "\" rel=\"nofollow noopener\" target=\"_blank\">TST — Existe limite em lei para atestados de comparecimento?</a>."),
        ],
      },
      {
        id: "clt-473",
        nav: "Ausências garantidas",
        eyebrow: "CLT, art. 473",
        h2: "Quando a CLT garante a ausência mesmo sem estar doente",
        blocks: [
          lead("Três situações ligadas à saúde estão na lei e não dependem da boa vontade da empresa. A declaração de comparecimento é o que prova cada uma delas."),
          ul([
            "<strong>Exames preventivos de câncer:</strong> até 3 dias a cada 12 meses de trabalho, devidamente comprovados (inciso XII, Lei 13.767/2018). Desde abril de 2026, a Lei 15.377 obriga o empregador a informar o empregado sobre essa possibilidade, citando expressamente os exames de HPV e de câncer.",
            "<strong>Acompanhar a esposa ou companheira na gravidez:</strong> pelo tempo necessário para até 6 consultas médicas ou exames complementares (inciso X, redação da Lei 14.457/2022).",
            "<strong>Acompanhar filho de até 6 anos em consulta médica:</strong> 1 dia por ano (inciso XI, Lei 13.257/2016).",
            "<strong>Consulta, exame ou terapia sua, fora dessas hipóteses:</strong> não há garantia legal de abono; vale a regra do turno explicada acima.",
          ]),
          p("Nesses casos não é preciso atestado médico. É a declaração de comparecimento, com data, turno e finalidade, que comprova o motivo previsto na lei."),
          cite("<a href=\"" + LEI_13767 + "\" rel=\"nofollow noopener\" target=\"_blank\">Lei 13.767/2018</a>, <a href=\"" + LEI_15377 + "\" rel=\"nofollow noopener\" target=\"_blank\">Lei 15.377/2026</a> e <a href=\"" + CLT_473 + "\" rel=\"nofollow noopener\" target=\"_blank\">CLT, art. 473, incisos X e XI</a>."),
        ],
      },
      {
        id: "o-que-precisa-ter",
        nav: "O que precisa ter",
        eyebrow: "Conteúdo mínimo",
        h2: "O que a declaração de comparecimento precisa ter",
        blocks: [
          lead("Sem esses itens, a empresa tem motivo para recusar. Confira antes de sair da recepção."),
          ul([
            "Nome completo do paciente (ou do acompanhado, no caso de acompanhante).",
            "Data e turno do atendimento, ou horário de entrada e saída.",
            "Local do atendimento.",
            "Finalidade: consulta, exame, terapia ou acompanhamento.",
            "Assinatura e identificação do profissional, com carimbo ou número de registro no conselho.",
          ]),
          p("Se o documento é emitido por médico, valem as regras do CFM: dados legíveis, assinatura e carimbo ou CRM, registro do horário. O CID só entra com sua autorização expressa (Resolução CFM 1.658/2002, art. 5º). A empresa pode conferir a autenticidade do documento, não exigir o diagnóstico."),
          cite("<a href=\"" + TST_DIFERENCA + "\" rel=\"nofollow noopener\" target=\"_blank\">TST</a> e <a href=\"" + CFM_1658 + "\" rel=\"nofollow noopener\" target=\"_blank\">Resolução CFM 1.658/2002, arts. 3º a 5º</a>."),
        ],
      },
      {
        id: "medico",
        nav: "O que o médico pode fazer",
        eyebrow: "Consulta presencial ou online",
        h2: "O que o médico pode escrever, inclusive em consulta online",
        blocks: [
          lead("O médico atesta o que observou. Não emite documento sem ato médico que o justifique, e não pode se recusar a atestar o que fez."),
          p("É o Código de Ética Médica: vedado expedir documento sem ato profissional que o justifique (art. 80) e vedado deixar de atestar atos executados quando o paciente pedir (art. 91). Ao final de qualquer consulta você tem direito à declaração de comparecimento. O atestado com afastamento depende da avaliação: se o médico entender que você pode trabalhar, emite a declaração, não o atestado. Em telemedicina a regra é a mesma, com uma exigência a mais: a Resolução CFM 2.314/2022 exige nome, CRM e endereço do médico, identificação do paciente, data, hora e assinatura digital ICP-Brasil. Na Global Health, a <a href=\"" + links.consulta + "\">consulta clínica online</a> segue essa regra: o médico emite a declaração de comparecimento e, quando avalia incapacidade, o <a href=\"" + links.service + "\">atestado médico online</a> com assinatura digital. A consulta não garante o afastamento; o médico decide."),
          cite("<a href=\"" + CEM_CAP_X + "\" rel=\"nofollow noopener\" target=\"_blank\">Código de Ética Médica, capítulo X</a> e <a href=\"" + CFM_2314 + "\" rel=\"nofollow noopener\" target=\"_blank\">Resolução CFM 2.314/2022, art. 13</a>."),
        ],
      },
    ],
    linksEyebrow: "Global Health Brasil",
    linksH2: "Próximos passos",
    linksLead: "O médico avalia e documenta o atendimento. Abonar ou não a falta é decisão da empresa, dentro da lei e da convenção coletiva.",
    links: [
      { label: "Atestado médico online", href: links.service },
      { label: "Consulta clínica online", href: links.consulta },
      { label: "Atestado médico online: validade e regras", href: links.validadeGuide },
      { label: "Médicos no Brasil", href: links.doctors },
      { label: "Fale com a Global Health", href: links.contact },
    ],
    ctaBox: {
      h3: "Precisa de avaliação médica com documento válido?",
      text: "Consulta com médico registrado, declaração de comparecimento e, se houver incapacidade, atestado assinado com certificado ICP-Brasil.",
      primary: { label: "Agendar consulta", href: links.consulta },
      secondary: { label: "Ver médicos", href: links.doctors },
    },
    sourcesEyebrow: "Fontes oficiais",
    sourcesH2: "Fontes deste guia",
    sourcesLead: "Legislação federal, Tribunal Superior do Trabalho e Conselho Federal de Medicina, consultados em 7 de setembro de 2026.",
    sources: [
      { label: "TST — diferença entre atestado médico e atestado de comparecimento", href: TST_DIFERENCA },
      { label: "TST — existe limite em lei para atestados de comparecimento?", href: TST_LIMITE },
      { label: "Lei 605/1949 — repouso semanal remunerado e faltas justificadas", href: LEI_605 },
      { label: "Lei 13.767/2018 — exames preventivos de câncer (CLT art. 473, XII)", href: LEI_13767 },
      { label: "Lei 15.377/2026 — dever de informar sobre exames preventivos", href: LEI_15377 },
      { label: "Resolução CFM 1.658/2002 — atestados médicos", href: CFM_1658 },
      { label: "Resolução CFM 2.314/2022 — telemedicina", href: CFM_2314 },
      { label: "Código de Ética Médica — capítulo X, documentos médicos", href: CEM_CAP_X },
      { label: "TRT-18 — declaração de comparecimento não vale como atestado médico", href: TRT18 },
      { label: "CLT art. 473, incisos X e XI — texto consolidado (Unicamp DGRH)", href: CLT_473 },
    ],
    sourcesNote: "Convenções coletivas e regulamentos internos podem ser mais favoráveis que a lei. Consulte o seu.",
    faqEyebrow: "Perguntas frequentes",
    faqH2: "Dúvidas sobre o atestado de comparecimento",
    faqs: [
      { q: "Atestado de comparecimento cobre quantas horas?", a: "O período do atendimento indicado no documento, normalmente o turno ou o horário de entrada e saída. Não cobre o dia inteiro, salvo política da empresa ou convenção coletiva." },
      { q: "Declaração de comparecimento serve como atestado médico?", a: "Não. O atestado médico exige avaliação de um médico e declara incapacidade para o trabalho. A declaração só comprova presença no atendimento." },
      { q: "A empresa pode exigir o CID na declaração?", a: "Não. Pela Resolução CFM 1.658/2002, o diagnóstico só entra no documento com autorização expressa do paciente. A empresa pode conferir a autenticidade, não o motivo." },
      { q: "Consulta online dá atestado de comparecimento?", a: "Sim, com assinatura digital ICP-Brasil, nome e CRM do médico, data e hora, conforme a Resolução CFM 2.314/2022. O atestado de afastamento depende da avaliação clínica." },
    ],
    disclaimerTitle: "Aviso médico e trabalhista",
    disclaimer:
      "Artigo elaborado com apoio de IA e pendente de revisão clínica e editorial. Informação geral válida em setembro de 2026; não substitui orientação jurídica nem garante a emissão de atestado ou o abono de faltas, que dependem da avaliação médica e das regras da empresa.",
  } satisfies Article,
};

export const BR_ATESTADO_COMPARECIMENTO: PostSet = {
  key: "br-atestado-comparecimento",
  countryCode: "br",
  targetKeyword: "atestado de comparecimento",
  searchVolume: 8100,
  keywordDifficulty: 0,
  evidence:
    "OpenSEO 2026-09-07 (2076/pt): 'atestado de comparecimento' 8,100/KD0; 'declaração de comparecimento abona falta' 2,900/KD0; 'declaração de comparecimento serve como atestado' 1,900/KD0; 'atestado de comparecimento cobre quantas horas' 590/KD0. Administrative, service-adjacent, distinct from the existing atestado-online validity post. Brazil remains a deferred market per editorial-plan §7.3; this is one article, not a cohort.",
  serviceSlug: "atestado-medico-online",
  authorDoctorId: "cmqyzr0fb000o01lu9deh6mf5",
  authorDisplayName: "Equipe Médica Global Health",
  posts: [pt],
};
