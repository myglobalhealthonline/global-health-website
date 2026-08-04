/**
 * Portugal — article 1 of 2.
 *
 * Target keyword: "autodeclaração de doença" — 12,100/mo, KD 0 (OpenSEO /
 * DataForSEO, location 2620, language pt, expansion run 2026-08-04).
 * Cluster, all KD 0: validar autodeclaração de doença 4,400 ·
 * autodeclaração de doença pdf 1,000 · imprimir autodeclaração de doença
 * 1,000 · autodeclaração de doença 1 dia 880 · simulador baixa médica 1,300 ·
 * baixa médica valores 720 · baixa médica 5 dias úteis 480 ·
 * pedir baixa médica online 390.
 *
 * This replaced the original pick "baixa médica" (4,400/mo) once the pt/2620
 * expansion showed it at KD 20 — exactly on the difficulty ceiling — while the
 * autodeclaração cluster sits at KD 0 with roughly three times the volume and
 * the same commercial destination. "baixa médica" is still covered here, as
 * the second half of the article, so the CIT terms are not given up.
 *
 * Why it can rank: page 1 for baixa médica is SNS24 plus banks, insurers and
 * HR/payroll blogs (santander.pt, coverflex.com, doutorfinancas.pt,
 * fedfinance.pt, factorialhr.pt). The autodeclaração queries are answered
 * almost entirely by Segurança Social itself and by aggregator PDFs. No
 * doctor-authored page explains the boundary between the two instruments.
 *
 * HONESTY CONSTRAINT — the single most important thing in this file.
 * Our Portuguese service is "baixa-medica", whose real name in the database is
 * "Justificação Médica de Falta ao Trabalho". That is a medical justification
 * of absence. It is NOT a Certificado de Incapacidade Temporária, which is the
 * instrument that opens subsídio de doença and is issued through the SNS. The
 * article states that distinction plainly instead of blurring it, because
 * blurring it would be a claim the business cannot support.
 *
 * No figures: the number of days an autodeclaração covers, how many times a
 * year it may be used, the período de espera and subsídio percentages are all
 * statutory and change. Every one of them points at Segurança Social instead.
 */
import { cite, lead, p, renderArticle, ul, warn, type Article } from "./template.js";
import type { LocalePost, PostSet } from "./types.js";

const SEG_SOCIAL = "https://www.seg-social.pt/";
const SNS24_BAIXA = "https://www.sns24.gov.pt/servico/baixa-medica/";
const ORDEM_MEDICOS = "https://ordemdosmedicos.pt/";

const href = (lang: string, path: string) => `https://www.myglobalhealth.online/portugal/${lang}${path}`;

