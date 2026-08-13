/**
 * Brazil — article 2 of 2.
 *
 * TARGET CHANGED by the br/2076 expansion (2026-08-04), the same way the CZ,
 * PT and RO expansions changed theirs.
 *
 * Original pick: "pedido de exames online" — 210/mo. The expansion found a
 * tighter cluster with roughly eight times the combined volume, all KD 0:
 * solicitação de exames pdf 590 · solicitação de exames laboratoriais 480 ·
 * pedido de exames laboratoriais 320 · exemplo de pedido de ultrassom 260.
 * New head: "solicitação de exames laboratoriais" (480, KD 0), with
 * "solicitação de exames pdf" (590, KD 0) as the largest single term and
 * "pedido de exames online" retained inside the article.
 *
 * Rejected: the SUS-navigational mass (meu sus digital 201,000 KD 68, conecte
 * sus 74,000 KD 36, consulta online sus grátis 1,900 KD 24) and the
 * "telemedicina" head (49,500 KD 26) — all above the difficulty ceiling.
 * "consulta online da atestado" (4,400, KD 8) belongs to the sibling article
 * br-atestado-medico and is not targeted twice.
 *
 * SERP read (get_serp_results, br/2076, 2026-08-04): rank 2 is the CFM's
 * Prescrição Eletrônica FAQ page for exam requests; the rest of page one is
 * hospital and health-plan request forms (hcor.com.br, unimedcuritiba,
 * unimed.coop.br, saude.df.gov.br), a municipal PDF form, a clinic-software
 * blog and two pages arguing about which professionals may request exams. As
 * with the Romanian article, page one is forms rather than explanation. The
 * live question nobody answers well — which exams a lab will actually run
 * without a request, and why a request exists at all — is where this article
 * sits.
 *
 * Link verification note: the CFM hosts sit behind a WAF that refuses
 * automated requests. prescricaoeletronica.cfm.org.br and portal.cfm.org.br
 * were verified through the live SERP on 2026-08-04. gov.br/saude and
 * validar.iti.gov.br were curl-verified 200.
 *
 * HONESTY CONSTRAINT. Our Brazilian service is "solicitacao-exames-online"
 * ("Solicitação de Exames") — a consultation that may result in an exam
 * request when there is a clinical reason for it. We do not sell exam
 * requests, we do not collect samples and we do not report imaging. Coverage
 * by a health plan or by the SUS is decided by the plan or by the SUS, never
 * by us. All three statements are in the article.
 *
 * No figures: prices, turnaround times, fasting requirements and plan
 * authorisation rules vary by laboratory and by plan, and none appear here.
 *
 * Brazil has one doctor in the database (Dr. Renato Sarmento), so this set
 * ships without a reviewer line.
 */
import { cite, lead, p, renderArticle, ul, warn, type Article } from "./template.js";
import type { LocalePost, PostSet } from "./types.js";

const CFM_EXAMES = "https://prescricaoeletronica.cfm.org.br/faq_pacientes/solicitacao-de-exames/";
const CFM_BUSCA = "https://portal.cfm.org.br/busca-medicos";
const ITI_VALIDAR = "https://validar.iti.gov.br/";
const GOV_SAUDE = "https://www.gov.br/saude/pt-br";

const href = (lang: string, path: string) => `https://www.myglobalhealth.online/brazil/${lang}${path}`;

