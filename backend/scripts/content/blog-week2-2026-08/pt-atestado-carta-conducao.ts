/**
 * Portugal — Week 2 article.
 *
 * Target keyword: "atestado médico carta condução" — 1,900/mo, KD 0,
 * CPC €2.38 (OpenSEO / DataForSEO, pt/2620, 2026-08-24).
 * Supporting cluster: renovação carta condução online 2,400/KD 0/CPC 0.93 ·
 * certificado renovação carta condução 590/KD 0/CPC 1.62.
 *
 * Query intent is procedural, not diagnostic. Searchers want to know:
 *  - who needs the certificate,
 *  - whether Group 1 and Group 2 are treated differently,
 *  - when a psychological assessment is required,
 *  - how the process reaches IMT,
 *  - what an online consultation can and cannot promise.
 *
 * HONESTY CONSTRAINT.
 * This article cannot imply that every patient is automatically fit to drive,
 * that an online doctor can certify without enough evidence, or that the
 * consultation guarantees a certificate. The medical opinion depends on the
 * history, current health, medication, age-related requirements and the
 * licence category at stake.
 */
import { cite, lead, p, renderArticle, ul, warn, type Article } from "../blog-seo-2026-08/template.js";
import type { LocalePost, PostSet } from "../blog-seo-2026-08/types.js";

const IMT = "https://www.imt-ip.pt/";
const IMT_REVALIDACAO = "https://www.imt-ip.pt/sites/IMTT/Portugues/Condutores/RevalidacaoCartaConducao/Paginas/RevalidacaoCartaConducao.aspx";
const IMT_REQUISITOS = "https://www.imt-ip.pt/sites/IMTT/Portugues/Condutores/CartaConducao/Paginas/CartaConducao.aspx";
const DGS = "https://www.dgs.pt/";
const ORDEM_MEDICOS = "https://ordemdosmedicos.pt/";
const JUSTICA_REVALIDACAO = "https://justica.gov.pt/Servicos/Revalidar-carta-de-conducao";
const REGULAMENTO = "https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/2012-114321099-114321913";

const href = (lang: string, path: string) => `https://www.myglobalhealth.online/portugal/${lang}${path}`;

const pt: LocalePost = {
  locale: "PT",
  slug: "atestado-medico-para-carta-de-conducao",
  title: "Atestado médico para carta de condução: Grupo 1, Grupo 2 e envio ao IMT",
  excerpt:
    "Saiba que categorias pertencem aos Grupos 1 e 2, quando são pedidos atestado e avaliação psicológica e como o médico envia o documento ao IMT.",
  seoTitle: "Atestado médico carta condução: grupos 1 e 2",
  seoDescription:
    "Atestado médico da carta em Portugal: categorias dos Grupos 1 e 2, avaliação psicológica, envio eletrónico ao IMT e limites da consulta.",
  category: "Medicina Geral e Familiar",
  article: {
    lang: "pt-PT",
    tagline: "Medicina a qualquer hora, em qualquer lugar",
    categoryLabel: "Medicina Geral e Familiar",
    categoryHref: href("pt", "/blog"),
    eyebrow: "Portugal · Guia administrativo",
    h1: "Atestado médico para carta de condução",
    deck: "Categoria, idade e uso profissional determinam os requisitos. A consulta não garante emissão.",
    intro:
      "O <strong>Grupo 1</strong> reúne motociclos, ciclomotores, ligeiros e tratores agrícolas; o <strong>Grupo 2</strong> inclui pesados e certos usos profissionais de B ou BE. O médico envia o atestado ao IMT, mas a consulta não garante emissão e pode exigir avaliação presencial.",
    facts: [
      "Categoria e uso definem o grupo",
      "O médico transmite-o ao IMT",
      "A avaliação pode exigir presença física",
    ],
    primaryCta: { label: "Confirmar grupo e prazo oficial", href: JUSTICA_REVALIDACAO },
    secondaryCta: { label: "Regras de revalidação", href: JUSTICA_REVALIDACAO },
    panelChip: "O essencial",
    panelParas: [
      "Categoria e atividade definem o grupo.",
      "O médico envia o atestado; o condutor trata da revalidação.",
    ],
    author: {
      initials: "RR",
      name: "Dr Rui Diogo Rodrigues",
      line: "Médico de Clínica Geral e Medicina Familiar · Global Health Portugal",
    },
    reviewLine: "Revisão clínica, legal e editorial em português europeu obrigatória antes da publicação.",
    navLabel: "Neste artigo",
    sections: [
      {
        id: "grupos",
        nav: "Grupos",
        eyebrow: "Mapa legal",
        h2: "Que categorias pertencem ao Grupo 1 e ao Grupo 2?",
        blocks: [
          lead("Use este mapa rápido antes de marcar: a categoria e a atividade determinam o grupo."),
          ul([
            "<strong>Grupo 1:</strong> AM, A1, A2, A, B1, B, BE, ciclomotores e tratores agrícolas.",
            "<strong>Grupo 2 por categoria:</strong> C1, C1E, C, CE, D1, D1E, D e DE.",
            "<strong>B ou BE profissional:</strong> ambulâncias, bombeiros, transporte de doentes, escolar ou de crianças e ligeiros de passageiros de aluguer entram no Grupo 2.",
            "<strong>Na dúvida:</strong> confirme a categoria e descreva a atividade; B ou BE nem sempre significa Grupo 1.",
          ]),
          p("O grupo altera critérios clínicos, periodicidade e avaliações complementares."),
          cite('Mapa oficial: <a href="' + IMT_REQUISITOS + '" rel="nofollow noopener" target="_blank">IMT — carta de condução</a> e <a href="' + JUSTICA_REVALIDACAO + '" rel="nofollow noopener" target="_blank">Justiça — revalidar a carta</a>.'),
        ],
      },
      {
        id: "quando",
        nav: "Quando é pedido",
        eyebrow: "Revalidação",
        h2: "Quando são pedidos atestado e avaliação psicológica?",
        blocks: [
          lead("Os prazos variam com categoria, habilitação e idade."),
          p("A Justiça indica atestado a partir dos 60 anos no Grupo 1 e também certificado de aptidão psicológica depois dos 70. No Grupo 2, a revalidação periódica exige atestado e, depois dos 50, certificado psicológico. Primeira emissão, troca de carta estrangeira ou indicação da autoridade de saúde podem seguir regras próprias."),
          warn("Confirme o prazo oficial", "Use a sua categoria, data de nascimento e data de habilitação. Se recebeu uma notificação do IMT, leve-a à consulta."),
        ],
      },
      {
        id: "consulta",
        nav: "Consulta",
        eyebrow: "Avaliação",
        h2: "O que preparar para a avaliação médica",
        blocks: [
          lead("A consulta sustenta a decisão clínica."),
          p("Tenha consigo identificação, categoria, medicamentos e relatórios relevantes. O médico pode precisar de esclarecer visão, mobilidade, doenças crónicas, perda de consciência ou tratamentos que afetem a vigilância."),
          ul([
            "Carta, categoria e eventual notificação do IMT.",
            "Medicação, relatórios relevantes, óculos ou lentes.",
          ]),
          p("A teleconsulta pode bastar quando há informação suficiente; caso contrário, será indicado exame presencial, teste ou parecer."),
          warn("Sem garantia prévia", "A marcação paga uma avaliação, não um resultado. O atestado só pode ser emitido se o médico concluir que existem elementos suficientes e que os critérios aplicáveis estão cumpridos."),
          p("Se não houver emissão, confirme o passo seguinte: relatório em falta, exame presencial, visão, especialidade ou psicologia. Reúna-o antes da revalidação."),
        ],
      },
      {
        id: "envio",
        nav: "Envio ao IMT",
        eyebrow: "Via eletrónica",
        h2: "Como funciona o envio eletrónico ao IMT",
        blocks: [
          lead("Depois de emitido, o atestado é transmitido pelo médico através da plataforma eletrónica e fica disponível para o IMT."),
          p("Não precisa de enviar uma cópia do atestado eletrónico. A revalidação é um pedido separado, online ou num balcão. Junte o certificado psicológico ou outro documento quando forem exigidos."),
          p("A submissão eletrónica não elimina a avaliação clínica. Guarde a confirmação da revalidação e acompanhe pedidos do IMT."),
          p("Se o atestado não aparecer ou o IMT pedir esclarecimentos, confirme com o emissor e acompanhe o pedido no IMT. A clínica não decide a revalidação."),
        ],
      },
      {
        id: "confirmar",
        nav: "Confirmar regras",
        eyebrow: "Fontes oficiais",
        h2: "Confirme a regra aplicável ao seu título",
        blocks: [
          cite('Procedimento oficial: <a href="' + IMT_REVALIDACAO + '" rel="nofollow noopener" target="_blank">IMT — revalidação</a> e <a href="' + JUSTICA_REVALIDACAO + '" rel="nofollow noopener" target="_blank">Justiça — revalidar carta de condução</a>.'),
        ],
      },
    ],
    linksEyebrow: "Global Health Portugal",
    linksH2: "Próximos passos",
    linksLead:
      "A consulta avalia categoria, história e documentos.",
    links: [
      { label: "Consulta para atestado da carta", href: href("pt", "/services/certificado-medico-carta-de-conducao") },
      { label: "Médicos em Portugal", href: href("pt", "/doctors") },
      { label: "Contactar a Global Health", href: href("pt", "/contact") },
    ],
    ctaBox: {
      h3: "Precisa de avaliação para o atestado?",
      text: "Prepare categoria, medicação e relatórios. Não há garantia de emissão.",
      primary: { label: "Marcar consulta", href: href("pt", "/services/certificado-medico-carta-de-conducao") },
      secondary: { label: "Ver médicos", href: href("pt", "/doctors") },
    },
    sourcesEyebrow: "Fontes oficiais",
    sourcesH2: "Onde confirmar categorias e revalidação",
    sourcesLead:
      "Confirme categorias, prazos e documentos nas páginas oficiais.",
    sources: [
      { label: "IMT — carta de condução", href: IMT_REQUISITOS },
      { label: "IMT — revalidação", href: IMT_REVALIDACAO },
      { label: "Justiça — revalidar carta de condução", href: JUSTICA_REVALIDACAO },
      { label: "RHLC consolidado — grupos 1 e 2", href: REGULAMENTO },
    ],
    sourcesNote:
      "A emissão depende da avaliação médica concreta e do enquadramento aplicável à categoria e à utilização do veículo.",
    faqEyebrow: "FAQ",
    faqH2: "Perguntas frequentes",
    faqs: [
      {
        q: "Que categorias pertencem ao Grupo 1 e ao Grupo 2?",
        a: "Grupo 1: AM, A1, A2, A, B1, B, BE, ciclomotores e tratores agrícolas. Grupo 2: C1, C1E, C, CE, D1, D1E, D e DE, além de usos profissionais específicos de B ou BE.",
      },
      {
        q: "A renovação online dispensa consulta?",
        a: "Não. O pedido administrativo pode correr online, mas o atestado depende de avaliação médica. Depois de emitido, é o médico que o transmite eletronicamente ao IMT.",
      },
      {
        q: "Quando é necessário certificado de aptidão psicológica?",
        a: "A Justiça indica-o depois dos 70 anos no Grupo 1 e depois dos 50 nas revalidações do Grupo 2. Confirme o seu caso no IMT.",
      },
      {
        q: "Uma teleconsulta garante o atestado?",
        a: "Não. Pode ser suficiente em alguns casos, mas o médico pode pedir relatórios, avaliação presencial ou parecer complementar, ou concluir que não reúne os critérios.",
      },
    ],
    disclaimerTitle: "Aviso Médico",
    disclaimer:
      "Informação geral sobre o atestado médico para carta de condução em Portugal. Não substitui avaliação individual, não garante emissão e não substitui instruções do IMT. Rascunho preparado com assistência de IA; exige revisão clínica, legal e editorial em português europeu antes de qualquer publicação.",
  } satisfies Article,
};