const pt: LocalePost = {
  locale: "PT",
  slug: "autodeclaracao-de-doenca-ou-baixa-medica",
  title: "Autodeclaração de doença ou baixa médica: qual precisa e quando",
  excerpt:
    "A autodeclaração de doença é submetida por si na Segurança Social Direta e justifica faltas curtas. A baixa médica é outro instrumento, emitida por médico, e é a que abre o subsídio de doença. Explicamos a diferença e o que fazer em cada caso.",
  seoTitle: "Autodeclaração de doença ou baixa médica? (2026)",
  seoDescription:
    "Autodeclaração de doença ou baixa médica: quem emite cada uma, como se submete na Segurança Social Direta e qual dá direito a subsídio de doença.",
  category: "Medicina Geral e Familiar",
  article: {
    lang: "pt-PT",
    tagline: "Medicina a qualquer hora, em qualquer lugar",
    categoryLabel: "Medicina Geral e Familiar",
    categoryHref: href("pt", "/blog"),
    eyebrow: "Portugal · Guia para trabalhadores",
    h1: "Autodeclaração de doença ou baixa médica?",
    deck: "São dois instrumentos diferentes, com emissores diferentes e efeitos diferentes. Escolher o errado é a razão mais comum para uma falta acabar por não ser justificada.",
    intro:
      "A <strong>autodeclaração de doença</strong> é preenchida e submetida <em>por si</em>, na Segurança Social Direta, sob compromisso de honra, e serve para justificar uma ausência curta ao trabalho. Não passa por médico e <strong>não dá direito a subsídio de doença</strong>. A <strong>baixa médica</strong> é outra coisa: assenta num <strong>Certificado de Incapacidade Temporária (CIT)</strong> emitido por médico através do sistema do SNS, é essa que comunica a incapacidade à Segurança Social e é essa que pode abrir o subsídio de doença. Regra prática: ausência muito curta e sem necessidade clínica de ser observado, autodeclaração; doença que o impede de trabalhar mais tempo, consulta médica.",
    facts: ["Autodeclaração: submete você mesmo", "Baixa médica: emitida por médico", "Só o CIT abre subsídio de doença"],
    primaryCta: { label: "Marcar consulta médica", href: href("pt", "/services/baixa-medica") },
    secondaryCta: { label: "Baixa médica no SNS 24", href: SNS24_BAIXA },
    panelChip: "O que este guia cobre",
    panelParas: [
      "Quem emite cada um dos documentos, o que cada um prova e o que cada um não prova.",
      "Onde e como se submete a autodeclaração, e por que razão a validação pela entidade patronal existe.",
      "O número de dias, o número de utilizações por ano, o período de espera e os valores do subsídio são fixados por lei e mudam. Não são citados aqui: cada um remete para a Segurança Social.",
    ],
    author: { initials: "RR", name: "Dr Rui Diogo Rodrigues", line: "Médico de Clínica Geral e Medicina Familiar · Global Health Portugal" },
    reviewLine: "Revisto clinicamente pela Dra. Margarida Domingues e Andrade, médica de Medicina Geral e Familiar, Global Health Portugal.",
    navLabel: "Neste artigo",
    sections: [
      {
        id: "autodeclaracao",
        nav: "Autodeclaração",
        eyebrow: "Instrumento 1",
        h2: "O que é a autodeclaração de doença",
        blocks: [
          lead("É uma declaração sua, sob compromisso de honra, de que esteve doente e impossibilitado de trabalhar durante um período curto."),
          p("Submete-se na <strong>Segurança Social Direta</strong>, na área do próprio trabalhador, e destina-se a situações de doença ligeira em que não há necessidade clínica de ser observado por um médico. Foi criada precisamente para evitar deslocações a unidades de saúde apenas para obter um papel."),
          ul([
            "É <strong>o trabalhador</strong> quem a preenche e submete — não o médico, não a entidade patronal.",
            "Serve para <strong>justificar a falta</strong> perante a entidade patronal.",
            "<strong>Não</strong> gera subsídio de doença, porque não há certificação clínica de incapacidade.",
            "O número de dias que abrange, e quantas vezes por ano pode ser usada, estão fixados na lei e são indicados no próprio formulário da Segurança Social Direta.",
          ]),
          warn("É uma declaração sob compromisso de honra", "Não é um formulário sem consequências. Declarar falsamente uma situação de doença tem implicações disciplinares e legais. A autodeclaração existe para simplificar a justificação de doença real, não para criar dias de folga."),
        ],
      },
      {
        id: "validar",
        nav: "Validação",
        eyebrow: "Do lado da empresa",
        h2: "Como a entidade patronal confirma a autodeclaração",
        blocks: [
          lead("A entidade patronal não tem de acreditar na sua palavra — e também não tem de lhe pedir explicações clínicas."),
          p("A submissão na Segurança Social Direta gera um comprovativo que pode ser consultado e confirmado. É esse mecanismo que substitui o papel assinado: a empresa confirma que a declaração existe e a que período respeita, sem ter acesso a qualquer informação sobre o seu estado de saúde."),
          p("A entidade patronal <strong>não tem direito a saber o seu diagnóstico</strong>, nem na autodeclaração nem na baixa médica. O que lhe é comunicado é a existência e o período da ausência justificada. A informação clínica está protegida por sigilo médico e pelas regras de proteção de dados de saúde."),
          cite(`Submissão e consulta: <a href="${SEG_SOCIAL}" rel="nofollow noopener" target="_blank">Segurança Social</a>.`),
        ],
      },
      {
        id: "baixa",
        nav: "Baixa médica",
        eyebrow: "Instrumento 2",
        h2: "O que é a baixa médica e o CIT",
        blocks: [
          lead("Quando a doença ultrapassa o âmbito da autodeclaração, o que passa a existir é um Certificado de Incapacidade Temporária."),
          p("O <strong>CIT</strong> é emitido por médico, através do sistema do SNS, e é transmitido eletronicamente à Segurança Social. É esse documento que atesta clinicamente que está temporariamente incapaz para o trabalho, e é a partir dele que se avalia o direito ao <strong>subsídio de doença</strong>."),
          ul([
            "É <strong>o médico</strong> que decide se existe incapacidade e qual o período — não o utente e não a entidade patronal.",
            "O CIT segue por via eletrónica; não é o utente que o transporta.",
            "Se a incapacidade se prolongar, há reavaliação médica; em determinadas circunstâncias pode haver junta médica.",
            "O período de espera antes do início do pagamento e a forma de cálculo do subsídio são definidos por lei e constam do portal da Segurança Social.",
          ]),
          warn("Nenhuma consulta garante uma baixa", "A emissão de um certificado de incapacidade depende do que a avaliação clínica mostrar. Qualquer serviço que prometa a baixa antes de o médico o observar está a prometer o que um médico não pode, deontologicamente, garantir."),
          cite(`Informação oficial sobre baixa médica: <a href="${SNS24_BAIXA}" rel="nofollow noopener" target="_blank">SNS 24</a>.`),
        ],
      },
      {
        id: "privado",
        nav: "Consulta privada",
        eyebrow: "Transparência",
        h2: "O que uma consulta privada pode — e não pode — emitir",
        blocks: [
          lead("Esta é a parte que a maioria dos sites evita dizer com clareza, por isso dizemo-la primeiro."),
          p("Numa consulta privada, incluindo por vídeo, o médico avalia-o e pode emitir uma <strong>declaração médica de justificação de falta ao trabalho</strong>. É esse o serviço que prestamos, e é assim que se chama. Serve para justificar a ausência perante a entidade patronal."),
          p("O que uma consulta privada <strong>não</strong> é, por si só, é a via para o subsídio de doença. Esse depende do CIT emitido através do sistema do SNS. Se a sua situação exigir subsídio de doença, o caminho passa pelo SNS, e o papel de uma consulta privada é avaliá-lo depressa e encaminhá-lo com indicação clínica, não substituir esse circuito."),
          ul([
            "Precisa apenas de justificar a falta perante a entidade patronal: uma declaração médica cumpre esse efeito.",
            "Precisa de subsídio de doença: precisa de CIT, e portanto do circuito do SNS.",
            "Não sabe qual dos dois é o seu caso: é exatamente isso que uma consulta resolve em poucos minutos.",
          ]),
          p(`Pode confirmar a inscrição de qualquer médico junto da <a href="${ORDEM_MEDICOS}" rel="nofollow noopener" target="_blank">Ordem dos Médicos</a>, connosco como em qualquer outro lado.`),
        ],
      },
      {
        id: "qual-escolher",
        nav: "Qual escolher",
        eyebrow: "Decisão",
        h2: "Qual dos dois se aplica ao seu caso",
        blocks: [
          lead("Três perguntas resolvem quase todas as situações."),
          ul([
            "<strong>Quanto tempo vai faltar?</strong> Ausência muito curta, dentro do que a lei permite declarar, e sem necessidade clínica de ser observado: autodeclaração.",
            "<strong>Precisa de ser pago durante a ausência pela Segurança Social?</strong> Se sim, precisa de CIT, e portanto de médico.",
            "<strong>A doença precisa de ser avaliada?</strong> Se há dúvida sobre o que tem, se os sintomas se agravam, ou se já esgotou o que a autodeclaração permite, a resposta é consulta — a justificação é o subproduto, não o objetivo.",
          ]),
          p("Há ainda uma quarta situação, frequentemente esquecida: doença de familiar a cargo, assistência a filho e outras faltas por motivo de saúde de terceiros seguem regras próprias, distintas de ambos os instrumentos acima. Essas constam do portal da Segurança Social."),
        ],
      },
      {
        id: "urgencia",
        nav: "Quando não esperar",
        eyebrow: "Segurança",
        h2: "Quando o problema não é o papel",
        blocks: [
          lead("Há situações em que tratar da justificação é a última coisa a fazer."),
          ul([
            "Dor ou aperto no peito, sobretudo com falta de ar, suores ou dor a irradiar para o braço ou mandíbula.",
            "Fraqueza súbita de um lado do corpo, boca ao lado, dificuldade em falar ou dor de cabeça súbita e intensa.",
            "Dificuldade respiratória em repouso, ou lábios e face azulados.",
            "Manchas na pele que não desaparecem à pressão, com febre, rigidez da nuca ou confusão.",
            "Hemorragia abundante ou vómitos com sangue.",
            "Qualquer ideia de se magoar a si próprio.",
          ]),
          p("Nestes casos ligue <strong>112</strong>, ou contacte o <strong>SNS 24</strong> se tiver dúvidas sobre a gravidade. A justificação da falta trata-se depois — e trata-se sempre."),
        ],
      },
    ],
    linksEyebrow: "Global Health Portugal",
    linksH2: "Passos seguintes",
    linksLead: "Os nossos médicos em Portugal avaliam-no por vídeo e dizem-lhe, com clareza, qual dos dois caminhos é o seu.",
    links: [
      { label: "Consulta e justificação médica de falta ao trabalho", href: href("pt", "/services/baixa-medica") },
      { label: "Os nossos médicos em Portugal", href: href("pt", "/doctors") },
      { label: "Contactar a Global Health Portugal", href: href("pt", "/contact") },
    ],
    ctaBox: {
      h3: "Não sabe se precisa de médico?",
      text: "Uma consulta curta esclarece se a sua situação se resolve com autodeclaração ou se precisa mesmo de avaliação clínica — e, quando é o caso, emite a justificação médica da falta.",
      primary: { label: "Marcar consulta", href: href("pt", "/services/baixa-medica") },
      secondary: { label: "Ver os nossos médicos", href: href("pt", "/doctors") },
    },
    sourcesEyebrow: "Fontes oficiais",
    sourcesH2: "Onde confirmar as regras",
    sourcesLead: "Dias abrangidos, utilizações por ano, período de espera e valores do subsídio são definidos por lei e mudam. Confirme sempre na fonte.",
    sources: [
      { label: "Segurança Social", href: SEG_SOCIAL },
      { label: "SNS 24 — baixa médica", href: SNS24_BAIXA },
      { label: "Ordem dos Médicos", href: ORDEM_MEDICOS },
    ],
    sourcesNote: "As ligações abrem nos sites das entidades competentes. A Global Health não integra a Segurança Social nem o SNS, não emite Certificados de Incapacidade Temporária e não pode decidir, acelerar ou garantir qualquer prestação social.",
    faqEyebrow: "FAQ",
    faqH2: "Perguntas frequentes",
    faqs: [
      {
        q: "A autodeclaração de doença dá direito a subsídio de doença?",
        a: "Não. A autodeclaração justifica a falta perante a entidade patronal, mas não envolve certificação clínica de incapacidade. O subsídio de doença depende de um Certificado de Incapacidade Temporária emitido por médico através do sistema do SNS.",
      },
      {
        q: "Onde se submete a autodeclaração de doença?",
        a: "Na Segurança Social Direta, na área do próprio trabalhador, sob compromisso de honra. A submissão gera um comprovativo que a entidade patronal pode confirmar, sem ter acesso a qualquer informação clínica sobre si.",
      },
      {
        q: "Quantos dias cobre a autodeclaração e quantas vezes por ano posso usá-la?",
        a: "Os limites são fixados por lei e estão indicados no próprio formulário da Segurança Social Direta no momento da submissão. Como mudam, confirme-os no portal da Segurança Social e não num artigo.",
      },
      {
        q: "A minha entidade patronal pode exigir saber o que tenho?",
        a: "Não. Quer na autodeclaração quer na baixa médica, o que é comunicado é a existência e o período da ausência justificada. O diagnóstico é informação clínica protegida por sigilo médico e pelas regras de proteção de dados de saúde.",
      },
      {
        q: "Uma consulta privada online pode passar-me uma baixa médica?",
        a: "Uma consulta privada pode emitir uma declaração médica que justifica a falta ao trabalho. O Certificado de Incapacidade Temporária, que é o que abre o subsídio de doença, é emitido através do sistema do SNS. Se precisar de subsídio de doença, o circuito é esse.",
      },
      {
        q: "Já usei a autodeclaração e continuo doente. O que faço?",
        a: "Marque consulta. Quando a doença ultrapassa o âmbito da autodeclaração, a situação deixa de ser administrativa e passa a ser clínica: é preciso avaliar o que tem, decidir tratamento e, se for caso disso, certificar a incapacidade.",
      },
    ],
    disclaimerTitle: "Aviso Médico",
    disclaimer:
      "Escrito pelo Dr Rui Diogo Rodrigues, médico de Clínica Geral e Medicina Familiar da Global Health Portugal, e revisto clinicamente pela Dra. Margarida Domingues e Andrade, médica de Medicina Geral e Familiar. Este artigo contém informação geral sobre a justificação de faltas por doença em Portugal. Não constitui aconselhamento médico personalizado, nem aconselhamento jurídico ou laboral. O direito a prestações sociais é decidido exclusivamente pela Segurança Social. Em caso de emergência médica, ligue imediatamente 112.",
  } satisfies Article,
};

