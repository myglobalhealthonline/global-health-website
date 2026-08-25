/**
 * Ireland — Week 2 editorial batch article.
 *
 * Exact keyword: "illness benefit payment" — 880/mo, KD 2, informational.
 * Broad parent keyword: "illness benefit ireland" — 6,600/mo, KD 5, CPC EUR 3.70.
 *
 * This article is deliberately narrower than the existing
 * "illness-benefit-ireland-how-to-claim" post. That earlier guide covers
 * eligibility, the IB1 route and the Certificate of Incapacity for Work.
 * This one stays on payment amount, timing, tax and the handoff between DSP
 * Illness Benefit and employer-paid sick leave.
 *
 * Current rules used here are anchored to official Irish sources checked on
 * 2026-08-24:
 * - MyWelfare live service page: current personal weekly rate EUR 254 and
 *   claim-within-6-weeks wording.
 * - gov.ie live service page: first 3 days are waiting days; payment is weekly
 *   and may issue Monday to Saturday depending on claim registration and first
 *   day of illness.
 * - Revenue: Illness Benefit is taxable; tax is collected via adjusted tax
 *   credits/rate band, while DSP generally pays without deducting tax at source.
 * - Department of Enterprise press release dated 2025-04-08: statutory sick
 *   leave remained at 5 days, so do not write as if 10 employer-paid days
 *   automatically apply in 2026.
 */
import { cite, lead, p, renderArticle, ul, warn, type Article } from "../blog-seo-2026-08/template.js";
import type { LocalePost, PostSet } from "../blog-seo-2026-08/types.js";

const GOV_IB = "https://www.gov.ie/en/department-of-social-protection/services/illness-benefit/";
const GOV_IB_GUIDE =
  "https://www.gov.ie/en/department-of-social-protection/publications/operational-guidelines-illness-benefit/";
const MYWELFARE = "https://services.mywelfare.ie/en/topics/health-disability-illness/illness-benefit/";
const REVENUE_TAX =
  "https://www.revenue.ie/en/jobs-and-pensions/taxation-of-social-welfare-payments/illness-occupational-injury-partial-capacity-benefits.aspx";
const REVENUE_DSP_TAX =
  "https://www.revenue.ie/en/jobs-and-pensions/taxation-of-social-welfare-payments/how-dsp-payments-taxed.aspx";
const ENTERPRISE_SICK_LEAVE =
  "https://www.gov.ie/en/department-of-enterprise-tourism-and-employment/press-releases/entitlement-to-statutory-sick-leave-to-remain-unchanged-at-5-days/";
const STATUTORY_SICK_LEAVE_2026 =
  "https://www.gov.ie/en/department-of-social-protection/publications/illness-benefit-injury-benefit-and-statutory-sick-leave-in-2025/";

const href = (lang: string, path: string) => `https://www.myglobalhealth.online/ireland/${lang}${path}`;
const claimGuideSlug = {
  EN: "illness-benefit-ireland-how-to-claim",
  PT: "illness-benefit-irlanda-como-requerer",
  ES: "illness-benefit-irlanda-como-solicitarlo",
  CS: "illness-benefit-irsko-jak-zazadat",
  RO: "illness-benefit-irlanda-cum-soliciti",
  DE: "illness-benefit-irland-so-beantragen",
} as const;

const buildSharedLinks = (lang: keyof typeof claimGuideSlug) => ({
  blog: href(lang.toLowerCase(), "/blog"),
  doctors: href(lang.toLowerCase(), "/doctors"),
  contact: href(lang.toLowerCase(), "/contact"),
  service: href(lang.toLowerCase(), "/services/sick-certificate-ireland"),
  claimGuide: href(lang.toLowerCase(), `/blog/${claimGuideSlug[lang]}`),
});

const enLinks = buildSharedLinks("EN");
const ptLinks = buildSharedLinks("PT");
const esLinks = buildSharedLinks("ES");
const csLinks = buildSharedLinks("CS");
const roLinks = buildSharedLinks("RO");
const deLinks = buildSharedLinks("DE");

const en: LocalePost = {
  locale: "EN",
  slug: "illness-benefit-payment-ireland-rate-tax-timing",
  title: "How Much Is Illness Benefit in Ireland in 2026?",
  excerpt: "Current Illness Benefit rates, waiting days, weekly payment timing, tax and the difference from employer sick pay.",
  seoTitle: "Illness Benefit Ireland: 2026 rates and timing",
  seoDescription: "See 2026 Illness Benefit rates in Ireland, when payment starts, weekly timing, tax and how employer sick pay affects the first paid day.",
  category: "General Practice",
  article: {
    lang: "en-IE",
    tagline: "Medicine Anytime, Anywhere",
    categoryLabel: "General Practice",
    categoryHref: enLinks.blog,
    eyebrow: "Ireland · 2026 payment guide",
    h1: "How much is Illness Benefit in Ireland in 2026?",
    deck: "The maximum personal rate is EUR 254 a week, but earnings, timing and tax affect an individual payment.",
    intro: "In 2026, the maximum personal <strong>Illness Benefit is EUR 254 a week</strong>. Lower earnings bands receive less. Your first paid day depends on how much of the five-day statutory sick-leave entitlement remains. The payment is taxable. See our <a href=\"" + enLinks.claimGuide + "\">claim guide</a> for eligibility, PRSI and applying.",
    facts: [
      "Maximum 2026 personal rate: EUR 254 a week",
      "Four rate bands reflect average weekly earnings",
      "The payment is taxable but not subject to PRSI or USC",
    ],
    primaryCta: { label: "Check the 2026 start-day rules", href: STATUTORY_SICK_LEAVE_2026 },
    secondaryCta: { label: "Read the claim guide", href: enLinks.claimGuide },
    panelChip: "Quick answer",
    panelParas: [
      "EUR 254 is the maximum personal rate, not a flat rate.",
      "The first paid day can be day 6, day 5 or day 4.",
      "Payment is weekly; the start date varies.",
    ],
    author: { initials: "TF", name: "Dr Tiago Miguel Figueira", line: "IMC 523449 · Clinical Director, Global Health" },
    reviewLine: "Clinical and native editorial review by Dr Ahmed Maklad is required before publication.",
    navLabel: "In this guide",
    sections: [
      {
        id: "rates",
        nav: "2026 rates",
        eyebrow: "Official bands",
        h2: "Illness Benefit rates in Ireland in 2026",
        blocks: [
          lead("DSP uses average weekly earnings in the relevant tax year."),
          ul([
            "<strong>EUR 300 or more:</strong> EUR 254 a week.",
            "<strong>EUR 220–299.99:</strong> EUR 198.90 a week.",
            "<strong>EUR 150–219.99:</strong> EUR 163.70 a week.",
            "<strong>Below EUR 150:</strong> EUR 114 a week.",
          ]),
          cite("Rates verified on 25 August 2026 on the <a href=\"" + GOV_IB + "\" rel=\"nofollow noopener\" target=\"_blank\">Department of Social Protection Illness Benefit page</a>."),
        ],
      },
      {
        id: "individual-rate",
        nav: "Your rate",
        eyebrow: "Individual amount",
        h2: "Why an individual payment may differ",
        blocks: [
          lead("DSP uses earnings and weeks worked in the relevant tax year."),
          p("At the top band, a qualified-adult increase is EUR 168.60, giving EUR 422.60 combined. At lower bands it is EUR 109.20. Child Support Payment may add EUR 58 for a child under 12 or EUR 78 from age 12. Conditions apply; additions are not automatic."),
        ],
      },
      {
        id: "timing",
        nav: "Payment timing",
        eyebrow: "Waiting days",
        h2: "When is Illness Benefit paid?",
        blocks: [
          lead("Illness Benefit is paid weekly, but your first payable day depends on the statutory sick leave you still have available in 2026."),
          ul([
            "<strong>None used:</strong> five employer-paid days, then Illness Benefit from day 6.",
            "<strong>One used:</strong> four employer-paid days, then Illness Benefit from day 5.",
            "<strong>Three used:</strong> two employer-paid days plus one waiting day; Illness Benefit from day 4.",
            "<strong>All five used:</strong> three waiting days; Illness Benefit from day 4.",
          ]),
          p("The two payments cannot cover the same day. Sunday is not a waiting day. Processing may make the transfer arrive after the first payable day."),
          p("Apply within six weeks and ensure the Certificate of Incapacity for Work is completed. See the <a href=\"" + enLinks.claimGuide + "\">claim guide</a> for the route and PRSI rules."),
          warn("Check your own claim", "Count the statutory sick-leave days already used, then check MyWelfare or contact DSP. These examples do not predict a transfer date."),
        ],
      },
      {
        id: "employer",
        nav: "Employer sick pay",
        eyebrow: "Two separate payments",
        h2: "How Illness Benefit differs from employer sick pay",
        blocks: [
          lead("The state benefit and employer sick pay are separate."),
          p("Eligible employees have five statutory sick-leave days in 2026, paid at 70% of normal daily earnings subject to the cap. A better workplace scheme may apply. Check your contract and payslip: the two payments are not automatically added together."),
          cite("The five-day 2026 position is explained in the official <a href=\"" + ENTERPRISE_SICK_LEAVE + "\" rel=\"nofollow noopener\" target=\"_blank\">statutory sick leave update</a>."),
        ],
      },
      {
        id: "tax",
        nav: "Tax",
        eyebrow: "Revenue treatment",
        h2: "Is Illness Benefit taxable?",
        blocks: [
          lead("Yes. DSP normally pays Illness Benefit without deducting tax, then reports the payment to Revenue."),
          p("Revenue may adjust tax credits and rate bands. PRSI and USC do not apply, and child increases are not taxed, so the DSP transfer alone does not show the final tax effect."),
          p("Medical certification, benefit entitlement and tax treatment are separate decisions. A medical consultation cannot guarantee a certificate, eligibility or a payment amount."),
        ],
      },
    ],
    linksEyebrow: "Global Health Ireland",
    linksH2: "Claim information and medical assessment",
    linksLead: "DSP decides the claim; a doctor assesses work fitness.",
    links: [
      { label: "Illness Benefit eligibility and claim guide", href: enLinks.claimGuide },
      { label: "Sick certificate assessment", href: enLinks.service },
      { label: "Doctors in Ireland", href: enLinks.doctors },
      { label: "Contact Global Health", href: enLinks.contact },
    ],
    ctaBox: {
      h3: "Need a medical assessment for sick leave?",
      text: "A GP assesses fitness for work; DSP decides benefit entitlement.",
      primary: { label: "Book an assessment", href: enLinks.service },
      secondary: { label: "View doctors", href: enLinks.doctors },
    },
    sourcesEyebrow: "Official sources",
    sourcesH2: "2026 rules checked",
    sourcesLead: "Rules verified on 25 August 2026.",
    sources: [
      { label: "Department of Social Protection — Illness Benefit", href: GOV_IB },
      { label: "DSP — Illness Benefit and statutory sick leave in 2026", href: STATUTORY_SICK_LEAVE_2026 },
      { label: "MyWelfare — Illness Benefit", href: MYWELFARE },
      { label: "Revenue — tax treatment of Illness Benefit", href: REVENUE_TAX },
      { label: "Department of Enterprise — statutory sick leave", href: ENTERPRISE_SICK_LEAVE },
    ],
    sourcesNote: "Check your claim with DSP and your tax record with Revenue.",
    faqEyebrow: "Frequently asked questions",
    faqH2: "Illness Benefit payment questions",
    faqs: [
      { q: "Does everyone get EUR 254 a week?", a: "No. EUR 254 is the maximum 2026 personal rate. DSP uses four bands based on average weekly earnings, and household increases may also apply." },
      { q: "What day is Illness Benefit paid?", a: "It is paid weekly and may issue Monday to Saturday, depending on claim registration and the first day of illness." },
      { q: "Does it always start after three waiting days?", a: "No. With all five statutory days available it usually starts on day 6; with all five used, on day 4. Partly used entitlement can mean day 5 or day 4." },
      { q: "Is Illness Benefit taxed?", a: "Yes. DSP usually pays it gross and reports it to Revenue. Income tax may be collected through adjusted credits or rate bands; PRSI and USC do not apply." },
    ],
    disclaimerTitle: "Medical and benefits information",
    disclaimer: "AI-assisted article pending native editorial and clinical review. General 2026 information only; not a DSP decision, professional advice or a guarantee of certification or payment.",
  } satisfies Article,
};