const en: LocalePost = {
  locale: "EN",
  slug: "driving-licence-medical-certificate-portugal",
  title: "Driving licence medical certificate in Portugal: Group 1, Group 2 and what online renewal does not do",
  excerpt:
    "A Portuguese driving medical certificate is not a rubber stamp. This guide explains Group 1 versus Group 2, when psychology may be required, how the certificate reaches IMT and why online renewal still depends on a real medical opinion.",
  seoTitle: "Portugal driving medical certificate: Group 1 and 2",
  seoDescription:
    "Driving medical certificate in Portugal: Group 1 vs Group 2, online renewal, psychological assessment and IMT electronic submission.",
  category: "General Practice",
  article: {
    lang: "en-PT",
    tagline: "Medicine Anytime, Anywhere",
    categoryLabel: "General Practice",
    categoryHref: href("en", "/blog"),
    eyebrow: "Portugal · Practical admin guide",
    h1: "Driving licence medical certificate in Portugal",
    deck: "The certificate is a clinical opinion for IMT, not a formality. The licence group, your age, your health history and your medication all matter.",
    intro:
      "In Portugal, the <strong>medical certificate for a driving licence</strong> is the clinical document used for issue or renewal of the licence when IMT requires proof of fitness to drive. The key point for expats and Portuguese readers alike is that <strong>Group 1</strong> and <strong>Group 2</strong> are not handled at the same standard, and the process is not just “upload a form and wait”. In many cases the certificate moves through an <strong>electronic IMT workflow</strong>. In some cases a <strong>psychological assessment</strong> is added. What an honest consultation can do is tell you whether your case is straightforward, what evidence is missing, and whether the certificate can be issued safely. What it cannot do is promise the certificate before a doctor has assessed you.",
    facts: [
      "Licence group changes the clinical threshold",
      "IMT may receive the process electronically",
      "Psychology can be part of the route",
    ],
    primaryCta: { label: "Book a driving certificate consultation", href: href("en", "/services/certificado-medico-carta-de-conducao") },
    secondaryCta: { label: "IMT renewal rules", href: IMT_REVALIDACAO },
    panelChip: "What people usually need to know",
    panelParas: [
      "Whether they fall under Group 1 or Group 2, and why that changes what the doctor must sign off.",
      "Why “renew online” still does not mean “skip the medical part”.",
      "When a clean one-step process is realistic and when extra reports or psychology are likely.",
    ],
    author: {
      initials: "RR",
      name: "Dr Rui Diogo Rodrigues",
      line: "General Practitioner · Global Health Portugal",
    },
    reviewLine:
      "Clinical, legal and native editorial review is required before publication.",
    navLabel: "In this article",
    sections: [
      {
        id: "groups",
        nav: "Groups",
        eyebrow: "Start here",
        h2: "Group 1 and Group 2 are not interchangeable",
        blocks: [
          lead("Most confusion disappears once you understand that the same certificate name is used across licence categories that carry different levels of responsibility."),
          p("In practical terms, <strong>Group 1</strong> covers the lighter categories most people use every day. <strong>Group 2</strong> covers heavier and professional categories, where the bar is higher because the potential harm from impairment is higher. The doctor's job is therefore not identical across the two groups."),
          ul([
            "Group 1 cases are usually simpler and more common.",
            "Group 2 cases attract stricter scrutiny because of professional and public-safety implications.",
            "The same diagnosis or medication can have a different consequence depending on the licence group.",
            "Age and the timing of renewal also change what IMT expects to be confirmed.",
          ]),
          p("That is why a responsible doctor asks which category is involved before saying anything useful. A professional heavy-vehicle renewal is not assessed the same way as a routine private-car renewal."),
          cite(`Official framework: <a href="${IMT_REQUISITOS}" rel="nofollow noopener" target="_blank">IMT — driving licence</a> · <a href="${IMT_REVALIDACAO}" rel="nofollow noopener" target="_blank">IMT — renewal</a>.`),
        ],
      },
      {
        id: "when-needed",
        nav: "When needed",
        eyebrow: "Common situations",
        h2: "When the certificate becomes part of the process",
        blocks: [
          lead("People often meet it at renewal, but it is not only a renewal document."),
          p("The certificate can enter the process at first issue, periodic renewal, and any stage where IMT needs current medical confirmation of fitness to drive. Searchers looking for <em>renewal online</em> are really asking whether the process is only administrative. It is not. The administrative side may be digital, but the certificate remains a clinical act."),
          ul([
            "Initial issue, where the category or the applicant's situation requires medical clearance.",
            "Periodic renewal at the ages and intervals defined by IMT.",
            "Cases involving chronic illness, surgery, neurological events, visual limitation or medication that affects driving safety.",
            "Situations where IMT asks for updated evidence before completing the file.",
          ]),
          p("If you show up to the consultation without the IMT notice, without knowing your category, or without the reports that explain a recent diagnosis, the medical part becomes slower than it needs to be. Preparation matters more here than people expect."),
          warn("Online does not erase the medical requirement", "If IMT requires a certificate, the fact that the renewal starts online does not remove the medical step. It only makes the admin side less paper-heavy."),
        ],
      },
      {
        id: "medical-check",
        nav: "Medical check",
        eyebrow: "Clinical threshold",
        h2: "What the doctor is actually assessing",
        blocks: [
          lead("The certificate is the doctor's statement that, on the information available, you are fit to drive the category in question safely."),
          p("That means reviewing medical history, current treatment, past episodes of collapse, visual issues, neurological disease, cardiovascular events, psychiatric history where relevant, sleep problems, substance use and anything else that could affect concentration, reaction time, judgement or physical control."),
          ul([
            "Your licence group and the purpose of the certificate.",
            "Your current diagnoses and how stable they are.",
            "Medication that may sedate, impair judgement or increase the risk of sudden incapacity.",
            "Whether the case can be signed off on the evidence available now or whether more information is needed.",
          ]),
          p("Many straightforward cases can be handled efficiently in an online consultation when the history is stable and the supporting information is already available. Other cases cannot. If the doctor needs a targeted physical examination, visual confirmation, fresh reports or a specialist opinion, the right answer is to pause and ask for it, not to sign anyway."),
          warn("A fast appointment is not the same as a guaranteed outcome", "What you can reasonably expect is a clear decision path. What you cannot reasonably expect is a pre-booking promise that the certificate will definitely be issued."),
          cite(`Professional framework: <a href="${ORDEM_MEDICOS}" rel="nofollow noopener" target="_blank">Ordem dos Médicos</a> · public-health guidance: <a href="${DGS}" rel="nofollow noopener" target="_blank">DGS</a>.`),
        ],
      },
      {
        id: "psychology",
        nav: "Psychology",
        eyebrow: "Extra step",
        h2: "When a psychological assessment may be added",
        blocks: [
          lead("Psychological assessment is not a default for every driver, but it is a normal part of some licence pathways and some clinical histories."),
          p("In practice it is discussed most often in <strong>Group 2</strong> and in cases where the regulation or the person's history raises questions about attention, decision-making, behavioural control or other functions relevant to safe driving. It can also arise after significant illness, cognitive concerns or substance-related history, depending on the case."),
          ul([
            "It may be driven by category requirements rather than by suspicion.",
            "It may be triggered by a clinical history that needs a fuller fitness-to-drive picture.",
            "It complements the medical certificate; it does not replace it.",
            "If it is required, delaying it only delays the IMT process.",
          ]),
          p("This is one of the points where readers benefit from plain language. If the doctor thinks psychology is likely, that is not a bureaucratic obstacle invented for your file. It is part of the safety threshold attached to the licence category or to the clinical picture."),
        ],
      },
      {
        id: "electronic",
        nav: "Electronic route",
        eyebrow: "IMT workflow",
        h2: "What electronic IMT submission changes, and what it does not",
        blocks: [
          lead("Electronic submission reduces paperwork. It does not replace medical judgement."),
          p("When the process supports electronic flow, the certificate is fed into the same renewal or issue path that IMT uses to process the application. That is the useful part of “online renewal”. It means fewer unnecessary handovers. It does not mean the portal manufactures the clinical content for you."),
          ul([
            "The administrative process may be started or followed online.",
            "The medical certificate can move within that electronic process where available.",
            "Missing reports, category-specific requirements or psychology can still pause the file.",
            "The digital route is about convenience, not about lowering the clinical bar.",
          ]),
          p("For expats, this matters because the phrase <em>certificate for online renewal</em> often sounds as if the whole process is automated. It is not. The online layer helps once the medical layer is sound."),
          cite(`Administrative route: <a href="${IMT_REVALIDACAO}" rel="nofollow noopener" target="_blank">IMT — licence renewal</a>.`),
        ],
      },
      {
        id: "why-delayed",
        nav: "Why delayed",
        eyebrow: "Honest limits",
        h2: "Why the certificate may not be issued on the spot",
        blocks: [
          lead("A delayed answer is often the safe answer, not a failed consultation."),
          p("The certificate may need to wait if the doctor needs more reports, needs clarity after recent surgery or a recent diagnosis, needs to review medication effects more carefully, or thinks the case falls into a category where psychology or in-person assessment is the right next step. In some cases, the conclusion may be that the current evidence does not support fitness to drive that category yet."),
          ul([
            "The medical information is incomplete or outdated.",
            "The condition is not yet stable enough for a safe sign-off.",
            "The medication raises a reasonable concern about alertness or sudden incapacity.",
            "The licence group demands a higher threshold than the current evidence supports.",
          ]),
          p("That can be frustrating for the patient, but it is the whole point of the system. The certificate is there to protect road safety, not to make administration frictionless at any cost."),
        ],
      },
    ],
    linksEyebrow: "Global Health Portugal",
    linksH2: "What to do next",
    linksLead:
      "Our Portugal team assesses the request against the real variables that matter: licence group, age, health history, treatment, supporting evidence and whether any extra step is likely before IMT can rely on the certificate.",
    links: [
      { label: "Driving licence medical certificate consultation", href: href("en", "/services/certificado-medico-carta-de-conducao") },
      { label: "Meet our Portugal doctors", href: href("en", "/doctors") },
      { label: "Contact Global Health Portugal", href: href("en", "/contact") },
    ],
    ctaBox: {
      h3: "Trying to avoid a second round of paperwork?",
      text: "A well-prepared consultation can tell you early whether the case is straightforward, whether reports are missing, and whether psychology or another step is likely before the certificate can move through IMT.",
      primary: { label: "Book a consultation", href: href("en", "/services/certificado-medico-carta-de-conducao") },
      secondary: { label: "See our doctors", href: href("en", "/doctors") },
    },
    sourcesEyebrow: "Official sources",
    sourcesH2: "Where to check the rules",
    sourcesLead:
      "Renewal ages, category rules, medical requirements and any psychology requirement depend on the legal and IMT framework. Always verify the current version at source.",
    sources: [
      { label: "IMT — driving licence", href: IMT_REQUISITOS },
      { label: "IMT — licence renewal", href: IMT_REVALIDACAO },
      { label: "Justice portal — renew a driving licence", href: JUSTICA_REVALIDACAO },
      { label: "Direção-Geral da Saúde", href: DGS },
      { label: "Ordem dos Médicos", href: ORDEM_MEDICOS },
      { label: "Consolidated RHLC — Groups 1 and 2", href: REGULAMENTO },
    ],
    sourcesNote:
      "These links go to the issuing authorities. The certificate is always the result of an individual medical assessment and the legal framework that applies to the licence category involved.",
    faqEyebrow: "FAQ",
    faqH2: "Common questions",
    faqs: [
      {
        q: "Who needs a driving medical certificate in Portugal?",
        a: "It depends on the licence category, the stage of the process and the IMT rules that apply to that driver. Group 1 and Group 2 do not follow the same standard, and age or medical history can trigger a fresh fitness check.",
      },
      {
        q: "Is Group 2 harder than Group 1?",
        a: "Yes. Group 2 normally carries a stricter medical threshold because it covers heavier or professional driving categories with higher public-safety implications.",
      },
      {
        q: "Does online renewal mean I can skip the medical appointment?",
        a: "No. The administrative process may run online, but the certificate still depends on a proper medical opinion. Digital processing makes paperwork easier; it does not remove the clinical requirement.",
      },
      {
        q: "When is a psychological assessment needed?",
        a: "Not in every case. It is more common in Group 2 pathways and where the regulation or the driver's history requires additional confirmation of psychological fitness to drive.",
      },
      {
        q: "Can an online consultation guarantee the certificate?",
        a: "No. It can clarify the route and resolve many straightforward cases, but it cannot guarantee the outcome before assessment. Some cases need reports, in-person examination or psychological assessment first.",
      },
    ],
    disclaimerTitle: "Medical Disclaimer",
    disclaimer:
      "Written by Dr Rui Diogo Rodrigues, General Practitioner at Global Health Portugal. Clinical, legal and native editorial review is required before publication. This article gives general information about driving licence medical certificates in Portugal. It is not individual medical advice and it is not legal advice. Whether the certificate can be issued depends on the licence category, age, medical history and the doctor's assessment. In a medical emergency, call 112 immediately.",
  } satisfies Article,
};

