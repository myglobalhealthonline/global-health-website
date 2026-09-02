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

const IMT_REVALIDACAO = "https://www.imt-ip.pt/sites/IMTT/Portugues/Condutores/RevalidacaoCartaConducao/Paginas/RevalidacaoCartaConducao.aspx";
const IMT_REQUISITOS = "https://www.imt-ip.pt/sites/IMTT/Portugues/Condutores/CartaConducao/Paginas/CartaConducao.aspx";
const DGS = "https://www.dgs.pt/";
const ORDEM_MEDICOS =
  "https://ordemdosmedicos.pt/emissao-online-de-atestados-medicos-para-carta-de-conducao";
const JUSTICA_REVALIDACAO = "https://www2.gov.pt/pt-PT/servicos/revalidar-a-carta-de-conducao";
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
          p("No Grupo 1, é exigido atestado médico a partir dos 60 anos. O certificado de aptidão psicológica não se torna obrigatório apenas por atingir os 70; só é necessário quando existe indicação específica, como a restrição 138. No Grupo 2, a revalidação exige atestado e, a partir dos 50, certificado psicológico."),
          p('O teste psicotécnico é presencial. Quando for exigido, a Global Health encaminha-o para uma <a href="' + href("pt", "/services/certificado-medico-carta-de-conducao") + '">clínica parceira de confiança</a> e coordena os passos seguintes.'),
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
          p("A avaliação não presencial não é, em regra, adequada. A Ordem dos Médicos admite-a apenas quando o médico assistente conhece o histórico ou tem toda a informação clínica essencial; caso contrário, exige presença."),
          warn("Sem garantia prévia", "A marcação paga uma avaliação, não um resultado. O atestado só pode ser emitido se o médico concluir que existem elementos suficientes e que os critérios aplicáveis estão cumpridos."),
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
      { label: "Consulta para atestado e encaminhamento psicotécnico", href: href("pt", "/services/certificado-medico-carta-de-conducao") },
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
      { label: "Ordem dos Médicos — avaliação", href: ORDEM_MEDICOS },
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
        a: "No Grupo 1, não é automático depois dos 70; é exigido quando existe indicação específica, como a restrição 138. Nas revalidações do Grupo 2, é exigido a partir dos 50. Confirme o seu caso no IMT.",
      },
      {
        q: "Uma teleconsulta garante o atestado?",
        a: "Não. Só é excecionalmente possível quando o médico assistente conhece o histórico ou tem toda a informação clínica essencial; caso contrário, exige presença.",
      },
    ],
    disclaimerTitle: "Aviso Médico",
    disclaimer:
      "Informação geral sobre o atestado médico para carta de condução em Portugal. Não substitui avaliação individual, não garante emissão e não substitui instruções do IMT.",
  } satisfies Article,
};