const pt: LocalePost = {
  locale: "PT",
  slug: "solicitacao-de-exames-laboratoriais-online",
  title: "Solicitação de exames laboratoriais: como funciona o pedido médico",
  excerpt:
    "O pedido de exames existe para que o resultado signifique alguma coisa. Explicamos o que a solicitação precisa conter, quais exames o laboratório costuma aceitar sem pedido, como funciona o pedido digital e por que exame sem indicação atrapalha mais do que ajuda.",
  seoTitle: "Solicitação de exames laboratoriais: como funciona",
  seoDescription:
    "Solicitação de exames laboratoriais: o que o pedido médico precisa conter, como funciona em PDF assinado digitalmente e quando o exame é feito sem pedido.",
  category: "Exames e diagnóstico",
  article: {
    lang: "pt-BR",
    tagline: "Cuidado médico a qualquer hora, em qualquer lugar",
    categoryLabel: "Exames e diagnóstico",
    categoryHref: href("pt", "/blog"),
    eyebrow: "Brasil · Guia para pacientes",
    h1: "Solicitação de exames laboratoriais",
    deck: "Um exame só é útil quando alguém sabe o que vai fazer com o resultado. É isso que o pedido médico documenta.",
    intro:
      "A <strong>solicitação de exames</strong> é o documento em que o médico registra quais exames devem ser feitos e por quê. Ela pode ser emitida em papel ou <strong>em PDF com assinatura digital</strong>, aceita pelos laboratórios do mesmo modo — o Conselho Federal de Medicina mantém plataforma própria para isso. O pedido serve a três coisas ao mesmo tempo: dizer ao laboratório <strong>o que coletar</strong>, dar ao plano de saúde a <strong>indicação clínica</strong> quando ela é exigida, e garantir que exista <strong>um médico responsável por interpretar o resultado</strong>. Alguns exames de rotina podem ser feitos por conta própria em laboratório particular, mas isso resolve a coleta, não a interpretação.",
    facts: [
      "Vale em PDF com assinatura digital",
      "Indicação clínica é parte do pedido",
      "Resultado sem interpretação não é diagnóstico",
    ],
    primaryCta: { label: "Consulta e solicitação de exames", href: href("pt", "/services/solicitacao-exames-online") },
    secondaryCta: { label: "Solicitação de exames — CFM", href: CFM_EXAMES },
    panelChip: "O que este guia cobre",
    panelParas: [
      "O que o pedido precisa conter para o laboratório e para o plano de saúde aceitarem.",
      "Como funciona a solicitação digital e como qualquer pessoa confere a assinatura.",
      "Quando um exame pode ser feito sem pedido — e por que isso raramente é a melhor ideia.",
      "Preços, prazos, preparo e regras de autorização variam por laboratório e por plano. Aqui não há números: confirme no laboratório e no seu plano.",
    ],
    author: {
      initials: "RS",
      name: "Dr. Renato Sarmento",
      line: "Médico de Família e Comunidade · Global Health Brasil",
    },
    navLabel: "Neste artigo",
    sections: [
      {
        id: "para-que",
        nav: "Para que serve",
        eyebrow: "Ponto de partida",
        h2: "Para que serve o pedido médico",
        blocks: [
          lead("A pergunta que importa não é «que exames eu faço», e sim «que pergunta esses exames respondem»."),
          p("Cada exame tem uma margem de resultados normais construída a partir de uma população. Isso significa que, em qualquer bateria grande de exames feita em alguém saudável, é estatisticamente esperado que alguma coisa venha ligeiramente fora da faixa. Sem uma pergunta clínica por trás, esse achado não é informação: é um susto, que costuma gerar novos exames, novas consultas e às vezes procedimentos que não seriam necessários."),
          ul([
            "Diz ao <strong>laboratório</strong> exatamente o que coletar e sob quais condições.",
            "Registra a <strong>indicação clínica</strong>, que o plano de saúde costuma exigir para autorizar.",
            "Estabelece <strong>quem interpreta</strong> o resultado — e quem responde por ele.",
            "Evita a repetição de exames já feitos recentemente e ainda válidos.",
          ]),
          p("É por isso que a consulta vem antes. Não como formalidade, mas porque a escolha dos exames <em>é</em> um ato clínico: depende do que você sente, do que já foi investigado, do que você toma e dos seus antecedentes."),
        ],
      },
      {
        id: "conteudo",
        nav: "O que contém",
        eyebrow: "Conteúdo",
        h2: "O que a solicitação precisa conter",
        blocks: [
          lead("Pedido recusado no balcão quase sempre tem o mesmo defeito: falta um campo."),
          ul([
            "<strong>Identificação do paciente</strong>.",
            "<strong>Data</strong> da emissão — muitos laboratórios e planos observam a validade do pedido.",
            "<strong>Lista dos exames</strong> pelo nome correto, sem abreviações ambíguas.",
            "<strong>Indicação clínica</strong> ou hipótese diagnóstica, quando exigida pelo plano.",
            "<strong>Nome do médico e CRM</strong>, com a unidade federativa.",
            "<strong>Assinatura</strong> — digital, no caso do documento eletrônico.",
          ]),
          p("Confira o documento antes de sair da consulta. Um exame escrito pela metade se corrige em segundos com o médico e vira uma segunda ida ao laboratório se você só perceber na hora da coleta."),
          warn("Pedido digital tem o mesmo valor", "Um PDF assinado digitalmente é um documento válido e os laboratórios o recebem por e-mail ou aplicativo de mensagens. A autenticidade é conferida pela assinatura eletrônica, não pelo papel. Se o laboratório tiver dúvida, a verificação é pública e leva menos de um minuto.",
          ),
          cite(`Como receber e usar a solicitação eletrônica: <a href="${CFM_EXAMES}" rel="nofollow noopener" target="_blank">CFM — Prescrição Eletrônica</a>. Verificação de assinatura: <a href="${ITI_VALIDAR}" rel="nofollow noopener" target="_blank">validar.iti.gov.br</a>.`),
        ],
      },
      {
        id: "sem-pedido",
        nav: "Exame sem pedido",
        eyebrow: "A dúvida frequente",
        h2: "Dá para fazer exame sem pedido médico?",
        blocks: [
          lead("Em parte sim, e a resposta honesta tem duas metades."),
          p("Em <strong>laboratório particular</strong>, uma parte dos exames de rotina pode ser realizada por iniciativa do próprio paciente, conforme as regras de cada laboratório e a natureza do exame. Já no <strong>SUS</strong> e nos <strong>planos de saúde</strong>, a solicitação médica é a regra, porque é ela que fundamenta a cobertura — e, no caso dos planos, a autorização prévia de vários procedimentos."),
          ul([
            "Sem pedido, você resolve a <strong>coleta</strong>; continua sem a <strong>interpretação</strong>.",
            "Um resultado alterado descoberto sozinho gera ansiedade e, com frequência, a consulta que teria vindo antes de qualquer forma.",
            "Exames pedidos por conta própria costumam ser os errados para a queixa — e os certos ficam de fora.",
            "Repetir um exame recente sem motivo não acrescenta informação nova.",
          ]),
          p("A regra prática: se você tem uma queixa, comece pela consulta. Se você quer apenas um <strong>check-up</strong>, a consulta continua sendo o caminho mais curto, porque o conjunto certo de exames para você depende de idade, sexo, antecedentes familiares e fatores de risco — não de um pacote padrão."),
        ],
      },
      {
        id: "online",
        nav: "Pedido online",
        eyebrow: "Como funciona",
        h2: "Como funciona a solicitação por teleconsulta",
        blocks: [
          lead("O circuito é simples e cabe em uma tarde."),
          ul([
            "<strong>Consulta por vídeo</strong>: o médico ouve a queixa, revisa antecedentes e medicações e define a pergunta clínica.",
            "<strong>Emissão do pedido</strong> em PDF, assinado digitalmente, enviado para você.",
            "<strong>Coleta</strong> no laboratório da sua escolha, com o preparo que ele indicar.",
            "<strong>Retorno</strong> com os resultados, para interpretação e conduta.",
          ]),
          p("A parte que costuma ser subestimada é a última. O objetivo nunca foi o pedido: era saber o que fazer com o resultado. Uma consulta de retorno com os exames em mãos é o que transforma números em decisão — tratar, investigar mais, ou tranquilizar com fundamento."),
          p("Sobre o que uma consulta online <strong>não</strong> faz, para não haver dúvida: não realizamos coleta, não somos laboratório, não emitimos laudo de exame de imagem e não decidimos cobertura. Se o seu plano exige autorização prévia, quem autoriza é o plano; se o exame for pelo <strong>SUS</strong>, o circuito é o da unidade de saúde à qual você está vinculado."),
          p(`A inscrição de qualquer médico pode ser conferida na <a href="${CFM_BUSCA}" rel="nofollow noopener" target="_blank">busca de médicos do CFM</a> — conosco como em qualquer outro serviço.`),
        ],
      },
      {
        id: "resultados",
        nav: "Resultados",
        eyebrow: "Depois da coleta",
        h2: "O que fazer quando o resultado chega",
        blocks: [
          lead("A pior forma de ler um exame é sozinho, à noite, com um buscador aberto."),
          p("Valores de referência mudam entre laboratórios, dependem da técnica usada e são interpretados junto com a sua história, seus medicamentos e os exames anteriores. Um valor discretamente fora da faixa pode não ter nenhum significado no seu caso, e um valor dentro da faixa pode ser preocupante se antes era muito diferente."),
          ul([
            "Leve <strong>todos os resultados</strong>, inclusive os antigos: a tendência vale mais que o ponto isolado.",
            "Informe <strong>medicamentos e suplementos</strong> — muitos alteram exames.",
            "Diga se houve <strong>quebra do preparo</strong> — jejum, esforço físico, álcool na véspera.",
            "Guarde os laudos em um só lugar. Você vai precisar deles no próximo ano.",
          ]),
          warn("Resultado crítico não espera consulta agendada", "Alguns achados exigem conduta imediata, e o laboratório costuma sinalizá-los. Se o resultado vier marcado como crítico, ou se você estiver com sintomas importantes, procure atendimento no mesmo dia em vez de aguardar o retorno.",
          ),
        ],
      },
      {
        id: "urgencia",
        nav: "Não espere",
        eyebrow: "Segurança",
        h2: "Quando não é caso de exame, e sim de emergência",
        blocks: [
          lead("Nenhum exame ambulatorial é a resposta certa para estes sinais."),
          ul([
            "Dor ou aperto no peito, principalmente com falta de ar, suor frio ou dor irradiando para o braço ou mandíbula.",
            "Fraqueza súbita de um lado do corpo, boca torta, dificuldade de falar ou dor de cabeça súbita e muito intensa.",
            "Falta de ar em repouso, ou lábios e rosto arroxeados.",
            "Manchas na pele que não somem à pressão, com febre, rigidez de nuca ou confusão.",
            "Sangramento importante, vômito com sangue ou dor abdominal intensa e contínua.",
          ]),
          p("Nesses casos ligue <strong>192</strong> (SAMU) ou vá ao pronto-socorro. Investigar depois é sempre possível; recuperar tempo perdido nem sempre."),
          cite(`Informações de saúde pública: <a href="${GOV_SAUDE}" rel="nofollow noopener" target="_blank">gov.br/saude</a>.`),
        ],
      },
    ],
    linksEyebrow: "Global Health Brasil",
    linksH2: "Próximos passos",
    linksLead:
      "Nossos médicos no Brasil definem com você quais exames fazem sentido, emitem a solicitação assinada digitalmente e interpretam os resultados no retorno.",
    links: [
      { label: "Consulta e solicitação de exames", href: href("pt", "/services/solicitacao-exames-online") },
      { label: "Nossos médicos no Brasil", href: href("pt", "/doctors") },
      { label: "Falar com a Global Health Brasil", href: href("pt", "/contact") },
    ],
    ctaBox: {
      h3: "Não sabe quais exames precisa fazer?",
      text: "Uma consulta por vídeo define a pergunta clínica, emite a solicitação com os exames certos para o seu caso e agenda o retorno para interpretar os resultados.",
      primary: { label: "Agendar consulta", href: href("pt", "/services/solicitacao-exames-online") },
      secondary: { label: "Ver nossos médicos", href: href("pt", "/doctors") },
    },
    sourcesEyebrow: "Fontes oficiais",
    sourcesH2: "Onde confirmar",
    sourcesLead:
      "Regras de cobertura, autorização e preparo variam por plano e por laboratório. Confirme sempre na fonte.",
    sources: [
      { label: "Solicitação de exames — CFM", href: CFM_EXAMES },
      { label: "Busca de médicos — CFM", href: CFM_BUSCA },
      { label: "Validação de assinatura digital — ITI", href: ITI_VALIDAR },
      { label: "Ministério da Saúde", href: GOV_SAUDE },
    ],
    sourcesNote:
      "Os links abrem sites de terceiros e de órgãos públicos. A Global Health não é laboratório: não realiza coletas, não emite laudos de exames de imagem e não decide cobertura de plano de saúde ou do SUS.",
    faqEyebrow: "FAQ",
    faqH2: "Perguntas frequentes",
    faqs: [
      {
        q: "O que é a solicitação de exames laboratoriais?",
        a: "É o documento em que o médico registra quais exames devem ser realizados e a indicação clínica que os justifica. Serve ao laboratório, que coleta o que está pedido, ao plano de saúde, que costuma exigir a indicação para autorizar, e a você, garantindo que exista um médico responsável por interpretar o resultado.",
      },
      {
        q: "O pedido de exames em PDF é válido?",
        a: "Sim. Um pedido assinado digitalmente tem o mesmo valor do impresso e é aceito pelos laboratórios; pode chegar por e-mail ou aplicativo de mensagens. A autenticidade é conferida pela assinatura eletrônica, que qualquer pessoa valida em validar.iti.gov.br.",
      },
      {
        q: "Posso fazer exame de sangue sem pedido médico?",
        a: "Em laboratório particular, parte dos exames de rotina pode ser feita por iniciativa do paciente, conforme as regras de cada laboratório. No SUS e nos planos de saúde a solicitação médica é a regra, porque é ela que fundamenta a cobertura. Sem pedido você resolve a coleta, mas continua sem a interpretação.",
      },
      {
        q: "O que a solicitação precisa conter para o plano aceitar?",
        a: "Identificação do paciente, data, lista dos exames pelo nome correto, indicação clínica ou hipótese diagnóstica quando exigida, nome e CRM do médico e assinatura. Vários procedimentos ainda dependem de autorização prévia, que é decidida pelo plano.",
      },
      {
        q: "Consigo a solicitação de exames por teleconsulta?",
        a: "Sim, quando há razão clínica para os exames. A consulta define a pergunta a responder, o pedido é emitido em PDF assinado digitalmente e você coleta no laboratório de sua escolha. O retorno com os resultados faz parte do processo — é nele que os números viram conduta.",
      },
      {
        q: "Recebi um resultado alterado. O que faço?",
        a: "Leve todos os resultados, inclusive os antigos, e informe medicamentos, suplementos e qualquer quebra de preparo. Valores de referência variam entre laboratórios e métodos, e a interpretação depende da sua história. Se o laudo vier marcado como crítico ou houver sintomas importantes, procure atendimento no mesmo dia.",
      },
    ],
    disclaimerTitle: "Aviso Médico",
    disclaimer:
      "Escrito pelo Dr. Renato Sarmento, médico de família e comunidade da Global Health Brasil. Este artigo contém informação geral sobre solicitação e interpretação de exames no Brasil e não constitui aconselhamento médico personalizado. A indicação de exames depende da avaliação clínica realizada em consulta. A Global Health não realiza coletas, não emite laudos de exames de imagem e não decide cobertura de plano de saúde ou do SUS. Em caso de emergência, ligue 192 ou procure o pronto-socorro mais próximo.",
  } satisfies Article,
};

