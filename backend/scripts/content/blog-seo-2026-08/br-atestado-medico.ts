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

const en: LocalePost = {
  locale: "EN",
  slug: "online-medical-certificate-brazil",
  title: "Online medical certificate in Brazil: when it counts and what it must contain",
  excerpt:
    "An atestado issued in a teleconsultation counts at work when there was a real consultation, a doctor registered with the CRM and a verifiable digital signature. What the document must contain, how HR checks it, and when a teleconsultation should not issue one.",
  seoTitle: "Online medical certificate in Brazil: is it valid?",
  seoDescription:
    "Online medical certificate in Brazil: when it counts at work, what it must contain, how employers check the digital signature and when it does not apply.",
  category: "Telemedicine",
  article: {
    lang: "en-GB",
    tagline: "Medical care anytime, anywhere",
    categoryLabel: "Telemedicine",
    categoryHref: href("en", "/blog"),
    eyebrow: "Brazil · Guide for employees",
    h1: "The online medical certificate",
    deck: "The document counts because there was a consultation. The consultation does not exist to justify the document — and that order changes everything.",
    intro:
      "A <strong>medical certificate issued in a teleconsultation</strong> — an <em>atestado médico</em> — carries the same weight as one issued in person, provided it meets the same conditions: a <strong>genuine medical consultation</strong>, a doctor properly registered with the <strong>CRM</strong>, a document carrying the required details and a <strong>verifiable digital signature</strong>. The Federal Council of Medicine even runs its own platform for issuing certificates. What an employer checks is not a rubber stamp: it is the digital signature, and anyone can validate it on a public government website. What does <strong>not</strong> exist is a certificate without a clinical assessment — that is not telemedicine, it is document forgery, with consequences for whoever issues it and whoever uses it.",
    facts: [
      "Valid when there is a real consultation",
      "Digital signature, not a stamp",
      "The ICD code only with your consent",
    ],
    primaryCta: { label: "Online medical consultation", href: href("en", "/services/atestado-medico-online") },
    secondaryCta: { label: "Validate a digital signature", href: ITI_VALIDAR },
    panelChip: "What this guide covers",
    panelParas: [
      "What makes a certificate valid, and what an employer may and may not require.",
      "What the document must contain, including the rule about the ICD code.",
      "When a teleconsultation should not issue a certificate — and why that protects you.",
      "The number of days, the point at which an absence becomes a matter for the INSS and each company's internal deadlines all change. No figures appear here: each point refers to the INSS or to your employer.",
    ],
    author: {
      initials: "RS",
      name: "Dr. Renato Sarmento",
      line: "Family and Community Physician · Global Health Brazil",
    },
    navLabel: "In this article",
    sections: [
      {
        id: "vale",
        nav: "Is it valid?",
        eyebrow: "The main question",
        h2: "Is a certificate issued online valid?",
        blocks: [
          lead("It is — and the reason is simple: what makes a certificate valid is the medical act, not the medium through which it happened."),
          p("Telemedicine is regulated in Brazil, and remote care is medical care like any other. If the doctor assessed you, concluded that time off was needed and issued the document with the required details and a digital signature, the certificate is the same document that would have come out of a consulting room."),
          ul([
            "<strong>A doctor registered with the CRM</strong>, identifiable by name and registration number.",
            "<strong>A consultation actually carried out</strong> — by video, with an assessment of your condition.",
            "<strong>A digital signature</strong> with a valid certificate, verifiable by anyone.",
            "<strong>Complete details</strong> on the document, including the date and the period of absence.",
          ]),
          p("The Federal Council of Medicine runs its own platforms for electronic prescriptions and certificates, which is a measure of how settled the format now is. The document reaches you as a PDF, by email or messaging app, and you forward it to your employer."),
          cite(`Official platforms: <a href="${CFM_ATESTA}" rel="nofollow noopener" target="_blank">Atesta CFM</a> · <a href="${CFM_PRESCRICAO}" rel="nofollow noopener" target="_blank">CFM Electronic Prescription</a>.`),
        ],
      },
      {
        id: "conteudo",
        nav: "What it contains",
        eyebrow: "Content",
        h2: "What the certificate must contain",
        blocks: [
          lead("A rejected certificate is almost never a fake one. It is an incomplete one."),
          ul([
            "<strong>Identification of the patient</strong>.",
            "<strong>Date of issue</strong> and the recommended <strong>period of absence</strong>.",
            "<strong>The doctor's name and CRM number</strong>, with the state of registration.",
            "<strong>A signature</strong> — digital, in the case of an electronic document.",
            "<strong>The ICD code only with the patient's express consent</strong>. The diagnosis is your information; the doctor does not add it unprompted.",
          ]),
          warn("About the ICD code", "You are not obliged to authorise its inclusion, and the certificate remains valid without it. Some companies ask, and there are situations — assessments, benefits, specific requirements — where disclosing helps your own case. The decision is yours, made with the facts in hand, and not an automatic demand from HR."),
          p("Check the document as soon as you receive it. A wrong name, a mistyped date or an incomplete period takes minutes to correct with the doctor who issued it, and becomes a problem if you only notice on the day you hand it in."),
        ],
      },
      {
        id: "empresa",
        nav: "How employers check",
        eyebrow: "The other side",
        h2: "How the employer verifies the certificate",
        blocks: [
          lead("This part tends to cause friction through misinformation, on both sides."),
          p("A digital certificate is verified through its <strong>electronic signature</strong>. The PDF can be checked at <strong>validar.iti.gov.br</strong>, the public digital-signature validation service: it shows whether the signature is valid and who the certificate belongs to. Many documents also carry a QR code or verification code leading to the same result."),
          ul([
            "The employer may <strong>verify the authenticity</strong> of the document and the doctor's CRM registration.",
            "The employer <strong>has no right to your diagnosis</strong> — what they receive is the existence and duration of the absence.",
            "The employer <strong>may not condition</strong> acceptance on a particular paper format when the digital document is authentic.",
            "Internal <strong>submission deadlines</strong> vary: check your company's and hand it in as early as you can.",
          ]),
          p(`Any doctor's registration can be checked in the <a href="${CFM_BUSCA}" rel="nofollow noopener" target="_blank">CFM doctor search</a> — ours as readily as any other service's.`),
          cite(`Digital signature validation: <a href="${ITI_VALIDAR}" rel="nofollow noopener" target="_blank">validar.iti.gov.br</a>.`),
        ],
      },
      {
        id: "quando-nao",
        nav: "When it does not apply",
        eyebrow: "Transparency",
        h2: "When a teleconsultation should not issue a certificate",
        blocks: [
          lead("We say this before selling anything, because it is the part that protects you."),
          p("Not every complaint can be settled by video. There are situations where the right answer is referral for an in-person assessment, and issuing a certificate in those circumstances would mean putting in writing something the doctor was unable to examine."),
          ul([
            "Conditions requiring a <strong>physical examination</strong> — undiagnosed abdominal pain, suspected fracture, neurological change.",
            "<strong>Prolonged absences</strong>, which involve a different pathway and different paperwork.",
            "Situations calling for a <strong>formal medical assessment</strong> of fitness for work.",
            "Serious presentations, where the destination is the emergency department and not a document.",
            "Requests for a <strong>backdated</strong> certificate covering a period the doctor did not assess.",
          ]),
          p(`When an absence extends, it stops being a matter solely between you and your employer and starts to involve the <strong>INSS</strong>, with its own rules and deadlines. Confirm the current procedure and time limits directly at <a href="${GOV_INSS}" rel="nofollow noopener" target="_blank">gov.br/inss</a>, because they change.`),
          warn("No consultation guarantees a certificate", "A doctor who guarantees the document before assessing you is not practising medicine. The consultation may end with a certificate, with treatment and no time off, or with a referral — and all three are legitimate answers."),
        ],
      },
      {
        id: "fraude",
        nav: "Fake certificates",
        eyebrow: "What we do not do",
        h2: "Fake certificates: what is really at stake",
        blocks: [
          lead("There is an enormous volume of searches for ready-made certificates, PDF templates and «stamps». It is worth saying plainly what that is."),
          p("Filling in, buying or presenting a certificate that does not correspond to a real consultation is <strong>document forgery</strong>. For the person presenting it the risk is not merely administrative: it is grounds for dismissal for cause and can carry criminal consequences. For the person issuing it, it is a serious ethical breach, with proceedings before the Regional Council of Medicine."),
          ul([
            "PDF templates and online generators <strong>are not medical documents</strong> — no doctor, no assessment, no responsibility.",
            "The digital signature is precisely what makes fraud <strong>easy to detect</strong>: a document without a valid signature fails verification.",
            "A genuine certificate costs one consultation and a few minutes. A fake one costs your job.",
          ]),
          p("That is why a consultation here starts with the assessment and not with the document. If your condition justifies time off, the certificate follows. If it does not, you get advice and treatment — and we can still look you in the eye at the next consultation."),
        ],
      },
      {
        id: "urgencia",
        nav: "Do not wait",
        eyebrow: "Safety",
        h2: "When the problem is not the document",
        blocks: [
          lead("There are signs in the face of which sorting out paperwork is the last priority."),
          ul([
            "Chest pain or tightness, especially with breathlessness, cold sweats or pain spreading to the arm or jaw.",
            "Sudden weakness on one side of the body, a drooping mouth, difficulty speaking or a sudden, very severe headache.",
            "Breathlessness at rest, or blue lips and face.",
            "Skin marks that do not fade under pressure, with fever, neck stiffness or confusion.",
            "Significant bleeding or vomiting blood.",
            "Any thought of harming yourself.",
          ]),
          p("In these cases call <strong>192</strong> (SAMU) or go to the nearest emergency department. The certificate gets sorted afterwards — and it always does."),
          cite(`Public health information: <a href="${GOV_SAUDE}" rel="nofollow noopener" target="_blank">gov.br/saude</a>.`),
        ],
      },
    ],
    linksEyebrow: "Global Health Brazil",
    linksH2: "Next steps",
    linksLead:
      "Our doctors in Brazil assess by video and tell you plainly what the consultation can settle today and what needs to be seen in person.",
    links: [
      { label: "Consultation with medical certificate", href: href("en", "/services/atestado-medico-online") },
      { label: "Our doctors in Brazil", href: href("en", "/doctors") },
      { label: "Talk to Global Health Brazil", href: href("en", "/contact") },
    ],
    ctaBox: {
      h3: "Need an assessment today?",
      text: "A video consultation assesses your condition, starts treatment where indicated and issues the certificate if time off is justified — with a verifiable digital signature.",
      primary: { label: "Book a consultation", href: href("en", "/services/atestado-medico-online") },
      secondary: { label: "See our doctors", href: href("en", "/doctors") },
    },
    sourcesEyebrow: "Official sources",
    sourcesH2: "Where to confirm",
    sourcesLead: "Absence rules, deadlines and INSS procedures change. Always check at source.",
    sources: [
      { label: "Atesta CFM", href: CFM_ATESTA },
      { label: "Electronic Prescription — CFM", href: CFM_PRESCRICAO },
      { label: "Doctor search — CFM", href: CFM_BUSCA },
      { label: "Digital signature validation — ITI", href: ITI_VALIDAR },
      { label: "INSS", href: GOV_INSS },
      { label: "Ministry of Health", href: GOV_SAUDE },
    ],
    sourcesNote:
      "The links open third-party and government websites. Global Health does not sell certificates: it issues medical documents only as the outcome of a consultation actually carried out.",
    faqEyebrow: "FAQ",
    faqH2: "Common questions",
    faqs: [
      {
        q: "Is an online medical certificate valid for work in Brazil?",
        a: "Yes, when it results from a consultation actually carried out, is issued by a doctor registered with the CRM, carries the required details and has a verifiable digital signature. What makes a certificate valid is the medical act, not the medium through which the consultation took place.",
      },
      {
        q: "Must the employer accept a digital certificate?",
        a: "An authentic certificate does not stop counting because it is digital. The employer may verify the electronic signature and the doctor's CRM registration, but may not demand a particular paper format when the digital document is authentic, nor demand your diagnosis.",
      },
      {
        q: "Does the certificate have to carry the ICD code?",
        a: "No. The ICD code is included only with the patient's express consent, and the certificate remains valid without it. There are situations — formal assessments, benefits — where disclosing helps your case, but the decision is yours.",
      },
      {
        q: "How does the employer check whether a certificate is genuine?",
        a: "Through the digital signature. The PDF can be checked at validar.iti.gov.br, the public signature validation service, which shows whether the signature is valid and who holds the certificate. Many documents also carry a QR code or verification code.",
      },
      {
        q: "Can I get a certificate without a consultation?",
        a: "No, and no serious service offers that. A document without a clinical assessment is forgery, carrying the risk of dismissal for cause for whoever presents it and ethics proceedings for whoever issues it. A consultation may end with a certificate, with treatment and no time off, or with a referral.",
      },
      {
        q: "How many days off can a certificate cover?",
        a: "The period follows the clinical assessment of the case. When an absence extends, it stops being a matter only between you and your employer and starts to involve the INSS, with its own rules and deadlines — confirm the current ones at gov.br/inss.",
      },
    ],
    disclaimerTitle: "Medical Disclaimer",
    disclaimer:
      "Written by Dr. Renato Sarmento, Family and Community Physician at Global Health Brazil. This article contains general information about medical certificates and telemedicine in Brazil. It is not personalised medical advice, nor legal or employment guidance. Issuing any medical document depends on the clinical assessment carried out in the consultation. Absence rules and INSS procedures are set by the competent bodies. In an emergency, call 192 or go to the nearest emergency department.",
  } satisfies Article,
};