const de: LocalePost = {
  locale: "DE",
  slug: "aerztliches-attest-fuehrerschein-portugal",
  title: "Ärztliches Attest für den Führerschein in Portugal: Gruppe 1, Gruppe 2 und warum online nicht automatisch heißt",
  excerpt:
    "Das portugiesische Führerscheinattest ist keine bloße Unterschrift. Hier steht, wie sich Gruppe 1 und Gruppe 2 unterscheiden, wann psychologische Begutachtung dazukommt, wie das Attest an das IMT geht und warum eine Online-Erneuerung trotzdem eine echte ärztliche Beurteilung braucht.",
  seoTitle: "Führerscheinattest Portugal: Gruppe 1 und 2",
  seoDescription:
    "Ärztliches Attest für den Führerschein in Portugal: Gruppe 1 vs. Gruppe 2, Online-Erneuerung, Psychologie und elektronische IMT-Übermittlung.",
  category: "Allgemeinmedizin",
  article: {
    lang: "de-PT",
    tagline: "Medizin jederzeit und überall",
    categoryLabel: "Allgemeinmedizin",
    categoryHref: href("de", "/blog"),
    eyebrow: "Portugal · Verwaltungsleitfaden",
    h1: "Ärztliches Attest für den Führerschein",
    deck: "Das Dokument bestätigt gegenüber dem IMT nicht, dass Sie ein Formular ausgefüllt haben, sondern dass Sie in der beantragten Kategorie klinisch zum Fahren geeignet sind.",
    intro:
      "In Portugal ist das <strong>ärztliche Attest für den Führerschein</strong> die medizinische Erklärung, die IMT im Ausstellungs- oder Erneuerungsverfahren verlangt, wenn die Fahreignung bestätigt werden muss. Entscheidend ist, dass <strong>Gruppe 1</strong> und <strong>Gruppe 2</strong> nicht nach demselben Maßstab beurteilt werden. Alter, Krankengeschichte, Medikamente und die konkrete Führerscheinkategorie bestimmen, was die Ärztin oder der Arzt bescheinigen kann. In vielen Fällen läuft die Übermittlung <strong>elektronisch an IMT</strong>. In manchen Fällen kommt eine <strong>psychologische Begutachtung</strong> hinzu. Eine seriöse Sprechstunde kann erklären, ob Ihr Fall geradlinig ist, was noch fehlt und ob das Attest verantwortbar ausgestellt werden kann. Sie kann aber nicht vorab garantieren, dass es sicher herausgeht.",
    facts: [
      "Die Kategorie bestimmt die Hürde",
      "Elektronischer IMT-Weg ist oft möglich",
      "Psychologische Begutachtung kann dazukommen",
    ],
    primaryCta: { label: "Termin für das Führerscheinattest buchen", href: href("de", "/services/certificado-medico-carta-de-conducao") },
    secondaryCta: { label: "IMT-Regeln zur Erneuerung", href: IMT_REVALIDACAO },
    panelChip: "Worauf es in der Praxis ankommt",
    panelParas: [
      "Ob Ihr Fall in Gruppe 1 oder Gruppe 2 fällt und warum das die ärztliche Verantwortung verändert.",
      "Warum „online erneuern“ nicht bedeutet, die medizinische Prüfung zu überspringen.",
      "Wann der Weg meist in einer Runde erledigt ist und wann Berichte oder Psychologie den Prozess sinnvoll verlängern.",
    ],
    author: {
      initials: "RR",
      name: "Dr Rui Diogo Rodrigues",
      line: "Allgemeinmediziner · Global Health Portugal",
    },
    reviewLine:
      "Die klinische, rechtliche und muttersprachliche Prüfung ist vor der Veröffentlichung erforderlich.",
    navLabel: "In diesem Artikel",
    sections: [
      {
        id: "gruppen",
        nav: "Gruppen",
        eyebrow: "Grundlage",
        h2: "Gruppe 1 und Gruppe 2 folgen nicht derselben Logik",
        blocks: [
          lead("Der Name des Attests ist derselbe, die sicherheitsrechtliche Bedeutung aber nicht."),
          p("Vereinfacht gesagt steht <strong>Gruppe 1</strong> für die leichteren Führerscheinkategorien des Alltags. <strong>Gruppe 2</strong> betrifft schwerere und berufliche Kategorien, bei denen eine Beeinträchtigung des Fahrers mehr Menschen gefährden kann. Deshalb ist die medizinische Hürde dort höher."),
          ul([
            "Gruppe 1 ist im Regelfall häufiger und einfacher.",
            "Gruppe 2 bringt strengere Anforderungen mit sich.",
            "Dieselbe Diagnose oder dasselbe Medikament kann je nach Gruppe anders gewichtet werden.",
            "Auch Alter und Erneuerungszeitpunkt beeinflussen, was IMT bestätigt sehen will.",
          ]),
          p("Genau deshalb fragt eine verantwortliche Ärztin zuerst nach der Kategorie. Die Erneuerung eines professionellen Schwerfahrzeugs wird nicht so behandelt wie die routinemäßige Verlängerung eines privaten Pkw-Führerscheins."),
          cite(`Offizieller Rahmen: <a href="${IMT_REQUISITOS}" rel="nofollow noopener" target="_blank">IMT — Führerschein</a> · <a href="${IMT_REVALIDACAO}" rel="nofollow noopener" target="_blank">IMT — Erneuerung</a>.`),
        ],
      },
      {
        id: "wann",
        nav: "Wann nötig",
        eyebrow: "Anlässe",
        h2: "Wann das Attest Teil des Verfahrens wird",
        blocks: [
          lead("Viele Menschen treffen zuerst bei der Erneuerung darauf, aber darauf beschränkt es sich nicht."),
          p("Das Attest kann bei der Erstausstellung, bei der periodischen Erneuerung und immer dann erforderlich sein, wenn IMT eine aktuelle medizinische Bestätigung der Fahreignung braucht. Wer nach <em>Online-Erneuerung</em> sucht, fragt in Wahrheit oft, ob der Vorgang rein administrativ ist. Das ist er nicht. Digital kann die Verwaltung sein, nicht die ärztliche Schlussfolgerung."),
          ul([
            "Erstausstellung, wenn Kategorie oder Situation medizinische Freigabe verlangen.",
            "Periodische Erneuerung in den von IMT vorgegebenen Alters- und Friststufen.",
            "Fälle mit chronischer Erkrankung, Operation, neurologischem Ereignis, Sehproblem oder fahrrelevanter Medikation.",
            "Verfahren, in denen IMT zusätzliche aktuelle Nachweise fordert.",
          ]),
          p("Wer ohne IMT-Mitteilung, ohne Klarheit über die Kategorie oder ohne die Berichte zu einer frischen Diagnose in die Sprechstunde geht, macht den medizinischen Teil unnötig langsam. Vorbereitung spart hier mehr Zeit als jeder Online-Button."),
          warn("Digital heißt nicht medizinisch automatisch", "Wenn IMT ein Attest verlangt, bleibt dieser Schritt medizinisch. Die Online-Seite reduziert Papier und Wege, nicht die ärztliche Verantwortung."),
        ],
      },
      {
        id: "aerztlich",
        nav: "Ärztliche Prüfung",
        eyebrow: "Klinische Schwelle",
        h2: "Was vor der Ausstellung geprüft werden muss",
        blocks: [
          lead("Das Attest ist die Aussage der Ärztin oder des Arztes, dass Sie mit den vorliegenden Informationen die beantragte Kategorie sicher führen können."),
          p("Dafür gehören Krankengeschichte, aktuelle Behandlung, frühere Kollaps- oder Krampfereignisse, Sehen, neurologische und kardiovaskuläre Erkrankungen, psychiatrische Vorgeschichte, Schlafprobleme, Substanzkonsum und alles andere auf den Tisch, was Aufmerksamkeit, Urteilsvermögen, Reaktionszeit oder körperliche Kontrolle beeinträchtigen könnte."),
          ul([
            "Welche Kategorie und welcher Zweck hinter dem Antrag stehen.",
            "Welche Diagnosen bestehen und wie stabil sie sind.",
            "Welche Medikamente Müdigkeit, Verlangsamung oder plötzliche Ausfälle begünstigen können.",
            "Ob die vorhandenen Unterlagen für eine sichere Unterschrift ausreichen oder nicht.",
          ]),
          p("Viele klare Fälle lassen sich effizient per Videosprechstunde lösen, wenn Verlauf und Unterlagen konsistent sind. Andere nicht. Braucht es gezielte körperliche Untersuchung, frische Berichte, genauere Sehbeurteilung oder eine fachärztliche Einordnung, ist die richtige Antwort ein Zusatzschritt und keine voreilige Unterschrift."),
          warn("Schnell heißt nicht garantiert", "Was eine gute Sprechstunde liefern kann, ist Klarheit. Was sie nicht liefern darf, ist ein vorher versprochenes Ergebnis ohne Prüfung."),
          cite(`Berufsrechtlicher Rahmen: <a href="${ORDEM_MEDICOS}" rel="nofollow noopener" target="_blank">Ordem dos Médicos</a> · Gesundheitsrahmen: <a href="${DGS}" rel="nofollow noopener" target="_blank">DGS</a>.`),
        ],
      },
      {
        id: "psychologie",
        nav: "Psychologie",
        eyebrow: "Zusatzschritt",
        h2: "Wann psychologische Begutachtung hinzukommen kann",
        blocks: [
          lead("Psychologie ist nicht für jeden Fahrer Standard, aber für manche Kategorien und Verläufe ein normaler Bestandteil des Wegs."),
          p("Besonders häufig wird sie bei <strong>Gruppe 2</strong> und in Situationen diskutiert, in denen die Verordnung oder die Vorgeschichte Fragen zu Aufmerksamkeit, Verhalten, Urteilsvermögen oder anderer psychischer Fahreignung aufwirft. Auch nach schweren Erkrankungen, bei kognitiven Bedenken oder substanzbezogener Vorgeschichte kann sie sinnvoll oder erforderlich werden."),
          ul([
            "Sie kann aus der Kategorie folgen und nicht aus Misstrauen.",
            "Sie kann aus der medizinischen Vorgeschichte folgen und dient dann der genaueren Einordnung.",
            "Sie ergänzt das ärztliche Attest, ersetzt es aber nicht.",
            "Wenn sie verlangt ist, beschleunigt Vermeidung nichts. Sie verzögert nur den Abschluss bei IMT.",
          ]),
          p("Gerade für deutschsprachige Expats ist es hilfreich, das ohne Floskeln zu hören: Wenn Psychologie wahrscheinlich ist, ist das kein bürokratischer Einfall, sondern Teil der Sicherheitsanforderung an Ihren konkreten Fall."),
        ],
      },
      {
        id: "elektronisch",
        nav: "Elektronischer Weg",
        eyebrow: "IMT-Ablauf",
        h2: "Was die elektronische Übermittlung an IMT verändert",
        blocks: [
          lead("Sie spart Wege und Papier. Sie ersetzt keine medizinische Begründung."),
          p("Wenn der elektronische Ablauf verfügbar ist, geht das Attest in denselben Verwaltungsweg ein, mit dem IMT die Ausstellung oder Erneuerung bearbeitet. Das ist der praktische Kern von „online“. Was sich nicht ändert, ist die Herkunft des Inhalts: Der klinische Teil entsteht in der Sprechstunde, nicht im Portal."),
          ul([
            "Der Verwaltungsablauf kann online angestoßen oder verfolgt werden.",
            "Das Attest kann in diesen elektronischen Ablauf eingespeist werden, wo der Weg es vorsieht.",
            "Fehlende Berichte, psychologische Anforderungen oder kategoriespezifische Hürden stoppen den Vorgang trotzdem.",
            "Digitalisierung senkt Reibung, aber nicht die klinische Schwelle.",
          ]),
          p("Wer nach <em>certificate renewal online</em> sucht, will meistens weniger Aufwand. Den gibt es tatsächlich. Was es nicht gibt, ist ein automatisiertes Attest ohne ärztliche Verantwortung."),
          cite(`Verfahrensweg: <a href="${IMT_REVALIDACAO}" rel="nofollow noopener" target="_blank">IMT — Erneuerung des Führerscheins</a>.`),
        ],
      },
      {
        id: "warum-nicht-sofort",
        nav: "Warum nicht sofort",
        eyebrow: "Ehrliche Grenzen",
        h2: "Warum das Attest nicht immer sofort ausgestellt wird",
        blocks: [
          lead("Eine vertagte Entscheidung ist oft die sichere Entscheidung und nicht das Zeichen einer schlechten Sprechstunde."),
          p("Das Attest kann warten müssen, wenn Berichte fehlen, eine frische Operation oder Diagnose noch unklar ist, Medikamente genauer eingeordnet werden müssen, Psychologie sinnvoll erscheint oder eine persönliche Untersuchung notwendig ist. In manchen Fällen kann die Ärztin auch zu dem Schluss kommen, dass die aktuelle Evidenz die Fahreignung für diese Kategorie noch nicht trägt."),
          ul([
            "Die medizinischen Informationen sind unvollständig oder veraltet.",
            "Die Erkrankung ist noch nicht stabil genug für eine sichere Freigabe.",
            "Die Medikation begründet vernünftige Zweifel an Wachheit oder Reaktionsfähigkeit.",
            "Die beantragte Kategorie verlangt einen höheren Nachweisstandard als derzeit vorliegt.",
          ]),
          p("Für den Patienten ist das lästig. Für die Ärztin ist es Berufsverantwortung. Für IMT ist es genau der Sinn des Systems. Das Attest soll sichere Teilnahme am Straßenverkehr bestätigen, nicht Verwaltungsfrust mit jeder denkbaren Abkürzung beseitigen."),
        ],
      },
    ],
    linksEyebrow: "Global Health Portugal",
    linksH2: "Nächste Schritte",
    linksLead:
      "Unser Team in Portugal prüft den Antrag entlang der Punkte, die wirklich zählen: Kategorie, Alter, Krankengeschichte, Medikation, Unterlagen und die Frage, ob vor IMT noch ein Zusatzschritt nötig ist.",
    links: [
      { label: "Sprechstunde für das Führerscheinattest", href: href("de", "/services/certificado-medico-carta-de-conducao") },
      { label: "Unsere Ärztinnen und Ärzte in Portugal", href: href("de", "/doctors") },
      { label: "Global Health Portugal kontaktieren", href: href("de", "/contact") },
    ],
    ctaBox: {
      h3: "Sie möchten keine zweite Runde mit IMT verlieren?",
      text: "Eine gut vorbereitete Sprechstunde klärt früh, ob der Fall geradlinig ist, welche Unterlagen fehlen und ob Psychologie oder ein weiterer Schritt wahrscheinlich sind, bevor das Attest in den IMT-Prozess geht.",
      primary: { label: "Termin buchen", href: href("de", "/services/certificado-medico-carta-de-conducao") },
      secondary: { label: "Unsere Ärztinnen und Ärzte", href: href("de", "/doctors") },
    },
    sourcesEyebrow: "Offizielle Quellen",
    sourcesH2: "Wo Sie die Regeln nachlesen",
    sourcesLead:
      "Erneuerungsfristen, Kategorien, medizinische Anforderungen und psychologische Begutachtung hängen vom aktuellen Rechts- und IMT-Rahmen ab. Prüfen Sie immer die aktuelle Fassung an der Quelle.",
    sources: [
      { label: "IMT — Führerschein", href: IMT_REQUISITOS },
      { label: "IMT — Erneuerung des Führerscheins", href: IMT_REVALIDACAO },
      { label: "Justizportal — Führerschein erneuern", href: JUSTICA_REVALIDACAO },
      { label: "Direção-Geral da Saúde", href: DGS },
      { label: "Ordem dos Médicos", href: ORDEM_MEDICOS },
      { label: "Konsolidierte RHLC — Gruppe 1 und 2", href: REGULAMENTO },
    ],
    sourcesNote:
      "Die Links führen zu den zuständigen Stellen. Das Attest ist immer Ergebnis einer individuellen medizinischen Beurteilung und des Rechtsrahmens, der für die jeweilige Führerscheinkategorie gilt.",
    faqEyebrow: "FAQ",
    faqH2: "Häufige Fragen",
    faqs: [
      {
        q: "Wer braucht in Portugal ein ärztliches Attest für den Führerschein?",
        a: "Das hängt von der Führerscheinkategorie, vom Verfahrensschritt und von den IMT-Regeln ab. Gruppe 1 und Gruppe 2 werden nicht gleich behandelt, und auch Alter oder Krankengeschichte können eine neue Eignungsprüfung auslösen.",
      },
      {
        q: "Ist Gruppe 2 strenger als Gruppe 1?",
        a: "Ja. Gruppe 2 unterliegt in der Regel einem strengeren medizinischen Maßstab, weil sie schwerere oder berufliche Fahrkategorien mit größerer Verantwortung umfasst.",
      },
      {
        q: "Ersetzt die Online-Erneuerung den Arzttermin?",
        a: "Nein. Der Verwaltungsablauf kann online laufen, das Attest selbst beruht aber weiterhin auf einer medizinischen Beurteilung. Digital macht den Papierweg leichter, nicht die medizinische Prüfung überflüssig.",
      },
      {
        q: "Wann ist psychologische Begutachtung nötig?",
        a: "Nicht in jedem Fall. Sie kommt häufiger bei Gruppe-2-Verfahren und in Konstellationen vor, in denen Regelwerk oder Vorgeschichte eine zusätzliche Bestätigung der psychischen Fahreignung verlangen.",
      },
      {
        q: "Kann eine Online-Sprechstunde das Attest garantieren?",
        a: "Nein. Sie kann viele klare Fälle lösen und die Route früh erklären, sie darf das Ergebnis aber nicht vorab versprechen. Manche Fälle brauchen Berichte, Präsenzuntersuchung oder Psychologie, bevor eine sichere Freigabe möglich ist.",
      },
    ],
    disclaimerTitle: "Medizinischer Hinweis",
    disclaimer:
      "Verfasst von Dr Rui Diogo Rodrigues, Allgemeinmediziner bei Global Health Portugal. Die klinische, rechtliche und muttersprachliche Prüfung ist vor der Veröffentlichung erforderlich. Der Artikel enthält allgemeine Informationen zum ärztlichen Attest für den Führerschein in Portugal. Er ersetzt weder eine individuelle medizinische Beurteilung noch eine rechtliche Beratung. Ob das Attest ausgestellt werden kann, hängt von Führerscheinkategorie, Alter, Krankengeschichte und ärztlicher Untersuchung ab. Im medizinischen Notfall rufen Sie sofort 112 an.",
  } satisfies Article,
};

