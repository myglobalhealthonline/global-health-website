/**
 * Ireland — article 1 of 2.
 *
 * Target keyword: "illness benefit ireland" — 6,600/mo, KD 5, informational,
 * CPC €3.70 (OpenSEO / DataForSEO, location 2372, language en, 2026-08-04).
 * Supporting: "statutory sick pay ireland" 1,900/KD 15, "sick leave ireland"
 * 5,400/KD 15, "sick cert online ireland" 110/KD 0.
 *
 * Why it can rank: page 1 is entirely government and citizens-advice
 * (mywelfare.ie, citizensinformation.ie, gov.ie, nsso.gov.ie) plus HR blogs.
 * No clinician-authored page explains the one thing the searcher actually has
 * to obtain from a doctor — the Certificate of Incapacity for Work. Search
 * Console already shows the domain on the adjacent sick-certificate cluster
 * (medical certificate ireland 47 impr @ pos 55, sick leave certificate
 * ireland 26 @ 35, return to work medical certificate ireland 26 @ 38).
 *
 * Deliberately NOT a second copy of the existing
 * "sick-certificate-ireland-employee-rights" post: that one covers employer-paid
 * Statutory Sick Leave under the Sick Leave Act 2022. This one covers the
 * separate Department of Social Protection payment and the certificate that
 * supports the claim, and links to the other rather than restating it.
 *
 * No rates, waiting days, durations or contribution thresholds are stated
 * anywhere in the copy — those change with each Budget and are not sourced
 * here. Every such question is answered by pointing at the DSP page.
 */
import { cite, lead, p, renderArticle, ul, warn, type Article } from "./template.js";
import type { LocalePost, PostSet } from "./types.js";

const GOV_IB = "https://www.gov.ie/en/department-of-social-protection/services/illness-benefit/";
const CITIZENS_IB = "https://www.citizensinformation.ie/en/social-welfare/disability-and-illness/illness-benefit/";
const MYWELFARE = "https://services.mywelfare.ie/en/topics/health-disability-illness/illness-benefit/";
const MEDICAL_COUNCIL = "https://www.medicalcouncil.ie/public-information/check-the-register/";
const WRC_SICK_LEAVE = "https://www.workplacerelations.ie/en/what_you_should_know/sick-leave/";

/** Internal links, per locale. Blog category chips point at the market blog
 *  index — /blog/categories/* is a live 404 in this app (see
 *  scripts/patch-blog-dead-category-links.ts). */
const href = (lang: string, path: string) => `https://www.myglobalhealth.online/ireland/${lang}${path}`;

const en: LocalePost = {
  locale: "EN",
  slug: "illness-benefit-ireland-how-to-claim",
  title: "Illness Benefit in Ireland: How to Claim and How to Get the Medical Certificate",
  excerpt:
    "Illness Benefit is the Department of Social Protection payment for people who cannot work through illness or injury. Here is what the claim needs, who can issue the Certificate of Incapacity for Work, and how it differs from employer-paid statutory sick leave.",
  seoTitle: "Illness Benefit Ireland: How to Claim (2026 Guide)",
  seoDescription:
    "How to claim Illness Benefit in Ireland: the IB1 form, the Certificate of Incapacity for Work, who can issue it, and how it differs from sick leave.",
  category: "General Practice",
  article: {
    lang: "en-IE",
    tagline: "Medicine Anytime, Anywhere",
    categoryLabel: "General Practice",
    categoryHref: href("en", "/blog"),
    eyebrow: "Ireland · Employee guide",
    h1: "Illness Benefit in Ireland",
    deck: "The social welfare payment for people who cannot work because of illness or injury — and the medical certificate that has to support the claim.",
    intro:
      "Illness Benefit is a weekly payment from the <strong>Department of Social Protection (DSP)</strong> for people under pensionable age who cannot work because of illness or injury. It is a social insurance payment funded by PRSI, so it is not means-tested. Two things have to reach the Department: your claim, made on the <strong>IB1</strong> form or through MyWelfare, and a <strong>Certificate of Incapacity for Work</strong> from a doctor registered with the Irish Medical Council, which the doctor submits to the Department for you. Not every online service issues that certificate, so it is worth checking before you book. It is a separate payment from the statutory sick leave your employer pays.",
    facts: ["Paid by the Department of Social Protection", "Requires a Certificate of Incapacity for Work", "Separate from employer sick pay"],
    primaryCta: { label: "Book an online GP consultation", href: href("en", "/services/sick-certificate-ireland") },
    secondaryCta: { label: "Illness Benefit on gov.ie", href: GOV_IB },
    panelChip: "What this guide covers",
    panelParas: [
      "The difference between Illness Benefit and Statutory Sick Leave — they are paid by different people, under different law, and one does not replace the other.",
      "What a Certificate of Incapacity for Work is, who is allowed to issue one, and how it reaches the Department.",
      "Rates, waiting days and how long a claim can run are set by the Department and change with the Budget. This guide does not quote them; every figure question here links to the Department's own page instead.",
    ],
    author: { initials: "TF", name: "Dr Tiago Miguel Figueira", line: "IMC 523449 · Clinical Director, Global Health" },
    reviewLine: "Clinically reviewed by Dr Ahmed Maklad, General Practitioner, Global Health Ireland.",
    navLabel: "In this article",
    sections: [
      {
        id: "what-it-is",
        nav: "What it is",
        eyebrow: "Definition",
        h2: "What Illness Benefit actually is",
        blocks: [
          lead("Illness Benefit is a payment from the Department of Social Protection to people who are unable to work because they are sick or injured. It is administered by the Department, not by your employer and not by the HSE."),
          p("Because it is funded through <strong>PRSI</strong> — pay related social insurance — entitlement depends on your social insurance record rather than on your savings or your household income. That is what makes it a social insurance payment rather than a means-tested one."),
          p("Whether your particular contributions count depends on the <strong>class of PRSI</strong> you pay. The classes that qualify, and the contribution conditions attached to them, are listed on the Department's own page. If you are self-employed, or you have recently moved between employment and self-employment, check that list before you assume you are covered — the answer is not the same for every class."),
          warn("Pensionable age", "Illness Benefit is for people under pensionable age. If you have reached it, a different payment applies, and the Department's page will point you to it."),
        ],
      },
      {
        id: "vs-sick-leave",
        nav: "Vs sick leave",
        eyebrow: "Two different payments",
        h2: "Illness Benefit is not statutory sick pay",
        blocks: [
          lead("These are two separate entitlements that people routinely confuse, and confusing them is the most common reason a claim is delayed."),
          ul([
            "<strong>Statutory Sick Leave</strong> is paid by <em>your employer</em>, under the Sick Leave Act 2022, and is enforced by the Workplace Relations Commission.",
            "<strong>Illness Benefit</strong> is paid by <em>the Department of Social Protection</em>, out of the social insurance fund.",
            "They are governed by different rules, claimed in different ways, and evidenced by different pieces of paper.",
            "Your employer may also operate its own occupational sick pay scheme on top of both — that is a matter for your contract.",
          ]),
          p(`We cover employer-paid statutory sick leave, and what your employer can and cannot ask for, in a separate guide: <a href="${href("en", "/blog/sick-certificate-ireland-employee-rights")}">Sick certificates in Ireland and your rights as an employee</a>.`),
          cite(`Statutory sick leave guidance: <a href="${WRC_SICK_LEAVE}" rel="nofollow noopener" target="_blank">Workplace Relations Commission</a>.`),
        ],
      },
      {
        id: "certificate",
        nav: "The certificate",
        eyebrow: "Medical evidence",
        h2: "The Certificate of Incapacity for Work",
        blocks: [
          lead("This is the medical document the Department requires. It is not the same thing as the note you give your employer, although one consultation can produce both."),
          p("A Certificate of Incapacity for Work states that, in the opinion of the doctor who examined you, you are unfit for work, and it states the period that opinion covers. It has to come from a doctor who is <strong>registered with the Medical Council</strong> — you can check any doctor's registration yourself on the Council's public register."),
          p("In practice the certificate does not travel with you. The doctor issues it and sends it to the Department — some practices file electronically, others by post, and either way it is not something you post yourself. Your job is to make sure the doctor has your <strong>PPS number</strong> and your correct personal details, because a mismatch between the certificate and your claim is what stalls payment."),
          ul([
            "The doctor decides the period the certificate covers, based on the clinical picture — not on what you ask for.",
            "If you remain unfit beyond that period, you need a further certificate; your doctor will tell you when.",
            "A certificate is a clinical opinion. No doctor and no clinic can guarantee that the Department will accept a claim.",
          ]),
          warn("Backdating is not automatic", "Claims are expected promptly. If there is a reason your claim or your certificate is late, say so at the time rather than after a decision has issued — the Department's page explains how late claims are handled."),
          cite(`Check a doctor's registration: <a href="${MEDICAL_COUNCIL}" rel="nofollow noopener" target="_blank">Irish Medical Council register</a>.`),
        ],
      },
      {
        id: "how-to-claim",
        nav: "How to claim",
        eyebrow: "Process",
        h2: "How the claim is made",
        blocks: [
          lead("There are two parallel tracks — yours and your doctor's — and the claim only moves when both have arrived."),
          ul([
            "<strong>See a doctor.</strong> The consultation establishes whether you are unfit for work and for how long. Bring your PPS number.",
            "<strong>The doctor issues the Certificate of Incapacity for Work</strong> and submits it to the Department.",
            "<strong>You submit the claim.</strong> That is the IB1 form, or the equivalent online application through MyWelfare using your verified MyGovID account.",
            "<strong>Give the Department your bank details</strong> in the format the claim asks for, so payment is not held while they are chased.",
            "<strong>Tell your employer separately.</strong> Notifying the Department is not notifying your employer, and the Department does not do it for you.",
          ]),
          p("If your circumstances change while a claim is running — you recover, you return to work part-time, you go abroad — the Department has to be told. Those rules are on its page, and they are the rules that most often produce an overpayment that has to be repaid later."),
          cite(`Claim online: <a href="${MYWELFARE}" rel="nofollow noopener" target="_blank">MyWelfare — Illness Benefit</a>. Full conditions: <a href="${CITIZENS_IB}" rel="nofollow noopener" target="_blank">Citizens Information</a>.`),
        ],
      },
      {
        id: "online-gp",
        nav: "Online GP",
        eyebrow: "Telemedicine",
        h2: "Can an online GP issue the certificate?",
        blocks: [
          lead("Sometimes, and the honest answer is that it depends on what is wrong with you."),
          p("A doctor working by video consultation is bound by exactly the same professional standards as one working in a room with you. A certificate can only follow an <strong>adequate assessment</strong>. For many self-limiting illnesses — a respiratory infection, a gastrointestinal upset, a migraine, an episode of acute anxiety — a properly conducted video consultation is an adequate assessment, and a certificate can be issued the same day."),
          p("For other presentations it is not. Anything that needs the doctor to look inside an ear, palpate an abdomen, listen to a chest, examine a joint, take a blood pressure or arrange same-day bloods needs an in-person examination, and a responsible online doctor will tell you that and redirect you rather than certify blind."),
          ul([
            "The doctor must be registered with the Medical Council to issue a certificate that the Department will act on.",
            "The consultation has to be long enough and detailed enough to support the opinion being given.",
            "If the clinical picture does not support incapacity for work, the doctor will say so. That is not a service failure — it is the certificate being worth something.",
          ]),
          warn("No clinic can promise a certificate", "Any service that guarantees you a certificate before a doctor has assessed you is selling you something a doctor cannot ethically provide. We do not, and you should be wary of anyone who does."),
        ],
      },
      {
        id: "red-flags",
        nav: "When to be seen",
        eyebrow: "Safety",
        h2: "When you need to be seen in person — or urgently",
        blocks: [
          lead("A certificate is never the priority when the illness itself is the emergency."),
          ul([
            "Chest pain, pressure or tightness, particularly with breathlessness, sweating or pain into the arm or jaw.",
            "Sudden weakness, facial droop, difficulty speaking or sudden severe headache.",
            "Difficulty breathing at rest, or lips or face turning blue.",
            "A rash that does not fade under pressure, especially with fever, neck stiffness or confusion.",
            "Any thought of harming yourself.",
          ]),
          p("If any of these apply, call <strong>112</strong> or <strong>999</strong>, or go to your nearest Emergency Department. Deal with the paperwork afterwards."),
        ],
      },
    ],
    linksEyebrow: "Global Health Ireland",
    linksH2: "Where to go from here",
    linksLead: "Our Irish GPs consult by video and can assess whether a certificate is clinically appropriate in your case.",
    links: [
      { label: "Online sick certificate and GP consultation in Ireland", href: href("en", "/services/sick-certificate-ireland") },
      { label: "Meet the doctors registered with our Irish service", href: href("en", "/doctors") },
      { label: "Contact Global Health Ireland", href: href("en", "/contact") },
    ],
    ctaBox: {
      h3: "Speak to an Irish-registered GP today",
      text: "A video consultation establishes whether you are fit for work and, where it is clinically appropriate, produces the certificate your claim needs.",
      primary: { label: "Book a consultation", href: href("en", "/services/sick-certificate-ireland") },
      secondary: { label: "See our doctors", href: href("en", "/doctors") },
    },
    sourcesEyebrow: "Official sources",
    sourcesH2: "Where the rules actually come from",
    sourcesLead: "Rates, waiting days, contribution conditions and claim durations are set by the Department of Social Protection and change. Always read the current figure at source rather than in an article.",
    sources: [
      { label: "gov.ie — Illness Benefit", href: GOV_IB },
      { label: "Citizens Information — Illness Benefit", href: CITIZENS_IB },
      { label: "MyWelfare — claim online", href: MYWELFARE },
      { label: "Medical Council — check the register", href: MEDICAL_COUNCIL },
      { label: "WRC — statutory sick leave", href: WRC_SICK_LEAVE },
    ],
    sourcesNote: "Links open on the issuing body's own website. Global Health is not affiliated with the Department of Social Protection and cannot decide, expedite or guarantee any social welfare claim.",
    faqEyebrow: "FAQ",
    faqH2: "Common questions",
    faqs: [
      {
        q: "How do I get a medical certificate for Illness Benefit?",
        a: "You need a consultation with a doctor registered with the Irish Medical Council. If the doctor finds you unfit for work, they issue a Certificate of Incapacity for Work and submit it to the Department of Social Protection. Not every online service issues this certificate, so check before booking. Bring your PPS number to the consultation, because the certificate has to match your claim.",
      },
      {
        q: "Is Illness Benefit the same as statutory sick pay in Ireland?",
        a: "No. Statutory Sick Leave is paid by your employer under the Sick Leave Act 2022. Illness Benefit is paid by the Department of Social Protection from the social insurance fund. They are separate entitlements with separate rules, and claiming one does not claim the other.",
      },
      {
        q: "Can I claim Illness Benefit if I am self-employed?",
        a: "It depends on the class of PRSI you pay. The qualifying classes and contribution conditions are listed on the Department's Illness Benefit page, and they are not the same for every class. Check that page against your own PRSI record before assuming you are covered.",
      },
      {
        q: "Do I need a new medical certificate every week?",
        a: "Your doctor decides the period each certificate covers, based on your condition. If you are still unfit for work when it ends, you need a further certificate, and your doctor will tell you when to come back. There is no fixed interval that applies to everyone.",
      },
      {
        q: "Can an online doctor issue a Certificate of Incapacity for Work?",
        a: "Yes, where a video consultation is an adequate assessment for what is wrong with you, and where the doctor is registered with the Medical Council. For conditions that need a physical examination, blood tests or in-person observation, the doctor will refer you to be seen rather than certify remotely.",
      },
      {
        q: "What happens if the Department refuses my claim?",
        a: "A refusal comes with a reason and with appeal rights. Read the decision letter, and take it up through the appeal route the Department sets out. Your treating doctor can supply further clinical information if it is relevant, but the decision itself is the Department's, not the doctor's.",
      },
    ],
    disclaimerTitle: "Medical Disclaimer",
    disclaimer:
      "Written by Dr Tiago Miguel Figueira (IMC 523449), Clinical Director at Global Health, and clinically reviewed by Dr Ahmed Maklad, General Practitioner. This article is general information about the Irish social welfare and certification process. It is not personalised medical advice, and it is not legal or financial advice. Entitlement to Illness Benefit is decided by the Department of Social Protection alone, and no consultation with us guarantees a certificate or a payment. If you are experiencing a medical emergency, call 999 or 112 immediately.",
  } satisfies Article,
};