const en: LocalePost = {
  locale: "EN",
  slug: "laboratory-test-request-brazil",
  title: "Requesting laboratory tests in Brazil: how the medical request works",
  excerpt:
    "A test request exists so that the result means something. What the request must contain, which tests a laboratory will run without one, how the digital request works, and why testing without an indication hinders more than it helps.",
  seoTitle: "Laboratory test requests in Brazil: how they work",
  seoDescription:
    "Requesting laboratory tests in Brazil: what the medical request must contain, how a digitally signed PDF works and when tests are done without a request.",
  category: "Tests and diagnosis",
  article: {
    lang: "en-GB",
    tagline: "Medical care anytime, anywhere",
    categoryLabel: "Tests and diagnosis",
    categoryHref: href("en", "/blog"),
    eyebrow: "Brazil · Patient guide",
    h1: "Requesting laboratory tests",
    deck: "A test is only useful when somebody knows what they will do with the result. That is what the medical request documents.",
    intro:
      "The <strong>test request</strong> is the document in which a doctor records which tests should be done and why. It can be issued on paper or <strong>as a PDF with a digital signature</strong>, accepted by laboratories in the same way — the Federal Council of Medicine runs its own platform for exactly this. The request serves three purposes at once: telling the laboratory <strong>what to collect</strong>, giving the health plan the <strong>clinical indication</strong> where one is required, and ensuring there is <strong>a doctor responsible for interpreting the result</strong>. Some routine tests can be arranged directly at a private laboratory, but that settles the collection, not the interpretation.",
    facts: [
      "Valid as a digitally signed PDF",
      "The clinical indication is part of it",
      "A result without interpretation is not a diagnosis",
    ],
    primaryCta: { label: "Consultation and test request", href: href("en", "/services/solicitacao-exames-online") },
    secondaryCta: { label: "Test requests — CFM", href: CFM_EXAMES },
    panelChip: "What this guide covers",
    panelParas: [
      "What the request must contain for the laboratory and the health plan to accept it.",
      "How the digital request works and how anyone can check the signature.",
      "When a test can be done without a request — and why that is rarely the best idea.",
      "Prices, turnaround times, preparation and authorisation rules vary by laboratory and by plan. No figures appear here: confirm with the laboratory and with your plan.",
    ],
    author: {
      initials: "RS",
      name: "Dr. Renato Sarmento",
      line: "Family and Community Physician · Global Health Brazil",
    },
    navLabel: "In this article",
    sections: [
      {
        id: "para-que",
        nav: "What it is for",
        eyebrow: "Starting point",
        h2: "What the medical request is for",
        blocks: [
          lead("The question that matters is not «which tests should I have», but «which question do these tests answer»."),
          p("Every test has a range of normal results built from a population. That means that in any large panel run on a healthy person, it is statistically expected that something will come back slightly outside the range. Without a clinical question behind it, that finding is not information: it is a fright, and it usually generates further tests, further appointments and sometimes procedures that would not have been necessary."),
          ul([
            "It tells the <strong>laboratory</strong> exactly what to collect and under what conditions.",
            "It records the <strong>clinical indication</strong>, which health plans generally require in order to authorise.",
            "It establishes <strong>who interprets</strong> the result — and who answers for it.",
            "It avoids repeating tests done recently that are still valid.",
          ]),
          p("That is why the consultation comes first. Not as a formality, but because choosing the tests <em>is</em> a clinical act: it depends on what you feel, what has already been investigated, what you take and your history."),
        ],
      },
      {
        id: "conteudo",
        nav: "What it contains",
        eyebrow: "Content",
        h2: "What the request must contain",
        blocks: [
          lead("A request turned away at the desk almost always has the same defect: a field is missing."),
          ul([
            "<strong>Identification of the patient</strong>.",
            "<strong>The date</strong> of issue — many laboratories and plans observe how long a request stays valid.",
            "<strong>The list of tests</strong> under their correct names, without ambiguous abbreviations.",
            "<strong>The clinical indication</strong> or working diagnosis, where the plan requires it.",
            "<strong>The doctor's name and CRM number</strong>, with the state of registration.",
            "<strong>A signature</strong> — digital, in the case of an electronic document.",
          ]),
          p("Check the document before you leave the consultation. A half-written test name takes seconds to correct with the doctor and becomes a second trip to the laboratory if you only notice at the collection desk."),
          warn("A digital request carries the same weight", "A digitally signed PDF is a valid document and laboratories receive it by email or messaging app. Authenticity is confirmed by the electronic signature, not by the paper. If the laboratory has any doubt, verification is public and takes under a minute."),
          cite(`How to receive and use an electronic request: <a href="${CFM_EXAMES}" rel="nofollow noopener" target="_blank">CFM — Electronic Prescription</a>. Signature verification: <a href="${ITI_VALIDAR}" rel="nofollow noopener" target="_blank">validar.iti.gov.br</a>.`),
        ],
      },
      {
        id: "sem-pedido",
        nav: "Tests without a request",
        eyebrow: "The common question",
        h2: "Can tests be done without a medical request?",
        blocks: [
          lead("Partly yes, and the honest answer has two halves."),
          p("At a <strong>private laboratory</strong>, a proportion of routine tests can be arranged on the patient's own initiative, according to each laboratory's rules and the nature of the test. Within the <strong>SUS</strong> and within <strong>health plans</strong>, the medical request is the rule, because it is what underpins coverage — and, in the case of plans, the prior authorisation of many procedures."),
          ul([
            "Without a request you settle the <strong>collection</strong>; you are still without the <strong>interpretation</strong>.",
            "An abnormal result discovered alone generates anxiety and, often, the consultation that would have come anyway.",
            "Self-ordered tests tend to be the wrong ones for the complaint — and the right ones are left out.",
            "Repeating a recent test without a reason adds no new information.",
          ]),
          p("The practical rule: if you have a complaint, start with the consultation. If you simply want a <strong>check-up</strong>, the consultation is still the shorter route, because the right set of tests for you depends on age, sex, family history and risk factors — not on a standard package."),
        ],
      },
      {
        id: "online",
        nav: "Online request",
        eyebrow: "How it works",
        h2: "How a request through a teleconsultation works",
        blocks: [
          lead("The circuit is simple and fits into an afternoon."),
          ul([
            "<strong>Video consultation</strong>: the doctor hears the complaint, reviews history and medication and defines the clinical question.",
            "<strong>Issue of the request</strong> as a digitally signed PDF, sent to you.",
            "<strong>Collection</strong> at the laboratory of your choice, with whatever preparation it specifies.",
            "<strong>Follow-up</strong> with the results, for interpretation and a plan.",
          ]),
          p("The part usually underestimated is the last one. The aim was never the request: it was knowing what to do with the result. A follow-up consultation with the results in hand is what turns numbers into a decision — treat, investigate further, or reassure on solid grounds."),
          p("On what an online consultation does <strong>not</strong> do, so there is no doubt: we do not collect samples, we are not a laboratory, we do not report imaging studies and we do not decide coverage. If your plan requires prior authorisation, the plan authorises it; if the test is through the <strong>SUS</strong>, the pathway is that of the health unit you are registered with."),
          p(`Any doctor's registration can be checked in the <a href="${CFM_BUSCA}" rel="nofollow noopener" target="_blank">CFM doctor search</a> — ours as readily as any other service's.`),
        ],
      },
      {
        id: "resultados",
        nav: "Results",
        eyebrow: "After collection",
        h2: "What to do when the result arrives",
        blocks: [
          lead("The worst way to read a test result is alone, at night, with a search engine open."),
          p("Reference values differ between laboratories, depend on the technique used and are interpreted alongside your history, your medication and your previous tests. A value slightly outside the range may mean nothing in your case, and a value inside the range can be concerning if it used to be very different."),
          ul([
            "Bring <strong>all the results</strong>, including old ones: the trend is worth more than the isolated point.",
            "Report <strong>medicines and supplements</strong> — many of them alter test results.",
            "Say if the <strong>preparation was broken</strong> — fasting, physical exertion, alcohol the night before.",
            "Keep the reports in one place. You will need them next year.",
          ]),
          warn("A critical result does not wait for a booked appointment", "Some findings require immediate action, and laboratories usually flag them. If a result comes back marked as critical, or if you have significant symptoms, seek care the same day rather than waiting for the follow-up."),
        ],
      },
      {
        id: "urgencia",
        nav: "Do not wait",
        eyebrow: "Safety",
        h2: "When it is not a case for testing but for emergency care",
        blocks: [
          lead("No outpatient test is the right answer to these signs."),
          ul([
            "Chest pain or tightness, especially with breathlessness, cold sweats or pain spreading to the arm or jaw.",
            "Sudden weakness on one side of the body, a drooping mouth, difficulty speaking or a sudden, very severe headache.",
            "Breathlessness at rest, or blue lips and face.",
            "Skin marks that do not fade under pressure, with fever, neck stiffness or confusion.",
            "Significant bleeding, vomiting blood, or severe continuous abdominal pain.",
          ]),
          p("In these cases call <strong>192</strong> (SAMU) or go to the emergency department. Investigating later is always possible; recovering lost time is not."),
          cite(`Public health information: <a href="${GOV_SAUDE}" rel="nofollow noopener" target="_blank">gov.br/saude</a>.`),
        ],
      },
    ],
    linksEyebrow: "Global Health Brazil",
    linksH2: "Next steps",
    linksLead:
      "Our doctors in Brazil work out with you which tests make sense, issue the digitally signed request and interpret the results at follow-up.",
    links: [
      { label: "Consultation and test request", href: href("en", "/services/solicitacao-exames-online") },
      { label: "Our doctors in Brazil", href: href("en", "/doctors") },
      { label: "Talk to Global Health Brazil", href: href("en", "/contact") },
    ],
    ctaBox: {
      h3: "Not sure which tests you need?",
      text: "A video consultation defines the clinical question, issues the request with the right tests for your case and books the follow-up to interpret the results.",
      primary: { label: "Book a consultation", href: href("en", "/services/solicitacao-exames-online") },
      secondary: { label: "See our doctors", href: href("en", "/doctors") },
    },
    sourcesEyebrow: "Official sources",
    sourcesH2: "Where to confirm",
    sourcesLead:
      "Coverage, authorisation and preparation rules vary by plan and by laboratory. Always check at source.",
    sources: [
      { label: "Test requests — CFM", href: CFM_EXAMES },
      { label: "Doctor search — CFM", href: CFM_BUSCA },
      { label: "Digital signature validation — ITI", href: ITI_VALIDAR },
      { label: "Ministry of Health", href: GOV_SAUDE },
    ],
    sourcesNote:
      "The links open third-party and government websites. Global Health is not a laboratory: it does not collect samples, does not report imaging studies and does not decide health plan or SUS coverage.",
    faqEyebrow: "FAQ",
    faqH2: "Common questions",
    faqs: [
      {
        q: "What is a laboratory test request?",
        a: "It is the document in which a doctor records which tests should be carried out and the clinical indication that justifies them. It serves the laboratory, which collects what is requested, the health plan, which usually requires the indication in order to authorise, and you, by ensuring a doctor is responsible for interpreting the result.",
      },
      {
        q: "Is a test request in PDF form valid?",
        a: "Yes. A digitally signed request carries the same weight as a printed one and is accepted by laboratories; it can arrive by email or messaging app. Authenticity is confirmed through the electronic signature, which anyone can validate at validar.iti.gov.br.",
      },
      {
        q: "Can I have a blood test without a medical request?",
        a: "At a private laboratory, some routine tests can be arranged on the patient's own initiative, according to each laboratory's rules. Within the SUS and health plans the medical request is the rule, because it underpins coverage. Without a request you settle the collection but are still without the interpretation.",
      },
      {
        q: "What must the request contain for the plan to accept it?",
        a: "Identification of the patient, the date, the list of tests under their correct names, the clinical indication or working diagnosis where required, the doctor's name and CRM number, and a signature. Several procedures still depend on prior authorisation, which the plan decides.",
      },
      {
        q: "Can I get a test request through a teleconsultation?",
        a: "Yes, where there is a clinical reason for the tests. The consultation defines the question to be answered, the request is issued as a digitally signed PDF and you attend the laboratory of your choice. The follow-up with the results is part of the process — that is where numbers become a plan.",
      },
      {
        q: "I have an abnormal result. What should I do?",
        a: "Bring all the results, including old ones, and report medicines, supplements and any break in preparation. Reference values vary between laboratories and methods, and interpretation depends on your history. If the report is marked as critical or you have significant symptoms, seek care the same day.",
      },
    ],
    disclaimerTitle: "Medical Disclaimer",
    disclaimer:
      "Written by Dr. Renato Sarmento, Family and Community Physician at Global Health Brazil. This article contains general information about requesting and interpreting tests in Brazil and is not personalised medical advice. Which tests are indicated depends on the clinical assessment carried out in the consultation. Global Health does not collect samples, does not report imaging studies and does not decide health plan or SUS coverage. In an emergency, call 192 or go to the nearest emergency department.",
  } satisfies Article,
};

