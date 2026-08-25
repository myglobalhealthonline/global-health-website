/**
 * Portugal — Week 2 editorial plan: sickness-benefit amount and calculation.
 *
 * OpenSEO / DataForSEO snapshot supplied for this batch:
 * - baixa médica: 4,400 searches/month, KD 20, CPC EUR 2.51
 * - simulador baixa médica: 1,300 searches/month, KD 0, CPC EUR 0.13
 *
 * Intent boundary: this pack explains the amount, reference earnings, waiting
 * days and payment estimate. The Week 1 autodeclaração article owns the
 * process/self-certification intent, so it is linked rather than repeated.
 * Rules checked against Segurança Social and the consolidated sickness regime
 * on 2026-08-24. The 2026 IAS is EUR 537.13 (Portaria 480-A/2025/1).
 */
import { cite, lead, p, ul, warn, type Article } from "../blog-seo-2026-08/template.js";
import type { LocalePost, PostSet } from "../blog-seo-2026-08/types.js";

const SS_SICKNESS =
  "https://www.seg-social.pt/ptss/pssd/menu/trabalho/cuidados-doenca/subsidio-doenca";
const SICKNESS_LAW =
  "https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/2004-34545075-115611936";
const IAS_2026 =
  "https://diariodarepublica.pt/dr/detalhe/portaria/480-a-2025-993056222";
const SS_DIRETA = "https://app.seg-social.pt/ptss";

const site = (locale: "pt" | "en" | "de" | "es" | "cs" | "ro", path: string) =>
  `https://www.myglobalhealth.online/portugal/${locale}${path}`;

const pt: LocalePost = {
  locale: "PT",
  slug: "baixa-medica-quanto-se-recebe-como-calcular",
  title: "Baixa médica: quanto se recebe e como é calculada",
  excerpt: "As taxas do subsídio de doença em 2026, a remuneração de referência, os dias de espera e um exemplo de cálculo.",
  seoTitle: "Baixa médica: quanto se recebe em 2026",
  seoDescription: "Veja as taxas de 55% a 75%, a fórmula da remuneração de referência, os dias de espera e um exemplo de subsídio de doença em 2026.",
  category: "Baixa médica",
  article: {
    lang: "pt-PT",
    tagline: "Medicina em Portugal, explicada sem atalhos",
    categoryLabel: "Baixa médica",
    categoryHref: site("pt", "/blog"),
    eyebrow: "Portugal · Valores de 2026",
    h1: "Baixa médica: quanto se recebe e como é calculada",
    deck: "O subsídio depende da remuneração e dos dias pagos.",
    intro: "Em 2026, o <strong>subsídio de doença</strong> paga, na regra geral, 55% da remuneração de referência até ao 30.º dia, 60% do 31.º ao 90.º, 70% do 91.º ao 365.º e 75% depois. O valor final depende das remunerações registadas, dos dias pagos e da decisão da Segurança Social.",
    facts: [
      "55% até 30 dias; depois 60%, 70% e 75%",
      "A fórmula habitual usa seis meses de remunerações registadas",
      "A certificação médica não garante o subsídio",
    ],
    primaryCta: { label: "Marcar avaliação médica", href: site("pt", "/services/baixa-medica") },
    secondaryCta: { label: "Falar com a equipa", href: site("pt", "/contact") },
    panelChip: "Em resumo",
    panelParas: [
      "A conta usa remunerações declaradas, não o salário líquido.",
      "Os dias de espera reduzem uma baixa curta.",
      "A Segurança Social decide o montante.",
    ],
    author: { initials: "RR", name: "Dr Rui Diogo Rodrigues", line: "Médico de Medicina Geral e Familiar · Global Health Portugal" },
    reviewLine: "Revisão clínica prevista por Dra. Margarida Domingues e Andrade, Global Health Portugal.",
    navLabel: "Neste guia",
    sections: [
      {
        id: "percentagens",
        nav: "Percentagens",
        eyebrow: "Taxas oficiais",
        h2: "Quanto paga a baixa médica em 2026",
        blocks: [
          lead("A taxa varia com a duração total certificada da incapacidade."),
          ul([
            "<strong>Até 30 dias:</strong> 55% da remuneração de referência diária.",
            "<strong>Do 31.º ao 90.º dia:</strong> 60%.",
            "<strong>Do 91.º ao 365.º dia:</strong> 70%.",
            "<strong>Mais de 365 dias:</strong> 75%.",
          ]),
          p("Cada taxa aplica-se aos dias dessa fase. Nas taxas de 55% e 60%, certas situações familiares ou de baixos rendimentos podem acrescentar cinco pontos."),
          cite("Taxas e majorações confirmadas em 25 de agosto de 2026 no <a href=\"" + SS_SICKNESS + "\" rel=\"nofollow noopener\" target=\"_blank\">portal da Segurança Social</a> e no <a href=\"" + SICKNESS_LAW + "\" rel=\"nofollow noopener\" target=\"_blank\">regime jurídico consolidado</a>."),
        ],
      },
      {
        id: "calculo",
        nav: "Cálculo",
        eyebrow: "A fórmula",
        h2: "Como calcular uma estimativa do subsídio de doença",
        blocks: [
          lead("Na situação habitual, a remuneração diária de referência é R ÷ 180."),
          p("R soma as remunerações registadas nos primeiros seis dos oito meses anteriores. Subsídios de férias e de Natal ficam de fora; o salário líquido não substitui o registo oficial."),
          warn("Um simulador não decide o valor", "Use-o para perceber a fórmula, não como confirmação de pagamento. A Segurança Social calcula com os dados reais do beneficiário."),
        ],
      },
      {
        id: "exemplo",
        nav: "Exemplo",
        eyebrow: "Estimativa",
        h2: "Exemplo de cálculo da baixa médica",
        blocks: [
          lead("Com 7.200 € de remunerações elegíveis, a referência diária será 40 € e, a 55%, o valor diário indicativo será 22 €."),
          p("Numa incapacidade de 20 dias de um trabalhador por conta de outrem, com três dias de espera, a conta simples seria 17 × 22 € = 374 €. Exceções, baixas anteriores e o enquadramento contributivo podem alterar o resultado."),
        ],
      },
      {
        id: "espera",
        nav: "Dias de espera",
        eyebrow: "Quando começa",
        h2: "Quando começa o pagamento da baixa",
        blocks: [
          lead("Para trabalhadores por conta de outrem, o subsídio começa normalmente no 4.º dia; para trabalhadores independentes, no 11.º."),
          p("Internamento, cirurgia de ambulatório e tuberculose estão entre as situações sem espera."),
          p("Uma autodeclaração pode justificar uma ausência curta, mas não cria por si só direito ao subsídio. O nosso guia sobre <a href=\"https://www.myglobalhealth.online/portugal/pt/blog/autodeclaracao-de-doenca-ou-baixa-medica\">autodeclaração e baixa médica</a> explica essa diferença sem repetir o cálculo desta página."),
        ],
      },
      {
        id: "minimo",
        nav: "Mínimo legal",
        eyebrow: "Valor de base",
        h2: "IAS, mínimo diário e majoração",
        blocks: [
          lead("O IAS de 2026 é 537,13 €. Na regra geral, o mínimo diário do subsídio ronda 5,37 €, salvo se a própria remuneração de referência for inferior."),
          p("Nas taxas de 55% e 60%, a Segurança Social verifica se existe direito à majoração legal de cinco pontos."),
          cite("IAS confirmado pela <a href=\"" + IAS_2026 + "\" rel=\"nofollow noopener\" target=\"_blank\">Portaria n.º 480-A/2025/1</a>."),
        ],
      },
      {
        id: "confirmar",
        nav: "Confirmar",
        eyebrow: "Próximo passo",
        h2: "O que confirmar antes de contar com o valor",
        blocks: [
          lead("Tenha consigo as datas do CIT, o regime profissional e as remunerações registadas."),
          ul([
            "Confirme a data de início e a duração certificada.",
            "Veja os meses usados na remuneração de referência.",
            "Identifique dias de espera ou uma exceção aplicável.",
            "Consulte o processamento na <a href=\"" + SS_DIRETA + "\" rel=\"nofollow noopener\" target=\"_blank\">Segurança Social Direta</a>.",
          ]),
          p("Valor diferente, atraso ou indeferimento? Verifique remunerações e dias na Segurança Social Direta e peça esclarecimento à Segurança Social. A clínica esclarece a certificação, não o cálculo ou recurso da prestação."),
          p("Se precisa de avaliação clínica da incapacidade, conheça o serviço de <a href=\"" + site("pt", "/services/baixa-medica") + "\">baixa médica online em Portugal</a>. O médico avalia a situação clínica; não pode garantir um CIT, o direito ao subsídio ou um montante."),
        ],
      },
    ],
    linksEyebrow: "Global Health Portugal",
    linksH2: "Informação e avaliação",
    linksLead: "A clínica avalia; a Segurança Social decide.",
    links: [
      { label: "Avaliação para baixa médica", href: site("pt", "/services/baixa-medica") },
      { label: "Autodeclaração ou baixa médica", href: site("pt", "/blog/autodeclaracao-de-doenca-ou-baixa-medica") },
      { label: "Médicos em Portugal", href: site("pt", "/doctors") },
      { label: "Contactar a Global Health", href: site("pt", "/contact") },
    ],
    ctaBox: {
      h3: "Precisa de avaliação médica?",
      text: "Um médico avalia a incapacidade; a Segurança Social decide o subsídio.",
      primary: { label: "Marcar consulta", href: site("pt", "/services/baixa-medica") },
      secondary: { label: "Contactar", href: site("pt", "/contact") },
    },
    sourcesEyebrow: "Fontes oficiais",
    sourcesH2: "Regras consultadas",
    sourcesLead: "Regras verificadas em 25 de agosto de 2026.",
    sources: [
      { label: "Segurança Social — Subsídio de Doença", href: SS_SICKNESS },
      { label: "Diário da República — regime consolidado", href: SICKNESS_LAW },
      { label: "Segurança Social Direta — consultar o processo", href: SS_DIRETA },
    ],
    sourcesNote: "Confirme a decisão na Segurança Social Direta.",
    faqEyebrow: "Perguntas frequentes",
    faqH2: "Dúvidas sobre o valor da baixa",
    faqs: [
      { q: "Quanto se recebe nos primeiros 30 dias?", a: "Na regra geral, 55% da remuneração de referência diária nos dias pagos. Não é necessariamente 55% do salário líquido." },
      { q: "Os primeiros três dias são pagos?", a: "Em regra, não para trabalhadores por conta de outrem. Algumas situações oficiais dispensam o período de espera." },
      { q: "A autodeclaração dá direito ao subsídio?", a: "Não por si só. Justificar uma falta e cumprir os requisitos de uma prestação são questões diferentes." },
      { q: "E se o valor estiver errado ou não chegar?", a: "Consulte remunerações, dias e decisão na Segurança Social Direta e peça esclarecimento à Segurança Social. A clínica não decide o cálculo nem o recurso." },
    ],
    disclaimerTitle: "Informação médica e social",
    disclaimer: "Artigo AI-assisted, preparado para revisão editorial nativa e clínica. Informação geral sobre Portugal em 2026; não substitui aconselhamento médico, jurídico ou laboral, nem uma decisão da Segurança Social.",
  } satisfies Article,
};