const pt: LocalePost = {
  locale: "PT",
  slug: "illness-benefit-irlanda-como-requerer",
  title: "Illness Benefit na Irlanda: como requerer e como obter o certificado médico",
  excerpt:
    "O Illness Benefit é o apoio pago pelo Department of Social Protection a quem não pode trabalhar por doença ou lesão. Explicamos o que o pedido exige, quem pode emitir o Certificate of Incapacity for Work e em que difere da baixa paga pela entidade patronal.",
  seoTitle: "Illness Benefit Irlanda: como requerer (guia 2026)",
  seoDescription:
    "Requerer o Illness Benefit na Irlanda: formulário IB1, Certificate of Incapacity for Work, quem o pode emitir e a diferença para a baixa patronal.",
  category: "Clínica Geral",
  article: {
    lang: "pt-PT",
    tagline: "Medicina a qualquer hora, em qualquer lugar",
    categoryLabel: "Clínica Geral",
    categoryHref: href("pt", "/blog"),
    eyebrow: "Irlanda · Guia para trabalhadores",
    h1: "Illness Benefit na Irlanda",
    deck: "O apoio social para quem não consegue trabalhar por doença ou lesão — e o certificado médico que tem de sustentar o pedido.",
    intro:
      "O Illness Benefit é um pagamento semanal do <strong>Department of Social Protection (DSP)</strong> destinado a quem tem menos do que a idade da reforma e não pode trabalhar por doença ou lesão. É um apoio de segurança social financiado pelas contribuições PRSI, pelo que não depende dos seus rendimentos ou património. Têm de chegar duas coisas ao Departamento: o seu pedido, feito no formulário <strong>IB1</strong> ou através do MyWelfare, e um <strong>Certificate of Incapacity for Work</strong> emitido por um médico inscrito no Irish Medical Council, que o próprio médico submete ao Departamento por si. Nem todos os serviços online emitem esse certificado, pelo que vale a pena confirmar antes de marcar. É um apoio distinto da baixa legal paga pela entidade patronal.",
    facts: ["Pago pelo Department of Social Protection", "Exige um Certificate of Incapacity for Work", "Distinto da baixa paga pela entidade patronal"],
    primaryCta: { label: "Marcar consulta médica online", href: href("pt", "/services/sick-certificate-ireland") },
    secondaryCta: { label: "Illness Benefit no gov.ie", href: GOV_IB },
    panelChip: "O que este guia cobre",
    panelParas: [
      "A diferença entre o Illness Benefit e a Statutory Sick Leave — são pagos por entidades diferentes, ao abrigo de legislação diferente, e um não substitui o outro.",
      "O que é o Certificate of Incapacity for Work, quem o pode emitir e como chega ao Departamento.",
      "Valores, dias de espera e duração máxima são definidos pelo Departamento e mudam a cada Orçamento. Este guia não os cita: cada pergunta sobre números remete para a página oficial do Departamento.",
    ],
    author: { initials: "TF", name: "Dr Tiago Miguel Figueira", line: "IMC 523449 · Diretor Clínico, Global Health" },
    reviewLine: "Revisto clinicamente pelo Dr Ahmed Maklad, médico de clínica geral, Global Health Irlanda.",
    navLabel: "Neste artigo",
    sections: [
      {
        id: "what-it-is",
        nav: "O que é",
        eyebrow: "Definição",
        h2: "O que é, afinal, o Illness Benefit",
        blocks: [
          lead("O Illness Benefit é um pagamento do Department of Social Protection a quem está impossibilitado de trabalhar por doença ou lesão. É gerido pelo Departamento — não pela sua entidade patronal e não pelo HSE."),
          p("Por ser financiado pelas contribuições <strong>PRSI</strong>, o direito depende do seu registo contributivo e não dos seus rendimentos ou do rendimento do agregado familiar. É isso que faz dele um apoio contributivo e não um apoio sujeito a condição de recursos."),
          p("Se as suas contribuições contam depende da <strong>classe de PRSI</strong> que paga. As classes elegíveis e as condições contributivas associadas estão listadas na página do próprio Departamento. Se trabalha por conta própria, ou se alternou recentemente entre trabalho dependente e independente, confirme essa lista antes de assumir que está coberto — a resposta não é igual para todas as classes."),
          warn("Idade da reforma", "O Illness Benefit destina-se a quem ainda não atingiu a idade da reforma. Se já a atingiu, aplica-se outro apoio, e a página do Departamento indica qual."),
        ],
      },
      {
        id: "vs-sick-leave",
        nav: "Vs. baixa",
        eyebrow: "Dois apoios distintos",
        h2: "Illness Benefit não é a baixa paga pela entidade patronal",
        blocks: [
          lead("São dois direitos distintos que muita gente confunde — e essa confusão é a causa mais frequente de atraso no pagamento."),
          ul([
            "A <strong>Statutory Sick Leave</strong> é paga <em>pela sua entidade patronal</em>, ao abrigo do Sick Leave Act 2022, e é fiscalizada pela Workplace Relations Commission.",
            "O <strong>Illness Benefit</strong> é pago <em>pelo Department of Social Protection</em>, a partir do fundo de segurança social.",
            "Regem-se por regras diferentes, pedem-se de formas diferentes e comprovam-se com documentos diferentes.",
            "A sua entidade patronal pode ainda ter um regime próprio de baixa remunerada acima destes dois — isso é matéria do seu contrato.",
          ]),
          p(`A baixa paga pela entidade patronal, e o que esta pode ou não exigir-lhe, são tratadas num guia à parte: <a href="${href("pt", "/blog/sick-certificate-ireland-employee-rights")}">certificados de doença na Irlanda e os seus direitos enquanto trabalhador</a>.`),
          cite(`Orientações sobre baixa legal: <a href="${WRC_SICK_LEAVE}" rel="nofollow noopener" target="_blank">Workplace Relations Commission</a>.`),
        ],
      },
      {
        id: "certificate",
        nav: "O certificado",
        eyebrow: "Prova médica",
        h2: "O Certificate of Incapacity for Work",
        blocks: [
          lead("É este o documento médico exigido pelo Departamento. Não é o mesmo que a justificação entregue à entidade patronal, ainda que uma só consulta possa dar origem a ambos."),
          p("O Certificate of Incapacity for Work declara que, na opinião do médico que o observou, está incapaz para o trabalho, e indica o período abrangido por essa opinião. Tem de ser emitido por um médico <strong>inscrito no Medical Council</strong> — pode confirmar a inscrição de qualquer médico no registo público do Conselho."),
          p("Na prática, o certificado não viaja consigo. O médico emite-o e envia-o ao Departamento — há consultórios que o fazem por via eletrónica e outros por correio; em caso algum é o doente que o envia. A sua parte é garantir que o médico tem o seu <strong>número PPS</strong> e os seus dados corretos, porque é a divergência entre o certificado e o pedido que trava o pagamento."),
          ul([
            "É o médico que decide o período abrangido pelo certificado, com base no quadro clínico — não com base no que lhe for pedido.",
            "Se continuar incapaz para além desse período, precisa de novo certificado; o médico indicar-lhe-á quando.",
            "Um certificado é uma opinião clínica. Nenhum médico e nenhuma clínica pode garantir que o Departamento aceitará o pedido.",
          ]),
          warn("A retroatividade não é automática", "Espera-se que os pedidos sejam feitos com prontidão. Se houver motivo para o pedido ou o certificado chegarem tarde, explique-o no momento e não depois de proferida a decisão — a página do Departamento explica como são tratados os pedidos tardios."),
          cite(`Confirmar a inscrição de um médico: <a href="${MEDICAL_COUNCIL}" rel="nofollow noopener" target="_blank">registo do Irish Medical Council</a>.`),
        ],
      },
      {
        id: "how-to-claim",
        nav: "Como pedir",
        eyebrow: "Processo",
        h2: "Como se faz o pedido",
        blocks: [
          lead("Existem duas vias paralelas — a sua e a do médico — e o processo só avança quando as duas chegam."),
          ul([
            "<strong>Consulte um médico.</strong> A consulta estabelece se está incapaz para o trabalho e por quanto tempo. Leve o número PPS.",
            "<strong>O médico emite o Certificate of Incapacity for Work</strong> e submete-o ao Departamento.",
            "<strong>Você submete o pedido.</strong> É o formulário IB1, ou o pedido equivalente online no MyWelfare com a conta MyGovID verificada.",
            "<strong>Indique os dados bancários</strong> no formato pedido, para que o pagamento não fique retido enquanto são solicitados.",
            "<strong>Avise a entidade patronal em separado.</strong> Comunicar ao Departamento não é comunicar à entidade patronal, e o Departamento não o faz por si.",
          ]),
          p("Se as suas circunstâncias mudarem com o processo a decorrer — recupera, regressa a tempo parcial, ausenta-se do país — o Departamento tem de ser informado. Essas regras constam da página oficial e são as que mais frequentemente originam pagamentos indevidos a devolver mais tarde."),
          cite(`Pedido online: <a href="${MYWELFARE}" rel="nofollow noopener" target="_blank">MyWelfare — Illness Benefit</a>. Condições completas: <a href="${CITIZENS_IB}" rel="nofollow noopener" target="_blank">Citizens Information</a>.`),
        ],
      },
      {
        id: "online-gp",
        nav: "Médico online",
        eyebrow: "Telemedicina",
        h2: "Um médico online pode emitir o certificado?",
        blocks: [
          lead("Por vezes — e a resposta honesta é que depende do que tem."),
          p("Um médico em consulta por vídeo está sujeito exatamente aos mesmos deveres profissionais de um médico presencial. Um certificado só pode resultar de uma <strong>avaliação adequada</strong>. Em muitas doenças autolimitadas — uma infeção respiratória, uma gastroenterite, uma enxaqueca, um episódio de ansiedade aguda — uma videoconsulta bem conduzida é uma avaliação adequada, e o certificado pode ser emitido no próprio dia."),
          p("Noutras situações não é. Tudo o que exija observar um ouvido, palpar um abdómen, auscultar um tórax, examinar uma articulação, medir a tensão arterial ou pedir análises no próprio dia exige exame presencial, e um médico online responsável dir-lho-á e encaminhá-lo-á, em vez de certificar às cegas."),
          ul([
            "O médico tem de estar inscrito no Medical Council para que o certificado tenha efeito junto do Departamento.",
            "A consulta tem de ser suficientemente longa e detalhada para sustentar a opinião emitida.",
            "Se o quadro clínico não sustentar incapacidade para o trabalho, o médico dirá isso mesmo. Não é uma falha do serviço — é o que dá valor ao certificado.",
          ]),
          warn("Nenhuma clínica pode prometer um certificado", "Qualquer serviço que lhe garanta um certificado antes de um médico o avaliar está a vender-lhe algo que um médico não pode, eticamente, prestar. Nós não o fazemos, e deve desconfiar de quem o faça."),
        ],
      },
      {
        id: "red-flags",
        nav: "Sinais de alarme",
        eyebrow: "Segurança",
        h2: "Quando precisa de ser observado presencialmente — ou com urgência",
        blocks: [
          lead("O certificado nunca é a prioridade quando a própria doença é a emergência."),
          ul([
            "Dor, aperto ou pressão no peito, sobretudo com falta de ar, suores ou dor irradiada para o braço ou a mandíbula.",
            "Fraqueza súbita, desvio da face, dificuldade em falar ou dor de cabeça súbita e intensa.",
            "Dificuldade respiratória em repouso, ou lábios e face azulados.",
            "Manchas na pele que não desaparecem à pressão, sobretudo com febre, rigidez da nuca ou confusão.",
            "Qualquer ideia de se magoar a si próprio.",
          ]),
          p("Se algum destes casos se aplicar, ligue <strong>112</strong> ou <strong>999</strong>, ou dirija-se ao serviço de urgência mais próximo. A papelada resolve-se depois."),
        ],
      },
    ],
    linksEyebrow: "Global Health Irlanda",
    linksH2: "Passos seguintes",
    linksLead: "Os nossos médicos na Irlanda atendem por vídeo e podem avaliar se, no seu caso, um certificado é clinicamente adequado.",
    links: [
      { label: "Certificado de doença e consulta médica online na Irlanda", href: href("pt", "/services/sick-certificate-ireland") },
      { label: "Conheça os médicos inscritos do nosso serviço irlandês", href: href("pt", "/doctors") },
      { label: "Contactar a Global Health Irlanda", href: href("pt", "/contact") },
    ],
    ctaBox: {
      h3: "Fale hoje com um médico inscrito na Irlanda",
      text: "Uma videoconsulta determina se está incapaz para o trabalho e, quando é clinicamente adequado, produz o certificado exigido pelo seu pedido.",
      primary: { label: "Marcar consulta", href: href("pt", "/services/sick-certificate-ireland") },
      secondary: { label: "Ver os nossos médicos", href: href("pt", "/doctors") },
    },
    sourcesEyebrow: "Fontes oficiais",
    sourcesH2: "De onde vêm efetivamente as regras",
    sourcesLead: "Valores, dias de espera, condições contributivas e duração dos pedidos são definidos pelo Department of Social Protection e mudam. Confirme sempre o valor atual na fonte e não num artigo.",
    sources: [
      { label: "gov.ie — Illness Benefit", href: GOV_IB },
      { label: "Citizens Information — Illness Benefit", href: CITIZENS_IB },
      { label: "MyWelfare — pedido online", href: MYWELFARE },
      { label: "Medical Council — consultar o registo", href: MEDICAL_COUNCIL },
      { label: "WRC — baixa legal", href: WRC_SICK_LEAVE },
    ],
    sourcesNote: "As ligações abrem no site da entidade emissora. A Global Health não tem qualquer vínculo ao Department of Social Protection e não pode decidir, acelerar nem garantir qualquer pedido de prestação social.",
    faqEyebrow: "FAQ",
    faqH2: "Perguntas frequentes",
    faqs: [
      {
        q: "Como obtenho o certificado médico para o Illness Benefit?",
        a: "Precisa de uma consulta com um médico inscrito no Irish Medical Council. Se o médico concluir que está incapaz para o trabalho, emite um Certificate of Incapacity for Work e submete-o ao Department of Social Protection. Nem todos os serviços online emitem este certificado, por isso confirme antes de marcar. Leve o número PPS à consulta, porque o certificado tem de coincidir com o seu pedido.",
      },
      {
        q: "O Illness Benefit é o mesmo que a baixa paga pela entidade patronal?",
        a: "Não. A Statutory Sick Leave é paga pela entidade patronal ao abrigo do Sick Leave Act 2022. O Illness Benefit é pago pelo Department of Social Protection a partir do fundo de segurança social. São direitos distintos, com regras próprias, e pedir um não pede o outro.",
      },
      {
        q: "Posso pedir Illness Benefit se trabalho por conta própria?",
        a: "Depende da classe de PRSI que paga. As classes elegíveis e as condições contributivas constam da página do Departamento sobre Illness Benefit e não são iguais para todas as classes. Confirme essa página face ao seu próprio registo contributivo antes de assumir que está coberto.",
      },
      {
        q: "Preciso de um certificado médico novo todas as semanas?",
        a: "É o médico que decide o período abrangido por cada certificado, em função do seu estado. Se continuar incapaz quando esse período terminar, precisa de novo certificado e o médico indicará quando voltar. Não existe um intervalo fixo aplicável a toda a gente.",
      },
      {
        q: "Um médico online pode emitir o Certificate of Incapacity for Work?",
        a: "Sim, quando a videoconsulta constitui uma avaliação adequada para o que tem e o médico está inscrito no Medical Council. Em situações que exijam exame físico, análises ou observação presencial, o médico encaminha-o para ser observado em vez de certificar à distância.",
      },
      {
        q: "O que acontece se o Departamento recusar o meu pedido?",
        a: "A recusa é fundamentada e vem acompanhada do direito de recurso. Leia a decisão e reaja pela via de recurso indicada pelo Departamento. O seu médico assistente pode fornecer informação clínica adicional se for pertinente, mas a decisão é do Departamento e não do médico.",
      },
    ],
    disclaimerTitle: "Aviso Médico",
    disclaimer:
      "Escrito pelo Dr Tiago Miguel Figueira (IMC 523449), Diretor Clínico da Global Health, e revisto clinicamente pelo Dr Ahmed Maklad, médico de clínica geral. Este artigo contém informação geral sobre o processo irlandês de segurança social e de certificação. Não constitui aconselhamento médico personalizado, nem aconselhamento jurídico ou financeiro. O direito ao Illness Benefit é decidido exclusivamente pelo Department of Social Protection, e nenhuma consulta connosco garante um certificado ou um pagamento. Em caso de emergência médica, ligue imediatamente 999 ou 112.",
  } satisfies Article,
};