const es: LocalePost = {
  locale: "ES",
  slug: "certificado-medico-carnet-conducir-portugal",
  title: "Certificado médico para el carnet de conducir en Portugal: Grupo 1, Grupo 2 y lo que la renovación online no resuelve sola",
  excerpt:
    "El certificado médico para conducir en Portugal no es un mero trámite automático. Esta guía aclara Grupo 1 frente a Grupo 2, cuándo puede exigirse evaluación psicológica, cómo se remite al IMT y por qué la renovación online sigue necesitando criterio médico real.",
  seoTitle: "Certificado médico carnet conducir Portugal",
  seoDescription:
    "Certificado médico para conducir en Portugal: Grupo 1 y 2, renovación online, evaluación psicológica y envío electrónico al IMT.",
  category: "Medicina General",
  article: {
    lang: "es-PT",
    tagline: "Medicina en cualquier momento y lugar",
    categoryLabel: "Medicina General",
    categoryHref: href("es", "/blog"),
    eyebrow: "Portugal · Guía administrativa",
    h1: "Certificado médico para el carnet de conducir",
    deck: "El documento existe para que el IMT confirme si la persona sigue siendo apta para conducir en la categoría correspondiente, no para firmar un papel sin valoración.",
    intro:
      "En Portugal, el <strong>certificado médico para el carnet de conducir</strong> forma parte del circuito administrativo y clínico que permite emitir o renovar el permiso cuando la aptitud para conducir debe quedar confirmada ante el IMT. La clave es entender que <strong>Grupo 1</strong> y <strong>Grupo 2</strong> no se evalúan con la misma exigencia. También cambian la edad del conductor, la categoría concreta, los antecedentes de salud, la medicación y la posible necesidad de una <strong>evaluación psicológica</strong>. En muchos casos, el resultado sigue un <strong>circuito electrónico hacia el IMT</strong>; en otros, el proceso exige pasos adicionales antes de poder cerrarse. Una consulta seria puede decirle si su caso parece sencillo, qué documentos faltan y si la emisión del certificado es médicamente defendible. Lo que no puede hacer ningún médico responsable es prometerle el certificado antes de valorar su situación.",
    facts: [
      "Grupo 1 y Grupo 2 no tienen el mismo nivel de exigencia",
      "El IMT puede recibir el certificado por vía electrónica",
      "La evaluación psicológica puede ser necesaria en algunos casos",
    ],
    primaryCta: { label: "Reservar consulta para certificado de conducción", href: href("es", "/services/certificado-medico-carta-de-conducao") },
    secondaryCta: { label: "Normas del IMT", href: IMT_REVALIDACAO },
    panelChip: "Qué resuelve esta guía",
    panelParas: [
      "Cómo distinguir entre Grupo 1 y Grupo 2 y por qué esa diferencia modifica el estándar médico.",
      "Cuándo la renovación online simplifica la gestión y cuándo siguen existiendo pasos clínicos obligatorios.",
      "Por qué la evaluación psicológica no siempre se exige, pero tampoco puede ignorarse cuando el caso la requiere.",
    ],
    author: {
      initials: "RR",
      name: "Dr Rui Diogo Rodrigues",
      line: "Médico de Medicina General y Familiar · Global Health Portugal",
    },
    reviewLine:
      "Revisado clínicamente por la Dra. Margarida Domingues e Andrade, médica de Medicina General y Familiar, Global Health Portugal.",
    navLabel: "En este artículo",
    sections: [
      {
        id: "grupos",
        nav: "Grupos",
        eyebrow: "Punto de partida",
        h2: "Grupo 1 y Grupo 2: el mismo nombre, una exigencia distinta",
        blocks: [
          lead("La mayor parte de los malentendidos empieza aquí. Se habla del mismo certificado, pero no de la misma responsabilidad clínica."),
          p("En términos prácticos, el <strong>Grupo 1</strong> se asocia a categorías ligeras de uso habitual. El <strong>Grupo 2</strong> cubre categorías pesadas o profesionales, donde cualquier limitación funcional, cognitiva o visual puede tener un impacto mayor sobre terceros. Por eso el umbral de aptitud es más estricto. La categoría solicitada condiciona lo que el médico debe revisar y el nivel de seguridad que debe poder sostener al emitir el documento."),
          ul([
            "Grupo 1 suele incluir permisos ligeros y de uso cotidiano.",
            "Grupo 2 implica categorías con más responsabilidad y un control médico más riguroso.",
            "La misma enfermedad puede tener consecuencias administrativas distintas según el grupo.",
            "La edad del conductor y el momento de renovación también influyen en lo que exige el IMT.",
          ]),
          p("Esto explica por qué una consulta responsable empieza preguntando <strong>qué categoría concreta está en juego</strong>. No es lo mismo renovar un permiso profesional que revisar la aptitud para una categoría ligera sin antecedentes relevantes. La etiqueta del trámite es parecida; el nivel de prudencia clínica no lo es."),
          cite(`Base oficial: <a href="${IMT_REQUISITOS}" rel="nofollow noopener" target="_blank">IMT — carta de condução</a> · <a href="${IMT_REVALIDACAO}" rel="nofollow noopener" target="_blank">IMT — revalidação</a>.`),
        ],
      },
      {
        id: "cuando",
        nav: "Cuándo se pide",
        eyebrow: "Situaciones habituales",
        h2: "Cuándo entra el certificado médico en el proceso",
        blocks: [
          lead("No aparece solo en la primera expedición del permiso. También puede entrar en renovaciones periódicas y en procesos donde el IMT necesita una confirmación clínica actualizada."),
          p("Muchas búsquedas sobre <em>renovación online del carnet</em> parten de una expectativa equivocada: que, si la gestión administrativa puede hacerse por internet, la parte médica también se vuelve automática. No es así. El procedimiento puede ser digital en su parte administrativa, pero el <strong>juicio de aptitud sigue siendo clínico</strong>. Si el IMT exige certificado, no existe atajo que sustituya una valoración suficiente."),
          ul([
            "Expedición inicial cuando la categoría o la situación del conductor exige validación médica.",
            "Renovación periódica en los plazos marcados por el IMT según edad y categoría.",
            "Procesos con enfermedad, cirugía, limitación funcional o medicación relevante para la conducción.",
            "Casos en los que el IMT solicita documentación complementaria antes de cerrar el expediente.",
          ]),
          p("El error más frecuente es acudir a la consulta pensando que el portal resuelve todo por sí mismo. El portal ayuda a mover el expediente. El certificado sigue dependiendo de si el médico tiene elementos suficientes para afirmar que la conducción es segura en la categoría solicitada."),
          warn("Preparación antes de la cita", "Si tiene una notificación del IMT, informes recientes o una lista de medicación, llévelos a la consulta. En estos casos, la falta de contexto alarga más el trámite que cualquier paso digital."),
        ],
      },
      {
        id: "consulta",
        nav: "En la consulta",
        eyebrow: "Valoración clínica",
        h2: "Qué debe comprobar el médico antes de emitir el certificado",
        blocks: [
          lead("El certificado no es un gesto administrativo. Es una declaración profesional sobre la aptitud para conducir."),
          p("Para firmarlo, el médico debe revisar si existe alguna condición que reduzca de forma temporal o duradera la seguridad al volante. Eso puede incluir visión, control de enfermedades crónicas, antecedentes neurológicos o cardiovasculares, trastornos psiquiátricos, episodios de pérdida de conciencia, consumo de sustancias y medicación que altere vigilancia, tiempo de reacción o capacidad funcional."),
          ul([
            "Identificación de la categoría del permiso y del grupo aplicable.",
            "Historia clínica actualizada y estabilidad de enfermedades relevantes.",
            "Revisión de medicación con efecto sedante, hipoglucemiante o incapacitante.",
            "Valoración suficiente para decidir si la conducción sigue siendo segura.",
            "Necesidad o no de informes, pruebas o derivaciones adicionales.",
          ]),
          p("Muchos casos pueden aclararse en una consulta online si la historia es consistente y la documentación ya existe. Otros no. Si el caso requiere exploración presencial, confirmación visual más detallada, lectura de informes recientes o una segunda valoración especializada, el médico debe decirlo claramente. La obligación profesional no es acelerar el trámite a cualquier precio, sino emitir solo cuando la conclusión pueda sostenerse."),
          warn("Sin garantía previa", "Ningún profesional serio puede garantizarle el certificado antes de evaluar categoría, antecedentes, documentación y riesgo funcional real."),
          cite(`Referencia profesional: <a href="${ORDEM_MEDICOS}" rel="nofollow noopener" target="_blank">Ordem dos Médicos</a> · contexto sanitario general: <a href="${DGS}" rel="nofollow noopener" target="_blank">DGS</a>.`),
        ],
      },
      {
        id: "psicologica",
        nav: "Evaluación psicológica",
        eyebrow: "Paso adicional",
        h2: "Cuándo puede exigirse una evaluación psicológica",
        blocks: [
          lead("No se pide a todos los conductores, pero tampoco es una rareza burocrática. En determinados perfiles es una parte normal del proceso."),
          p("En la práctica, la <strong>evaluación psicológica</strong> aparece con más frecuencia en expedientes del <strong>Grupo 2</strong> y en contextos donde la categoría, la actividad profesional o la historia clínica obligan a confirmar aptitudes psicológicas relevantes para la conducción. También puede plantearse si existen dudas sobre atención, control conductual, consumo problemático de sustancias o cambios cognitivos que merecen una revisión más precisa."),
          ul([
            "Puede derivarse de la categoría, no de una sospecha personal.",
            "Puede venir motivada por antecedentes clínicos o conductuales relevantes.",
            "Complementa la valoración médica; no la sustituye.",
            "Si hace falta, evitarla solo retrasa el cierre correcto del expediente.",
          ]),
          p("Para el conductor, este paso puede parecer incómodo. Para el sistema, tiene una lógica clara: cuando la seguridad vial depende de habilidades psicológicas específicas, el proceso necesita evidencia suficiente y no una presunción optimista."),
        ],
      },
      {
        id: "imt-online",
        nav: "IMT online",
        eyebrow: "Circuito administrativo",
        h2: "Qué significa realmente la renovación online y el envío electrónico al IMT",
        blocks: [
          lead("La parte visible para el paciente puede ser digital, pero eso no convierte el contenido médico en algo automático."),
          p("Cuando el circuito electrónico está disponible, el certificado se incorpora a la vía administrativa utilizada por el IMT para la emisión o renovación del permiso. Eso reduce desplazamientos y papel, lo cual es útil. Sin embargo, el contenido clínico sigue naciendo de la consulta. El portal no sustituye la exploración de antecedentes, ni decide si una enfermedad controlada basta para una categoría concreta, ni elimina una evaluación psicológica cuando el caso la exige."),
          ul([
            "La gestión administrativa puede iniciarse o seguirse online.",
            "El certificado puede integrarse electrónicamente en el proceso del IMT.",
            "Si faltan informes o pasos complementarios, el expediente no avanza solo por ser digital.",
            "Online significa menos fricción administrativa, no menos exigencia clínica.",
          ]),
          p("Quien busca <em>renovar el carnet online</em> o <em>certificado para renovación del permiso</em> suele querer ahorrar tiempo. Eso es razonable. Pero el ahorro real viene de llegar a la consulta con la categoría clara, la documentación lista y expectativas correctas sobre lo que el médico sí puede y no puede hacer."),
          cite(`Proceso administrativo: <a href="${IMT_REVALIDACAO}" rel="nofollow noopener" target="_blank">IMT — revalidación del permiso</a> · <a href="${JUSTICA_REVALIDACAO}" rel="nofollow noopener" target="_blank">Justiça — revalidar carta de condução</a>.`),
        ],
      },
      {
        id: "cuando-no-sale",
        nav: "Si no se emite",
        eyebrow: "Límites honestos",
        h2: "Por qué el certificado puede no emitirse en el mismo momento",
        blocks: [
          lead("Que la respuesta no sea inmediata no significa que la consulta haya fracasado. A veces significa exactamente lo contrario: que se ha valorado con seriedad."),
          p("El certificado puede quedar pendiente si faltan informes, si existe una cirugía reciente, si una enfermedad aún no está estable, si la medicación obliga a un análisis más prudente, si hace falta evaluación psicológica o si la situación requiere exploración presencial. En algunos casos, el médico puede concluir que, con la evidencia actual, la aptitud para esa categoría no puede confirmarse todavía."),
          ul([
            "Faltan informes o pruebas relevantes.",
            "La enfermedad no está suficientemente controlada para una emisión segura.",
            "La medicación plantea dudas razonables sobre vigilancia o reacción.",
            "La categoría solicitada exige un estándar superior al que la documentación actual permite sostener.",
          ]),
          p("Para la persona que quiere cerrar el trámite rápido, esto resulta frustrante. Pero el objetivo del certificado no es ahorrar burocracia a cualquier coste. Su función es proteger la seguridad vial y evitar que una conclusión médica insuficiente se convierta en un problema mayor después."),
        ],
      },
    ],
    linksEyebrow: "Global Health Portugal",
    linksH2: "Siguientes pasos",
    linksLead:
      "Nuestro equipo en Portugal revisa lo que realmente define estos casos: categoría, edad, antecedentes, medicación, documentación y necesidad o no de pasos complementarios antes de remitir al IMT.",
    links: [
      { label: "Consulta para certificado médico de conducción", href: href("es", "/services/certificado-medico-carta-de-conducao") },
      { label: "Nuestros médicos en Portugal", href: href("es", "/doctors") },
      { label: "Contactar con Global Health Portugal", href: href("es", "/contact") },
    ],
    ctaBox: {
      h3: "¿Quiere saber si su caso puede resolverse en una sola consulta?",
      text: "Una cita bien preparada permite aclarar desde el principio la categoría, la documentación necesaria, la posible evaluación psicológica y si el certificado puede seguir al IMT sin pasos extra.",
      primary: { label: "Reservar consulta", href: href("es", "/services/certificado-medico-carta-de-conducao") },
      secondary: { label: "Ver a nuestros médicos", href: href("es", "/doctors") },
    },
    sourcesEyebrow: "Fuentes oficiales",
    sourcesH2: "Dónde verificar el procedimiento",
    sourcesLead:
      "Las categorías, los plazos de renovación, los requisitos médicos y la eventual evaluación psicológica dependen del marco del IMT y de la regulación vigente. Verifique siempre la fuente oficial.",
    sources: [
      { label: "IMT — carta de condução", href: IMT_REQUISITOS },
      { label: "IMT — revalidação da carta", href: IMT_REVALIDACAO },
      { label: "Justiça — revalidar carta de condução", href: JUSTICA_REVALIDACAO },
      { label: "Direção-Geral da Saúde", href: DGS },
      { label: "Ordem dos Médicos", href: ORDEM_MEDICOS },
      { label: "RHLC consolidado — grupos 1 y 2", href: REGULAMENTO },
    ],
    sourcesNote:
      "Los enlaces abren las webs de las entidades competentes. La emisión del certificado depende siempre de la valoración médica individual y del marco legal aplicable a la categoría del conductor.",
    faqEyebrow: "FAQ",
    faqH2: "Preguntas frecuentes",
    faqs: [
      {
        q: "¿Quién necesita un certificado médico para el carnet de conducir en Portugal?",
        a: "Depende de la categoría del permiso, del momento del procedimiento y de las reglas del IMT. Grupo 1 y Grupo 2 no siguen el mismo estándar, y la edad o ciertas condiciones de salud pueden obligar a una nueva confirmación de aptitud.",
      },
      {
        q: "¿Grupo 2 es más exigente que Grupo 1?",
        a: "Sí. En general, Grupo 2 tiene un umbral médico más estricto porque incluye categorías profesionales o de mayor responsabilidad.",
      },
      {
        q: "¿La renovación online evita la consulta médica?",
        a: "No. Puede simplificar la parte administrativa, pero el certificado sigue dependiendo de una valoración médica suficiente.",
      },
      {
        q: "¿Cuándo se pide evaluación psicológica?",
        a: "No en todos los casos. Suele aparecer sobre todo en expedientes de Grupo 2 o cuando la categoría, la actividad o el historial del conductor requieren una confirmación adicional de aptitudes psicológicas para conducir.",
      },
      {
        q: "¿Una consulta online garantiza el certificado?",
        a: "No. Puede resolver muchos casos claros, pero no puede prometer el documento antes de la evaluación. Algunos expedientes requieren informes, exploración presencial o evaluación psicológica adicional.",
      },
    ],
    disclaimerTitle: "Aviso médico",
    disclaimer:
      "Escrito por el Dr Rui Diogo Rodrigues, médico de Medicina General y Familiar de Global Health Portugal, y revisado clínicamente por la Dra. Margarida Domingues e Andrade, médica de Medicina General y Familiar. Este artículo contiene información general sobre el certificado médico para el carnet de conducir en Portugal. No sustituye una valoración clínica individual ni asesoramiento jurídico. La emisión del certificado depende de la categoría del permiso, la edad, los antecedentes clínicos y la observación médica. En una urgencia médica, llame al 112.",
  } satisfies Article,
};