const en: LocalePost = {
  locale: "EN",
  slug: "portugal-sick-pay-how-much-calculation",
  title: "Portugal sick pay: how much you receive and how it is calculated",
  excerpt: "A practical 2026 guide to Portuguese sickness benefit rates, reference earnings, waiting days and realistic estimates for employees and expats.",
  seoTitle: "Portugal sick pay: rates and calculation (2026)",
  seoDescription: "Learn Portugal's 55%–75% sickness benefit rates, the reference-earnings formula and how waiting days affect what you receive in 2026.",
  category: "Sick leave in Portugal",
  article: {
    lang: "en-PT",
    tagline: "Portuguese healthcare, made clearer",
    categoryLabel: "Sick leave",
    categoryHref: site("en", "/blog"),
    eyebrow: "Portugal · 2026 rates",
    h1: "How much does Portuguese sick pay cover?",
    deck: "The headline percentage is only one part of the calculation. Registered earnings, the length of leave and unpaid waiting days determine the actual transfer.",
    intro: "For an ordinary sickness absence in Portugal, <strong>subsídio de doença</strong> generally pays <strong>55% of daily reference earnings for the first 30 days</strong>, 60% from day 31 to day 90, 70% from day 91 to day 365 and 75% after that. It is not calculated by taking the net salary from your latest payslip and applying one percentage. Segurança Social first establishes daily reference earnings from registered pay, then applies the relevant rate only to payable days. This distinction is especially important for people new to Portugal or comparing the system with sick pay in another country.",
    facts: ["55% for up to 30 days", "Reference pay usually draws on six registered months", "Portugal's 2026 IAS is €537.13"],
    primaryCta: { label: "Book a medical assessment", href: site("en", "/services/baixa-medica") },
    secondaryCta: { label: "Contact the clinic", href: site("en", "/contact") },
    panelChip: "What this guide calculates",
    panelParas: ["The statutory percentage for each stage of an absence.", "The earnings window behind the daily reference amount.", "Why a waiting period can make a correct daily rate produce a smaller first payment."],
    author: { initials: "RR", name: "Dr Rui Diogo Rodrigues", line: "General practitioner · Global Health Portugal" },
    reviewLine: "Clinical review planned by Dra. Margarida Domingues e Andrade, Global Health Portugal.",
    navLabel: "In this guide",
    sections: [
      { id: "rates", nav: "Rates", eyebrow: "Official scale", h2: "Portuguese sickness benefit rates in 2026", blocks: [
        lead("The rate rises as one certified period of incapacity becomes longer. The duration band applies to the days in that band."),
        ul(["<strong>Days 1–30:</strong> 55% of daily reference earnings.", "<strong>Days 31–90:</strong> 60%.", "<strong>Days 91–365:</strong> 70%.", "<strong>After day 365:</strong> 75%."]),
        p("A longer absence does not normally cause all earlier days to be recalculated at the later percentage. Nor does a bank transfer necessarily represent one complete month: payments may group a particular number of approved days. Always compare the decision notice and covered dates rather than a salary calendar."),
        cite(`Rates checked on 24 August 2026 against <a href="${SS_SICKNESS}" rel="nofollow noopener" target="_blank">Segurança Social's sickness-benefit information</a> and Portugal's <a href="${SICKNESS_LAW}" rel="nofollow noopener" target="_blank">consolidated sickness-protection legislation</a>.`),
      ] },
      { id: "reference-pay", nav: "Reference pay", eyebrow: "Step 1", h2: "How daily reference earnings are worked out", blocks: [
        lead("The usual formula is R ÷ 180. R is the eligible registered pay in the first six calendar months of the eight months before the month when incapacity began."),
        p("The legal wording is easier to understand with dates. If incapacity starts in August, the second month before it is June; the usual six-month earnings window sits before June. Segurança Social uses the remuneration recorded in its system, not an informal estimate of what the employee usually takes home."),
        p("Holiday pay, Christmas pay and payments of a similar nature are excluded from R. Net pay is also the wrong starting point because tax, social-security deductions and irregular additions can make the payslip deposit materially different from registered gross remuneration."),
        warn("Do not enter last month's net salary into a 55% calculator", "It can produce a persuasive but wrong number. Check the remuneration history in Segurança Social Direta and the dates used in the official calculation."),
      ] },
      { id: "worked-example", nav: "Example", eyebrow: "Step 2", h2: "A worked Portuguese sick-pay estimate", blocks: [
        lead("Suppose eligible registered remuneration totals €7,200 across the six-month window. Daily reference earnings would be €7,200 ÷ 180 = €40."),
        p("For a 20-day absence in the 55% band, the indicative daily benefit is €22. An employee normally has a three-day waiting period, leaving 17 payable days in this simplified example: 17 × €22 = €374. That is an illustration, not an entitlement decision or payment promise."),
        p("The estimate changes when leave crosses a rate boundary, a different waiting rule applies, remuneration records are incomplete, or a recent sickness spell is treated as relevant to duration. Those details explain why a generic simulador baixa médica may not match the official result."),
        ul(["Identify the correct registered-pay window.", "Calculate the applicable daily reference amount.", "Apply 55%, 60%, 70% or 75% to the relevant days.", "Remove waiting days and any days that are not payable."]),
      ] },
      { id: "waiting-days", nav: "Waiting days", eyebrow: "The common surprise", h2: "When payment starts", blocks: [
        lead("Employees are generally paid from the fourth day of incapacity, after a three-day wait. Self-employed workers are generally paid from the eleventh day."),
        p("Other insured groups can have different waits. Official guidance also identifies no-wait situations, including hospital admission, outpatient surgery and tuberculosis. Your employment category and the certified circumstances therefore matter as much as the percentage."),
        p("A short self-declaration may justify time away from work but does not itself establish a cash-benefit entitlement. Our separate guide explains the boundary between an <a href=\"https://www.myglobalhealth.online/portugal/en/blog/autodeclaracao-de-doenca-ou-baixa-medica\">autodeclaração de doença and medical sick leave</a> without repeating the payment calculation here."),
        warn("Employer sick pay and state benefit are not interchangeable", "A collective agreement, employer policy or private insurance may provide something additional. It does not alter the statutory Segurança Social calculation described here."),
      ] },
      { id: "floor-uplift", nav: "Floor and uplift", eyebrow: "2026 details", h2: "The daily floor and the five-point uplift", blocks: [
        lead("Portugal's IAS is €537.13 in 2026. The ordinary statutory daily floor is 30% of IAS divided by 30, approximately €5.37."),
        p("If daily reference earnings themselves are lower than that floor, the lower reference amount limits payment. Because IAS changes annually, a calculator carrying the 2025 figure should not be used to settle a 2026 estimate."),
        p("A five-percentage-point uplift may apply while the ordinary rate is 55% or 60% if one of the legal conditions is met. These include reference remuneration at or below €500, a household with at least three descendants within the specified age rules, or a descendant receiving the disability-related family allowance supplement. Uplifts are not stacked."),
        cite(`The 2026 IAS of €537.13 was set by <a href="${IAS_2026}" rel="nofollow noopener" target="_blank">Portaria 480-A/2025/1</a>, effective 1 January 2026.`),
      ] },
      { id: "check-estimate", nav: "Check your estimate", eyebrow: "Useful documents", h2: "What to gather before relying on a number", blocks: [
        lead("A useful estimate begins with the contribution record and certified dates, not simply the salary in the employment contract."),
        ul(["The exact first day and certified duration of incapacity.", "Whether you are employed, self-employed or insured under another category.", "The remuneration entries in the relevant months.", "Any hospital admission, outpatient surgery or other waiting-period exception.", "A recent earlier sickness spell that may affect duration treatment."]),
        p(`If you need a clinical assessment, see Global Health Portugal's <a href="${site("en", "/services/baixa-medica")}">online sick-leave consultation</a>. A clinician can assess incapacity and the appropriate document; they cannot guarantee that Segurança Social will award or calculate a particular benefit.`),
      ] },
    ],
    linksEyebrow: "Global Health Portugal", linksH2: "Clinical help in Portugal", linksLead: "The clinic assesses health and incapacity. Segurança Social decides benefit entitlement and payment.",
    links: [{ label: "Medical sick-leave assessment", href: site("en", "/services/baixa-medica") }, { label: "Doctors in Portugal", href: site("en", "/doctors") }, { label: "Contact Global Health Portugal", href: site("en", "/contact") }],
    ctaBox: { h3: "Do you need a medical assessment?", text: "A doctor can assess the illness and explain which document is clinically appropriate. State-benefit entitlement remains a Segurança Social decision.", primary: { label: "Book an assessment", href: site("en", "/services/baixa-medica") }, secondary: { label: "Contact us", href: site("en", "/contact") } },
    sourcesEyebrow: "Official sources", sourcesH2: "Rules used for this guide", sourcesLead: "Rates, formula and 2026 IAS were checked in official Portuguese sources on 24 August 2026.",
    sources: [{ label: "Segurança Social — Sickness benefit", href: SS_SICKNESS }, { label: "Diário da República — consolidated regime", href: SICKNESS_LAW }, { label: "Diário da República — 2026 IAS", href: IAS_2026 }],
    sourcesNote: "Rules can change. Use Segurança Social Direta for the calculation and status of your own claim.",
    faqEyebrow: "Frequently asked questions", faqH2: "Portuguese sick-pay questions", faqs: [
      { q: "How much is Portuguese sick pay for the first 30 days?", a: "The ordinary rate is 55% of daily reference earnings for payable days. It is not necessarily 55% of net monthly salary, and waiting days may reduce the first payment." },
      { q: "How can I estimate sickness benefit in Portugal?", a: "Use the registered remuneration in the legal reference window, calculate the daily reference amount, apply the rate for each duration band and exclude non-payable waiting days. Treat the result as indicative." },
      { q: "Are the first three sick days paid?", a: "Usually not for employees; ordinary benefit begins on day four. Hospital admission, outpatient surgery, tuberculosis and other specified circumstances can remove the wait." },
      { q: "Does the rate increase after 30 days?", a: "Yes. The ordinary scale moves to 60% for days 31–90, 70% for days 91–365 and 75% after day 365. Earlier days are not simply repriced at the newest rate." },
      { q: "Does an autodeclaração create a sick-pay claim?", a: "Not by itself. It can justify a short absence, while cash benefit depends on the applicable certification, contribution and eligibility rules." },
    ],
    disclaimerTitle: "Medical and social-security information", disclaimer: "AI-assisted draft for native editorial and clinical review. It provides general information about Portugal in 2026 and is not personal medical, legal, employment or social-security advice. Document issuance and benefit entitlement depend on individual assessment and official rules.",
  } satisfies Article,
};