const pt: LocalePost = {
  locale: "PT",
  slug: "pagamento-illness-benefit-irlanda-valor-imposto-prazo",
  title: "Pagamento do Illness Benefit na Irlanda: valor, prazo e imposto",
  excerpt:
    "Quanto paga o Illness Benefit na Irlanda, quando costuma chegar o primeiro pagamento, porque os primeiros dias de baixa funcionam de forma diferente e como o Revenue tributa este apoio.",
  seoTitle: "Pagamento do Illness Benefit na Irlanda",
  seoDescription:
    "Valor atual, dias de espera, momento do primeiro pagamento, imposto e diferença entre Illness Benefit e baixa paga pelo empregador.",
  category: "Medicina Geral",
  article: {
    lang: "pt-PT",
    tagline: "Medicina a qualquer hora, em qualquer lugar",
    categoryLabel: "Medicina Geral",
    categoryHref: ptLinks.blog,
    eyebrow: "Irlanda · Guia de pagamentos",
    h1: "Pagamento do Illness Benefit na Irlanda",
    deck: "Quanto paga o Department of Social Protection, quando paga, como o imposto e o payroll entram na conta e porque a baixa paga pelo empregador continua a importar primeiro.",
    intro:
      "O <strong>Illness Benefit</strong> e um <strong>pagamento semanal do Department of Social Protection</strong> para quem nao pode trabalhar por doenca. Em <strong>24 de agosto de 2026</strong>, a pagina oficial do MyWelfare mostra uma <strong>taxa pessoal semanal de EUR 254</strong>, mas isso <strong>nao</strong> significa que todas as pessoas recebam exatamente esse valor liquido na conta. O momento do pagamento depende dos dias de espera, da data em que o pedido e o certificado medico entram no sistema, da eventual baixa paga pela empresa e da forma como o Revenue ajusta o imposto. Se ainda precisa do processo de elegibilidade e do IB1, veja o nosso <a href=\"" + ptLinks.claimGuide + "\">guia de pedido do Illness Benefit</a>.",
    facts: [
      "Taxa pessoal semanal oficial atualmente mostrada no MyWelfare: EUR 254",
      "Os primeiros 3 dias de ausencia continuam a ser dias de espera na pagina live do DSP",
      "O Illness Benefit e tributavel mesmo quando o DSP paga sem reter imposto na origem",
    ],
    primaryCta: { label: "Ver guia de pedido do Illness Benefit", href: ptLinks.claimGuide },
    secondaryCta: { label: "Pagina oficial do Illness Benefit", href: GOV_IB },
    panelChip: "O que este guia explica",
    panelParas: [
      "O valor vivo que as pessoas pesquisam, sem fingir que existe um montante identico para todos os casos reais.",
      "Quando o Illness Benefit comeca, porque o primeiro pagamento pode demorar mais do que o esperado e onde entra a baixa paga pelo empregador.",
      "Como o Illness Benefit e tributado, o que o Revenue faz nos bastidores e porque o recibo pode parecer estranho durante um pedido ativo.",
    ],
    author: { initials: "TF", name: "Dr Tiago Miguel Figueira", line: "IMC 523449 · Diretor Clinico, Global Health" },
    reviewLine: "Revisão clínica e editorial nativa pelo Dr Ahmed Maklad obrigatória antes da publicação.",
    navLabel: "Neste artigo",
    sections: [
      {
        id: "scope",
        nav: "Ambito",
        eyebrow: "Nao misturar dois guias",
        h2: "Este artigo trata do pagamento, nao da elegibilidade",
        blocks: [
          lead("A maior parte das pessoas chega aqui depois de ja ter ouvido falar do Illness Benefit e querer uma resposta pratica: quanto dinheiro entra e quando entra."),
          p("Essa pergunta e diferente de saber <strong>se tem direito</strong>, como funcionam as contribuicoes PRSI ou quem pode emitir o Certificate of Incapacity for Work. Ja cobrimos esses pontos no nosso <a href=\"" + ptLinks.claimGuide + "\">guia dedicado de pedido do Illness Benefit</a>, e separar os temas ajuda a evitar canibalizacao de intencao de pesquisa."),
          p("Por isso esta pagina fica restrita ao valor semanal mostrado no servico oficial, aos tres dias de espera mostrados na pagina do DSP, ao ciclo semanal de pagamento e ao tratamento fiscal descrito pelo Revenue. Tambem explica porque muitos trabalhadores confundem a baixa paga pelo empregador com o Illness Benefit quando, juridicamente, sao fluxos de dinheiro diferentes."),
          warn(
            "Nao reduza a pesquisa a um unico numero",
            "A expressao 'illness benefit payment' parece pedir apenas um valor, mas o que realmente chega a sua conta pode mudar por causa do inicio do pedido, de acrescimos, da politica de sick pay do empregador e do imposto cobrado mais tarde pelo Revenue.",
          ),
        ],
      },
      {
        id: "rate",
        nav: "Valor atual",
        eyebrow: "O numero que interessa",
        h2: "A taxa pessoal oficial atual e EUR 254 por semana, mas isso nao conta a historia toda",
        blocks: [
          lead("Na pagina live do MyWelfare verificada em 24 de agosto de 2026, o valor pessoal semanal apresentado para o Illness Benefit e EUR 254."),
          p("Esse e o numero principal e responde a pesquisa. Mas continua a ser apenas a <strong>linha da taxa pessoal</strong> no servico oficial. Nao significa que todos os requerentes recebam exatamente EUR 254 todas as semanas. Alguns pedidos tem circunstancias diferentes, e a sua posicao liquida tambem pode mudar quando o Revenue ajusta os creditos fiscais."),
          ul([
            "<strong>Use EUR 254 como taxa pessoal semanal oficial atual</strong> porque e isso que o MyWelfare mostra agora.",
            "<strong>Nao escreva 'toda a gente recebe EUR 254'</strong> porque isso vai alem do que a fonte oficial permite afirmar.",
            "<strong>Nao repita valores antigos de Budget</strong> quando a pagina live ja mostra o montante atual.",
            "<strong>Se a sua situacao nao for standard</strong>, o montante pode diferir da taxa pessoal principal.",
          ]),
          p("Em linguagem simples: o resumo mais seguro e que o Illness Benefit esta atualmente apresentado com uma taxa pessoal semanal de EUR 254 no servico oficial, mas o montante final de um caso concreto pode diferir por razoes ligadas ao registo do pedido e ao imposto."),
          cite(`Fonte live: <a href="${MYWELFARE}" rel="nofollow noopener" target="_blank">MyWelfare — Illness Benefit</a>.`),
        ],
      },
      {
        id: "timing",
        nav: "Quando paga",
        eyebrow: "Inicio e dia de pagamento",
        h2: "Porque o primeiro pagamento costuma chegar mais tarde do que as pessoas esperam",
        blocks: [
          lead("O Illness Benefit e pago semanalmente, mas nao comeca automaticamente no mesmo dia em que deixa de trabalhar."),
          p("A pagina live do DSP diz que <strong>nao ha Illness Benefit nos primeiros 3 dias</strong> em que esta ausente por doenca. Esses sao os dias de espera atuais. A mesma pagina tambem diz que o apoio e <strong>pago semanalmente</strong> e pode ser pago <strong>de segunda a sabado</strong> dependendo do momento em que o pedido e registado e do primeiro dia da doenca."),
          p("Essa unica regra explica quase toda a confusao sobre o primeiro pagamento. A sua primeira semana de ausencia pode ter tres camadas: a empresa pode pagar sick leave primeiro; o DSP continua a aplicar os seus dias de espera; e o Departamento nao liberta o pagamento antes de ter o pedido e o certificado medico no sistema."),
          ul([
            "Requeira cedo: o MyWelfare diz que deve apresentar o pedido dentro de <strong>6 semanas</strong> apos adoecer, mesmo que a empresa continue a pagar no inicio.",
            "Espere um intervalo entre o primeiro dia sem trabalhar e o primeiro pagamento do DSP porque os dias de espera e o registo do pedido contam.",
            "O primeiro dia efetivo de pagamento nao e igual para toda a gente; a pagina do gov.ie diz que pode cair entre segunda e sabado.",
            "Se a decisao sair mais tarde, pode haver retroativos, mas isso nao transforma a primeira semana em salario normal.",
          ]),
          p("Na pratica, se esta a organizar renda e contas, nao assuma que o primeiro pagamento do DSP segue o mesmo ritmo do payroll da empresa. E um pagamento social com calendario proprio."),
          cite(`Timing oficial: <a href="${GOV_IB}" rel="nofollow noopener" target="_blank">gov.ie — Illness Benefit</a>. Detalhe operacional: <a href="${GOV_IB_GUIDE}" rel="nofollow noopener" target="_blank">Operational Guidelines</a>.`),
        ],
      },
      {
        id: "tax",
        nav: "Imposto",
        eyebrow: "O que surpreende muitos trabalhadores",
        h2: "O Illness Benefit e tributavel, mas o DSP normalmente paga sem descontar imposto primeiro",
        blocks: [
          lead("Muitas pessoas assumem que um apoio por doenca pago pelo Estado tem de ser isento. O Illness Benefit nao e isento de imposto."),
          p("A orientacao atual do Revenue diz que o Illness Benefit esta sujeito a <strong>Income Tax</strong>. O Revenue tambem diz que os pagamentos tributaveis do DSP, em geral, <strong>nao pagam USC nem PRSI</strong>. O detalhe administrativo importante e que o Department costuma pagar o Illness Benefit <strong>sem reter imposto na origem</strong>, e o Revenue cobra depois o imposto devido ajustando os creditos e o escalao de rendimento tributavel."),
          p("E por isso que o pagamento pode parecer 'sem imposto' quando entra na conta, mas o recibo, o Tax Credit Certificate ou a posicao fiscal de fim de ano mudam mais tarde. Se a entidade patronal tambem lhe paga sick pay, essa parte continua a ser tributada pelo payroll normal, enquanto o Revenue ajusta separadamente o beneficio do DSP."),
          ul([
            "<strong>Pagamento do DSP:</strong> normalmente pago em bruto para efeitos de Income Tax, com acerto posterior pelo Revenue.",
            "<strong>Income Tax:</strong> sim, pode ser devido.",
            "<strong>USC e PRSI nos pagamentos tributaveis do DSP:</strong> o Revenue diz que nao.",
            "<strong>Sick pay do empregador:</strong> continua sujeito as regras normais de payroll.",
          ]),
          warn(
            "Nao olhe apenas para o credito no banco",
            "Receber uma semana completa de Illness Benefit na conta nao mostra sozinho o custo fiscal real. O Revenue pode recuperar o Income Tax mais tarde ao reduzir creditos, e isso pode surgir apenas quando o payroll atualiza.",
          ),
          p("Se precisa de prova formal do que o DSP pagou num determinado periodo, o MyWelfare disponibiliza tambem um <strong>payment statement</strong>. Muitas vezes e a forma mais limpa de reconciliar o que recebeu com o que a empresa e o Revenue estao a mostrar."),
          cite(`Tributacao: <a href="${REVENUE_TAX}" rel="nofollow noopener" target="_blank">Revenue — taxation of illness benefits</a>. Regra geral DSP: <a href="${REVENUE_DSP_TAX}" rel="nofollow noopener" target="_blank">Revenue — how DSP payments are taxed</a>.`),
        ],
      },
      {
        id: "employer",
        nav: "Empresa",
        eyebrow: "Fluxos separados",
        h2: "A baixa estatutaria do empregador e o Illness Benefit nao sao o mesmo pagamento",
        blocks: [
          lead("Esta diferenca importa porque muitos trabalhadores na Irlanda ainda descrevem todo o periodo de ausencia como 'Illness Benefit', quando isso nao esta juridicamente correto."),
          p("O Illness Benefit e pago pelo <strong>Department of Social Protection</strong>. A statutory sick leave e paga pela <strong>entidade patronal</strong>. As duas coisas podem coexistir no mesmo episodio de doenca, mas nao pertencem ao mesmo esquema nem seguem as mesmas regras. Em <strong>24 de agosto de 2026</strong>, a posicao oficial do governo continua a ser que a statutory sick leave ficou em <strong>5 dias</strong> depois da decisao de 8 de abril de 2025 de nao a aumentar."),
          p("Essa data e importante porque muitos artigos ainda repetem o plano antigo que falava em 10 dias em 2026. Essa nao e a posicao atual. Se um artigo de RH lhe disser que todas as pessoas tem automaticamente 10 dias de statutory sick leave em 2026, esta desatualizado."),
          ul([
            "<strong>Sick leave paga pelo empregador</strong> cobre muitas vezes o inicio da ausencia, segundo o contrato e o minimo estatutario.",
            "<strong>Illness Benefit</strong> continua a ser o pagamento semanal do DSP quando as suas proprias regras entram em jogo.",
            "<strong>Esquemas ocupacionais de sick pay</strong> podem ser mais generosos do que o minimo, mas isso depende do empregador.",
            "<strong>A pergunta certa para o payroll</strong> nao e 'estou em Illness Benefit?', mas sim 'que parte desta semana e salario do empregador e que parte e pagamento do DSP?'",
          ]),
          p("Se o que precisa e do certificado e do percurso de pedido, e nao da mecanica do pagamento, volte ao nosso <a href=\"" + ptLinks.claimGuide + "\">guia passo a passo do Illness Benefit</a>. Aí explicamos o IB1 e a prova medica em detalhe."),
          cite(`Situacao oficial atual da statutory sick leave: <a href="${ENTERPRISE_SICK_LEAVE}" rel="nofollow noopener" target="_blank">Department of Enterprise, 8 April 2025</a>.`),
        ],
      },
      {
        id: "practical",
        nav: "Verificacoes",
        eyebrow: "Evitar atrasos evitaveis",
        h2: "O que verificar se o dinheiro chega tarde, em valor diferente ou de forma estranha",
        blocks: [
          lead("A maior parte das queixas de pagamento nao nasce do numero principal. Nasce do calendario, de dados desencontrados ou de duvidas sobre imposto."),
          ul([
            "Confirme se os primeiros 3 dias de ausencia eram dias de espera e nao dias pagaveis de Illness Benefit.",
            "Confirme se a empresa pagou separadamente os primeiros dias atraves de statutory ou contractual sick pay.",
            "Confirme se o pedido e o certificado medico foram ambos submetidos sem atraso.",
            "Confirme se o Revenue atualizou os seus creditos fiscais depois de o pedido DSP ter ficado ativo.",
            "Confirme se um regresso ao trabalho, uma viagem ou uma alteracao bancária precisa de ser comunicada.",
          ]),
          p("Se o problema nao for o valor mas a falta de avancos do pedido, o MyWelfare continua a ser o sitio oficial mais util para rever o servico e as acoes relacionadas com a conta. Se o problema for a certificacao medica, o nosso <a href=\"" + ptLinks.service + "\">servico de atestado medico na Irlanda</a> explica o que um medico online pode e nao pode certificar. Se o problema for agravamento clinico e nao papelada, o pedido pode esperar e a sua saude nao."),
          warn(
            "Sintomas de emergencia tem prioridade sobre a duvida de pagamento",
            "Se tiver dor no peito, sintomas de AVC, falta de ar grave, colapso ou outra emergencia, ligue 112 ou 999. Um pagamento atrasado nunca e a prioridade nesse momento.",
          ),
        ],
      },
    ],
    linksEyebrow: "Global Health Irlanda",
    linksH2: "Proximos passos uteis",
    linksLead: "Use este guia para duvidas de valor, prazo e payroll. Use o guia de pedido e a consulta medica quando ainda precisa do certificado e do percurso formal.",
    links: [
      { label: "Guia de pedido do Illness Benefit", href: ptLinks.claimGuide },
      { label: "Servico de atestado medico online na Irlanda", href: ptLinks.service },
      { label: "Conheca os nossos medicos na Irlanda", href: ptLinks.doctors },
      { label: "Contactar a Global Health Irlanda", href: ptLinks.contact },
    ],
    ctaBox: {
      h3: "Precisa do certificado antes de o pagamento arrancar?",
      text: "Os nossos medicos na Irlanda podem avaliar se um Certificate of Incapacity for Work e clinicamente apropriado e orientar o proximo passo.",
      primary: { label: "Marcar consulta online", href: ptLinks.service },
      secondary: { label: "Ler o guia de pedido", href: ptLinks.claimGuide },
    },
    sourcesEyebrow: "Fontes oficiais",
    sourcesH2: "De onde vem a regra do pagamento",
    sourcesLead: "Este artigo usa fontes oficiais irlandesas atualizadas para valor, prazo, imposto e situacao atual da sick leave do empregador, em vez de repetir numeros antigos de blog.",
    sources: [
      { label: "MyWelfare — Illness Benefit", href: MYWELFARE },
      { label: "gov.ie — Illness Benefit", href: GOV_IB },
      { label: "gov.ie — Operational Guidelines", href: GOV_IB_GUIDE },
      { label: "Revenue — taxation of illness benefits", href: REVENUE_TAX },
      { label: "Revenue — how DSP payments are taxed", href: REVENUE_DSP_TAX },
      { label: "Government of Ireland — statutory sick leave remains at 5 days", href: ENTERPRISE_SICK_LEAVE },
    ],
    sourcesNote:
      "Os links abrem no site da entidade emissora. A Global Health nao decide elegibilidade, datas de pagamento, tratamento fiscal ou pratica de payroll em pedidos de Illness Benefit.",
    faqEyebrow: "FAQ",
    faqH2: "Perguntas frequentes sobre pagamento",
    faqs: [
      {
        q: "Quanto paga atualmente o Illness Benefit na Irlanda?",
        a: "Na pagina live do MyWelfare verificada em 24 de agosto de 2026, a taxa pessoal semanal apresentada e EUR 254. Esse e o valor oficial principal, mas nao deve ser transformado na ideia de que todos os requerentes recebem exatamente o mesmo montante liquido.",
      },
      {
        q: "Porque nao recebi desde o primeiro dia de baixa?",
        a: "A pagina live do gov.ie diz que nao ha pagamento nos primeiros 3 dias em que esta off sick. Esses sao os dias de espera atuais. O primeiro pagamento do DSP tambem depende do registo do pedido e do certificado medico.",
      },
      {
        q: "Em que dia da semana o Illness Benefit e pago?",
        a: "O Illness Benefit e pago semanalmente, mas a pagina oficial do gov.ie diz que pode ser pago entre segunda e sabado, dependendo do momento em que o pedido e registado e do primeiro dia da doenca. Nao existe um unico dia universal para todos os pedidos.",
      },
      {
        q: "O Illness Benefit paga imposto na Irlanda?",
        a: "Sim. O Revenue diz que o Illness Benefit esta sujeito a Income Tax. O mesmo Revenue diz que os pagamentos tributaveis do DSP, em geral, nao pagam USC nem PRSI. Normalmente o DSP paga sem reter imposto na origem e o Revenue cobra depois o imposto devido ajustando creditos e o escalao de rendimento tributavel.",
      },
      {
        q: "O Illness Benefit e a mesma coisa que o sick pay da empresa?",
        a: "Nao. O Illness Benefit e um pagamento do Department of Social Protection. A statutory sick leave e paga pelo empregador. Em 24 de agosto de 2026, a posicao oficial do governo continua a ser que a statutory sick leave ficou em 5 dias depois da decisao de 8 de abril de 2025.",
      },
    ],
    disclaimerTitle: "Aviso medico",
    disclaimer:
      "Escrito pelo Dr Tiago Miguel Figueira (IMC 523449), Diretor Clinico da Global Health. A revisão clínica e editorial nativa pelo Dr Ahmed Maklad é obrigatória antes da publicação. Este artigo fornece informacao geral sobre o calendario de pagamento e a tributacao do sistema irlandes. Nao constitui aconselhamento medico personalizado, juridico, fiscal ou de payroll. As decisoes sobre Illness Benefit cabem ao Department of Social Protection e ao Revenue. Se tiver sintomas de emergencia, ligue imediatamente 112 ou 999.",
  } satisfies Article,
};