const es: LocalePost = {
  locale: "ES",
  slug: "illness-benefit-irlanda-como-solicitarlo",
  title: "Illness Benefit en Irlanda: cómo solicitarlo y cómo conseguir el certificado médico",
  excerpt:
    "El Illness Benefit es la prestación del Department of Social Protection para quien no puede trabajar por enfermedad o lesión. Explicamos qué exige la solicitud, quién puede emitir el Certificate of Incapacity for Work y en qué se diferencia de la baja que paga la empresa.",
  seoTitle: "Illness Benefit Irlanda: cómo solicitarlo (guía 2026)",
  seoDescription:
    "Solicitar el Illness Benefit en Irlanda: formulario IB1, Certificate of Incapacity for Work, quién puede emitirlo y diferencia con la baja de la empresa.",
  category: "Medicina General",
  article: {
    lang: "es-ES",
    tagline: "Medicina en cualquier momento y lugar",
    categoryLabel: "Medicina General",
    categoryHref: href("es", "/blog"),
    eyebrow: "Irlanda · Guía para trabajadores",
    h1: "Illness Benefit en Irlanda",
    deck: "La prestación social para quien no puede trabajar por enfermedad o lesión — y el certificado médico que debe respaldar la solicitud.",
    intro:
      "El Illness Benefit es un pago semanal del <strong>Department of Social Protection (DSP)</strong> para personas por debajo de la edad de jubilación que no pueden trabajar por enfermedad o lesión. Es una prestación contributiva financiada con las cotizaciones PRSI, así que no depende de sus ingresos ni de su patrimonio. Al Departamento deben llegar dos cosas: su solicitud, mediante el formulario <strong>IB1</strong> o a través de MyWelfare, y un <strong>Certificate of Incapacity for Work</strong> emitido por un médico colegiado en el Irish Medical Council, que el propio médico envía al Departamento por usted. No todos los servicios online emiten ese certificado, así que conviene confirmarlo antes de reservar. Es una prestación distinta de la baja legal que paga la empresa.",
    facts: ["Lo paga el Department of Social Protection", "Exige un Certificate of Incapacity for Work", "Distinto de la baja que paga la empresa"],
    primaryCta: { label: "Reservar consulta médica online", href: href("es", "/services/sick-certificate-ireland") },
    secondaryCta: { label: "Illness Benefit en gov.ie", href: GOV_IB },
    panelChip: "Qué cubre esta guía",
    panelParas: [
      "La diferencia entre el Illness Benefit y la Statutory Sick Leave: los pagan entidades distintas, bajo normas distintas, y uno no sustituye al otro.",
      "Qué es el Certificate of Incapacity for Work, quién puede emitirlo y cómo llega al Departamento.",
      "Los importes, los días de espera y la duración los fija el Departamento y cambian con cada presupuesto. Esta guía no los cita: cada pregunta sobre cifras remite a la página oficial del Departamento.",
    ],
    author: { initials: "TF", name: "Dr Tiago Miguel Figueira", line: "IMC 523449 · Director Clínico, Global Health" },
    reviewLine: "Revisado clínicamente por el Dr Ahmed Maklad, médico de familia, Global Health Irlanda.",
    navLabel: "En este artículo",
    sections: [
      {
        id: "what-it-is",
        nav: "Qué es",
        eyebrow: "Definición",
        h2: "Qué es realmente el Illness Benefit",
        blocks: [
          lead("El Illness Benefit es un pago del Department of Social Protection a quien no puede trabajar por enfermedad o lesión. Lo gestiona el Departamento, no su empresa ni el HSE."),
          p("Al financiarse con las cotizaciones <strong>PRSI</strong>, el derecho depende de su historial de cotización y no de sus ingresos ni de los de su unidad familiar. Eso es lo que la convierte en una prestación contributiva y no en una prestación sujeta a comprobación de recursos."),
          p("Que sus cotizaciones cuenten depende de la <strong>clase de PRSI</strong> que abona. Las clases que dan derecho, y los requisitos de cotización asociados, figuran en la propia página del Departamento. Si trabaja por cuenta propia, o ha alternado recientemente entre cuenta ajena y cuenta propia, revise esa lista antes de dar por hecho que está cubierto: la respuesta no es la misma para todas las clases."),
          warn("Edad de jubilación", "El Illness Benefit es para personas que aún no han alcanzado la edad de jubilación. Si ya la ha alcanzado, se aplica otra prestación, y la página del Departamento le indicará cuál."),
        ],
      },
      {
        id: "vs-sick-leave",
        nav: "Frente a la baja",
        eyebrow: "Dos prestaciones distintas",
        h2: "El Illness Benefit no es la baja que paga la empresa",
        blocks: [
          lead("Son dos derechos distintos que se confunden con frecuencia, y esa confusión es el motivo más habitual de retraso en el cobro."),
          ul([
            "La <strong>Statutory Sick Leave</strong> la paga <em>su empresa</em>, al amparo del Sick Leave Act 2022, y la vigila la Workplace Relations Commission.",
            "El <strong>Illness Benefit</strong> lo paga <em>el Department of Social Protection</em> con cargo al fondo de seguridad social.",
            "Se rigen por normas distintas, se solicitan de forma distinta y se acreditan con documentos distintos.",
            "Su empresa puede además tener su propio plan de baja retribuida por encima de ambas: eso es materia de su contrato.",
          ]),
          p(`La baja que paga la empresa, y lo que esta puede o no exigirle, se tratan en una guía aparte: <a href="${href("es", "/blog/sick-certificate-ireland-employee-rights")}">certificados de enfermedad en Irlanda y sus derechos como trabajador</a>.`),
          cite(`Información sobre la baja legal: <a href="${WRC_SICK_LEAVE}" rel="nofollow noopener" target="_blank">Workplace Relations Commission</a>.`),
        ],
      },
      {
        id: "certificate",
        nav: "El certificado",
        eyebrow: "Prueba médica",
        h2: "El Certificate of Incapacity for Work",
        blocks: [
          lead("Este es el documento médico que exige el Departamento. No es lo mismo que el justificante que entrega a su empresa, aunque una sola consulta pueda generar ambos."),
          p("El Certificate of Incapacity for Work declara que, en opinión del médico que le ha examinado, usted está incapacitado para trabajar, e indica el periodo que abarca esa opinión. Debe emitirlo un médico <strong>colegiado en el Medical Council</strong>: puede comprobar usted mismo la colegiación de cualquier médico en el registro público del Consejo."),
          p("En la práctica el certificado no viaja con usted. El médico lo emite y lo envía al Departamento: unas consultas lo tramitan electrónicamente y otras por correo postal, pero en ningún caso lo envía usted. Su parte consiste en asegurarse de que el médico tiene su <strong>número PPS</strong> y sus datos correctos, porque lo que bloquea el pago es la discrepancia entre el certificado y la solicitud."),
          ul([
            "El médico decide el periodo que abarca el certificado según el cuadro clínico, no según lo que se le pida.",
            "Si sigue incapacitado más allá de ese periodo, necesita otro certificado; su médico le dirá cuándo.",
            "Un certificado es una opinión clínica. Ningún médico ni ninguna clínica puede garantizar que el Departamento acepte la solicitud.",
          ]),
          warn("La retroactividad no es automática", "Se espera que las solicitudes se presenten con prontitud. Si hay un motivo por el que su solicitud o su certificado llegan tarde, explíquelo en ese momento y no después de dictada la resolución: la página del Departamento explica cómo se tratan las solicitudes tardías."),
          cite(`Comprobar la colegiación de un médico: <a href="${MEDICAL_COUNCIL}" rel="nofollow noopener" target="_blank">registro del Irish Medical Council</a>.`),
        ],
      },
      {
        id: "how-to-claim",
        nav: "Cómo solicitarlo",
        eyebrow: "Proceso",
        h2: "Cómo se presenta la solicitud",
        blocks: [
          lead("Hay dos vías paralelas —la suya y la de su médico— y el expediente solo avanza cuando llegan las dos."),
          ul([
            "<strong>Acuda a un médico.</strong> La consulta determina si está incapacitado para trabajar y por cuánto tiempo. Lleve su número PPS.",
            "<strong>El médico emite el Certificate of Incapacity for Work</strong> y lo envía al Departamento.",
            "<strong>Usted presenta la solicitud.</strong> Es el formulario IB1, o la solicitud equivalente online en MyWelfare con su cuenta MyGovID verificada.",
            "<strong>Facilite sus datos bancarios</strong> en el formato que pide la solicitud, para que el pago no quede retenido mientras se los reclaman.",
            "<strong>Avise a su empresa por separado.</strong> Comunicarlo al Departamento no es comunicarlo a su empresa, y el Departamento no lo hace por usted.",
          ]),
          p("Si sus circunstancias cambian con el expediente en curso —se recupera, se reincorpora a tiempo parcial, sale del país— hay que comunicarlo al Departamento. Esas reglas están en su página, y son las que con más frecuencia generan un cobro indebido que después hay que devolver."),
          cite(`Solicitud online: <a href="${MYWELFARE}" rel="nofollow noopener" target="_blank">MyWelfare — Illness Benefit</a>. Requisitos completos: <a href="${CITIZENS_IB}" rel="nofollow noopener" target="_blank">Citizens Information</a>.`),
        ],
      },
      {
        id: "online-gp",
        nav: "Médico online",
        eyebrow: "Telemedicina",
        h2: "¿Puede un médico online emitir el certificado?",
        blocks: [
          lead("A veces, y la respuesta honesta es que depende de qué le ocurra."),
          p("Un médico que atiende por videoconsulta está sujeto exactamente a los mismos deberes profesionales que uno que le atiende en persona. Un certificado solo puede derivarse de una <strong>evaluación adecuada</strong>. En muchas enfermedades autolimitadas —una infección respiratoria, una gastroenteritis, una migraña, un episodio de ansiedad aguda— una videoconsulta bien realizada es una evaluación adecuada, y el certificado puede emitirse el mismo día."),
          p("En otros casos no lo es. Cuanto requiera mirar un oído, palpar un abdomen, auscultar un tórax, explorar una articulación, tomar la tensión o pedir analítica el mismo día exige exploración presencial, y un médico online responsable se lo dirá y le derivará, en lugar de certificar a ciegas."),
          ul([
            "El médico debe estar colegiado en el Medical Council para que el certificado surta efecto ante el Departamento.",
            "La consulta debe ser lo bastante larga y detallada como para sostener la opinión que se emite.",
            "Si el cuadro clínico no respalda una incapacidad para trabajar, el médico se lo dirá. No es un fallo del servicio: es lo que hace que el certificado valga algo.",
          ]),
          warn("Ninguna clínica puede prometer un certificado", "Cualquier servicio que le garantice un certificado antes de que un médico le evalúe le está vendiendo algo que un médico no puede prestar éticamente. Nosotros no lo hacemos, y conviene desconfiar de quien lo haga."),
        ],
      },
      {
        id: "red-flags",
        nav: "Señales de alarma",
        eyebrow: "Seguridad",
        h2: "Cuándo hay que verle en persona — o de urgencia",
        blocks: [
          lead("El certificado nunca es la prioridad cuando la propia enfermedad es la urgencia."),
          ul([
            "Dolor, presión u opresión en el pecho, especialmente con falta de aire, sudoración o dolor irradiado al brazo o la mandíbula.",
            "Debilidad súbita, desviación de la cara, dificultad para hablar o dolor de cabeza brusco e intenso.",
            "Dificultad para respirar en reposo, o labios y cara azulados.",
            "Manchas en la piel que no desaparecen al presionar, especialmente con fiebre, rigidez de nuca o confusión.",
            "Cualquier idea de hacerse daño a sí mismo.",
          ]),
          p("Si se da alguno de estos casos, llame al <strong>112</strong> o al <strong>999</strong>, o acuda al servicio de urgencias más cercano. El papeleo se resuelve después."),
        ],
      },
    ],
    linksEyebrow: "Global Health Irlanda",
    linksH2: "Siguientes pasos",
    linksLead: "Nuestros médicos en Irlanda atienden por vídeo y pueden valorar si en su caso un certificado es clínicamente apropiado.",
    links: [
      { label: "Certificado de enfermedad y consulta médica online en Irlanda", href: href("es", "/services/sick-certificate-ireland") },
      { label: "Conozca a los médicos colegiados de nuestro servicio irlandés", href: href("es", "/doctors") },
      { label: "Contactar con Global Health Irlanda", href: href("es", "/contact") },
    ],
    ctaBox: {
      h3: "Hable hoy con un médico colegiado en Irlanda",
      text: "Una videoconsulta determina si está incapacitado para trabajar y, cuando es clínicamente apropiado, genera el certificado que exige su solicitud.",
      primary: { label: "Reservar consulta", href: href("es", "/services/sick-certificate-ireland") },
      secondary: { label: "Ver nuestros médicos", href: href("es", "/doctors") },
    },
    sourcesEyebrow: "Fuentes oficiales",
    sourcesH2: "De dónde salen realmente las normas",
    sourcesLead: "Los importes, los días de espera, los requisitos de cotización y la duración los fija el Department of Social Protection y cambian. Consulte siempre la cifra vigente en la fuente y no en un artículo.",
    sources: [
      { label: "gov.ie — Illness Benefit", href: GOV_IB },
      { label: "Citizens Information — Illness Benefit", href: CITIZENS_IB },
      { label: "MyWelfare — solicitud online", href: MYWELFARE },
      { label: "Medical Council — consultar el registro", href: MEDICAL_COUNCIL },
      { label: "WRC — baja legal", href: WRC_SICK_LEAVE },
    ],
    sourcesNote: "Los enlaces abren en la web del organismo emisor. Global Health no está vinculada al Department of Social Protection y no puede resolver, acelerar ni garantizar ninguna solicitud de prestación social.",
    faqEyebrow: "FAQ",
    faqH2: "Preguntas frecuentes",
    faqs: [
      {
        q: "¿Cómo consigo el certificado médico para el Illness Benefit?",
        a: "Necesita una consulta con un médico colegiado en el Irish Medical Council. Si el médico concluye que está incapacitado para trabajar, emite un Certificate of Incapacity for Work y lo envía al Department of Social Protection. No todos los servicios online emiten este certificado, así que confírmelo antes de reservar. Lleve su número PPS a la consulta, porque el certificado debe coincidir con su solicitud.",
      },
      {
        q: "¿El Illness Benefit es lo mismo que la baja que paga la empresa?",
        a: "No. La Statutory Sick Leave la paga su empresa al amparo del Sick Leave Act 2022. El Illness Benefit lo paga el Department of Social Protection con cargo al fondo de seguridad social. Son derechos distintos con normas propias, y solicitar uno no solicita el otro.",
      },
      {
        q: "¿Puedo solicitar el Illness Benefit si trabajo por cuenta propia?",
        a: "Depende de la clase de PRSI que abone. Las clases que dan derecho y los requisitos de cotización figuran en la página del Departamento sobre Illness Benefit y no son iguales para todas las clases. Compruebe esa página frente a su propio historial de cotización antes de dar por hecho que está cubierto.",
      },
      {
        q: "¿Necesito un certificado médico nuevo cada semana?",
        a: "Su médico decide el periodo que abarca cada certificado en función de su estado. Si sigue incapacitado cuando termine, necesitará otro certificado y su médico le dirá cuándo volver. No existe un intervalo fijo aplicable a cualquier persona.",
      },
      {
        q: "¿Puede un médico online emitir el Certificate of Incapacity for Work?",
        a: "Sí, cuando la videoconsulta constituye una evaluación adecuada para lo que le ocurre y el médico está colegiado en el Medical Council. En cuadros que requieren exploración física, analítica u observación presencial, el médico le deriva para que le vean en lugar de certificar a distancia.",
      },
      {
        q: "¿Qué pasa si el Departamento deniega mi solicitud?",
        a: "La denegación es motivada e incluye el derecho de recurso. Lea la resolución y actúe por la vía de recurso que indique el Departamento. Su médico puede aportar información clínica adicional si es pertinente, pero la decisión es del Departamento, no del médico.",
      },
    ],
    disclaimerTitle: "Aviso Médico",
    disclaimer:
      "Escrito por el Dr Tiago Miguel Figueira (IMC 523449), Director Clínico de Global Health, y revisado clínicamente por el Dr Ahmed Maklad, médico de familia. Este artículo contiene información general sobre el procedimiento irlandés de seguridad social y de certificación. No constituye asesoramiento médico personalizado, ni asesoramiento jurídico o financiero. El derecho al Illness Benefit lo decide únicamente el Department of Social Protection, y ninguna consulta con nosotros garantiza un certificado ni un pago. Si sufre una emergencia médica, llame de inmediato al 999 o al 112.",
  } satisfies Article,
};