const de: LocalePost = {
  locale: "DE",
  slug: "krankengeld-portugal-hoehe-berechnung",
  title: "Krankengeld in Portugal: Höhe und Berechnung der baixa médica",
  excerpt: "Die portugiesischen Leistungssätze 2026, das Referenzeinkommen, Karenztage und eine realistische Beispielrechnung für Beschäftigte und Zugewanderte.",
  seoTitle: "Krankengeld Portugal: Höhe und Berechnung 2026",
  seoDescription: "So berechnet Portugal 2026 das Krankengeld: 55–75 %, Referenzeinkommen, Karenztage, Mindestbetrag und eine nachvollziehbare Beispielrechnung.",
  category: "Krankmeldung in Portugal",
  article: {
    lang: "de-PT", tagline: "Gesundheitsversorgung in Portugal verständlich erklärt", categoryLabel: "Krankmeldung", categoryHref: site("de", "/blog"), eyebrow: "Portugal · Sätze 2026", h1: "Wie hoch ist das Krankengeld in Portugal?", deck: "Der Prozentsatz allein beantwortet die Frage nicht. Entscheidend sind gemeldetes Einkommen, Dauer und unbezahlte Karenztage.",
    intro: "Beim regulären portugiesischen <strong>subsídio de doença</strong> gelten 2026 grundsätzlich <strong>55 % des täglichen Referenzeinkommens für die ersten 30 Tage</strong>, 60 % für Tag 31 bis 90, 70 % für Tag 91 bis 365 und 75 % danach. Berechnungsgrundlage ist nicht das letzte Nettogehalt. Die Segurança Social ermittelt zunächst ein tägliches Referenzeinkommen aus den registrierten Entgelten und wendet den Satz auf die tatsächlich zahlbaren Tage an. Wer aus Deutschland, Österreich oder der Schweiz nach Portugal gezogen ist, sollte portugiesische baixa médica daher nicht mit der Entgeltfortzahlung des früheren Wohnlandes gleichsetzen.",
    facts: ["55 % bis Tag 30", "Meist sechs registrierte Entgeltmonate als Grundlage", "IAS 2026: 537,13 €"],
    primaryCta: { label: "Ärztliche Beurteilung buchen", href: site("de", "/services/baixa-medica") }, secondaryCta: { label: "Praxis kontaktieren", href: site("de", "/contact") }, panelChip: "Darum weicht die Zahlung ab", panelParas: ["Die Leistung ist ein Tagesbetrag, auch wenn mehrere Tage zusammen überwiesen werden.", "Maßgeblich sind registrierte Bruttoentgelte in einem gesetzlichen Zeitraum.", "Karenztage können die erste Zahlung deutlich verkleinern."],
    author: { initials: "RR", name: "Dr Rui Diogo Rodrigues", line: "Arzt für Allgemeinmedizin · Global Health Portugal" }, reviewLine: "Klinische Prüfung vorgesehen durch Dra. Margarida Domingues e Andrade, Global Health Portugal.", navLabel: "In diesem Ratgeber",
    sections: [
      { id: "saetze", nav: "Leistungssätze", eyebrow: "Offizielle Staffel", h2: "Wie viel die baixa médica 2026 zahlt", blocks: [lead("Mit der Dauer einer zusammenhängenden bescheinigten Arbeitsunfähigkeit steigt der Leistungssatz."), ul(["<strong>Bis 30 Tage:</strong> 55 % des täglichen Referenzeinkommens.", "<strong>Tag 31 bis 90:</strong> 60 %.", "<strong>Tag 91 bis 365:</strong> 70 %.", "<strong>Nach Tag 365:</strong> 75 %."]), p("Der höhere Satz für einen späteren Abschnitt bewertet die früheren Tage nicht automatisch neu. Auch eine Überweisung ist nicht zwingend ein kompletter Kalendermonat. Prüfen Sie deshalb, welche bewilligten Tage der Bescheid umfasst, statt die Zahlung lediglich mit dem Monatsgehalt zu vergleichen."), cite(`Stand 24. August 2026: <a href="${SS_SICKNESS}" rel="nofollow noopener" target="_blank">Segurança Social zum Krankengeld</a> und das <a href="${SICKNESS_LAW}" rel="nofollow noopener" target="_blank">konsolidierte portugiesische Regelwerk</a>.`)] },
      { id: "referenzeinkommen", nav: "Referenzeinkommen", eyebrow: "Schritt 1", h2: "Wie das tägliche Referenzeinkommen entsteht", blocks: [lead("In der üblichen Konstellation lautet die Formel R ÷ 180. R ist die Summe der registrierten Entgelte in den ersten sechs der acht Monate vor dem Monat, in dem die Arbeitsunfähigkeit beginnt."), p("Beginnt die Arbeitsunfähigkeit beispielsweise im August, ist Juni der zweite vorhergehende Monat. Der typische Sechsmonatszeitraum liegt davor. Diese zeitliche Verschiebung verhindert, dass ein noch nicht vollständig gemeldeter Monat die Berechnung verzerrt."), p("Urlaubs- und Weihnachtsgeld sowie vergleichbare Sonderzahlungen werden nicht in R einbezogen. Das Nettogehalt auf dem Kontoauszug ist ebenfalls ungeeignet: Steuern, Sozialabgaben und unregelmäßige Zuschläge unterscheiden sich von den bei der Segurança Social registrierten Entgelten."), warn("Nicht einfach 55 % des letzten Nettogehalts rechnen", "Nutzen Sie die Entgeltübersicht in Segurança Social Direta. Eine Rechnerseite ohne den richtigen Referenzzeitraum liefert nur scheinbar genaue Ergebnisse.")] },
      { id: "beispiel", nav: "Beispiel", eyebrow: "Schritt 2", h2: "Beispiel für eine Krankengeldberechnung", blocks: [lead("Angenommen, im maßgeblichen Sechsmonatszeitraum sind 7.200 € an berücksichtigungsfähigem Entgelt registriert. Das tägliche Referenzeinkommen beträgt 7.200 ÷ 180 = 40 €."), p("Bei 20 Krankheitstagen im 55-Prozent-Abschnitt ergibt sich ein vorläufiger Tagessatz von 22 €. Für Arbeitnehmer gelten im Regelfall drei Karenztage. In der vereinfachten Rechnung bleiben 17 zahlbare Tage: 17 × 22 € = 374 €. Das Beispiel ist keine Leistungszusage."), p("Das Ergebnis verändert sich bei einem Wechsel in die nächste Dauerstufe, einem anderen Versicherungsstatus, unvollständigen Entgeltzeiten oder einer kurz zuvor beendeten Arbeitsunfähigkeit. Deshalb kann ein allgemeiner simulador baixa médica von der amtlichen Abrechnung abweichen."), ul(["Richtigen Entgeltzeitraum bestimmen.", "Tägliches Referenzeinkommen berechnen.", "Den Satz der jeweiligen Dauerstufe anwenden.", "Karenztage und andere nicht zahlbare Tage abziehen."])] },
      { id: "karenz", nav: "Karenztage", eyebrow: "Häufigster Unterschied", h2: "Ab welchem Tag gezahlt wird", blocks: [lead("Arbeitnehmer erhalten die reguläre Leistung meist ab dem vierten Tag; Selbstständige meist ab dem elften Tag."), p("Für andere Versichertengruppen können andere Wartezeiten gelten. Laut offizieller Information entfällt die Karenz unter anderem bei stationärer Aufnahme, ambulanter Operation und Tuberkulose. Beschäftigungsstatus und bescheinigter Grund gehören daher in jede seriöse Schätzung."), p("Eine kurze Selbsterklärung kann eine Abwesenheit rechtfertigen, begründet allein aber keinen Geldleistungsanspruch. Unser eigener Ratgeber erklärt den Unterschied zwischen <a href=\"https://www.myglobalhealth.online/portugal/de/blog/krankmeldung-selbsterklaerung-portugal\">autodeclaração de doença und ärztlicher baixa médica</a>."), warn("Arbeitgeberleistung und Sozialleistung trennen", "Tarifvertrag, Unternehmensregelung oder private Versicherung können zusätzliche Zahlungen vorsehen. Sie ändern die hier beschriebene gesetzliche Berechnung nicht.")] },
      { id: "minimum", nav: "Minimum", eyebrow: "Werte 2026", h2: "Tagesminimum und mögliche Erhöhung", blocks: [lead("Der portugiesische Sozialindex IAS beträgt 2026 537,13 €. Das reguläre gesetzliche Tagesminimum entspricht 30 % des IAS geteilt durch 30, also rund 5,37 €."), p("Liegt das tägliche Referenzeinkommen selbst darunter, begrenzt dieser niedrigere Referenzbetrag die Leistung. Weil der IAS jährlich angepasst wird, ist ein Rechner mit einem Wert aus 2025 für eine Berechnung 2026 nicht verlässlich."), p("In den Stufen von 55 % und 60 % kann der Satz unter gesetzlichen Voraussetzungen um fünf Prozentpunkte steigen. Dazu zählen ein Referenzeinkommen bis 500 €, mindestens drei Nachkommen innerhalb der festgelegten Altersgrenzen oder ein Nachkomme mit dem entsprechenden Behinderungszuschlag zur Familienleistung. Mehrere Gründe werden nicht addiert."), cite(`Der IAS 2026 wurde durch die <a href="${IAS_2026}" rel="nofollow noopener" target="_blank">Portaria 480-A/2025/1</a> auf 537,13 € festgesetzt.`)] },
      { id: "pruefen", nav: "Schätzung prüfen", eyebrow: "Unterlagen", h2: "Was Sie für eine brauchbare Schätzung benötigen", blocks: [lead("Eine gute Schätzung beginnt mit dem Beitragskonto und den bescheinigten Daten, nicht nur mit dem Arbeitsvertrag."), ul(["Genauer Beginn und bescheinigte Dauer der Arbeitsunfähigkeit.", "Status als Arbeitnehmer, Selbstständiger oder andere Versicherungskategorie.", "Registrierte Entgelte der maßgeblichen Monate.", "Stationäre Aufnahme, ambulante Operation oder andere Karenzausnahme.", "Eine kürzlich beendete Krankheitsphase, die die Dauerberechnung beeinflussen könnte."]), p(`Wenn Sie eine ärztliche Beurteilung benötigen, finden Sie hier die <a href="${site("de", "/services/baixa-medica")}">Online-Sprechstunde zur baixa médica in Portugal</a>. Ein Arzt beurteilt Erkrankung und Arbeitsunfähigkeit; eine bestimmte Entscheidung oder Zahlung der Segurança Social kann er nicht garantieren.`)] },
    ],
    linksEyebrow: "Global Health Portugal", linksH2: "Ärztliche Hilfe in Portugal", linksLead: "Die Praxis beurteilt Gesundheit und Arbeitsunfähigkeit. Über Anspruch und Betrag entscheidet die Segurança Social.", links: [{ label: "Ärztliche Beurteilung zur baixa médica", href: site("de", "/services/baixa-medica") }, { label: "Ärzte in Portugal", href: site("de", "/doctors") }, { label: "Global Health Portugal kontaktieren", href: site("de", "/contact") }],
    ctaBox: { h3: "Benötigen Sie eine ärztliche Beurteilung?", text: "Ein Arzt kann die Erkrankung beurteilen und das geeignete Dokument erklären. Der Leistungsanspruch bleibt eine Entscheidung der Segurança Social.", primary: { label: "Termin buchen", href: site("de", "/services/baixa-medica") }, secondary: { label: "Kontakt", href: site("de", "/contact") } },
    sourcesEyebrow: "Offizielle Quellen", sourcesH2: "Grundlage dieses Ratgebers", sourcesLead: "Sätze, Formel und IAS wurden am 24. August 2026 in portugiesischen Originalquellen geprüft.", sources: [{ label: "Segurança Social — Subsídio de Doença", href: SS_SICKNESS }, { label: "Diário da República — konsolidiertes Recht", href: SICKNESS_LAW }, { label: "Diário da República — IAS 2026", href: IAS_2026 }], sourcesNote: "Regeln können sich ändern. Maßgeblich sind der persönliche Bescheid und Segurança Social Direta.",
    faqEyebrow: "Häufige Fragen", faqH2: "Krankengeld in Portugal", faqs: [
      { q: "Wie viel Krankengeld gibt es in Portugal in den ersten 30 Tagen?", a: "Regulär sind es 55 % des täglichen Referenzeinkommens für zahlbare Tage. Das ist nicht zwingend 55 % des Nettomonatslohns; Karenztage können die erste Zahlung reduzieren." },
      { q: "Wie kann ich die baixa médica berechnen?", a: "Nehmen Sie die registrierten Entgelte des gesetzlichen Zeitraums, berechnen Sie den Tagessatz, wenden Sie die jeweilige Prozentstufe an und ziehen Sie nicht zahlbare Karenztage ab. Das Ergebnis bleibt eine Schätzung." },
      { q: "Werden die ersten drei Krankheitstage bezahlt?", a: "Für Arbeitnehmer im Regelfall nicht; die Zahlung beginnt am vierten Tag. Bei stationärer Aufnahme, ambulanter Operation, Tuberkulose und weiteren geregelten Fällen kann die Karenz entfallen." },
      { q: "Steigt das Krankengeld nach 30 Tagen?", a: "Ja. Der reguläre Satz beträgt für Tag 31–90 60 %, für Tag 91–365 70 % und danach 75 %. Frühere Tage werden dadurch nicht pauschal neu bewertet." },
      { q: "Reicht eine autodeclaração für Krankengeld?", a: "Nein, nicht allein. Sie kann eine kurze Abwesenheit rechtfertigen. Die Geldleistung hängt von Beitrags-, Anspruchs- und Bescheinigungsregeln ab." },
    ],
    disclaimerTitle: "Medizinischer und sozialrechtlicher Hinweis", disclaimer: "KI-unterstützter Entwurf für muttersprachliche redaktionelle und klinische Prüfung. Allgemeine Information zu Portugal im Jahr 2026, keine persönliche medizinische, rechtliche, arbeitsrechtliche oder sozialrechtliche Beratung. Dokument und Leistungsanspruch hängen vom Einzelfall ab.",
  } satisfies Article,
};