const en: LocalePost = {
  locale: "EN",
  slug: "driving-licence-medical-certificate-portugal",
  title: "Driving licence medical certificate in Portugal: Group 1, Group 2 and IMT submission",
  excerpt:
    "See which licence categories fall under Groups 1 and 2, when medical and psychological certificates are required and how the doctor submits the certificate to IMT.",
  seoTitle: "Portugal driving medical certificate: Group 1 and 2",
  seoDescription:
    "Driving licence medical certificate in Portugal: Groups 1 and 2, psychological assessment, electronic IMT submission and consultation limits.",
  category: "General Practice",
  article: {
    lang: "en-PT",
    tagline: "Healthcare whenever you need it, wherever you are",
    categoryLabel: "General Practice",
    categoryHref: href("en", "/blog"),
    eyebrow: "Portugal · Administrative guide",
    h1: "Driving licence medical certificate in Portugal",
    deck: "Your category, age and professional use determine the requirements. An appointment does not guarantee that a certificate can be issued.",
    intro:
      "<strong>Group 1</strong> covers motorcycles, mopeds, light vehicles and agricultural tractors. <strong>Group 2</strong> covers heavy vehicles and certain professional uses of B or BE. The doctor submits the certificate to IMT, but cannot guarantee its issuance. Some cases need an in-person assessment, further evidence or a psychological certificate.",
    facts: [
      "The category and its use determine the group",
      "The doctor submits the certificate to IMT",
      "The assessment may need to take place in person",
    ],
    primaryCta: { label: "Check your group and official deadline", href: JUSTICA_REVALIDACAO },
    secondaryCta: { label: "Renewal rules", href: JUSTICA_REVALIDACAO },
    panelChip: "The essentials",
    panelParas: [
      "The licence category and driving activity determine the group.",
      "The doctor sends the certificate; the driver completes the renewal application.",
    ],
    author: {
      initials: "RR",
      name: "Dr Rui Diogo Rodrigues",
      line: "General practitioner and family doctor · Global Health Portugal",
    },
    navLabel: "In this article",
    sections: [
      {
        id: "groups",
        nav: "Groups",
        eyebrow: "Legal map",
        h2: "Which categories belong to Group 1 and Group 2?",
        blocks: [
          lead("Check your category and vehicle use before booking."),
          ul([
            "<strong>Group 1:</strong> AM, A1, A2, A, B1, B and BE categories, mopeds and agricultural tractors.",
            "<strong>Group 2 by category:</strong> C1, C1E, C, CE, D1, D1E, D and DE.",
            "<strong>Professional B or BE:</strong> ambulances, fire-service vehicles, patient transport, school or child transport, and hire cars used for passenger transport fall under Group 2.",
            "<strong>If you are unsure:</strong> check the category and describe the driving activity. A B or BE licence does not always mean Group 1.",
          ]),
          p("The group changes the medical criteria, renewal intervals and additional assessments."),
          cite(`Official category map: <a href="${IMT_REQUISITOS}" rel="nofollow noopener" target="_blank">IMT — driving licence</a> and the <a href="${JUSTICA_REVALIDACAO}" rel="nofollow noopener" target="_blank">Justice portal — renew a driving licence</a>.`),
        ],
      },
      {
        id: "when-needed",
        nav: "When required",
        eyebrow: "Renewal",
        h2: "When are medical and psychological certificates required?",
        blocks: [
          lead("Deadlines depend on category, acquisition date and age."),
          p("Group 1 requires a medical certificate from age 60. A psychological fitness certificate does not become automatic after 70; it is required only where specifically indicated, such as restriction 138. Group 2 renewals require a medical certificate and, from age 50, a psychological certificate."),
          p('The psychotechnical test must be completed in person. When required, Global Health refers the patient to a <a href="' + href("en", "/services/certificado-medico-carta-de-conducao") + '">trusted partner clinic</a> and coordinates the next steps.'),
          warn("Check the official deadline", "Use your category, birth date and acquisition date. Bring any IMT notice."),
        ],
      },
      {
        id: "appointment",
        nav: "Appointment",
        eyebrow: "Assessment",
        h2: "What to prepare for the medical assessment",
        blocks: [
          lead("The appointment provides the evidence for a clinical decision."),
          p("Bring identification, your category, medication list and relevant reports. The doctor may need to check vision, mobility, chronic illness, loss of consciousness or treatment affecting alertness."),
          ul([
            "Your driving licence, category and any notice from IMT.",
            "Your medication, relevant medical reports, glasses or contact lenses.",
          ]),
          p("A remote assessment is not normally appropriate. The Portuguese Medical Association allows exceptions when the treating doctor knows the history or has all essential clinical information; otherwise an in-person assessment or further evidence is required."),
          cite('Professional guidance: <a href="' + ORDEM_MEDICOS + '" rel="nofollow noopener" target="_blank">Portuguese Medical Association — driving-certificate assessments</a>.'),
          warn("No guarantee before assessment", "The appointment pays for an assessment, not an outcome. Issuance requires sufficient evidence and compliance with the rules."),
          p("If the certificate cannot be issued, ask whether you need a report, examination, vision check, specialist opinion or psychological assessment before renewal."),
        ],
      },
      {
        id: "submission",
        nav: "IMT submission",
        eyebrow: "Electronic route",
        h2: "How electronic submission to IMT works",
        blocks: [
          lead("Once issued, the doctor submits the certificate electronically to IMT."),
          p("You need not send a copy. Renewal is a separate online or in-person application. Add a psychological certificate or other document when required."),
          p("Keep the renewal confirmation and respond to IMT requests."),
          p("If the certificate is missing, contact the issuer and IMT. The clinic does not decide the renewal."),
        ],
      },
      {
        id: "check-rules",
        nav: "Check the rules",
        eyebrow: "Official sources",
        h2: "Check the rule that applies to your licence",
        blocks: [
          cite(`Official procedure: <a href="${IMT_REVALIDACAO}" rel="nofollow noopener" target="_blank">IMT — licence renewal</a> and the <a href="${JUSTICA_REVALIDACAO}" rel="nofollow noopener" target="_blank">Justice portal — renew a driving licence</a>.`),
        ],
      },
    ],
    linksEyebrow: "Global Health Portugal",
    linksH2: "Next steps",
    linksLead: "The appointment covers your category, history and documents.",
    links: [
      { label: "Driving certificate consultation and psychotechnical referral", href: href("en", "/services/certificado-medico-carta-de-conducao") },
      { label: "Doctors in Portugal", href: href("en", "/doctors") },
      { label: "Contact Global Health Portugal", href: href("en", "/contact") },
    ],
    ctaBox: {
      h3: "Do you need an assessment for the certificate?",
      text: "Prepare your category, medication and reports. Issuance is not guaranteed.",
      primary: { label: "Book a consultation", href: href("en", "/services/certificado-medico-carta-de-conducao") },
      secondary: { label: "View our doctors", href: href("en", "/doctors") },
    },
    sourcesEyebrow: "Official sources",
    sourcesH2: "Where to check categories and renewal rules",
    sourcesLead: "Check your category, deadline and documents on official pages.",
    sources: [
      { label: "IMT — driving licence", href: IMT_REQUISITOS },
      { label: "IMT — licence renewal", href: IMT_REVALIDACAO },
      { label: "Justice portal — renew a driving licence", href: JUSTICA_REVALIDACAO },
      { label: "Consolidated RHLC — Groups 1 and 2", href: REGULAMENTO },
    ],
    sourcesNote:
      "Issuance depends on individual assessment and the rules for the category and vehicle use.",
    faqEyebrow: "FAQ",
    faqH2: "Common questions",
    faqs: [
      {
        q: "Which licence categories belong to Group 1 and Group 2?",
        a: "Group 1 covers AM, A1, A2, A, B1, B, BE, mopeds and agricultural tractors. Group 2 covers C1, C1E, C, CE, D1, D1E, D, DE and specified professional uses of B or BE.",
      },
      {
        q: "Does online renewal remove the need for a medical appointment?",
        a: "No. The application can be online, but the certificate requires medical assessment. The doctor submits it electronically to IMT after issuance.",
      },
      {
        q: "When is a psychological fitness certificate required?",
        a: "It is not automatic after 70 in Group 1; it is required only where specifically indicated, such as restriction 138. It is required from age 50 for Group 2 renewals. Check your case with IMT.",
      },
      {
        q: "Does an online appointment guarantee the certificate?",
        a: "No. Remote assessment is a professional exception, limited to cases where the treating doctor knows the history or has all essential clinical information; otherwise an in-person assessment is required.",
      },
    ],
    disclaimerTitle: "Medical disclaimer",
    disclaimer:
      "General information about Portuguese driving medical certificates. It does not replace individual assessment, guarantee issuance or override IMT instructions.",
  } satisfies Article,
};