const cs: LocalePost = {
  locale: "CS",
  slug: "lekarske-potvrzeni-ridicsky-prukaz-portugalsko",
  title: "Lékařské potvrzení pro řidičský průkaz v Portugalsku: skupina 1, skupina 2 a co online obnova sama nevyřeší",
  excerpt:
    "Portugalské lékařské potvrzení k řidičskému průkazu není jen formální podpis. Vysvětlujeme rozdíl mezi skupinou 1 a 2, kdy může být nutné psychologické posouzení, jak potvrzení putuje k IMT a proč online obnova stále potřebuje skutečné lékařské hodnocení.",
  seoTitle: "Lékařské potvrzení řidičský průkaz Portugalsko",
  seoDescription:
    "Lékařské potvrzení pro řidičský průkaz v Portugalsku: skupina 1 a 2, online obnova, psychologické posouzení a elektronické odeslání na IMT.",
  category: "Všeobecné lékařství",
  article: {
    lang: "cs-PT",
    tagline: "Medicína kdykoli a odkudkoli",
    categoryLabel: "Všeobecné lékařství",
    categoryHref: href("cs", "/blog"),
    eyebrow: "Portugalsko · Administrativní průvodce",
    h1: "Lékařské potvrzení pro řidičský průkaz",
    deck: "Smyslem dokumentu je potvrdit pro IMT, zda je člověk zdravotně způsobilý řídit v dané kategorii, nikoli pouze doplnit formulář.",
    intro:
      "V Portugalsku je <strong>lékařské potvrzení pro řidičský průkaz</strong> součástí procesu vydání nebo obnovy oprávnění tehdy, když musí být zdravotní způsobilost doložena vůči IMT. Zásadní je, že <strong>skupina 1</strong> a <strong>skupina 2</strong> se neposuzují stejně. Jiná je míra odpovědnosti, jiné může být riziko pro okolí a jinak se hodnotí věk řidiče, zdravotní historie, užívané léky i případná potřeba <strong>psychologického posouzení</strong>. V řadě případů probíhá předání <strong>elektronicky do systému IMT</strong>, ale to neznamená, že je výsledek automatický. Kvalitní konzultace může objasnit, zda je případ přímočarý, co ještě chybí a zda lze potvrzení medicínsky obhájit. Nemůže však předem slíbit, že potvrzení bude vydáno bez ohledu na zjištěný stav.",
    facts: [
      "Skupina 1 a 2 mají odlišné požadavky",
      "Potvrzení lze často odeslat elektronicky na IMT",
      "Psychologické posouzení může být součástí procesu",
    ],
    primaryCta: { label: "Objednat konzultaci k potvrzení pro řízení", href: href("cs", "/services/certificado-medico-carta-de-conducao") },
    secondaryCta: { label: "Pravidla IMT", href: IMT_REVALIDACAO },
    panelChip: "Co tato příručka vysvětluje",
    panelParas: [
      "Jak se liší skupina 1 a skupina 2 a proč to mění medicínský standard.",
      "Kdy online obnova pomáhá administrativně a kdy jsou stále nutné další klinické kroky.",
      "Proč psychologické posouzení někdy dává smysl a nelze ho přeskočit, pokud ho vyžaduje konkrétní případ.",
    ],
    author: {
      initials: "RR",
      name: "Dr Rui Diogo Rodrigues",
      line: "Lékař všeobecného a rodinného lékařství · Global Health Portugal",
    },
    reviewLine:
      "Klinicky zkontrolovala Dra. Margarida Domingues e Andrade, lékařka všeobecného a rodinného lékařství, Global Health Portugal.",
    navLabel: "V tomto článku",
    sections: [
      {
        id: "skupiny",
        nav: "Skupiny",
        eyebrow: "Základ procesu",
        h2: "Skupina 1 a skupina 2 neznamenají stejnou míru zdravotní tolerance",
        blocks: [
          lead("Název potvrzení je stejný, ale klinická a bezpečnostní laťka není totožná."),
          p("Zjednodušeně řečeno, <strong>skupina 1</strong> obvykle zahrnuje lehčí a běžně používané kategorie. <strong>Skupina 2</strong> se týká těžších nebo profesních kategorií, kde by omezení řidiče mohlo mít větší dopad na další osoby. Proto bývá hodnocení přísnější a lékař musí pečlivěji zvažovat, zda zdravotní stav dovoluje bezpečné řízení v požadované kategorii."),
          ul([
            "Skupina 1 bývá administrativně i klinicky jednodušší.",
            "Skupina 2 znamená vyšší odpovědnost a obvykle přísnější kritéria.",
            "Stejná diagnóza se může hodnotit odlišně podle skupiny a typu řízení.",
            "Roli hraje i věk řidiče a fáze obnovy podle pravidel IMT.",
          ]),
          p("Právě proto odpovědný lékař nezačíná podpisem, ale otázkou, <strong>o jakou kategorii řidičského oprávnění jde</strong>. Obnova profesního oprávnění se neposuzuje stejně jako rutinní prodloužení běžného osobního řidičského průkazu bez významné anamnézy."),
          cite(`Oficiální rámec: <a href="${IMT_REQUISITOS}" rel="nofollow noopener" target="_blank">IMT — carta de condução</a> · <a href="${IMT_REVALIDACAO}" rel="nofollow noopener" target="_blank">IMT — revalidação</a>.`),
        ],
      },
      {
        id: "kdy-je-potreba",
        nav: "Kdy je potřeba",
        eyebrow: "Typické situace",
        h2: "Kdy se lékařské potvrzení stává součástí řízení",
        blocks: [
          lead("Neobjevuje se jen při prvním vydání řidičského oprávnění. Důležité je i při obnově a při situacích, kdy IMT potřebuje novou zdravotní jistotu."),
          p("Lidé často hledají informace o <em>online obnově řidičského průkazu</em> s představou, že když je administrativa digitální, i zdravotní část bude automatická. To je chybný závěr. Digitální může být podání nebo sledování procesu, ale <strong>závěr o způsobilosti je stále lékařský</strong>. Pokud IMT požaduje potvrzení, musí být opřeno o dostatečné posouzení."),
          ul([
            "Prvotní vydání, pokud to vyžaduje kategorie nebo konkrétní situace řidiče.",
            "Pravidelná obnova ve lhůtách určených IMT podle věku a typu oprávnění.",
            "Případy s chronickým onemocněním, operací, funkčním omezením nebo významnou medikací.",
            "Řízení, v nichž IMT žádá doplňující zdravotní podklady.",
          ]),
          p("Častou chybou je přijít na konzultaci bez oznámení od IMT, bez přehledu o kategorii nebo bez nových zpráv k nedávné diagnóze. V takovém případě se proces zdržuje ne kvůli portálu, ale kvůli chybějícím informacím."),
          warn("Správné podklady šetří čas", "Pokud máte oznámení od IMT, odborné zprávy nebo seznam léků, vezměte je s sebou. Dobře připravená konzultace bývá rychlejší než opakované doplňování chybějících podkladů."),
        ],
      },
      {
        id: "v-konzultaci",
        nav: "Během konzultace",
        eyebrow: "Klinické hodnocení",
        h2: "Co musí lékař před vystavením potvrzení ověřit",
        blocks: [
          lead("Potvrzení není administrativní laskavost. Je to odborné stanovisko k bezpečnosti řízení."),
          p("Lékař musí zhodnotit, zda existuje stav, který dočasně nebo dlouhodobě snižuje schopnost řídit bezpečně. Patří sem zrak, stabilita chronických onemocnění, neurologická či kardiovaskulární anamnéza, psychiatrické obtíže, epizody ztráty vědomí, užívání návykových látek i medikace, která může ovlivnit pozornost, reakční dobu nebo motorickou kontrolu."),
          ul([
            "Určení konkrétní kategorie a odpovídající skupiny.",
            "Aktuální zdravotní historie a stabilita relevantních diagnóz.",
            "Revize léků s tlumivým, hypoglykemickým nebo jinak omezujícím účinkem.",
            "Praktické zhodnocení, zda je řízení v dané kategorii nadále bezpečné.",
            "Rozhodnutí, zda jsou potřeba další zprávy, vyšetření nebo specializované stanovisko.",
          ]),
          p("Řada jasných případů se dá vyřešit online, pokud je dokumentace úplná a průběh onemocnění přehledný. Jiné případy to neumožní. Pokud je nutné osobní vyšetření, přesnější kontrola zraku nebo doplnění odborné zprávy, je správnou odpovědí další krok, nikoli rychlý podpis bez opory."),
          warn("Bez předběžného příslibu", "Žádný odpovědný lékař nemůže garantovat vystavení potvrzení ještě před vyhodnocením zdravotního stavu a dokumentace."),
          cite(`Profesní rámec: <a href="${ORDEM_MEDICOS}" rel="nofollow noopener" target="_blank">Ordem dos Médicos</a> · obecný zdravotní kontext: <a href="${DGS}" rel="nofollow noopener" target="_blank">DGS</a>.`),
        ],
      },
      {
        id: "psychologie",
        nav: "Psychologie",
        eyebrow: "Doplňující krok",
        h2: "Kdy může být nutné psychologické posouzení",
        blocks: [
          lead("Nejde o povinnost pro každého řidiče, ale v některých kategoriích a klinických situacích je to běžná součást procesu."),
          p("V praxi se <strong>psychologické posouzení</strong> častěji objevuje u případů <strong>skupiny 2</strong> a tam, kde kategorie, profesní charakter řízení nebo zdravotní historie vyvolávají otázky ohledně pozornosti, úsudku, kontroly chování či dalších psychických schopností důležitých pro řízení. Může se uplatnit také při kognitivních změnách nebo po událostech, které vyžadují přesnější zhodnocení funkční způsobilosti."),
          ul([
            "Může vyplývat z typu oprávnění, ne z osobního podezření.",
            "Může být odůvodněno předchozí zdravotní nebo behaviorální anamnézou.",
            "Doplňuje lékařské potvrzení, ale nenahrazuje ho.",
            "Pokud je potřebné, jeho obcházení proces jen zdržuje.",
          ]),
          p("Z pohledu řidiče je důležité chápat, že nejde o administrativní komplikaci navíc. Jde o způsob, jak dodat dostatečnou míru jistoty tam, kde samotné lékařské posouzení nestačí pro bezpečný závěr."),
        ],
      },
      {
        id: "elektronicky-imt",
        nav: "Elektronicky na IMT",
        eyebrow: "Administrativní tok",
        h2: "Co skutečně znamená online obnova a elektronické odeslání na IMT",
        blocks: [
          lead("Digitální průběh šetří papír a cesty, ale nenahrazuje medicínský obsah."),
          p("Je-li elektronická cesta dostupná, potvrzení se zařadí do správního toku, který IMT používá pro vydání nebo obnovu oprávnění. To je praktická výhoda a pro řidiče často hlavní důvod, proč vyhledává online řešení. Nezmění se však původ samotného závěru: klinický obsah vzniká při konzultaci, nikoli automaticky v portálu."),
          ul([
            "Administrativní část může být zahájena nebo sledována online.",
            "Lékařské potvrzení může být do systému IMT odesláno elektronicky tam, kde to postup umožňuje.",
            "Chybějící zprávy, nutná psychologie nebo další požadavky proces zastaví i v digitálním režimu.",
            "Online znamená menší administrativní tření, ne nižší klinickou laťku.",
          ]),
          p("Pokud někdo hledá <em>online obnovu řidičského průkazu</em>, ve skutečnosti často chce méně zdržení. Nejvíce času se ale ušetří tím, že má před konzultací jasno o kategorii, potřebných podkladech a realistickém rozsahu toho, co může lékař na místě rozhodnout."),
          cite(`Průběh řízení: <a href="${IMT_REVALIDACAO}" rel="nofollow noopener" target="_blank">IMT — revalidace řidičského průkazu</a> · <a href="${JUSTICA_REVALIDACAO}" rel="nofollow noopener" target="_blank">Justiça — revalidar carta de condução</a>.`),
        ],
      },
      {
        id: "proc-ne-hned",
        nav: "Proč ne hned",
        eyebrow: "Poctivé limity",
        h2: "Proč nemusí být potvrzení vydáno okamžitě",
        blocks: [
          lead("Odklad nemusí znamenat neúspěch. Často znamená, že bylo rozhodováno odpovědně."),
          p("Potvrzení může zůstat otevřené, pokud chybí důležité zprávy, je za vámi nedávná operace, onemocnění ještě není stabilní, medikace vyžaduje opatrnější posouzení, je třeba psychologické zhodnocení nebo je nutné osobní vyšetření. V některých případech může lékař dospět i k závěru, že současné podklady zatím neumožňují potvrdit způsobilost pro danou kategorii."),
          ul([
            "Zdravotní podklady jsou neúplné nebo zastaralé.",
            "Onemocnění není dostatečně stabilizované pro bezpečné schválení.",
            "Léky vzbuzují rozumné pochybnosti o bdělosti nebo reakční době.",
            "Požadovaná kategorie vyžaduje vyšší standard, než jaký dosavadní dokumentace unese.",
          ]),
          p("Pro pacienta je to nepohodlné. Pro lékaře jde o profesní odpovědnost. Pro IMT je to smysl celého mechanismu. Cílem potvrzení není odstranit každou administrativní překážku, ale podpořit bezpečnost silničního provozu odpovědným rozhodnutím."),
        ],
      },
    ],
    linksEyebrow: "Global Health Portugal",
    linksH2: "Další kroky",
    linksLead:
      "Náš tým v Portugalsku posuzuje žádost podle toho, co je skutečně rozhodující: kategorie, věk, anamnéza, medikace, podklady a případná potřeba dalších kroků před předáním na IMT.",
    links: [
      { label: "Konzultace k lékařskému potvrzení pro řízení", href: href("cs", "/services/certificado-medico-carta-de-conducao") },
      { label: "Naši lékaři v Portugalsku", href: href("cs", "/doctors") },
      { label: "Kontaktovat Global Health Portugal", href: href("cs", "/contact") },
    ],
    ctaBox: {
      h3: "Chcete vědět, zda váš případ půjde vyřešit během jedné konzultace?",
      text: "Dobře připravená konzultace rychle objasní kategorii, potřebné podklady, možnou psychologii i to, zda může potvrzení pokračovat na IMT bez dalších překážek.",
      primary: { label: "Objednat konzultaci", href: href("cs", "/services/certificado-medico-carta-de-conducao") },
      secondary: { label: "Podívat se na naše lékaře", href: href("cs", "/doctors") },
    },
    sourcesEyebrow: "Oficiální zdroje",
    sourcesH2: "Kde si pravidla ověřit",
    sourcesLead:
      "Kategorie, termíny obnovy, zdravotní požadavky i případná psychologie vycházejí z pravidel IMT a platného právního rámce. Vždy si ověřte aktuální znění u zdroje.",
    sources: [
      { label: "IMT — carta de condução", href: IMT_REQUISITOS },
      { label: "IMT — revalidação da carta", href: IMT_REVALIDACAO },
      { label: "Justiça — revalidar carta de condução", href: JUSTICA_REVALIDACAO },
      { label: "Direção-Geral da Saúde", href: DGS },
      { label: "Ordem dos Médicos", href: ORDEM_MEDICOS },
      { label: "Konsolidované RHLC — skupina 1 a 2", href: REGULAMENTO },
    ],
    sourcesNote:
      "Odkazy vedou na stránky příslušných orgánů. Vystavení potvrzení vždy závisí na individuálním lékařském posouzení a právních pravidlech platných pro danou kategorii řidiče.",
    faqEyebrow: "FAQ",
    faqH2: "Časté otázky",
    faqs: [
      {
        q: "Kdo v Portugalsku potřebuje lékařské potvrzení pro řidičský průkaz?",
        a: "Záleží na kategorii oprávnění, fázi řízení a pravidlech IMT. Skupina 1 a skupina 2 se neposuzují stejně a roli může hrát i věk nebo zdravotní stav řidiče.",
      },
      {
        q: "Je skupina 2 přísnější než skupina 1?",
        a: "Ano. Obvykle se u skupiny 2 uplatňuje vyšší medicínský standard, protože zahrnuje profesní nebo jinak odpovědnější kategorie řízení.",
      },
      {
        q: "Nahrazuje online obnova návštěvu lékaře?",
        a: "Ne. Může zjednodušit administrativu, ale samotné potvrzení stále vyžaduje dostatečné lékařské posouzení.",
      },
      {
        q: "Kdy je potřeba psychologické posouzení?",
        a: "Ne v každém případě. Častěji se objevuje u řízení ve skupině 2 nebo tam, kde kategorie či zdravotní historie vyžadují další potvrzení psychické způsobilosti k řízení.",
      },
      {
        q: "Může online konzultace potvrzení garantovat?",
        a: "Ne. Může pomoci vyřešit mnoho přehledných případů, ale nemůže slíbit výsledek před vyhodnocením zdravotního stavu, podkladů a případných doplňujících požadavků.",
      },
    ],
    disclaimerTitle: "Lékařské upozornění",
    disclaimer:
      "Text připravil Dr Rui Diogo Rodrigues, lékař všeobecného a rodinného lékařství v Global Health Portugal, a klinicky zkontrolovala Dra. Margarida Domingues e Andrade, lékařka všeobecného a rodinného lékařství. Článek přináší obecné informace o lékařském potvrzení pro řidičský průkaz v Portugalsku. Nenahrazuje individuální lékařské posouzení ani právní poradenství. Možnost vystavení potvrzení závisí na kategorii oprávnění, věku, anamnéze a lékařském vyšetření. V akutní zdravotní nouzi volejte 112.",
  } satisfies Article,
};