const es: LocalePost = {
  locale: "ES",
  slug: "baja-medica-portugal-cuanto-se-cobra-calculo",
  title: "Baja médica en Portugal: cuánto se cobra y cómo se calcula",
  excerpt: "Guía para residentes en Portugal sobre los porcentajes de 2026, la remuneración de referencia, los días de espera y una simulación prudente.",
  seoTitle: "Baja médica en Portugal: cálculo y cuantía 2026",
  seoDescription: "Cómo calcula Portugal el subsidio por enfermedad en 2026: porcentajes del 55% al 75%, salario de referencia, carencia y ejemplo práctico.",
  category: "Baja médica en Portugal",
  article: {
    lang: "es-PT", tagline: "Sanidad portuguesa explicada para quienes viven aquí", categoryLabel: "Baja médica", categoryHref: site("es", "/blog"), eyebrow: "Portugal · Importes de 2026", h1: "¿Cuánto se cobra de baja médica en Portugal?", deck: "No basta con aplicar un porcentaje a la última nómina. La Segurança Social parte de las remuneraciones declaradas y descuenta los días que no generan pago.",
    intro: "En Portugal, el <strong>subsídio de doença</strong> ordinario paga en 2026 el <strong>55% de la remuneración diaria de referencia durante los primeros 30 días</strong>, el 60% entre los días 31 y 90, el 70% entre los días 91 y 365 y el 75% después. La expresión española “baja médica” ayuda a encontrar el tema, pero la prestación portuguesa tiene reglas propias: no se calcula sobre el sueldo neto del último mes ni funciona igual que la incapacidad temporal española. La Segurança Social portuguesa decide el derecho, fija la base diaria y paga únicamente los días reconocidos después de la carencia aplicable.",
    facts: ["55% hasta el día 30", "La base habitual usa seis meses declarados", "IAS portugués de 2026: 537,13 €"],
    primaryCta: { label: "Pedir valoración médica", href: site("es", "/services/baixa-medica") }, secondaryCta: { label: "Contactar con la clínica", href: site("es", "/contact") }, panelChip: "La cuenta, sin falsas promesas", panelParas: ["El porcentaje cambia con la duración certificada.", "La base sale del historial de remuneraciones portugués.", "Los días de espera explican por qué la primera transferencia suele ser menor de lo esperado."],
    author: { initials: "RR", name: "Dr Rui Diogo Rodrigues", line: "Médico de Medicina General y Familiar · Global Health Portugal" }, reviewLine: "Revisión clínica prevista por la Dra. Margarida Domingues e Andrade, Global Health Portugal.", navLabel: "En esta guía",
    sections: [
      { id: "porcentajes", nav: "Porcentajes", eyebrow: "Escala oficial", h2: "Qué porcentaje paga Portugal en cada tramo", blocks: [lead("La duración total de la incapacidad certificada determina el tramo. El aumento se aplica a los días que caen en ese tramo, no rehace toda la baja desde el principio."), ul(["<strong>Días 1 a 30:</strong> 55% de la remuneración diaria de referencia.", "<strong>Días 31 a 90:</strong> 60%.", "<strong>Días 91 a 365:</strong> 70%.", "<strong>A partir del día 366:</strong> 75%."]), p("Una transferencia puede agrupar un número concreto de días y no coincidir con un mes natural. Para entenderla hay que mirar las fechas procesadas en la resolución o en Segurança Social Direta. Tampoco conviene comparar directamente este porcentaje con el sistema español: el nombre cotidiano se parece, pero pagador, fórmula y carencia son portugueses."), cite(`Porcentajes comprobados el 24 de agosto de 2026 en la información de <a href="${SS_SICKNESS}" rel="nofollow noopener" target="_blank">Segurança Social</a> y en el <a href="${SICKNESS_LAW}" rel="nofollow noopener" target="_blank">régimen jurídico consolidado</a>.`)] },
      { id: "base", nav: "Base diaria", eyebrow: "Primer cálculo", h2: "De dónde sale la remuneración de referencia", blocks: [lead("En el supuesto habitual, la remuneración diaria de referencia se expresa como R ÷ 180. R suma las remuneraciones registradas en los primeros seis de los ocho meses anteriores al mes de inicio."), p("Si la incapacidad empieza en agosto, el segundo mes anterior es junio y la ventana ordinaria de seis meses queda antes de junio. La Seguridad Social portuguesa usa lo que figura en su registro contributivo, no una estimación del salario habitual ni lo ingresado en la cuenta bancaria."), p("Las pagas de vacaciones, Navidad y conceptos de naturaleza equivalente se excluyen. El neto de la nómina tampoco sirve: retenciones, cotizaciones y complementos irregulares hacen que sea distinto de la remuneración registrada que exige la fórmula."), warn("Un simulador necesita datos portugueses", "Introducir el último sueldo neto y multiplicar por 55% produce un resultado fácil de leer, pero no necesariamente correcto. Consulte primero las remuneraciones de Segurança Social Direta.")] },
      { id: "ejemplo", nav: "Ejemplo", eyebrow: "Simulación", h2: "Ejemplo prudente de cálculo", blocks: [lead("Supongamos que las remuneraciones válidas suman 7.200 € en los seis meses elegidos. La referencia diaria sería 7.200 ÷ 180 = 40 €."), p("Para una incapacidad de 20 días, todos dentro del tramo del 55%, el importe diario orientativo sería 22 €. Una persona trabajadora por cuenta ajena tiene normalmente tres días de espera. En este ejemplo simplificado habría 17 días pagados: 17 × 22 € = 374 €. No es una garantía ni sustituye la resolución oficial."), p("La cifra cambia si la baja cruza el día 30, si el trabajador es autónomo, si faltan meses de cotización, si existe una excepción a la carencia o si una incapacidad reciente influye en la duración acumulada. Por eso dos personas con un salario contractual parecido pueden cobrar cantidades distintas."), ul(["Identifique la ventana correcta de remuneraciones.", "Calcule la referencia diaria aplicable.", "Separe los días por tramo porcentual.", "Reste la carencia y cualquier día no pagadero."])] },
      { id: "carencia", nav: "Carencia", eyebrow: "Días sin prestación", h2: "Cuándo empieza a pagar la Segurança Social", blocks: [lead("Para trabajadores por cuenta ajena, el pago empieza normalmente el cuarto día. Para autónomos, suele comenzar el undécimo."), p("Otros regímenes tienen esperas diferentes. La información oficial contempla pago desde el primer día en determinadas situaciones, como ingreso hospitalario, cirugía ambulatoria o tuberculosis. La categoría contributiva y lo certificado clínicamente deben formar parte de cualquier simulación seria."), p("La autodeclaración portuguesa puede justificar una ausencia corta, pero no abre por sí sola el derecho económico. Nuestra guía separada explica la <a href=\"https://www.myglobalhealth.online/portugal/es/blog/autodeclaracion-enfermedad-baja-medica-portugal\">autodeclaração de doença y la baja médica en Portugal</a>; este artículo se mantiene centrado en la cuantía."), warn("No confunda prestación y salario", "La empresa, un convenio o un seguro privado pueden prever otro pago. Eso no cambia el cálculo legal del subsídio de doença por la Segurança Social.")] },
      { id: "minimo", nav: "Mínimo", eyebrow: "Valores 2026", h2: "Mínimo diario y aumento de cinco puntos", blocks: [lead("El IAS portugués es 537,13 € en 2026. El mínimo diario ordinario equivale al 30% del IAS dividido entre 30: aproximadamente 5,37 €."), p("Si la propia remuneración diaria de referencia es inferior, esa base menor limita la prestación. El IAS cambia cada año, de modo que una calculadora que conserve el dato de 2025 no debe utilizarse para cerrar una previsión de 2026."), p("En los tramos del 55% y 60% puede corresponder un aumento de cinco puntos porcentuales cuando se cumple una condición legal: remuneración de referencia de hasta 500 €, tres o más descendientes dentro de los límites de edad, o un descendiente con la bonificación por discapacidad de la prestación familiar. Los motivos no se acumulan entre sí."), cite(`El IAS de 537,13 € fue fijado para 2026 por la <a href="${IAS_2026}" rel="nofollow noopener" target="_blank">Portaria n.º 480-A/2025/1</a>.`)] },
      { id: "comprobar", nav: "Comprobar", eyebrow: "Antes de confiar", h2: "Qué datos necesita una estimación útil", blocks: [lead("La estimación mejora cuando parte del historial contributivo y de las fechas certificadas, no solo del contrato de trabajo."), ul(["Fecha exacta de inicio y duración indicada en el CIT.", "Régimen de trabajador por cuenta ajena, autónomo u otro.", "Remuneraciones registradas en los meses de referencia.", "Ingreso, cirugía ambulatoria u otra excepción de carencia.", "Una baja reciente que pueda afectar al cómputo de duración."]), p(`Si necesita que un médico valore la incapacidad, consulte el servicio de <a href="${site("es", "/services/baixa-medica")}">baja médica online en Portugal</a>. La valoración puede determinar el documento clínicamente adecuado, pero no garantiza que la Segurança Social conceda una prestación o importe concreto.`)] },
    ],
    linksEyebrow: "Global Health Portugal", linksH2: "Ayuda médica en Portugal", linksLead: "El médico valora la salud y la incapacidad; la Segurança Social decide el derecho económico.", links: [{ label: "Valoración para baja médica", href: site("es", "/services/baixa-medica") }, { label: "Médicos de Global Health Portugal", href: site("es", "/doctors") }, { label: "Contactar con la clínica", href: site("es", "/contact") }],
    ctaBox: { h3: "¿Necesita una valoración médica?", text: "Un médico puede valorar su situación y explicar el documento adecuado. La concesión y el cálculo corresponden a la Segurança Social.", primary: { label: "Reservar valoración", href: site("es", "/services/baixa-medica") }, secondary: { label: "Contactar", href: site("es", "/contact") } },
    sourcesEyebrow: "Fuentes oficiales", sourcesH2: "Reglas portuguesas consultadas", sourcesLead: "Porcentajes, fórmula e IAS comprobados en fuentes oficiales el 24 de agosto de 2026.", sources: [{ label: "Segurança Social — Subsídio de Doença", href: SS_SICKNESS }, { label: "Diário da República — régimen consolidado", href: SICKNESS_LAW }, { label: "Diário da República — IAS 2026", href: IAS_2026 }], sourcesNote: "Las normas pueden cambiar. Confirme el cálculo individual en Segurança Social Direta.",
    faqEyebrow: "Preguntas frecuentes", faqH2: "Cuantía de la baja en Portugal", faqs: [
      { q: "¿Cuánto se cobra los primeros 30 días?", a: "La regla ordinaria es el 55% de la remuneración diaria de referencia por los días pagaderos. No equivale necesariamente al 55% del sueldo neto y puede haber carencia." },
      { q: "¿Cómo simulo el subsidio portugués?", a: "Use las remuneraciones registradas en la ventana legal, calcule la base diaria, aplique cada tramo y quite los días no pagados. El resultado sigue siendo orientativo." },
      { q: "¿Se pagan los tres primeros días?", a: "Normalmente no a trabajadores por cuenta ajena. Ingreso hospitalario, cirugía ambulatoria, tuberculosis y otras situaciones previstas pueden eliminar la espera." },
      { q: "¿Sube el porcentaje después de un mes?", a: "Sí: 60% entre los días 31 y 90, 70% entre 91 y 365 y 75% después. El nuevo tramo no recalcula automáticamente todos los días anteriores." },
      { q: "¿La autodeclaração da derecho a cobrar?", a: "No por sí sola. Puede justificar una ausencia corta, pero la prestación depende de la certificación y de los requisitos contributivos y legales portugueses." },
    ],
    disclaimerTitle: "Información médica y de seguridad social", disclaimer: "Borrador asistido por IA pendiente de revisión editorial nativa y clínica. Información general sobre Portugal en 2026; no es asesoramiento médico, jurídico, laboral ni una decisión de la Segurança Social. El documento y la prestación dependen del caso individual.",
  } satisfies Article,
};