const de: LocalePost = {
  locale: "DE",
  slug: "aerztliches-attest-fuehrerschein-portugal",
  title: "Ärztliches Attest für den Führerschein in Portugal: Gruppe 1, Gruppe 2 und Übermittlung an das IMT",
  excerpt:
    "Welche Klassen zu Gruppe 1 und Gruppe 2 gehören, wann ein ärztliches oder psychologisches Attest nötig ist und wie die Übermittlung an das IMT funktioniert.",
  seoTitle: "Führerscheinattest Portugal: Gruppe 1 und 2",
  seoDescription:
    "Führerscheinattest in Portugal: Gruppe 1 und 2, psychologisches Attest, elektronische Übermittlung an das IMT und Grenzen der Sprechstunde.",
  category: "Allgemeinmedizin",
  article: {
    lang: "de-PT",
    tagline: "Medizinische Hilfe, wann und wo Sie sie brauchen",
    categoryLabel: "Allgemeinmedizin",
    categoryHref: href("de", "/blog"),
    eyebrow: "Portugal · Verwaltungsleitfaden",
    h1: "Ärztliches Attest für den Führerschein",
    deck: "Klasse, Alter und berufliche Nutzung bestimmen die Anforderungen. Der Termin garantiert keine Ausstellung.",
    intro:
      "<strong>Gruppe 1</strong> umfasst Motorräder, Mopeds, leichte Fahrzeuge und landwirtschaftliche Zugmaschinen. Zu <strong>Gruppe 2</strong> gehören schwere Fahrzeuge und bestimmte berufliche Nutzungen von B oder BE. Der Arzt übermittelt das Attest an das IMT, kann die Ausstellung aber nicht garantieren. Manchmal sind eine persönliche Untersuchung, weitere Unterlagen oder ein psychologisches Attest nötig.",
    facts: [
      "Klasse und Nutzung bestimmen die Gruppe",
      "Der Arzt übermittelt das Attest an das IMT",
      "Die Beurteilung kann eine persönliche Untersuchung erfordern",
    ],
    primaryCta: { label: "Gruppe und amtliche Frist prüfen", href: JUSTICA_REVALIDACAO },
    secondaryCta: { label: "Regeln zur Erneuerung", href: JUSTICA_REVALIDACAO },
    panelChip: "Das Wichtigste",
    panelParas: [
      "Führerscheinklasse und Tätigkeit bestimmen die Gruppe.",
      "Der Arzt übermittelt das Attest; der Fahrer beantragt die Erneuerung.",
    ],
    author: {
      initials: "RR",
      name: "Dr Rui Diogo Rodrigues",
      line: "Arzt für Allgemein- und Familienmedizin · Global Health Portugal",
    },
    navLabel: "In diesem Artikel",
    sections: [
      {
        id: "gruppen",
        nav: "Gruppen",
        eyebrow: "Rechtliche Einordnung",
        h2: "Welche Klassen gehören zu Gruppe 1 und Gruppe 2?",
        blocks: [
          lead("Prüfen Sie vor der Buchung Klasse und Tätigkeit."),
          ul([
            "<strong>Gruppe 1:</strong> AM, A1, A2, A, B1, B und BE, Mopeds und landwirtschaftliche Zugmaschinen.",
            "<strong>Gruppe 2 nach Klasse:</strong> C1, C1E, C, CE, D1, D1E, D und DE.",
            "<strong>Berufliche Nutzung von B oder BE:</strong> Krankenwagen, Feuerwehr, Kranken-, Schul- oder Kindertransport sowie Mietwagen zur Personenbeförderung gehören zu Gruppe 2.",
            "<strong>Im Zweifel:</strong> Prüfen Sie die Klasse und beschreiben Sie die Tätigkeit. B oder BE bedeutet nicht immer Gruppe 1.",
          ]),
          p("Die Gruppe beeinflusst Kriterien, Erneuerungsintervalle und zusätzliche Begutachtungen."),
          cite(`Amtliche Einordnung: <a href="${IMT_REQUISITOS}" rel="nofollow noopener" target="_blank">IMT — Führerschein</a> und <a href="${JUSTICA_REVALIDACAO}" rel="nofollow noopener" target="_blank">Justizportal — Führerschein erneuern</a>.`),
        ],
      },
      {
        id: "wann",
        nav: "Wann erforderlich",
        eyebrow: "Erneuerung",
        h2: "Wann sind ein ärztliches und ein psychologisches Attest nötig?",
        blocks: [
          lead("Fristen richten sich nach Klasse, Erwerbsdatum und Alter."),
          p("Gruppe 1 benötigt ab 60 ein ärztliches Attest. Ein psychologisches Attest wird nach 70 nicht automatisch Pflicht, sondern nur bei besonderer Auflage wie der Beschränkung 138. Für Gruppe 2 ist bei der Erneuerung ein ärztliches und ab 50 auch ein psychologisches Attest nötig."),
          p('Der psychotechnische Test muss persönlich stattfinden. Wenn er erforderlich ist, vermittelt Global Health den Patienten an eine <a href="' + href("de", "/services/certificado-medico-carta-de-conducao") + '">vertrauenswürdige Partnerklinik</a> und koordiniert die nächsten Schritte.'),
          warn("Amtliche Frist prüfen", "Nutzen Sie Klasse, Geburts- und Erwerbsdatum. Bringen Sie eine Mitteilung des IMT mit."),
        ],
      },
      {
        id: "sprechstunde",
        nav: "Sprechstunde",
        eyebrow: "Beurteilung",
        h2: "Was Sie für die ärztliche Beurteilung vorbereiten sollten",
        blocks: [
          lead("Die Sprechstunde liefert die Grundlage für die ärztliche Entscheidung."),
          p("Bringen Sie Ausweis, Klasse, Medikamentenliste und Befunde mit. Der Arzt muss eventuell Sehen, Beweglichkeit, chronische Erkrankungen, Bewusstlosigkeit oder aufmerksamkeitsmindernde Behandlungen klären."),
          ul([
            "Führerschein, Klasse und eine mögliche Mitteilung des IMT.",
            "Medikamente, relevante Befunde, Brille oder Kontaktlinsen.",
          ]),
          p("Eine Fernbeurteilung ist in der Regel nicht angemessen. Ausnahmen gelten nur, wenn der behandelnde Arzt die Vorgeschichte kennt oder über alle wesentlichen klinischen Informationen verfügt; andernfalls ist eine persönliche Untersuchung nötig."),
          cite(`Berufsrechtliche Orientierung: <a href="${ORDEM_MEDICOS}" rel="nofollow noopener" target="_blank">Ordem dos Médicos — Führerscheinatteste</a>.`),
          warn("Keine Zusage vor der Beurteilung", "Der Termin bezahlt die Beurteilung, nicht das Ergebnis. Für die Ausstellung müssen Unterlagen und Kriterien ausreichen."),
          p("Klären Sie bei ausbleibender Ausstellung, ob ein Befund, Sehtest, eine Untersuchung, fachärztliche Stellungnahme oder psychologische Begutachtung fehlt."),
        ],
      },
      {
        id: "uebermittlung",
        nav: "Übermittlung an das IMT",
        eyebrow: "Elektronischer Weg",
        h2: "So funktioniert die elektronische Übermittlung an das IMT",
        blocks: [
          lead("Nach der Ausstellung übermittelt der Arzt das Attest über die elektronische Plattform. Anschließend steht es dem IMT zur Verfügung."),
          p("Sie müssen keine Kopie einsenden. Die Erneuerung ist ein separater Online- oder Schalterantrag. Reichen Sie weitere verlangte Unterlagen ein."),
          p("Bewahren Sie die Bestätigung auf und reagieren Sie auf Rückfragen des IMT."),
          p("Fehlt das Attest, kontaktieren Sie Aussteller und IMT. Die Praxis entscheidet nicht über die Erneuerung."),
        ],
      },
      {
        id: "regeln-pruefen",
        nav: "Regeln prüfen",
        eyebrow: "Offizielle Quellen",
        h2: "Prüfen Sie die Regel für Ihren Führerschein",
        blocks: [
          cite(`Amtliches Verfahren: <a href="${IMT_REVALIDACAO}" rel="nofollow noopener" target="_blank">IMT — Erneuerung</a> und <a href="${JUSTICA_REVALIDACAO}" rel="nofollow noopener" target="_blank">Justizportal — Führerschein erneuern</a>.`),
        ],
      },
    ],
    linksEyebrow: "Global Health Portugal",
    linksH2: "Nächste Schritte",
    linksLead: "In der Sprechstunde werden Führerscheinklasse, Krankengeschichte und Unterlagen geprüft.",
    links: [
      { label: "Sprechstunde und Überweisung zum psychotechnischen Test", href: href("de", "/services/certificado-medico-carta-de-conducao") },
      { label: "Ärzte in Portugal", href: href("de", "/doctors") },
      { label: "Global Health Portugal kontaktieren", href: href("de", "/contact") },
    ],
    ctaBox: {
      h3: "Benötigen Sie eine Beurteilung für das Attest?",
      text: "Bereiten Sie Führerscheinklasse, Medikamente und Befunde vor. Die Ausstellung kann nicht garantiert werden.",
      primary: { label: "Termin buchen", href: href("de", "/services/certificado-medico-carta-de-conducao") },
      secondary: { label: "Ärzte ansehen", href: href("de", "/doctors") },
    },
    sourcesEyebrow: "Offizielle Quellen",
    sourcesH2: "Wo Sie Klassen und Erneuerung prüfen können",
    sourcesLead: "Prüfen Sie Klassen, Fristen und Unterlagen auf den amtlichen Seiten.",
    sources: [
      { label: "IMT — Führerschein", href: IMT_REQUISITOS },
      { label: "IMT — Erneuerung des Führerscheins", href: IMT_REVALIDACAO },
      { label: "Justizportal — Führerschein erneuern", href: JUSTICA_REVALIDACAO },
      { label: "Konsolidierte RHLC — Gruppe 1 und 2", href: REGULAMENTO },
    ],
    sourcesNote:
      "Die Ausstellung hängt von der individuellen medizinischen Beurteilung und den Regeln für die Führerscheinklasse und Fahrzeugnutzung ab.",
    faqEyebrow: "FAQ",
    faqH2: "Häufige Fragen",
    faqs: [
      {
        q: "Welche Führerscheinklassen gehören zu Gruppe 1 und Gruppe 2?",
        a: "Gruppe 1 umfasst AM, A1, A2, A, B1, B und BE, Mopeds und landwirtschaftliche Zugmaschinen. Gruppe 2 umfasst C1, C1E, C, CE, D1, D1E, D und DE sowie bestimmte berufliche Nutzungen von B oder BE.",
      },
      {
        q: "Ersetzt die Online-Erneuerung den Arzttermin?",
        a: "Nein. Der Antrag kann online gestellt werden, das Attest hängt aber von einer ärztlichen Beurteilung ab. Nach der Ausstellung übermittelt der Arzt es elektronisch an das IMT.",
      },
      {
        q: "Wann ist ein psychologisches Eignungsattest nötig?",
        a: "In Gruppe 1 wird es nach dem 70. Lebensjahr nicht automatisch Pflicht, sondern nur bei besonderer Auflage wie der Beschränkung 138. Bei Erneuerungen der Gruppe 2 ist es ab 50 erforderlich. Prüfen Sie Ihren Fall beim IMT.",
      },
      {
        q: "Garantiert eine Videosprechstunde das Attest?",
        a: "Nein. Eine Fernbeurteilung ist nur ausnahmsweise möglich, wenn der behandelnde Arzt die Vorgeschichte kennt oder alle wesentlichen klinischen Informationen vorliegen; sonst ist eine persönliche Untersuchung nötig.",
      },
    ],
    disclaimerTitle: "Medizinischer Hinweis",
    disclaimer:
      "Allgemeine Informationen zum ärztlichen Führerscheinattest in Portugal. Der Text ersetzt keine individuelle Beurteilung, garantiert keine Ausstellung und ersetzt keine Anweisung des IMT.",
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
    navLabel: "En este artículo",
    sections: [
      {
        id: "grupos",
        nav: "Grupos",
        eyebrow: "Punto de partida",
        h2: "Grupo 1 y Grupo 2: requisitos médicos distintos",
        blocks: [
          lead("La categoría del permiso determina el nivel de evaluación clínica necesario antes de emitir el certificado."),
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
          lead("Al emitir el certificado, el médico asume la responsabilidad profesional de confirmar la aptitud para conducir."),
          p("Para firmarlo, el médico debe revisar si existe alguna condición que reduzca de forma temporal o duradera la seguridad al volante. Eso puede incluir visión, control de enfermedades crónicas, antecedentes neurológicos o cardiovasculares, trastornos psiquiátricos, episodios de pérdida de conciencia, consumo de sustancias y medicación que altere vigilancia, tiempo de reacción o capacidad funcional."),
          ul([
            "Identificación de la categoría del permiso y del grupo aplicable.",
            "Historia clínica actualizada y estabilidad de enfermedades relevantes.",
            "Revisión de medicación con efecto sedante, hipoglucemiante o incapacitante.",
            "Valoración suficiente para decidir si la conducción sigue siendo segura.",
            "Necesidad o no de informes, pruebas o derivaciones adicionales.",
          ]),
          p("La valoración no presencial no es adecuada como regla general. Solo cabe como excepción cuando el médico tratante conoce el historial o dispone de toda la información clínica esencial; de lo contrario, debe pedir exploración presencial o pruebas adicionales."),
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
          lead("La evaluación psicológica solo se exige en determinados perfiles y categorías de permiso."),
          p("En la práctica, la <strong>evaluación psicológica</strong> aparece con más frecuencia en expedientes del <strong>Grupo 2</strong> y en contextos donde la categoría, la actividad profesional o la historia clínica obligan a confirmar aptitudes psicológicas relevantes para la conducción. También puede plantearse si existen dudas sobre atención, control conductual, consumo problemático de sustancias o cambios cognitivos que merecen una revisión más precisa."),
          p('El test psicotécnico debe realizarse presencialmente. Cuando sea necesario, Global Health deriva al paciente a una <a href="' + href("es", "/services/certificado-medico-carta-de-conducao") + '">clínica colaboradora de confianza</a> y coordina los siguientes pasos.'),
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
          lead("El médico puede necesitar informes, pruebas o una evaluación presencial antes de decidir."),
          p("El certificado puede quedar pendiente si faltan informes, si existe una cirugía reciente, si una enfermedad aún no está estable, si la medicación obliga a un análisis más prudente, si hace falta evaluación psicológica o si la situación requiere exploración presencial. En algunos casos, el médico puede concluir que, con la evidencia actual, la aptitud para esa categoría no puede confirmarse todavía."),
          ul([
            "Faltan informes o pruebas relevantes.",
            "La enfermedad no está suficientemente controlada para una emisión segura.",
            "La medicación plantea dudas razonables sobre vigilancia o reacción.",
            "La categoría solicitada exige un estándar superior al que la documentación actual permite sostener.",
          ]),
          p("La espera puede resultar frustrante, pero el certificado solo debe emitirse cuando la información disponible permite sostener una conclusión médica segura para la categoría solicitada."),
        ],
      },
    ],
    linksEyebrow: "Global Health Portugal",
    linksH2: "Siguientes pasos",
    linksLead:
      "Nuestro equipo en Portugal revisa lo que realmente define estos casos: categoría, edad, antecedentes, medicación, documentación y necesidad o no de pasos complementarios antes de remitir al IMT.",
    links: [
      { label: "Consulta y derivación para el test psicotécnico", href: href("es", "/services/certificado-medico-carta-de-conducao") },
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
        a: "No en todos los casos. En Grupo 1 no es automática por cumplir 70 años; se exige cuando existe una indicación específica, como la restricción 138. En renovaciones de Grupo 2 se exige desde los 50 años.",
      },
      {
        q: "¿Una consulta online garantiza el certificado?",
        a: "No. La valoración remota es una excepción limitada a casos en los que el médico tratante conoce el historial o dispone de toda la información clínica esencial; si no, hace falta exploración presencial.",
      },
    ],
    disclaimerTitle: "Aviso médico",
    disclaimer:
      "Escrito por el Dr Rui Diogo Rodrigues, médico de Medicina General y Familiar de Global Health Portugal. Este artículo contiene información general sobre el certificado médico para el carnet de conducir en Portugal. No sustituye una valoración clínica individual ni asesoramiento jurídico. La emisión del certificado depende de la categoría del permiso, la edad, los antecedentes clínicos y la observación médica. En una urgencia médica, llame al 112.",
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
    navLabel: "V tomto článku",
    sections: [
      {
        id: "skupiny",
        nav: "Skupiny",
        eyebrow: "Základ procesu",
        h2: "Skupina 1 a skupina 2 mají odlišná zdravotní kritéria",
        blocks: [
          lead("Kategorie oprávnění určuje, jak důkladné zdravotní posouzení je před vystavením potvrzení nutné."),
          p("Zjednodušeně řečeno, <strong>skupina 1</strong> obvykle zahrnuje lehčí a běžně používané kategorie. <strong>Skupina 2</strong> se týká těžších nebo profesních kategorií, kde by omezení řidiče mohlo mít větší dopad na další osoby. Proto bývá hodnocení přísnější a lékař musí pečlivěji zvažovat, zda zdravotní stav dovoluje bezpečné řízení v požadované kategorii."),
          ul([
            "Skupina 1 se obvykle vztahuje na lehčí, běžně používané kategorie.",
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
          lead("Potvrzení se používá při prvním vydání, při obnově i tehdy, když IMT potřebuje aktuální doklad zdravotní způsobilosti."),
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
          lead("Vystavením potvrzení lékař odborně stvrzuje, že zdravotní stav dovoluje bezpečné řízení."),
          p("Lékař musí zhodnotit, zda existuje stav, který dočasně nebo dlouhodobě snižuje schopnost řídit bezpečně. Patří sem zrak, stabilita chronických onemocnění, neurologická či kardiovaskulární anamnéza, psychiatrické obtíže, epizody ztráty vědomí, užívání návykových látek i medikace, která může ovlivnit pozornost, reakční dobu nebo motorickou kontrolu."),
          ul([
            "Určení konkrétní kategorie a odpovídající skupiny.",
            "Aktuální zdravotní historie a stabilita relevantních diagnóz.",
            "Revize léků s tlumivým, hypoglykemickým nebo jinak omezujícím účinkem.",
            "Praktické zhodnocení, zda je řízení v dané kategorii nadále bezpečné.",
            "Rozhodnutí, zda jsou potřeba další zprávy, vyšetření nebo specializované stanovisko.",
          ]),
          p("Posouzení na dálku není běžně vhodné. Výjimka je možná jen tehdy, když ošetřující lékař zná anamnézu nebo má všechny podstatné klinické informace; jinak je nutné osobní vyšetření nebo další podklady."),
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
          p('Psychotechnické vyšetření musí proběhnout osobně. Pokud je vyžadováno, Global Health pacienta odešle na <a href="' + href("cs", "/services/certificado-medico-carta-de-conducao") + '">důvěryhodnou partnerskou kliniku</a> a koordinuje další kroky.'),
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
          lead("Lékař může před rozhodnutím potřebovat další zprávy, vyšetření nebo osobní konzultaci."),
          p("Potvrzení může zůstat otevřené, pokud chybí důležité zprávy, je za vámi nedávná operace, onemocnění ještě není stabilní, medikace vyžaduje opatrnější posouzení, je třeba psychologické zhodnocení nebo je nutné osobní vyšetření. V některých případech může lékař dospět i k závěru, že současné podklady zatím neumožňují potvrdit způsobilost pro danou kategorii."),
          ul([
            "Zdravotní podklady jsou neúplné nebo zastaralé.",
            "Onemocnění není dostatečně stabilizované pro bezpečné schválení.",
            "Léky vzbuzují rozumné pochybnosti o bdělosti nebo reakční době.",
            "Požadovaná kategorie vyžaduje vyšší standard, než jaký dosavadní dokumentace unese.",
          ]),
          p("Odklad může být pro pacienta nepohodlný, ale lékař smí potvrzení vydat jen tehdy, když dostupné podklady umožňují bezpečně posoudit způsobilost pro požadovanou kategorii."),
        ],
      },
    ],
    linksEyebrow: "Global Health Portugal",
    linksH2: "Další kroky",
    linksLead:
      "Náš tým v Portugalsku posuzuje žádost podle toho, co je skutečně rozhodující: kategorie, věk, anamnéza, medikace, podklady a případná potřeba dalších kroků před předáním na IMT.",
    links: [
      { label: "Konzultace a odeslání na psychotechnické vyšetření", href: href("cs", "/services/certificado-medico-carta-de-conducao") },
      { label: "Naši lékaři v Portugalsku", href: href("cs", "/doctors") },
      { label: "Kontaktovat Global Health Portugal", href: href("cs", "/contact") },
    ],
    ctaBox: {
      h3: "Chcete vědět, zda váš případ půjde vyřešit během jedné konzultace?",
      text: "Dobře připravená konzultace rychle objasní kategorii, potřebné podklady, případnou potřebu psychologického posouzení i to, zda lze potvrzení odeslat na IMT bez dalších kroků.",
      primary: { label: "Objednat konzultaci", href: href("cs", "/services/certificado-medico-carta-de-conducao") },
      secondary: { label: "Podívat se na naše lékaře", href: href("cs", "/doctors") },
    },
    sourcesEyebrow: "Oficiální zdroje",
    sourcesH2: "Kde si pravidla ověřit",
    sourcesLead:
      "Kategorie, termíny obnovy, zdravotní požadavky i případné psychologické posouzení vycházejí z pravidel IMT a platného právního rámce. Vždy si ověřte aktuální znění u zdroje.",
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
        a: "Ne v každém případě. Ve skupině 1 nevzniká automaticky po 70. roce; vyžaduje se při zvláštní podmínce, například omezení 138. Při obnově skupiny 2 je povinné od 50 let.",
      },
      {
        q: "Může online konzultace potvrzení garantovat?",
        a: "Ne. Posouzení na dálku je výjimka jen pro případy, kdy ošetřující lékař zná anamnézu nebo má všechny podstatné klinické informace; jinak je nutné osobní vyšetření.",
      },
    ],
    disclaimerTitle: "Lékařské upozornění",
    disclaimer:
      "Text připravil Dr Rui Diogo Rodrigues, lékař všeobecného a rodinného lékařství v Global Health Portugal. Článek přináší obecné informace o lékařském potvrzení pro řidičský průkaz v Portugalsku. Nenahrazuje individuální lékařské posouzení ani právní poradenství. Možnost vystavení potvrzení závisí na kategorii oprávnění, věku, anamnéze a lékařském vyšetření. V akutní zdravotní nouzi volejte 112.",
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
    navLabel: "În acest articol",
    sections: [
      {
        id: "grupe",
        nav: "Grupe",
        eyebrow: "Baza procesului",
        h2: "Grupa 1 și grupa 2 nu implică același nivel de exigență",
        blocks: [
          lead("Categoria permisului stabilește cât de amănunțită trebuie să fie evaluarea medicală înainte de emiterea certificatului."),
          p("În linii mari, <strong>grupa 1</strong> acoperă categoriile ușoare, folosite în mod obișnuit. <strong>Grupa 2</strong> privește categoriile grele sau profesionale, unde o limitare funcțională, cognitivă sau vizuală poate avea un impact mai mare asupra altor persoane. Din acest motiv, pragul de aptitudine este mai strict, iar medicul trebuie să fie mai prudent înainte de a confirma că șoferul poate conduce în siguranță în categoria respectivă."),
          ul([
            "Grupa 1 acoperă, de regulă, categoriile ușoare folosite în mod obișnuit.",
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
          lead("Prin emiterea certificatului, medicul confirmă profesional că starea de sănătate permite condusul în siguranță."),
          p("Pentru a-l emite, medicul trebuie să verifice dacă există o condiție care reduce temporar sau pe termen lung capacitatea de a conduce în siguranță. Aici intră vederea, controlul bolilor cronice, antecedente neurologice sau cardiovasculare, tulburări psihiatrice, episoade de pierdere a conștienței, consum de substanțe și tratamente care pot afecta vigilența, timpul de reacție sau controlul funcțional."),
          ul([
            "Identificarea categoriei de permis și a grupei aplicabile.",
            "Istoric medical actualizat și stabilitatea afecțiunilor relevante.",
            "Revizuirea tratamentului cu efect sedativ, hipoglicemiant sau invalidant.",
            "Evaluarea capacității de a conduce în siguranță în categoria respectivă.",
            "Decizia dacă sunt necesare rapoarte, investigații sau opinii suplimentare.",
          ]),
          p("Evaluarea la distanță nu este adecvată ca regulă generală. Este posibilă doar ca excepție atunci când medicul curant cunoaște istoricul sau are toate informațiile clinice esențiale; altfel este necesară examinarea în persoană ori documentație suplimentară."),
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
          lead("Evaluarea psihologică este cerută doar pentru anumite categorii sau situații clinice."),
          p("În practică, <strong>evaluarea psihologică</strong> apare mai des în dosarele din <strong>grupa 2</strong> și în situațiile în care categoria, activitatea profesională sau istoricul medical ridică întrebări privind atenția, controlul comportamental, judecata sau alte aptitudini psihice relevante pentru condus. Poate fi necesară și dacă există suspiciuni de modificări cognitive sau un istoric care justifică o verificare mai detaliată."),
          p('Testul psihotehnic trebuie efectuat în persoană. Când este necesar, Global Health îndrumă pacientul către o <a href="' + href("ro", "/services/certificado-medico-carta-de-conducao") + '">clinică parteneră de încredere</a> și coordonează pașii următori.'),
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
          lead("Medicul poate avea nevoie de rapoarte, investigații sau o consultație în persoană înainte de a decide."),
          p("Certificatul poate rămâne în așteptare dacă lipsesc rapoarte importante, dacă există o operație recentă, dacă boala nu este încă stabilă, dacă medicația ridică îndoieli rezonabile, dacă este necesară evaluarea psihologică sau dacă se impune o examinare în persoană. În unele cazuri, medicul poate concluziona că dovezile actuale nu permit încă confirmarea aptitudinii pentru categoria respectivă."),
          ul([
            "Documentele medicale sunt incomplete sau depășite.",
            "Afecțiunea nu este suficient de controlată pentru o emitere sigură.",
            "Tratamentul ridică întrebări legitime despre vigilență sau timp de reacție.",
            "Categoria solicitată cere un standard mai ridicat decât susține documentația existentă.",
          ]),
          p("Așteptarea poate fi frustrantă, dar certificatul trebuie emis numai când informațiile disponibile susțin o concluzie medicală sigură pentru categoria solicitată."),
        ],
      },
    ],
    linksEyebrow: "Global Health Portugal",
    linksH2: "Pașii următori",
    linksLead:
      "Echipa noastră din Portugalia analizează exact elementele care contează: categoria, vârsta, istoricul medical, medicația, documentele și necesitatea sau nu a unor pași suplimentari înainte de trimiterea la IMT.",
    links: [
      { label: "Consultație și trimitere pentru testul psihotehnic", href: href("ro", "/services/certificado-medico-carta-de-conducao") },
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
        a: "Nu în toate cazurile. În grupa 1 nu devine automat necesară după 70 de ani; este cerută când există o indicație specifică, precum restricția 138. La reînnoirea grupei 2 este necesară de la 50 de ani.",
      },
      {
        q: "Poate o consultație online să garanteze certificatul?",
        a: "Nu. Evaluarea la distanță este o excepție, posibilă doar când medicul curant cunoaște istoricul sau are toate informațiile clinice esențiale; altfel este necesară examinarea în persoană.",
      },
    ],
    disclaimerTitle: "Avertisment medical",
    disclaimer:
      "Text scris de Dr Rui Diogo Rodrigues, medic de medicină generală și de familie la Global Health Portugal. Articolul oferă informații generale despre certificatul medical pentru permisul de conducere în Portugalia. Nu înlocuiește evaluarea clinică individuală și nici consultanța juridică. Emiterea certificatului depinde de categoria permisului, vârstă, istoricul medical și examinarea medicală. În caz de urgență medicală, sunați la 112.",
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
  authorDisplayName: "Global Health Medical Team",
  reviewerDoctorId: "cmqwnkoqe000c7gju26jtb7qt",
  reviewerDisplayName: "Dra. Margarida Domingues e Andrade",
  posts: [pt, en, es, cs, roPost, de],
};

export const PT_ATESTADO_CARTA_CONDUCAO_BODIES = () =>
  PT_ATESTADO_CARTA_CONDUCAO.posts.map((post) => renderArticle(post.article));