const es: LocalePost = {
  locale: "ES",
  slug: "solicitud-analisis-laboratorio-brasil",
  title: "Solicitud de análisis de laboratorio en Brasil: cómo funciona el volante médico",
  excerpt:
    "La solicitud de análisis existe para que el resultado signifique algo. Qué debe contener el volante, qué análisis acepta el laboratorio sin él, cómo funciona la solicitud digital y por qué analizarse sin indicación estorba más que ayuda.",
  seoTitle: "Solicitud de análisis en Brasil: cómo funciona",
  seoDescription:
    "Solicitud de análisis de laboratorio en Brasil: qué debe contener el volante médico, cómo funciona en PDF firmado y cuándo se analiza sin solicitud.",
  category: "Pruebas y diagnóstico",
  article: {
    lang: "es-ES",
    tagline: "Atención médica a cualquier hora, en cualquier lugar",
    categoryLabel: "Pruebas y diagnóstico",
    categoryHref: href("es", "/blog"),
    eyebrow: "Brasil · Guía para pacientes",
    h1: "Solicitud de análisis de laboratorio",
    deck: "Un análisis solo es útil cuando alguien sabe qué va a hacer con el resultado. Eso es lo que documenta el volante médico.",
    intro:
      "La <strong>solicitud de análisis</strong> es el documento en el que el médico registra qué pruebas deben hacerse y por qué. Puede emitirse en papel o <strong>en PDF con firma digital</strong>, aceptado igualmente por los laboratorios: el Consejo Federal de Medicina mantiene una plataforma propia para ello. El volante sirve a tres cosas a la vez: decirle al laboratorio <strong>qué extraer</strong>, dar al plan de salud la <strong>indicación clínica</strong> cuando se exige, y garantizar que exista <strong>un médico responsable de interpretar el resultado</strong>. Algunos análisis de rutina pueden hacerse por cuenta propia en un laboratorio privado, pero eso resuelve la extracción, no la interpretación.",
    facts: [
      "Vale en PDF con firma digital",
      "La indicación clínica forma parte",
      "Un resultado sin interpretación no es diagnóstico",
    ],
    primaryCta: { label: "Consulta y solicitud de análisis", href: href("es", "/services/solicitacao-exames-online") },
    secondaryCta: { label: "Solicitud de análisis — CFM", href: CFM_EXAMES },
    panelChip: "Qué cubre esta guía",
    panelParas: [
      "Qué debe contener el volante para que el laboratorio y el plan de salud lo acepten.",
      "Cómo funciona la solicitud digital y cómo cualquiera comprueba la firma.",
      "Cuándo puede hacerse un análisis sin volante, y por qué rara vez es la mejor idea.",
      "Precios, plazos, preparación y reglas de autorización varían por laboratorio y por plan. Aquí no hay cifras: confírmelas en el laboratorio y en su plan.",
    ],
    author: {
      initials: "RS",
      name: "Dr. Renato Sarmento",
      line: "Médico de Familia y Comunidad · Global Health Brasil",
    },
    navLabel: "En este artículo",
    sections: [
      {
        id: "para-que",
        nav: "Para qué sirve",
        eyebrow: "Punto de partida",
        h2: "Para qué sirve el volante médico",
        blocks: [
          lead("La pregunta que importa no es «qué análisis me hago», sino «qué pregunta responden esos análisis»."),
          p("Cada prueba tiene un margen de resultados normales construido a partir de una población. Eso significa que en cualquier batería amplia hecha a una persona sana es estadísticamente esperable que algo salga algo fuera del rango. Sin una pregunta clínica detrás, ese hallazgo no es información: es un susto, que suele generar más pruebas, más consultas y a veces procedimientos que no habrían sido necesarios."),
          ul([
            "Le dice al <strong>laboratorio</strong> exactamente qué extraer y en qué condiciones.",
            "Registra la <strong>indicación clínica</strong>, que el plan de salud suele exigir para autorizar.",
            "Establece <strong>quién interpreta</strong> el resultado y quién responde por él.",
            "Evita repetir pruebas hechas hace poco y todavía válidas.",
          ]),
          p("Por eso la consulta va primero. No como formalidad, sino porque elegir las pruebas <em>es</em> un acto clínico: depende de lo que siente, de lo que ya se ha investigado, de lo que toma y de sus antecedentes."),
        ],
      },
      {
        id: "conteudo",
        nav: "Qué contiene",
        eyebrow: "Contenido",
        h2: "Qué debe contener la solicitud",
        blocks: [
          lead("Un volante rechazado en el mostrador casi siempre tiene el mismo defecto: falta un campo."),
          ul([
            "<strong>Identificación del paciente</strong>.",
            "<strong>Fecha</strong> de emisión: muchos laboratorios y planes atienden a la vigencia del volante.",
            "<strong>Lista de las pruebas</strong> con su nombre correcto, sin abreviaturas ambiguas.",
            "<strong>Indicación clínica</strong> o sospecha diagnóstica, cuando la exige el plan.",
            "<strong>Nombre del médico y número de CRM</strong>, con el estado de inscripción.",
            "<strong>Firma</strong>: digital, en el caso del documento electrónico.",
          ]),
          p("Revise el documento antes de salir de la consulta. Una prueba escrita a medias se corrige en segundos con el médico y se convierte en un segundo viaje al laboratorio si solo lo advierte en la extracción."),
          warn("El volante digital tiene el mismo valor", "Un PDF firmado digitalmente es un documento válido y los laboratorios lo reciben por correo o aplicación de mensajería. La autenticidad se comprueba por la firma electrónica, no por el papel. Si el laboratorio duda, la verificación es pública y lleva menos de un minuto."),
          cite(`Cómo recibir y usar la solicitud electrónica: <a href="${CFM_EXAMES}" rel="nofollow noopener" target="_blank">CFM — Receta Electrónica</a>. Verificación de firma: <a href="${ITI_VALIDAR}" rel="nofollow noopener" target="_blank">validar.iti.gov.br</a>.`),
        ],
      },
      {
        id: "sem-pedido",
        nav: "Análisis sin volante",
        eyebrow: "La duda frecuente",
        h2: "¿Se pueden hacer análisis sin volante médico?",
        blocks: [
          lead("En parte sí, y la respuesta honesta tiene dos mitades."),
          p("En un <strong>laboratorio privado</strong>, parte de los análisis de rutina puede realizarse por iniciativa del propio paciente, según las reglas de cada laboratorio y la naturaleza de la prueba. En el <strong>SUS</strong> y en los <strong>planes de salud</strong>, en cambio, la solicitud médica es la regla, porque es la que fundamenta la cobertura y, en el caso de los planes, la autorización previa de muchos procedimientos."),
          ul([
            "Sin volante resuelve la <strong>extracción</strong>; sigue sin la <strong>interpretación</strong>.",
            "Un resultado alterado descubierto en solitario genera ansiedad y, a menudo, la consulta que habría llegado igualmente.",
            "Las pruebas pedidas por cuenta propia suelen ser las equivocadas para la molestia, y las adecuadas quedan fuera.",
            "Repetir una prueba reciente sin motivo no aporta información nueva.",
          ]),
          p("La regla práctica: si tiene una molestia, empiece por la consulta. Si solo quiere un <strong>chequeo</strong>, la consulta sigue siendo el camino más corto, porque el conjunto adecuado de pruebas depende de la edad, el sexo, los antecedentes familiares y los factores de riesgo, no de un paquete estándar."),
        ],
      },
      {
        id: "online",
        nav: "Solicitud online",
        eyebrow: "Cómo funciona",
        h2: "Cómo funciona la solicitud por teleconsulta",
        blocks: [
          lead("El circuito es sencillo y cabe en una tarde."),
          ul([
            "<strong>Consulta por vídeo</strong>: el médico escucha la molestia, revisa antecedentes y medicación y define la pregunta clínica.",
            "<strong>Emisión del volante</strong> en PDF, firmado digitalmente y enviado a usted.",
            "<strong>Extracción</strong> en el laboratorio que elija, con la preparación que este indique.",
            "<strong>Revisión</strong> con los resultados, para interpretación y plan de actuación.",
          ]),
          p("La parte que suele subestimarse es la última. El objetivo nunca fue el volante: era saber qué hacer con el resultado. Una consulta de revisión con las pruebas delante es lo que convierte los números en decisión: tratar, seguir investigando o tranquilizar con fundamento."),
          p("Sobre lo que una consulta online <strong>no</strong> hace, para que no queden dudas: no realizamos extracciones, no somos laboratorio, no emitimos informes de pruebas de imagen y no decidimos la cobertura. Si su plan exige autorización previa, quien autoriza es el plan; si la prueba es por el <strong>SUS</strong>, el circuito es el del centro de salud al que está vinculado."),
          p(`La inscripción de cualquier médico puede consultarse en la <a href="${CFM_BUSCA}" rel="nofollow noopener" target="_blank">búsqueda de médicos del CFM</a>, con nosotros igual que con cualquier otro servicio.`),
        ],
      },
      {
        id: "resultados",
        nav: "Resultados",
        eyebrow: "Después de la extracción",
        h2: "Qué hacer cuando llega el resultado",
        blocks: [
          lead("La peor forma de leer un análisis es a solas, de noche, con un buscador abierto."),
          p("Los valores de referencia cambian entre laboratorios, dependen de la técnica empleada y se interpretan junto con su historia, su medicación y las pruebas anteriores. Un valor ligeramente fuera de rango puede no significar nada en su caso, y un valor dentro del rango puede preocupar si antes era muy distinto."),
          ul([
            "Lleve <strong>todos los resultados</strong>, incluidos los antiguos: la tendencia vale más que el punto aislado.",
            "Informe de <strong>medicamentos y suplementos</strong>: muchos alteran las pruebas.",
            "Diga si hubo <strong>fallo en la preparación</strong>: ayuno, esfuerzo físico, alcohol la víspera.",
            "Guarde los informes en un solo sitio. Los necesitará el año que viene.",
          ]),
          warn("Un resultado crítico no espera a la cita programada", "Algunos hallazgos exigen actuación inmediata, y el laboratorio suele señalarlos. Si el resultado viene marcado como crítico, o si tiene síntomas importantes, busque atención el mismo día en lugar de esperar a la revisión."),
        ],
      },
      {
        id: "urgencia",
        nav: "No espere",
        eyebrow: "Seguridad",
        h2: "Cuando no es caso de análisis, sino de urgencia",
        blocks: [
          lead("Ninguna prueba ambulatoria es la respuesta correcta ante estas señales."),
          ul([
            "Dolor u opresión en el pecho, especialmente con falta de aire, sudor frío o dolor que irradia al brazo o a la mandíbula.",
            "Debilidad brusca en un lado del cuerpo, boca torcida, dificultad para hablar o dolor de cabeza súbito y muy intenso.",
            "Falta de aire en reposo, o labios y cara amoratados.",
            "Manchas en la piel que no desaparecen al presionar, con fiebre, rigidez de nuca o confusión.",
            "Sangrado importante, vómito con sangre o dolor abdominal intenso y continuo.",
          ]),
          p("En esos casos llame al <strong>192</strong> (SAMU) o acuda a urgencias. Investigar después siempre es posible; recuperar el tiempo perdido no siempre."),
          cite(`Información de salud pública: <a href="${GOV_SAUDE}" rel="nofollow noopener" target="_blank">gov.br/saude</a>.`),
        ],
      },
    ],
    linksEyebrow: "Global Health Brasil",
    linksH2: "Siguientes pasos",
    linksLead:
      "Nuestros médicos en Brasil deciden con usted qué pruebas tienen sentido, emiten la solicitud firmada digitalmente e interpretan los resultados en la revisión.",
    links: [
      { label: "Consulta y solicitud de análisis", href: href("es", "/services/solicitacao-exames-online") },
      { label: "Nuestros médicos en Brasil", href: href("es", "/doctors") },
      { label: "Hablar con Global Health Brasil", href: href("es", "/contact") },
    ],
    ctaBox: {
      h3: "¿No sabe qué análisis necesita?",
      text: "Una consulta por vídeo define la pregunta clínica, emite la solicitud con las pruebas adecuadas para su caso y programa la revisión para interpretar los resultados.",
      primary: { label: "Reservar consulta", href: href("es", "/services/solicitacao-exames-online") },
      secondary: { label: "Ver nuestros médicos", href: href("es", "/doctors") },
    },
    sourcesEyebrow: "Fuentes oficiales",
    sourcesH2: "Dónde confirmar",
    sourcesLead:
      "Las reglas de cobertura, autorización y preparación varían por plan y por laboratorio. Confirme siempre en la fuente.",
    sources: [
      { label: "Solicitud de análisis — CFM", href: CFM_EXAMES },
      { label: "Búsqueda de médicos — CFM", href: CFM_BUSCA },
      { label: "Validación de firma digital — ITI", href: ITI_VALIDAR },
      { label: "Ministerio de Salud de Brasil", href: GOV_SAUDE },
    ],
    sourcesNote:
      "Los enlaces abren sitios de terceros y de organismos públicos. Global Health no es un laboratorio: no realiza extracciones, no emite informes de pruebas de imagen y no decide la cobertura del plan de salud ni del SUS.",
    faqEyebrow: "FAQ",
    faqH2: "Preguntas frecuentes",
    faqs: [
      {
        q: "¿Qué es la solicitud de análisis de laboratorio?",
        a: "Es el documento en el que el médico registra qué pruebas deben realizarse y la indicación clínica que las justifica. Sirve al laboratorio, que extrae lo solicitado, al plan de salud, que suele exigir la indicación para autorizar, y a usted, garantizando que haya un médico responsable de interpretar el resultado.",
      },
      {
        q: "¿El volante de análisis en PDF es válido?",
        a: "Sí. Una solicitud firmada digitalmente tiene el mismo valor que la impresa y la aceptan los laboratorios; puede llegar por correo o aplicación de mensajería. La autenticidad se comprueba por la firma electrónica, que cualquiera valida en validar.iti.gov.br.",
      },
      {
        q: "¿Puedo hacerme un análisis de sangre sin volante médico?",
        a: "En laboratorio privado, parte de los análisis de rutina puede hacerse por iniciativa del paciente, según las reglas de cada laboratorio. En el SUS y en los planes de salud la solicitud médica es la regla, porque es la que fundamenta la cobertura. Sin volante resuelve la extracción, pero sigue sin la interpretación.",
      },
      {
        q: "¿Qué debe contener la solicitud para que el plan la acepte?",
        a: "Identificación del paciente, fecha, lista de las pruebas con su nombre correcto, indicación clínica o sospecha diagnóstica cuando se exija, nombre y CRM del médico y firma. Varios procedimientos siguen dependiendo de autorización previa, que decide el plan.",
      },
      {
        q: "¿Puedo conseguir la solicitud de análisis por teleconsulta?",
        a: "Sí, cuando hay razón clínica para las pruebas. La consulta define la pregunta que hay que responder, el volante se emite en PDF firmado digitalmente y usted acude al laboratorio que elija. La revisión con los resultados forma parte del proceso: es ahí donde los números se convierten en decisión.",
      },
      {
        q: "He recibido un resultado alterado. ¿Qué hago?",
        a: "Lleve todos los resultados, incluidos los antiguos, e informe de medicamentos, suplementos y cualquier fallo en la preparación. Los valores de referencia varían entre laboratorios y métodos, y la interpretación depende de su historia. Si el informe viene marcado como crítico o hay síntomas importantes, busque atención el mismo día.",
      },
    ],
    disclaimerTitle: "Aviso Médico",
    disclaimer:
      "Escrito por el Dr. Renato Sarmento, médico de familia y comunidad de Global Health Brasil. Este artículo contiene información general sobre la solicitud e interpretación de análisis en Brasil y no constituye asesoramiento médico personalizado. La indicación de pruebas depende de la valoración clínica realizada en consulta. Global Health no realiza extracciones, no emite informes de pruebas de imagen y no decide la cobertura del plan de salud ni del SUS. En caso de emergencia, llame al 192 o acuda al servicio de urgencias más cercano.",
  } satisfies Article,
};

