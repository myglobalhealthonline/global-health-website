/**
 * Brazil — article 1 of 2.
 *
 * Target keyword: "atestado medico online" — 1,600/mo, KD 12 (OpenSEO /
 * DataForSEO, location 2076, language pt, expansion run 2026-08-04).
 * In-scope cluster: atestado médico online pdf 590 KD 1 · telemedicina
 * consulta online 1,000 KD 12 · telemedicina barata 590 KD 0 (commercial) ·
 * telemedicina primeira consulta grátis 480 KD 7.
 *
 * Target unchanged. What the expansion exposed is how much of the surrounding
 * volume is fraud intent, and it is large: melhor desculpa para pegar atestado
 * médico 1,600 KD 0 · melhor desculpa para pegar atestado médico de 3 dias
 * 1,600 KD 0 · atestado médico pdf grátis 880 KD 0 · atestado médico online
 * grátis com carimbo 590 KD 0 · atestado médico upa 24h pdf 880 KD 0 ·
 * atestado médico sus pdf download 590 KD 0.
 *
 * REJECTED as targets, all of them — same call as the Spanish "justificante
 * medico" (9,900, KD 0) rejection. Those queries want a document without a
 * consultation. The article addresses that demand head-on in its own section:
 * it says why we will not sell it and what the person using a false atestado
 * is actually risking. That section is the article's differentiator, not a
 * disclaimer bolted on the end.
 *
 * Also rejected: the SUS-navigational mass around this term (meu sus digital
 * 201,000 KD 68, conecte sus 74,000 KD 36, atestado online sus 1,600 KD 50,
 * fazer atestado médico online grátis sus 1,000 KD 24) — all navigational to
 * government apps, at difficulties well over the ceiling.
 *
 * SERP read (get_serp_results, br/2076, 2026-08-04): rank 1 is the CFM's own
 * Prescrição Eletrônica FAQ, rank 3 is Atesta CFM — the CFM's official
 * atestado platform, which cites Resolução CFM 2.382/2024 — and rank 2 is a
 * state health department service page. The rest of page one is telemedicine
 * vendors (clicksaude, medvitta, picdoc, telereceita, drconsulta, oladoutor)
 * and telemedicine-company blogs. The vendors sell speed; the CFM pages
 * explain the platform. Nothing explains to a patient when a teleconsultation
 * should NOT produce an atestado, which is where this article sits.
 *
 * Note on link verification: the CFM hosts (portal.cfm.org.br,
 * prescricaoeletronica.cfm.org.br, atestacfm.org.br) sit behind a WAF that
 * refuses automated requests, so they cannot be curl-checked. All three were
 * verified through the live SERP above (ranks 1, 3 and 17) on 2026-08-04.
 * validar.iti.gov.br, gov.br/saude and gov.br/inss were curl-verified 200.
 *
 * HONESTY CONSTRAINT. Our Brazilian service is "atestado-medico-online"
 * ("Atestado Médico") — a consultation which may result in an atestado when
 * the clinical assessment supports one. It is not the sale of a document. The
 * article says that in those words.
 *
 * No figures: the number of days an atestado may cover, the point at which an
 * absence becomes an INSS matter, and prices are all rules that move. They
 * point at gov.br/inss and at the employer instead.
 *
 * Brazil has one doctor in the database (Dr. Renato Sarmento), so this set
 * ships without a reviewer line rather than inventing one.
 */
import { cite, lead, p, renderArticle, ul, warn, type Article } from "./template.js";
import type { LocalePost, PostSet } from "./types.js";

const CFM_ATESTA = "https://atestacfm.org.br/";
const CFM_PRESCRICAO = "https://prescricaoeletronica.cfm.org.br/faq_pacientes/teste-pacientes-2/";
const CFM_BUSCA = "https://portal.cfm.org.br/busca-medicos";
const ITI_VALIDAR = "https://validar.iti.gov.br/";
const GOV_SAUDE = "https://www.gov.br/saude/pt-br";
const GOV_INSS = "https://www.gov.br/inss/pt-br";

const href = (lang: string, path: string) => `https://www.myglobalhealth.online/brazil/${lang}${path}`;