const es: LocalePost = {
  locale: "ES",
  slug: "pago-illness-benefit-irlanda-cuantia-impuestos-plazos",
  title: "Pago del Illness Benefit en Irlanda: cuantia, plazo e impuestos",
  excerpt:
    "Cuanto paga el Illness Benefit en Irlanda, cuando suele llegar el primer ingreso, por que los primeros dias de baja funcionan distinto y como lo trata Revenue a efectos fiscales.",
  seoTitle: "Pago del Illness Benefit en Irlanda",
  seoDescription:
    "Cuantia actual, dias de espera, calendario semanal, impuestos y diferencia entre Illness Benefit y la baja pagada por la empresa.",
  category: "Medicina General",
  article: {
    lang: "es-ES",
    tagline: "Medicina a cualquier hora, en cualquier lugar",
    categoryLabel: "Medicina General",
    categoryHref: esLinks.blog,
    eyebrow: "Irlanda · Guia de pago",
    h1: "Pago del Illness Benefit en Irlanda",
    deck: "Cuanto paga el Department of Social Protection, cuando paga, como entra el impuesto y por que la baja abonada por la empresa sigue importando primero.",
    intro:
      "El <strong>Illness Benefit</strong> es un <strong>pago semanal del Department of Social Protection</strong> para quien no puede trabajar por enfermedad. A fecha de <strong>24 de agosto de 2026</strong>, la pagina oficial de MyWelfare muestra una <strong>cuantia personal semanal de EUR 254</strong>, pero eso <strong>no</strong> significa que todas las personas cobren exactamente ese importe neto. El momento del pago depende de los dias de espera, de cuando entran en sistema la solicitud y el certificado medico, de si antes hay sick pay de la empresa y de como Revenue ajusta el impuesto. Si lo que necesita es la elegibilidad y el proceso IB1, lea nuestra <a href=\"" + esLinks.claimGuide + "\">guia para solicitar Illness Benefit</a>.",
    facts: [
      "Cuantia personal semanal oficial mostrada hoy en MyWelfare: EUR 254",
      "Los primeros 3 dias siguen siendo waiting days en la pagina vigente del DSP",
      "El Illness Benefit tributa aunque el DSP normalmente lo pague sin retener primero",
    ],
    primaryCta: { label: "Ver la guia para solicitarlo", href: esLinks.claimGuide },
    secondaryCta: { label: "Pagina oficial del Illness Benefit", href: GOV_IB },
    panelChip: "Que resuelve esta guia",
    panelParas: [
      "La cifra vigente que la gente busca, sin fingir que existe una cantidad identica para todos los expedientes reales.",
      "Cuando empieza el Illness Benefit, por que el primer pago puede tardar y donde encaja el sick pay de la empresa en ese hueco.",
      "Como tributa el Illness Benefit, que hace Revenue por detras y por que la nomina puede cambiar mientras la prestacion esta activa.",
    ],
    author: { initials: "TF", name: "Dr Tiago Miguel Figueira", line: "IMC 523449 · Director Clinico, Global Health" },
    reviewLine: "Revisión clínica y editorial nativa por el Dr Ahmed Maklad obligatoria antes de publicar.",
    navLabel: "En este articulo",
    sections: [
      {
        id: "scope",
        nav: "Alcance",
        eyebrow: "No mezcle dos articulos",
        h2: "Este articulo trata del pago, no de si cumple los requisitos",
        blocks: [
          lead("La mayoria de las personas llega aqui despues de oir hablar del Illness Benefit y querer una respuesta practica: cuanto dinero entra y cuando entra."),
          p("Esa pregunta no es la misma que <strong>si tiene derecho</strong>, como funcionan las condiciones de PRSI o quien puede emitir el Certificate of Incapacity for Work. Ya explicamos esos puntos en nuestra <a href=\"" + esLinks.claimGuide + "\">guia de solicitud del Illness Benefit</a>, y separarlos ayuda a no mezclar dos intenciones de busqueda distintas."),
          p("Por eso esta pagina se mantiene estrecha: cubre la cuantia semanal que muestra hoy el servicio oficial, los tres dias de espera de la pagina del DSP, el ciclo semanal de pago y el tratamiento fiscal descrito por Revenue. Tambien aclara por que muchos trabajadores llaman 'Illness Benefit' a todo el periodo de baja cuando, en realidad, hay dinero del empleador y dinero del Estado con reglas diferentes."),
          warn(
            "No convierta esta busqueda en una sola cifra",
            "La frase 'illness benefit payment' suena a numero unico, pero lo que finalmente llega a su cuenta puede variar por el inicio del expediente, posibles incrementos, la politica de sick pay de la empresa y el impuesto que Revenue recupera mas tarde.",
          ),
        ],
      },
      {
        id: "rate",
        nav: "Cuantia actual",
        eyebrow: "El numero que importa",
        h2: "La cuantia personal oficial actual es EUR 254 por semana, pero no es toda la historia",
        blocks: [
          lead("En la pagina vigente de MyWelfare revisada el 24 de agosto de 2026, la cuantia personal semanal mostrada para Illness Benefit es EUR 254."),
          p("Ese es el dato principal y responde a la busqueda. Pero sigue siendo solo la <strong>linea de la cuantia personal</strong> en la fuente oficial. No significa que todas las personas vayan a ver exactamente EUR 254 entrar en su cuenta cada semana. Algunos expedientes tienen circunstancias distintas y la situacion neta tambien puede cambiar cuando Revenue ajusta creditos fiscales."),
          ul([
            "<strong>Use EUR 254 como cuantia personal semanal oficial actual</strong> porque es lo que publica hoy MyWelfare.",
            "<strong>No escriba 'todo el mundo cobra EUR 254'</strong> porque eso es mas amplio que la propia fuente oficial.",
            "<strong>No recicle cifras antiguas de Budget</strong> cuando el servicio en vivo ya muestra la cantidad actual.",
            "<strong>Si su situacion no es estandar</strong>, el importe puede diferir de la cuantia personal de referencia.",
          ]),
          p("Dicho de forma simple: el resumen prudente es que el Illness Benefit aparece hoy con una cuantia personal semanal de EUR 254 en el servicio oficial, pero el dinero final de un caso concreto puede diferir por como este construido el expediente y por el efecto fiscal posterior."),
          cite(`Fuente vigente: <a href="${MYWELFARE}" rel="nofollow noopener" target="_blank">MyWelfare — Illness Benefit</a>.`),
        ],
      },
      {
        id: "timing",
        nav: "Cuando paga",
        eyebrow: "Inicio y dia efectivo",
        h2: "Por que el primer pago suele llegar mas tarde de lo que la gente espera",
        blocks: [
          lead("El Illness Benefit se paga cada semana, pero no arranca automaticamente el mismo dia en que usted deja de trabajar."),
          p("La pagina vigente del DSP dice que <strong>no hay pago de Illness Benefit durante los primeros 3 dias</strong> en los que esta de baja por enfermedad. Esos son los waiting days actuales. La misma pagina tambien dice que la prestacion se <strong>paga semanalmente</strong> y puede abonarse <strong>de lunes a sabado</strong> segun cuando se registre la solicitud y cual sea el primer dia de la enfermedad."),
          p("Esa unica regla explica casi toda la confusion del primer ingreso. Su primera semana fuera del trabajo puede tener tres capas: la empresa puede deberle statutory sick leave u occupational sick pay al principio; el DSP sigue aplicando sus propios waiting days; y el Department no puede soltar el pago hasta tener la solicitud y el certificado medico dentro del sistema."),
          ul([
            "Solicite pronto: MyWelfare dice que debe presentar la solicitud dentro de <strong>6 semanas</strong> desde que enferma, aunque la empresa siga pagandole al principio.",
            "Espere un hueco entre el primer dia que no trabaja y el primer pago del DSP, porque siguen contando los dias de espera y el registro del expediente.",
            "No existe un unico dia de pago para todas las personas; la pagina de gov.ie dice que puede caer entre lunes y sabado.",
            "Si la decision llega mas tarde, puede haber atrasos, pero eso no convierte la primera semana en una continuacion normal de la nomina.",
          ]),
          p("En la practica, si esta calculando alquiler y facturas, no suponga que el primer pago del DSP seguira el mismo ritmo que el payroll de su empresa. Es una prestacion social con calendario propio."),
          cite(`Calendario oficial: <a href="${GOV_IB}" rel="nofollow noopener" target="_blank">gov.ie — Illness Benefit</a>. Detalle de tramitacion: <a href="${GOV_IB_GUIDE}" rel="nofollow noopener" target="_blank">Operational Guidelines</a>.`),
        ],
      },
      {
        id: "tax",
        nav: "Impuestos",
        eyebrow: "Lo que sorprende a muchos trabajadores",
        h2: "El Illness Benefit tributa, pero el DSP normalmente paga sin retener primero",
        blocks: [
          lead("Mucha gente asume que una prestacion publica por enfermedad debe ser exenta. El Illness Benefit no lo es."),
          p("La guia actual de Revenue dice que el Illness Benefit esta sujeto a <strong>Income Tax</strong>. Revenue tambien dice que los pagos tributables del DSP, en general, <strong>no estan sujetos a USC ni PRSI</strong>. El detalle administrativo clave es que el Department suele pagar el Illness Benefit <strong>sin deducir el impuesto en origen</strong>, y luego Revenue recauda el Income Tax debido reduciendo creditos y el tramo de renta sujeto a gravamen."),
          p("Por eso el ingreso puede parecer 'sin impuestos' cuando entra en la cuenta y, sin embargo, la nomina, el Tax Credit Certificate o la posicion fiscal de final de ano cambian despues. Si su empresa tambien le paga sick pay, esa parte sigue tributando como salario normal en payroll, mientras Revenue ajusta aparte la prestacion del DSP."),
          ul([
            "<strong>Pago del DSP:</strong> normalmente se abona en bruto a efectos de Income Tax y Revenue ajusta despues.",
            "<strong>Income Tax:</strong> si, puede corresponder.",
            "<strong>USC y PRSI sobre pagos tributables del DSP:</strong> Revenue dice que no.",
            "<strong>Sick pay de la empresa:</strong> sigue las reglas normales de tributacion de la nomina.",
          ]),
          warn(
            "No lea el ingreso bancario de forma aislada",
            "Que entre una semana completa de Illness Benefit en su cuenta no le dice por si solo el coste fiscal real. Revenue puede recuperar el Income Tax mas tarde reduciendo creditos, y eso puede notarse solo cuando se actualiza payroll.",
          ),
          p("Si necesita una prueba exacta de lo que el DSP pago en un periodo, MyWelfare tambien ofrece un <strong>payment statement</strong>. Suele ser la forma mas clara de reconciliar lo cobrado con lo que muestran la empresa y Revenue."),
          cite(`Fiscalidad: <a href="${REVENUE_TAX}" rel="nofollow noopener" target="_blank">Revenue — taxation of illness benefits</a>. Regla general DSP: <a href="${REVENUE_DSP_TAX}" rel="nofollow noopener" target="_blank">Revenue — how DSP payments are taxed</a>.`),
        ],
      },
      {
        id: "employer",
        nav: "Empresa",
        eyebrow: "Dinero distinto",
        h2: "La baja estatutaria pagada por la empresa y el Illness Benefit no son lo mismo",
        blocks: [
          lead("Esta diferencia importa porque muchos trabajadores en Irlanda siguen llamando 'Illness Benefit' a todo el periodo de baja, y eso no es correcto en terminos legales."),
          p("El Illness Benefit lo paga el <strong>Department of Social Protection</strong>. La statutory sick leave la paga <strong>su empleador</strong>. Pueden convivir en el mismo episodio de enfermedad, pero no pertenecen al mismo esquema ni siguen las mismas normas. A fecha de <strong>24 de agosto de 2026</strong>, la posicion oficial del gobierno sigue siendo que la statutory sick leave se mantuvo en <strong>5 dias</strong> tras la decision del 8 de abril de 2025 de no subirla."),
          p("Esa fecha importa porque muchos articulos siguen repitiendo el plan antiguo que hablaba de 10 dias en 2026. Esa ya no es la posicion actual. Si un articulo de recursos humanos dice que toda persona empleada tiene automaticamente 10 dias de statutory sick leave en 2026, ese contenido esta desactualizado."),
          ul([
            "<strong>La baja pagada por la empresa</strong> suele cubrir el arranque de muchas ausencias, segun el contrato y el minimo legal.",
            "<strong>Illness Benefit</strong> sigue siendo el pago semanal del DSP una vez entran sus propias reglas.",
            "<strong>Los planes ocupacionales de sick pay</strong> pueden ser mas generosos que el minimo, pero eso depende del empleador.",
            "<strong>La pregunta correcta para payroll</strong> no es 'estoy en Illness Benefit?', sino 'que parte de esta semana es salario de empresa y que parte es pago del DSP?'",
          ]),
          p("Si lo que de verdad necesita es el certificado y la ruta de solicitud, no la mecanica del dinero, vuelva a nuestra <a href=\"" + esLinks.claimGuide + "\">guia paso a paso del Illness Benefit</a>. Alli cubrimos IB1 y evidencia medica con detalle."),
          cite(`Posicion oficial actual sobre statutory sick leave: <a href="${ENTERPRISE_SICK_LEAVE}" rel="nofollow noopener" target="_blank">Department of Enterprise, 8 April 2025</a>.`),
        ],
      },
      {
        id: "practical",
        nav: "Comprobaciones",
        eyebrow: "Evite retrasos evitables",
        h2: "Que revisar si el dinero llega tarde, en otra cantidad o de forma rara",
        blocks: [
          lead("La mayoria de las quejas de pago no nacen de la cuantia principal. Nacen del calendario, de datos que no coinciden o de confusion fiscal."),
          ul([
            "Compruebe si los primeros 3 dias de ausencia fueron waiting days y no dias pagables de Illness Benefit.",
            "Compruebe si la empresa pago aparte los dias iniciales mediante statutory o contractual sick pay.",
            "Compruebe si la solicitud y el certificado medico se enviaron sin retraso.",
            "Compruebe si Revenue ya actualizo sus creditos fiscales despues de activarse el expediente del DSP.",
            "Compruebe si hay que comunicar una vuelta al trabajo, un viaje o un cambio de cuenta bancaria.",
          ]),
          p("Si el problema no es la cuantia sino que el expediente no avanza, MyWelfare sigue siendo el lugar oficial mas util para revisar el servicio y las acciones ligadas a la cuenta. Si el problema es la certificacion medica, nuestro <a href=\"" + esLinks.service + "\">servicio de certificado medico online en Irlanda</a> explica que puede y que no puede certificar un medico por video. Si el problema es clinico y no administrativo, la solicitud puede esperar y su salud no."),
          warn(
            "Los sintomas de urgencia van antes que cualquier duda de pago",
            "Si tiene dolor toracico, sintomas de ictus, falta de aire importante, colapso u otra emergencia, llame al 112 o al 999. Un pago retrasado nunca es la prioridad en ese momento.",
          ),
        ],
      },
    ],
    linksEyebrow: "Global Health Irlanda",
    linksH2: "Siguientes pasos utiles",
    linksLead: "Use esta guia para dudas de cuantia, plazo y payroll. Use la guia de solicitud y la consulta medica cuando todavia necesita el certificado y la via formal.",
    links: [
      { label: "Guia para solicitar Illness Benefit", href: esLinks.claimGuide },
      { label: "Servicio de certificado medico online en Irlanda", href: esLinks.service },
      { label: "Conozca a nuestros medicos en Irlanda", href: esLinks.doctors },
      { label: "Contactar con Global Health Irlanda", href: esLinks.contact },
    ],
    ctaBox: {
      h3: "Necesita el certificado antes de que arranque el pago?",
      text: "Nuestros medicos en Irlanda pueden valorar si un Certificate of Incapacity for Work es clinicamente apropiado y orientarle sobre el siguiente paso.",
      primary: { label: "Reservar consulta online", href: esLinks.service },
      secondary: { label: "Leer la guia de solicitud", href: esLinks.claimGuide },
    },
    sourcesEyebrow: "Fuentes oficiales",
    sourcesH2: "De donde sale la regla del pago",
    sourcesLead: "Este articulo usa fuentes oficiales irlandesas vigentes para cuantia, plazo, impuestos y situacion actual de la sick leave pagada por la empresa en lugar de reciclar cifras antiguas.",
    sources: [
      { label: "MyWelfare — Illness Benefit", href: MYWELFARE },
      { label: "gov.ie — Illness Benefit", href: GOV_IB },
      { label: "gov.ie — Operational Guidelines", href: GOV_IB_GUIDE },
      { label: "Revenue — taxation of illness benefits", href: REVENUE_TAX },
      { label: "Revenue — how DSP payments are taxed", href: REVENUE_DSP_TAX },
      { label: "Government of Ireland — statutory sick leave remains at 5 days", href: ENTERPRISE_SICK_LEAVE },
    ],
    sourcesNote:
      "Los enlaces abren en la web del organismo emisor. Global Health no decide elegibilidad, fechas de pago, fiscalidad ni practicas de payroll en una reclamacion de Illness Benefit.",
    faqEyebrow: "FAQ",
    faqH2: "Preguntas frecuentes sobre el pago",
    faqs: [
      {
        q: "Cuanto paga ahora mismo el Illness Benefit en Irlanda?",
        a: "En la pagina vigente de MyWelfare revisada el 24 de agosto de 2026, la cuantia personal semanal mostrada es EUR 254. Esa es la cifra oficial principal, pero no debe convertirse en la idea de que toda persona cobra exactamente el mismo neto.",
      },
      {
        q: "Por que no cobre desde mi primer dia de baja?",
        a: "La pagina vigente de gov.ie dice que no hay pago durante los primeros 3 dias en que esta off sick. Esos son los waiting days actuales. El primer pago del DSP tambien depende de cuando se registran la solicitud y el certificado medico.",
      },
      {
        q: "Que dia de la semana se paga el Illness Benefit?",
        a: "El Illness Benefit se paga semanalmente, pero la pagina oficial de gov.ie dice que puede abonarse de lunes a sabado, segun cuando se registre la solicitud y cual sea el primer dia de la enfermedad. No hay un unico dia universal para todas las personas.",
      },
      {
        q: "El Illness Benefit paga impuestos en Irlanda?",
        a: "Si. Revenue dice que el Illness Benefit esta sujeto a Income Tax. Revenue tambien dice que los pagos tributables del DSP, en general, no estan sujetos a USC ni PRSI. Normalmente el DSP paga sin retener primero y Revenue recauda despues ajustando creditos y el tramo de renta sujeto a gravamen.",
      },
      {
        q: "El Illness Benefit es lo mismo que el sick pay de mi empresa?",
        a: "No. El Illness Benefit lo paga el Department of Social Protection. La statutory sick leave la paga la empresa. A fecha de 24 de agosto de 2026, la posicion oficial del gobierno sigue siendo que la statutory sick leave se mantuvo en 5 dias tras la decision de 8 de abril de 2025.",
      },
    ],
    disclaimerTitle: "Aviso medico",
    disclaimer:
      "Escrito por el Dr Tiago Miguel Figueira (IMC 523449), Director Clinico de Global Health. La revisión clínica y editorial nativa por el Dr Ahmed Maklad es obligatoria antes de publicar. Este articulo ofrece informacion general sobre el calendario de pago y la tributacion del sistema irlandes. No sustituye consejo medico individual, asesoramiento legal, fiscal ni de payroll. Las decisiones sobre Illness Benefit corresponden al Department of Social Protection y a Revenue. Si tiene sintomas de emergencia, llame de inmediato al 112 o al 999.",
  } satisfies Article,
};

