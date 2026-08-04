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
  posts: [pt],
};