const roPost: LocalePost = {
  locale: "RO",
  slug: "certificat-medical-permis-portugalia",
  title: "Certificat medical pentru permisul de conducere în Portugalia: grupa 1, grupa 2 și ce nu rezolvă singură reînnoirea online",
  excerpt:
    "Certificatul medical pentru permis în Portugalia nu este o formalitate automată. Explicăm diferența dintre grupa 1 și grupa 2, când poate fi necesară evaluarea psihologică, cum ajunge documentul la IMT și de ce reînnoirea online are în continuare nevoie de o opinie medicală reală.",
  seoTitle: "Certificat medical permis Portugalia",
  seoDescription:
    "Certificat medical pentru permis în Portugalia: grupa 1 și 2, reînnoire online, evaluare psihologică și trimitere electronică la IMT.",
  category: "Medicină Generală",
  article: {
    lang: "ro-PT",
    tagline: "Medicină oricând, de oriunde",
    categoryLabel: "Medicină Generală",
    categoryHref: href("ro", "/blog"),
    eyebrow: "Portugalia · Ghid administrativ",
    h1: "Certificat medical pentru permisul de conducere",
    deck: "Rolul documentului este să confirme pentru IMT dacă persoana este în continuare aptă clinic să conducă în categoria solicitată, nu doar să completeze o formalitate.",
    intro:
      "În Portugalia, <strong>certificatul medical pentru permisul de conducere</strong> face parte din procesul de emitere sau reînnoire atunci când aptitudinea de a conduce trebuie confirmată în fața IMT. Punctul esențial este că <strong>grupa 1</strong> și <strong>grupa 2</strong> nu sunt evaluate la același standard. Contează categoria permisului, vârsta șoferului, istoricul medical, tratamentul curent și faptul că, în anumite situații, poate fi necesară și o <strong>evaluare psihologică</strong>. În multe cazuri, certificatul intră pe un <strong>circuit electronic către IMT</strong>, dar asta nu înseamnă că rezultatul este automat. O consultație serioasă poate clarifica dacă dosarul este simplu, ce documente lipsesc și dacă emiterea certificatului poate fi susținută medical. Ceea ce nu poate face este să garanteze dinainte un document care depinde de evaluare.",
    facts: [
      "Grupa 1 și grupa 2 au cerințe diferite",
      "Certificatul poate fi transmis electronic către IMT",
      "Evaluarea psihologică poate fi necesară în anumite situații",
    ],
    primaryCta: { label: "Programează consultația pentru certificatul de conducere", href: href("ro", "/services/certificado-medico-carta-de-conducao") },
    secondaryCta: { label: "Regulile IMT", href: IMT_REVALIDACAO },
    panelChip: "Ce explică acest ghid",
    panelParas: [
      "Cum se deosebesc grupa 1 și grupa 2 și de ce asta schimbă standardul medical.",
      "Când reînnoirea online reduce doar partea administrativă și când rămân pași clinici obligatorii.",
      "De ce evaluarea psihologică nu este universală, dar nici opțională atunci când cazul o cere.",
    ],
    author: {
      initials: "RR",
      name: "Dr Rui Diogo Rodrigues",
      line: "Medic de medicină generală și de familie · Global Health Portugal",
    },
    reviewLine:
      "Revizuit clinic de Dra. Margarida Domingues e Andrade, medic de medicină generală și de familie, Global Health Portugal.",
    navLabel: "În acest articol",
    sections: [
      {
        id: "grupe",
        nav: "Grupe",
        eyebrow: "Baza procesului",
        h2: "Grupa 1 și grupa 2 nu implică același nivel de exigență",
        blocks: [
          lead("Aici apare cea mai mare parte a confuziei. Denumirea certificatului este aceeași, dar responsabilitatea medicală nu este identică."),
          p("În linii mari, <strong>grupa 1</strong> acoperă categoriile ușoare, folosite în mod obișnuit. <strong>Grupa 2</strong> privește categoriile grele sau profesionale, unde o limitare funcțională, cognitivă sau vizuală poate avea un impact mai mare asupra altor persoane. Din acest motiv, pragul de aptitudine este mai strict, iar medicul trebuie să fie mai prudent înainte de a confirma că șoferul poate conduce în siguranță în categoria respectivă."),
          ul([
            "Grupa 1 este, de regulă, mai simplă din punct de vedere administrativ și clinic.",
            "Grupa 2 implică mai multă responsabilitate și criterii medicale mai stricte.",
            "Aceeași boală poate avea consecințe diferite în funcție de grupă și de rolul șoferului.",
            "Vârsta și momentul reînnoirii influențează și ele ce cere IMT.",
          ]),
          p("De aceea, un medic responsabil nu pornește de la promisiunea documentului, ci de la întrebarea <strong>ce categorie de permis este în joc</strong>. Reînnoirea unui permis profesional nu se tratează la fel ca o prelungire de rutină pentru un autoturism obișnuit fără comorbidități relevante."),
          cite(`Cadru oficial: <a href="${IMT_REQUISITOS}" rel="nofollow noopener" target="_blank">IMT — carta de condução</a> · <a href="${IMT_REVALIDACAO}" rel="nofollow noopener" target="_blank">IMT — revalidação</a>.`),
        ],
      },
      {
        id: "cand-este-nevoie",
        nav: "Când este nevoie",
        eyebrow: "Situații tipice",
        h2: "Când intră certificatul medical în procedură",
        blocks: [
          lead("Nu apare doar la emiterea inițială. Poate fi cerut și la reînnoire sau ori de câte ori IMT are nevoie de o confirmare medicală actualizată."),
          p("Mulți oameni caută informații despre <em>reînnoirea online a permisului</em> crezând că, dacă partea administrativă merge prin internet, și partea medicală devine automată. Nu este așa. Procedura poate fi digitală ca formă administrativă, dar <strong>concluzia privind aptitudinea rămâne medicală</strong>. Dacă IMT solicită certificatul, acesta trebuie să se bazeze pe o evaluare suficientă."),
          ul([
            "Emiterea inițială atunci când categoria sau situația șoferului impune validare medicală.",
            "Reînnoirea periodică în termenele stabilite de IMT în funcție de vârstă și categorie.",
            "Cazuri cu boală cronică, intervenție, limitare funcțională sau medicație relevantă pentru condus.",
            "Dosare în care IMT cere documente suplimentare înainte de închidere.",
          ]),
          p("Greșeala frecventă este să se presupună că portalul rezolvă tot. Portalul simplifică traseul administrativ. Nu înlocuiește evaluarea clinică și nici nu transformă automat o situație medicală complexă într-un certificat gata de trimis."),
          warn("Pregătirea scurtează traseul", "Dacă aveți notificare de la IMT, scrisori medicale recente sau lista tratamentului, aduceți-le la consultație. Lipsa contextului încetinește mai mult decât orice etapă digitală."),
        ],
      },
      {
        id: "consultatie",
        nav: "În consultație",
        eyebrow: "Evaluare clinică",
        h2: "Ce trebuie să verifice medicul înainte de emitere",
        blocks: [
          lead("Certificatul este o declarație profesională privind siguranța la volan, nu un act administrativ golit de conținut."),
          p("Pentru a-l emite, medicul trebuie să verifice dacă există o condiție care reduce temporar sau pe termen lung capacitatea de a conduce în siguranță. Aici intră vederea, controlul bolilor cronice, antecedente neurologice sau cardiovasculare, tulburări psihiatrice, episoade de pierdere a conștienței, consum de substanțe și tratamente care pot afecta vigilența, timpul de reacție sau controlul funcțional."),
          ul([
            "Identificarea categoriei de permis și a grupei aplicabile.",
            "Istoric medical actualizat și stabilitatea afecțiunilor relevante.",
            "Revizuirea tratamentului cu efect sedativ, hipoglicemiant sau invalidant.",
            "Evaluarea practică a faptului că șofatul rămâne sigur în categoria respectivă.",
            "Decizia dacă sunt necesare rapoarte, investigații sau opinii suplimentare.",
          ]),
          p("Multe cazuri clare pot fi gestionate online dacă istoricul este coerent și documentele există deja. Alte cazuri nu. Dacă este nevoie de examinare fizică, de clarificare oftalmologică sau de citirea unor rapoarte recente care lipsesc, răspunsul corect este un pas suplimentar, nu o semnătură dată pe presupuneri."),
          warn("Fără garanție înainte de evaluare", "Niciun medic responsabil nu poate promite certificatul înainte de a evalua categoria, istoricul, medicația și documentele disponibile."),
          cite(`Cadru profesional: <a href="${ORDEM_MEDICOS}" rel="nofollow noopener" target="_blank">Ordem dos Médicos</a> · context sanitar general: <a href="${DGS}" rel="nofollow noopener" target="_blank">DGS</a>.`),
        ],
      },
      {
        id: "evaluare-psihologica",
        nav: "Evaluare psihologică",
        eyebrow: "Pas suplimentar",
        h2: "Când poate fi necesară evaluarea psihologică",
        blocks: [
          lead("Nu este cerută tuturor șoferilor, dar nici nu este ceva excepțional în anumite categorii sau contexte clinice."),
          p("În practică, <strong>evaluarea psihologică</strong> apare mai des în dosarele din <strong>grupa 2</strong> și în situațiile în care categoria, activitatea profesională sau istoricul medical ridică întrebări privind atenția, controlul comportamental, judecata sau alte aptitudini psihice relevante pentru condus. Poate fi necesară și dacă există suspiciuni de modificări cognitive sau un istoric care justifică o verificare mai detaliată."),
          ul([
            "Poate rezulta din categorie, nu dintr-o neîncredere personală.",
            "Poate fi cerută din cauza istoricului medical sau comportamental relevant.",
            "Completează certificatul medical; nu îl înlocuiește.",
            "Dacă este necesară, evitarea ei nu accelerează procesul, ci îl prelungește.",
          ]),
          p("Pentru șofer, acest pas poate părea incomod. Pentru sistem, are o logică directă: atunci când siguranța rutieră depinde de anumite capacități psihologice, concluzia trebuie susținută de dovezi adecvate."),
        ],
      },
      {
        id: "imt-online",
        nav: "IMT online",
        eyebrow: "Flux administrativ",
        h2: "Ce înseamnă în realitate reînnoirea online și trimiterea electronică la IMT",
        blocks: [
          lead("Partea vizibilă pentru pacient poate fi digitală, dar asta nu face conținutul medical automat."),
          p("Atunci când traseul electronic este disponibil, certificatul intră în circuitul administrativ folosit de IMT pentru emiterea sau reînnoirea permisului. Acest lucru reduce deplasările și hârtia, ceea ce este util. Dar originea concluziei rămâne aceeași: partea clinică se formează în consultație, nu în portal. Portalul nu decide dacă o boală controlată este suficient compatibilă cu grupa cerută și nici nu elimină o evaluare psihologică atunci când cazul o impune."),
          ul([
            "Partea administrativă poate fi inițiată sau urmărită online.",
            "Certificatul poate fi integrat electronic în procesul IMT acolo unde procedura permite.",
            "Dacă lipsesc rapoarte sau pași suplimentari, dosarul nu avansează doar pentru că este digital.",
            "Online înseamnă mai puțină fricțiune administrativă, nu mai puțină exigență clinică.",
          ]),
          p("Cine caută <em>reînnoire online permis</em> sau <em>certificat pentru reînnoirea permisului</em> caută de fapt mai puțină pierdere de timp. Asta este realist, dar timpul se economisește cu adevărat când consultația începe cu categoria clară, documentele pregătite și așteptări corecte despre ce poate decide medicul pe loc."),
          cite(`Procedură: <a href="${IMT_REVALIDACAO}" rel="nofollow noopener" target="_blank">IMT — revalidarea permisului</a> · <a href="${JUSTICA_REVALIDACAO}" rel="nofollow noopener" target="_blank">Justiça — revalidar carta de condução</a>.`),
        ],
      },
      {
        id: "de-ce-nu-imediat",
        nav: "Dacă nu se emite imediat",
        eyebrow: "Limite oneste",
        h2: "De ce certificatul poate să nu fie emis pe loc",
        blocks: [
          lead("Faptul că răspunsul nu este imediat nu înseamnă că consultația a mers prost. Uneori înseamnă exact că a fost făcută corect."),
          p("Certificatul poate rămâne în așteptare dacă lipsesc rapoarte importante, dacă există o operație recentă, dacă boala nu este încă stabilă, dacă medicația ridică îndoieli rezonabile, dacă este necesară evaluarea psihologică sau dacă se impune o examinare în persoană. În unele cazuri, medicul poate concluziona că dovezile actuale nu permit încă confirmarea aptitudinii pentru categoria respectivă."),
          ul([
            "Documentele medicale sunt incomplete sau depășite.",
            "Afecțiunea nu este suficient de controlată pentru o emitere sigură.",
            "Tratamentul ridică întrebări legitime despre vigilență sau timp de reacție.",
            "Categoria solicitată cere un standard mai ridicat decât susține documentația existentă.",
          ]),
          p("Pentru pacient, acest lucru este frustrant. Pentru medic, este responsabilitate profesională. Pentru IMT, este sensul mecanismului. Scopul certificatului nu este să elimine orice obstacol birocratic, ci să protejeze siguranța rutieră printr-o concluzie medicală defensibilă."),
        ],
      },
    ],
    linksEyebrow: "Global Health Portugal",
    linksH2: "Pașii următori",
    linksLead:
      "Echipa noastră din Portugalia analizează exact elementele care contează: categoria, vârsta, istoricul medical, medicația, documentele și necesitatea sau nu a unor pași suplimentari înainte de trimiterea la IMT.",
    links: [
      { label: "Consultație pentru certificatul medical de conducere", href: href("ro", "/services/certificado-medico-carta-de-conducao") },
      { label: "Medicii noștri din Portugalia", href: href("ro", "/doctors") },
      { label: "Contact Global Health Portugal", href: href("ro", "/contact") },
    ],
    ctaBox: {
      h3: "Vreți să aflați dacă dosarul poate fi rezolvat într-o singură consultație?",
      text: "O consultație bine pregătită clarifică din timp categoria, documentele necesare, posibilitatea unei evaluări psihologice și dacă certificatul poate merge către IMT fără pași suplimentari.",
      primary: { label: "Programează consultația", href: href("ro", "/services/certificado-medico-carta-de-conducao") },
      secondary: { label: "Vezi medicii noștri", href: href("ro", "/doctors") },
    },
    sourcesEyebrow: "Surse oficiale",
    sourcesH2: "Unde verificați regulile",
    sourcesLead:
      "Categoriile, termenele de reînnoire, cerințele medicale și eventuala evaluare psihologică depind de cadrul IMT și de reglementarea în vigoare. Verificați întotdeauna sursa oficială.",
    sources: [
      { label: "IMT — carta de condução", href: IMT_REQUISITOS },
      { label: "IMT — revalidação da carta", href: IMT_REVALIDACAO },
      { label: "Justiça — revalidar carta de condução", href: JUSTICA_REVALIDACAO },
      { label: "Direção-Geral da Saúde", href: DGS },
      { label: "Ordem dos Médicos", href: ORDEM_MEDICOS },
      { label: "RHLC consolidat — grupa 1 și 2", href: REGULAMENTO },
    ],
    sourcesNote:
      "Linkurile duc către site-urile autorităților competente. Emiterea certificatului depinde întotdeauna de evaluarea medicală individuală și de cadrul legal aplicabil categoriei de permis.",
    faqEyebrow: "FAQ",
    faqH2: "Întrebări frecvente",
    faqs: [
      {
        q: "Cine are nevoie de certificat medical pentru permis în Portugalia?",
        a: "Depinde de categoria permisului, de momentul procedurii și de regulile IMT. Grupa 1 și grupa 2 nu se tratează la fel, iar vârsta sau anumite afecțiuni pot impune o nouă confirmare a aptitudinii.",
      },
      {
        q: "Este grupa 2 mai strictă decât grupa 1?",
        a: "Da. În general, grupa 2 este supusă unui standard medical mai strict, deoarece include categorii profesionale sau cu o responsabilitate mai mare.",
      },
      {
        q: "Reînnoirea online înlocuiește consultația medicală?",
        a: "Nu. Poate simplifica partea administrativă, dar certificatul rămâne dependent de o evaluare medicală adecvată.",
      },
      {
        q: "Când este necesară evaluarea psihologică?",
        a: "Nu în toate cazurile. Apare mai ales în dosare din grupa 2 sau atunci când categoria ori istoricul șoferului cer o confirmare suplimentară a aptitudinilor psihologice pentru condus.",
      },
      {
        q: "Poate o consultație online să garanteze certificatul?",
        a: "Nu. Poate rezolva multe cazuri clare, dar nu poate promite documentul înainte de evaluare. Unele situații cer rapoarte suplimentare, examinare directă sau evaluare psihologică.",
      },
    ],
    disclaimerTitle: "Avertisment medical",
    disclaimer:
      "Text scris de Dr Rui Diogo Rodrigues, medic de medicină generală și de familie la Global Health Portugal, și revizuit clinic de Dra. Margarida Domingues e Andrade, medic de medicină generală și de familie. Articolul oferă informații generale despre certificatul medical pentru permisul de conducere în Portugalia. Nu înlocuiește evaluarea clinică individuală și nici consultanța juridică. Emiterea certificatului depinde de categoria permisului, vârstă, istoricul medical și examinarea medicală. În caz de urgență medicală, sunați la 112.",
  } satisfies Article,
};