const cs: LocalePost = {
  locale: "CS",
  slug: "illness-benefit-irsko-vyse-davky-dane-termin",
  title: "Illness Benefit v Irsku: vyse davky, dane a termin vyplaty",
  excerpt:
    "Kolik v Irsku plati Illness Benefit, kdy obvykle dorazi prvni platba, proc prvni dny nemoci funguji jinak a jak tuto davku zdanuje Revenue.",
  seoTitle: "Illness Benefit v Irsku: vyse davky a dane",
  seoDescription:
    "Aktualni castka, cekaci dny, tydenni vyplata, zdaneni a rozdil mezi Illness Benefit a sick pay od zamestnavatele.",
  category: "Prakticke lekarstvi",
  article: {
    lang: "cs-CZ",
    tagline: "Medicina kdykoli a odkudkoli",
    categoryLabel: "Prakticke lekarstvi",
    categoryHref: csLinks.blog,
    eyebrow: "Irsko · Pruvodce vyplatou",
    h1: "Illness Benefit v Irsku",
    deck: "Kolik plati Department of Social Protection, kdy penize prichazeji, jak funguje zdaneni a proc je dulezite odlisit statni davku od nemocenske vyplacene zamestnavatelem.",
    intro:
      "Illness Benefit je <strong>tydenni davka od irskeho Department of Social Protection</strong>, tedy uradu socialni ochrany, pro lidi, kteri nemohou pracovat kvuli nemoci. Ke dni <strong>24. srpna 2026</strong> ukazuje oficialni stranka MyWelfare <strong>zakladni osobni sazbu EUR 254 tydne</strong>, ale to <strong>neznamena</strong>, ze kazdy zadatel dostane na ucet presne stejnou cistou castku. Vysledek ovlivnuji cekaci dny, okamzik podani zadosti a lekarskeho potvrzeni, pripadna nemocenska od zamestnavatele a take zpusob, jakym irsky danovy urad Revenue upravi dan. Pokud hledate podminky naroku a samotnou zadost IB1, prejdete na nas samostatny <a href=\"" + csLinks.claimGuide + "\">navod jak o Illness Benefit zazadat</a>.",
    facts: [
      "Aktualne zobrazena osobni sazba na MyWelfare: EUR 254 tydne",
      "Prvni 3 dny pracovni neschopnosti jsou podle zive stranky DSP cekaci dny",
      "Illness Benefit je zdanitelny, i kdyz DSP obvykle nestrhava dan pri vyplate",
    ],
    primaryCta: { label: "Precist navod k zadosti", href: csLinks.claimGuide },
    secondaryCta: { label: "Oficialni stranka Illness Benefit", href: GOV_IB },
    panelChip: "Co tento clanek resi",
    panelParas: [
      "Aktualni castku, kterou lide nejcasteji hledaji, bez nepresneho tvrzeni, ze vsichni dostavaji stejnou sumu.",
      "Kdy davka realne zacina, proc prvni platba casto neprijde hned a kam do toho vstupuje placena nemocenska od zamestnavatele.",
      "Jak se Illness Benefit dani, co dela Revenue na pozadi a proc muze vyplatni paska vypadat jinak nez cekate.",
    ],
    author: { initials: "TF", name: "Dr Tiago Miguel Figueira", line: "IMC 523449 · Klinicky reditel, Global Health" },
    reviewLine: "Klinicky zrevidoval Dr Ahmed Maklad, vseobecny lekar, Global Health Irsko.",
    navLabel: "V tomto clanku",
    sections: [
      {
        id: "scope",
        nav: "Rozsah",
        eyebrow: "Nemesit dva navody",
        h2: "Tento clanek je o vyplate, ne o samotnem naroku",
        blocks: [
          lead("Vetsina lidi sem prijde ve chvili, kdy uz o Illness Benefit slysela a chce jednu praktickou odpoved: kolik penez prijde a kdy."),
          p("To je jina otazka nez <strong>zda mate narok</strong>, jak funguji irske prispevky <strong>PRSI</strong> neboli Pay Related Social Insurance, nebo kdo muze vystavit <strong>Certificate of Incapacity for Work</strong>, tedy potvrzeni o neschopnosti pracovat. Tyto body uz mame podrobne vysvetlene v samostatnem <a href=\"" + csLinks.claimGuide + "\">navodu k zadosti o Illness Benefit</a> a je dobre je nemichat, protoze i zamer vyhledavani je jiny."),
          p("Tato stranka proto zustava uzka a vecna. Resi aktualni tydenni sazbu z oficialni sluzby, tri cekaci dny podle stranky DSP, tedy Department of Social Protection, tydenni rytmus vyplaceni a danova pravidla popsana uradem Revenue. Zaroven vysvetluje, proc mnoho zamestnancu povazuje nemocenskou od zamestnavatele a Illness Benefit za jednu vec, i kdyz pravne jde o dva odlisne toky penez."),
          warn(
            "Nesnazte se vse zredukovat na jedno cislo",
            "Dotaz 'illness benefit payment' zni jednoduse, ale castka, ktera skutecne dorazi na ucet, se muze lisit podle nacasovani zadosti, moznych navyseni, pravidel zamestnavatele a dane dorovnane pozdeji pres Revenue.",
          ),
        ],
      },
      {
        id: "rate",
        nav: "Aktualni castka",
        eyebrow: "Cislo, ktere lide hledaji",
        h2: "Aktualni oficialni osobni sazba je EUR 254 tydne, ale to neni cely pribeh",
        blocks: [
          lead("Na zive strance MyWelfare zkontrolovane 24. srpna 2026 je pro Illness Benefit uvedena osobni tydenni sazba EUR 254."),
          p("To je hlavni cislo a odpovida na vyhledavani. Je to ale porad jen <strong>zakladni osobni sazba</strong> uvedena na oficialni strance. Neznamena to, ze kazdy uvidi na ucte kazdy tyden presne EUR 254. Nektere pripady se lisi okolnostmi a cisty vysledek muze vypadat jinak i kvuli pozdejsi danove uprave ze strany Revenue."),
          ul([
            "<strong>EUR 254 pouzivejte jako aktualni oficialni osobni tydenni sazbu</strong>, protoze to je castka, kterou MyWelfare prave zobrazuje.",
            "<strong>Nepiste, ze 'kazdy dostane EUR 254'</strong>, protoze to by bylo sirsi tvrzeni, nez dovoluje oficialni zdroj.",
            "<strong>Neprepisujte stare blogove castky z drivejsich rozpoctu</strong>, kdyz ziva sluzba ukazuje aktualni stav.",
            "<strong>Pokud mate nestandardni situaci</strong>, muze byt vysledna castka jina nez hlavni osobni sazba.",
          ]),
          p("Nejbezpecnejsi verejna formulace tedy zni: oficialni sluzba v soucasnosti uvadi osobni tydenni sazbu EUR 254, ale konecna castka konkretniho cloveka se muze lisit podle okolnosti spisu a nasledneho zdaneni."),
          cite(`Aktualni oficialni zdroj: <a href="${MYWELFARE}" rel="nofollow noopener" target="_blank">MyWelfare — Illness Benefit</a>.`),
        ],
      },
      {
        id: "timing",
        nav: "Kdy chodi",
        eyebrow: "Zacatek a den vyplaty",
        h2: "Proc prvni platba obvykle dorazi pozdeji, nez lide cekaji",
        blocks: [
          lead("Illness Benefit se vyplaci tydne, ale nespusti se automaticky v den, kdy poprve zavolate do prace, ze jste nemocni."),
          p("Aktualni stranka DSP rika, ze <strong>za prvni 3 dny</strong>, kdy jste mimo praci kvuli nemoci, <strong>se Illness Benefit neplati</strong>. To jsou aktualni cekaci dny. Stejna stranka zaroven uvadi, ze davka je <strong>vyplacena tydne</strong> a muze byt vyplacena <strong>od pondeli do soboty</strong> podle toho, kdy byla zadost zaregistrovana a ktery den byl prvnim dnem nemoci."),
          p("Prave to vysvetluje vetsinu zmatku kolem prvni platby. Prvni tyden nemoci muze mit tri vrstvy najednou: zamestnavatel muze nejdriv vyplacet svou zakonou nebo smluvni nemocenskou; DSP stale uplatni vlastni cekaci dny; a Department nemuze penize poslat, dokud nema v systemu zadost i podporne lekarske potvrzeni."),
          ul([
            "Podejte zadost vcas: MyWelfare rika, ze se ma podat do <strong>6 tydnu</strong> od zacatku nemoci, i kdyz vas zamestnavatel zprvu jeste plati.",
            "Pocitejte s mezerou mezi prvnim vynechanym pracovnim dnem a prvni platbou od DSP, protoze se pocitaji cekaci dny a cas registrace.",
            "Neexistuje jediny univerzalni den vyplaty pro vsechny; oficialni gov.ie uvadi rozpeti od pondeli do soboty.",
            "Pokud je rozhodnuti vydano pozdeji, mohou vzniknout doplatky zpetne, ale prvni tyden se tim nemeni na beznou mzdu.",
          ]),
          p("Prakticky to znamena, ze pri planovani najmu a beznych uctu neni rozumne pocitat s tim, ze prvni platba od DSP prijde ve stejnem rytmu jako vyplatni termin zamestnavatele. Jde o socialni davku s vlastnim kalendarem."),
          cite(`Pravidla vyplaty: <a href="${GOV_IB}" rel="nofollow noopener" target="_blank">gov.ie — Illness Benefit</a>. Operacni detail: <a href="${GOV_IB_GUIDE}" rel="nofollow noopener" target="_blank">Operational Guidelines</a>.`),
        ],
      },
      {
        id: "tax",
        nav: "Dane",
        eyebrow: "Co casto prekvapi",
        h2: "Illness Benefit je zdanitelny, ale DSP obvykle nestrhava dan hned pri odeslani platby",
        blocks: [
          lead("Mnoho lidi predpoklada, ze statni davka pri nemoci musi byt automaticky osvobozena od dane. U Illness Benefit to neplati."),
          p("Aktualni pokyny Revenue uvadeji, ze Illness Benefit podleha <strong>Income Tax</strong>, tedy dani z prijmu. Revenue zaroven vysvetluje, ze zdanitelne platby od DSP obecne <strong>nepodlehaji USC ani PRSI</strong>. Dulezity administrativni detail je ten, ze Department obvykle vyplaci Illness Benefit <strong>bez okamzite srazene dane</strong> a Revenue si prislusnou dan dotahne pozdeji upravou danovych kreditu a sazebniho pasma."),
          p("Proto muze platba na bankovnim vypisu vypadat, jako by prisla 'bez dane', zatimco pozdeji se zmeni vase vyplatni paska, danovy kredit nebo rocni danova pozice. Pokud zaroven dostavate nemocenskou od zamestnavatele, tato cast se dal dani jako bezna mzda v payrollu, zatimco Revenue zvlast zohledni platbu od DSP."),
          ul([
            "<strong>Platba od DSP:</strong> obvykle prijde bez primeho srazeni dane, Revenue ji zohledni nasledne.",
            "<strong>Dan z prijmu:</strong> ano, muze byt splatna.",
            "<strong>USC a PRSI u zdanitelnych plateb DSP:</strong> Revenue rika, ze ne.",
            "<strong>Nemocenska od zamestnavatele:</strong> zustava pod beznymi pravidly mezd a dani.",
          ]),
          warn(
            "Nehodnotte jen to, co prislo na ucet",
            "To, ze vam na ucet dorazi cela tydenni castka Illness Benefit, samo o sobe neznamena, ze uz je vse danove vyreseno. Revenue muze dan vybrat pozdeji pres snizene kredity a to se casto projevi az na dalsi vyplate.",
          ),
          p("Pokud potrebujete presne dokazat, co vam DSP za konkretni obdobi vyplatilo, MyWelfare umoznuje take ziskat <strong>payment statement</strong>, tedy vypis plateb. To je casto nejcistsi zpusob, jak porovnat castku z banky, evidenci zamestnavatele a nastaveni Revenue."),
          cite(`Danova pravidla: <a href="${REVENUE_TAX}" rel="nofollow noopener" target="_blank">Revenue — taxation of illness benefits</a>. Obecne zdaneni plateb DSP: <a href="${REVENUE_DSP_TAX}" rel="nofollow noopener" target="_blank">Revenue — how DSP payments are taxed</a>.`),
        ],
      },
      {
        id: "employer",
        nav: "Zamestnavatel",
        eyebrow: "Dva ruzne zdroje penez",
        h2: "Nemocenska od zamestnavatele a Illness Benefit nejsou tatyz platebni kanal",
        blocks: [
          lead("Tento rozdil je dulezity, protoze mnoho zamestnancu v Irsku stale oznacuje cely obdobi nemoci jako 'Illness Benefit', i kdyz je to pravne nepresne."),
          p("Illness Benefit vyplaci <strong>Department of Social Protection</strong>. Zakonna nemocenska neboli <strong>statutory sick leave</strong> je naopak placena <strong>zamestnavatelem</strong>. Oboji se muze objevit v ramci jedne nemoci, ale nejde o stejny system ani o stejna pravidla. K datu <strong>24. srpna 2026</strong> zustava oficialni stanovisko irske vlady takove, ze narok na statutory sick leave zustal po rozhodnuti z <strong>8. dubna 2025</strong> na <strong>5 dnech</strong>."),
          p("To je dulezite zduraznit, protoze rada clanku stale opakuje starsi plan, ktery pocital s 10 dny v roce 2026. To uz neodpovida aktualnimu stavu. Pokud nektery HR clanek tvrdi, ze kazdy zamestnanec ma v roce 2026 automaticky 10 dnu zakonem placene nemocenske, pracuje se zastaralou informaci."),
          ul([
            "<strong>Nemocenska od zamestnavatele</strong> casto kryje uvod absence podle smlouvy a zakonneho minima.",
            "<strong>Illness Benefit</strong> zustava tydenni statni davkou, jakmile se spusti jeho vlastni pravidla.",
            "<strong>Firemni sick-pay scheme</strong> muze byt stedrejsi nez zakonny minimal, ale zalezi na zamestnavateli.",
            "<strong>Spravna otazka pro mzdove oddeleni</strong> neni 'jsem na Illness Benefit?', ale 'ktera cast tohoto tydne je plat zamestnavatele a ktera cast je platba od DSP?'",
          ]),
          p("Pokud ale ve skutecnosti resite certifikat a cestu podani zadosti, ne samotnou mechaniku penez, vratte se k nasemu <a href=\"" + csLinks.claimGuide + "\">podrobnemu navodu k zadosti o Illness Benefit</a>. Tam rozebirame formular IB1 i lekarsky podklad krok za krokem."),
          cite(`Aktualni stanovisko ke statutory sick leave: <a href="${ENTERPRISE_SICK_LEAVE}" rel="nofollow noopener" target="_blank">Department of Enterprise, 8 April 2025</a>.`),
        ],
      },
      {
        id: "practical",
        nav: "Co zkontrolovat",
        eyebrow: "Prakticke overeni",
        h2: "Co proverit, kdyz penize prisly pozde, v jine castce nebo nelogicky",
        blocks: [
          lead("Vetsina stiznosti na vyplatu nevznika kvuli samotne hlavni sazbe. Problem byva v nacasovani, nesouladu udaju nebo v danovem nastaveni."),
          ul([
            "Overte, zda prvni 3 dny absence byly cekaci dny a ne dny, za ktere se mel Illness Benefit vyplatit.",
            "Overte, zda zamestnavatel nevyplatil uvodni dny zvlast jako statutory nebo contractual sick pay.",
            "Overte, zda byla vcas odeslana zadost i lekarske potvrzeni.",
            "Overte, zda Revenue po aktivaci platby upravil vase danove kredity.",
            "Overte, zda neni treba nahlasit navrat do prace, cestu do zahranici nebo zmenu bankovniho uctu.",
          ]),
          p("Jestli problem neni v castce, ale v tom, ze se zadost nikam neposouva, zustava MyWelfare nejuzitecnejsim oficialnim mistem pro kontrolu stavu sluzby a souvisejicich ukonu. Pokud je problem v lekarskem potvrzeni, nase <a href=\"" + csLinks.service + "\">irska online sluzba pro sick certificate</a> vysvetluje, co muze a nemuze lekar po videokonzultaci potvrdit. Pokud se ale nezhorsuje administrativa, nybrz zdravotni stav, papir muze pockat a vase zdravi ne."),
          warn(
            "Pri urgentnich priznacich neres­te nejdriv penize",
            "Pri bolesti na hrudi, priznacich mozkove mrtvice, tezke dusnosti, kolapsu nebo jinem akutnim stavu volejte 112 nebo 999. Zpozdena davka v tu chvili neni hlavni problem.",
          ),
        ],
      },
    ],
    linksEyebrow: "Global Health Irsko",
    linksH2: "Uzitecne dalsi kroky",
    linksLead: "Tento clanek pouzijte pro otazky k castce, terminu a zdaneni. Navod k zadosti a lekarskou cestu pouzijte, pokud jeste potrebujete potvrzeni a formalni postup.",
    links: [
      { label: "Navod k zadosti o Illness Benefit", href: csLinks.claimGuide },
      { label: "Online sluzba pro sick certificate v Irsku", href: csLinks.service },
      { label: "Poznejte nase lekare v Irsku", href: csLinks.doctors },
      { label: "Kontakt Global Health Irsko", href: csLinks.contact },
    ],
    ctaBox: {
      h3: "Potrebujete potvrzeni driv, nez se platba rozbehne?",
      text: "Nasi irsti lekari mohou posoudit, zda je Certificate of Incapacity for Work klinicky primereny, a nasmerovat vas na spravny dalsi krok.",
      primary: { label: "Objednat online konzultaci", href: csLinks.service },
      secondary: { label: "Precist navod k zadosti", href: csLinks.claimGuide },
    },
    sourcesEyebrow: "Oficialni zdroje",
    sourcesH2: "Odkud pravidla pro vyplatu vychazeji",
    sourcesLead: "Clanek vychazi z aktualnich irskych oficialnich zdroju pro castku, nacasovani, zdaneni i soucasny stav employer sick leave a neopakuje stare blogove udaje.",
    sources: [
      { label: "MyWelfare — Illness Benefit", href: MYWELFARE },
      { label: "gov.ie — Illness Benefit", href: GOV_IB },
      { label: "gov.ie — Operational Guidelines", href: GOV_IB_GUIDE },
      { label: "Revenue — taxation of illness benefits", href: REVENUE_TAX },
      { label: "Revenue — how DSP payments are taxed", href: REVENUE_DSP_TAX },
      { label: "Government of Ireland — statutory sick leave remains at 5 days", href: ENTERPRISE_SICK_LEAVE },
    ],
    sourcesNote:
      "Odkazy vedou na weby vydavajicich instituci. Global Health nerozhoduje o naroku, terminu vyplaty, danovem zachazeni ani mzdove praxi u zadosti o Illness Benefit.",
    faqEyebrow: "FAQ",
    faqH2: "Caste otazky k vyplate",
    faqs: [
      {
        q: "Kolik Illness Benefit v Irsku aktualne plati?",
        a: "Na zive strance MyWelfare zkontrolovane 24. srpna 2026 je uvedena osobni tydenni sazba EUR 254. To je hlavni oficialni castka, ale nema se z ni delat zavazne tvrzeni, ze kazdy dostane stejny cisty prijem.",
      },
      {
        q: "Proc jsem nedostal penize od prvniho dne nemoci?",
        a: "Aktualni stranka gov.ie uvadi, ze za prvni 3 dny, kdy jste off sick, se Illness Benefit neplati. To jsou soucasne cekaci dny. Prvni platba take zavisi na tom, kdy se do systemu dostane zadost a lekarske potvrzeni.",
      },
      {
        q: "Ktery den v tydnu Illness Benefit chodi?",
        a: "Illness Benefit se vyplaci tydne, ale oficialni gov.ie uvadi, ze platba muze prijit od pondeli do soboty podle toho, kdy byla zadost zaregistrovana a kdy zacala nemoc. Neexistuje jeden stejny den pro vsechny.",
      },
      {
        q: "Je Illness Benefit v Irsku zdanitelny?",
        a: "Ano. Revenue uvadi, ze Illness Benefit podleha dani z prijmu. Zaroven rika, ze zdanitelne platby DSP obecne nepodlehaji USC ani PRSI. DSP obvykle plati bez prime srazene dane a Revenue ji vybere pozdeji pres upravu kreditu a sazebniho pasma.",
      },
      {
        q: "Je Illness Benefit to same jako nemocenska od zamestnavatele?",
        a: "Ne. Illness Benefit plati Department of Social Protection. Zakonnou nemocenskou plati zamestnavatel. K 24. srpnu 2026 zustava oficialni stanovisko vlady takove, ze statutory sick leave zustal po rozhodnuti z 8. dubna 2025 na 5 dnech.",
      },
    ],
    disclaimerTitle: "Lekarske upozorneni",
    disclaimer:
      "Clanek napsal Dr Tiago Miguel Figueira (IMC 523449), klinicky reditel Global Health, a klinicky jej zrevidoval Dr Ahmed Maklad, vseobecny lekar. Text prinasi obecne informace o irskem socialnim systemu, nacasovani plateb a zdaneni. Nejde o individualni lekarskou, pravni, danovou ani mzdovou radu. O naroku a vyplate Illness Benefit rozhoduji Department of Social Protection a Revenue. Pri urgentnich priznacich okamzite volejte 112 nebo 999.",
  } satisfies Article,
};

