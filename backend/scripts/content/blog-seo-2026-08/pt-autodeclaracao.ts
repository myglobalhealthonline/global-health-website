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
      "A <strong>autodeclaração de doença</strong> é preenchida e submetida <em>por si</em>, na Segurança Social Direta, sob compromisso de honra, e serve para justificar uma ausência curta ao trabalho. Não passa por médico e <strong>não dá direito a subsídio de doença</strong>. A <strong>baixa médica</strong> é outra coisa: assenta num <strong>Certificado de Incapacidade Temporária (CIT)</strong> emitido por médico — no SNS ou no privado — e comunicado à Segurança Social, é essa que comunica a incapacidade à Segurança Social e é essa que pode abrir o subsídio de doença. Regra prática: ausência muito curta e sem necessidade clínica de ser observado, autodeclaração; doença que o impede de trabalhar mais tempo, consulta médica.",
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
        h2: "CIT, baixa médica e sick leave: qual é a diferença?",
        blocks: [
          lead("CIT e baixa médica não são dois documentos diferentes. «Baixa médica» é o nome corrente da situação; o Certificado de Incapacidade Temporária é o documento médico que a formaliza."),
          p("A expressão inglesa <em>sick leave</em> significa apenas ausência ao trabalho por doença. Em Portugal, não corresponde a um terceiro certificado. Essa ausência pode ser justificada por autodeclaração, por uma declaração médica ou por um CIT, conforme a duração, a necessidade de avaliação clínica e o eventual direito a subsídio de doença."),
          ul([
            "<strong>Use a autodeclaração</strong> para uma ausência curta, dentro dos limites legais, quando não precisa de avaliação médica nem de subsídio de doença.",
            "<strong>Peça uma declaração médica</strong> quando a entidade patronal precisa de prova da falta e a avaliação não indica necessidade de CIT.",
            "<strong>Peça avaliação para CIT</strong> quando a incapacidade precisa de certificação médica, ultrapassa o âmbito da autodeclaração ou pode dar lugar a subsídio de doença.",
          ]),
          p("O <strong>CIT</strong> é emitido por médico — no SNS ou no privado, nós também o emitimos — e comunicado à Segurança Social. É esse documento que atesta clinicamente que está temporariamente incapaz para o trabalho, e é a partir dele que se avalia o direito ao <strong>subsídio de doença</strong>."),
          ul([
            "É <strong>o médico</strong> que decide se existe incapacidade e qual o período — não o utente e não a entidade patronal.",
            "Na maioria dos casos o CIT segue por via eletrónica e o utente não o transporta; existem ainda CIT em papel, que é o próprio utente que entrega na Segurança Social.",
            "Se a incapacidade se prolongar, há reavaliação médica e o período pode ser prorrogado pelo médico que o acompanha.",
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
          p("Uma consulta privada <strong>pode emitir CIT</strong> — nós emitimos. O que decide qual dos dois documentos faz sentido é a duração provável da doença: o subsídio de doença só começa a ser pago depois de um período de espera fixado por lei, pelo que uma ausência de dois ou três dias raramente justifica um CIT, e uma declaração médica resolve o que a entidade patronal precisa. Quando a doença se prolonga para lá desse período, o CIT é o instrumento certo."),
          ul([
            "Precisa apenas de justificar a falta perante a entidade patronal: uma declaração médica cumpre esse efeito.",
            "Precisa de subsídio de doença: precisa de avaliação médica e, quando existe incapacidade, de um CIT emitido por uma entidade de saúde habilitada.",
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
          p("Há ainda uma quarta situação, frequentemente esquecida: doença de familiar a cargo, assistência a filho e outras faltas por motivo de saúde de terceiros. Têm designação e regras próprias, distintas de ambos os instrumentos acima, mas emitem-se no mesmo sistema do CIT — e nós também as emitimos. As condições constam do portal da Segurança Social."),
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
    sourcesNote: "As ligações abrem nos sites das entidades competentes. A Global Health não integra a Segurança Social nem o SNS. A emissão de CIT depende sempre da avaliação clínica, e nenhuma consulta pode decidir, acelerar ou garantir uma prestação social.",
    faqEyebrow: "FAQ",
    faqH2: "Perguntas frequentes",
    faqs: [
      {
        q: "A autodeclaração de doença dá direito a subsídio de doença?",
        a: "Não. A autodeclaração justifica a falta perante a entidade patronal, mas não envolve certificação clínica de incapacidade. O subsídio de doença depende de um Certificado de Incapacidade Temporária emitido por médico, no SNS ou no privado.",
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
        a: "Sim. Uma consulta privada pode emitir uma declaração médica que justifica a falta ao trabalho e pode também emitir o Certificado de Incapacidade Temporária, que é o que abre o subsídio de doença. Para ausências curtas emitimos habitualmente a declaração, porque o subsídio só começa a ser pago depois do período de espera previsto na lei; quando a doença se prolonga, emitimos o CIT.",
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

const en: LocalePost = {
  locale: "EN",
  slug: "self-certification-sick-leave-portugal",
  title: "Self-certification or a medical certificate: which one you need in Portugal",
  excerpt:
    "The autodeclaração de doença is submitted by you on Segurança Social Direta and justifies a short absence. A baixa médica is a different instrument, issued by a doctor, and it is the one that opens sickness benefit. Here is the difference and what to do in each case.",
  seoTitle: "Self-certification or sick note in Portugal?",
  seoDescription:
    "Autodeclaração de doença or baixa médica in Portugal: who issues each, how to submit on Segurança Social Direta and which one opens sickness benefit.",
  category: "General Practice",
  article: {
    lang: "en-GB",
    tagline: "Medicine Anytime, Anywhere",
    categoryLabel: "General Practice",
    categoryHref: href("en", "/blog"),
    eyebrow: "Portugal · Employee guide",
    h1: "Self-certification or a medical certificate?",
    deck: "Two different instruments, issued by different people, with different effects. Choosing the wrong one is the most common reason an absence ends up unjustified.",
    intro:
      "The <strong>autodeclaração de doença</strong> is completed and submitted <em>by you</em>, on Segurança Social Direta, on your word of honour, and justifies a short absence from work. No doctor is involved and it <strong>does not open sickness benefit</strong>. The <strong>baixa médica</strong> is something else: it rests on a <strong>Certificado de Incapacidade Temporária (CIT)</strong> issued by a doctor — in the SNS or in private practice — and sent to Segurança Social, and that is what reports the incapacity to Segurança Social and what can open sickness benefit. Rule of thumb: a very short absence with no clinical need to be examined, self-certify; illness that keeps you off work longer, see a doctor.",
    facts: ["Self-certification: you submit it", "Baixa médica: a doctor issues it", "Only the CIT opens sickness benefit"],
    primaryCta: { label: "Book a medical consultation", href: href("en", "/services/baixa-medica") },
    secondaryCta: { label: "Baixa médica on SNS 24", href: SNS24_BAIXA },
    panelChip: "What this guide covers",
    panelParas: [
      "Who issues each document, what each one proves, and what each one does not.",
      "Where and how the self-certification is submitted, and why employer verification exists at all.",
      "The number of days, how many times a year it may be used, the waiting period and benefit amounts are set by law and change. They are not quoted here: each one points at Segurança Social.",
    ],
    author: { initials: "RR", name: "Dr Rui Diogo Rodrigues", line: "General Practitioner · Global Health Portugal" },
    reviewLine: "Clinically reviewed by Dra. Margarida Domingues e Andrade, General Practitioner, Global Health Portugal.",
    navLabel: "In this article",
    sections: [
      {
        id: "autodeclaracao",
        nav: "Self-certification",
        eyebrow: "Instrument 1",
        h2: "What the autodeclaração de doença is",
        blocks: [
          lead("It is your own declaration, on your word of honour, that you were ill and unable to work for a short period."),
          p("It is submitted on <strong>Segurança Social Direta</strong>, in your own worker area, and is meant for mild illness where there is no clinical need to be seen by a doctor. It was created precisely to stop people travelling to a health unit purely to obtain a piece of paper."),
          ul([
            "It is <strong>the worker</strong> who completes and submits it — not the doctor, not the employer.",
            "It serves to <strong>justify the absence</strong> to your employer.",
            "It does <strong>not</strong> generate sickness benefit, because there is no clinical certification of incapacity.",
            "How many days it covers, and how often per year it may be used, are set in law and shown on the Segurança Social Direta form itself.",
          ]),
          warn("It is a declaration on your word of honour", "This is not a consequence-free form. Falsely declaring illness has disciplinary and legal implications. Self-certification exists to simplify justifying real illness, not to manufacture days off."),
        ],
      },
      {
        id: "validar",
        nav: "Verification",
        eyebrow: "The employer's side",
        h2: "How your employer confirms the self-certification",
        blocks: [
          lead("Your employer does not have to take your word for it — and equally does not get to ask you for clinical explanations."),
          p("Submitting on Segurança Social Direta produces a receipt that can be looked up and confirmed. That mechanism replaces the signed paper: the company confirms the declaration exists and which period it covers, without any access to information about your health."),
          p("Your employer has <strong>no right to know your diagnosis</strong>, neither for a self-certification nor for a baixa médica. What is communicated is the existence and the period of the justified absence. Clinical information is protected by medical confidentiality and by health-data protection rules."),
          cite(`Submission and lookup: <a href="${SEG_SOCIAL}" rel="nofollow noopener" target="_blank">Segurança Social</a>.`),
        ],
      },
      {
        id: "baixa",
        nav: "Baixa médica",
        eyebrow: "Instrument 2",
        h2: "What a baixa médica and the CIT are",
        blocks: [
          lead("When illness goes beyond the scope of self-certification, what exists instead is a Certificado de Incapacidade Temporária."),
          p("The <strong>CIT</strong> is issued by a doctor — in the SNS or in private practice, ours included — and sent to Segurança Social. It is the document that clinically attests that you are temporarily unfit for work, and it is the basis on which entitlement to <strong>sickness benefit</strong> is assessed."),
          ul([
            "It is <strong>the doctor</strong> who decides whether incapacity exists and for how long — not the patient and not the employer.",
            "Most CITs travel electronically and the patient carries nothing; paper CITs still exist, and those the patient files with Segurança Social themselves.",
            "If incapacity continues, there is medical reassessment and the period can be extended by the doctor treating you.",
            "The waiting period before payment starts and how the benefit is calculated are defined in law and published on the Segurança Social portal.",
          ]),
          warn("No consultation guarantees a baixa", "Issuing a certificate of incapacity depends on what the clinical assessment shows. Any service promising the baixa before a doctor has examined you is promising what a doctor cannot ethically guarantee."),
          cite(`Official information on baixa médica: <a href="${SNS24_BAIXA}" rel="nofollow noopener" target="_blank">SNS 24</a>.`),
        ],
      },
      {
        id: "privado",
        nav: "Private consultation",
        eyebrow: "Transparency",
        h2: "What a private consultation can — and cannot — issue",
        blocks: [
          lead("This is the part most sites avoid saying clearly, so we say it first."),
          p("In a private consultation, including by video, the doctor assesses you and may issue a <strong>medical declaration justifying absence from work</strong>. That is the service we provide, and that is what it is called. It serves to justify the absence to your employer."),
          p("A private consultation <strong>can issue a CIT</strong> — we do. What decides which of the two documents makes sense is how long the illness is likely to last: sickness benefit only starts to be paid after a waiting period set in law, so an absence of two or three days rarely justifies a CIT, and a medical declaration covers what the employer needs. When the illness runs past that period, the CIT is the right instrument."),
          ul([
            "You only need to justify the absence to your employer: a medical declaration achieves that.",
            "You need sickness benefit: you need a CIT, and therefore the SNS circuit.",
            "You do not know which of the two applies to you: that is exactly what a consultation settles in a few minutes.",
          ]),
          p(`You can confirm any doctor's registration with the <a href="${ORDEM_MEDICOS}" rel="nofollow noopener" target="_blank">Ordem dos Médicos</a>, with us as anywhere else.`),
        ],
      },
      {
        id: "qual-escolher",
        nav: "Which applies",
        eyebrow: "Decision",
        h2: "Which of the two applies to your case",
        blocks: [
          lead("Three questions settle almost every situation."),
          ul([
            "<strong>How long will you be off?</strong> A very short absence, within what the law allows you to declare, with no clinical need to be seen: self-certification.",
            "<strong>Do you need to be paid by Segurança Social while absent?</strong> If so, you need a CIT, and therefore a doctor.",
            "<strong>Does the illness need assessing?</strong> If there is doubt about what you have, if symptoms are worsening, or if you have already used up what self-certification allows, the answer is a consultation — the justification is the by-product, not the objective.",
          ]),
          p("There is a fourth situation people often forget: illness of a dependent family member, care of a child and other absences for someone else's health. They have their own name and their own rules, distinct from both instruments above, but they are issued through the same system as the CIT — and we issue them too. The conditions are set out on the Segurança Social portal."),
        ],
      },
      {
        id: "urgencia",
        nav: "When not to wait",
        eyebrow: "Safety",
        h2: "When the paperwork is not the problem",
        blocks: [
          lead("There are situations where sorting out the justification is the last thing to do."),
          ul([
            "Chest pain or tightness, especially with breathlessness, sweating, or pain radiating to the arm or jaw.",
            "Sudden weakness on one side of the body, facial droop, difficulty speaking, or a sudden severe headache.",
            "Difficulty breathing at rest, or blue lips or face.",
            "Skin blotches that do not fade under pressure, with fever, neck stiffness or confusion.",
            "Heavy bleeding or vomiting blood.",
            "Any thought of harming yourself.",
          ]),
          p("In these cases call <strong>112</strong>, or contact <strong>SNS 24</strong> if you are unsure how serious it is. The absence gets justified afterwards — and it always does."),
        ],
      },
    ],
    linksEyebrow: "Global Health Portugal",
    linksH2: "Next steps",
    linksLead: "Our doctors in Portugal assess you by video and tell you plainly which of the two routes is yours.",
    links: [
      { label: "Consultation and medical justification of absence from work", href: href("en", "/services/baixa-medica") },
      { label: "Our doctors in Portugal", href: href("en", "/doctors") },
      { label: "Contact Global Health Portugal", href: href("en", "/contact") },
    ],
    ctaBox: {
      h3: "Not sure whether you need a doctor?",
      text: "A short consultation clarifies whether your situation is settled by self-certification or genuinely needs clinical assessment — and, where it applies, issues the medical justification for the absence.",
      primary: { label: "Book a consultation", href: href("en", "/services/baixa-medica") },
      secondary: { label: "See our doctors", href: href("en", "/doctors") },
    },
    sourcesEyebrow: "Official sources",
    sourcesH2: "Where to confirm the rules",
    sourcesLead: "Days covered, uses per year, the waiting period and benefit amounts are defined in law and change. Always confirm at the source.",
    sources: [
      { label: "Segurança Social", href: SEG_SOCIAL },
      { label: "SNS 24 — baixa médica", href: SNS24_BAIXA },
      { label: "Ordem dos Médicos", href: ORDEM_MEDICOS },
    ],
    sourcesNote:
      "Links open on the competent bodies' own websites. Global Health is not part of Segurança Social or the SNS, does not issue Certificados de Incapacidade Temporária, and cannot decide, expedite or guarantee any social benefit.",
    faqEyebrow: "FAQ",
    faqH2: "Common questions",
    faqs: [
      {
        q: "Does the autodeclaração de doença entitle me to sickness benefit?",
        a: "No. It justifies the absence to your employer, but involves no clinical certification of incapacity. Sickness benefit depends on a Certificado de Incapacidade Temporária issued by a doctor, in the SNS or in private practice.",
      },
      {
        q: "Where is the autodeclaração de doença submitted?",
        a: "On Segurança Social Direta, in your own worker area, on your word of honour. Submitting produces a receipt your employer can confirm, without any access to clinical information about you.",
      },
      {
        q: "How many days does it cover and how often can I use it?",
        a: "The limits are set in law and shown on the Segurança Social Direta form at the moment of submission. Because they change, confirm them on the Segurança Social portal rather than in an article.",
      },
      {
        q: "Can my employer require me to say what is wrong with me?",
        a: "No. For both self-certification and a baixa médica, what is communicated is the existence and period of the justified absence. The diagnosis is clinical information protected by medical confidentiality and health-data protection rules.",
      },
      {
        q: "Can a private online consultation give me a baixa médica?",
        a: "Yes. A private consultation can issue a medical declaration justifying absence from work, and it can also issue the Certificado de Incapacidade Temporária, which is what opens sickness benefit. For short absences we usually issue the declaration, because the benefit only starts after the waiting period set in law; when the illness runs longer, we issue the CIT.",
      },
      {
        q: "I have already used self-certification and I am still ill. What now?",
        a: "Book a consultation. Once illness goes beyond the scope of self-certification the situation stops being administrative and becomes clinical: what you have needs assessing, treatment deciding, and incapacity certifying if that is warranted.",
      },
    ],
    disclaimerTitle: "Medical Disclaimer",
    disclaimer:
      "Written by Dr Rui Diogo Rodrigues, General Practitioner at Global Health Portugal, and clinically reviewed by Dra. Margarida Domingues e Andrade, General Practitioner. This article contains general information about justifying absence through illness in Portugal. It is not personalised medical advice, nor legal or employment advice. Entitlement to social benefits is decided solely by Segurança Social. In a medical emergency, call 112 immediately.",
  } satisfies Article,
};

const es: LocalePost = {
  locale: "ES",
  slug: "autodeclaracion-enfermedad-portugal",
  title: "Autodeclaración de enfermedad o baja médica en Portugal: cuál necesita",
  excerpt:
    "La autodeclaração de doença la presenta usted mismo en la Segurança Social Direta y justifica ausencias cortas. La baja médica es otro instrumento, la emite un médico y es la que abre el subsidio de enfermedad. Explicamos la diferencia y qué hacer en cada caso.",
  seoTitle: "Autodeclaración o baja médica en Portugal",
  seoDescription:
    "Autodeclaração de doença o baixa médica en Portugal: quién emite cada una, cómo se presenta en la Segurança Social Direta y cuál da derecho a subsidio.",
  category: "Medicina General",
  article: {
    lang: "es-ES",
    tagline: "Medicina en cualquier momento y lugar",
    categoryLabel: "Medicina General",
    categoryHref: href("es", "/blog"),
    eyebrow: "Portugal · Guía para trabajadores",
    h1: "¿Autodeclaración de enfermedad o baja médica?",
    deck: "Son dos instrumentos distintos, con emisores distintos y efectos distintos. Elegir el equivocado es el motivo más frecuente de que una ausencia acabe sin justificar.",
    intro:
      "La <strong>autodeclaração de doença</strong> la rellena y presenta <em>usted mismo</em>, en la Segurança Social Direta, bajo declaración de honor, y sirve para justificar una ausencia corta al trabajo. No pasa por un médico y <strong>no da derecho a subsidio de enfermedad</strong>. La <strong>baixa médica</strong> es otra cosa: se apoya en un <strong>Certificado de Incapacidade Temporária (CIT)</strong> emitido por un médico — en el SNS o en la privada — y remitido a la Segurança Social, es el que comunica la incapacidad a la Segurança Social y el que puede abrir el subsidio. Regla práctica: ausencia muy corta y sin necesidad clínica de ser visto, autodeclaración; enfermedad que le impide trabajar más tiempo, consulta médica.",
    facts: ["Autodeclaración: la presenta usted", "Baja médica: la emite un médico", "Solo el CIT abre el subsidio"],
    primaryCta: { label: "Reservar consulta médica", href: href("es", "/services/baixa-medica") },
    secondaryCta: { label: "Baixa médica en SNS 24", href: SNS24_BAIXA },
    panelChip: "Qué cubre esta guía",
    panelParas: [
      "Quién emite cada documento, qué prueba cada uno y qué no prueba.",
      "Dónde y cómo se presenta la autodeclaración, y por qué existe la verificación por parte de la empresa.",
      "El número de días, las veces que puede usarse al año, el periodo de espera y los importes del subsidio los fija la ley y cambian. No se citan aquí: cada uno remite a la Segurança Social.",
    ],
    author: { initials: "RR", name: "Dr Rui Diogo Rodrigues", line: "Médico de familia · Global Health Portugal" },
    reviewLine: "Revisado clínicamente por la Dra. Margarida Domingues e Andrade, médica de familia, Global Health Portugal.",
    navLabel: "En este artículo",
    sections: [
      {
        id: "autodeclaracao",
        nav: "Autodeclaración",
        eyebrow: "Instrumento 1",
        h2: "Qué es la autodeclaração de doença",
        blocks: [
          lead("Es una declaración suya, bajo declaración de honor, de que estuvo enfermo e imposibilitado para trabajar durante un periodo corto."),
          p("Se presenta en la <strong>Segurança Social Direta</strong>, en el área del propio trabajador, y está pensada para enfermedad leve en la que no hay necesidad clínica de ser visto por un médico. Se creó precisamente para evitar desplazamientos a un centro de salud solo para conseguir un papel."),
          ul([
            "Es <strong>el trabajador</strong> quien la rellena y la presenta: ni el médico ni la empresa.",
            "Sirve para <strong>justificar la falta</strong> ante la empresa.",
            "<strong>No</strong> genera subsidio de enfermedad, porque no hay certificación clínica de incapacidad.",
            "Cuántos días cubre, y cuántas veces al año puede usarse, están fijados en la ley y se indican en el propio formulario de la Segurança Social Direta.",
          ]),
          warn("Es una declaración bajo palabra de honor", "No es un formulario sin consecuencias. Declarar falsamente una situación de enfermedad tiene implicaciones disciplinarias y legales. La autodeclaración existe para simplificar la justificación de una enfermedad real, no para fabricar días libres."),
        ],
      },
      {
        id: "validar",
        nav: "Verificación",
        eyebrow: "El lado de la empresa",
        h2: "Cómo confirma la empresa la autodeclaración",
        blocks: [
          lead("La empresa no tiene que creerle bajo palabra, y tampoco tiene derecho a pedirle explicaciones clínicas."),
          p("La presentación en la Segurança Social Direta genera un comprobante que puede consultarse y confirmarse. Ese mecanismo sustituye al papel firmado: la empresa confirma que la declaración existe y a qué periodo corresponde, sin acceso alguno a información sobre su salud."),
          p("La empresa <strong>no tiene derecho a conocer su diagnóstico</strong>, ni en la autodeclaración ni en la baja médica. Lo que se le comunica es la existencia y el periodo de la ausencia justificada. La información clínica está protegida por el secreto médico y por las normas de protección de datos de salud."),
          cite(`Presentación y consulta: <a href="${SEG_SOCIAL}" rel="nofollow noopener" target="_blank">Segurança Social</a>.`),
        ],
      },
      {
        id: "baixa",
        nav: "Baja médica",
        eyebrow: "Instrumento 2",
        h2: "Qué es la baixa médica y el CIT",
        blocks: [
          lead("Cuando la enfermedad supera el ámbito de la autodeclaración, lo que existe es un Certificado de Incapacidade Temporária."),
          p("El <strong>CIT</strong> lo emite un médico — en el SNS o en la privada, nosotros también — y se remite a la Segurança Social. Es el documento que acredita clínicamente que está temporalmente incapacitado para trabajar, y a partir de él se evalúa el derecho al <strong>subsidio de enfermedad</strong>."),
          ul([
            "Es <strong>el médico</strong> quien decide si existe incapacidad y por cuánto tiempo: no el paciente ni la empresa.",
            "La mayoría de los CIT viajan por vía electrónica y el paciente no transporta nada; siguen existiendo CIT en papel, que el propio paciente entrega en la Segurança Social.",
            "Si la incapacidad se prolonga hay reevaluación médica y el periodo puede prorrogarlo el médico que le atiende.",
            "El periodo de espera antes del inicio del pago y la forma de cálculo del subsidio están definidos por ley y figuran en el portal de la Segurança Social.",
          ]),
          warn("Ninguna consulta garantiza una baja", "La emisión de un certificado de incapacidad depende de lo que muestre la valoración clínica. Cualquier servicio que prometa la baja antes de que un médico le explore está prometiendo algo que un médico no puede garantizar deontológicamente."),
          cite(`Información oficial sobre baixa médica: <a href="${SNS24_BAIXA}" rel="nofollow noopener" target="_blank">SNS 24</a>.`),
        ],
      },
      {
        id: "privado",
        nav: "Consulta privada",
        eyebrow: "Transparencia",
        h2: "Qué puede y qué no puede emitir una consulta privada",
        blocks: [
          lead("Esta es la parte que la mayoría de los sitios evita decir con claridad, así que la decimos primero."),
          p("En una consulta privada, incluida la de vídeo, el médico le evalúa y puede emitir una <strong>declaración médica de justificación de falta al trabajo</strong>. Ese es el servicio que prestamos y así se llama. Sirve para justificar la ausencia ante la empresa."),
          p("Una consulta privada <strong>puede emitir un CIT</strong>: nosotros lo hacemos. Lo que decide cuál de los dos documentos tiene sentido es la duración previsible de la enfermedad: el subsidio no empieza a pagarse hasta que transcurre un periodo de espera fijado por ley, así que una ausencia de dos o tres días rara vez justifica un CIT, y una declaración médica cubre lo que la empresa necesita. Cuando la enfermedad se prolonga más allá de ese periodo, el CIT es el instrumento adecuado."),
          ul([
            "Solo necesita justificar la falta ante la empresa: una declaración médica cumple ese efecto.",
            "Necesita subsidio de enfermedad: necesita CIT y, por tanto, el circuito del SNS.",
            "No sabe cuál de los dos es su caso: eso es exactamente lo que una consulta resuelve en pocos minutos.",
          ]),
          p(`Puede confirmar la colegiación de cualquier médico en la <a href="${ORDEM_MEDICOS}" rel="nofollow noopener" target="_blank">Ordem dos Médicos</a>, con nosotros y con cualquier otro.`),
        ],
      },
      {
        id: "qual-escolher",
        nav: "Cuál elegir",
        eyebrow: "Decisión",
        h2: "Cuál de los dos se aplica a su caso",
        blocks: [
          lead("Tres preguntas resuelven casi todas las situaciones."),
          ul([
            "<strong>¿Cuánto tiempo va a faltar?</strong> Ausencia muy corta, dentro de lo que la ley permite declarar, y sin necesidad clínica de ser visto: autodeclaración.",
            "<strong>¿Necesita cobrar de la Segurança Social durante la ausencia?</strong> Si es así, necesita CIT y, por tanto, un médico.",
            "<strong>¿La enfermedad necesita valorarse?</strong> Si hay dudas sobre lo que tiene, si los síntomas empeoran, o si ya agotó lo que la autodeclaración permite, la respuesta es consulta: la justificación es el subproducto, no el objetivo.",
          ]),
          p("Hay además una cuarta situación que se olvida a menudo: la enfermedad de un familiar a cargo, la asistencia a un hijo y otras faltas por motivos de salud de terceros. Tienen nombre y reglas propias, distintas de ambos instrumentos anteriores, pero se emiten en el mismo sistema que el CIT, y nosotros también las emitimos. Las condiciones están en el portal de la Segurança Social."),
        ],
      },
      {
        id: "urgencia",
        nav: "Cuándo no esperar",
        eyebrow: "Seguridad",
        h2: "Cuando el problema no es el papel",
        blocks: [
          lead("Hay situaciones en las que gestionar la justificación es lo último que hay que hacer."),
          ul([
            "Dolor u opresión en el pecho, especialmente con falta de aire, sudoración o dolor irradiado al brazo o a la mandíbula.",
            "Debilidad súbita de un lado del cuerpo, desviación de la boca, dificultad para hablar o dolor de cabeza súbito e intenso.",
            "Dificultad para respirar en reposo, o labios y cara azulados.",
            "Manchas en la piel que no desaparecen al presionar, con fiebre, rigidez de nuca o confusión.",
            "Sangrado abundante o vómito con sangre.",
            "Cualquier idea de hacerse daño.",
          ]),
          p("En estos casos llame al <strong>112</strong>, o contacte con <strong>SNS 24</strong> si tiene dudas sobre la gravedad. La justificación de la falta se resuelve después, y se resuelve siempre."),
        ],
      },
    ],
    linksEyebrow: "Global Health Portugal",
    linksH2: "Siguientes pasos",
    linksLead: "Nuestros médicos en Portugal le valoran por vídeo y le dicen con claridad cuál de los dos caminos es el suyo.",
    links: [
      { label: "Consulta y justificación médica de falta al trabajo", href: href("es", "/services/baixa-medica") },
      { label: "Nuestros médicos en Portugal", href: href("es", "/doctors") },
      { label: "Contactar con Global Health Portugal", href: href("es", "/contact") },
    ],
    ctaBox: {
      h3: "¿No sabe si necesita un médico?",
      text: "Una consulta breve aclara si su situación se resuelve con autodeclaración o si necesita realmente valoración clínica y, cuando procede, emite la justificación médica de la falta.",
      primary: { label: "Reservar consulta", href: href("es", "/services/baixa-medica") },
      secondary: { label: "Ver nuestros médicos", href: href("es", "/doctors") },
    },
    sourcesEyebrow: "Fuentes oficiales",
    sourcesH2: "Dónde confirmar las reglas",
    sourcesLead: "Días cubiertos, usos por año, periodo de espera e importes del subsidio los define la ley y cambian. Confirme siempre en la fuente.",
    sources: [
      { label: "Segurança Social", href: SEG_SOCIAL },
      { label: "SNS 24 — baixa médica", href: SNS24_BAIXA },
      { label: "Ordem dos Médicos", href: ORDEM_MEDICOS },
    ],
    sourcesNote:
      "Los enlaces abren en los sitios de los organismos competentes. Global Health no forma parte de la Segurança Social ni del SNS, no emite Certificados de Incapacidade Temporária y no puede decidir, acelerar ni garantizar ninguna prestación social.",
    faqEyebrow: "FAQ",
    faqH2: "Preguntas frecuentes",
    faqs: [
      {
        q: "¿La autodeclaración de enfermedad da derecho a subsidio?",
        a: "No. Justifica la falta ante la empresa, pero no implica certificación clínica de incapacidad. El subsidio de enfermedad depende de un Certificado de Incapacidade Temporária emitido por un médico, en el SNS o en la privada.",
      },
      {
        q: "¿Dónde se presenta la autodeclaração de doença?",
        a: "En la Segurança Social Direta, en el área del propio trabajador, bajo declaración de honor. La presentación genera un comprobante que la empresa puede confirmar, sin acceso a información clínica sobre usted.",
      },
      {
        q: "¿Cuántos días cubre y cuántas veces al año puedo usarla?",
        a: "Los límites los fija la ley y se indican en el propio formulario de la Segurança Social Direta al presentarla. Como cambian, confírmelos en el portal de la Segurança Social y no en un artículo.",
      },
      {
        q: "¿Puede mi empresa exigir saber qué tengo?",
        a: "No. Tanto en la autodeclaración como en la baja médica, lo que se comunica es la existencia y el periodo de la ausencia justificada. El diagnóstico es información clínica protegida por el secreto médico y por las normas de protección de datos de salud.",
      },
      {
        q: "¿Una consulta privada online puede darme una baja médica?",
        a: "Sí. Una consulta privada puede emitir una declaración médica que justifica la falta al trabajo y también puede emitir el Certificado de Incapacidade Temporária, que es el que abre el subsidio. En ausencias cortas solemos emitir la declaración, porque el subsidio no empieza a pagarse hasta que pasa el periodo de espera fijado por ley; si la enfermedad se prolonga, emitimos el CIT.",
      },
      {
        q: "Ya usé la autodeclaración y sigo enfermo. ¿Qué hago?",
        a: "Pida consulta. Cuando la enfermedad supera el ámbito de la autodeclaración, la situación deja de ser administrativa y pasa a ser clínica: hay que valorar qué tiene, decidir tratamiento y, si procede, certificar la incapacidad.",
      },
    ],
    disclaimerTitle: "Aviso Médico",
    disclaimer:
      "Escrito por el Dr Rui Diogo Rodrigues, médico de familia de Global Health Portugal, y revisado clínicamente por la Dra. Margarida Domingues e Andrade, médica de familia. Este artículo contiene información general sobre la justificación de faltas por enfermedad en Portugal. No constituye asesoramiento médico personalizado, ni asesoramiento jurídico o laboral. El derecho a prestaciones sociales lo decide exclusivamente la Segurança Social. En caso de emergencia médica, llame inmediatamente al 112.",
  } satisfies Article,
};

const cs: LocalePost = {
  locale: "CS",
  slug: "autodeklarace-nemoci-portugalsko",
  title: "Autodeklarace nemoci nebo neschopenka v Portugalsku: co kdy potřebujete",
  excerpt:
    "Autodeklaraci nemoci podáváte sami na Segurança Social Direta a omlouvá krátkou absenci. Baixa médica je jiný nástroj, vystavuje ji lékař a je to ona, kdo otevírá nemocenskou dávku. Vysvětlujeme rozdíl a co dělat v obou případech.",
  seoTitle: "Autodeklarace nemoci nebo neschopenka v Portugalsku",
  seoDescription:
    "Autodeklarace nemoci nebo baixa médica v Portugalsku: kdo co vystavuje, jak se podává na Segurança Social Direta a co otevírá nemocenskou dávku.",
  category: "Praktické lékařství",
  article: {
    lang: "cs-CZ",
    tagline: "Medicína kdykoli a kdekoli",
    categoryLabel: "Praktické lékařství",
    categoryHref: href("cs", "/blog"),
    eyebrow: "Portugalsko · Průvodce pro zaměstnance",
    h1: "Autodeklarace nemoci, nebo neschopenka?",
    deck: "Jsou to dva různé nástroje, s různými vystavovateli a různými účinky. Zvolit ten špatný je nejčastější důvod, proč absence nakonec zůstane neomluvená.",
    intro:
      "<strong>Autodeklaraci nemoci</strong> (autodeclaração de doença) vyplňujete a podáváte <em>vy sami</em>, na Segurança Social Direta, čestným prohlášením, a slouží k omluvení krátké nepřítomnosti v práci. Nejde přes lékaře a <strong>nezakládá nárok na nemocenskou dávku</strong>. <strong>Baixa médica</strong> je něco jiného: stojí na <strong>Certificado de Incapacidade Temporária (CIT)</strong>, který vystavuje lékař — ve veřejném systému i v soukromé praxi — a předává správě sociálního zabezpečení. Právě ten hlásí pracovní neschopnost správě sociálního zabezpečení a právě ten může otevřít nemocenskou dávku. Praktické pravidlo: velmi krátká absence bez klinické potřeby vyšetření znamená autodeklaraci; nemoc, která vám brání pracovat déle, znamená lékaře.",
    facts: ["Autodeklaraci podáváte sami", "Baixa médica: vystavuje lékař", "Dávku otevírá jen CIT"],
    primaryCta: { label: "Objednat lékařskou konzultaci", href: href("cs", "/services/baixa-medica") },
    secondaryCta: { label: "Baixa médica na SNS 24", href: SNS24_BAIXA },
    panelChip: "Co v článku najdete",
    panelParas: [
      "Kdo vystavuje který dokument, co každý z nich dokládá a co nedokládá.",
      "Kde a jak se autodeklarace podává a proč vůbec existuje ověření ze strany zaměstnavatele.",
      "Počet dnů, kolikrát ročně ji lze použít, čekací doba i výše dávky jsou dány zákonem a mění se. Nejsou zde uvedeny: každý z těchto údajů odkazuje na Segurança Social.",
    ],
    author: { initials: "RR", name: "Dr Rui Diogo Rodrigues", line: "Praktický lékař · Global Health Portugalsko" },
    reviewLine: "Klinicky zkontrolovala Dra. Margarida Domingues e Andrade, praktická lékařka, Global Health Portugalsko.",
    navLabel: "Obsah článku",
    sections: [
      {
        id: "autodeclaracao",
        nav: "Autodeklarace",
        eyebrow: "Nástroj 1",
        h2: "Co je autodeklarace nemoci",
        blocks: [
          lead("Je to vaše vlastní prohlášení, čestným slovem, že jste byli nemocní a krátkou dobu neschopní pracovat."),
          p("Podává se na <strong>Segurança Social Direta</strong>, ve vlastní sekci zaměstnance, a je určena pro lehká onemocnění, u kterých není klinická potřeba být vyšetřen lékařem. Vznikla právě proto, aby lidé nemuseli chodit do zdravotnického zařízení jen kvůli papíru."),
          ul([
            "Vyplňuje a podává ji <strong>zaměstnanec</strong> — ne lékař a ne zaměstnavatel.",
            "Slouží k <strong>omluvení absence</strong> vůči zaměstnavateli.",
            "<strong>Nezakládá</strong> nárok na nemocenskou dávku, protože neexistuje klinické potvrzení pracovní neschopnosti.",
            "Kolik dnů pokrývá a kolikrát ročně ji lze použít je stanoveno zákonem a uvedeno přímo ve formuláři na Segurança Social Direta.",
          ]),
          warn("Je to prohlášení čestným slovem", "Není to formulář bez následků. Nepravdivé prohlášení o nemoci má disciplinární i právní důsledky. Autodeklarace existuje proto, aby zjednodušila doložení skutečné nemoci, ne aby vytvářela dny volna."),
        ],
      },
      {
        id: "validar",
        nav: "Ověření",
        eyebrow: "Na straně firmy",
        h2: "Jak zaměstnavatel autodeklaraci ověří",
        blocks: [
          lead("Zaměstnavatel vám nemusí věřit na slovo — a zároveň nemá právo žádat po vás klinické vysvětlení."),
          p("Podání na Segurança Social Direta vytvoří potvrzení, které lze dohledat a ověřit. Tento mechanismus nahrazuje podepsaný papír: firma potvrdí, že prohlášení existuje a jakého období se týká, aniž by získala jakoukoli informaci o vašem zdravotním stavu."),
          p("Zaměstnavatel <strong>nemá právo znát vaši diagnózu</strong>, ani u autodeklarace, ani u baixa médica. Sděluje se mu existence a období omluvené absence, nikoli proč. Klinická informace je chráněna lékařským tajemstvím a pravidly ochrany zdravotních údajů."),
          p("V praxi z toho plyne jedna užitečná věc: pokud po vás někdo v práci chce lékařskou zprávu, popis příznaků nebo jméno diagnózy, žádá něco, na co nemá nárok. Doložit máte to, že absence byla omluvena a v jakém období — a to systém udělá za vás. Zbytek zůstává mezi vámi a lékařem."),
          cite(`Podání a ověření: <a href="${SEG_SOCIAL}" rel="nofollow noopener" target="_blank">Segurança Social</a>.`),
        ],
      },
      {
        id: "baixa",
        nav: "Baixa médica",
        eyebrow: "Nástroj 2",
        h2: "Co je baixa médica a CIT",
        blocks: [
          lead("Když nemoc přesáhne rozsah autodeklarace, nastupuje Certificado de Incapacidade Temporária."),
          p("<strong>CIT</strong> vystavuje lékař — ve veřejném systému i v soukromé praxi, tedy i my — a předává se správě sociálního zabezpečení. Je to dokument, který klinicky potvrzuje, že jste dočasně neschopni práce, a na jeho základě se posuzuje nárok na <strong>nemocenskou dávku</strong>."),
          ul([
            "O tom, zda pracovní neschopnost existuje a na jak dlouho, rozhoduje <strong>lékař</strong> — ne pacient a ne zaměstnavatel.",
            "Většina CIT putuje elektronicky a pacient nic nenosí; stále existují i papírové CIT, které na správu sociálního zabezpečení odevzdá sám pacient.",
            "Pokud neschopnost trvá déle, následuje lékařské přehodnocení a ošetřující lékař může dobu prodloužit.",
            "Čekací doba před začátkem výplaty i způsob výpočtu dávky jsou dány zákonem a uvedeny na portálu Segurança Social.",
          ]),
          warn("Žádná konzultace nezaručuje neschopenku", "Vystavení potvrzení o pracovní neschopnosti závisí na tom, co ukáže klinické vyšetření. Služba, která slibuje neschopenku dřív, než vás lékař vyšetří, slibuje něco, co lékař eticky zaručit nemůže."),
          cite(`Oficiální informace o baixa médica: <a href="${SNS24_BAIXA}" rel="nofollow noopener" target="_blank">SNS 24</a>.`),
        ],
      },
      {
        id: "privado",
        nav: "Soukromá konzultace",
        eyebrow: "Transparentnost",
        h2: "Co soukromá konzultace vystavit může a co ne",
        blocks: [
          lead("Tohle je část, kterou většina webů říká nerada, proto ji říkáme jako první."),
          p("Při soukromé konzultaci, včetně videokonzultace, vás lékař vyšetří a může vystavit <strong>lékařské potvrzení omlouvající nepřítomnost v práci</strong>. To je služba, kterou poskytujeme, a takto se jmenuje. Slouží k omluvení absence vůči zaměstnavateli."),
          p("Soukromá konzultace <strong>CIT vystavit může</strong> — my jej vystavujeme. O tom, který z obou dokumentů dává smysl, rozhoduje předpokládaná délka nemoci: nemocenská dávka se začíná vyplácet až po zákonem stanovené čekací době, takže dvou- až třídenní absenci CIT málokdy odpovídá a zaměstnavateli stačí lékařské potvrzení. Jakmile nemoc tuto dobu přesáhne, správným nástrojem je CIT."),
          ul([
            "Potřebujete jen omluvit absenci u zaměstnavatele: lékařské potvrzení tento účel splní.",
            "Potřebujete nemocenskou dávku: potřebujete CIT, a tedy okruh SNS.",
            "Nevíte, který z obou případů je ten váš: přesně to konzultace vyřeší během několika minut.",
          ]),
          p(`Registraci kteréhokoli lékaře si ověříte u <a href="${ORDEM_MEDICOS}" rel="nofollow noopener" target="_blank">Ordem dos Médicos</a>, u nás stejně jako kdekoli jinde.`),
        ],
      },
      {
        id: "qual-escolher",
        nav: "Co si vybrat",
        eyebrow: "Rozhodnutí",
        h2: "Který z obou nástrojů platí pro váš případ",
        blocks: [
          lead("Tři otázky vyřeší téměř každou situaci."),
          ul([
            "<strong>Jak dlouho budete chybět?</strong> Velmi krátká absence, v rozsahu, který zákon umožňuje deklarovat, a bez klinické potřeby vyšetření: autodeklarace.",
            "<strong>Potřebujete být během absence placeni ze sociálního zabezpečení?</strong> Pokud ano, potřebujete CIT, a tedy lékaře.",
            "<strong>Potřebuje nemoc vyšetřit?</strong> Pokud nevíte, co vám je, pokud se příznaky zhoršují, nebo pokud jste už vyčerpali, co autodeklarace umožňuje, odpovědí je konzultace — potvrzení je vedlejší produkt, ne cíl.",
          ]),
          p("Existuje i čtvrtá situace, na kterou se často zapomíná: nemoc závislého člena rodiny, péče o dítě a další absence ze zdravotních důvodů třetích osob. Mají vlastní název i pravidla, odlišná od obou nástrojů výše, ale vystavují se ve stejném systému jako CIT — a vystavujeme je také. Podmínky najdete na portálu Segurança Social."),
          p("A ještě jedno doporučení, které ušetří nejvíc komplikací: rozhodněte se hned první den, ne až po víkendu. Autodeklarace se podává za probíhající nebo právě skončenou krátkou absenci, zatímco lékař posuzuje váš stav v době, kdy vás vidí. Čím později se do toho pustíte, tím hůř se doloží období, které chcete omluvit."),
        ],
      },
      {
        id: "urgencia",
        nav: "Kdy nečekat",
        eyebrow: "Bezpečnost",
        h2: "Když problémem není papír",
        blocks: [
          lead("Jsou situace, kdy je řešení omluvenky to poslední, co má smysl dělat."),
          ul([
            "Bolest nebo tlak na hrudi, zvlášť s dušností, pocením nebo bolestí vystřelující do paže či čelisti.",
            "Náhlá slabost poloviny těla, pokleslý koutek, porucha řeči nebo náhlá krutá bolest hlavy.",
            "Dušnost v klidu, nebo promodrávání rtů a obličeje.",
            "Skvrny na kůži, které po stlačení nemizí, s horečkou, ztuhlou šíjí nebo zmateností.",
            "Silné krvácení nebo zvracení krve.",
            "Jakákoli myšlenka na sebepoškození.",
          ]),
          p("V těchto případech volejte <strong>112</strong>, případně kontaktujte <strong>SNS 24</strong>, pokud si nejste jisti závažností. Omluvení absence se vyřeší potom — a vyřeší se vždy."),
        ],
      },
    ],
    linksEyebrow: "Global Health Portugalsko",
    linksH2: "Další kroky",
    linksLead: "Naši lékaři v Portugalsku vás vyšetří přes video a jasně vám řeknou, která ze dvou cest je ta vaše.",
    links: [
      { label: "Konzultace a lékařské potvrzení nepřítomnosti v práci", href: href("cs", "/services/baixa-medica") },
      { label: "Naši lékaři v Portugalsku", href: href("cs", "/doctors") },
      { label: "Kontaktovat Global Health Portugalsko", href: href("cs", "/contact") },
    ],
    ctaBox: {
      h3: "Nevíte, jestli potřebujete lékaře?",
      text: "Krátká konzultace vyjasní, zda se vaše situace vyřeší autodeklarací, nebo skutečně potřebuje klinické vyšetření — a když je to na místě, vystaví lékařské potvrzení absence.",
      primary: { label: "Objednat konzultaci", href: href("cs", "/services/baixa-medica") },
      secondary: { label: "Zobrazit naše lékaře", href: href("cs", "/doctors") },
    },
    sourcesEyebrow: "Oficiální zdroje",
    sourcesH2: "Kde si pravidla ověříte",
    sourcesLead: "Pokryté dny, počet použití za rok, čekací doba i výše dávky jsou dány zákonem a mění se. Ověřujte vždy u zdroje.",
    sources: [
      { label: "Segurança Social", href: SEG_SOCIAL },
      { label: "SNS 24 — baixa médica", href: SNS24_BAIXA },
      { label: "Ordem dos Médicos", href: ORDEM_MEDICOS },
    ],
    sourcesNote:
      "Odkazy vedou na weby příslušných institucí. Global Health není součástí Segurança Social ani SNS, nevystavuje Certificados de Incapacidade Temporária a nemůže o žádné sociální dávce rozhodnout, urychlit ji ani ji zaručit.",
    faqEyebrow: "FAQ",
    faqH2: "Časté dotazy",
    faqs: [
      {
        q: "Zakládá autodeklarace nemoci nárok na nemocenskou dávku?",
        a: "Ne. Omlouvá absenci vůči zaměstnavateli, ale neobsahuje klinické potvrzení pracovní neschopnosti. Nemocenská dávka závisí na Certificado de Incapacidade Temporária, který vystavuje lékař ve veřejném systému i v soukromé praxi.",
      },
      {
        q: "Kde se autodeklarace nemoci podává?",
        a: "Na Segurança Social Direta, ve vlastní sekci zaměstnance, čestným prohlášením. Podání vytvoří potvrzení, které si zaměstnavatel může ověřit, aniž by získal jakoukoli klinickou informaci o vás.",
      },
      {
        q: "Kolik dnů pokrývá a kolikrát ročně ji mohu použít?",
        a: "Limity jsou dány zákonem a uvedeny přímo ve formuláři na Segurança Social Direta v okamžiku podání. Protože se mění, ověřte si je na portálu Segurança Social, ne v článku.",
      },
      {
        q: "Může zaměstnavatel vyžadovat, abych řekl, co mi je?",
        a: "Ne. U autodeklarace i u baixa médica se sděluje existence a období omluvené absence. Diagnóza je klinická informace chráněná lékařským tajemstvím a pravidly ochrany zdravotních údajů.",
      },
      {
        q: "Může mi soukromá online konzultace vystavit baixa médica?",
        a: "Ano. Soukromá konzultace může vystavit lékařské potvrzení, které omlouvá nepřítomnost v práci, a může vystavit i Certificado de Incapacidade Temporária, který otevírá nemocenskou dávku. U krátkých absencí vystavujeme obvykle potvrzení, protože dávka se začíná vyplácet až po zákonné čekací době; když se nemoc protáhne, vystavíme CIT.",
      },
      {
        q: "Autodeklaraci jsem už použil a jsem stále nemocný. Co teď?",
        a: "Objednejte se ke konzultaci. Jakmile nemoc přesáhne rozsah autodeklarace, přestává být věcí administrativní a stává se klinickou: je potřeba zjistit, co vám je, rozhodnout o léčbě a případně potvrdit pracovní neschopnost.",
      },
    ],
    disclaimerTitle: "Lékařské upozornění",
    disclaimer:
      "Napsal Dr Rui Diogo Rodrigues, praktický lékař Global Health Portugalsko, klinicky zkontrolovala Dra. Margarida Domingues e Andrade, praktická lékařka. Článek obsahuje obecné informace o omlouvání absence pro nemoc v Portugalsku. Nejde o personalizované lékařské, právní ani pracovněprávní poradenství. O nároku na sociální dávky rozhoduje výhradně Segurança Social. V případě lékařské pohotovosti volejte okamžitě 112.",
  } satisfies Article,
};

const roPost: LocalePost = {
  locale: "RO",
  slug: "autodeclaratie-de-boala-portugalia",
  title: "Autodeclarație de boală sau concediu medical în Portugalia: de care aveți nevoie",
  excerpt:
    "Autodeclarația de boală o depuneți dumneavoastră pe Segurança Social Direta și justifică absențe scurte. Baixa médica este alt instrument, emis de medic, și este cea care deschide indemnizația de boală. Explicăm diferența și ce faceți în fiecare caz.",
  seoTitle: "Autodeclarație sau concediu medical în Portugalia",
  seoDescription:
    "Autodeclarație de boală sau baixa médica în Portugalia: cine emite fiecare document, cum se depune pe Segurança Social Direta și ce deschide indemnizația.",
  category: "Medicină de familie",
  article: {
    lang: "ro-RO",
    tagline: "Îngrijire medicală oricând, oriunde",
    categoryLabel: "Medicină de familie",
    categoryHref: href("ro", "/blog"),
    eyebrow: "Portugalia · Ghid pentru angajați",
    h1: "Autodeclarație de boală sau concediu medical?",
    deck: "Sunt două instrumente diferite, cu emitenți diferiți și efecte diferite. Alegerea greșită este cel mai frecvent motiv pentru care o absență rămâne, în final, nejustificată.",
    intro:
      "<strong>Autodeclarația de boală</strong> (autodeclaração de doença) este completată și depusă <em>de dumneavoastră</em>, pe Segurança Social Direta, pe propria răspundere, și justifică o absență scurtă de la muncă. Nu trece prin medic și <strong>nu dă dreptul la indemnizație de boală</strong>. <strong>Baixa médica</strong> este altceva: se bazează pe un <strong>Certificado de Incapacidade Temporária (CIT)</strong> emis de medic — în SNS sau în privat — și transmis către Segurança Social, este cel care comunică incapacitatea către Segurança Social și cel care poate deschide indemnizația de boală. Regulă practică: absență foarte scurtă, fără nevoie clinică de a fi consultat, autodeclarație; boală care vă împiedică să munciți mai mult timp, consultație medicală.",
    facts: ["Autodeclarația: o depuneți singur", "Baixa médica: o emite medicul", "Doar CIT deschide indemnizația"],
    primaryCta: { label: "Programați o consultație medicală", href: href("ro", "/services/baixa-medica") },
    secondaryCta: { label: "Baixa médica pe SNS 24", href: SNS24_BAIXA },
    panelChip: "Ce acoperă acest ghid",
    panelParas: [
      "Cine emite fiecare document, ce dovedește fiecare și ce nu dovedește.",
      "Unde și cum se depune autodeclarația și de ce există verificarea de către angajator.",
      "Numărul de zile, de câte ori pe an poate fi folosită, perioada de așteptare și valorile indemnizației sunt stabilite prin lege și se modifică. Nu sunt citate aici: fiecare trimite la Segurança Social.",
    ],
    author: { initials: "RR", name: "Dr Rui Diogo Rodrigues", line: "Medic de familie · Global Health Portugalia" },
    reviewLine: "Revizuit clinic de Dra. Margarida Domingues e Andrade, medic de familie, Global Health Portugalia.",
    navLabel: "În acest articol",
    sections: [
      {
        id: "autodeclaracao",
        nav: "Autodeclarația",
        eyebrow: "Instrumentul 1",
        h2: "Ce este autodeclarația de boală",
        blocks: [
          lead("Este o declarație a dumneavoastră, pe propria răspundere, că ați fost bolnav și în imposibilitate de a munci pentru o perioadă scurtă."),
          p("Se depune pe <strong>Segurança Social Direta</strong>, în zona proprie a angajatului, și este destinată situațiilor de boală ușoară în care nu există nevoie clinică de a fi consultat de un medic. A fost creată tocmai pentru a evita deplasările la o unitate sanitară doar pentru a obține o hârtie."),
          ul([
            "<strong>Angajatul</strong> este cel care o completează și o depune — nu medicul, nu angajatorul.",
            "Servește la <strong>justificarea absenței</strong> față de angajator.",
            "<strong>Nu</strong> generează indemnizație de boală, pentru că nu există certificare clinică a incapacității.",
            "Câte zile acoperă și de câte ori pe an poate fi folosită sunt stabilite prin lege și indicate chiar în formularul de pe Segurança Social Direta.",
          ]),
          warn("Este o declarație pe propria răspundere", "Nu este un formular fără consecințe. Declararea falsă a unei situații de boală are implicații disciplinare și legale. Autodeclarația există pentru a simplifica justificarea unei boli reale, nu pentru a crea zile libere."),
        ],
      },
      {
        id: "validar",
        nav: "Verificarea",
        eyebrow: "Partea angajatorului",
        h2: "Cum confirmă angajatorul autodeclarația",
        blocks: [
          lead("Angajatorul nu trebuie să vă creadă pe cuvânt — și nici nu are dreptul să vă ceară explicații clinice."),
          p("Depunerea pe Segurança Social Direta generează o dovadă care poate fi consultată și confirmată. Acest mecanism înlocuiește hârtia semnată: firma confirmă că declarația există și la ce perioadă se referă, fără să aibă acces la vreo informație despre starea dumneavoastră de sănătate."),
          p("Angajatorul <strong>nu are dreptul să vă cunoască diagnosticul</strong>, nici la autodeclarație, nici la baixa médica. I se comunică existența și perioada absenței justificate, nu motivul. Informația clinică este protejată de secretul medical și de regulile privind protecția datelor de sănătate."),
          cite(`Depunere și consultare: <a href="${SEG_SOCIAL}" rel="nofollow noopener" target="_blank">Segurança Social</a>.`),
        ],
      },
      {
        id: "baixa",
        nav: "Baixa médica",
        eyebrow: "Instrumentul 2",
        h2: "Ce sunt baixa médica și CIT",
        blocks: [
          lead("Când boala depășește sfera autodeclarației, ceea ce apare este un Certificado de Incapacidade Temporária."),
          p("<strong>CIT</strong> este emis de medic — în SNS sau în privat, inclusiv de noi — și transmis către Segurança Social. Este documentul care atestă clinic că sunteți temporar incapabil de muncă și de la care se evaluează dreptul la <strong>indemnizația de boală</strong>."),
          ul([
            "<strong>Medicul</strong> decide dacă există incapacitate și pentru ce perioadă — nu pacientul și nu angajatorul.",
            "Majoritatea CIT circulă electronic și pacientul nu duce nimic; există însă și CIT pe hârtie, pe care pacientul le depune el însuși la Segurança Social.",
            "Dacă incapacitatea se prelungește, are loc o reevaluare medicală, iar medicul curant poate prelungi perioada.",
            "Perioada de așteptare până la începerea plății și modul de calcul al indemnizației sunt definite prin lege și apar pe portalul Segurança Social.",
          ]),
          warn("Nicio consultație nu garantează un concediu medical", "Emiterea unui certificat de incapacitate depinde de ce arată evaluarea clinică. Orice serviciu care promite concediul înainte ca medicul să vă consulte promite ceva ce un medic nu poate garanta deontologic."),
          cite(`Informații oficiale despre baixa médica: <a href="${SNS24_BAIXA}" rel="nofollow noopener" target="_blank">SNS 24</a>.`),
        ],
      },
      {
        id: "privado",
        nav: "Consultația privată",
        eyebrow: "Transparență",
        h2: "Ce poate și ce nu poate emite o consultație privată",
        blocks: [
          lead("Aceasta este partea pe care majoritatea site-urilor evită să o spună clar, așa că o spunem prima."),
          p("Într-o consultație privată, inclusiv video, medicul vă evaluează și poate emite o <strong>declarație medicală de justificare a absenței de la muncă</strong>. Acesta este serviciul pe care îl oferim și așa se numește. Servește la justificarea absenței față de angajator."),
          p("O consultație privată <strong>poate emite CIT</strong> — noi emitem. Ce decide care dintre cele două documente are sens este durata probabilă a bolii: indemnizația de boală începe să se plătească abia după o perioadă de așteptare stabilită prin lege, așa că o absență de două-trei zile rareori justifică un CIT, iar o declarație medicală acoperă ce îi trebuie angajatorului. Când boala depășește acea perioadă, CIT este instrumentul potrivit."),
          ul([
            "Aveți nevoie doar să justificați absența față de angajator: o declarație medicală îndeplinește acest efect.",
            "Aveți nevoie de indemnizație de boală: aveți nevoie de CIT și, prin urmare, de circuitul SNS.",
            "Nu știți care dintre cele două este cazul dumneavoastră: exact asta lămurește o consultație în câteva minute.",
          ]),
          p(`Puteți confirma înscrierea oricărui medic la <a href="${ORDEM_MEDICOS}" rel="nofollow noopener" target="_blank">Ordem dos Médicos</a>, la noi ca oriunde altundeva.`),
        ],
      },
      {
        id: "qual-escolher",
        nav: "Care se aplică",
        eyebrow: "Decizie",
        h2: "Care dintre cele două se aplică în cazul dumneavoastră",
        blocks: [
          lead("Trei întrebări rezolvă aproape toate situațiile."),
          ul([
            "<strong>Cât timp veți lipsi?</strong> Absență foarte scurtă, în limita a ceea ce legea permite să declarați, și fără nevoie clinică de a fi consultat: autodeclarație.",
            "<strong>Aveți nevoie să fiți plătit de Segurança Social pe durata absenței?</strong> Dacă da, aveți nevoie de CIT și, prin urmare, de un medic.",
            "<strong>Boala trebuie evaluată?</strong> Dacă există dubii despre ce aveți, dacă simptomele se agravează sau dacă ați epuizat deja ce permite autodeclarația, răspunsul este consultația — justificarea este produsul secundar, nu obiectivul.",
          ]),
          p("Mai există o a patra situație, adesea uitată: boala unui membru de familie aflat în întreținere, îngrijirea unui copil și alte absențe din motive de sănătate ale terților. Au denumire și reguli proprii, diferite de ambele instrumente de mai sus, dar se emit în același sistem ca CIT — iar noi le emitem la rândul nostru. Condițiile se găsesc pe portalul Segurança Social."),
        ],
      },
      {
        id: "urgencia",
        nav: "Când nu așteptați",
        eyebrow: "Siguranță",
        h2: "Când problema nu este hârtia",
        blocks: [
          lead("Există situații în care rezolvarea justificării este ultimul lucru de făcut."),
          ul([
            "Durere sau apăsare în piept, mai ales cu lipsă de aer, transpirații sau durere care iradiază în braț ori în mandibulă.",
            "Slăbiciune bruscă pe o parte a corpului, gură strâmbă, tulburare de vorbire sau durere de cap bruscă și intensă.",
            "Dificultate de respirație în repaus, ori buze și față vinete.",
            "Pete pe piele care nu dispar la apăsare, cu febră, redoare de ceafă sau confuzie.",
            "Sângerare abundentă sau vărsături cu sânge.",
            "Orice gând de a vă face rău.",
          ]),
          p("În aceste cazuri sunați la <strong>112</strong> sau contactați <strong>SNS 24</strong> dacă aveți dubii privind gravitatea. Justificarea absenței se rezolvă după — și se rezolvă întotdeauna."),
        ],
      },
    ],
    linksEyebrow: "Global Health Portugalia",
    linksH2: "Pașii următori",
    linksLead: "Medicii noștri din Portugalia vă evaluează prin video și vă spun clar care dintre cele două drumuri este al dumneavoastră.",
    links: [
      { label: "Consultație și justificare medicală a absenței de la muncă", href: href("ro", "/services/baixa-medica") },
      { label: "Medicii noștri din Portugalia", href: href("ro", "/doctors") },
      { label: "Contactați Global Health Portugalia", href: href("ro", "/contact") },
    ],
    ctaBox: {
      h3: "Nu știți dacă aveți nevoie de medic?",
      text: "O consultație scurtă lămurește dacă situația dumneavoastră se rezolvă prin autodeclarație sau are nevoie de evaluare clinică — iar când este cazul, emite justificarea medicală a absenței.",
      primary: { label: "Programați o consultație", href: href("ro", "/services/baixa-medica") },
      secondary: { label: "Vedeți medicii noștri", href: href("ro", "/doctors") },
    },
    sourcesEyebrow: "Surse oficiale",
    sourcesH2: "Unde verificați regulile",
    sourcesLead: "Zilele acoperite, utilizările pe an, perioada de așteptare și valorile indemnizației sunt definite prin lege și se modifică. Verificați întotdeauna la sursă.",
    sources: [
      { label: "Segurança Social", href: SEG_SOCIAL },
      { label: "SNS 24 — baixa médica", href: SNS24_BAIXA },
      { label: "Ordem dos Médicos", href: ORDEM_MEDICOS },
    ],
    sourcesNote:
      "Linkurile deschid site-urile instituțiilor competente. Global Health nu face parte din Segurança Social sau SNS, nu emite Certificados de Incapacidade Temporária și nu poate decide, accelera sau garanta vreo prestație socială.",
    faqEyebrow: "Întrebări frecvente",
    faqH2: "Întrebări frecvente",
    faqs: [
      {
        q: "Autodeclarația de boală dă dreptul la indemnizație de boală?",
        a: "Nu. Justifică absența față de angajator, dar nu implică certificare clinică a incapacității. Indemnizația de boală depinde de un Certificado de Incapacidade Temporária emis de medic, în SNS sau în privat.",
      },
      {
        q: "Unde se depune autodeclarația de boală?",
        a: "Pe Segurança Social Direta, în zona proprie a angajatului, pe propria răspundere. Depunerea generează o dovadă pe care angajatorul o poate confirma, fără a avea acces la vreo informație clinică despre dumneavoastră.",
      },
      {
        q: "Câte zile acoperă și de câte ori pe an o pot folosi?",
        a: "Limitele sunt stabilite prin lege și indicate chiar în formularul de pe Segurança Social Direta în momentul depunerii. Pentru că se modifică, verificați-le pe portalul Segurança Social, nu într-un articol.",
      },
      {
        q: "Angajatorul poate cere să știe ce am?",
        a: "Nu. Atât la autodeclarație, cât și la baixa médica, se comunică existența și perioada absenței justificate. Diagnosticul este informație clinică protejată de secretul medical și de regulile privind protecția datelor de sănătate.",
      },
      {
        q: "O consultație privată online îmi poate da baixa médica?",
        a: "Da. O consultație privată poate emite o declarație medicală care justifică absența de la muncă și poate emite și Certificado de Incapacidade Temporária, cel care deschide indemnizația de boală. La absențe scurte emitem de obicei declarația, pentru că indemnizația începe să se plătească abia după perioada de așteptare prevăzută de lege; când boala se prelungește, emitem CIT.",
      },
      {
        q: "Am folosit deja autodeclarația și sunt tot bolnav. Ce fac?",
        a: "Programați o consultație. Când boala depășește sfera autodeclarației, situația încetează să fie administrativă și devine clinică: trebuie evaluat ce aveți, decis tratamentul și, dacă este cazul, certificată incapacitatea.",
      },
    ],
    disclaimerTitle: "Aviz medical",
    disclaimer:
      "Scris de Dr Rui Diogo Rodrigues, medic de familie la Global Health Portugalia, și revizuit clinic de Dra. Margarida Domingues e Andrade, medic de familie. Articolul conține informații generale despre justificarea absențelor pentru boală în Portugalia. Nu constituie sfat medical personalizat și nici consultanță juridică sau de dreptul muncii. Dreptul la prestații sociale este decis exclusiv de Segurança Social. În caz de urgență medicală, sunați imediat la 112.",
  } satisfies Article,
};

const de: LocalePost = {
  locale: "DE",
  slug: "krankmeldung-selbsterklaerung-portugal",
  title: "Selbsterklärung oder ärztliche Krankmeldung in Portugal: was Sie brauchen",
  excerpt:
    "Die autodeclaração de doença reichen Sie selbst über Segurança Social Direta ein; sie entschuldigt kurze Fehlzeiten. Die baixa médica ist ein anderes Instrument, wird ärztlich ausgestellt und ist die, die Krankengeld eröffnet. Hier der Unterschied und das Vorgehen.",
  seoTitle: "Selbsterklärung oder Krankmeldung in Portugal?",
  seoDescription:
    "Autodeclaração de doença oder baixa médica in Portugal: wer was ausstellt, wie die Einreichung bei Segurança Social Direta läuft, was Krankengeld eröffnet.",
  category: "Allgemeinmedizin",
  article: {
    lang: "de-DE",
    tagline: "Medizin jederzeit und überall",
    categoryLabel: "Allgemeinmedizin",
    categoryHref: href("de", "/blog"),
    eyebrow: "Portugal · Leitfaden für Beschäftigte",
    h1: "Selbsterklärung oder ärztliche Krankmeldung?",
    deck: "Zwei verschiedene Instrumente, von verschiedenen Stellen ausgestellt, mit verschiedenen Wirkungen. Das falsche zu wählen ist der häufigste Grund, warum eine Fehlzeit am Ende unentschuldigt bleibt.",
    intro:
      "Die <strong>autodeclaração de doença</strong> füllen und reichen <em>Sie selbst</em> über Segurança Social Direta ein, auf Ehrenwort, und sie entschuldigt eine kurze Abwesenheit von der Arbeit. Sie läuft nicht über eine Praxis und <strong>eröffnet kein Krankengeld</strong>. Die <strong>baixa médica</strong> ist etwas anderes: sie beruht auf einem <strong>Certificado de Incapacidade Temporária (CIT)</strong>, das ärztlich ausgestellt wird — im SNS wie in der Privatpraxis — und an die Sozialversicherung geht. Dieses meldet die Arbeitsunfähigkeit an die Sozialversicherung und dieses kann Krankengeld eröffnen. Faustregel: sehr kurze Abwesenheit ohne klinische Notwendigkeit einer Untersuchung — Selbsterklärung; Krankheit, die Sie länger an der Arbeit hindert — ärztliche Sprechstunde.",
    facts: ["Selbsterklärung: Sie reichen sie ein", "Baixa médica: ärztlich ausgestellt", "Nur das CIT eröffnet Krankengeld"],
    primaryCta: { label: "Ärztliche Sprechstunde buchen", href: href("de", "/services/baixa-medica") },
    secondaryCta: { label: "Baixa médica bei SNS 24", href: SNS24_BAIXA },
    panelChip: "Was dieser Leitfaden abdeckt",
    panelParas: [
      "Wer welches Dokument ausstellt, was jedes belegt und was nicht.",
      "Wo und wie die Selbsterklärung eingereicht wird und warum es die Prüfung durch den Arbeitgeber überhaupt gibt.",
      "Die Zahl der Tage, wie oft pro Jahr sie genutzt werden darf, die Wartezeit und die Höhe des Krankengeldes sind gesetzlich festgelegt und ändern sich. Sie stehen hier nicht: jeder Punkt verweist auf Segurança Social.",
    ],
    author: { initials: "RR", name: "Dr Rui Diogo Rodrigues", line: "Allgemeinmediziner · Global Health Portugal" },
    reviewLine: "Fachlich geprüft von Dra. Margarida Domingues e Andrade, Allgemeinmedizinerin, Global Health Portugal.",
    navLabel: "In diesem Artikel",
    sections: [
      {
        id: "autodeclaracao",
        nav: "Selbsterklärung",
        eyebrow: "Instrument 1",
        h2: "Was die autodeclaração de doença ist",
        blocks: [
          lead("Es ist Ihre eigene Erklärung, auf Ehrenwort, dass Sie krank und für einen kurzen Zeitraum arbeitsunfähig waren."),
          p("Eingereicht wird sie über <strong>Segurança Social Direta</strong>, im eigenen Bereich der beschäftigten Person, und sie ist für leichte Erkrankungen gedacht, bei denen keine klinische Notwendigkeit besteht, ärztlich untersucht zu werden. Sie wurde gerade dafür geschaffen, damit niemand nur wegen eines Papiers eine Gesundheitseinrichtung aufsuchen muss."),
          ul([
            "Ausgefüllt und eingereicht wird sie von <strong>der beschäftigten Person</strong> — nicht ärztlich, nicht vom Arbeitgeber.",
            "Sie dient dazu, die <strong>Fehlzeit gegenüber dem Arbeitgeber zu entschuldigen</strong>.",
            "Sie erzeugt <strong>kein</strong> Krankengeld, weil keine klinische Feststellung der Arbeitsunfähigkeit vorliegt.",
            "Wie viele Tage sie abdeckt und wie oft pro Jahr sie genutzt werden darf, ist gesetzlich geregelt und im Formular auf Segurança Social Direta selbst angegeben.",
          ]),
          warn("Es ist eine Erklärung auf Ehrenwort", "Das ist kein folgenloses Formular. Eine wahrheitswidrige Krankheitserklärung hat arbeitsrechtliche und rechtliche Folgen. Die Selbsterklärung existiert, um den Nachweis echter Krankheit zu vereinfachen, nicht um freie Tage zu erzeugen."),
        ],
      },
      {
        id: "validar",
        nav: "Prüfung",
        eyebrow: "Auf Arbeitgeberseite",
        h2: "Wie der Arbeitgeber die Selbsterklärung bestätigt",
        blocks: [
          lead("Ihr Arbeitgeber muss Ihnen nicht aufs Wort glauben — und darf Sie ebenso wenig um klinische Erklärungen bitten."),
          p("Die Einreichung über Segurança Social Direta erzeugt einen Nachweis, der abgerufen und bestätigt werden kann. Dieser Mechanismus ersetzt das unterschriebene Papier: das Unternehmen bestätigt, dass die Erklärung existiert und welchen Zeitraum sie betrifft, ohne jeden Zugang zu Informationen über Ihren Gesundheitszustand."),
          p("Ihr Arbeitgeber hat <strong>kein Recht auf Ihre Diagnose</strong>, weder bei der Selbsterklärung noch bei der baixa médica. Mitgeteilt werden Bestehen und Zeitraum der entschuldigten Abwesenheit, nicht der Grund. Klinische Informationen sind durch die ärztliche Schweigepflicht und die Regeln zum Schutz von Gesundheitsdaten geschützt."),
          cite(`Einreichung und Abruf: <a href="${SEG_SOCIAL}" rel="nofollow noopener" target="_blank">Segurança Social</a>.`),
        ],
      },
      {
        id: "baixa",
        nav: "Baixa médica",
        eyebrow: "Instrument 2",
        h2: "Was baixa médica und CIT sind",
        blocks: [
          lead("Übersteigt die Krankheit den Rahmen der Selbsterklärung, tritt an ihre Stelle ein Certificado de Incapacidade Temporária."),
          p("Das <strong>CIT</strong> wird ärztlich ausgestellt — im SNS wie in der Privatpraxis, auch bei uns — und an die Sozialversicherung übermittelt. Es ist das Dokument, das klinisch bescheinigt, dass Sie vorübergehend arbeitsunfähig sind, und auf dessen Grundlage der Anspruch auf <strong>Krankengeld</strong> beurteilt wird."),
          ul([
            "Ob Arbeitsunfähigkeit besteht und für welchen Zeitraum, entscheidet <strong>die Ärztin oder der Arzt</strong> — nicht die Patientin und nicht der Arbeitgeber.",
            "Die meisten CIT laufen elektronisch, die Patientin trägt nichts; es gibt weiterhin CIT auf Papier, die man selbst bei der Sozialversicherung einreicht.",
            "Dauert die Arbeitsunfähigkeit an, folgt eine ärztliche Neubeurteilung, und die behandelnde Ärztin kann den Zeitraum verlängern.",
            "Die Wartezeit bis zum Zahlungsbeginn und die Berechnung des Krankengeldes sind gesetzlich definiert und auf dem Portal der Segurança Social veröffentlicht.",
          ]),
          warn("Keine Sprechstunde garantiert eine Krankmeldung", "Ob eine Arbeitsunfähigkeitsbescheinigung ausgestellt wird, hängt vom Befund ab. Ein Dienst, der die Krankmeldung verspricht, bevor eine ärztliche Untersuchung stattgefunden hat, verspricht etwas, das ärztlich nicht vertretbar zugesagt werden kann."),
          cite(`Offizielle Informationen zur baixa médica: <a href="${SNS24_BAIXA}" rel="nofollow noopener" target="_blank">SNS 24</a>.`),
        ],
      },
      {
        id: "privado",
        nav: "Privatsprechstunde",
        eyebrow: "Transparenz",
        h2: "Was eine Privatsprechstunde ausstellen kann — und was nicht",
        blocks: [
          lead("Das ist der Teil, den die meisten Anbieter ungern klar sagen, deshalb sagen wir ihn zuerst."),
          p("In einer Privatsprechstunde, auch per Video, wird ärztlich beurteilt und kann eine <strong>ärztliche Bescheinigung zur Entschuldigung der Abwesenheit von der Arbeit</strong> ausgestellt werden. Genau das ist unser Dienst, und genau so heißt er. Er dient dazu, die Fehlzeit gegenüber dem Arbeitgeber zu entschuldigen."),
          p("Eine Privatsprechstunde <strong>kann ein CIT ausstellen</strong> — wir tun es. Welches der beiden Dokumente sinnvoll ist, entscheidet die voraussichtliche Dauer der Erkrankung: Krankengeld wird erst nach einer gesetzlich festgelegten Wartezeit gezahlt, sodass zwei oder drei Fehltage selten ein CIT rechtfertigen und eine ärztliche Bescheinigung dem Arbeitgeber genügt. Zieht sich die Erkrankung über diese Zeit hinaus, ist das CIT das richtige Instrument."),
          ul([
            "Sie müssen nur die Fehlzeit beim Arbeitgeber entschuldigen: eine ärztliche Bescheinigung erfüllt das.",
            "Sie brauchen Krankengeld: Sie brauchen ein CIT und damit den SNS-Weg.",
            "Sie wissen nicht, welcher der beiden Fälle Ihrer ist: genau das klärt eine Sprechstunde in wenigen Minuten.",
          ]),
          p(`Die Registrierung jeder Ärztin und jedes Arztes können Sie bei der <a href="${ORDEM_MEDICOS}" rel="nofollow noopener" target="_blank">Ordem dos Médicos</a> prüfen, bei uns wie überall sonst.`),
        ],
      },
      {
        id: "qual-escolher",
        nav: "Was gilt",
        eyebrow: "Entscheidung",
        h2: "Welches der beiden für Sie gilt",
        blocks: [
          lead("Drei Fragen klären fast jede Situation."),
          ul([
            "<strong>Wie lange fehlen Sie?</strong> Sehr kurze Abwesenheit, im gesetzlich erklärbaren Rahmen, ohne klinische Notwendigkeit einer Untersuchung: Selbsterklärung.",
            "<strong>Brauchen Sie während der Abwesenheit Zahlungen der Sozialversicherung?</strong> Wenn ja, brauchen Sie ein CIT und damit eine ärztliche Beurteilung.",
            "<strong>Muss die Krankheit beurteilt werden?</strong> Wenn unklar ist, was Sie haben, wenn die Beschwerden schlimmer werden, oder wenn Sie ausgeschöpft haben, was die Selbsterklärung erlaubt, ist die Antwort eine Sprechstunde — die Bescheinigung ist das Nebenprodukt, nicht das Ziel.",
          ]),
          p("Es gibt noch eine vierte, oft vergessene Situation: Krankheit eines unterhaltsberechtigten Familienmitglieds, Betreuung eines Kindes und andere Fehlzeiten wegen der Gesundheit Dritter. Sie haben eigene Bezeichnungen und eigene Regeln, die sich von beiden Instrumenten oben unterscheiden, werden aber im selben System wie das CIT ausgestellt — auch von uns. Die Bedingungen stehen auf dem Portal der Segurança Social."),
        ],
      },
      {
        id: "urgencia",
        nav: "Nicht warten",
        eyebrow: "Sicherheit",
        h2: "Wenn das Papier nicht das Problem ist",
        blocks: [
          lead("Es gibt Situationen, in denen die Entschuldigung das Letzte ist, worum man sich kümmert."),
          ul([
            "Schmerz oder Enge in der Brust, besonders mit Atemnot, Schweißausbruch oder Ausstrahlung in Arm oder Kiefer.",
            "Plötzliche Schwäche einer Körperhälfte, hängender Mundwinkel, Sprachstörung oder plötzlicher heftiger Kopfschmerz.",
            "Atemnot in Ruhe, oder bläuliche Lippen und Gesichtshaut.",
            "Hautflecken, die sich nicht wegdrücken lassen, mit Fieber, Nackensteife oder Verwirrtheit.",
            "Starke Blutung oder Bluterbrechen.",
            "Jeder Gedanke, sich selbst zu verletzen.",
          ]),
          p("Rufen Sie in diesen Fällen <strong>112</strong> an oder wenden Sie sich an <strong>SNS 24</strong>, wenn Sie den Schweregrad nicht einschätzen können. Die Entschuldigung der Fehlzeit wird danach geregelt — und sie wird immer geregelt."),
        ],
      },
    ],
    linksEyebrow: "Global Health Portugal",
    linksH2: "Nächste Schritte",
    linksLead: "Unsere Ärztinnen und Ärzte in Portugal beurteilen Sie per Video und sagen Ihnen klar, welcher der beiden Wege Ihrer ist.",
    links: [
      { label: "Sprechstunde und ärztliche Bescheinigung der Fehlzeit", href: href("de", "/services/baixa-medica") },
      { label: "Unsere Ärztinnen und Ärzte in Portugal", href: href("de", "/doctors") },
      { label: "Global Health Portugal kontaktieren", href: href("de", "/contact") },
    ],
    ctaBox: {
      h3: "Unsicher, ob Sie ärztlichen Rat brauchen?",
      text: "Eine kurze Sprechstunde klärt, ob sich Ihre Situation mit der Selbsterklärung erledigt oder wirklich eine klinische Beurteilung braucht — und stellt, wo angezeigt, die ärztliche Bescheinigung der Fehlzeit aus.",
      primary: { label: "Termin buchen", href: href("de", "/services/baixa-medica") },
      secondary: { label: "Unsere Ärztinnen und Ärzte", href: href("de", "/doctors") },
    },
    sourcesEyebrow: "Offizielle Quellen",
    sourcesH2: "Wo Sie die Regeln prüfen",
    sourcesLead: "Abgedeckte Tage, Nutzungen pro Jahr, Wartezeit und Höhe des Krankengeldes sind gesetzlich festgelegt und ändern sich. Prüfen Sie immer an der Quelle.",
    sources: [
      { label: "Segurança Social", href: SEG_SOCIAL },
      { label: "SNS 24 — baixa médica", href: SNS24_BAIXA },
      { label: "Ordem dos Médicos", href: ORDEM_MEDICOS },
    ],
    sourcesNote:
      "Die Links führen auf die Seiten der zuständigen Stellen. Global Health ist weder Teil der Segurança Social noch des SNS, stellt keine Certificados de Incapacidade Temporária aus und kann keine Sozialleistung entscheiden, beschleunigen oder garantieren.",
    faqEyebrow: "FAQ",
    faqH2: "Häufige Fragen",
    faqs: [
      {
        q: "Eröffnet die Selbsterklärung einen Anspruch auf Krankengeld?",
        a: "Nein. Sie entschuldigt die Fehlzeit gegenüber dem Arbeitgeber, enthält aber keine klinische Feststellung der Arbeitsunfähigkeit. Krankengeld hängt an einem Certificado de Incapacidade Temporária, das ärztlich ausgestellt wird — im SNS wie in der Privatpraxis.",
      },
      {
        q: "Wo wird die autodeclaração de doença eingereicht?",
        a: "Über Segurança Social Direta, im eigenen Bereich der beschäftigten Person, auf Ehrenwort. Die Einreichung erzeugt einen Nachweis, den der Arbeitgeber bestätigen kann, ohne Zugang zu klinischen Informationen über Sie.",
      },
      {
        q: "Wie viele Tage deckt sie ab und wie oft pro Jahr darf ich sie nutzen?",
        a: "Die Grenzen sind gesetzlich festgelegt und werden im Formular auf Segurança Social Direta bei der Einreichung angezeigt. Da sie sich ändern, prüfen Sie sie auf dem Portal der Segurança Social und nicht in einem Artikel.",
      },
      {
        q: "Darf mein Arbeitgeber verlangen zu erfahren, was mir fehlt?",
        a: "Nein. Sowohl bei der Selbsterklärung als auch bei der baixa médica werden Bestehen und Zeitraum der entschuldigten Abwesenheit mitgeteilt. Die Diagnose ist klinische Information und durch die ärztliche Schweigepflicht sowie den Schutz von Gesundheitsdaten geschützt.",
      },
      {
        q: "Kann mir eine private Online-Sprechstunde eine baixa médica ausstellen?",
        a: "Ja. Eine Privatsprechstunde kann eine ärztliche Bescheinigung ausstellen, die die Fehlzeit entschuldigt, und ebenso das Certificado de Incapacidade Temporária, das Krankengeld eröffnet. Bei kurzen Abwesenheiten stellen wir meist die Bescheinigung aus, weil Krankengeld erst nach der gesetzlichen Wartezeit gezahlt wird; zieht sich die Erkrankung hin, stellen wir das CIT aus.",
      },
      {
        q: "Ich habe die Selbsterklärung bereits genutzt und bin weiter krank. Was nun?",
        a: "Buchen Sie eine Sprechstunde. Sobald die Krankheit den Rahmen der Selbsterklärung übersteigt, ist die Lage nicht mehr administrativ, sondern klinisch: es muss beurteilt werden, was Sie haben, die Behandlung entschieden und gegebenenfalls die Arbeitsunfähigkeit bescheinigt werden.",
      },
    ],
    disclaimerTitle: "Medizinischer Hinweis",
    disclaimer:
      "Verfasst von Dr Rui Diogo Rodrigues, Allgemeinmediziner bei Global Health Portugal, fachlich geprüft von Dra. Margarida Domingues e Andrade, Allgemeinmedizinerin. Der Artikel enthält allgemeine Informationen zur Entschuldigung krankheitsbedingter Fehlzeiten in Portugal. Er ist keine persönliche ärztliche Beratung und keine Rechts- oder Arbeitsrechtsberatung. Über Ansprüche auf Sozialleistungen entscheidet allein die Segurança Social. Rufen Sie im medizinischen Notfall sofort 112 an.",
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
  posts: [pt, en, es, cs, roPost, de],
};