const cs: LocalePost = {
  locale: "CS",
  slug: "nemocenska-v-portugalsku-vyse-vypocet",
  title: "Nemocenská v Portugalsku: kolik činí a jak se počítá",
  excerpt: "Portugalská pravidla pro rok 2026: sazby 55 až 75 %, referenční výdělek, neplacené čekací dny a praktický příklad pro lidi žijící v Portugalsku.",
  seoTitle: "Nemocenská v Portugalsku: výše a výpočet 2026",
  seoDescription: "Jak Portugalsko v roce 2026 počítá nemocenskou: sazby 55–75 %, referenční příjem, čekací doba, minimum a názorný příklad.",
  category: "Pracovní neschopnost v Portugalsku",
  article: {
    lang: "cs-PT", tagline: "Portugalská zdravotní péče srozumitelně", categoryLabel: "Nemocenská", categoryHref: site("cs", "/blog"), eyebrow: "Portugalsko · Sazby 2026", h1: "Kolik činí nemocenská v Portugalsku?", deck: "Portugalský systém nevychází z poslední čisté mzdy. Rozhodují evidované příjmy, délka neschopnosti a dny, za které se dávka neplatí.",
    intro: "Běžné portugalské <strong>subsídio de doença</strong> činí v roce 2026 zpravidla <strong>55 % denního referenčního příjmu v prvních 30 dnech</strong>, 60 % od 31. do 90. dne, 70 % od 91. do 365. dne a 75 % poté. Český výraz nemocenská zde označuje portugalskou dávku: nejde o výpočet podle českých redukčních hranic ani o náhradu mzdy podle českého práva. Portugalská Segurança Social nejprve stanoví denní referenční příjem z odměn evidovaných v Portugalsku a sazbu použije jen na uznané placené dny.",
    facts: ["55 % do 30. dne", "Obvykle šest měsíců evidovaných příjmů", "Portugalský IAS 2026: 537,13 €"],
    primaryCta: { label: "Objednat lékařské posouzení", href: site("cs", "/services/baixa-medica") }, secondaryCta: { label: "Kontaktovat kliniku", href: site("cs", "/contact") }, panelChip: "Co ovlivní částku", panelParas: ["Sazba se mění podle délky potvrzené neschopnosti.", "Základ tvoří portugalská evidence odměn.", "Čekací doba může výrazně snížit první platbu."],
    author: { initials: "RR", name: "Dr Rui Diogo Rodrigues", line: "Praktický lékař · Global Health Portugal" }, reviewLine: "Klinickou kontrolu provede Dra. Margarida Domingues e Andrade, Global Health Portugal.", navLabel: "V tomto průvodci",
    sections: [
      { id: "sazby", nav: "Sazby", eyebrow: "Oficiální stupnice", h2: "Procentní sazby portugalské nemocenské", blocks: [lead("Sazba roste s délkou jednoho potvrzeného období pracovní neschopnosti. Vyšší sazba platí pro dny v příslušném pásmu."), ul(["<strong>1. až 30. den:</strong> 55 % denního referenčního příjmu.", "<strong>31. až 90. den:</strong> 60 %.", "<strong>91. až 365. den:</strong> 70 %.", "<strong>Od 366. dne:</strong> 75 %."]), p("Přechod do vyššího pásma obvykle nezvýší zpětně hodnotu předchozích dnů. Bankovní převod navíc nemusí představovat celý kalendářní měsíc; může sdružovat konkrétní schválené dny. Částku proto porovnávejte s obdobím uvedeným v rozhodnutí nebo v Segurança Social Direta."), cite(`Sazby byly ověřeny 24. srpna 2026 na stránce <a href="${SS_SICKNESS}" rel="nofollow noopener" target="_blank">Segurança Social</a> a v <a href="${SICKNESS_LAW}" rel="nofollow noopener" target="_blank">konsolidovaném portugalském předpisu</a>.`)] },
      { id: "zaklad", nav: "Základ", eyebrow: "První krok", h2: "Jak vzniká denní referenční příjem", blocks: [lead("V obvyklé situaci se používá vzorec R ÷ 180. R je součet evidovaných odměn v prvních šesti z osmi měsíců před měsícem, kdy neschopnost začala."), p("Začne-li pracovní neschopnost například v srpnu, druhým předchozím měsícem je červen a běžné šestiměsíční období leží před ním. Segurança Social pracuje s částkami ve své příspěvkové evidenci, nikoli s odhadem běžné mzdy nebo s poslední čistou platbou na účtu."), p("Příspěvky na dovolenou, vánoční plat a obdobná mimořádná plnění se do R nezahrnují. Čistá mzda je nevhodná také proto, že ji ovlivňují daně, odvody a nepravidelné položky, které se s právně evidovanou odměnou neshodují."), warn("Nepočítejte jen 55 % z poslední čisté mzdy", "Takový výsledek může působit přesně, ale vychází z nesprávného základu. Nejdříve zkontrolujte portugalskou evidenci odměn.")] },
      { id: "priklad", nav: "Příklad", eyebrow: "Orientační výpočet", h2: "Praktický příklad výpočtu", blocks: [lead("Předpokládejme, že uznatelné odměny v šestiměsíčním období činí 7 200 €. Denní referenční příjem je 7 200 ÷ 180 = 40 €."), p("Při dvacetidenní neschopnosti v pásmu 55 % je orientační denní dávka 22 €. Zaměstnanec má zpravidla tři čekací dny, takže zůstane 17 placených dnů: 17 × 22 € = 374 €. Jde o výukový příklad, nikoli o příslib dávky."), p("Výsledek se změní při překročení 30. dne, u osoby samostatně výdělečně činné, při neúplné příspěvkové historii, výjimce z čekací doby nebo při nedávné předchozí neschopnosti. Proto může obecný online simulátor ukázat jinou částku než portugalské úřední zpracování."), ul(["Určete správné období odměn.", "Vypočítejte použitelný denní základ.", "Rozdělte dny podle procentních pásem.", "Odečtěte čekací a jiné neplacené dny."])] },
      { id: "cekani", nav: "Čekací doba", eyebrow: "Neplacené dny", h2: "Od kterého dne Portugalsko platí", blocks: [lead("Zaměstnanci dostávají běžnou dávku zpravidla od čtvrtého dne. Osoby samostatně výdělečně činné obvykle od jedenáctého dne."), p("Jiné skupiny pojištěnců mohou mít jinou čekací dobu. Oficiální informace uvádějí situace bez čekání, mimo jiné hospitalizaci, ambulantní operaci a tuberkulózu. Při odhadu proto nestačí znát pouze délku; potřebujete i kategorii pojištění a klinicky potvrzené okolnosti."), p("Krátké portugalské čestné prohlášení může omluvit absenci, samo však peněžní nárok nevytváří. Samostatný článek vysvětluje rozdíl mezi <a href=\"https://www.myglobalhealth.online/portugal/cs/blog/cestne-prohlaseni-nemoc-portugalsko\">autodeclaração de doença a lékařskou baixa médica</a>."), warn("Dávka není totéž co mzda", "Kolektivní smlouva, zaměstnavatel nebo soukromé pojištění mohou poskytovat další plnění. Nemění tím zákonný výpočet Segurança Social.")] },
      { id: "minimum", nav: "Minimum", eyebrow: "Hodnoty 2026", h2: "Denní minimum a zvýšení o pět bodů", blocks: [lead("Portugalský sociální index IAS má v roce 2026 hodnotu 537,13 €. Běžné zákonné denní minimum odpovídá 30 % IAS děleným třiceti, tedy přibližně 5,37 €."), p("Je-li samotný denní referenční příjem nižší, dávku omezuje tato nižší hodnota. IAS se každoročně mění, a proto kalkulačka používající částku z roku 2025 není vhodná pro konečný odhad roku 2026."), p("U sazeb 55 % a 60 % lze při splnění zákonné podmínky přidat pět procentních bodů. Jde například o referenční odměnu nejvýše 500 €, nejméně tři potomky v určených věkových hranicích nebo potomka pobírajícího příslušný příplatek z důvodu zdravotního postižení. Důvody se nesčítají."), cite(`IAS 537,13 € pro rok 2026 stanovila <a href="${IAS_2026}" rel="nofollow noopener" target="_blank">Portaria 480-A/2025/1</a>.`)] },
      { id: "overeni", nav: "Ověření", eyebrow: "Potřebné údaje", h2: "Co si připravit před odhadem", blocks: [lead("Použitelný odhad stojí na portugalském příspěvkovém záznamu a potvrzených datech, nikoli pouze na pracovní smlouvě."), ul(["Přesné datum začátku a potvrzená délka neschopnosti.", "Postavení zaměstnance, OSVČ nebo jiné kategorie.", "Odměny evidované v rozhodných měsících.", "Hospitalizace, ambulantní operace nebo jiná výjimka.", "Nedávná předchozí neschopnost, která může ovlivnit délku."]), p(`Potřebujete-li lékařské posouzení, podívejte se na <a href="${site("cs", "/services/baixa-medica")}">online konzultaci k pracovní neschopnosti v Portugalsku</a>. Lékař posuzuje zdravotní stav a vhodný dokument; nemůže zaručit přiznání ani částku dávky.`)] },
    ],
    linksEyebrow: "Global Health Portugal", linksH2: "Lékařská pomoc v Portugalsku", linksLead: "Klinika posuzuje zdraví a pracovní neschopnost. Peněžní nárok stanoví Segurança Social.", links: [{ label: "Posouzení pracovní neschopnosti", href: site("cs", "/services/baixa-medica") }, { label: "Lékaři v Portugalsku", href: site("cs", "/doctors") }, { label: "Kontaktovat Global Health", href: site("cs", "/contact") }],
    ctaBox: { h3: "Potřebujete lékařské posouzení?", text: "Lékař může posoudit onemocnění a vysvětlit vhodný dokument. O dávce rozhoduje Segurança Social.", primary: { label: "Objednat konzultaci", href: site("cs", "/services/baixa-medica") }, secondary: { label: "Kontakt", href: site("cs", "/contact") } },
    sourcesEyebrow: "Oficiální zdroje", sourcesH2: "Portugalská pravidla", sourcesLead: "Sazby, vzorec a IAS byly ověřeny v portugalských úředních zdrojích 24. srpna 2026.", sources: [{ label: "Segurança Social — Subsídio de Doença", href: SS_SICKNESS }, { label: "Diário da República — konsolidovaný předpis", href: SICKNESS_LAW }, { label: "Diário da República — IAS 2026", href: IAS_2026 }], sourcesNote: "Pravidla se mohou změnit. Osobní výpočet ověřte v Segurança Social Direta.",
    faqEyebrow: "Časté otázky", faqH2: "Nemocenská v Portugalsku", faqs: [
      { q: "Kolik dostanu v prvních 30 dnech?", a: "Běžná sazba je 55 % denního referenčního příjmu za placené dny. Nejde nutně o 55 % čisté měsíční mzdy a čekací dny první platbu snižují." },
      { q: "Jak nemocenskou orientačně spočítat?", a: "Použijte evidované odměny ze zákonného období, stanovte denní základ, použijte sazbu každého pásma a odečtěte neplacené dny. Výsledek je pouze orientační." },
      { q: "Platí se první tři dny?", a: "Zaměstnancům zpravidla ne. Hospitalizace, ambulantní operace, tuberkulóza a další upravené situace mohou čekací dobu odstranit." },
      { q: "Zvýší se dávka po 30 dnech?", a: "Sazba přechází na 60 % pro den 31–90, na 70 % pro den 91–365 a poté na 75 %. Předchozí dny se automaticky nepřepočtou." },
      { q: "Stačí autodeclaração k peněžní dávce?", a: "Samo o sobě ne. Může omluvit krátkou absenci, ale dávka závisí na portugalských pravidlech pojištění, nároku a potvrzení." },
    ],
    disclaimerTitle: "Zdravotní a sociální informace", disclaimer: "Návrh vytvořený s pomocí AI čeká na jazykovou redakci rodilým mluvčím a klinickou kontrolu. Obecné informace o Portugalsku v roce 2026, nikoli osobní lékařské, právní, pracovněprávní nebo sociální poradenství.",
  } satisfies Article,
};