export const PT_AUTODECLARACAO: PostSet = {
  key: "pt-autodeclaracao",
  countryCode: "pt",
  targetKeyword: "autodeclaração de doença",
  searchVolume: 12100,
  keywordDifficulty: 0,
  evidence:
    "pt/2620 expansion 2026-08-04. Cluster all at KD 0: autodeclaração de doença 12,100, validar autodeclaração de doença 4,400, autodeclaração de doença pdf 1,000, imprimir autodeclaração de doença 1,000, autodeclaração de doença 1 dia 880, simulador baixa médica 1,300, baixa médica valores 720, pedir baixa médica online 390. Replaced the original 'baixa médica' pick, which the same run put at KD 20 — on the ceiling — for a third of the volume; baixa médica terms are still covered by the second half of the article. SERP for baixa médica is SNS24 plus banks/insurers/HR blogs; the autodeclaração queries are answered by Segurança Social itself and aggregator PDFs. No doctor-authored page explains the boundary.",
  serviceSlug: "baixa-medica",
  authorDoctorId: "cmqwnkhcd00007gjummb923nm",
  authorDisplayName: "Dr Rui Diogo Rodrigues",
  reviewerDoctorId: "cmqwnkoqe000c7gju26jtb7qt",
  reviewerDisplayName: "Dra. Margarida Domingues e Andrade",
  posts: [pt],
};