const cs: LocalePost = {
  locale: "CS",
  slug: "illness-benefit-irsko-jak-zazadat",
  title: "Illness Benefit v Irsku: jak o dávku zažádat a jak získat lékařské potvrzení",
  excerpt:
    "Illness Benefit je dávka, kterou vyplácí irský Department of Social Protection lidem, kteří nemohou pracovat kvůli nemoci nebo úrazu. Vysvětlujeme, co žádost vyžaduje, kdo smí vystavit Certificate of Incapacity for Work a čím se dávka liší od nemocenské placené zaměstnavatelem.",
  seoTitle: "Illness Benefit v Irsku: jak zažádat (2026)",
  seoDescription:
    "Žádost o Illness Benefit v Irsku: formulář IB1, Certificate of Incapacity for Work, kdo jej smí vystavit a v čem se liší od nemocenské od zaměstnavatele.",
  category: "Praktické lékařství",
  article: {
    lang: "cs-CZ",
    tagline: "Medicína kdykoli a kdekoli",
    categoryLabel: "Praktické lékařství",
    categoryHref: href("cs", "/blog"),
    eyebrow: "Irsko · Průvodce pro zaměstnance",
    h1: "Illness Benefit v Irsku",
    deck: "Sociální dávka pro toho, kdo nemůže pracovat kvůli nemoci nebo úrazu — a lékařské potvrzení, o které se žádost musí opřít.",
    intro:
      "Illness Benefit je týdenní dávka <strong>Department of Social Protection (DSP)</strong> určená lidem pod důchodovým věkem, kteří nemohou pracovat kvůli nemoci nebo úrazu. Je financovaná z odvodů <strong>PRSI</strong>, takže nezávisí na vašich příjmech ani na majetku. Na úřad musí dorazit dvě věci: vaše žádost na formuláři <strong>IB1</strong> nebo přes MyWelfare a <strong>Certificate of Incapacity for Work</strong> vystavený lékařem registrovaným u Irish Medical Council, které lékař odešle úřadu za vás. Ne každá online služba toto potvrzení vystavuje, proto se před objednáním zeptejte. Je to jiná dávka než zákonná nemocenská, kterou platí zaměstnavatel.",
    facts: [
      "Vyplácí Department of Social Protection",
      "Vyžaduje Certificate of Incapacity for Work",
      "Není totéž co nemocenská od zaměstnavatele",
    ],
    primaryCta: { label: "Objednat online konzultaci", href: href("cs", "/services/sick-certificate-ireland") },
    secondaryCta: { label: "Illness Benefit na gov.ie", href: GOV_IB },
    panelChip: "Co tento průvodce pokrývá",
    panelParas: [
      "Rozdíl mezi Illness Benefit a Statutory Sick Leave — platí je různé subjekty podle různých předpisů a jedna druhou nenahrazuje.",
      "Co je Certificate of Incapacity for Work, kdo jej smí vystavit a jak se dostane na úřad.",
      "Výše dávky, čekací dny i maximální délka určuje úřad a mění se s každým rozpočtem. Tento text je neuvádí: každá otázka na čísla odkazuje na oficiální stránku úřadu.",
    ],
    author: { initials: "TF", name: "Dr Tiago Miguel Figueira", line: "IMC 523449 · Klinický ředitel, Global Health" },
    reviewLine: "Klinicky zkontroloval Dr Ahmed Maklad, praktický lékař, Global Health Irsko.",
    navLabel: "Obsah článku",
    sections: [
      {
        id: "what-it-is",
        nav: "Co to je",
        eyebrow: "Definice",
        h2: "Co je Illness Benefit",
        blocks: [
          lead("Illness Benefit je dávka Department of Social Protection pro toho, kdo nemůže pracovat kvůli nemoci nebo úrazu. Spravuje ji úřad — ne váš zaměstnavatel a ne HSE."),
          p("Protože je financovaná z odvodů <strong>PRSI</strong>, nárok závisí na vaší evidenci odvodů, nikoli na výši příjmu vašeho ani vaší domácnosti. Právě to z ní dělá dávku pojistného typu, nikoli dávku testovanou podle majetkových poměrů."),
          p("Zda se vaše odvody počítají, závisí na <strong>třídě PRSI</strong>, kterou platíte. Způsobilé třídy i příslušné podmínky jsou uvedeny přímo na stránce úřadu. Pokud podnikáte nebo jste v poslední době střídali zaměstnání a podnikání, ověřte si tento seznam dřív, než budete předpokládat, že máte nárok — odpověď není pro všechny třídy stejná."),
          warn("Důchodový věk", "Illness Benefit je určen lidem, kteří ještě nedosáhli důchodového věku. Pokud jste jej již dosáhli, platí jiná dávka a stránka úřadu uvádí která."),
        ],
      },
      {
        id: "vs-sick-leave",
        nav: "Vs. nemocenská",
        eyebrow: "Dvě různé dávky",
        h2: "Illness Benefit není nemocenská od zaměstnavatele",
        blocks: [
          lead("Jsou to dva odlišné nároky, které si spousta lidí plete — a právě ta záměna nejčastěji zdrží výplatu."),
          ul([
            "<strong>Statutory Sick Leave</strong> platí <em>váš zaměstnavatel</em> podle Sick Leave Act 2022 a dohlíží na ni Workplace Relations Commission.",
            "<strong>Illness Benefit</strong> platí <em>Department of Social Protection</em> ze systému sociálního pojištění.",
            "Řídí se jinými pravidly, žádá se o ně jinak a dokládají se jinými dokumenty.",
            "Váš zaměstnavatel může mít navíc vlastní firemní úpravu placené nemocenské nad rámec obojího — to je věc vaší smlouvy.",
          ]),
          p(`Nemocenské od zaměstnavatele a tomu, co po vás smí požadovat, se věnuje samostatný text: <a href="${href("cs", "/blog/sick-certificate-ireland-employee-rights")}">potvrzení o pracovní neschopnosti v Irsku a vaše práva zaměstnance</a>.`),
          cite(`Pokyny k zákonné nemocenské: <a href="${WRC_SICK_LEAVE}" rel="nofollow noopener" target="_blank">Workplace Relations Commission</a>.`),
        ],
      },
      {
        id: "certificate",
        nav: "Potvrzení",
        eyebrow: "Lékařský doklad",
        h2: "Certificate of Incapacity for Work",
        blocks: [
          lead("Tohle je lékařský dokument, který úřad vyžaduje. Není totéž co omluvenka pro zaměstnavatele, i když jedna konzultace může vést k obojímu."),
          p("Certificate of Incapacity for Work konstatuje, že podle názoru lékaře, který vás vyšetřil, jste práce neschopní, a uvádí období, na které se ten názor vztahuje. Musí jej vystavit lékař <strong>registrovaný u Medical Council</strong> — registraci kteréhokoli lékaře si ověříte ve veřejném registru."),
          p("V praxi potvrzení necestuje s vámi. Lékař jej vystaví a odešle úřadu — některé ordinace elektronicky, jiné poštou; vy jej neposíláte v žádném případě. Vaším úkolem je zajistit, aby měl lékař vaše <strong>PPS číslo</strong> a správné údaje, protože právě nesoulad mezi potvrzením a žádostí výplatu blokuje."),
          ul([
            "Období, na které potvrzení platí, určuje lékař podle klinického stavu — ne podle toho, co si přejete.",
            "Pokud jste práce neschopní i po jeho skončení, potřebujete nové potvrzení; lékař vám řekne kdy.",
            "Potvrzení je odborný názor. Žádný lékař ani klinika nemůže zaručit, že úřad žádost schválí.",
          ]),
          warn("Zpětné uznání není automatické", "Očekává se, že žádost podáte bez odkladu. Pokud má žádost nebo potvrzení zpoždění z nějakého důvodu, vysvětlete ho hned, ne až po rozhodnutí — stránka úřadu popisuje, jak se opožděné žádosti posuzují."),
          cite(`Ověření registrace lékaře: <a href="${MEDICAL_COUNCIL}" rel="nofollow noopener" target="_blank">registr Irish Medical Council</a>.`),
        ],
      },
      {
        id: "how-to-claim",
        nav: "Jak žádat",
        eyebrow: "Postup",
        h2: "Jak se žádost podává",
        blocks: [
          lead("Jsou dvě souběžné cesty — vaše a lékařova — a proces se pohne, až dorazí obě."),
          ul([
            "<strong>Jděte k lékaři.</strong> Konzultace určí, zda jste práce neschopní a na jak dlouho. Vezměte si PPS číslo.",
            "<strong>Lékař vystaví Certificate of Incapacity for Work</strong> a odešle jej úřadu.",
            "<strong>Vy podáte žádost.</strong> Buď formulář IB1, nebo odpovídající online žádost v MyWelfare s ověřeným účtem MyGovID.",
            "<strong>Uveďte bankovní údaje</strong> v požadovaném formátu, aby platba nezůstala viset, než si je úřad vyžádá.",
            "<strong>Zaměstnavatele informujte zvlášť.</strong> Oznámení úřadu není oznámením zaměstnavateli a úřad to za vás neudělá.",
          ]),
          p("Pokud se vaše okolnosti během řízení změní — uzdravíte se, vrátíte se na částečný úvazek, vycestujete —, úřad o tom musí vědět. Tato pravidla najdete na oficiální stránce a právě jejich opomenutí nejčastěji vede k přeplatkům, které se pak vracejí."),
          cite(`Online žádost: <a href="${MYWELFARE}" rel="nofollow noopener" target="_blank">MyWelfare — Illness Benefit</a>. Úplné podmínky: <a href="${CITIZENS_IB}" rel="nofollow noopener" target="_blank">Citizens Information</a>.`),
        ],
      },
      {
        id: "online-gp",
        nav: "Lékař online",
        eyebrow: "Telemedicína",
        h2: "Může potvrzení vystavit lékař online?",
        blocks: [
          lead("Někdy ano — a poctivá odpověď zní, že záleží na tom, co vám je."),
          p("Lékař ve videokonzultaci má přesně stejné profesní povinnosti jako lékař v ordinaci. Potvrzení může vzejít jen z <strong>přiměřeného vyšetření</strong>. U řady samoúzdravných onemocnění — respirační infekce, střevní potíže, migréna, akutní úzkostná epizoda — je dobře vedená videokonzultace přiměřeným vyšetřením a potvrzení lze vystavit týž den."),
          p("V jiných situacích ne. Cokoli, co vyžaduje prohlédnout ucho, prohmatat břicho, poslechnout plíce, vyšetřit kloub, změřit tlak nebo nechat týž den odebrat krev, vyžaduje osobní vyšetření — a odpovědný lékař online vám to řekne a odešle vás, místo aby potvrzoval naslepo."),
          ul([
            "Lékař musí být registrovaný u Medical Council, aby potvrzení mělo vůči úřadu účinek.",
            "Konzultace musí být dost dlouhá a podrobná, aby vyslovený názor unesla.",
            "Pokud klinický stav pracovní neschopnost neodůvodňuje, lékař to řekne. Není to selhání služby — je to to, co dává potvrzení cenu.",
          ]),
          warn("Žádná klinika nemůže potvrzení slíbit", "Služba, která vám zaručí potvrzení dřív, než vás lékař vyšetří, prodává něco, co lékař eticky poskytnout nemůže. My to neděláme a doporučujeme být opatrní vůči těm, kdo to dělají."),
        ],
      },
      {
        id: "red-flags",
        nav: "Varovné příznaky",
        eyebrow: "Bezpečnost",
        h2: "Kdy potřebujete osobní vyšetření — nebo rovnou pomoc",
        blocks: [
          lead("Potvrzení nikdy není priorita, když je nemoc sama o sobě urgentní."),
          ul([
            "Bolest, tlak nebo svírání na hrudi, zvlášť s dušností, pocením nebo bolestí vyzařující do paže či čelisti.",
            "Náhlá slabost, pokleslý koutek, porucha řeči nebo náhlá silná bolest hlavy.",
            "Dušnost v klidu, nebo namodralé rty a obličej.",
            "Skvrny na kůži, které po stlačení nemizí, zvlášť s horečkou, ztuhlou šíjí nebo zmateností.",
            "Jakékoli myšlenky na sebepoškození.",
          ]),
          p("Pokud na vás něco z toho sedí, volejte <strong>112</strong> nebo <strong>999</strong>, případně jděte na nejbližší pohotovost. Papíry se vyřídí potom."),
        ],
      },
    ],
    linksEyebrow: "Global Health Irsko",
    linksH2: "Další kroky",
    linksLead: "Naši lékaři v Irsku pracují přes video a mohou posoudit, zda je ve vašem případě potvrzení klinicky namístě.",
    links: [
      { label: "Potvrzení o pracovní neschopnosti a online konzultace v Irsku", href: href("cs", "/services/sick-certificate-ireland") },
      { label: "Registrovaní lékaři naší irské služby", href: href("cs", "/doctors") },
      { label: "Kontaktovat Global Health Irsko", href: href("cs", "/contact") },
    ],
    ctaBox: {
      h3: "Promluvte si dnes s registrovaným lékařem v Irsku",
      text: "Videokonzultace určí, zda jste práce neschopní, a pokud je to klinicky namístě, vznikne z ní potvrzení, které vaše žádost vyžaduje.",
      primary: { label: "Objednat konzultaci", href: href("cs", "/services/sick-certificate-ireland") },
      secondary: { label: "Zobrazit naše lékaře", href: href("cs", "/doctors") },
    },
    sourcesEyebrow: "Oficiální zdroje",
    sourcesH2: "Odkud pravidla skutečně pocházejí",
    sourcesLead: "Výše dávky, čekací dny, podmínky odvodů i délku výplaty určuje Department of Social Protection a mění se. Aktuální hodnotu si vždy ověřte u zdroje, ne v článku.",
    sources: [
      { label: "gov.ie — Illness Benefit", href: GOV_IB },
      { label: "Citizens Information — Illness Benefit", href: CITIZENS_IB },
      { label: "MyWelfare — online žádost", href: MYWELFARE },
      { label: "Medical Council — registr lékařů", href: MEDICAL_COUNCIL },
      { label: "WRC — zákonná nemocenská", href: WRC_SICK_LEAVE },
    ],
    sourcesNote: "Odkazy vedou na stránky příslušných institucí. Global Health nemá žádnou vazbu na Department of Social Protection a nemůže o žádné sociální dávce rozhodnout, urychlit ji ani zaručit.",
    faqEyebrow: "FAQ",
    faqH2: "Časté dotazy",
    faqs: [
      {
        q: "Jak získám lékařské potvrzení pro Illness Benefit?",
        a: "Potřebujete konzultaci s lékařem registrovaným u Irish Medical Council. Pokud dojde k závěru, že jste práce neschopní, vystaví Certificate of Incapacity for Work a odešle jej Department of Social Protection. Ne každá online služba toto potvrzení vystavuje, ověřte si to před objednáním. Vezměte si na konzultaci PPS číslo, protože potvrzení se musí shodovat s vaší žádostí.",
      },
      {
        q: "Je Illness Benefit totéž co nemocenská od zaměstnavatele?",
        a: "Ne. Statutory Sick Leave platí zaměstnavatel podle Sick Leave Act 2022. Illness Benefit platí Department of Social Protection ze systému sociálního pojištění. Jsou to odlišné nároky s vlastními pravidly a žádost o jeden není žádostí o druhý.",
      },
      {
        q: "Mohu o Illness Benefit žádat jako OSVČ?",
        a: "Záleží na třídě PRSI, kterou platíte. Způsobilé třídy a podmínky odvodů jsou uvedeny na stránce úřadu k Illness Benefit a nejsou pro všechny třídy stejné. Porovnejte je s vlastní evidencí odvodů dřív, než budete předpokládat, že máte nárok.",
      },
      {
        q: "Potřebuji nové potvrzení každý týden?",
        a: "Období, na které každé potvrzení platí, určuje lékař podle vašeho stavu. Pokud jste práce neschopní i po jeho uplynutí, potřebujete nové a lékař vám řekne, kdy přijít. Žádný jednotný interval platný pro všechny neexistuje.",
      },
      {
        q: "Může Certificate of Incapacity for Work vystavit lékař online?",
        a: "Ano, pokud je videokonzultace pro váš stav přiměřeným vyšetřením a lékař je registrovaný u Medical Council. Tam, kde je potřeba fyzikální vyšetření, odběry nebo osobní posouzení, vás lékař odešle místo toho, aby potvrzoval na dálku.",
      },
      {
        q: "Co když úřad moji žádost zamítne?",
        a: "Zamítnutí je odůvodněné a doprovází je poučení o odvolání. Rozhodnutí si přečtěte a reagujte cestou, kterou úřad uvádí. Váš ošetřující lékař může doplnit klinické informace, pokud jsou relevantní, ale rozhoduje úřad, nikoli lékař.",
      },
    ],
    disclaimerTitle: "Lékařské upozornění",
    disclaimer:
      "Napsal Dr Tiago Miguel Figueira (IMC 523449), klinický ředitel Global Health, klinicky zkontroloval Dr Ahmed Maklad, praktický lékař. Text obsahuje obecné informace o irském systému sociálního zabezpečení a lékařských potvrzení. Nejde o personalizované lékařské, právní ani finanční poradenství. O nároku na Illness Benefit rozhoduje výhradně Department of Social Protection a žádná konzultace u nás nezaručuje potvrzení ani výplatu. V případě lékařské pohotovosti volejte ihned 999 nebo 112.",
  } satisfies Article,
};