const pt: LocalePost = {
  locale: "PT",
  slug: "atestado-medico-online-validade",
  title: "Atestado médico online: quando vale, o que precisa conter e como a empresa confere",
  excerpt:
    "O atestado emitido em teleconsulta vale para o trabalho quando há consulta de verdade, médico inscrito no CRM e assinatura digital verificável. Explicamos o que o documento precisa conter, como o RH confere e quando a teleconsulta não deve emitir atestado.",
  seoTitle: "Atestado médico online: validade e o que deve conter",
  seoDescription:
    "Atestado médico online no Brasil: quando vale para o trabalho, o que precisa conter, como a empresa confere a assinatura digital e quando não cabe.",
  category: "Telemedicina",
  article: {
    lang: "pt-BR",
    tagline: "Cuidado médico a qualquer hora, em qualquer lugar",
    categoryLabel: "Telemedicina",
    categoryHref: href("pt", "/blog"),
    eyebrow: "Brasil · Guia para trabalhadores",
    h1: "Atestado médico online",
    deck: "O documento vale porque houve consulta. Não é a consulta que existe para justificar o documento — e essa ordem muda tudo.",
    intro:
      "Um <strong>atestado médico emitido em teleconsulta</strong> tem a mesma validade de um emitido presencialmente, desde que atenda às mesmas condições: <strong>consulta médica de verdade</strong>, médico regularmente inscrito no <strong>CRM</strong>, documento com os dados exigidos e <strong>assinatura digital verificável</strong>. O Conselho Federal de Medicina mantém inclusive plataforma própria para emissão de atestados. O que a empresa confere não é o carimbo: é a assinatura digital, e qualquer pessoa pode validá-la em um site público do governo. O que <strong>não</strong> existe é atestado sem avaliação clínica — isso não é telemedicina, é falsificação de documento, com consequências para quem emite e para quem usa.",
    facts: [
      "Vale quando há consulta de verdade",
      "Assinatura digital, não carimbo",
      "CID só com sua autorização",
    ],
    primaryCta: { label: "Consulta médica online", href: href("pt", "/services/atestado-medico-online") },
    secondaryCta: { label: "Validar assinatura digital", href: ITI_VALIDAR },
    panelChip: "O que este guia cobre",
    panelParas: [
      "O que torna um atestado válido e o que a empresa pode e não pode exigir.",
      "O que o documento precisa conter, incluindo a regra sobre o CID.",
      "Quando a teleconsulta não deve emitir atestado — e por que isso protege você.",
      "O número de dias, o ponto em que o afastamento passa a ser assunto do INSS e os prazos internos de cada empresa mudam. Aqui não há números: cada ponto remete ao INSS ou ao seu empregador.",
    ],
    author: {
      initials: "RS",
      name: "Dr. Renato Sarmento",
      line: "Médico de Família e Comunidade · Global Health Brasil",
    },
    navLabel: "Neste artigo",
    sections: [
      {
        id: "vale",
        nav: "Tem validade?",
        eyebrow: "A pergunta principal",
        h2: "O atestado emitido online tem validade?",
        blocks: [
          lead("Tem — e a razão é simples: o que dá validade ao atestado é o ato médico, não o meio pelo qual ele aconteceu."),
          p("A telemedicina é regulamentada no Brasil e o atendimento a distância é um atendimento médico como qualquer outro. Se o médico avaliou você, concluiu que há necessidade de afastamento e emitiu o documento com os dados exigidos e assinatura digital, o atestado é o mesmo documento que sairia de um consultório."),
          ul([
            "<strong>Médico inscrito no CRM</strong>, identificável pelo nome e número de registro.",
            "<strong>Consulta efetivamente realizada</strong> — por vídeo, com avaliação do seu quadro.",
            "<strong>Assinatura digital</strong> com certificado válido, verificável por qualquer pessoa.",
            "<strong>Dados completos</strong> no documento, incluindo data e período de afastamento.",
          ]),
          p("O Conselho Federal de Medicina mantém plataformas próprias para prescrição e atestado eletrônicos, o que dá a medida de quão consolidado o formato está. O documento chega a você em PDF, por e-mail ou aplicativo de mensagens, e é encaminhado por você ao empregador."),
          cite(`Plataformas oficiais: <a href="${CFM_ATESTA}" rel="nofollow noopener" target="_blank">Atesta CFM</a> · <a href="${CFM_PRESCRICAO}" rel="nofollow noopener" target="_blank">Prescrição Eletrônica CFM</a>.`),
        ],
      },
      {
        id: "conteudo",
        nav: "O que contém",
        eyebrow: "Conteúdo",
        h2: "O que o atestado precisa conter",
        blocks: [
          lead("Atestado recusado quase nunca é atestado falso. É atestado incompleto."),
          ul([
            "<strong>Identificação do paciente</strong>.",
            "<strong>Data de emissão</strong> e <strong>período de afastamento</strong> recomendado.",
            "<strong>Nome do médico e número do CRM</strong>, com a unidade federativa.",
            "<strong>Assinatura</strong> — digital, no caso do documento eletrônico.",
            "<strong>CID somente com autorização expressa do paciente</strong>. O diagnóstico é informação sua; o médico não o inclui por conta própria.",
          ]),
          warn("Sobre o CID", "Você não é obrigado a autorizar a inclusão do CID, e o atestado continua válido sem ele. Algumas empresas pedem, e há situações — perícia, benefícios, exigências específicas — em que informar ajuda o seu próprio caso. A decisão é sua, tomada com a informação na mão, e não uma exigência automática do RH."),
          p("Confira o documento assim que receber. Nome errado, data trocada ou período incompleto se corrigem em minutos com o médico que emitiu, e se transformam em problema se você só perceber no dia em que entregar."),
        ],
      },
      {
        id: "empresa",
        nav: "Como a empresa confere",
        eyebrow: "Do outro lado",
        h2: "Como a empresa verifica o atestado",
        blocks: [
          lead("Esta parte costuma gerar atrito por desinformação, dos dois lados."),
          p("A verificação de um atestado digital é feita pela <strong>assinatura eletrônica</strong>. O arquivo PDF pode ser conferido em <strong>validar.iti.gov.br</strong>, o serviço público de validação de assinaturas digitais: ele mostra se a assinatura é válida e a quem pertence o certificado. Muitos documentos trazem também um QR Code ou código de verificação que leva ao mesmo resultado."),
          ul([
            "A empresa pode <strong>verificar a autenticidade</strong> do documento e a inscrição do médico no CRM.",
            "A empresa <strong>não tem direito ao seu diagnóstico</strong> — o que recebe é a existência e o período do afastamento.",
            "A empresa <strong>não pode condicionar</strong> a aceitação a um formato de papel específico quando o documento digital é autêntico.",
            "Regras internas de <strong>prazo de entrega</strong> variam: verifique as da sua empresa e entregue o quanto antes.",
          ]),
          p(`A inscrição de qualquer médico pode ser conferida na <a href="${CFM_BUSCA}" rel="nofollow noopener" target="_blank">busca de médicos do CFM</a> — conosco como em qualquer outro serviço.`),
          cite(`Validação de assinatura digital: <a href="${ITI_VALIDAR}" rel="nofollow noopener" target="_blank">validar.iti.gov.br</a>.`),
        ],
      },
      {
        id: "quando-nao",
        nav: "Quando não cabe",
        eyebrow: "Transparência",
        h2: "Quando a teleconsulta não deve emitir atestado",
        blocks: [
          lead("Dizemos isto antes de vender qualquer coisa, porque é a parte que protege você."),
          p("Nem toda queixa se resolve por vídeo. Há situações em que o correto é encaminhar para avaliação presencial, e emitir um atestado nessas condições seria assumir por escrito algo que o médico não conseguiu examinar."),
          ul([
            "Quadros que exigem <strong>exame físico</strong> — dor abdominal a esclarecer, suspeita de fratura, alteração neurológica.",
            "<strong>Afastamentos prolongados</strong>, que envolvem outro circuito e outra documentação.",
            "Situações que exigem <strong>perícia</strong> ou avaliação de capacidade laboral.",
            "Quadros graves, em que o destino é o pronto-socorro e não um documento.",
            "Pedidos de atestado <strong>retroativo</strong> para um período que o médico não avaliou.",
          ]),
          p(`Quando o afastamento se prolonga, deixa de ser assunto exclusivo entre você e a empresa e passa a envolver o <strong>INSS</strong>, com regras e prazos próprios. Confirme o procedimento e os prazos vigentes diretamente no <a href="${GOV_INSS}" rel="nofollow noopener" target="_blank">gov.br/inss</a>, porque mudam.`),
          warn("Nenhuma consulta garante atestado", "Um médico que garanta o documento antes de avaliar você não está praticando medicina. A consulta pode terminar com atestado, com tratamento sem afastamento, ou com um encaminhamento — e as três são respostas legítimas.",
          ),
        ],
      },
      {
        id: "fraude",
        nav: "Atestado falso",
        eyebrow: "O que não fazemos",
        h2: "Atestado falso: o que está realmente em jogo",
        blocks: [
          lead("Existe um volume enorme de buscas por atestados prontos, modelos em PDF e «carimbos». Vale dizer com clareza o que isso é."),
          p("Preencher, comprar ou apresentar um atestado que não corresponde a uma consulta real é <strong>falsificação de documento</strong>. Para quem apresenta, o risco não é apenas administrativo: é motivo de demissão por justa causa e pode ter consequências criminais. Para quem emite, é infração ética grave, com processo no Conselho Regional de Medicina."),
          ul([
            "Modelos em PDF e geradores online <strong>não são documentos médicos</strong> — não há médico, não há avaliação, não há responsabilidade.",
            "A assinatura digital é justamente o que torna a fraude <strong>fácil de detectar</strong>: um documento sem assinatura válida não passa na verificação.",
            "Um atestado autêntico custa uma consulta e alguns minutos. Um atestado falso custa o emprego.",
          ]),
          p("É por isso que uma consulta aqui começa pela avaliação e não pelo documento. Se o seu quadro justificar afastamento, o atestado sai. Se não justificar, você recebe orientação e tratamento — e continuamos podendo olhar você nos olhos na próxima consulta."),
        ],
      },
      {
        id: "urgencia",
        nav: "Não espere",
        eyebrow: "Segurança",
        h2: "Quando o problema não é o documento",
        blocks: [
          lead("Há sinais diante dos quais resolver a papelada é a última prioridade."),
          ul([
            "Dor ou aperto no peito, principalmente com falta de ar, suor frio ou dor irradiando para o braço ou mandíbula.",
            "Fraqueza súbita de um lado do corpo, boca torta, dificuldade de falar ou dor de cabeça súbita e muito intensa.",
            "Falta de ar em repouso, ou lábios e rosto arroxeados.",
            "Manchas na pele que não somem à pressão, com febre, rigidez de nuca ou confusão.",
            "Sangramento importante ou vômito com sangue.",
            "Qualquer pensamento de se machucar.",
          ]),
          p("Nesses casos ligue <strong>192</strong> (SAMU) ou procure o pronto-socorro mais próximo. O atestado se resolve depois — e sempre se resolve."),
          cite(`Informações de saúde pública: <a href="${GOV_SAUDE}" rel="nofollow noopener" target="_blank">gov.br/saude</a>.`),
        ],
      },
    ],
    linksEyebrow: "Global Health Brasil",
    linksH2: "Próximos passos",
    linksLead:
      "Nossos médicos no Brasil avaliam por vídeo e dizem com clareza o que a consulta pode resolver hoje e o que precisa de avaliação presencial.",
    links: [
      { label: "Consulta com atestado médico", href: href("pt", "/services/atestado-medico-online") },
      { label: "Nossos médicos no Brasil", href: href("pt", "/doctors") },
      { label: "Falar com a Global Health Brasil", href: href("pt", "/contact") },
    ],
    ctaBox: {
      h3: "Precisa de avaliação hoje?",
      text: "Uma consulta por vídeo avalia o seu quadro, inicia tratamento quando indicado e emite o atestado se o afastamento se justificar — com assinatura digital verificável.",
      primary: { label: "Agendar consulta", href: href("pt", "/services/atestado-medico-online") },
      secondary: { label: "Ver nossos médicos", href: href("pt", "/doctors") },
    },
    sourcesEyebrow: "Fontes oficiais",
    sourcesH2: "Onde confirmar",
    sourcesLead:
      "Regras de afastamento, prazos e procedimentos do INSS mudam. Confirme sempre na fonte.",
    sources: [
      { label: "Atesta CFM", href: CFM_ATESTA },
      { label: "Prescrição Eletrônica — CFM", href: CFM_PRESCRICAO },
      { label: "Busca de médicos — CFM", href: CFM_BUSCA },
      { label: "Validação de assinatura digital — ITI", href: ITI_VALIDAR },
      { label: "INSS", href: GOV_INSS },
      { label: "Ministério da Saúde", href: GOV_SAUDE },
    ],
    sourcesNote:
      "Os links abrem sites de terceiros e de órgãos públicos. A Global Health não vende atestados: emite documentos médicos apenas como resultado de uma consulta efetivamente realizada.",
    faqEyebrow: "FAQ",
    faqH2: "Perguntas frequentes",
    faqs: [
      {
        q: "Atestado médico online é válido para o trabalho?",
        a: "Sim, quando resulta de uma consulta efetivamente realizada, é emitido por médico inscrito no CRM, traz os dados exigidos e tem assinatura digital verificável. O que dá validade ao atestado é o ato médico, não o meio pelo qual a consulta aconteceu.",
      },
      {
        q: "A empresa é obrigada a aceitar um atestado digital?",
        a: "Um atestado autêntico não deixa de valer por ser digital. A empresa pode verificar a assinatura eletrônica e a inscrição do médico no CRM, mas não pode exigir um formato de papel específico quando o documento digital é autêntico, nem exigir o seu diagnóstico.",
      },
      {
        q: "O atestado precisa ter CID?",
        a: "Não. O CID só é incluído com autorização expressa do paciente, e o atestado continua válido sem ele. Há situações — perícia, benefícios — em que informar ajuda o seu caso, mas a decisão é sua.",
      },
      {
        q: "Como a empresa confere se o atestado é verdadeiro?",
        a: "Pela assinatura digital. O PDF pode ser verificado em validar.iti.gov.br, o serviço público de validação de assinaturas, que mostra se a assinatura é válida e a quem pertence o certificado. Muitos documentos trazem ainda QR Code ou código de verificação.",
      },
      {
        q: "Consigo atestado sem passar por consulta?",
        a: "Não, e nenhum serviço sério oferece isso. Documento sem avaliação clínica é falsificação, com risco de demissão por justa causa para quem apresenta e processo ético para quem emite. A consulta pode terminar com atestado, com tratamento sem afastamento ou com um encaminhamento.",
      },
      {
        q: "Quantos dias de afastamento o atestado pode cobrir?",
        a: "O período é definido pela avaliação clínica do caso. Quando o afastamento se prolonga, ele deixa de ser assunto apenas entre você e a empresa e passa a envolver o INSS, com regras e prazos próprios — confirme os vigentes em gov.br/inss.",
      },
    ],
    disclaimerTitle: "Aviso Médico",
    disclaimer:
      "Escrito pelo Dr. Renato Sarmento, médico de família e comunidade da Global Health Brasil. Este artigo contém informação geral sobre atestados médicos e telemedicina no Brasil. Não constitui aconselhamento médico personalizado nem orientação jurídica ou trabalhista. A emissão de qualquer documento médico depende da avaliação clínica realizada em consulta. As regras de afastamento e os procedimentos do INSS são definidos pelos órgãos competentes. Em caso de emergência, ligue 192 ou procure o pronto-socorro mais próximo.",
  } satisfies Article,
};