const ro: LocalePost = {
  locale: "RO",
  slug: "concediu-medical-portugalia-cat-se-plateste-calcul",
  title: "Concediul medical în Portugalia: cât se plătește și cum se calculează",
  excerpt: "Regulile portugheze din 2026 pentru indemnizația de boală: procente, venitul de referință, zilele de așteptare și un exemplu util românilor din Portugalia.",
  seoTitle: "Concediu medical Portugalia: calcul și sume 2026",
  seoDescription: "Cum calculează Portugalia indemnizația de boală în 2026: 55–75%, venitul de referință, perioada de așteptare și un exemplu clar.",
  category: "Concediu medical în Portugalia",
  article: {
    lang: "ro-PT", tagline: "Sistemul medical portughez, explicat pe înțelesul tău", categoryLabel: "Concediu medical", categoryHref: site("ro", "/blog"), eyebrow: "Portugalia · Valori 2026", h1: "Cât se plătește concediul medical în Portugalia?", deck: "Procentul este doar începutul. Suma reală depinde de veniturile declarate în Portugalia, durata incapacității și zilele fără plată.",
    intro: "În Portugalia, indemnizația obișnuită <strong>subsídio de doença</strong> reprezintă în 2026, de regulă, <strong>55% din remunerația zilnică de referință în primele 30 de zile</strong>, 60% între zilele 31 și 90, 70% între zilele 91 și 365 și 75% după aceea. Expresia românească „concediu medical” ajută cititorul, dar calculul nu urmează legea din România. Segurança Social portugheză folosește remunerațiile înregistrate în sistemul portughez, stabilește o valoare zilnică și plătește numai zilele eligibile după perioada de așteptare.",
    facts: ["55% până la ziua 30", "De regulă, șase luni de remunerații declarate", "IAS Portugalia 2026: 537,13 €"],
    primaryCta: { label: "Programează evaluarea medicală", href: site("ro", "/services/baixa-medica") }, secondaryCta: { label: "Contactează clinica", href: site("ro", "/contact") }, panelChip: "De ce suma diferă", panelParas: ["Procentul crește odată cu durata certificată.", "Baza provine din istoricul contributiv portughez.", "Zilele de așteptare reduc frecvent prima plată."],
    author: { initials: "RR", name: "Dr Rui Diogo Rodrigues", line: "Medic de familie · Global Health Portugal" }, reviewLine: "Revizuire clinică planificată de Dra. Margarida Domingues e Andrade, Global Health Portugal.", navLabel: "În acest ghid",
    sections: [
      { id: "procente", nav: "Procente", eyebrow: "Grila oficială", h2: "Ce procent plătește Portugalia", blocks: [lead("Durata totală a aceleiași incapacități certificate stabilește intervalul. Procentul mai mare se aplică zilelor din acel interval."), ul(["<strong>Zilele 1–30:</strong> 55% din remunerația zilnică de referință.", "<strong>Zilele 31–90:</strong> 60%.", "<strong>Zilele 91–365:</strong> 70%.", "<strong>După ziua 365:</strong> 75%."]), p("Trecerea într-un interval superior nu recalculează automat toate zilele anterioare. Nici transferul bancar nu corespunde neapărat unei luni calendaristice; poate include un anumit număr de zile aprobate. Verifică perioada procesată în decizie sau în Segurança Social Direta."), cite(`Procente verificate la 24 august 2026 în pagina <a href="${SS_SICKNESS}" rel="nofollow noopener" target="_blank">Segurança Social</a> și în <a href="${SICKNESS_LAW}" rel="nofollow noopener" target="_blank">legislația portugheză consolidată</a>.`)] },
      { id: "referinta", nav: "Baza de calcul", eyebrow: "Primul pas", h2: "Cum se stabilește remunerația de referință", blocks: [lead("În cazul obișnuit, formula zilnică este R ÷ 180. R însumează remunerațiile înregistrate în primele șase dintre cele opt luni anterioare lunii în care începe incapacitatea."), p("Dacă incapacitatea începe în august, a doua lună anterioară este iunie, iar fereastra obișnuită de șase luni se află înainte de iunie. Instituția folosește sumele declarate în evidența portugheză, nu salariul aproximativ din contract și nici ultima sumă netă primită în cont."), p("Primele de vacanță, de Crăciun și plățile de natură asemănătoare nu intră în R. Salariul net este o bază greșită și pentru că impozitele, contribuțiile și suplimentele neregulate îl diferențiază de remunerația înregistrată legal."), warn("Nu înmulți ultimul salariu net cu 55%", "Rezultatul pare precis, dar poate porni de la date greșite. Verifică mai întâi remunerațiile din Segurança Social Direta.")] },
      { id: "exemplu", nav: "Exemplu", eyebrow: "Simulare orientativă", h2: "Un exemplu de calcul portughez", blocks: [lead("Să presupunem că remunerațiile eligibile însumează 7.200 € în cele șase luni. Remunerația zilnică de referință ar fi 7.200 ÷ 180 = 40 €."), p("Pentru 20 de zile aflate integral în intervalul de 55%, suma zilnică orientativă este 22 €. Un salariat are, de regulă, trei zile de așteptare, deci exemplul simplificat păstrează 17 zile plătite: 17 × 22 € = 374 €. Nu este o promisiune de plată."), p("Rezultatul se schimbă dacă perioada trece de ziua 30, persoana lucrează independent, lipsesc luni contributive, există o excepție de la așteptare sau o incapacitate recentă influențează durata. Aceste detalii explică diferența dintre un simulator general și procesarea oficială."), ul(["Stabilește lunile corecte de remunerație.", "Calculează baza zilnică aplicabilă.", "Separă zilele pe intervale procentuale.", "Scade zilele de așteptare și alte zile neplătibile."])] },
      { id: "asteptare", nav: "Așteptare", eyebrow: "Zile fără plată", h2: "Din ce zi începe indemnizația", blocks: [lead("Pentru salariați, plata începe de obicei din ziua a patra. Pentru lucrători independenți, de regulă din ziua a unsprezecea."), p("Alte categorii de asigurați pot avea alte perioade. Informațiile oficiale indică și situații fără așteptare, inclusiv internare, chirurgie ambulatorie și tuberculoză. Statutul contributiv și circumstanțele certificate sunt necesare într-o estimare serioasă."), p("Autodeclarația portugheză poate justifica o absență scurtă, dar nu creează singură dreptul la bani. Ghidul nostru separat explică <a href=\"https://www.myglobalhealth.online/portugal/ro/blog/autodeclaratie-boala-concediu-medical-portugalia\">autodeclaração de doença și baixa médica</a>, fără să amestece procesul cu acest calcul."), warn("Indemnizația nu este salariu", "Angajatorul, contractul colectiv sau asigurarea privată pot prevedea alte plăți. Acestea nu modifică formula legală a Segurança Social.")] },
      { id: "minim", nav: "Minim", eyebrow: "Valori 2026", h2: "Minimul zilnic și majorarea cu cinci puncte", blocks: [lead("Indicele social portughez IAS este 537,13 € în 2026. Minimul zilnic legal obișnuit este 30% din IAS împărțit la 30, aproximativ 5,37 €."), p("Dacă remunerația zilnică de referință este ea însăși mai mică, acea bază mai mică limitează indemnizația. IAS se actualizează anual; un calculator care păstrează valoarea din 2025 nu trebuie folosit pentru o estimare finală din 2026."), p("În intervalele de 55% și 60% poate exista o majorare de cinci puncte procentuale dacă este îndeplinită o condiție legală: remunerație de referință de cel mult 500 €, cel puțin trei descendenți în limitele de vârstă stabilite sau un descendent care primește bonificația pentru dizabilitate. Motivele nu se cumulează."), cite(`IAS de 537,13 € pentru 2026 a fost stabilit prin <a href="${IAS_2026}" rel="nofollow noopener" target="_blank">Portaria 480-A/2025/1</a>.`)] },
      { id: "verificare", nav: "Verificare", eyebrow: "Date utile", h2: "Ce trebuie să ai înainte de estimare", blocks: [lead("O estimare bună pornește din istoricul contributiv portughez și datele certificate, nu numai din contract."), ul(["Data exactă de început și durata din CIT.", "Statutul de salariat, independent sau altă categorie.", "Remunerațiile înregistrate în lunile relevante.", "Internare, chirurgie ambulatorie sau altă excepție.", "O incapacitate recentă care poate influența durata."]), p(`Dacă ai nevoie de evaluarea incapacității, vezi serviciul de <a href="${site("ro", "/services/baixa-medica")}">concediu medical online în Portugalia</a>. Medicul poate evalua situația și documentul potrivit, dar nu poate garanta acordarea sau valoarea indemnizației.`)] },
    ],
    linksEyebrow: "Global Health Portugal", linksH2: "Ajutor medical în Portugalia", linksLead: "Clinica evaluează sănătatea și incapacitatea; Segurança Social decide dreptul și suma.", links: [{ label: "Evaluare pentru baixa médica", href: site("ro", "/services/baixa-medica") }, { label: "Medicii noștri din Portugalia", href: site("ro", "/doctors") }, { label: "Contactează Global Health", href: site("ro", "/contact") }],
    ctaBox: { h3: "Ai nevoie de evaluare medicală?", text: "Un medic poate evalua boala și explica documentul potrivit. Decizia indemnizației aparține Segurança Social.", primary: { label: "Programează consultația", href: site("ro", "/services/baixa-medica") }, secondary: { label: "Contact", href: site("ro", "/contact") } },
    sourcesEyebrow: "Surse oficiale", sourcesH2: "Regulile portugheze folosite", sourcesLead: "Procentele, formula și IAS au fost verificate în surse portugheze oficiale la 24 august 2026.", sources: [{ label: "Segurança Social — Subsídio de Doença", href: SS_SICKNESS }, { label: "Diário da República — lege consolidată", href: SICKNESS_LAW }, { label: "Diário da República — IAS 2026", href: IAS_2026 }], sourcesNote: "Regulile se pot schimba. Verifică situația personală în Segurança Social Direta.",
    faqEyebrow: "Întrebări frecvente", faqH2: "Indemnizația de boală în Portugalia", faqs: [
      { q: "Cât primesc în primele 30 de zile?", a: "Rata obișnuită este 55% din remunerația zilnică de referință pentru zilele plătibile. Nu înseamnă neapărat 55% din salariul net și există zile de așteptare." },
      { q: "Cum fac o simulare?", a: "Folosește remunerațiile înregistrate în fereastra legală, calculează baza zilnică, aplică rata fiecărui interval și elimină zilele neplătibile. Rezultatul rămâne orientativ." },
      { q: "Primele trei zile sunt plătite?", a: "De regulă, nu pentru salariați. Internarea, chirurgia ambulatorie, tuberculoza și alte situații prevăzute pot elimina așteptarea." },
      { q: "Crește procentul după 30 de zile?", a: "Da: 60% între zilele 31–90, 70% între 91–365 și 75% după aceea. Zilele anterioare nu sunt automat recalculate." },
      { q: "Autodeclarația îmi dă dreptul la bani?", a: "Nu singură. Poate justifica o absență scurtă, însă indemnizația depinde de certificare și de condițiile contributive și legale portugheze." },
    ],
    disclaimerTitle: "Informații medicale și sociale", disclaimer: "Material realizat cu asistență AI, în așteptarea revizuirii editoriale native și clinice. Informație generală despre Portugalia în 2026, nu recomandare medicală, juridică, de muncă sau decizie a Segurança Social.",
  } satisfies Article,
};

export const PT_BAIXA_MEDICA_VALOR: PostSet = {
  key: "pt-baixa-medica-valor",
  countryCode: "pt",
  targetKeyword: "baixa médica",
  searchVolume: 4400,
  keywordDifficulty: 20,
  evidence:
    "OpenSEO/DataForSEO Week 2 research supplied 2026-08-24: 'baixa médica' 4,400 monthly searches, KD 20, CPC EUR 2.51; supporting calculator intent 'simulador baixa médica' 1,300, KD 0, CPC EUR 0.13. Narrow intent: payment amount, reference remuneration, percentage bands and waiting days. The Week 1 autodeclaração/process article is linked, not duplicated. Current official rules checked 2026-08-24 against Segurança Social, consolidated Decreto-Lei 28/2004 and Portaria 480-A/2025/1 (IAS 2026 EUR 537.13).",
  serviceSlug: "baixa-medica",
  authorDoctorId: "cmqwnkhcd00007gjummb923nm",
  authorDisplayName: "Dr Rui Diogo Rodrigues",
  reviewerDoctorId: "cmqwnkoqe000c7gju26jtb7qt",
  reviewerDisplayName: "Dra. Margarida Domingues e Andrade",
  posts: [pt, en, de, es, cs, ro],
};