export const PT_ATESTADO_CARTA_CONDUCAO: PostSet = {
  key: "pt-atestado-carta-conducao",
  countryCode: "pt",
  targetKeyword: "atestado médico carta condução",
  searchVolume: 1900,
  keywordDifficulty: 0,
  evidence:
    "pt/2620 research refresh 2026-08-24. Head keyword 1,900 KD 0 CPC 2.38, with supporting renewal-intent queries 'renovação carta condução online' 2,400 KD 0 CPC 0.93 and 'certificado renovação carta condução' 590 KD 0 CPC 1.62. Search intent is procedural: readers want category boundaries, online renewal flow, psychological-assessment triggers and IMT submission rules, not disease advice.",
  serviceSlug: "certificado-medico-carta-de-conducao",
  authorDoctorId: "cmqwnkhcd00007gjummb923nm",
  authorDisplayName: "Dr Rui Diogo Rodrigues",
  reviewerDoctorId: "cmqwnkoqe000c7gju26jtb7qt",
  reviewerDisplayName: "Dra. Margarida Domingues e Andrade",
  posts: [pt, en, es, cs, roPost, de],
};

export const PT_ATESTADO_CARTA_CONDUCAO_BODIES = () =>
  PT_ATESTADO_CARTA_CONDUCAO.posts.map((post) => renderArticle(post.article));