export const BR_PEDIDO_EXAMES: PostSet = {
  key: "br-pedido-exames",
  countryCode: "br",
  targetKeyword: "solicitação de exames laboratoriais",
  searchVolume: 480,
  keywordDifficulty: 0,
  evidence:
    "br/2076 expansion 2026-08-04. TARGET CHANGED from 'pedido de exames online' (210), which the expansion showed is the smallest term in its own cluster. New head 'solicitação de exames laboratoriais' 480 KD 0, with the cluster all at KD 0: solicitação de exames pdf 590, pedido de exames laboratoriais 320, exemplo de pedido de ultrassom 260 — roughly eight times the combined volume of the original pick, same commercial destination, and 'pedido de exames online' is still covered inside the article. Rejected: the SUS-navigational mass (meu sus digital 201,000 KD 68, conecte sus 74,000 KD 36, consulta online sus grátis 1,900 KD 24) and the 'telemedicina' head (49,500 KD 26), all above the ceiling; 'consulta online da atestado' (4,400 KD 8) belongs to br-atestado-medico and is not targeted twice. SERP 2026-08-04: rank 2 is the CFM Prescrição Eletrônica page for exam requests, the rest are hospital and health-plan request forms (hcor, unimedcuritiba, unimed.coop.br, saude.df.gov.br), a municipal PDF form and clinic-software blogs — forms rather than explanation.",
  serviceSlug: "solicitacao-exames-online",
  authorDoctorId: "cmqyzr0fb000o01lu9deh6mf5",
  authorDisplayName: "Dr. Renato Sarmento",
  posts: [pt, en, es],
};