export const BR_ATESTADO_MEDICO: PostSet = {
  key: "br-atestado-medico",
  countryCode: "br",
  targetKeyword: "atestado medico online",
  searchVolume: 1600,
  keywordDifficulty: 12,
  evidence:
    "br/2076 expansion 2026-08-04. Head term 1,600 KD 12, unchanged. In-scope cluster: atestado médico online pdf 590 KD 1, telemedicina consulta online 1,000 KD 12, telemedicina barata 590 KD 0, telemedicina primeira consulta grátis 480 KD 7. Rejected as targets — fraud intent, same call as the Spanish 'justificante medico' rejection: melhor desculpa para pegar atestado médico 1,600 KD 0, melhor desculpa para pegar atestado médico de 3 dias 1,600 KD 0, atestado médico pdf grátis 880 KD 0, atestado médico online grátis com carimbo 590 KD 0, atestado médico sus pdf download 590 KD 0. The article answers that demand honestly in a dedicated section instead of chasing it. Also rejected: the SUS-navigational mass (meu sus digital 201,000 KD 68, conecte sus 74,000 KD 36, atestado online sus 1,600 KD 50), all far above the difficulty ceiling. SERP 2026-08-04: rank 1 CFM Prescrição Eletrônica FAQ, rank 3 Atesta CFM (citing Resolução CFM 2.382/2024), rank 2 a state health department; the rest are telemedicine vendors and their blogs. None explains when a teleconsultation should not produce an atestado. CFM hosts sit behind a WAF and cannot be curl-checked; verified via the live SERP.",
  serviceSlug: "atestado-medico-online",
  authorDoctorId: "cmqyzr0fb000o01lu9deh6mf5",
  authorDisplayName: "Dr. Renato Sarmento",
  posts: [pt],
};