const ro: LocalePost = {
  locale: "RO",
  slug: "plata-illness-benefit-irlanda-valoare-impozit-termen",
  title: "Plata Illness Benefit in Irlanda: valoare, termen si impozit",
  excerpt:
    "Cat plateste Illness Benefit in Irlanda, cand ajunge de obicei primul transfer, de ce primele zile de concediu medical functioneaza diferit si cum trateaza Revenue aceasta plata.",
  seoTitle: "Plata Illness Benefit in Irlanda",
  seoDescription:
    "Valoarea actuala, zilele de asteptare, momentul primei plati, impozitul si diferenta fata de sick pay-ul platit de angajator.",
  category: "Medicina Generala",
  article: {
    lang: "ro-RO",
    tagline: "Medicina oricand, oriunde",
    categoryLabel: "Medicina Generala",
    categoryHref: roLinks.blog,
    eyebrow: "Irlanda · Ghid de plata",
    h1: "Plata Illness Benefit in Irlanda",
    deck: "Cat plateste Department of Social Protection, cand plateste, cum intra impozitul in ecuatie si de ce plata de la angajator conteaza in continuare la inceput.",
    intro:
      "Illness Benefit este o <strong>plata saptamanala a Department of Social Protection</strong> pentru persoanele care nu pot lucra din cauza bolii. La data de <strong>24 august 2026</strong>, pagina oficiala MyWelfare arata o <strong>rata personala saptamanala de EUR 254</strong>, dar asta <strong>nu</strong> inseamna ca fiecare solicitant primeste exact aceeasi suma neta in cont. Calendarul depinde de zilele de asteptare, de momentul in care cererea si certificatul medical ajung in sistem, de eventualul sick pay al angajatorului si de felul in care Revenue ajusteaza impozitul. Daca aveti nevoie de eligibilitate si pasii IB1, cititi separat <a href=\"" + roLinks.claimGuide + "\">ghidul nostru pentru solicitarea Illness Benefit</a>.",
    facts: [
      "Rata personala saptamanala oficiala afisata acum pe MyWelfare: EUR 254",
      "Primele 3 zile raman waiting days pe pagina live a DSP",
      "Illness Benefit este impozabil chiar daca DSP plateste de obicei fara retinere initiala",
    ],
    primaryCta: { label: "Vezi ghidul de solicitare", href: roLinks.claimGuide },
    secondaryCta: { label: "Pagina oficiala Illness Benefit", href: GOV_IB },
    panelChip: "Ce acopera acest ghid",
    panelParas: [
      "Suma live pe care oamenii o cauta, fara sa pretinda ca exista un cuantum identic pentru toate dosarele reale.",
      "Cand incepe Illness Benefit, de ce prima plata poate intarzia si unde intra sick pay-ul angajatorului in acest interval.",
      "Cum este taxat Illness Benefit, ce face Revenue in fundal si de ce fluturasul de salariu poate arata ciudat cat timp plata este activa.",
    ],
    author: { initials: "TF", name: "Dr Tiago Miguel Figueira", line: "IMC 523449 · Director Clinic, Global Health" },
    reviewLine: "Revizuirea clinică și editorială nativă de către Dr Ahmed Maklad este obligatorie înainte de publicare.",
    navLabel: "In acest articol",
    sections: [
      {
        id: "scope",
        nav: "Scop",
        eyebrow: "Nu amesteca doua ghiduri",
        h2: "Acest articol este despre plata, nu despre eligibilitate",
        blocks: [
          lead("Cei mai multi oameni ajung aici dupa ce au auzit deja de Illness Benefit si vor un raspuns practic: cati bani intra si cand intra."),
          p("Aceasta intrebare este diferita de <strong>daca va calificati</strong>, cum functioneaza conditiile PRSI sau cine poate emite Certificate of Incapacity for Work. Noi explicam acele puncte in <a href=\"" + roLinks.claimGuide + "\">ghidul separat de solicitare Illness Benefit</a>, iar separarea temelor ajuta si la evitarea canibalizarii intre intentii diferite de cautare."),
          p("De aceea aceasta pagina ramane stricta: acopera suma saptamanala afisata acum in serviciul oficial, cele 3 zile de asteptare din pagina DSP, ciclul saptamanal de plata si tratamentul fiscal descris de Revenue. In plus, explica de ce multi angajati trateaza tot concediul medical ca 'Illness Benefit' desi, in realitate, exista bani de la angajator si bani de la stat cu reguli diferite."),
          warn(
            "Nu reduce cautarea la un singur numar",
            "Expresia 'illness benefit payment' suna ca o intrebare cu raspuns unic, dar suma care ajunge efectiv in cont poate varia din cauza inceputului dosarului, a unor majorari, a politicii de sick pay a angajatorului si a impozitului recuperat ulterior de Revenue.",
          ),
        ],
      },
      {
        id: "rate",
        nav: "Valoarea",
        eyebrow: "Numarul cautat",
        h2: "Rata personala oficiala actuala este EUR 254 pe saptamana, dar nu spune toata povestea",
        blocks: [
          lead("Pe pagina live MyWelfare verificata la 24 august 2026, rata personala saptamanala afisata pentru Illness Benefit este EUR 254."),
          p("Acesta este numarul principal si raspunde cautarii. Totusi, ramane doar <strong>linia ratei personale</strong> din sursa oficiala. Nu inseamna ca toata lumea va vedea exact EUR 254 intrand in cont in fiecare saptamana. Unele dosare au circumstante diferite, iar rezultatul net se poate schimba si dupa ce Revenue ajusteaza creditele fiscale."),
          ul([
            "<strong>Folositi EUR 254 ca rata personala saptamanala oficiala actuala</strong> pentru ca asta publica acum MyWelfare.",
            "<strong>Nu scrieti 'toata lumea primeste EUR 254'</strong> pentru ca aceasta afirmatie este mai larga decat permite sursa oficiala.",
            "<strong>Nu reciclati cifre vechi de buget</strong> atunci cand pagina live arata deja suma curenta.",
            "<strong>Daca situatia dumneavoastra nu este standard</strong>, suma poate diferi de rata personala de referinta.",
          ]),
          p("Pe scurt: cel mai sigur rezumat public este ca Illness Benefit apare in prezent cu o rata personala saptamanala de EUR 254 in serviciul oficial, dar suma finala dintr-un caz individual poate diferi in functie de structura dosarului si de efectul fiscal ulterior."),
          cite(`Sursa live: <a href="${MYWELFARE}" rel="nofollow noopener" target="_blank">MyWelfare — Illness Benefit</a>.`),
        ],
      },
      {
        id: "timing",
        nav: "Cand se plateste",
        eyebrow: "Data de start si ziua platii",
        h2: "De ce prima plata ajunge de obicei mai tarziu decat se asteapta oamenii",
        blocks: [
          lead("Illness Benefit se plateste saptamanal, dar nu porneste automat in dimineata in care lipsiti prima data de la lucru."),
          p("Pagina live DSP spune ca <strong>nu exista plata Illness Benefit pentru primele 3 zile</strong> in care sunteti off sick de la munca. Acestea sunt waiting days in prezent. Aceeasi pagina spune si ca plata este <strong>saptamanala</strong> si poate fi facuta <strong>de luni pana sambata</strong> in functie de momentul inregistrarii cererii si de prima zi a bolii."),
          p("Aceasta regula explica aproape toata confuzia legata de prima plata. Prima saptamana de absenta poate avea trei straturi: angajatorul poate datora statutory sick leave sau occupational sick pay la inceput; DSP aplica in continuare propriile zile de asteptare; iar Department nu poate elibera plata pana cand cererea si certificatul medical nu se afla ambele in sistem."),
          ul([
            "Depuneti cererea repede: MyWelfare spune ca trebuie sa solicitati plata in termen de <strong>6 saptamani</strong> de la imbolnavire, chiar daca angajatorul continua sa va plateasca la inceput.",
            "Asteptati-va la un interval intre prima zi fara munca si prima plata DSP, deoarece zilele de asteptare si inregistrarea dosarului conteaza.",
            "Prima zi efectiva de plata nu este aceeasi pentru toata lumea; pagina gov.ie spune ca poate cadea oricand intre luni si sambata.",
            "Daca decizia apare mai tarziu, pot exista sume retroactive, dar asta nu transforma prima saptamana intr-o continuare obisnuita a salariului.",
          ]),
          p("Practic, daca va organizati chiria si facturile, nu presupuneti ca primul transfer DSP va urma acelasi ritm ca payroll-ul angajatorului. Este o plata sociala cu propriul calendar."),
          cite(`Calendar oficial: <a href="${GOV_IB}" rel="nofollow noopener" target="_blank">gov.ie — Illness Benefit</a>. Detaliu operational: <a href="${GOV_IB_GUIDE}" rel="nofollow noopener" target="_blank">Operational Guidelines</a>.`),
        ],
      },
      {
        id: "tax",
        nav: "Impozit",
        eyebrow: "Ce surprinde multi angajati",
        h2: "Illness Benefit este impozabil, dar DSP plateste de obicei fara sa retina mai intai impozitul",
        blocks: [
          lead("Multi oameni presupun ca o plata sociala pentru boala trebuie sa fie neimpozabila. Illness Benefit nu este neimpozabil."),
          p("Ghidul actual Revenue spune ca Illness Benefit este supus <strong>Income Tax</strong>. Revenue spune de asemenea ca platile impozabile DSP, in general, <strong>nu sunt supuse USC sau PRSI</strong>. Detaliul administrativ important este ca Department plateste de obicei Illness Benefit <strong>fara sa deduca impozitul la sursa</strong>, iar Revenue recupereaza apoi impozitul datorat prin reducerea creditelor fiscale si a pragului de impozitare."),
          p("De aceea plata poate parea 'fara taxe' in momentul in care intra in cont, dar ulterior fluturasul de salariu, Tax Credit Certificate sau pozitia fiscala de final de an se schimba. Daca angajatorul are si un sick pay scheme, partea de salariu se taxeaza in continuare prin payroll normal, in timp ce Revenue ajusteaza separat plata DSP."),
          ul([
            "<strong>Plata DSP:</strong> de obicei este platita brut din perspectiva Income Tax, cu ajustare ulterioara de catre Revenue.",
            "<strong>Income Tax:</strong> da, poate fi datorat.",
            "<strong>USC si PRSI pentru plati impozabile DSP:</strong> Revenue spune nu.",
            "<strong>Sick pay-ul angajatorului:</strong> ramane supus regulilor normale de payroll.",
          ]),
          warn(
            "Nu interpretati izolat creditul bancar",
            "Faptul ca intra in cont o saptamana intreaga de Illness Benefit nu arata singur costul fiscal real. Revenue poate recupera Income Tax mai tarziu prin reducerea creditelor, iar asta se poate vedea abia dupa actualizarea payroll-ului.",
          ),
          p("Daca aveti nevoie de dovada exacta a ceea ce a platit DSP intr-o perioada, MyWelfare ofera si un <strong>payment statement</strong>. De multe ori este cea mai clara metoda de a reconcilia suma primita cu ceea ce arata angajatorul si Revenue."),
          cite(`Fiscalitate: <a href="${REVENUE_TAX}" rel="nofollow noopener" target="_blank">Revenue — taxation of illness benefits</a>. Regula generala DSP: <a href="${REVENUE_DSP_TAX}" rel="nofollow noopener" target="_blank">Revenue — how DSP payments are taxed</a>.`),
        ],
      },
      {
        id: "employer",
        nav: "Angajator",
        eyebrow: "Flux separat de bani",
        h2: "Concediul medical platit de angajator si Illness Benefit nu sunt aceeasi plata",
        blocks: [
          lead("Aceasta diferenta conteaza pentru ca multi angajati din Irlanda inca descriu toata perioada de concediu medical drept 'Illness Benefit', iar juridic nu este corect."),
          p("Illness Benefit este platit de <strong>Department of Social Protection</strong>. Statutory sick leave este platit de <strong>angajator</strong>. Cele doua pot coexista in acelasi episod de boala, dar nu apartin aceleiasi scheme si nu urmeaza aceleasi reguli. La data de <strong>24 august 2026</strong>, pozitia oficiala a guvernului ramane ca statutory sick leave a ramas la <strong>5 zile</strong> dupa decizia din 8 aprilie 2025 de a nu o creste."),
          p("Acea data conteaza pentru ca multe articole continua sa repete vechiul plan care vorbea despre 10 zile in 2026. Aceasta nu mai este pozitia actuala. Daca un articol de HR va spune ca fiecare angajat are automat 10 zile de statutory sick leave in 2026, continutul este invechit."),
          ul([
            "<strong>Sick leave platit de angajator</strong> acopera adesea inceputul absentei, in functie de contract si de minimul legal.",
            "<strong>Illness Benefit</strong> ramane plata saptamanala DSP odata ce intra in joc propriile sale reguli.",
            "<strong>Schemele ocupationale de sick pay</strong> pot fi mai generoase decat minimul, dar asta depinde de angajator.",
            "<strong>Intrebarea corecta pentru payroll</strong> nu este 'sunt pe Illness Benefit?', ci 'ce parte din aceasta saptamana este salariu de la angajator si ce parte este plata DSP?'",
          ]),
          p("Daca ceea ce va trebuie de fapt este certificatul si traseul cererii, nu mecanica banilor, reveniti la <a href=\"" + roLinks.claimGuide + "\">ghidul nostru pas cu pas pentru Illness Benefit</a>. Acolo explicam IB1 si dovada medicala in detaliu."),
          cite(`Pozitia oficiala actuala privind statutory sick leave: <a href="${ENTERPRISE_SICK_LEAVE}" rel="nofollow noopener" target="_blank">Department of Enterprise, 8 April 2025</a>.`),
        ],
      },
      {
        id: "practical",
        nav: "Verificari",
        eyebrow: "Evitati intarzieri evitabile",
        h2: "Ce sa verificati daca banii vin tarziu, diferit sau ciudat",
        blocks: [
          lead("Majoritatea plangerilor despre plata nu pornesc de la suma principala. Ele pornesc de la calendar, de la date nealiniate sau de la confuzia fiscala."),
          ul([
            "Verificati daca primele 3 zile de absenta au fost waiting days si nu zile platibile de Illness Benefit.",
            "Verificati daca angajatorul a platit separat zilele initiale prin statutory sau contractual sick pay.",
            "Verificati daca cererea si certificatul medical au fost ambele trimise la timp.",
            "Verificati daca Revenue a actualizat creditele fiscale dupa activarea dosarului DSP.",
            "Verificati daca trebuie raportata intoarcerea la munca, o calatorie sau schimbarea contului bancar.",
          ]),
          p("Daca problema nu este suma, ci faptul ca dosarul nu avanseaza, MyWelfare ramane cel mai util loc oficial pentru a verifica serviciul si actiunile legate de cont. Daca problema este certificarea medicala, serviciul nostru de <a href=\"" + roLinks.service + "\">certificat medical online in Irlanda</a> explica ce poate si ce nu poate certifica un medic prin video. Daca problema este deteriorarea clinica, nu birocratia, cererea poate astepta iar sanatatea nu."),
          warn(
            "Simptomele de urgenta au prioritate fata de intrebarile despre bani",
            "Daca aveti durere toracica, simptome de AVC, lipsa severa de aer, colaps sau alta urgenta, sunati la 112 sau 999. O plata intarziata nu este niciodata prioritatea in acel moment.",
          ),
        ],
      },
    ],
    linksEyebrow: "Global Health Irlanda",
    linksH2: "Pasi utili urmatori",
    linksLead: "Folositi acest ghid pentru intrebari despre suma, termen si payroll. Folositi ghidul de solicitare si consultatia medicala daca mai aveti nevoie de certificat si traseul formal.",
    links: [
      { label: "Ghidul de solicitare Illness Benefit", href: roLinks.claimGuide },
      { label: "Serviciu de certificat medical online in Irlanda", href: roLinks.service },
      { label: "Cunoasteti medicii nostri din Irlanda", href: roLinks.doctors },
      { label: "Contactati Global Health Irlanda", href: roLinks.contact },
    ],
    ctaBox: {
      h3: "Aveti nevoie de certificat inainte sa inceapa plata?",
      text: "Medicii nostri din Irlanda pot evalua daca un Certificate of Incapacity for Work este clinic adecvat si va pot orienta spre urmatorul pas corect.",
      primary: { label: "Programati consultatia online", href: roLinks.service },
      secondary: { label: "Cititi ghidul de solicitare", href: roLinks.claimGuide },
    },
    sourcesEyebrow: "Surse oficiale",
    sourcesH2: "De unde vine regula de plata",
    sourcesLead: "Acest articol foloseste surse oficiale irlandeze actuale pentru cuantum, calendar, impozitare si situatia actuala a sick leave-ului platit de angajator, nu cifre vechi reciclate din bloguri.",
    sources: [
      { label: "MyWelfare — Illness Benefit", href: MYWELFARE },
      { label: "gov.ie — Illness Benefit", href: GOV_IB },
      { label: "gov.ie — Operational Guidelines", href: GOV_IB_GUIDE },
      { label: "Revenue — taxation of illness benefits", href: REVENUE_TAX },
      { label: "Revenue — how DSP payments are taxed", href: REVENUE_DSP_TAX },
      { label: "Government of Ireland — statutory sick leave remains at 5 days", href: ENTERPRISE_SICK_LEAVE },
    ],
    sourcesNote:
      "Linkurile se deschid pe site-ul institutiei emitente. Global Health nu decide eligibilitatea, datele de plata, tratamentul fiscal sau practicile de payroll pentru o cerere de Illness Benefit.",
    faqEyebrow: "FAQ",
    faqH2: "Intrebari frecvente despre plata",
    faqs: [
      {
        q: "Cat este Illness Benefit in Irlanda acum?",
        a: "Pe pagina live MyWelfare verificata la 24 august 2026, rata personala saptamanala afisata este EUR 254. Aceasta este cifra oficiala principala, dar nu trebuie transformata in ideea ca fiecare solicitant primeste exact aceeasi suma neta.",
      },
      {
        q: "De ce nu am fost platit din prima zi de concediu medical?",
        a: "Pagina live gov.ie spune ca nu exista plata pentru primele 3 zile in care sunteti off sick. Acestea sunt waiting days in prezent. Prima plata DSP depinde si de momentul inregistrarii cererii si al certificatului medical.",
      },
      {
        q: "In ce zi a saptamanii se plateste Illness Benefit?",
        a: "Illness Benefit se plateste saptamanal, dar pagina oficiala gov.ie spune ca plata poate fi facuta de luni pana sambata, in functie de momentul inregistrarii cererii si de prima zi a bolii. Nu exista o singura zi universala pentru toate dosarele.",
      },
      {
        q: "Illness Benefit este impozabil in Irlanda?",
        a: "Da. Revenue spune ca Illness Benefit este supus Income Tax. Revenue spune de asemenea ca platile impozabile DSP, in general, nu sunt supuse USC sau PRSI. De obicei DSP plateste fara retinere initiala, iar Revenue recupereaza ulterior impozitul prin ajustarea creditelor si a pragului de impozitare.",
      },
      {
        q: "Illness Benefit este acelasi lucru cu sick pay-ul angajatorului?",
        a: "Nu. Illness Benefit este platit de Department of Social Protection. Statutory sick leave este platit de angajator. La data de 24 august 2026, pozitia oficiala a guvernului ramane ca statutory sick leave a ramas la 5 zile dupa decizia din 8 aprilie 2025.",
      },
    ],
    disclaimerTitle: "Avertisment medical",
    disclaimer:
      "Articol scris de Dr Tiago Miguel Figueira (IMC 523449), Director Clinic la Global Health. Revizuirea clinică și editorială nativă de către Dr Ahmed Maklad este obligatorie înainte de publicare. Acest text ofera informatii generale despre calendarul de plata si fiscalitatea sistemului irlandez. Nu reprezinta sfat medical personalizat, consultanta juridica, fiscala sau de payroll. Deciziile privind Illness Benefit apartin Department of Social Protection si Revenue. Daca aveti simptome de urgenta, sunati imediat la 112 sau 999.",
  } satisfies Article,
};