const es: LocalePost = {
  locale: "ES",
  slug: "certificado-medico-online-brasil",
  title: "Certificado médico online en Brasil: cuándo vale y qué debe contener",
  excerpt:
    "El atestado emitido en teleconsulta vale ante la empresa cuando hay consulta real, médico inscrito en el CRM y firma digital verificable. Qué debe contener el documento, cómo lo comprueba la empresa y cuándo la teleconsulta no debe emitirlo.",
  seoTitle: "Certificado médico online en Brasil: ¿es válido?",
  seoDescription:
    "Certificado médico online en Brasil: cuándo vale ante la empresa, qué debe contener, cómo se comprueba la firma digital y cuándo no procede emitirlo.",
  category: "Telemedicina",
  article: {
    lang: "es-ES",
    tagline: "Atención médica a cualquier hora, en cualquier lugar",
    categoryLabel: "Telemedicina",
    categoryHref: href("es", "/blog"),
    eyebrow: "Brasil · Guía para trabajadores",
    h1: "El certificado médico online",
    deck: "El documento vale porque hubo consulta. La consulta no existe para justificar el documento, y ese orden cambia por completo el resto.",
    intro:
      "Un <strong>certificado médico emitido en teleconsulta</strong> —el <em>atestado médico</em>— tiene la misma validez que uno emitido presencialmente, siempre que cumpla las mismas condiciones: <strong>consulta médica real</strong>, médico debidamente inscrito en el <strong>CRM</strong>, documento con los datos exigidos y <strong>firma digital verificable</strong>. El Consejo Federal de Medicina mantiene incluso su propia plataforma para emitir certificados. Lo que la empresa comprueba no es un sello: es la firma digital, y cualquiera puede validarla en una web pública del gobierno. Lo que <strong>no</strong> existe es un certificado sin valoración clínica: eso no es telemedicina, es falsificación de documento, con consecuencias para quien lo emite y para quien lo usa.",
    facts: [
      "Vale cuando hay consulta real",
      "Firma digital, no sello",
      "El CIE solo con su autorización",
    ],
    primaryCta: { label: "Consulta médica online", href: href("es", "/services/atestado-medico-online") },
    secondaryCta: { label: "Validar la firma digital", href: ITI_VALIDAR },
    panelChip: "Qué cubre esta guía",
    panelParas: [
      "Qué hace válido un certificado y qué puede y qué no puede exigir la empresa.",
      "Qué debe contener el documento, incluida la regla sobre el código de diagnóstico.",
      "Cuándo la teleconsulta no debe emitir certificado, y por qué eso le protege.",
      "El número de días, el punto en que la baja pasa a ser asunto del INSS y los plazos internos de cada empresa cambian. Aquí no hay cifras: cada punto remite al INSS o a su empleador.",
    ],
    author: {
      initials: "RS",
      name: "Dr. Renato Sarmento",
      line: "Médico de Familia y Comunidad · Global Health Brasil",
    },
    navLabel: "En este artículo",
    sections: [
      {
        id: "vale",
        nav: "¿Tiene validez?",
        eyebrow: "La pregunta principal",
        h2: "¿El certificado emitido online tiene validez?",
        blocks: [
          lead("La tiene, y la razón es sencilla: lo que da validez al certificado es el acto médico, no el medio por el que ocurrió."),
          p("La telemedicina está regulada en Brasil y la atención a distancia es atención médica como cualquier otra. Si el médico le valoró, concluyó que procedía la baja y emitió el documento con los datos exigidos y firma digital, el certificado es el mismo documento que habría salido de una consulta presencial."),
          ul([
            "<strong>Médico inscrito en el CRM</strong>, identificable por nombre y número de registro.",
            "<strong>Consulta efectivamente realizada</strong>, por vídeo y con valoración de su cuadro.",
            "<strong>Firma digital</strong> con certificado válido, verificable por cualquier persona.",
            "<strong>Datos completos</strong> en el documento, incluidas la fecha y el periodo de baja.",
          ]),
          p("El Consejo Federal de Medicina mantiene plataformas propias de receta y certificado electrónicos, lo que da la medida de lo asentado que está el formato. El documento le llega en PDF, por correo o aplicación de mensajería, y usted lo remite a la empresa."),
          cite(`Plataformas oficiales: <a href="${CFM_ATESTA}" rel="nofollow noopener" target="_blank">Atesta CFM</a> · <a href="${CFM_PRESCRICAO}" rel="nofollow noopener" target="_blank">Receta Electrónica del CFM</a>.`),
        ],
      },
      {
        id: "conteudo",
        nav: "Qué contiene",
        eyebrow: "Contenido",
        h2: "Qué debe contener el certificado",
        blocks: [
          lead("Un certificado rechazado casi nunca es un certificado falso. Es un certificado incompleto."),
          ul([
            "<strong>Identificación del paciente</strong>.",
            "<strong>Fecha de emisión</strong> y <strong>periodo de baja</strong> recomendado.",
            "<strong>Nombre del médico y número de CRM</strong>, con el estado de inscripción.",
            "<strong>Firma</strong>: digital, en el caso del documento electrónico.",
            "<strong>El código de diagnóstico solo con autorización expresa del paciente</strong>. El diagnóstico es información suya; el médico no lo incluye por su cuenta.",
          ]),
          warn("Sobre el código de diagnóstico", "No está obligado a autorizar su inclusión, y el certificado sigue siendo válido sin él. Algunas empresas lo piden, y hay situaciones —valoraciones, prestaciones, requisitos concretos— en las que informarlo ayuda a su propio caso. La decisión es suya, tomada con la información delante, y no una exigencia automática de recursos humanos."),
          p("Revise el documento en cuanto lo reciba. Un nombre mal escrito, una fecha equivocada o un periodo incompleto se corrigen en minutos con el médico que lo emitió, y se convierten en un problema si solo lo advierte el día que lo entrega."),
        ],
      },
      {
        id: "empresa",
        nav: "Cómo lo comprueba la empresa",
        eyebrow: "El otro lado",
        h2: "Cómo verifica la empresa el certificado",
        blocks: [
          lead("Esta parte suele generar fricción por desinformación, por ambos lados."),
          p("La verificación de un certificado digital se hace por la <strong>firma electrónica</strong>. El PDF puede comprobarse en <strong>validar.iti.gov.br</strong>, el servicio público de validación de firmas digitales: muestra si la firma es válida y a quién pertenece el certificado. Muchos documentos llevan además un código QR o un código de verificación que lleva al mismo resultado."),
          ul([
            "La empresa puede <strong>verificar la autenticidad</strong> del documento y la inscripción del médico en el CRM.",
            "La empresa <strong>no tiene derecho a su diagnóstico</strong>: recibe la existencia y el periodo de la baja.",
            "La empresa <strong>no puede condicionar</strong> la aceptación a un formato de papel concreto cuando el documento digital es auténtico.",
            "Las normas internas de <strong>plazo de entrega</strong> varían: consulte las de su empresa y entréguelo cuanto antes.",
          ]),
          p(`La inscripción de cualquier médico puede consultarse en la <a href="${CFM_BUSCA}" rel="nofollow noopener" target="_blank">búsqueda de médicos del CFM</a>, con nosotros igual que con cualquier otro servicio.`),
          cite(`Validación de firma digital: <a href="${ITI_VALIDAR}" rel="nofollow noopener" target="_blank">validar.iti.gov.br</a>.`),
        ],
      },
      {
        id: "quando-nao",
        nav: "Cuándo no procede",
        eyebrow: "Transparencia",
        h2: "Cuándo la teleconsulta no debe emitir certificado",
        blocks: [
          lead("Lo decimos antes de vender nada, porque es la parte que le protege."),
          p("No toda molestia se resuelve por vídeo. Hay situaciones en las que lo correcto es derivar a valoración presencial, y emitir un certificado en esas condiciones sería firmar algo que el médico no pudo explorar."),
          ul([
            "Cuadros que exigen <strong>exploración física</strong>: dolor abdominal por aclarar, sospecha de fractura, alteración neurológica.",
            "<strong>Bajas prolongadas</strong>, que implican otro circuito y otra documentación.",
            "Situaciones que exigen <strong>valoración pericial</strong> de la capacidad laboral.",
            "Cuadros graves, en los que el destino es urgencias y no un documento.",
            "Peticiones de certificado <strong>retroactivo</strong> por un periodo que el médico no valoró.",
          ]),
          p(`Cuando la baja se prolonga, deja de ser un asunto exclusivo entre usted y la empresa y pasa a implicar al <strong>INSS</strong> brasileño, con reglas y plazos propios. Confirme el procedimiento y los plazos vigentes directamente en <a href="${GOV_INSS}" rel="nofollow noopener" target="_blank">gov.br/inss</a>, porque cambian.`),
          warn("Ninguna consulta garantiza un certificado", "Un médico que garantice el documento antes de valorarle no está ejerciendo la medicina. La consulta puede terminar con certificado, con tratamiento sin baja o con una derivación, y las tres son respuestas legítimas."),
        ],
      },
      {
        id: "fraude",
        nav: "Certificados falsos",
        eyebrow: "Lo que no hacemos",
        h2: "Certificado falso: qué está realmente en juego",
        blocks: [
          lead("Hay un volumen enorme de búsquedas de certificados listos, plantillas en PDF y «sellos». Conviene decir con claridad qué es eso."),
          p("Rellenar, comprar o presentar un certificado que no corresponde a una consulta real es <strong>falsificación de documento</strong>. Para quien lo presenta, el riesgo no es solo administrativo: es causa de despido procedente y puede tener consecuencias penales. Para quien lo emite, es una infracción ética grave, con expediente ante el Consejo Regional de Medicina."),
          ul([
            "Las plantillas en PDF y los generadores online <strong>no son documentos médicos</strong>: no hay médico, no hay valoración, no hay responsabilidad.",
            "La firma digital es justamente lo que hace el fraude <strong>fácil de detectar</strong>: un documento sin firma válida no supera la verificación.",
            "Un certificado auténtico cuesta una consulta y unos minutos. Uno falso cuesta el empleo.",
          ]),
          p("Por eso una consulta aquí empieza por la valoración y no por el documento. Si su cuadro justifica la baja, el certificado sale. Si no la justifica, recibe orientación y tratamiento, y seguimos pudiendo mirarle a los ojos en la próxima consulta."),
        ],
      },
      {
        id: "urgencia",
        nav: "No espere",
        eyebrow: "Seguridad",
        h2: "Cuando el problema no es el documento",
        blocks: [
          lead("Hay señales ante las cuales resolver el papeleo es la última prioridad."),
          ul([
            "Dolor u opresión en el pecho, especialmente con falta de aire, sudor frío o dolor que irradia al brazo o a la mandíbula.",
            "Debilidad brusca en un lado del cuerpo, boca torcida, dificultad para hablar o dolor de cabeza súbito y muy intenso.",
            "Falta de aire en reposo, o labios y cara amoratados.",
            "Manchas en la piel que no desaparecen al presionar, con fiebre, rigidez de nuca o confusión.",
            "Sangrado importante o vómito con sangre.",
            "Cualquier pensamiento de hacerse daño.",
          ]),
          p("En esos casos llame al <strong>192</strong> (SAMU) o acuda al servicio de urgencias más cercano. El certificado se resuelve después, y siempre se resuelve."),
          cite(`Información de salud pública: <a href="${GOV_SAUDE}" rel="nofollow noopener" target="_blank">gov.br/saude</a>.`),
        ],
      },
    ],
    linksEyebrow: "Global Health Brasil",
    linksH2: "Siguientes pasos",
    linksLead:
      "Nuestros médicos en Brasil valoran por vídeo y dicen con claridad qué puede resolver la consulta hoy y qué necesita valoración presencial.",
    links: [
      { label: "Consulta con certificado médico", href: href("es", "/services/atestado-medico-online") },
      { label: "Nuestros médicos en Brasil", href: href("es", "/doctors") },
      { label: "Hablar con Global Health Brasil", href: href("es", "/contact") },
    ],
    ctaBox: {
      h3: "¿Necesita una valoración hoy?",
      text: "Una consulta por vídeo valora su cuadro, inicia tratamiento cuando está indicado y emite el certificado si la baja se justifica, con firma digital verificable.",
      primary: { label: "Reservar consulta", href: href("es", "/services/atestado-medico-online") },
      secondary: { label: "Ver nuestros médicos", href: href("es", "/doctors") },
    },
    sourcesEyebrow: "Fuentes oficiales",
    sourcesH2: "Dónde confirmar",
    sourcesLead: "Las reglas de baja, los plazos y los procedimientos del INSS brasileño cambian. Confirme siempre en la fuente.",
    sources: [
      { label: "Atesta CFM", href: CFM_ATESTA },
      { label: "Receta Electrónica — CFM", href: CFM_PRESCRICAO },
      { label: "Búsqueda de médicos — CFM", href: CFM_BUSCA },
      { label: "Validación de firma digital — ITI", href: ITI_VALIDAR },
      { label: "INSS", href: GOV_INSS },
      { label: "Ministerio de Salud de Brasil", href: GOV_SAUDE },
    ],
    sourcesNote:
      "Los enlaces abren sitios de terceros y de organismos públicos. Global Health no vende certificados: emite documentos médicos únicamente como resultado de una consulta efectivamente realizada.",
    faqEyebrow: "FAQ",
    faqH2: "Preguntas frecuentes",
    faqs: [
      {
        q: "¿Un certificado médico online vale para el trabajo en Brasil?",
        a: "Sí, cuando resulta de una consulta efectivamente realizada, lo emite un médico inscrito en el CRM, lleva los datos exigidos y tiene firma digital verificable. Lo que da validez al certificado es el acto médico, no el medio por el que se realizó la consulta.",
      },
      {
        q: "¿La empresa está obligada a aceptar un certificado digital?",
        a: "Un certificado auténtico no deja de valer por ser digital. La empresa puede verificar la firma electrónica y la inscripción del médico en el CRM, pero no puede exigir un formato de papel concreto cuando el documento digital es auténtico, ni exigir su diagnóstico.",
      },
      {
        q: "¿El certificado debe llevar el código de diagnóstico?",
        a: "No. Solo se incluye con autorización expresa del paciente, y el certificado sigue siendo válido sin él. Hay situaciones —valoraciones periciales, prestaciones— en las que informarlo ayuda a su caso, pero la decisión es suya.",
      },
      {
        q: "¿Cómo comprueba la empresa si el certificado es verdadero?",
        a: "Por la firma digital. El PDF puede verificarse en validar.iti.gov.br, el servicio público de validación de firmas, que muestra si la firma es válida y a quién pertenece el certificado. Muchos documentos llevan además código QR o código de verificación.",
      },
      {
        q: "¿Puedo conseguir un certificado sin pasar por consulta?",
        a: "No, y ningún servicio serio lo ofrece. Un documento sin valoración clínica es falsificación, con riesgo de despido procedente para quien lo presenta y expediente ético para quien lo emite. La consulta puede terminar con certificado, con tratamiento sin baja o con una derivación.",
      },
      {
        q: "¿Cuántos días de baja puede cubrir el certificado?",
        a: "El periodo lo define la valoración clínica del caso. Cuando la baja se prolonga, deja de ser un asunto solo entre usted y la empresa y pasa a implicar al INSS brasileño, con reglas y plazos propios: confirme los vigentes en gov.br/inss.",
      },
    ],
    disclaimerTitle: "Aviso Médico",
    disclaimer:
      "Escrito por el Dr. Renato Sarmento, médico de familia y comunidad de Global Health Brasil. Este artículo contiene información general sobre certificados médicos y telemedicina en Brasil. No constituye asesoramiento médico personalizado ni orientación jurídica o laboral. La emisión de cualquier documento médico depende de la valoración clínica realizada en consulta. Las reglas de baja y los procedimientos del INSS los definen los organismos competentes. En caso de emergencia, llame al 192 o acuda al servicio de urgencias más cercano.",
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
  posts: [pt, en, es],
};