const roPost: LocalePost = {
  locale: "RO",
  slug: "illness-benefit-irlanda-cum-soliciti",
  title: "Illness Benefit în Irlanda: cum se solicită și cum obții certificatul medical",
  excerpt:
    "Illness Benefit este indemnizația plătită de Department of Social Protection persoanelor care nu pot munci din cauza bolii sau a unui accident. Explicăm ce presupune cererea, cine poate elibera Certificate of Incapacity for Work și prin ce diferă de concediul medical plătit de angajator.",
  seoTitle: "Illness Benefit în Irlanda: cum soliciți indemnizația",
  seoDescription:
    "Cerere Illness Benefit în Irlanda: formularul IB1, Certificate of Incapacity for Work, cine îl eliberează și diferența față de concediul de la angajator.",
  category: "Medicină de familie",
  article: {
    lang: "ro-RO",
    tagline: "Îngrijire medicală oricând, oriunde",
    categoryLabel: "Medicină de familie",
    categoryHref: href("ro", "/blog"),
    eyebrow: "Irlanda · Ghid pentru angajați",
    h1: "Illness Benefit în Irlanda",
    deck: "Indemnizația socială pentru cine nu poate munci din cauza bolii sau a unui accident — și certificatul medical pe care cererea trebuie să se sprijine.",
    intro:
      "Illness Benefit este o plată săptămânală a <strong>Department of Social Protection (DSP)</strong>, destinată persoanelor sub vârsta de pensionare care nu pot munci din cauza bolii sau a unui accident. Este finanțată din contribuțiile <strong>PRSI</strong>, deci nu depinde de veniturile sau de averea dumneavoastră. La instituție trebuie să ajungă două lucruri: cererea, pe formularul <strong>IB1</strong> sau prin MyWelfare, și un <strong>Certificate of Incapacity for Work</strong> eliberat de un medic înscris la Irish Medical Council, pe care medicul îl transmite instituției în locul dumneavoastră. Nu orice serviciu online eliberează acest certificat, așa că verificați înainte de programare. Este o indemnizație distinctă de concediul medical legal plătit de angajator.",
    facts: [
      "Plătită de Department of Social Protection",
      "Necesită Certificate of Incapacity for Work",
      "Diferită de concediul plătit de angajator",
    ],
    primaryCta: { label: "Programați o consultație online", href: href("ro", "/services/sick-certificate-ireland") },
    secondaryCta: { label: "Illness Benefit pe gov.ie", href: GOV_IB },
    panelChip: "Ce acoperă acest ghid",
    panelParas: [
      "Diferența dintre Illness Benefit și Statutory Sick Leave — sunt plătite de entități diferite, în temeiul unor reglementări diferite, și una nu o înlocuiește pe cealaltă.",
      "Ce este Certificate of Incapacity for Work, cine îl poate elibera și cum ajunge la instituție.",
      "Sumele, zilele de așteptare și durata maximă sunt stabilite de instituție și se modifică la fiecare buget. Acest ghid nu le citează: fiecare întrebare despre cifre trimite la pagina oficială.",
    ],
    author: { initials: "TF", name: "Dr Tiago Miguel Figueira", line: "IMC 523449 · Director clinic, Global Health" },
    reviewLine: "Revizuit clinic de Dr Ahmed Maklad, medic de familie, Global Health Irlanda.",
    navLabel: "În acest articol",
    sections: [
      {
        id: "what-it-is",
        nav: "Ce este",
        eyebrow: "Definiție",
        h2: "Ce este, de fapt, Illness Benefit",
        blocks: [
          lead("Illness Benefit este o plată a Department of Social Protection pentru cine nu poate munci din cauza bolii sau a unui accident. Este administrată de instituție — nu de angajator și nu de HSE."),
          p("Fiind finanțată din contribuțiile <strong>PRSI</strong>, dreptul depinde de istoricul dumneavoastră de contribuții, nu de venitul personal sau al gospodăriei. Tocmai de aceea este o indemnizație de tip contributiv, nu una condiționată de venituri."),
          p("Dacă anumite contribuții contează depinde de <strong>clasa PRSI</strong> pe care o plătiți. Clasele eligibile și condițiile aferente sunt listate chiar pe pagina instituției. Dacă lucrați pe cont propriu sau ați alternat recent între angajare și activitate independentă, verificați lista înainte de a presupune că sunteți acoperit — răspunsul nu este identic pentru toate clasele."),
          warn("Vârsta de pensionare", "Illness Benefit se adresează persoanelor care nu au atins încă vârsta de pensionare. Dacă ați atins-o, se aplică o altă prestație, iar pagina instituției indică pe care."),
        ],
      },
      {
        id: "vs-sick-leave",
        nav: "Vs. concediu",
        eyebrow: "Două prestații distincte",
        h2: "Illness Benefit nu este concediul plătit de angajator",
        blocks: [
          lead("Sunt două drepturi distincte pe care multă lume le confundă — iar confuzia este cea mai frecventă cauză de întârziere a plății."),
          ul([
            "<strong>Statutory Sick Leave</strong> este plătit <em>de angajator</em>, în temeiul Sick Leave Act 2022, și este supravegheat de Workplace Relations Commission.",
            "<strong>Illness Benefit</strong> este plătit <em>de Department of Social Protection</em>, din fondul de asigurări sociale.",
            "Se supun unor reguli diferite, se solicită diferit și se dovedesc cu documente diferite.",
            "Angajatorul poate avea în plus o schemă proprie de concediu plătit peste aceste două — asta ține de contractul dumneavoastră.",
          ]),
          p(`Concediului plătit de angajator și a ceea ce vi se poate cere i se dedică un ghid separat: <a href="${href("ro", "/blog/sick-certificate-ireland-employee-rights")}">certificatele de concediu medical în Irlanda și drepturile dumneavoastră de angajat</a>.`),
          cite(`Îndrumări privind concediul legal: <a href="${WRC_SICK_LEAVE}" rel="nofollow noopener" target="_blank">Workplace Relations Commission</a>.`),
        ],
      },
      {
        id: "certificate",
        nav: "Certificatul",
        eyebrow: "Dovada medicală",
        h2: "Certificate of Incapacity for Work",
        blocks: [
          lead("Acesta este documentul medical cerut de instituție. Nu este același lucru cu justificarea depusă la angajator, chiar dacă o singură consultație poate da naștere ambelor."),
          p("Certificate of Incapacity for Work atestă că, în opinia medicului care v-a evaluat, sunteți inapt de muncă și indică perioada acoperită de acea opinie. Trebuie eliberat de un medic <strong>înscris la Medical Council</strong> — înscrierea oricărui medic poate fi verificată în registrul public."),
          p("În practică, certificatul nu călătorește cu dumneavoastră. Medicul îl eliberează și îl trimite instituției — unele cabinete electronic, altele prin poștă; în niciun caz nu îl trimiteți dumneavoastră. Rolul dumneavoastră este să vă asigurați că medicul are <strong>numărul PPS</strong> și datele corecte, pentru că neconcordanța dintre certificat și cerere blochează plata."),
          ul([
            "Perioada acoperită de certificat o decide medicul, pe baza tabloului clinic — nu pe baza a ceea ce i se cere.",
            "Dacă rămâneți inapt după încheierea ei, aveți nevoie de un certificat nou; medicul vă spune când.",
            "Certificatul este o opinie clinică. Niciun medic și nicio clinică nu poate garanta că instituția va aproba cererea.",
          ]),
          warn("Retroactivitatea nu este automată", "Se așteaptă ca cererile să fie depuse prompt. Dacă cererea sau certificatul întârzie dintr-un motiv anume, explicați-l atunci, nu după emiterea deciziei — pagina instituției arată cum sunt tratate cererile tardive."),
          cite(`Verificarea înscrierii unui medic: <a href="${MEDICAL_COUNCIL}" rel="nofollow noopener" target="_blank">registrul Irish Medical Council</a>.`),
        ],
      },
      {
        id: "how-to-claim",
        nav: "Cum se solicită",
        eyebrow: "Procedura",
        h2: "Cum se depune cererea",
        blocks: [
          lead("Există două trasee paralele — al dumneavoastră și al medicului — iar procesul avansează doar când ajung amândouă."),
          ul([
            "<strong>Consultați un medic.</strong> Consultația stabilește dacă sunteți inapt de muncă și pentru cât timp. Luați numărul PPS.",
            "<strong>Medicul eliberează Certificate of Incapacity for Work</strong> și îl transmite instituției.",
            "<strong>Dumneavoastră depuneți cererea.</strong> Formularul IB1 sau cererea echivalentă online, în MyWelfare, cu cont MyGovID verificat.",
            "<strong>Indicați datele bancare</strong> în formatul cerut, ca plata să nu rămână blocată până sunt solicitate.",
            "<strong>Anunțați separat angajatorul.</strong> Notificarea instituției nu înseamnă notificarea angajatorului, iar instituția nu o face în locul dumneavoastră.",
          ]),
          p("Dacă situația se schimbă în timpul procesului — vă recuperați, reveniți cu normă parțială, plecați din țară —, instituția trebuie informată. Aceste reguli sunt pe pagina oficială și tocmai omiterea lor duce cel mai des la plăți necuvenite, restituite ulterior."),
          cite(`Cerere online: <a href="${MYWELFARE}" rel="nofollow noopener" target="_blank">MyWelfare — Illness Benefit</a>. Condiții complete: <a href="${CITIZENS_IB}" rel="nofollow noopener" target="_blank">Citizens Information</a>.`),
        ],
      },
      {
        id: "online-gp",
        nav: "Medic online",
        eyebrow: "Telemedicină",
        h2: "Poate un medic online să elibereze certificatul?",
        blocks: [
          lead("Uneori — iar răspunsul onest este că depinde de ce aveți."),
          p("Un medic aflat în consultație video are exact aceleași obligații profesionale ca unul din cabinet. Un certificat poate rezulta doar dintr-o <strong>evaluare adecvată</strong>. În multe afecțiuni autolimitate — o infecție respiratorie, o gastroenterită, o migrenă, un episod acut de anxietate — o consultație video bine condusă este o evaluare adecvată, iar certificatul poate fi emis în aceeași zi."),
          p("În alte situații, nu. Tot ce presupune examinarea unei urechi, palparea abdomenului, auscultația toracelui, examinarea unei articulații, măsurarea tensiunii sau analize în aceeași zi cere examinare fizică, iar un medic online responsabil vă va spune asta și vă va îndruma, în loc să certifice în orb."),
          ul([
            "Medicul trebuie să fie înscris la Medical Council pentru ca certificatul să producă efecte la instituție.",
            "Consultația trebuie să fie suficient de lungă și de detaliată pentru a susține opinia emisă.",
            "Dacă tabloul clinic nu susține incapacitatea de muncă, medicul vă va spune. Nu este un eșec al serviciului — este exact ce dă valoare certificatului.",
          ]),
          warn("Nicio clinică nu poate promite un certificat", "Orice serviciu care vă garantează certificatul înainte ca un medic să vă evalueze vinde ceva ce un medic nu poate oferi etic. Noi nu facem asta și vă recomandăm prudență față de cei care o fac."),
        ],
      },
      {
        id: "red-flags",
        nav: "Semne de alarmă",
        eyebrow: "Siguranță",
        h2: "Când aveți nevoie de examinare fizică — sau de urgență",
        blocks: [
          lead("Certificatul nu este niciodată prioritatea când boala însăși este urgența."),
          ul([
            "Durere, apăsare sau presiune în piept, mai ales cu lipsă de aer, transpirații sau durere care iradiază în braț ori în mandibulă.",
            "Slăbiciune bruscă, gură strâmbă, tulburare de vorbire sau durere de cap bruscă și intensă.",
            "Dificultate de respirație în repaus, sau buze și față vinete.",
            "Pete pe piele care nu dispar la apăsare, mai ales cu febră, redoare de ceafă sau confuzie.",
            "Orice gând de a vă face rău.",
          ]),
          p("Dacă vă regăsiți în vreuna dintre situații, sunați la <strong>112</strong> sau <strong>999</strong>, ori mergeți la cea mai apropiată urgență. Actele se rezolvă după."),
        ],
      },
    ],
    linksEyebrow: "Global Health Irlanda",
    linksH2: "Pașii următori",
    linksLead: "Medicii noștri din Irlanda consultă prin video și pot evalua dacă, în cazul dumneavoastră, un certificat este justificat clinic.",
    links: [
      { label: "Certificat de concediu medical și consultație online în Irlanda", href: href("ro", "/services/sick-certificate-ireland") },
      { label: "Medicii înscriși ai serviciului nostru irlandez", href: href("ro", "/doctors") },
      { label: "Contactați Global Health Irlanda", href: href("ro", "/contact") },
    ],
    ctaBox: {
      h3: "Vorbiți astăzi cu un medic înscris în Irlanda",
      text: "O consultație video stabilește dacă sunteți inapt de muncă și, când este justificat clinic, produce certificatul cerut de cererea dumneavoastră.",
      primary: { label: "Programați o consultație", href: href("ro", "/services/sick-certificate-ireland") },
      secondary: { label: "Vedeți medicii noștri", href: href("ro", "/doctors") },
    },
    sourcesEyebrow: "Surse oficiale",
    sourcesH2: "De unde vin, de fapt, regulile",
    sourcesLead: "Sumele, zilele de așteptare, condițiile de contribuție și durata plăților sunt stabilite de Department of Social Protection și se modifică. Verificați întotdeauna valoarea curentă la sursă, nu într-un articol.",
    sources: [
      { label: "gov.ie — Illness Benefit", href: GOV_IB },
      { label: "Citizens Information — Illness Benefit", href: CITIZENS_IB },
      { label: "MyWelfare — cerere online", href: MYWELFARE },
      { label: "Medical Council — registrul medicilor", href: MEDICAL_COUNCIL },
      { label: "WRC — concediu medical legal", href: WRC_SICK_LEAVE },
    ],
    sourcesNote: "Linkurile deschid site-urile instituțiilor emitente. Global Health nu are nicio legătură cu Department of Social Protection și nu poate decide, accelera sau garanta vreo prestație socială.",
    faqEyebrow: "Întrebări frecvente",
    faqH2: "Întrebări frecvente",
    faqs: [
      {
        q: "Cum obțin certificatul medical pentru Illness Benefit?",
        a: "Aveți nevoie de o consultație cu un medic înscris la Irish Medical Council. Dacă medicul conchide că sunteți inapt de muncă, eliberează un Certificate of Incapacity for Work și îl transmite către Department of Social Protection. Nu orice serviciu online eliberează acest certificat, așa că verificați înainte de a vă programa. Luați numărul PPS la consultație, pentru că certificatul trebuie să corespundă cererii.",
      },
      {
        q: "Illness Benefit este același lucru cu concediul plătit de angajator?",
        a: "Nu. Statutory Sick Leave este plătit de angajator în temeiul Sick Leave Act 2022. Illness Benefit este plătit de Department of Social Protection din fondul de asigurări sociale. Sunt drepturi distincte, cu reguli proprii, iar cererea pentru unul nu înseamnă cererea pentru celălalt.",
      },
      {
        q: "Pot solicita Illness Benefit dacă lucrez pe cont propriu?",
        a: "Depinde de clasa PRSI pe care o plătiți. Clasele eligibile și condițiile de contribuție sunt pe pagina instituției dedicată Illness Benefit și nu sunt identice pentru toate clasele. Comparați-le cu propriul istoric de contribuții înainte de a presupune că sunteți acoperit.",
      },
      {
        q: "Am nevoie de un certificat nou în fiecare săptămână?",
        a: "Perioada acoperită de fiecare certificat o decide medicul, în funcție de starea dumneavoastră. Dacă rămâneți inapt după încheierea ei, aveți nevoie de unul nou, iar medicul vă spune când să reveniți. Nu există un interval fix valabil pentru toată lumea.",
      },
      {
        q: "Poate un medic online să elibereze Certificate of Incapacity for Work?",
        a: "Da, atunci când consultația video reprezintă o evaluare adecvată pentru ce aveți, iar medicul este înscris la Medical Council. În situațiile care cer examinare fizică, analize sau evaluare în cabinet, medicul vă îndrumă în loc să certifice la distanță.",
      },
      {
        q: "Ce se întâmplă dacă instituția îmi respinge cererea?",
        a: "Respingerea este motivată și însoțită de dreptul la contestație. Citiți decizia și reacționați pe calea indicată de instituție. Medicul curant poate furniza informații clinice suplimentare dacă sunt relevante, dar decizia aparține instituției, nu medicului.",
      },
    ],
    disclaimerTitle: "Aviz medical",
    disclaimer:
      "Scris de Dr Tiago Miguel Figueira (IMC 523449), director clinic al Global Health, și revizuit clinic de Dr Ahmed Maklad, medic de familie. Articolul conține informații generale despre sistemul irlandez de securitate socială și de certificare medicală. Nu constituie sfat medical personalizat și nici consultanță juridică sau financiară. Dreptul la Illness Benefit este decis exclusiv de Department of Social Protection, iar nicio consultație la noi nu garantează un certificat sau o plată. În caz de urgență medicală, sunați imediat la 999 sau 112.",
  } satisfies Article,
};