const de: LocalePost = {
  locale: "DE",
  slug: "illness-benefit-zahlung-irland-betrag-steuer-zeitpunkt",
  title: "Illness Benefit Zahlung in Irland: Betrag, Steuer und Zeitpunkt",
  excerpt:
    "Wie viel Illness Benefit in Irland zahlt, wann die erste Zahlung typischerweise eintrifft, warum die ersten Krankheitstage anders laufen und wie Revenue die Leistung steuerlich behandelt.",
  seoTitle: "Illness Benefit Zahlung in Irland",
  seoDescription:
    "Aktueller Betrag, Waiting Days, woechentlicher Zahlungszeitpunkt, Steuer und Unterschied zwischen Illness Benefit und Arbeitgeber-Sick-Pay.",
  category: "Allgemeinmedizin",
  article: {
    lang: "de-DE",
    tagline: "Medizin jederzeit und ueberall",
    categoryLabel: "Allgemeinmedizin",
    categoryHref: deLinks.blog,
    eyebrow: "Irland · Zahlungsleitfaden",
    h1: "Illness Benefit Zahlung in Irland",
    deck: "Wie viel das Department of Social Protection zahlt, wann es zahlt, wie die Steuer eingreift und warum die Lohnfortzahlung durch den Arbeitgeber zuerst weiter wichtig bleibt.",
    intro:
      "Illness Benefit ist eine <strong>woechentliche Zahlung des Department of Social Protection</strong> fuer Personen, die wegen Krankheit nicht arbeiten koennen. Stand <strong>24. August 2026</strong> zeigt die offizielle MyWelfare-Seite einen <strong>persoenlichen Wochenbetrag von EUR 254</strong>, aber das bedeutet <strong>nicht</strong>, dass jede Person genau diesen Nettobetrag auf dem Konto sieht. Der Zeitpunkt der Zahlung haengt von Waiting Days, vom Eingang von Antrag und medizinischer Bescheinigung, von moeglicher Sick Pay des Arbeitgebers und davon ab, wie Revenue die Steuer anpasst. Wenn Sie die Voraussetzungen und den IB1-Ablauf brauchen, lesen Sie unseren separaten <a href=\"" + deLinks.claimGuide + "\">Leitfaden zum Beantragen von Illness Benefit</a>.",
    facts: [
      "Aktuell auf MyWelfare ausgewiesener persoenlicher Wochenbetrag: EUR 254",
      "Die ersten 3 Krankheitstage bleiben laut aktueller DSP-Seite Waiting Days",
      "Illness Benefit ist steuerpflichtig, auch wenn DSP meist ohne direkten Steuerabzug zahlt",
    ],
    primaryCta: { label: "Leitfaden zum Beantragen lesen", href: deLinks.claimGuide },
    secondaryCta: { label: "Offizielle Illness-Benefit-Seite", href: GOV_IB },
    panelChip: "Was dieser Leitfaden abdeckt",
    panelParas: [
      "Die aktuelle Zahl, nach der Suchende fragen, ohne so zu tun, als gaebe es fuer jede reale Akte denselben Endbetrag.",
      "Wann Illness Benefit beginnt, warum die erste Zahlung spaeter kommen kann und wo Sick Pay des Arbeitgebers in diese Luecke faellt.",
      "Wie Illness Benefit besteuert wird, was Revenue im Hintergrund aendert und warum die Gehaltsabrechnung waehrend eines laufenden Anspruchs ungewoehnlich aussehen kann.",
    ],
    author: { initials: "TF", name: "Dr Tiago Miguel Figueira", line: "IMC 523449 · Aerztlicher Leiter, Global Health" },
    reviewLine: "Die fachliche und muttersprachliche Prüfung durch Dr Ahmed Maklad ist vor der Veröffentlichung erforderlich.",
    navLabel: "In diesem Artikel",
    sections: [
      {
        id: "scope",
        nav: "Umfang",
        eyebrow: "Zwei Leitfaeden nicht vermischen",
        h2: "Dieser Artikel behandelt die Zahlung, nicht die Anspruchspruefung",
        blocks: [
          lead("Die meisten Suchenden landen hier, nachdem sie bereits von Illness Benefit gehoert haben und nun eine praktische Antwort wollen: wie viel Geld kommt wann."),
          p("Das ist eine andere Frage als <strong>ob Sie anspruchsberechtigt sind</strong>, wie die PRSI-Bedingungen funktionieren oder wer das Certificate of Incapacity for Work ausstellen darf. Diese Punkte erklaeren wir bereits in unserem <a href=\"" + deLinks.claimGuide + "\">separaten Leitfaden zur Beantragung von Illness Benefit</a>, und die Trennung hilft, zwei unterschiedliche Suchabsichten sauber auseinanderzuhalten."),
          p("Darum bleibt diese Seite eng gefasst. Sie behandelt den derzeit im offiziellen Dienst angezeigten Wochenbetrag, die drei Waiting Days auf der DSP-Seite, den woechentlichen Zahlungsrhythmus und die steuerliche Behandlung nach Revenue. Ausserdem erklaert sie, warum viele Beschaeftigte die gesamte Krankheitsphase als 'Illness Benefit' bezeichnen, obwohl rechtlich Geld vom Arbeitgeber und Geld vom Staat getrennte Stroeme sind."),
          warn(
            "Machen Sie aus der Suche keine Ein-Zahl-Frage",
            "Der Begriff 'illness benefit payment' klingt nach einer einzigen Summe. In der Praxis kann sich aber aendern, was tatsaechlich auf Ihrem Konto ankommt: durch den Start des Anspruchs, moegliche Erhoehungen, Arbeitgeber-Sick-Pay und die spaetere steuerliche Erfassung durch Revenue.",
          ),
        ],
      },
      {
        id: "rate",
        nav: "Aktueller Betrag",
        eyebrow: "Die gesuchte Zahl",
        h2: "Der aktuelle offizielle persoenliche Satz liegt bei EUR 254 pro Woche, aber das ist nicht die ganze Geschichte",
        blocks: [
          lead("Auf der live geprueften MyWelfare-Seite vom 24. August 2026 ist fuer Illness Benefit ein persoenlicher Wochenbetrag von EUR 254 ausgewiesen."),
          p("Das ist die zentrale Zahl und beantwortet die Suche. Sie bleibt aber nur die <strong>Zeile fuer den persoenlichen Satz</strong> in der offiziellen Quelle. Das bedeutet nicht, dass jede Person jede Woche exakt EUR 254 auf dem Konto sehen wird. Manche Faelle haben andere Umstaende, und auch die Netto-Wirkung kann sich aendern, wenn Revenue spaeter Steuerfreibetraege anpasst."),
          ul([
            "<strong>Verwenden Sie EUR 254 als aktuellen offiziellen persoenlichen Wochenbetrag</strong>, weil MyWelfare genau das derzeit veroeffentlicht.",
            "<strong>Schreiben Sie nicht 'jede Person bekommt EUR 254'</strong>, weil das weiter geht als die offizielle Quelle traegt.",
            "<strong>Vermeiden Sie alte Budget-Zahlen</strong>, wenn die Live-Seite den aktuellen Betrag bereits nennt.",
            "<strong>Wenn Ihr Fall nicht standardmaessig ist</strong>, kann der Endbetrag vom persoenlichen Satz abweichen.",
          ]),
          p("Einfach gesagt: Die sicherste oeffentliche Zusammenfassung lautet, dass Illness Benefit aktuell mit einem persoenlichen Wochenbetrag von EUR 254 im offiziellen Dienst steht, waehrend der Endbetrag eines konkreten Falls je nach Akte und Steuereffekt abweichen kann."),
          cite(`Aktuelle Quelle: <a href="${MYWELFARE}" rel="nofollow noopener" target="_blank">MyWelfare — Illness Benefit</a>.`),
        ],
      },
      {
        id: "timing",
        nav: "Wann gezahlt",
        eyebrow: "Beginn und Zahlungstag",
        h2: "Warum die erste Zahlung meist spaeter kommt als erwartet",
        blocks: [
          lead("Illness Benefit wird woechentlich gezahlt, beginnt aber nicht automatisch am ersten Morgen Ihrer Krankmeldung."),
          p("Die aktuelle DSP-Seite sagt, dass es <strong>fuer die ersten 3 Tage</strong> Ihrer krankheitsbedingten Arbeitsunfaehigkeit <strong>kein Illness Benefit</strong> gibt. Das sind die derzeitigen Waiting Days. Dieselbe Seite sagt auch, dass die Leistung <strong>woechentlich</strong> gezahlt wird und je nach Registrierungszeitpunkt des Anspruchs und erstem Krankheitstag <strong>Montag bis Samstag</strong> ausgezahlt werden kann."),
          p("Dieser eine Punkt erklaert fast die ganze Verwirrung um die erste Zahlung. In der ersten Krankheitswoche koennen drei Ebenen gleichzeitig laufen: Ihr Arbeitgeber schuldet vielleicht zunaechst Statutory Sick Leave oder eigenes Sick Pay; DSP wendet weiterhin seine Waiting Days an; und das Department kann die Zahlung erst freigeben, wenn Antrag und medizinische Bescheinigung im System sind."),
          ul([
            "Beantragen Sie frueh: MyWelfare sagt, dass der Antrag innerhalb von <strong>6 Wochen</strong> nach Krankheitsbeginn gestellt werden muss, auch wenn der Arbeitgeber anfangs noch zahlt.",
            "Rechnen Sie mit einer Luecke zwischen dem ersten ausgefallenen Arbeitstag und der ersten DSP-Zahlung, weil Waiting Days und Registrierung weiter zaehlen.",
            "Es gibt keinen einheitlichen Wochentag fuer alle: Laut gov.ie kann die Zahlung zwischen Montag und Samstag erfolgen.",
            "Faellt die Entscheidung spaeter, kann es Nachzahlungen geben, aber die erste Woche wird dadurch nicht zu normalem Arbeitsentgelt.",
          ]),
          p("Praktisch heisst das: Wenn Sie Miete und Rechnungen planen, gehen Sie nicht davon aus, dass die erste DSP-Zahlung demselben Rhythmus wie die Lohnabrechnung Ihres Arbeitgebers folgt. Es ist eine Sozialleistung mit eigenem Kalender."),
          cite(`Offizieller Zeitplan: <a href="${GOV_IB}" rel="nofollow noopener" target="_blank">gov.ie — Illness Benefit</a>. Operative Details: <a href="${GOV_IB_GUIDE}" rel="nofollow noopener" target="_blank">Operational Guidelines</a>.`),
        ],
      },
      {
        id: "tax",
        nav: "Steuer",
        eyebrow: "Was viele Beschaeftigte ueberrascht",
        h2: "Illness Benefit ist steuerpflichtig, aber DSP zahlt meist ohne sofortigen Steuerabzug",
        blocks: [
          lead("Viele Menschen gehen davon aus, dass eine staatliche Krankheitsleistung steuerfrei sein muss. Illness Benefit ist nicht steuerfrei."),
          p("Nach der aktuellen Guidance von Revenue unterliegt Illness Benefit der <strong>Income Tax</strong>. Revenue sagt ausserdem, dass steuerpflichtige DSP-Zahlungen im Allgemeinen <strong>nicht</strong> der <strong>USC</strong> oder <strong>PRSI</strong> unterliegen. Das wichtige Verwaltungsdetail lautet: Das Department zahlt Illness Benefit meistens <strong>ohne direkten Steuerabzug</strong>, und Revenue holt die faellige Income Tax spaeter ueber reduzierte Steuerfreibetraege und ein angepasstes Steuerband herein."),
          p("Genau deshalb kann sich die Zahlung im Konto so anfuehlen, als waere sie 'unversteuert', waehrend spaeter Gehaltsabrechnung, Tax Credit Certificate oder Jahressteuerposition angepasst werden. Wenn Ihr Arbeitgeber gleichzeitig Sick Pay zahlt, wird dieser Lohnteil weiterhin normal ueber Payroll besteuert, waehrend Revenue den DSP-Betrag getrennt behandelt."),
          ul([
            "<strong>DSP-Zahlung:</strong> fuer Income-Tax-Zwecke meist brutto ausgezahlt, mit spaeterer Erfassung durch Revenue.",
            "<strong>Income Tax:</strong> ja, sie kann anfallen.",
            "<strong>USC und PRSI fuer steuerpflichtige DSP-Zahlungen:</strong> Revenue sagt nein.",
            "<strong>Sick Pay des Arbeitgebers:</strong> bleibt nach normalen Payroll-Regeln steuerpflichtig.",
          ]),
          warn(
            "Lesen Sie den Bankeingang nicht isoliert",
            "Dass eine volle Woche Illness Benefit auf Ihrem Konto landet, zeigt den tatsaechlichen Steueraufwand nicht allein. Revenue kann Income Tax spaeter ueber niedrigere Freibetraege einziehen, und sichtbar wird das oft erst mit der aktualisierten Payroll.",
          ),
          p("Wenn Sie einen genauen Nachweis brauchen, was DSP in einem Zeitraum gezahlt hat, bietet MyWelfare auch einen <strong>payment statement</strong> an. Das ist oft die sauberste Methode, um Kontoeingang, Arbeitgeberdaten und Revenue-Anpassungen gegeneinander zu pruefen."),
          cite(`Steuerregeln: <a href="${REVENUE_TAX}" rel="nofollow noopener" target="_blank">Revenue — taxation of illness benefits</a>. Allgemeine DSP-Steuerregel: <a href="${REVENUE_DSP_TAX}" rel="nofollow noopener" target="_blank">Revenue — how DSP payments are taxed</a>.`),
        ],
      },
      {
        id: "employer",
        nav: "Arbeitgeber",
        eyebrow: "Getrennter Geldstrom",
        h2: "Arbeitgeber-Sick-Pay und Illness Benefit sind nicht dieselbe Zahlung",
        blocks: [
          lead("Diese Unterscheidung ist wichtig, weil viele Beschaeftigte in Irland die gesamte Krankheitsphase noch immer als 'Illness Benefit' bezeichnen, obwohl das rechtlich nicht stimmt."),
          p("Illness Benefit wird vom <strong>Department of Social Protection</strong> gezahlt. Statutory Sick Leave wird vom <strong>Arbeitgeber</strong> gezahlt. Beides kann innerhalb derselben Erkrankung nebeneinander vorkommen, aber es stammt nicht aus demselben System und folgt nicht denselben Regeln. Mit Stand <strong>24. August 2026</strong> bleibt die offizielle Regierungsposition, dass Statutory Sick Leave nach der Entscheidung vom 8. April 2025 bei <strong>5 Tagen</strong> geblieben ist."),
          p("Dieses Datum ist wichtig, weil viele Artikel noch den alten Stufenplan wiederholen, der von 10 Tagen im Jahr 2026 sprach. Das ist nicht mehr die aktuelle Lage. Wenn ein HR-Artikel behauptet, jede beschaeftigte Person habe 2026 automatisch 10 Tage statutory sick leave, ist dieser Inhalt veraltet."),
          ul([
            "<strong>Arbeitgeber-Sick-Pay</strong> deckt haeufig den Beginn einer Abwesenheit ab, je nach Vertrag und gesetzlichem Minimum.",
            "<strong>Illness Benefit</strong> bleibt die woechentliche DSP-Leistung, sobald deren eigene Regeln greifen.",
            "<strong>Betriebliche Sick-Pay-Regelungen</strong> koennen grosszuegiger sein als das Minimum, aber das haengt vom Arbeitgeber ab.",
            "<strong>Die richtige Payroll-Frage</strong> lautet nicht 'Bin ich auf Illness Benefit?', sondern 'Welcher Teil dieser Woche ist Arbeitgeberlohn und welcher Teil DSP-Zahlung?'",
          ]),
          p("Wenn Sie eigentlich das Zertifikat und den Antragsweg brauchen und nicht die Geldmechanik, gehen Sie zu unserem <a href=\"" + deLinks.claimGuide + "\">Schritt-fuer-Schritt-Leitfaden fuer Illness Benefit</a> zurueck. Dort erklaeren wir IB1 und den medizinischen Nachweis im Detail."),
          cite(`Aktuelle offizielle Position zu statutory sick leave: <a href="${ENTERPRISE_SICK_LEAVE}" rel="nofollow noopener" target="_blank">Department of Enterprise, 8 April 2025</a>.`),
        ],
      },
      {
        id: "practical",
        nav: "Praktische Checks",
        eyebrow: "Vermeidbare Verzoegerungen vermeiden",
        h2: "Was Sie pruefen sollten, wenn das Geld spaet, anders oder merkwuerdig ankommt",
        blocks: [
          lead("Die meisten Zahlungsbeschwerden entstehen nicht wegen des Schlagzeilen-Betrags. Sie entstehen wegen Kalender, unpassender Daten oder Steuerverwirrung."),
          ul([
            "Pruefen Sie, ob die ersten 3 Krankheitstage Waiting Days und keine zahlbaren Illness-Benefit-Tage waren.",
            "Pruefen Sie, ob Ihr Arbeitgeber die ersten Tage getrennt als statutory oder contractual sick pay gezahlt hat.",
            "Pruefen Sie, ob Antrag und medizinische Bescheinigung beide ohne Verzoegerung uebermittelt wurden.",
            "Pruefen Sie, ob Revenue nach Aktivierung des DSP-Anspruchs Ihre Steuerfreibetraege angepasst hat.",
            "Pruefen Sie, ob eine Rueckkehr zur Arbeit, eine Reise oder eine Aenderung der Bankverbindung gemeldet werden muss.",
          ]),
          p("Wenn das Problem nicht die Hoehe, sondern der Stillstand des Anspruchs ist, bleibt MyWelfare der nuetzlichste offizielle Ort fuer den Blick auf Dienst und kontobezogene Aktionen. Wenn das Problem die medizinische Bescheinigung ist, erklaert unser <a href=\"" + deLinks.service + "\">Online-Krankenschein-Service in Irland</a>, was eine Online-Praxis per Video bescheinigen kann und was nicht. Wenn das Problem klinisch und nicht buerokratisch ist, kann der Antrag warten, Ihre Gesundheit aber nicht."),
          warn(
            "Notfallsymptome haben Vorrang vor Zahlungsfragen",
            "Bei Brustschmerz, Schlaganfallzeichen, schwerer Atemnot, Kollaps oder anderem Notfall rufen Sie 112 oder 999. Eine verzoegerte Leistung ist in diesem Moment nie das dringende Problem.",
          ),
        ],
      },
    ],
    linksEyebrow: "Global Health Irland",
    linksH2: "Sinnvolle naechste Schritte",
    linksLead: "Nutzen Sie diesen Leitfaden fuer Fragen zu Betrag, Zeitpunkt und Payroll. Nutzen Sie den Antragsleitfaden und die aerztliche Route, wenn Sie noch das Zertifikat und den formalen Ablauf brauchen.",
    links: [
      { label: "Leitfaden zur Beantragung von Illness Benefit", href: deLinks.claimGuide },
      { label: "Online-Krankenschein-Service in Irland", href: deLinks.service },
      { label: "Unsere Aerztinnen und Aerzte in Irland", href: deLinks.doctors },
      { label: "Global Health Irland kontaktieren", href: deLinks.contact },
    ],
    ctaBox: {
      h3: "Brauchen Sie das Zertifikat, bevor die Zahlung starten kann?",
      text: "Unsere irischen Aerztinnen und Aerzte koennen beurteilen, ob ein Certificate of Incapacity for Work klinisch angemessen ist, und Sie zum richtigen naechsten Schritt lenken.",
      primary: { label: "Online-Termin buchen", href: deLinks.service },
      secondary: { label: "Antragsleitfaden lesen", href: deLinks.claimGuide },
    },
    sourcesEyebrow: "Offizielle Quellen",
    sourcesH2: "Woher die Zahlungsregeln kommen",
    sourcesLead: "Dieser Artikel nutzt aktuelle irische Originalquellen fuer Betrag, Zeitplan, Steuer und die derzeitige Lage bei gesetzlicher Sick Leave statt alter Blog-Zahlen.",
    sources: [
      { label: "MyWelfare — Illness Benefit", href: MYWELFARE },
      { label: "gov.ie — Illness Benefit", href: GOV_IB },
      { label: "gov.ie — Operational Guidelines", href: GOV_IB_GUIDE },
      { label: "Revenue — taxation of illness benefits", href: REVENUE_TAX },
      { label: "Revenue — how DSP payments are taxed", href: REVENUE_DSP_TAX },
      { label: "Government of Ireland — statutory sick leave remains at 5 days", href: ENTERPRISE_SICK_LEAVE },
    ],
    sourcesNote:
      "Die Links fuehren auf die Seiten der zustaendigen Stellen. Global Health entscheidet weder Anspruch noch Zahlungstermine, steuerliche Behandlung oder Payroll-Praxis bei einem Illness-Benefit-Fall.",
    faqEyebrow: "FAQ",
    faqH2: "Haefige Zahlungsfragen",
    faqs: [
      {
        q: "Wie hoch ist Illness Benefit in Irland derzeit?",
        a: "Auf der live geprueften MyWelfare-Seite vom 24. August 2026 ist ein persoenlicher Wochenbetrag von EUR 254 ausgewiesen. Das ist die offizielle Hauptzahl, sollte aber nicht zu der Aussage verkuerzt werden, dass jede Person exakt denselben Nettobetrag erhaelt.",
      },
      {
        q: "Warum wurde ich nicht ab dem ersten Krankheitstag bezahlt?",
        a: "Die aktuelle gov.ie-Seite sagt, dass es fuer die ersten 3 Tage, an denen Sie off sick sind, keine Zahlung gibt. Das sind die gegenwaertigen Waiting Days. Die erste DSP-Zahlung haengt zusaetzlich davon ab, wann Antrag und medizinische Bescheinigung registriert werden.",
      },
      {
        q: "An welchem Wochentag wird Illness Benefit gezahlt?",
        a: "Illness Benefit wird woechentlich gezahlt, aber die offizielle gov.ie-Seite sagt, dass die Auszahlung je nach Registrierung des Anspruchs und erstem Krankheitstag Montag bis Samstag erfolgen kann. Es gibt also keinen einzigen universellen Zahlungstag.",
      },
      {
        q: "Ist Illness Benefit in Irland steuerpflichtig?",
        a: "Ja. Revenue sagt, dass Illness Benefit der Income Tax unterliegt. Revenue sagt ausserdem, dass steuerpflichtige DSP-Zahlungen im Allgemeinen nicht der USC oder PRSI unterliegen. DSP zahlt meist ohne direkten Abzug, und Revenue holt die Steuer spaeter ueber Freibetraege und das Steuerband herein.",
      },
      {
        q: "Ist Illness Benefit dasselbe wie das Sick Pay meines Arbeitgebers?",
        a: "Nein. Illness Benefit zahlt das Department of Social Protection. Statutory sick leave zahlt der Arbeitgeber. Mit Stand 24. August 2026 bleibt die offizielle Regierungsposition, dass statutory sick leave nach der Entscheidung vom 8. April 2025 bei 5 Tagen geblieben ist.",
      },
    ],
    disclaimerTitle: "Medizinischer Hinweis",
    disclaimer:
      "Verfasst von Dr Tiago Miguel Figueira (IMC 523449), Aerztlicher Leiter bei Global Health. Vor der Veroeffentlichung ist eine fachliche und muttersprachliche Pruefung durch Dr Ahmed Maklad erforderlich. Dieser Artikel bietet allgemeine Informationen zu Zahlungszeitpunkt und steuerlicher Behandlung im irischen System. Er ersetzt keine individuelle medizinische Beratung, Rechtsberatung, Steuerberatung oder Payroll-Beratung. Entscheidungen zu Illness Benefit treffen Department of Social Protection und Revenue. Bei Notfallsymptomen rufen Sie sofort 112 oder 999 an.",
  } satisfies Article,
};

export const IE_ILLNESS_BENEFIT_PAYMENT: PostSet = {
  key: "ie-illness-benefit-payment",
  countryCode: "ie",
  targetKeyword: "how much is illness benefit in ireland",
  searchVolume: 880,
  keywordDifficulty: 2,
  evidence:
    "Exact keyword 880/KD2; broad parent keyword 'illness benefit ireland' 6,600/KD5/CPC USD 3.70. This article is intentionally narrower than the existing eligibility/application post and focuses on rate, timing, tax and employer sick-pay handoff to avoid cannibalization.",
  serviceSlug: "sick-certificate-ireland",
  authorDoctorId: "cmp5r0if3002kssjug743x0p6",
  authorDisplayName: "Dr Tiago Miguel Figueira",
  reviewerDoctorId: "cmqas8yh9000b01pgpc0yp1la",
  reviewerDisplayName: "Dr Ahmed Maklad",
  posts: [en, ro, es, pt, de, cs],
};

export const IE_ILLNESS_BENEFIT_PAYMENT_BODIES = () =>
  IE_ILLNESS_BENEFIT_PAYMENT.posts.map((post) => renderArticle(post.article));