const de: LocalePost = {
  locale: "DE",
  slug: "illness-benefit-irland-so-beantragen",
  title: "Illness Benefit in Irland: Antrag stellen und ärztliche Bescheinigung erhalten",
  excerpt:
    "Illness Benefit ist die Leistung des irischen Department of Social Protection für Menschen, die wegen Krankheit oder Unfall nicht arbeiten können. Wir erklären, was der Antrag verlangt, wer das Certificate of Incapacity for Work ausstellen darf und worin es sich von der Lohnfortzahlung unterscheidet.",
  seoTitle: "Illness Benefit in Irland: so beantragen Sie ihn",
  seoDescription:
    "Illness Benefit in Irland beantragen: Formular IB1, Certificate of Incapacity for Work, wer es ausstellen darf und der Unterschied zur Lohnfortzahlung.",
  category: "Allgemeinmedizin",
  article: {
    lang: "de-DE",
    tagline: "Medizin jederzeit und überall",
    categoryLabel: "Allgemeinmedizin",
    categoryHref: href("de", "/blog"),
    eyebrow: "Irland · Leitfaden für Beschäftigte",
    h1: "Illness Benefit in Irland",
    deck: "Die Sozialleistung für alle, die wegen Krankheit oder Unfall nicht arbeiten können — und die ärztliche Bescheinigung, auf die sich der Antrag stützen muss.",
    intro:
      "Illness Benefit ist eine wöchentliche Zahlung des <strong>Department of Social Protection (DSP)</strong> für Personen unterhalb des Rentenalters, die wegen Krankheit oder Unfall nicht arbeiten können. Sie wird aus den <strong>PRSI</strong>-Beiträgen finanziert und hängt daher nicht von Ihrem Einkommen oder Vermögen ab. Zwei Dinge müssen bei der Behörde ankommen: Ihr Antrag über das Formular <strong>IB1</strong> oder über MyWelfare und ein <strong>Certificate of Incapacity for Work</strong> von einer beim Irish Medical Council registrierten Ärztin oder einem Arzt, das die Ärztin oder der Arzt für Sie an die Behörde übermittelt. Nicht jeder Online-Anbieter stellt diese Bescheinigung aus — fragen Sie vor der Buchung nach. Es handelt sich um eine andere Leistung als die gesetzliche Lohnfortzahlung des Arbeitgebers.",
    facts: [
      "Gezahlt vom Department of Social Protection",
      "Erfordert ein Certificate of Incapacity for Work",
      "Nicht dasselbe wie Lohnfortzahlung",
    ],
    primaryCta: { label: "Online-Sprechstunde buchen", href: href("de", "/services/sick-certificate-ireland") },
    secondaryCta: { label: "Illness Benefit auf gov.ie", href: GOV_IB },
    panelChip: "Was dieser Leitfaden abdeckt",
    panelParas: [
      "Den Unterschied zwischen Illness Benefit und Statutory Sick Leave — sie werden von unterschiedlichen Stellen nach unterschiedlichen Vorschriften gezahlt, und die eine ersetzt die andere nicht.",
      "Was das Certificate of Incapacity for Work ist, wer es ausstellen darf und wie es zur Behörde gelangt.",
      "Beträge, Wartetage und Höchstdauer legt die Behörde fest und ändert sie mit jedem Haushalt. Dieser Leitfaden nennt sie nicht: jede Zahlenfrage verweist auf die offizielle Seite.",
    ],
    author: { initials: "TF", name: "Dr Tiago Miguel Figueira", line: "IMC 523449 · Ärztlicher Leiter, Global Health" },
    reviewLine: "Fachlich geprüft von Dr Ahmed Maklad, Allgemeinmediziner, Global Health Irland.",
    navLabel: "In diesem Artikel",
    sections: [
      {
        id: "what-it-is",
        nav: "Was es ist",
        eyebrow: "Definition",
        h2: "Was Illness Benefit tatsächlich ist",
        blocks: [
          lead("Illness Benefit ist eine Zahlung des Department of Social Protection an Menschen, die wegen Krankheit oder Unfall nicht arbeiten können. Verwaltet wird sie von der Behörde — nicht von Ihrem Arbeitgeber und nicht vom HSE."),
          p("Da sie aus den <strong>PRSI</strong>-Beiträgen finanziert wird, hängt der Anspruch von Ihrem Beitragsverlauf ab, nicht von Ihrem Einkommen oder dem Ihres Haushalts. Genau das macht sie zu einer Beitragsleistung und nicht zu einer bedürftigkeitsabhängigen Leistung."),
          p("Ob Ihre Beiträge zählen, hängt von der <strong>PRSI-Klasse</strong> ab, die Sie zahlen. Die anspruchsberechtigten Klassen und die zugehörigen Beitragsbedingungen stehen auf der Seite der Behörde. Wenn Sie selbstständig sind oder zuletzt zwischen Anstellung und Selbstständigkeit gewechselt haben, prüfen Sie diese Liste, bevor Sie von einem Anspruch ausgehen — die Antwort fällt nicht für alle Klassen gleich aus."),
          warn("Rentenalter", "Illness Benefit richtet sich an Personen, die das Rentenalter noch nicht erreicht haben. Wer es erreicht hat, fällt unter eine andere Leistung; die Seite der Behörde nennt sie."),
        ],
      },
      {
        id: "vs-sick-leave",
        nav: "Vs. Lohnfortzahlung",
        eyebrow: "Zwei getrennte Leistungen",
        h2: "Illness Benefit ist nicht die Lohnfortzahlung des Arbeitgebers",
        blocks: [
          lead("Es sind zwei verschiedene Ansprüche, die viele verwechseln — und diese Verwechslung ist die häufigste Ursache für verzögerte Zahlungen."),
          ul([
            "<strong>Statutory Sick Leave</strong> zahlt <em>Ihr Arbeitgeber</em> nach dem Sick Leave Act 2022; zuständig für die Aufsicht ist die Workplace Relations Commission.",
            "<strong>Illness Benefit</strong> zahlt <em>das Department of Social Protection</em> aus der Sozialversicherung.",
            "Es gelten andere Regeln, andere Antragswege und andere Nachweise.",
            "Ihr Arbeitgeber kann zusätzlich eine eigene Regelung zur bezahlten Krankheit haben — das ist Sache Ihres Vertrags.",
          ]),
          p(`Die Lohnfortzahlung und das, was der Arbeitgeber verlangen darf, behandelt ein eigener Leitfaden: <a href="${href("de", "/blog/sick-certificate-ireland-employee-rights")}">Krankmeldungen in Irland und Ihre Rechte als Beschäftigte</a>.`),
          cite(`Hinweise zur gesetzlichen Lohnfortzahlung: <a href="${WRC_SICK_LEAVE}" rel="nofollow noopener" target="_blank">Workplace Relations Commission</a>.`),
        ],
      },
      {
        id: "certificate",
        nav: "Die Bescheinigung",
        eyebrow: "Ärztlicher Nachweis",
        h2: "Das Certificate of Incapacity for Work",
        blocks: [
          lead("Dies ist der ärztliche Nachweis, den die Behörde verlangt. Er ist nicht dasselbe wie die Krankmeldung beim Arbeitgeber, auch wenn eine einzige Sprechstunde beides hervorbringen kann."),
          p("Das Certificate of Incapacity for Work hält fest, dass Sie nach Einschätzung der untersuchenden Ärztin oder des Arztes arbeitsunfähig sind, und nennt den Zeitraum, für den diese Einschätzung gilt. Ausstellen darf es nur, wer beim <strong>Medical Council registriert</strong> ist — die Registrierung lässt sich im öffentlichen Register prüfen."),
          p("In der Praxis reisen Sie nicht mit der Bescheinigung. Die Ärztin oder der Arzt stellt sie aus und schickt sie an die Behörde — manche Praxen elektronisch, andere per Post; Sie selbst versenden sie nie. Ihre Aufgabe ist es, dafür zu sorgen, dass Ihre <strong>PPS-Nummer</strong> und Ihre Daten korrekt vorliegen — denn es ist die Abweichung zwischen Bescheinigung und Antrag, die die Zahlung stoppt."),
          ul([
            "Den abgedeckten Zeitraum bestimmt die Ärztin oder der Arzt nach dem klinischen Befund — nicht nach dem, worum gebeten wird.",
            "Dauert die Arbeitsunfähigkeit darüber hinaus an, brauchen Sie eine neue Bescheinigung; die Praxis sagt Ihnen wann.",
            "Eine Bescheinigung ist eine ärztliche Einschätzung. Weder Ärztin noch Klinik kann garantieren, dass die Behörde den Antrag bewilligt.",
          ]),
          warn("Rückwirkung ist nicht automatisch", "Anträge werden zeitnah erwartet. Gibt es einen Grund für eine verspätete Antragstellung oder Bescheinigung, erklären Sie ihn sofort und nicht erst nach der Entscheidung — die Seite der Behörde beschreibt, wie verspätete Anträge behandelt werden."),
          cite(`Registrierung prüfen: <a href="${MEDICAL_COUNCIL}" rel="nofollow noopener" target="_blank">Register des Irish Medical Council</a>.`),
        ],
      },
      {
        id: "how-to-claim",
        nav: "Antrag stellen",
        eyebrow: "Ablauf",
        h2: "So wird der Antrag gestellt",
        blocks: [
          lead("Es gibt zwei parallele Wege — Ihren und den der Praxis — und das Verfahren läuft erst, wenn beide angekommen sind."),
          ul([
            "<strong>Ärztliche Beurteilung.</strong> Die Sprechstunde klärt, ob und wie lange Sie arbeitsunfähig sind. Halten Sie die PPS-Nummer bereit.",
            "<strong>Die Praxis stellt das Certificate of Incapacity for Work aus</strong> und übermittelt es an die Behörde.",
            "<strong>Sie stellen den Antrag.</strong> Über das Formular IB1 oder den entsprechenden Online-Antrag in MyWelfare mit verifiziertem MyGovID-Konto.",
            "<strong>Geben Sie Ihre Bankverbindung</strong> im geforderten Format an, damit die Zahlung nicht bis zur Nachforderung liegen bleibt.",
            "<strong>Informieren Sie den Arbeitgeber gesondert.</strong> Eine Meldung an die Behörde ist keine Meldung an den Arbeitgeber, und die Behörde übernimmt das nicht.",
          ]),
          p("Ändern sich Ihre Umstände während des Verfahrens — Sie genesen, kehren in Teilzeit zurück, verlassen das Land —, muss die Behörde informiert werden. Diese Regeln stehen auf der offiziellen Seite, und ihr Übersehen führt am häufigsten zu Überzahlungen, die später zurückgefordert werden."),
          cite(`Online-Antrag: <a href="${MYWELFARE}" rel="nofollow noopener" target="_blank">MyWelfare — Illness Benefit</a>. Vollständige Bedingungen: <a href="${CITIZENS_IB}" rel="nofollow noopener" target="_blank">Citizens Information</a>.`),
        ],
      },
      {
        id: "online-gp",
        nav: "Online-Arzt",
        eyebrow: "Telemedizin",
        h2: "Darf eine Online-Praxis die Bescheinigung ausstellen?",
        blocks: [
          lead("Manchmal — und die ehrliche Antwort lautet: es kommt darauf an, was Sie haben."),
          p("Wer per Video behandelt, unterliegt genau denselben Berufspflichten wie in der Praxis. Eine Bescheinigung darf nur aus einer <strong>angemessenen Beurteilung</strong> hervorgehen. Bei vielen selbstlimitierenden Erkrankungen — einem Atemwegsinfekt, einer Magen-Darm-Infektion, einer Migräne, einer akuten Angstepisode — ist eine gut geführte Videosprechstunde eine angemessene Beurteilung, und die Bescheinigung kann noch am selben Tag ausgestellt werden."),
          p("In anderen Fällen nicht. Alles, was ein Ohr einsehen, einen Bauch abtasten, einen Brustkorb abhören, ein Gelenk untersuchen, den Blutdruck messen oder am selben Tag Blut abnehmen lassen muss, erfordert eine körperliche Untersuchung — und eine verantwortungsvolle Online-Praxis sagt Ihnen das und überweist Sie, statt blind zu bescheinigen."),
          ul([
            "Die Ärztin oder der Arzt muss beim Medical Council registriert sein, damit die Bescheinigung gegenüber der Behörde wirkt.",
            "Die Sprechstunde muss lang und gründlich genug sein, um die abgegebene Einschätzung zu tragen.",
            "Trägt der klinische Befund keine Arbeitsunfähigkeit, wird Ihnen das gesagt. Das ist kein Versagen des Dienstes — es ist genau das, was die Bescheinigung wertvoll macht.",
          ]),
          warn("Keine Klinik kann eine Bescheinigung zusagen", "Ein Dienst, der Ihnen eine Bescheinigung garantiert, bevor Sie ärztlich beurteilt wurden, verkauft etwas, das ärztlich nicht vertretbar ist. Wir tun das nicht, und Sie sollten misstrauisch sein, wenn andere es tun."),
        ],
      },
      {
        id: "red-flags",
        nav: "Warnzeichen",
        eyebrow: "Sicherheit",
        h2: "Wann Sie persönlich untersucht werden müssen — oder sofort Hilfe brauchen",
        blocks: [
          lead("Die Bescheinigung hat nie Vorrang, wenn die Erkrankung selbst der Notfall ist."),
          ul([
            "Schmerz, Enge oder Druck in der Brust, besonders mit Atemnot, Schweißausbruch oder Ausstrahlung in Arm oder Kiefer.",
            "Plötzliche Schwäche, hängender Mundwinkel, Sprachstörung oder plötzlicher heftiger Kopfschmerz.",
            "Atemnot in Ruhe, oder bläuliche Lippen und Gesichtshaut.",
            "Hautflecken, die sich nicht wegdrücken lassen, besonders mit Fieber, Nackensteife oder Verwirrtheit.",
            "Jeder Gedanke, sich selbst zu verletzen.",
          ]),
          p("Trifft eines davon zu, rufen Sie <strong>112</strong> oder <strong>999</strong> an oder gehen Sie in die nächste Notaufnahme. Die Formalitäten warten."),
        ],
      },
    ],
    linksEyebrow: "Global Health Irland",
    linksH2: "Nächste Schritte",
    linksLead: "Unsere Ärztinnen und Ärzte in Irland behandeln per Video und können beurteilen, ob in Ihrem Fall eine Bescheinigung klinisch angemessen ist.",
    links: [
      { label: "Krankmeldung und Online-Sprechstunde in Irland", href: href("de", "/services/sick-certificate-ireland") },
      { label: "Die registrierten Ärztinnen und Ärzte unseres irischen Dienstes", href: href("de", "/doctors") },
      { label: "Global Health Irland kontaktieren", href: href("de", "/contact") },
    ],
    ctaBox: {
      h3: "Sprechen Sie heute mit einer registrierten Praxis in Irland",
      text: "Eine Videosprechstunde klärt, ob Sie arbeitsunfähig sind, und stellt, wenn es klinisch angemessen ist, die Bescheinigung aus, die Ihr Antrag verlangt.",
      primary: { label: "Termin buchen", href: href("de", "/services/sick-certificate-ireland") },
      secondary: { label: "Unsere Ärztinnen und Ärzte", href: href("de", "/doctors") },
    },
    sourcesEyebrow: "Offizielle Quellen",
    sourcesH2: "Woher die Regeln tatsächlich stammen",
    sourcesLead: "Beträge, Wartetage, Beitragsbedingungen und Bezugsdauer legt das Department of Social Protection fest und ändert sie. Prüfen Sie den aktuellen Stand immer an der Quelle, nicht in einem Artikel.",
    sources: [
      { label: "gov.ie — Illness Benefit", href: GOV_IB },
      { label: "Citizens Information — Illness Benefit", href: CITIZENS_IB },
      { label: "MyWelfare — Online-Antrag", href: MYWELFARE },
      { label: "Medical Council — Register prüfen", href: MEDICAL_COUNCIL },
      { label: "WRC — gesetzliche Lohnfortzahlung", href: WRC_SICK_LEAVE },
    ],
    sourcesNote: "Die Links führen auf die Seiten der zuständigen Stellen. Global Health steht in keiner Verbindung zum Department of Social Protection und kann keine Sozialleistung entscheiden, beschleunigen oder garantieren.",
    faqEyebrow: "FAQ",
    faqH2: "Häufige Fragen",
    faqs: [
      {
        q: "Wie bekomme ich die ärztliche Bescheinigung für Illness Benefit?",
        a: "Sie brauchen eine Sprechstunde bei einer beim Irish Medical Council registrierten Ärztin oder einem Arzt. Wird Arbeitsunfähigkeit festgestellt, wird ein Certificate of Incapacity for Work ausgestellt und an das Department of Social Protection übermittelt. Nicht jeder Online-Anbieter stellt diese Bescheinigung aus, fragen Sie vor der Buchung nach. Halten Sie die PPS-Nummer bereit, denn Bescheinigung und Antrag müssen übereinstimmen.",
      },
      {
        q: "Ist Illness Benefit dasselbe wie die Lohnfortzahlung?",
        a: "Nein. Statutory Sick Leave zahlt der Arbeitgeber nach dem Sick Leave Act 2022. Illness Benefit zahlt das Department of Social Protection aus der Sozialversicherung. Es sind getrennte Ansprüche mit eigenen Regeln, und der Antrag auf den einen ist kein Antrag auf den anderen.",
      },
      {
        q: "Kann ich Illness Benefit als Selbstständige beantragen?",
        a: "Das hängt von Ihrer PRSI-Klasse ab. Die anspruchsberechtigten Klassen und die Beitragsbedingungen stehen auf der Seite der Behörde zu Illness Benefit und sind nicht für alle Klassen gleich. Gleichen Sie sie mit Ihrem eigenen Beitragsverlauf ab, bevor Sie von einem Anspruch ausgehen.",
      },
      {
        q: "Brauche ich jede Woche eine neue Bescheinigung?",
        a: "Den abgedeckten Zeitraum legt die Praxis nach Ihrem Zustand fest. Dauert die Arbeitsunfähigkeit darüber hinaus an, brauchen Sie eine neue Bescheinigung und erfahren, wann Sie wiederkommen sollen. Ein für alle geltendes festes Intervall gibt es nicht.",
      },
      {
        q: "Darf eine Online-Praxis das Certificate of Incapacity for Work ausstellen?",
        a: "Ja, wenn die Videosprechstunde für Ihr Beschwerdebild eine angemessene Beurteilung ist und die Praxis beim Medical Council registriert ist. Wo eine körperliche Untersuchung, Laborwerte oder eine Beurteilung vor Ort nötig sind, wird überwiesen statt aus der Ferne bescheinigt.",
      },
      {
        q: "Was passiert, wenn die Behörde meinen Antrag ablehnt?",
        a: "Die Ablehnung wird begründet und mit einer Rechtsbehelfsbelehrung versehen. Lesen Sie die Entscheidung und nutzen Sie den angegebenen Weg. Ihre behandelnde Praxis kann ergänzende klinische Angaben liefern, sofern sie relevant sind — entschieden wird jedoch von der Behörde, nicht ärztlich.",
      },
    ],
    disclaimerTitle: "Medizinischer Hinweis",
    disclaimer:
      "Verfasst von Dr Tiago Miguel Figueira (IMC 523449), Ärztlicher Leiter von Global Health, fachlich geprüft von Dr Ahmed Maklad, Allgemeinmediziner. Dieser Artikel enthält allgemeine Informationen zum irischen Sozialversicherungs- und Bescheinigungsverfahren. Er ersetzt keine persönliche ärztliche Beratung und keine Rechts- oder Finanzberatung. Über den Anspruch auf Illness Benefit entscheidet allein das Department of Social Protection; keine Sprechstunde bei uns garantiert eine Bescheinigung oder eine Zahlung. Rufen Sie im medizinischen Notfall sofort 999 oder 112 an.",
  } satisfies Article,
};

export const IE_ILLNESS_BENEFIT: PostSet = {
  key: "ie-illness-benefit",
  countryCode: "ie",
  targetKeyword: "illness benefit ireland",
  searchVolume: 6600,
  keywordDifficulty: 5,
  evidence:
    "SERP page 1 is government/citizens-advice only (mywelfare.ie, citizensinformation.ie, gov.ie, nsso.gov.ie) plus HR blogs — no clinician-authored result. GSC already shows the adjacent cluster: 'medical certificate ireland' 47 impr @ pos 55, 'sick leave certificate ireland' 26 @ 35, 'return to work medical certificate ireland' 26 @ 38.",
  serviceSlug: "sick-certificate-ireland",
  authorDoctorId: "cmp5r0if3002kssjug743x0p6",
  authorDisplayName: "Dr Tiago Miguel Figueira",
  reviewerDoctorId: "cmqas8yh9000b01pgpc0yp1la",
  reviewerDisplayName: "Dr Ahmed Maklad",
  posts: [en, pt, es, cs, roPost, de],
};

export const IE_ILLNESS_BENEFIT_BODIES = () => IE_ILLNESS_BENEFIT.posts.map((post) => renderArticle(post.article));
