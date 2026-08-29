/**
 * Ireland — article 2 of 2.
 *
 * Target keyword: "blood test dublin" — 1,600/mo, KD 0, informational,
 * CPC €1.61, competition 0.72 (OpenSEO / DataForSEO, location 2372,
 * language en, 2026-08-04). Supporting: "blood tests ireland" 390 KD 0,
 * "private blood test dublin" KD 0, "private blood test ireland" KD 0,
 * "vitamin d test ireland" 40 KD 0, "thyroid test ireland" KD 0.
 *
 * Why it can rank: KD 0 with a local pack, and page 1 is entirely private
 * phlebotomy providers selling panels (liffeymedical.ie, thehealthlab.ie,
 * bloodworks.ie, fola.care, dbt-bloodtest.ie, mccabespharmacy.com). Every
 * result is a product page. Nothing on page 1 is a doctor explaining which
 * tests are worth doing and what a result actually means — which is both the
 * gap and the only thing a clinic with real GPs can say credibly.
 *
 * Search Console: "online lab test consultations" 123 impressions at position
 * 62 on /ireland/en/lab-tests — proven relevance, no depth behind it.
 *
 * No prices anywhere. Panel pricing is set per provider and ours is set in the
 * admin, so quoting any figure here would go stale. No reference ranges
 * either: they are laboratory-specific and printing them invites self-diagnosis.
 */
import { cite, lead, p, renderArticle, ul, warn, type Article } from "./template.js";
import type { LocalePost, PostSet } from "./types.js";

const HSE_BLOOD_TESTS = "https://www2.hse.ie/conditions/blood-tests/";
const MEDICAL_COUNCIL = "https://www.medicalcouncil.ie/public-information/check-the-register/";

const href = (lang: string, path: string) => `https://www.myglobalhealth.online/ireland/${lang}${path}`;

const en: LocalePost = {
  locale: "EN",
  slug: "blood-tests-dublin-what-to-know",
  title: "Blood Tests in Dublin: Where to Go, What to Ask For, and How to Read the Result",
  excerpt:
    "Where you can have bloods taken in Dublin, why the referral matters more than the panel, what the common tests actually measure, and why a single out-of-range number is rarely the answer on its own.",
  seoTitle: "Blood Tests in Dublin: A GP's Guide (2026)",
  seoDescription:
    "Where to get a blood test in Dublin, whether you need a GP referral, what common panels measure, fasting rules, and what an out-of-range result means.",
  category: "General Practice",
  article: {
    lang: "en-IE",
    tagline: "Medicine Anytime, Anywhere",
    categoryLabel: "General Practice",
    categoryHref: href("en", "/blog"),
    eyebrow: "Ireland · Diagnostics guide",
    h1: "Blood Tests in Dublin",
    deck: "Getting blood taken is the easy part. Choosing the right test, and knowing what the number means afterwards, is the part that needs a doctor.",
    intro:
      "In Dublin you can have blood taken at your <strong>GP practice</strong>, at a <strong>hospital phlebotomy service</strong> if you have been referred, or at a <strong>private clinic or laboratory</strong> that takes direct bookings. What differs between them is not the needle — it is whether anyone decided which tests you needed, and whether anyone will interpret the result in the context of your symptoms. A panel bought off a menu can reassure you about something you were never at risk of while missing the thing that brought you in.",
    facts: ["GP, hospital or private clinic", "The referral matters more than the panel", "Results need clinical context"],
    primaryCta: { label: "Book a consultation and referral", href: href("en", "/services/referral-and-investigations") },
    secondaryCta: { label: "See our lab tests", href: href("en", "/lab-tests") },
    panelChip: "What this guide covers",
    panelParas: [
      "The three routes to getting bloods taken in Dublin, and what each one does and does not include.",
      "What the common panels actually measure, in plain terms — full blood count, kidney and liver profiles, thyroid, lipids, HbA1c, iron studies, vitamin D and inflammatory markers.",
      "No prices and no reference ranges appear in this article. Prices are set per provider, and ranges are specific to the laboratory that ran your sample — yours are printed on your own report.",
    ],
    author: { initials: "TF", name: "Dr Tiago Miguel Figueira", line: "IMC 523449 · Clinical Director, Global Health" },
    reviewLine: "Clinically reviewed by Dr Ahmed Maklad, General Practitioner, Global Health Ireland.",
    navLabel: "In this article",
    sections: [
      {
        id: "where",
        nav: "Where to go",
        eyebrow: "Access",
        h2: "Where you can have bloods taken in Dublin",
        blocks: [
          lead("Three routes, and they are not interchangeable — they differ in who decides what is tested and who explains the result."),
          ul([
            "<strong>Your GP practice.</strong> The doctor who knows your history decides the tests, and the result comes back to the person who ordered it. This is the route that produces the fewest orphaned numbers.",
            "<strong>Hospital phlebotomy.</strong> Used when a hospital clinician has requested specific bloods, often before or after an outpatient appointment. You generally need the request to attend.",
            "<strong>A private clinic or laboratory.</strong> Direct booking, quick appointments, wide menus of panels. Convenient, and genuinely useful when you know what you need — but you are choosing the tests yourself unless a doctor is involved.",
          ]),
          p("There is also home phlebotomy, where a nurse or phlebotomist attends you. The same principle applies: the collection is straightforward, and the clinical value comes from what was requested and who reads it."),
          p(`If you want the middle ground — a doctor deciding what to test, then a lab appointment — that is what a consultation and referral is for. Ours is <a href="${href("en", "/services/referral-and-investigations")}">specialist referral and diagnostic investigations</a>, and the panels we can arrange are listed under <a href="${href("en", "/lab-tests")}">lab tests</a>.`),
        ],
      },
      {
        id: "referral",
        nav: "Do you need a referral",
        eyebrow: "The real question",
        h2: "Do you need a GP referral for a private blood test?",
        blocks: [
          lead("For most direct-booking private panels, no. Whether you should have one is a different question."),
          p("Private providers in Dublin will generally take your booking without a referral. The reason to involve a doctor anyway is not gatekeeping — it is that the choice of test <em>is</em> the diagnosis in progress. Tiredness, for example, is not one test. Depending on your age, your history, your medication and what else you have noticed, it might point at iron studies, thyroid function, coeliac screening, glucose handling, kidney function, or none of those."),
          ul([
            "A doctor narrows a symptom to the tests that can actually change what happens next.",
            "A doctor knows which of your medications distort which results, and when in the day or cycle a sample should be taken.",
            "A doctor is who acts on an abnormal result. A result with nobody responsible for it is the most common failure in direct-to-consumer testing.",
          ]),
          warn("More tests is not more information", "Very broad panels reliably throw up mildly out-of-range values in perfectly healthy people. Each one then needs explaining, repeating, or investigating. Breadth without a clinical question generates anxiety and repeat appointments, not answers."),
        ],
      },
      {
        id: "common-tests",
        nav: "Common tests",
        eyebrow: "Plain English",
        h2: "What the common tests actually measure",
        blocks: [
          lead("These are the panels you will see on nearly every menu in the city, and what each one is really for."),
          ul([
            "<strong>Full blood count (FBC).</strong> The cells themselves — red cells, white cells, platelets. Used to look for anaemia, infection and clotting problems.",
            "<strong>Urea and electrolytes (U&amp;E).</strong> Kidney function and the salt and water balance the kidneys control.",
            "<strong>Liver function tests (LFTs).</strong> A group of enzymes and proteins that shift when the liver or bile ducts are irritated, obstructed or inflamed.",
            "<strong>Thyroid function (TSH, and sometimes T4).</strong> Whether the thyroid is running fast, slow, or normally.",
            "<strong>Lipid profile.</strong> Cholesterol fractions and triglycerides, used for cardiovascular risk rather than for how you feel today.",
            "<strong>HbA1c.</strong> An average of your blood glucose over the preceding months — used to diagnose and monitor diabetes.",
            "<strong>Ferritin and iron studies.</strong> Iron stores, which explain a large share of unexplained fatigue, particularly in menstruating women.",
            "<strong>Vitamin D.</strong> Relevant in Ireland for straightforward geographical reasons, and worth testing when there is a reason to.",
            "<strong>CRP.</strong> A general marker of inflammation. It tells you something is going on; it does not tell you what.",
          ]),
          p("Notice what none of these do: none of them diagnose a disease by themselves. They narrow possibilities. The narrowing only works if someone knows what you came in with."),
          cite(`General patient information on blood tests: <a href="${HSE_BLOOD_TESTS}" rel="nofollow noopener" target="_blank">HSE</a>.`),
        ],
      },
      {
        id: "preparation",
        nav: "How to prepare",
        eyebrow: "Practical",
        h2: "Fasting, timing and what to bring",
        blocks: [
          lead("Most bloods need no preparation at all. A few need quite specific preparation, and getting it wrong means repeating the sample."),
          ul([
            "<strong>Fasting</strong> is required for some tests and irrelevant for others. Do not fast speculatively — ask the requesting doctor or the clinic whether your specific tests need it, and follow that.",
            "<strong>Drink water</strong> unless told otherwise. Well-hydrated veins make the draw faster and reduce the chance of a second attempt.",
            "<strong>Timing matters for some hormones.</strong> Certain results vary through the day or across the menstrual cycle, and the request should say when to attend.",
            "<strong>Bring your medication list</strong>, including supplements. Biotin in particular can interfere with some laboratory assays, and high-dose supplements can distort exactly the level you are trying to measure.",
            "<strong>Bring photo ID</strong> and your details as they appear on the request, so the sample is labelled to the right person.",
          ]),
          p("If you have fainted during a blood draw before, say so before the needle rather than after. It is common, it is manageable, and being lain down beforehand is far better than being caught."),
        ],
      },
      {
        id: "results",
        nav: "Reading results",
        eyebrow: "Interpretation",
        h2: "Why one out-of-range number rarely means what it looks like",
        blocks: [
          lead("Reference ranges are not the boundary between healthy and ill. They describe where most results in a reference population sit."),
          p("A value slightly outside the range printed on your report can be entirely normal for you. A value inside the range can still be wrong for you — a ferritin at the bottom of range in a woman with heavy periods and exhaustion is a finding, even though nothing is flagged. This is why the report and the interpretation are different things."),
          ul([
            "Ranges are <strong>specific to the laboratory</strong> that ran the sample. Comparing your number to one you found online, or to a friend's report from another lab, is not a like-for-like comparison.",
            "<strong>Trend beats snapshot.</strong> Two results months apart usually say more than one result in isolation.",
            "<strong>Recent illness, intense exercise, alcohol, dehydration and some supplements</strong> all move results without any disease being present.",
            "An unexpected abnormal result is often repeated before anything is concluded from it. That is good practice, not indecision.",
          ]),
          warn("Do not change treatment on a result alone", "Never start, stop or adjust a prescribed medicine because of a number on a report. Bring the report to the doctor looking after that medicine.",
          ),
        ],
      },
      {
        id: "red-flags",
        nav: "When not to wait",
        eyebrow: "Safety",
        h2: "When a blood test is the wrong next step",
        blocks: [
          lead("Some presentations need assessment now, not a sample and a wait for results."),
          ul([
            "Chest pain or pressure, particularly with breathlessness, sweating, or pain into the arm or jaw.",
            "Sudden weakness, facial droop, difficulty speaking, or a sudden severe headache.",
            "Difficulty breathing at rest.",
            "A rash that does not fade under pressure, especially with fever, neck stiffness or confusion.",
            "Heavy bleeding, or vomiting blood or material that looks like coffee grounds.",
            "Unexplained weight loss, drenching night sweats, or a lump that is growing — these need to be seen and examined, not simply screened.",
          ]),
          p("For the first four, call <strong>112</strong> or <strong>999</strong>, or go to your nearest Emergency Department. For the others, book an assessment rather than a panel — the examination is what directs the testing."),
        ],
      },
    ],
    linksEyebrow: "Global Health Ireland",
    linksH2: "Where to go from here",
    linksLead: "Our Irish GPs consult by video, decide which tests are worth doing in your case, and go through the report with you afterwards.",
    links: [
      { label: "Consultation, referral and diagnostic investigations", href: href("en", "/services/referral-and-investigations") },
      { label: "Lab tests available through Global Health Ireland", href: href("en", "/lab-tests") },
      { label: "Meet the doctors registered with our Irish service", href: href("en", "/doctors") },
      { label: "Contact Global Health Ireland", href: href("en", "/contact") },
    ],
    ctaBox: {
      h3: "Have a doctor choose the tests",
      text: "A short video consultation turns a symptom into a specific request, and gives you someone responsible for the result when it comes back.",
      primary: { label: "Book a consultation", href: href("en", "/services/referral-and-investigations") },
      secondary: { label: "See our doctors", href: href("en", "/doctors") },
    },
    sourcesEyebrow: "Official sources",
    sourcesH2: "Where to check things independently",
    sourcesLead: "Patient information on blood tests, and how to confirm that whoever interprets your result is registered to practise in Ireland.",
    sources: [
      { label: "HSE — blood tests", href: HSE_BLOOD_TESTS },
      { label: "Medical Council — check the register", href: MEDICAL_COUNCIL },
    ],
    sourcesNote: "Links open on the issuing body's own website. Reference ranges quoted on your own laboratory report always take precedence over any general information, including this article.",
    faqEyebrow: "FAQ",
    faqH2: "Common questions",
    faqs: [
      {
        q: "Where can I get a blood test in Dublin?",
        a: "At your GP practice, at a hospital phlebotomy service if a hospital clinician has requested it, or at a private clinic or laboratory that takes direct bookings. Home phlebotomy is also available. The difference between them is who decides which tests are done and who interprets the result, not the draw itself.",
      },
      {
        q: "Do I need a GP referral for a private blood test?",
        a: "Usually not — most private providers accept direct bookings. Involving a doctor is still worth it, because choosing the right tests for your symptoms is part of the diagnosis, and because an abnormal result needs someone clinically responsible for acting on it.",
      },
      {
        q: "Do I need to fast before a blood test?",
        a: "It depends entirely on which tests are being done. Some require fasting, most do not. Ask the doctor who requested the tests, or the clinic taking the sample, rather than fasting speculatively. Drink water unless you have been told otherwise.",
      },
      {
        q: "How long do blood test results take?",
        a: "It varies by test and by laboratory — routine panels are typically quick, while specialised assays are sent on and take longer. The clinic taking your sample can tell you the expected turnaround for the specific tests you are having.",
      },
      {
        q: "What does it mean if one result is outside the normal range?",
        a: "Often very little on its own. Reference ranges describe where most results in a reference population fall, they are specific to the laboratory that ran your sample, and recent illness, exercise, dehydration or supplements can move values without any disease. An unexpected abnormal result is usually repeated before conclusions are drawn.",
      },
      {
        q: "Can I get a blood test without seeing a doctor at all?",
        a: "Yes, through direct-booking private providers. The trade-off is that you are selecting the panel yourself and there is nobody clinically responsible for the report. If the reason you want testing is a symptom rather than curiosity, a consultation first will usually produce a more useful set of tests.",
      },
    ],
    disclaimerTitle: "Medical Disclaimer",
    disclaimer:
      "Written by Dr Tiago Miguel Figueira (IMC 523449), Clinical Director at Global Health, and clinically reviewed by Dr Ahmed Maklad, General Practitioner. This article is general information about laboratory testing in Ireland and is not personalised medical advice. It does not replace assessment by a doctor who knows your history, and it must not be used to interpret your own report or to change any prescribed treatment. If you are experiencing a medical emergency, call 999 or 112 immediately.",
  } satisfies Article,
};

const pt: LocalePost = {
  locale: "PT",
  slug: "analises-de-sangue-dublin",
  title: "Análises de sangue em Dublin: onde fazer, o que pedir e como ler o resultado",
  excerpt:
    "Onde pode fazer análises em Dublin, por que razão a requisição importa mais do que o painel, o que medem realmente as análises mais comuns e por que um único valor fora do intervalo raramente é a resposta.",
  seoTitle: "Análises de sangue em Dublin: guia de um médico",
  seoDescription:
    "Onde fazer análises de sangue em Dublin, se precisa de requisição médica, o que medem os painéis mais comuns, o jejum e o que significa um valor alterado.",
  category: "Clínica Geral",
  article: {
    lang: "pt-PT",
    tagline: "Medicina a qualquer hora, em qualquer lugar",
    categoryLabel: "Clínica Geral",
    categoryHref: href("pt", "/blog"),
    eyebrow: "Irlanda · Guia de diagnóstico",
    h1: "Análises de sangue em Dublin",
    deck: "Colher sangue é a parte fácil. Escolher a análise certa, e saber o que o número quer dizer depois, é a parte que precisa de médico.",
    intro:
      "Em Dublin pode fazer análises no <strong>consultório do seu médico de família</strong>, num <strong>serviço hospitalar de colheitas</strong> se tiver sido referenciado, ou numa <strong>clínica ou laboratório privado</strong> com marcação direta. O que difere entre eles não é a agulha — é se alguém decidiu quais as análises de que precisa e se alguém vai interpretar o resultado à luz dos seus sintomas. Um painel comprado a partir de um menu pode tranquilizá-lo sobre algo que nunca esteve em causa e falhar exatamente aquilo que o levou a procurar ajuda.",
    facts: ["Médico de família, hospital ou privado", "A requisição importa mais do que o painel", "Resultados precisam de contexto clínico"],
    primaryCta: { label: "Marcar consulta e requisição", href: href("pt", "/services/referral-and-investigations") },
    secondaryCta: { label: "Ver as nossas análises", href: href("pt", "/lab-tests") },
    panelChip: "O que este guia cobre",
    panelParas: [
      "As três vias para fazer análises em Dublin, e o que cada uma inclui e não inclui.",
      "O que medem, em linguagem simples, os painéis mais comuns — hemograma, função renal e hepática, tiroide, lípidos, HbA1c, estudo do ferro, vitamina D e marcadores inflamatórios.",
      "Não há preços nem intervalos de referência neste artigo. Os preços são definidos por cada prestador e os intervalos são específicos do laboratório que processou a sua amostra — os seus estão impressos no seu próprio relatório.",
    ],
    author: { initials: "TF", name: "Dr Tiago Miguel Figueira", line: "IMC 523449 · Diretor Clínico, Global Health" },
    reviewLine: "Revisto clinicamente pelo Dr Ahmed Maklad, médico de clínica geral, Global Health Irlanda.",
    navLabel: "Neste artigo",
    sections: [
      {
        id: "where",
        nav: "Onde fazer",
        eyebrow: "Acesso",
        h2: "Onde pode fazer análises em Dublin",
        blocks: [
          lead("Três vias, e não são intermutáveis — diferem em quem decide o que se analisa e quem explica o resultado."),
          ul([
            "<strong>O seu consultório de medicina geral.</strong> O médico que conhece a sua história decide as análises, e o resultado volta para quem as pediu. É a via que produz menos números órfãos.",
            "<strong>Colheitas hospitalares.</strong> Usadas quando um clínico do hospital pediu análises específicas, muitas vezes antes ou depois de uma consulta externa. Em regra precisa da requisição para ser atendido.",
            "<strong>Clínica ou laboratório privado.</strong> Marcação direta, horários rápidos, menus largos de painéis. É conveniente e genuinamente útil quando sabe o que precisa — mas é você quem escolhe as análises, a não ser que haja um médico envolvido.",
          ]),
          p("Existe ainda a colheita ao domicílio, feita por enfermeiro ou flebotomista. O princípio é o mesmo: a colheita é simples, e o valor clínico vem do que foi pedido e de quem o lê."),
          p(`Se quer o meio-termo — um médico a decidir o que analisar e depois uma marcação no laboratório — é para isso que serve uma consulta com requisição. A nossa é <a href="${href("pt", "/services/referral-and-investigations")}">referenciação e exames complementares de diagnóstico</a>, e os painéis que podemos organizar estão em <a href="${href("pt", "/lab-tests")}">análises</a>.`),
        ],
      },
      {
        id: "referral",
        nav: "Precisa de requisição?",
        eyebrow: "A verdadeira pergunta",
        h2: "Precisa de requisição médica para análises privadas?",
        blocks: [
          lead("Para a maioria dos painéis privados de marcação direta, não. Se <em>deve</em> ter uma é outra pergunta."),
          p("Os prestadores privados em Dublin aceitam em regra a sua marcação sem requisição. A razão para envolver mesmo assim um médico não é burocracia — é que a escolha da análise <em>é</em> o diagnóstico em curso. Cansaço, por exemplo, não é uma análise. Consoante a idade, a história, a medicação e o resto do quadro, pode apontar para estudo do ferro, função tiroideia, rastreio de doença celíaca, metabolismo da glicose, função renal, ou para nenhum destes."),
          ul([
            "Um médico reduz um sintoma às análises que podem efetivamente mudar o que acontece a seguir.",
            "Um médico sabe quais dos seus medicamentos distorcem que resultados, e a que hora do dia ou do ciclo deve ser colhida a amostra.",
            "É um médico quem atua perante um resultado alterado. Um resultado sem ninguém responsável por ele é a falha mais comum nas análises vendidas diretamente ao consumidor.",
          ]),
          warn("Mais análises não é mais informação", "Painéis muito largos produzem, de forma previsível, valores ligeiramente fora do intervalo em pessoas perfeitamente saudáveis. Cada um passa depois a exigir explicação, repetição ou investigação. Amplitude sem pergunta clínica gera ansiedade e consultas repetidas, não respostas."),
        ],
      },
      {
        id: "common-tests",
        nav: "Análises comuns",
        eyebrow: "Em linguagem simples",
        h2: "O que medem realmente as análises mais comuns",
        blocks: [
          lead("São os painéis que verá em quase todos os menus da cidade, e para que servem de facto."),
          ul([
            "<strong>Hemograma completo.</strong> As próprias células — glóbulos vermelhos, glóbulos brancos, plaquetas. Usado para procurar anemia, infeção e problemas de coagulação.",
            "<strong>Ureia e eletrólitos.</strong> Função renal e o equilíbrio de sais e água que o rim controla.",
            "<strong>Provas de função hepática.</strong> Um conjunto de enzimas e proteínas que se alteram quando o fígado ou as vias biliares estão irritados, obstruídos ou inflamados.",
            "<strong>Função tiroideia (TSH e, por vezes, T4).</strong> Se a tiroide está a funcionar depressa, devagar, ou normalmente.",
            "<strong>Perfil lipídico.</strong> Frações do colesterol e triglicéridos, usados para risco cardiovascular e não para explicar como se sente hoje.",
            "<strong>HbA1c.</strong> Uma média da sua glicemia nos meses anteriores — usada para diagnosticar e monitorizar a diabetes.",
            "<strong>Ferritina e estudo do ferro.</strong> As reservas de ferro, que explicam boa parte do cansaço sem causa aparente, sobretudo em mulheres com menstruações.",
            "<strong>Vitamina D.</strong> Relevante na Irlanda por razões geográficas óbvias, e a analisar quando há motivo para isso.",
            "<strong>PCR.</strong> Um marcador geral de inflamação. Diz-lhe que se passa alguma coisa; não diz o quê.",
          ]),
          p("Repare no que nenhuma delas faz: nenhuma diagnostica uma doença por si só. Reduzem possibilidades. E essa redução só funciona se alguém souber com o que é que você chegou."),
          cite(`Informação geral ao doente sobre análises: <a href="${HSE_BLOOD_TESTS}" rel="nofollow noopener" target="_blank">HSE</a>.`),
        ],
      },
      {
        id: "preparation",
        nav: "Como preparar",
        eyebrow: "Prático",
        h2: "Jejum, horário e o que levar",
        blocks: [
          lead("A maioria das análises não exige preparação nenhuma. Algumas exigem preparação muito específica, e falhá-la significa repetir a colheita."),
          ul([
            "<strong>O jejum</strong> é necessário para algumas análises e irrelevante para outras. Não faça jejum por precaução — pergunte ao médico que pediu, ou à clínica, se as suas análises o exigem, e siga essa indicação.",
            "<strong>Beba água</strong> salvo indicação em contrário. Veias bem hidratadas tornam a colheita mais rápida e reduzem a hipótese de uma segunda tentativa.",
            "<strong>O horário conta para algumas hormonas.</strong> Certos resultados variam ao longo do dia ou do ciclo menstrual, e a requisição deve indicar quando comparecer.",
            "<strong>Leve a lista da medicação</strong>, incluindo suplementos. A biotina, em particular, pode interferir com alguns doseamentos, e suplementos em dose alta distorcem exatamente o valor que se quer medir.",
            "<strong>Leve documento de identificação</strong> e os seus dados tal como constam da requisição, para que a amostra seja identificada à pessoa certa.",
          ]),
          p("Se já desmaiou numa colheita, diga-o antes da agulha e não depois. É frequente, é gerível, e estar deitado à partida é muito melhor do que ser amparado."),
        ],
      },
      {
        id: "results",
        nav: "Ler resultados",
        eyebrow: "Interpretação",
        h2: "Porque um valor fora do intervalo raramente significa o que parece",
        blocks: [
          lead("Os intervalos de referência não são a fronteira entre saudável e doente. Descrevem onde se situa a maioria dos resultados numa população de referência."),
          p("Um valor ligeiramente fora do intervalo impresso no seu relatório pode ser perfeitamente normal para si. E um valor dentro do intervalo pode estar errado para si — uma ferritina no limite inferior numa mulher com menstruações abundantes e exaustão é um achado, mesmo que nada esteja assinalado. É por isso que o relatório e a interpretação são coisas diferentes."),
          ul([
            "Os intervalos são <strong>específicos do laboratório</strong> que processou a amostra. Comparar o seu número com um que encontrou online, ou com o relatório de um amigo de outro laboratório, não é comparação equivalente.",
            "<strong>A tendência vale mais do que a fotografia.</strong> Dois resultados separados por meses dizem em regra mais do que um resultado isolado.",
            "<strong>Doença recente, exercício intenso, álcool, desidratação e alguns suplementos</strong> alteram resultados sem que exista qualquer doença.",
            "Um resultado alterado inesperado é muitas vezes repetido antes de se concluir seja o que for. Isso é boa prática, não indecisão.",
          ]),
          warn("Não altere tratamento com base num resultado", "Nunca inicie, suspenda ou ajuste um medicamento prescrito por causa de um número num relatório. Leve o relatório ao médico que segue esse medicamento.",
          ),
        ],
      },
      {
        id: "red-flags",
        nav: "Quando não esperar",
        eyebrow: "Segurança",
        h2: "Quando uma análise é o passo errado",
        blocks: [
          lead("Há quadros que precisam de avaliação agora, e não de uma colheita e da espera pelo resultado."),
          ul([
            "Dor ou aperto no peito, sobretudo com falta de ar, suores, ou dor a irradiar para o braço ou mandíbula.",
            "Fraqueza súbita, desvio da face, dificuldade em falar, ou dor de cabeça súbita e intensa.",
            "Dificuldade respiratória em repouso.",
            "Manchas na pele que não desaparecem à pressão, sobretudo com febre, rigidez da nuca ou confusão.",
            "Hemorragia abundante, ou vómitos com sangue ou com aspeto de borras de café.",
            "Perda de peso inexplicada, suores noturnos profusos, ou um nódulo que está a crescer — estes precisam de ser observados e examinados, não apenas rastreados.",
          ]),
          p("Nos primeiros quatro casos, ligue <strong>112</strong> ou <strong>999</strong>, ou dirija-se ao serviço de urgência mais próximo. Nos restantes, marque uma avaliação em vez de um painel — é o exame que orienta as análises."),
        ],
      },
    ],
    linksEyebrow: "Global Health Irlanda",
    linksH2: "Passos seguintes",
    linksLead: "Os nossos médicos na Irlanda atendem por vídeo, decidem que análises valem a pena no seu caso e revêem depois o relatório consigo.",
    links: [
      { label: "Consulta, referenciação e exames de diagnóstico", href: href("pt", "/services/referral-and-investigations") },
      { label: "Análises disponíveis através da Global Health Irlanda", href: href("pt", "/lab-tests") },
      { label: "Conheça os médicos inscritos do nosso serviço irlandês", href: href("pt", "/doctors") },
      { label: "Contactar a Global Health Irlanda", href: href("pt", "/contact") },
    ],
    ctaBox: {
      h3: "Deixe um médico escolher as análises",
      text: "Uma consulta curta por vídeo transforma um sintoma numa requisição concreta, e dá-lhe alguém responsável pelo resultado quando ele chegar.",
      primary: { label: "Marcar consulta", href: href("pt", "/services/referral-and-investigations") },
      secondary: { label: "Ver os nossos médicos", href: href("pt", "/doctors") },
    },
    sourcesEyebrow: "Fontes oficiais",
    sourcesH2: "Onde confirmar de forma independente",
    sourcesLead: "Informação ao doente sobre análises e como confirmar que quem interpreta o seu resultado está inscrito para exercer na Irlanda.",
    sources: [
      { label: "HSE — análises de sangue", href: HSE_BLOOD_TESTS },
      { label: "Medical Council — consultar o registo", href: MEDICAL_COUNCIL },
    ],
    sourcesNote: "As ligações abrem no site da entidade emissora. Os intervalos de referência indicados no seu próprio relatório laboratorial prevalecem sempre sobre qualquer informação geral, incluindo este artigo.",
    faqEyebrow: "FAQ",
    faqH2: "Perguntas frequentes",
    faqs: [
      {
        q: "Onde posso fazer análises de sangue em Dublin?",
        a: "No consultório do seu médico de família, num serviço hospitalar de colheitas se um clínico do hospital as tiver pedido, ou numa clínica ou laboratório privado com marcação direta. Há também colheita ao domicílio. A diferença entre eles está em quem decide as análises e quem interpreta o resultado, não na colheita.",
      },
      {
        q: "Preciso de requisição médica para análises privadas?",
        a: "Em regra não — a maioria dos prestadores privados aceita marcação direta. Envolver um médico continua a valer a pena, porque escolher as análises certas para os seus sintomas faz parte do diagnóstico e porque um resultado alterado precisa de alguém clinicamente responsável por agir sobre ele.",
      },
      {
        q: "Tenho de estar em jejum?",
        a: "Depende inteiramente das análises. Algumas exigem jejum, a maioria não. Pergunte ao médico que as pediu, ou à clínica que faz a colheita, em vez de fazer jejum por precaução. Beba água, salvo indicação em contrário.",
      },
      {
        q: "Quanto tempo demoram os resultados?",
        a: "Varia com a análise e com o laboratório — os painéis de rotina são normalmente rápidos, enquanto doseamentos especializados são enviados para fora e demoram mais. A clínica que faz a colheita pode indicar-lhe o prazo esperado para as suas análises concretas.",
      },
      {
        q: "O que significa ter um valor fora do intervalo normal?",
        a: "Muitas vezes, pouco por si só. Os intervalos descrevem onde se situa a maioria dos resultados numa população de referência, são específicos do laboratório que processou a amostra, e doença recente, exercício, desidratação ou suplementos podem alterar valores sem existir doença. Um valor alterado inesperado é habitualmente repetido antes de se tirar conclusões.",
      },
      {
        q: "Posso fazer análises sem ver nenhum médico?",
        a: "Sim, através de prestadores privados com marcação direta. A contrapartida é que é você a selecionar o painel e não há ninguém clinicamente responsável pelo relatório. Se o motivo é um sintoma e não curiosidade, uma consulta prévia produz em regra um conjunto de análises mais útil.",
      },
    ],
    disclaimerTitle: "Aviso Médico",
    disclaimer:
      "Escrito pelo Dr Tiago Miguel Figueira (IMC 523449), Diretor Clínico da Global Health, e revisto clinicamente pelo Dr Ahmed Maklad, médico de clínica geral. Este artigo contém informação geral sobre análises laboratoriais na Irlanda e não constitui aconselhamento médico personalizado. Não substitui a avaliação por um médico que conheça a sua história e não deve ser usado para interpretar o seu próprio relatório nem para alterar qualquer tratamento prescrito. Em caso de emergência médica, ligue imediatamente 999 ou 112.",
  } satisfies Article,
};

const es: LocalePost = {
  locale: "ES",
  slug: "analisis-de-sangre-dublin",
  title: "Análisis de sangre en Dublín: dónde hacerlos, qué pedir y cómo leer el resultado",
  excerpt:
    "Dónde puede hacerse análisis en Dublín, por qué la petición importa más que el panel, qué miden realmente las pruebas más habituales y por qué un único valor fuera de rango casi nunca es la respuesta.",
  seoTitle: "Análisis de sangre en Dublín: guía de un médico",
  seoDescription:
    "Dónde hacerse un análisis de sangre en Dublín, si hace falta petición médica, qué miden los paneles habituales, el ayuno y qué significa un valor alterado.",
  category: "Medicina General",
  article: {
    lang: "es-ES",
    tagline: "Medicina en cualquier momento y lugar",
    categoryLabel: "Medicina General",
    categoryHref: href("es", "/blog"),
    eyebrow: "Irlanda · Guía de diagnóstico",
    h1: "Análisis de sangre en Dublín",
    deck: "Sacar la sangre es la parte fácil. Elegir la prueba adecuada, y saber después qué significa el número, es la parte que necesita un médico.",
    intro:
      "En Dublín puede hacerse análisis en la <strong>consulta de su médico de cabecera</strong>, en un <strong>servicio hospitalario de extracciones</strong> si le han derivado, o en una <strong>clínica o laboratorio privado</strong> con cita directa. Lo que cambia entre ellos no es la aguja: es si alguien decidió qué pruebas necesitaba y si alguien va a interpretar el resultado a la luz de sus síntomas. Un panel comprado de un menú puede tranquilizarle sobre algo que nunca estuvo en juego y pasar por alto justo lo que le hizo consultar.",
    facts: ["Cabecera, hospital o privado", "La petición importa más que el panel", "Los resultados necesitan contexto clínico"],
    primaryCta: { label: "Reservar consulta y petición", href: href("es", "/services/referral-and-investigations") },
    secondaryCta: { label: "Ver nuestros análisis", href: href("es", "/lab-tests") },
    panelChip: "Qué cubre esta guía",
    panelParas: [
      "Las tres vías para hacerse análisis en Dublín, y qué incluye y qué no incluye cada una.",
      "Qué miden, en lenguaje llano, los paneles más habituales — hemograma, función renal y hepática, tiroides, lípidos, HbA1c, estudio del hierro, vitamina D y marcadores inflamatorios.",
      "En este artículo no hay precios ni rangos de referencia. Los precios los fija cada proveedor y los rangos son específicos del laboratorio que procesó su muestra: los suyos están impresos en su propio informe.",
    ],
    author: { initials: "TF", name: "Dr Tiago Miguel Figueira", line: "IMC 523449 · Director Clínico, Global Health" },
    reviewLine: "Revisado clínicamente por el Dr Ahmed Maklad, médico de familia, Global Health Irlanda.",
    navLabel: "En este artículo",
    sections: [
      {
        id: "where",
        nav: "Dónde hacerlos",
        eyebrow: "Acceso",
        h2: "Dónde puede hacerse análisis en Dublín",
        blocks: [
          lead("Tres vías, y no son intercambiables: se diferencian en quién decide qué se analiza y quién explica el resultado."),
          ul([
            "<strong>Su consulta de medicina general.</strong> El médico que conoce su historia decide las pruebas, y el resultado vuelve a quien las pidió. Es la vía que menos números huérfanos genera.",
            "<strong>Extracciones hospitalarias.</strong> Se usan cuando un clínico del hospital ha pedido pruebas concretas, a menudo antes o después de una consulta externa. Por lo general necesita la petición para acudir.",
            "<strong>Clínica o laboratorio privado.</strong> Cita directa, disponibilidad rápida y menús amplios de paneles. Es cómodo y realmente útil cuando sabe qué necesita, pero es usted quien elige las pruebas salvo que haya un médico de por medio.",
          ]),
          p("Existe además la extracción a domicilio, realizada por enfermería o por un extraccionista. El principio es el mismo: la extracción es sencilla y el valor clínico viene de qué se pidió y de quién lo lee."),
          p(`Si quiere el término medio —un médico que decide qué analizar y después una cita en el laboratorio— para eso sirve una consulta con petición. La nuestra es <a href="${href("es", "/services/referral-and-investigations")}">derivaciones y pruebas diagnósticas</a>, y los paneles que podemos gestionar están en <a href="${href("es", "/lab-tests")}">análisis</a>.`),
        ],
      },
      {
        id: "referral",
        nav: "¿Hace falta petición?",
        eyebrow: "La pregunta real",
        h2: "¿Hace falta petición médica para un análisis privado?",
        blocks: [
          lead("Para la mayoría de paneles privados de cita directa, no. Si <em>conviene</em> tenerla es otra pregunta."),
          p("Los proveedores privados de Dublín suelen aceptar su reserva sin petición. La razón para implicar de todos modos a un médico no es poner puertas: es que la elección de la prueba <em>es</em> el diagnóstico en marcha. El cansancio, por ejemplo, no es una prueba. Según la edad, los antecedentes, la medicación y el resto del cuadro, puede apuntar al estudio del hierro, a la función tiroidea, al cribado de celiaquía, al metabolismo de la glucosa, a la función renal, o a ninguno de ellos."),
          ul([
            "Un médico reduce un síntoma a las pruebas que de verdad pueden cambiar lo que ocurra después.",
            "Un médico sabe cuáles de sus fármacos distorsionan qué resultados, y a qué hora del día o del ciclo debe tomarse la muestra.",
            "Es un médico quien actúa ante un resultado alterado. Un resultado sin nadie responsable es el fallo más frecuente de las pruebas vendidas directamente al consumidor.",
          ]),
          warn("Más pruebas no es más información", "Los paneles muy amplios producen de forma previsible valores levemente fuera de rango en personas perfectamente sanas. Cada uno exige después explicación, repetición o estudio. Amplitud sin pregunta clínica genera ansiedad y consultas repetidas, no respuestas."),
        ],
      },
      {
        id: "common-tests",
        nav: "Pruebas habituales",
        eyebrow: "En lenguaje llano",
        h2: "Qué miden realmente las pruebas más habituales",
        blocks: [
          lead("Son los paneles que verá en casi todos los menús de la ciudad, y para qué sirven de verdad."),
          ul([
            "<strong>Hemograma completo.</strong> Las células en sí — glóbulos rojos, glóbulos blancos, plaquetas. Sirve para buscar anemia, infección y problemas de coagulación.",
            "<strong>Urea y electrolitos.</strong> Función renal y el equilibrio de sales y agua que el riñón controla.",
            "<strong>Pruebas de función hepática.</strong> Un grupo de enzimas y proteínas que se mueven cuando el hígado o la vía biliar están irritados, obstruidos o inflamados.",
            "<strong>Función tiroidea (TSH y a veces T4).</strong> Si la tiroides va rápida, lenta o normal.",
            "<strong>Perfil lipídico.</strong> Fracciones del colesterol y triglicéridos, usados para el riesgo cardiovascular y no para explicar cómo se encuentra hoy.",
            "<strong>HbA1c.</strong> Una media de su glucosa en los meses previos — se usa para diagnosticar y controlar la diabetes.",
            "<strong>Ferritina y estudio del hierro.</strong> Los depósitos de hierro, que explican buena parte del cansancio sin causa aparente, especialmente en mujeres con menstruación.",
            "<strong>Vitamina D.</strong> Relevante en Irlanda por razones geográficas evidentes, y que conviene medir cuando hay un motivo.",
            "<strong>PCR.</strong> Un marcador general de inflamación. Le dice que algo pasa; no le dice qué.",
          ]),
          p("Fíjese en lo que ninguna hace: ninguna diagnostica una enfermedad por sí sola. Estrechan posibilidades. Y ese estrechamiento solo funciona si alguien sabe con qué llegó usted."),
          cite(`Información general para pacientes sobre análisis: <a href="${HSE_BLOOD_TESTS}" rel="nofollow noopener" target="_blank">HSE</a>.`),
        ],
      },
      {
        id: "preparation",
        nav: "Cómo prepararse",
        eyebrow: "Práctico",
        h2: "Ayuno, momento del día y qué llevar",
        blocks: [
          lead("La mayoría de los análisis no requiere ninguna preparación. Unos pocos exigen una preparación muy concreta, y equivocarse obliga a repetir la muestra."),
          ul([
            "<strong>El ayuno</strong> es necesario para algunas pruebas e irrelevante para otras. No ayune por si acaso: pregunte al médico que las pidió, o a la clínica, si sus pruebas concretas lo requieren.",
            "<strong>Beba agua</strong> salvo indicación contraria. Las venas bien hidratadas hacen la extracción más rápida y reducen la probabilidad de un segundo intento.",
            "<strong>El momento importa para algunas hormonas.</strong> Ciertos resultados varían a lo largo del día o del ciclo menstrual, y la petición debe indicar cuándo acudir.",
            "<strong>Lleve la lista de su medicación</strong>, incluidos los suplementos. La biotina, en particular, puede interferir en algunas determinaciones, y los suplementos a dosis altas distorsionan justo el valor que se quiere medir.",
            "<strong>Lleve documento con foto</strong> y sus datos tal como figuran en la petición, para que la muestra se etiquete a la persona correcta.",
          ]),
          p("Si alguna vez se ha mareado en una extracción, dígalo antes de la aguja y no después. Es frecuente, es manejable, y estar tumbado de entrada es mucho mejor que ser sujetado a tiempo."),
        ],
      },
      {
        id: "results",
        nav: "Leer resultados",
        eyebrow: "Interpretación",
        h2: "Por qué un valor fuera de rango casi nunca significa lo que parece",
        blocks: [
          lead("Los rangos de referencia no son la frontera entre sano y enfermo. Describen dónde se sitúa la mayoría de resultados en una población de referencia."),
          p("Un valor ligeramente fuera del rango impreso en su informe puede ser completamente normal para usted. Y un valor dentro del rango puede ser incorrecto para usted: una ferritina en el límite bajo en una mujer con reglas abundantes y agotamiento es un hallazgo, aunque nada aparezca marcado. Por eso el informe y la interpretación son cosas distintas."),
          ul([
            "Los rangos son <strong>específicos del laboratorio</strong> que procesó la muestra. Comparar su número con uno encontrado en internet, o con el informe de un amigo de otro laboratorio, no es una comparación equivalente.",
            "<strong>La tendencia gana a la foto fija.</strong> Dos resultados separados por meses suelen decir más que uno aislado.",
            "<strong>Una enfermedad reciente, el ejercicio intenso, el alcohol, la deshidratación y algunos suplementos</strong> mueven resultados sin que exista enfermedad alguna.",
            "Un valor alterado inesperado suele repetirse antes de concluir nada. Eso es buena práctica, no indecisión.",
          ]),
          warn("No cambie un tratamiento por un resultado", "Nunca inicie, suspenda ni ajuste un medicamento prescrito por un número de un informe. Lleve el informe al médico que lleva ese tratamiento.",
          ),
        ],
      },
      {
        id: "red-flags",
        nav: "Cuándo no esperar",
        eyebrow: "Seguridad",
        h2: "Cuándo un análisis es el paso equivocado",
        blocks: [
          lead("Hay cuadros que necesitan valoración ahora, no una extracción y una espera."),
          ul([
            "Dolor u opresión en el pecho, especialmente con falta de aire, sudoración o dolor irradiado al brazo o a la mandíbula.",
            "Debilidad súbita, desviación de la boca, dificultad para hablar o dolor de cabeza súbito e intenso.",
            "Dificultad para respirar en reposo.",
            "Manchas en la piel que no desaparecen al presionar, especialmente con fiebre, rigidez de nuca o confusión.",
            "Sangrado abundante, o vómito con sangre o con aspecto de posos de café.",
            "Pérdida de peso no explicada, sudores nocturnos que empapan, o un bulto que crece: eso hay que verlo y explorarlo, no simplemente cribarlo.",
          ]),
          p("En los cuatro primeros casos llame al <strong>112</strong> o al <strong>999</strong>, o acuda a urgencias. En el resto, pida una valoración en lugar de un panel: es la exploración la que dirige las pruebas."),
        ],
      },
    ],
    linksEyebrow: "Global Health Irlanda",
    linksH2: "Siguientes pasos",
    linksLead: "Nuestros médicos en Irlanda atienden por vídeo, deciden qué pruebas merecen la pena en su caso y repasan después el informe con usted.",
    links: [
      { label: "Consulta, derivación y pruebas diagnósticas", href: href("es", "/services/referral-and-investigations") },
      { label: "Análisis disponibles a través de Global Health Irlanda", href: href("es", "/lab-tests") },
      { label: "Conozca a los médicos colegiados de nuestro servicio irlandés", href: href("es", "/doctors") },
      { label: "Contactar con Global Health Irlanda", href: href("es", "/contact") },
    ],
    ctaBox: {
      h3: "Deje que un médico elija las pruebas",
      text: "Una consulta breve por vídeo convierte un síntoma en una petición concreta y le da a alguien responsable del resultado cuando llegue.",
      primary: { label: "Reservar consulta", href: href("es", "/services/referral-and-investigations") },
      secondary: { label: "Ver nuestros médicos", href: href("es", "/doctors") },
    },
    sourcesEyebrow: "Fuentes oficiales",
    sourcesH2: "Dónde comprobarlo de forma independiente",
    sourcesLead: "Información para pacientes sobre análisis y cómo confirmar que quien interpreta su resultado está registrado para ejercer en Irlanda.",
    sources: [
      { label: "HSE — análisis de sangre", href: HSE_BLOOD_TESTS },
      { label: "Medical Council — consultar el registro", href: MEDICAL_COUNCIL },
    ],
    sourcesNote: "Los enlaces abren en el sitio del organismo emisor. Los rangos de referencia de su propio informe de laboratorio prevalecen siempre sobre cualquier información general, incluido este artículo.",
    faqEyebrow: "FAQ",
    faqH2: "Preguntas frecuentes",
    faqs: [
      {
        q: "¿Dónde puedo hacerme un análisis de sangre en Dublín?",
        a: "En la consulta de su médico de cabecera, en un servicio hospitalario de extracciones si un clínico del hospital las ha pedido, o en una clínica o laboratorio privado con cita directa. También existe la extracción a domicilio. La diferencia está en quién decide las pruebas y quién interpreta el resultado, no en la extracción.",
      },
      {
        q: "¿Necesito petición médica para un análisis privado?",
        a: "Por lo general no: la mayoría de proveedores privados acepta cita directa. Implicar a un médico sigue mereciendo la pena, porque elegir las pruebas adecuadas para sus síntomas forma parte del diagnóstico y porque un resultado alterado necesita a alguien clínicamente responsable de actuar.",
      },
      {
        q: "¿Tengo que ir en ayunas?",
        a: "Depende por completo de las pruebas. Algunas exigen ayuno, la mayoría no. Pregunte al médico que las pidió o a la clínica que hace la extracción en lugar de ayunar por si acaso. Beba agua salvo que le hayan indicado lo contrario.",
      },
      {
        q: "¿Cuánto tardan los resultados?",
        a: "Varía según la prueba y el laboratorio: los paneles de rutina suelen ser rápidos, mientras que las determinaciones especializadas se derivan y tardan más. La clínica que le extrae la muestra puede indicarle el plazo previsto para sus pruebas concretas.",
      },
      {
        q: "¿Qué significa tener un valor fuera del rango normal?",
        a: "A menudo poca cosa por sí solo. Los rangos describen dónde cae la mayoría de resultados de una población de referencia, son específicos del laboratorio que procesó su muestra, y una enfermedad reciente, el ejercicio, la deshidratación o los suplementos pueden moverlos sin que haya enfermedad. Un valor alterado inesperado suele repetirse antes de concluir nada.",
      },
      {
        q: "¿Puedo hacerme análisis sin ver a ningún médico?",
        a: "Sí, a través de proveedores privados con cita directa. La contrapartida es que usted elige el panel y no hay nadie clínicamente responsable del informe. Si el motivo es un síntoma y no la curiosidad, una consulta previa suele producir un conjunto de pruebas más útil.",
      },
    ],
    disclaimerTitle: "Aviso Médico",
    disclaimer:
      "Escrito por el Dr Tiago Miguel Figueira (IMC 523449), Director Clínico de Global Health, y revisado clínicamente por el Dr Ahmed Maklad, médico de familia. Este artículo contiene información general sobre pruebas de laboratorio en Irlanda y no constituye asesoramiento médico personalizado. No sustituye la valoración de un médico que conozca su historia y no debe usarse para interpretar su propio informe ni para modificar ningún tratamiento prescrito. Si sufre una emergencia médica, llame de inmediato al 999 o al 112.",
  } satisfies Article,
};

const cs: LocalePost = {
  locale: "CS",
  slug: "krevni-testy-dublin",
  title: "Krevní testy v Dublinu: kam jít, o co požádat a jak číst výsledek",
  excerpt:
    "Kde si v Dublinu necháte odebrat krev, proč je žádanka důležitější než panel, co jednotlivá vyšetření skutečně měří a proč jediná hodnota mimo rozmezí sama o sobě málokdy něco znamená.",
  seoTitle: "Krevní testy v Dublinu: průvodce od lékaře",
  seoDescription:
    "Kde si v Dublinu nechat odebrat krev, zda potřebujete žádanku, co měří běžné panely, kdy je nutné lačnění a co znamená hodnota mimo rozmezí.",
  category: "Praktické lékařství",
  article: {
    lang: "cs-CZ",
    tagline: "Medicína kdykoli a kdekoli",
    categoryLabel: "Praktické lékařství",
    categoryHref: href("cs", "/blog"),
    eyebrow: "Irsko · Průvodce diagnostikou",
    h1: "Krevní testy v Dublinu",
    deck: "Odběr je ta snadná část. Vybrat správné vyšetření a vědět potom, co ta čísla znamenají, je část, která potřebuje lékaře.",
    intro:
      "V Dublinu si můžete nechat odebrat krev u <strong>svého praktického lékaře</strong>, na <strong>nemocničním odběrovém pracovišti</strong>, pokud jste byli odesláni, nebo v <strong>soukromé klinice či laboratoři</strong> s přímým objednáním. Nerozdílná je jehla — rozdíl je v tom, zda někdo rozhodl, která vyšetření potřebujete, a zda někdo výsledek vyloží v souvislosti s vašimi potížemi. Panel vybraný z nabídky vás může uklidnit ohledně něčeho, co vám nikdy nehrozilo, a minout právě to, kvůli čemu jste přišli.",
    facts: ["Praktik, nemocnice, nebo soukromě", "Žádanka je důležitější než panel", "Výsledky potřebují klinický kontext"],
    primaryCta: { label: "Objednat konzultaci a žádanku", href: href("cs", "/services/referral-and-investigations") },
    secondaryCta: { label: "Naše laboratorní vyšetření", href: href("cs", "/lab-tests") },
    panelChip: "Co tento průvodce pokrývá",
    panelParas: [
      "Tři cesty, jak si v Dublinu nechat odebrat krev, a co každá z nich zahrnuje a nezahrnuje.",
      "Co běžné panely skutečně měří, srozumitelně — krevní obraz, ledvinné a jaterní testy, štítná žláza, lipidy, HbA1c, metabolismus železa, vitamin D a zánětlivé markery.",
      "V článku nejsou ceny ani referenční meze. Ceny stanovuje každý poskytovatel a meze jsou specifické pro laboratoř, která vzorek zpracovala — ty vaše jsou vytištěné na vašem vlastním nálezu.",
    ],
    author: { initials: "TF", name: "Dr Tiago Miguel Figueira", line: "IMC 523449 · Klinický ředitel, Global Health" },
    reviewLine: "Klinicky zkontroloval Dr Ahmed Maklad, praktický lékař, Global Health Irsko.",
    navLabel: "Obsah článku",
    sections: [
      {
        id: "where",
        nav: "Kam jít",
        eyebrow: "Dostupnost",
        h2: "Kde si v Dublinu necháte odebrat krev",
        blocks: [
          lead("Tři cesty, a nejsou zaměnitelné — liší se v tom, kdo rozhoduje, co se vyšetří, a kdo výsledek vysvětlí."),
          ul([
            "<strong>Ordinace vašeho praktického lékaře.</strong> Vyšetření volí lékař, který zná vaši anamnézu, a výsledek se vrací tomu, kdo je indikoval. Tahle cesta plodí nejméně osiřelých čísel.",
            "<strong>Nemocniční odběry.</strong> Používají se, když konkrétní vyšetření požaduje nemocniční lékař, často před ambulantní kontrolou nebo po ní. Zpravidla potřebujete žádanku, abyste byli přijati.",
            "<strong>Soukromá klinika nebo laboratoř.</strong> Přímé objednání, rychlé termíny, široká nabídka panelů. Je to pohodlné a skutečně užitečné, když víte, co potřebujete — ale vyšetření si vybíráte sami, pokud do toho nevstoupí lékař.",
          ]),
          p("Existuje i odběr doma, který provede sestra nebo odběrový pracovník. Platí totéž: samotný odběr je jednoduchý a klinická hodnota vzniká z toho, co bylo indikováno a kdo to čte."),
          p(`Pokud chcete střední cestu — lékaře, který rozhodne, co vyšetřit, a pak termín v laboratoři — právě k tomu slouží konzultace se žádankou. Naše je <a href="${href("cs", "/services/referral-and-investigations")}">odeslání ke specialistovi a diagnostická vyšetření</a> a panely, které umíme zajistit, najdete v sekci <a href="${href("cs", "/lab-tests")}">laboratorní vyšetření</a>.`),
        ],
      },
      {
        id: "referral",
        nav: "Je nutná žádanka?",
        eyebrow: "Skutečná otázka",
        h2: "Potřebujete žádanku na soukromé krevní testy?",
        blocks: [
          lead("U většiny soukromých panelů s přímým objednáním ne. Zda byste ji mít měli, je jiná otázka."),
          p("Soukromí poskytovatelé v Dublinu vás zpravidla objednají i bez žádanky. Důvod, proč lékaře přesto zapojit, není hlídání vstupu — je jím fakt, že výběr vyšetření <em>je</em> probíhající diagnostika. Únava například není jedno vyšetření. Podle věku, anamnézy, léků a zbytku obrazu může ukazovat na metabolismus železa, funkci štítné žlázy, screening celiakie, zpracování glukózy, funkci ledvin — nebo na nic z toho."),
          ul([
            "Lékař zúží příznak na vyšetření, která mohou skutečně změnit další postup.",
            "Lékař ví, které z vašich léků které výsledky zkreslují a v jakou denní dobu či fázi cyklu se má odebírat.",
            "Na patologický výsledek reaguje lékař. Výsledek, za který nikdo neodpovídá, je nejčastější selhání testů prodávaných přímo spotřebiteli.",
          ]),
          warn("Více testů neznamená více informací", "Velmi široké panely spolehlivě vyplodí mírně vychýlené hodnoty i u zcela zdravých lidí. Každou z nich pak je nutné vysvětlit, zopakovat nebo došetřit. Šíře bez klinické otázky nevytváří odpovědi, ale úzkost a další návštěvy."),
        ],
      },
      {
        id: "common-tests",
        nav: "Běžná vyšetření",
        eyebrow: "Srozumitelně",
        h2: "Co běžná vyšetření skutečně měří",
        blocks: [
          lead("Tohle jsou panely, které uvidíte téměř v každé nabídce ve městě, a k čemu doopravdy slouží."),
          ul([
            "<strong>Krevní obraz.</strong> Samotné buňky — červené krvinky, bílé krvinky, destičky. Slouží k hledání anémie, infekce a poruch srážení.",
            "<strong>Urea a ionty.</strong> Funkce ledvin a rovnováha solí a vody, kterou ledviny řídí.",
            "<strong>Jaterní testy.</strong> Skupina enzymů a bílkovin, které se mění, když jsou játra nebo žlučové cesty drážděné, ucpané či zanícené.",
            "<strong>Funkce štítné žlázy (TSH, případně T4).</strong> Zda štítná žláza běží rychle, pomalu, nebo normálně.",
            "<strong>Lipidový profil.</strong> Frakce cholesterolu a triglyceridy, používané pro kardiovaskulární riziko, ne pro to, jak se cítíte dnes.",
            "<strong>HbA1c.</strong> Průměr vaší glykémie za předchozí měsíce — používá se k diagnostice a sledování cukrovky.",
            "<strong>Feritin a metabolismus železa.</strong> Zásoby železa, které vysvětlují velkou část nevysvětlené únavy, zvlášť u menstruujících žen.",
            "<strong>Vitamin D.</strong> V Irsku relevantní z prostých zeměpisných důvodů, a vhodný k vyšetření, když je k tomu důvod.",
            "<strong>CRP.</strong> Obecný marker zánětu. Řekne vám, že se něco děje; neřekne co.",
          ]),
          p("Všimněte si, co žádné z nich nedělá: samo o sobě nediagnostikuje nemoc. Zužují možnosti. A to zužování funguje jen tehdy, když někdo ví, s čím jste přišli."),
          cite(`Obecné informace pro pacienty o krevních testech: <a href="${HSE_BLOOD_TESTS}" rel="nofollow noopener" target="_blank">HSE</a>.`),
        ],
      },
      {
        id: "preparation",
        nav: "Jak se připravit",
        eyebrow: "Prakticky",
        h2: "Lačnění, načasování a co si vzít s sebou",
        blocks: [
          lead("Většina odběrů nevyžaduje žádnou přípravu. Několik jich vyžaduje přípravu velmi konkrétní, a chyba znamená opakovaný odběr."),
          ul([
            "<strong>Lačnění</strong> je u některých vyšetření nutné a u jiných nepodstatné. Nelačněte pro jistotu — zeptejte se lékaře, který vyšetření indikoval, nebo odběrového pracoviště, zda to vaše konkrétní vyšetření vyžadují.",
            "<strong>Pijte vodu</strong>, pokud vám neřekli jinak. Dobře hydratované žíly odběr zrychlí a sníží riziko druhého vpichu.",
            "<strong>U některých hormonů záleží na čase.</strong> Určité výsledky kolísají během dne nebo v průběhu cyklu a žádanka má uvádět, kdy přijít.",
            "<strong>Vezměte seznam léků</strong> včetně doplňků stravy. Zejména biotin může některé laboratorní metody rušit a vysoké dávky doplňků zkreslí právě tu hodnotu, kterou chcete změřit.",
            "<strong>Vezměte doklad totožnosti</strong> a údaje ve tvaru, v jakém jsou na žádance, aby byl vzorek označen správnou osobou.",
          ]),
          p("Pokud jste při odběru někdy omdleli, řekněte to před vpichem, ne po něm. Je to běžné, zvládnutelné, a ležet od začátku je mnohem lepší než být zachycen v pádu."),
        ],
      },
      {
        id: "results",
        nav: "Čtení výsledků",
        eyebrow: "Výklad",
        h2: "Proč jedna hodnota mimo rozmezí málokdy znamená, jak vypadá",
        blocks: [
          lead("Referenční meze nejsou hranicí mezi zdravím a nemocí. Popisují, kde leží většina výsledků v referenční populaci."),
          p("Hodnota mírně mimo rozmezí vytištěné na vašem nálezu může být pro vás naprosto normální. A hodnota uvnitř rozmezí může být pro vás nesprávná — feritin u dolní hranice u ženy se silnou menstruací a vyčerpáním je nález, i když není nic označeno. Právě proto je nález a jeho výklad dvojí věc."),
          ul([
            "Meze jsou <strong>specifické pro laboratoř</strong>, která vzorek zpracovala. Porovnávat vaše číslo s číslem z internetu nebo s nálezem známého z jiné laboratoře není srovnání téhož.",
            "<strong>Trend přebíjí jednorázový snímek.</strong> Dva výsledky s odstupem měsíců obvykle řeknou víc než jeden osamocený.",
            "<strong>Nedávná nemoc, intenzivní pohyb, alkohol, dehydratace a některé doplňky</strong> hodnotami hýbou, aniž by existovala nemoc.",
            "Nečekaně patologický výsledek se často opakuje dřív, než se z něj cokoli vyvodí. To je správná praxe, ne nerozhodnost.",
          ]),
          warn("Neměňte léčbu podle jednoho výsledku", "Nikdy nezačínejte, nevysazujte ani neupravujte předepsaný lék kvůli číslu v nálezu. Přineste nález lékaři, který tu léčbu vede.",
          ),
        ],
      },
      {
        id: "red-flags",
        nav: "Kdy nečekat",
        eyebrow: "Bezpečnost",
        h2: "Kdy je krevní test špatný další krok",
        blocks: [
          lead("Některé stavy potřebují vyšetření hned, ne odběr a čekání na výsledek."),
          ul([
            "Bolest nebo tlak na hrudi, zvlášť s dušností, pocením nebo bolestí vyzařující do paže či čelisti.",
            "Náhlá slabost, pokleslý koutek, porucha řeči nebo náhlá silná bolest hlavy.",
            "Dušnost v klidu.",
            "Vyrážka, která po stlačení nemizí, zvlášť s horečkou, ztuhlou šíjí nebo zmateností.",
            "Silné krvácení nebo zvracení krve či hmoty připomínající kávovou sedlinu.",
            "Nevysvětlený úbytek hmotnosti, noční poty promáčející prádlo nebo rostoucí bulka — tohle je třeba vidět a vyšetřit, ne jen prosít testem.",
          ]),
          p("U prvních čtyř volejte <strong>112</strong> nebo <strong>999</strong>, případně jděte na nejbližší pohotovost. U zbytku si objednejte vyšetření místo panelu — směr testům udává fyzikální vyšetření."),
        ],
      },
    ],
    linksEyebrow: "Global Health Irsko",
    linksH2: "Kudy dál",
    linksLead: "Naši lékaři v Irsku konzultují přes video, rozhodnou, která vyšetření mají ve vašem případě smysl, a nález s vámi potom projdou.",
    links: [
      { label: "Konzultace, odeslání a diagnostická vyšetření", href: href("cs", "/services/referral-and-investigations") },
      { label: "Laboratorní vyšetření dostupná přes Global Health Irsko", href: href("cs", "/lab-tests") },
      { label: "Registrovaní lékaři naší irské služby", href: href("cs", "/doctors") },
      { label: "Kontaktovat Global Health Irsko", href: href("cs", "/contact") },
    ],
    ctaBox: {
      h3: "Nechte vyšetření vybrat lékaře",
      text: "Krátká videokonzultace promění příznak v konkrétní žádanku a dá vám někoho, kdo za výsledek odpovídá, až přijde.",
      primary: { label: "Objednat konzultaci", href: href("cs", "/services/referral-and-investigations") },
      secondary: { label: "Zobrazit naše lékaře", href: href("cs", "/doctors") },
    },
    sourcesEyebrow: "Oficiální zdroje",
    sourcesH2: "Kde si to nezávisle ověřit",
    sourcesLead: "Informace pro pacienty o krevních testech a jak ověřit, že ten, kdo váš výsledek vykládá, má v Irsku registraci.",
    sources: [
      { label: "HSE — krevní testy", href: HSE_BLOOD_TESTS },
      { label: "Medical Council — registr lékařů", href: MEDICAL_COUNCIL },
    ],
    sourcesNote: "Odkazy vedou na stránky příslušných institucí. Referenční meze uvedené na vašem vlastním laboratorním nálezu mají vždy přednost před jakoukoli obecnou informací včetně tohoto článku.",
    faqEyebrow: "FAQ",
    faqH2: "Časté dotazy",
    faqs: [
      {
        q: "Kde si mohu v Dublinu nechat odebrat krev?",
        a: "U svého praktického lékaře, na nemocničním odběrovém pracovišti, pokud vyšetření požaduje nemocniční lékař, nebo v soukromé klinice či laboratoři s přímým objednáním. Existuje i odběr doma. Rozdíl mezi nimi je v tom, kdo rozhoduje o vyšetřeních a kdo vykládá výsledek, ne v samotném odběru.",
      },
      {
        q: "Potřebuji žádanku na soukromé krevní testy?",
        a: "Obvykle ne — většina soukromých poskytovatelů přijímá přímé objednání. Zapojit lékaře se přesto vyplatí, protože výběr správných vyšetření je součástí diagnostiky a protože patologický výsledek potřebuje někoho, kdo za reakci na něj klinicky odpovídá.",
      },
      {
        q: "Musím být nalačno?",
        a: "Záleží zcela na tom, která vyšetření se dělají. Některá lačnění vyžadují, většina ne. Zeptejte se lékaře, který je indikoval, nebo odběrového pracoviště, místo abyste lačnili pro jistotu. Pokud vám neřekli jinak, pijte vodu.",
      },
      {
        q: "Jak dlouho trvají výsledky?",
        a: "Liší se podle vyšetření a laboratoře — rutinní panely bývají rychlé, zatímco specializované metody se odesílají dál a trvají déle. Pracoviště, které vám odebírá krev, vám řekne očekávanou dobu pro vaše konkrétní vyšetření.",
      },
      {
        q: "Co znamená hodnota mimo normu?",
        a: "Sama o sobě často velmi málo. Referenční meze popisují, kde leží většina výsledků v referenční populaci, jsou specifické pro laboratoř, která vzorek zpracovala, a nedávná nemoc, pohyb, dehydratace nebo doplňky stravy hodnotami hýbou i bez nemoci. Nečekaně patologický výsledek se obvykle opakuje dřív, než se z něj vyvozují závěry.",
      },
      {
        q: "Můžu si nechat udělat testy úplně bez lékaře?",
        a: "Ano, u soukromých poskytovatelů s přímým objednáním. Cenou za to je, že panel volíte sami a za nález nikdo klinicky neodpovídá. Pokud je důvodem příznak, a ne zvědavost, konzultace předem obvykle přinese užitečnější sadu vyšetření.",
      },
    ],
    disclaimerTitle: "Lékařské upozornění",
    disclaimer:
      "Napsal Dr Tiago Miguel Figueira (IMC 523449), klinický ředitel Global Health, klinicky zkontroloval Dr Ahmed Maklad, praktický lékař. Text obsahuje obecné informace o laboratorních vyšetřeních v Irsku a není personalizovaným lékařským poradenstvím. Nenahrazuje vyšetření lékařem, který zná vaši anamnézu, a nesmí sloužit k výkladu vlastního nálezu ani ke změně předepsané léčby. V případě lékařské pohotovosti volejte ihned 999 nebo 112.",
  } satisfies Article,
};

const roPost: LocalePost = {
  locale: "RO",
  slug: "analize-de-sange-dublin",
  title: "Analize de sânge în Dublin: unde le faci, ce ceri și cum citești rezultatul",
  excerpt:
    "Unde puteți face analize în Dublin, de ce trimiterea contează mai mult decât pachetul, ce măsoară de fapt analizele obișnuite și de ce o singură valoare în afara intervalului rareori este răspunsul.",
  seoTitle: "Analize de sânge în Dublin: ghidul unui medic",
  seoDescription:
    "Unde faceți analize de sânge în Dublin, dacă aveți nevoie de trimitere, ce măsoară pachetele obișnuite și ce înseamnă o valoare modificată.",
  category: "Medicină de familie",
  article: {
    lang: "ro-RO",
    tagline: "Îngrijire medicală oricând, oriunde",
    categoryLabel: "Medicină de familie",
    categoryHref: href("ro", "/blog"),
    eyebrow: "Irlanda · Ghid de diagnostic",
    h1: "Analize de sânge în Dublin",
    deck: "Recoltarea este partea ușoară. Alegerea analizei potrivite și înțelegerea cifrei de după sunt partea care cere un medic.",
    intro:
      "În Dublin puteți face analize la <strong>cabinetul medicului de familie</strong>, la un <strong>punct de recoltare din spital</strong> dacă ați fost trimis, sau într-o <strong>clinică ori laborator privat</strong> cu programare directă. Ce diferă între ele nu este acul — este dacă a decis cineva de ce analize aveți nevoie și dacă va interpreta cineva rezultatul în contextul simptomelor. Un pachet ales dintr-o listă vă poate liniști despre ceva ce nu v-a amenințat niciodată și poate rata exact lucrul pentru care ați venit.",
    facts: ["Medic de familie, spital sau privat", "Trimiterea contează mai mult decât pachetul", "Rezultatele au nevoie de context clinic"],
    primaryCta: { label: "Programați consultație și trimitere", href: href("ro", "/services/referral-and-investigations") },
    secondaryCta: { label: "Vedeți analizele noastre", href: href("ro", "/lab-tests") },
    panelChip: "Ce acoperă acest ghid",
    panelParas: [
      "Cele trei căi de a face analize în Dublin și ce include, respectiv ce nu include, fiecare.",
      "Ce măsoară, pe înțelesul tuturor, pachetele obișnuite — hemoleucogramă, funcție renală și hepatică, tiroidă, lipide, HbA1c, profilul fierului, vitamina D și markeri inflamatori.",
      "În articol nu apar prețuri și nici intervale de referință. Prețurile sunt stabilite de fiecare furnizor, iar intervalele sunt specifice laboratorului care v-a procesat proba — ale dumneavoastră sunt tipărite pe propriul buletin.",
    ],
    author: { initials: "TF", name: "Dr Tiago Miguel Figueira", line: "IMC 523449 · Director clinic, Global Health" },
    reviewLine: "Revizuit clinic de Dr Ahmed Maklad, medic de familie, Global Health Irlanda.",
    navLabel: "În acest articol",
    sections: [
      {
        id: "where",
        nav: "Unde le faceți",
        eyebrow: "Acces",
        h2: "Unde puteți face analize în Dublin",
        blocks: [
          lead("Trei căi, și nu sunt interschimbabile — diferă prin cine decide ce se analizează și cine explică rezultatul."),
          ul([
            "<strong>Cabinetul medicului de familie.</strong> Medicul care vă cunoaște istoricul alege analizele, iar rezultatul se întoarce la cel care le-a cerut. Este calea care produce cele mai puține cifre orfane.",
            "<strong>Recoltarea în spital.</strong> Se folosește când un medic din spital a cerut analize precise, deseori înainte sau după o consultație ambulatorie. De regulă aveți nevoie de cerere pentru a fi preluat.",
            "<strong>Clinică sau laborator privat.</strong> Programare directă, termene rapide, liste largi de pachete. Este comod și chiar util când știți ce vă trebuie — dar alegeți singur analizele, dacă nu intervine un medic.",
          ]),
          p("Există și recoltarea la domiciliu, făcută de un asistent sau de un flebotomist. Principiul rămâne: recoltarea e simplă, iar valoarea clinică vine din ce s-a cerut și din cine citește."),
          p(`Dacă vreți calea de mijloc — un medic care decide ce se analizează, apoi o programare la laborator — exact pentru asta există consultația cu trimitere. A noastră este <a href="${href("ro", "/services/referral-and-investigations")}">trimitere către specialist și investigații de diagnostic</a>, iar pachetele pe care le putem organiza sunt la <a href="${href("ro", "/lab-tests")}">analize</a>.`),
        ],
      },
      {
        id: "referral",
        nav: "Este nevoie de trimitere?",
        eyebrow: "Întrebarea reală",
        h2: "Aveți nevoie de trimitere pentru analize private?",
        blocks: [
          lead("Pentru majoritatea pachetelor private cu programare directă, nu. Dacă <em>ar trebui</em> să aveți una este altă întrebare."),
          p("Furnizorii privați din Dublin vă acceptă de regulă programarea fără trimitere. Motivul pentru care merită totuși implicat un medic nu este birocrația — este că alegerea analizei <em>este</em> diagnosticul în desfășurare. Oboseala, de pildă, nu este o analiză. În funcție de vârstă, istoric, medicație și restul tabloului, poate duce la profilul fierului, funcția tiroidiană, screening pentru boală celiacă, metabolismul glucozei, funcția renală — sau la niciuna dintre ele."),
          ul([
            "Un medic reduce un simptom la analizele care pot schimba efectiv ce urmează.",
            "Un medic știe care dintre medicamentele dumneavoastră denaturează ce rezultate și la ce oră din zi sau moment al ciclului trebuie recoltată proba.",
            "Medicul este cel care acționează în fața unui rezultat modificat. Un rezultat de care nu răspunde nimeni este cel mai frecvent eșec al testelor vândute direct consumatorului.",
          ]),
          warn("Mai multe analize nu înseamnă mai multă informație", "Pachetele foarte largi produc previzibil valori ușor în afara intervalului la oameni perfect sănătoși. Fiecare cere apoi explicație, repetare sau investigație. Lărgimea fără o întrebare clinică generează anxietate și programări repetate, nu răspunsuri."),
        ],
      },
      {
        id: "common-tests",
        nav: "Analize obișnuite",
        eyebrow: "Pe înțelesul tuturor",
        h2: "Ce măsoară de fapt analizele obișnuite",
        blocks: [
          lead("Sunt pachetele pe care le veți vedea în aproape orice listă din oraș și la ce servesc cu adevărat."),
          ul([
            "<strong>Hemoleucograma completă.</strong> Celulele propriu-zise — hematii, leucocite, trombocite. Caută anemie, infecție și tulburări de coagulare.",
            "<strong>Uree și electroliți.</strong> Funcția renală și echilibrul de săruri și apă pe care rinichiul îl controlează.",
            "<strong>Probe hepatice.</strong> Un grup de enzime și proteine care se modifică atunci când ficatul sau căile biliare sunt iritate, obstruate ori inflamate.",
            "<strong>Funcția tiroidiană (TSH și, uneori, T4).</strong> Dacă tiroida merge repede, încet sau normal.",
            "<strong>Profil lipidic.</strong> Fracțiunile colesterolului și trigliceridele, folosite pentru riscul cardiovascular, nu pentru cum vă simțiți azi.",
            "<strong>HbA1c.</strong> O medie a glicemiei din lunile precedente — folosită pentru diagnosticul și monitorizarea diabetului.",
            "<strong>Feritină și profilul fierului.</strong> Rezervele de fier, care explică o bună parte din oboseala fără cauză aparentă, mai ales la femeile care menstruează.",
            "<strong>Vitamina D.</strong> Relevantă în Irlanda din motive geografice evidente și de dozat când există un motiv.",
            "<strong>PCR.</strong> Un marker general de inflamație. Vă spune că se întâmplă ceva; nu vă spune ce.",
          ]),
          p("Observați ce nu face niciuna: niciuna nu pune singură un diagnostic. Îngustează posibilitățile. Iar îngustarea funcționează doar dacă cineva știe cu ce ați venit."),
          cite(`Informații generale pentru pacienți despre analize: <a href="${HSE_BLOOD_TESTS}" rel="nofollow noopener" target="_blank">HSE</a>.`),
        ],
      },
      {
        id: "preparation",
        nav: "Cum vă pregătiți",
        eyebrow: "Practic",
        h2: "Postul, momentul zilei și ce luați cu dumneavoastră",
        blocks: [
          lead("Majoritatea analizelor nu cer nicio pregătire. Câteva cer o pregătire foarte precisă, iar greșeala înseamnă repetarea probei."),
          ul([
            "<strong>Postul</strong> este necesar pentru unele analize și irelevant pentru altele. Nu postiți preventiv — întrebați medicul care le-a cerut sau clinica dacă analizele dumneavoastră îl cer.",
            "<strong>Beți apă</strong>, dacă nu vi s-a spus altfel. Venele bine hidratate scurtează recoltarea și scad șansa unei a doua încercări.",
            "<strong>Pentru unii hormoni contează momentul.</strong> Anumite rezultate variază pe parcursul zilei sau al ciclului menstrual, iar cererea trebuie să indice când să veniți.",
            "<strong>Luați lista medicamentelor</strong>, inclusiv suplimentele. Biotina, în special, poate interfera cu unele metode de laborator, iar dozele mari de suplimente denaturează exact valoarea pe care vreți s-o măsurați.",
            "<strong>Luați un act de identitate</strong> și datele așa cum apar pe cerere, ca proba să fie etichetată persoanei corecte.",
          ]),
          p("Dacă ați leșinat vreodată la recoltare, spuneți-o înainte de ac, nu după. Este frecvent, se gestionează, iar a sta întins de la început e mult mai bine decât a fi prins din cădere."),
        ],
      },
      {
        id: "results",
        nav: "Citirea rezultatelor",
        eyebrow: "Interpretare",
        h2: "De ce o valoare în afara intervalului rareori înseamnă ce pare",
        blocks: [
          lead("Intervalele de referință nu sunt granița dintre sănătos și bolnav. Descriu unde se află majoritatea rezultatelor într-o populație de referință."),
          p("O valoare ușor în afara intervalului tipărit pe buletinul dumneavoastră poate fi absolut normală pentru dumneavoastră. Iar o valoare din interiorul intervalului poate fi greșită pentru dumneavoastră — o feritină la limita de jos, la o femeie cu menstruații abundente și epuizare, este un rezultat semnificativ, chiar dacă nimic nu e marcat. De aceea buletinul și interpretarea sunt lucruri diferite."),
          ul([
            "Intervalele sunt <strong>specifice laboratorului</strong> care a procesat proba. A compara cifra dumneavoastră cu una găsită online sau cu buletinul unui prieten de la alt laborator nu este o comparație echivalentă.",
            "<strong>Tendința bate instantaneul.</strong> Două rezultate la distanță de luni spun de obicei mai mult decât unul izolat.",
            "<strong>O boală recentă, efortul intens, alcoolul, deshidratarea și unele suplimente</strong> mișcă rezultatele fără să existe vreo boală.",
            "Un rezultat modificat neașteptat se repetă adesea înainte să se tragă vreo concluzie. Aceasta este bună practică, nu ezitare.",
          ]),
          warn("Nu schimbați tratamentul după un rezultat", "Nu începeți, nu opriți și nu ajustați niciodată un medicament prescris din cauza unei cifre de pe buletin. Duceți buletinul medicului care conduce acel tratament.",
          ),
        ],
      },
      {
        id: "red-flags",
        nav: "Când nu așteptați",
        eyebrow: "Siguranță",
        h2: "Când analiza este pasul greșit",
        blocks: [
          lead("Unele tablouri cer evaluare acum, nu o probă și o așteptare."),
          ul([
            "Durere sau apăsare în piept, mai ales cu lipsă de aer, transpirații sau durere care iradiază în braț ori în mandibulă.",
            "Slăbiciune bruscă, gură strâmbă, tulburare de vorbire sau durere de cap bruscă și intensă.",
            "Dificultate de respirație în repaus.",
            "Erupție care nu dispare la apăsare, mai ales cu febră, redoare de ceafă sau confuzie.",
            "Sângerare importantă, vărsături cu sânge sau cu aspect de zaț de cafea.",
            "Scădere în greutate neexplicată, transpirații nocturne abundente sau o formațiune care crește — acestea trebuie văzute și examinate, nu doar testate.",
          ]),
          p("Pentru primele patru, sunați la <strong>112</strong> sau <strong>999</strong>, ori mergeți la cea mai apropiată urgență. Pentru restul, programați o evaluare în locul unui pachet — examinarea este cea care orientează analizele."),
        ],
      },
    ],
    linksEyebrow: "Global Health Irlanda",
    linksH2: "Pașii următori",
    linksLead: "Medicii noștri din Irlanda consultă prin video, decid ce analize merită făcute în cazul dumneavoastră și trec apoi buletinul împreună cu dumneavoastră.",
    links: [
      { label: "Consultație, trimitere și investigații de diagnostic", href: href("ro", "/services/referral-and-investigations") },
      { label: "Analize disponibile prin Global Health Irlanda", href: href("ro", "/lab-tests") },
      { label: "Medicii înscriși ai serviciului nostru irlandez", href: href("ro", "/doctors") },
      { label: "Contactați Global Health Irlanda", href: href("ro", "/contact") },
    ],
    ctaBox: {
      h3: "Lăsați un medic să aleagă analizele",
      text: "O consultație scurtă prin video transformă un simptom într-o cerere precisă și vă oferă pe cineva responsabil de rezultat atunci când vine.",
      primary: { label: "Programați o consultație", href: href("ro", "/services/referral-and-investigations") },
      secondary: { label: "Vedeți medicii noștri", href: href("ro", "/doctors") },
    },
    sourcesEyebrow: "Surse oficiale",
    sourcesH2: "Unde verificați independent",
    sourcesLead: "Informații pentru pacienți despre analize și cum confirmați că cine vă interpretează rezultatul este înscris pentru a profesa în Irlanda.",
    sources: [
      { label: "HSE — analize de sânge", href: HSE_BLOOD_TESTS },
      { label: "Medical Council — registrul medicilor", href: MEDICAL_COUNCIL },
    ],
    sourcesNote: "Linkurile deschid site-ul instituției emitente. Intervalele de referință de pe propriul buletin de laborator au întotdeauna prioritate față de orice informație generală, inclusiv acest articol.",
    faqEyebrow: "Întrebări frecvente",
    faqH2: "Întrebări frecvente",
    faqs: [
      {
        q: "Unde pot face analize de sânge în Dublin?",
        a: "La cabinetul medicului de familie, la un punct de recoltare din spital dacă analizele au fost cerute de un medic din spital, sau într-o clinică ori laborator privat cu programare directă. Există și recoltare la domiciliu. Diferența stă în cine decide analizele și cine interpretează rezultatul, nu în recoltare.",
      },
      {
        q: "Am nevoie de trimitere pentru analize private?",
        a: "De obicei nu — majoritatea furnizorilor privați acceptă programare directă. Implicarea unui medic rămâne utilă, pentru că alegerea analizelor potrivite simptomelor face parte din diagnostic și pentru că un rezultat modificat are nevoie de cineva responsabil clinic să acționeze.",
      },
      {
        q: "Trebuie să vin pe nemâncate?",
        a: "Depinde complet de analizele făcute. Unele cer post, majoritatea nu. Întrebați medicul care le-a cerut sau clinica unde se recoltează, în loc să postiți preventiv. Beți apă, dacă nu vi s-a spus altfel.",
      },
      {
        q: "Cât durează rezultatele?",
        a: "Variază după analiză și după laborator — pachetele de rutină sunt de obicei rapide, în timp ce dozările specializate se trimit mai departe și durează mai mult. Clinica unde se recoltează vă poate spune termenul estimat pentru analizele dumneavoastră.",
      },
      {
        q: "Ce înseamnă o valoare în afara intervalului normal?",
        a: "Adesea foarte puțin, luată singură. Intervalele descriu unde se încadrează majoritatea rezultatelor într-o populație de referință, sunt specifice laboratorului care a procesat proba, iar o boală recentă, efortul, deshidratarea sau suplimentele pot mișca valorile fără să existe boală. Un rezultat modificat neașteptat se repetă de obicei înainte de concluzii.",
      },
      {
        q: "Pot face analize fără să văd niciun medic?",
        a: "Da, prin furnizori privați cu programare directă. Compromisul este că alegeți singur pachetul și nu există nimeni responsabil clinic de buletin. Dacă motivul este un simptom, nu curiozitatea, o consultație prealabilă produce de obicei un set de analize mai util.",
      },
    ],
    disclaimerTitle: "Aviz medical",
    disclaimer:
      "Scris de Dr Tiago Miguel Figueira (IMC 523449), director clinic al Global Health, și revizuit clinic de Dr Ahmed Maklad, medic de familie. Articolul conține informații generale despre analizele de laborator în Irlanda și nu constituie sfat medical personalizat. Nu înlocuiește evaluarea unui medic care vă cunoaște istoricul și nu trebuie folosit pentru a vă interpreta propriul buletin sau pentru a modifica un tratament prescris. În caz de urgență medicală, sunați imediat la 999 sau 112.",
  } satisfies Article,
};

const de: LocalePost = {
  locale: "DE",
  slug: "bluttest-dublin",
  title: "Bluttests in Dublin: wohin gehen, was verlangen und wie das Ergebnis zu lesen ist",
  excerpt:
    "Wo Sie in Dublin Blut abnehmen lassen können, warum die Anforderung wichtiger ist als das Paket, was die gängigen Werte tatsächlich messen und warum ein einzelner Wert außerhalb des Bereichs selten die Antwort ist.",
  seoTitle: "Bluttest in Dublin: Leitfaden vom Arzt",
  seoDescription:
    "Wo Sie in Dublin einen Bluttest machen lassen, ob Sie eine Anforderung brauchen, was gängige Paneele messen und was ein auffälliger Wert bedeutet.",
  category: "Allgemeinmedizin",
  article: {
    lang: "de-DE",
    tagline: "Medizin jederzeit und überall",
    categoryLabel: "Allgemeinmedizin",
    categoryHref: href("de", "/blog"),
    eyebrow: "Irland · Diagnostik-Leitfaden",
    h1: "Bluttests in Dublin",
    deck: "Die Blutabnahme ist der einfache Teil. Die richtige Untersuchung auszuwählen und danach zu wissen, was die Zahl bedeutet, ist der Teil, der ärztliche Beurteilung braucht.",
    intro:
      "In Dublin können Sie Blut in Ihrer <strong>Hausarztpraxis</strong> abnehmen lassen, in einer <strong>Blutentnahmestelle im Krankenhaus</strong>, wenn Sie überwiesen wurden, oder in einer <strong>privaten Praxis oder einem Labor</strong> mit Direkttermin. Der Unterschied ist nicht die Nadel, sondern ob jemand entschieden hat, welche Werte Sie brauchen, und ob jemand das Ergebnis im Licht Ihrer Beschwerden deutet. Ein aus einer Liste gewähltes Paket kann Sie über etwas beruhigen, das nie im Raum stand, und genau das verfehlen, weswegen Sie gekommen sind.",
    facts: ["Hausarzt, Krankenhaus oder privat", "Die Anforderung zählt mehr als das Paket", "Ergebnisse brauchen klinischen Kontext"],
    primaryCta: { label: "Sprechstunde und Anforderung buchen", href: href("de", "/services/referral-and-investigations") },
    secondaryCta: { label: "Unsere Laborwerte ansehen", href: href("de", "/lab-tests") },
    panelChip: "Was dieser Leitfaden abdeckt",
    panelParas: [
      "Die drei Wege zur Blutabnahme in Dublin und was jeder davon einschließt und was nicht.",
      "Was die gängigen Paneele tatsächlich messen, in klaren Worten — Blutbild, Nieren- und Leberwerte, Schilddrüse, Fette, HbA1c, Eisenstatus, Vitamin D und Entzündungsmarker.",
      "In diesem Artikel stehen weder Preise noch Referenzbereiche. Preise legt jeder Anbieter selbst fest, und Bereiche gelten spezifisch für das Labor, das Ihre Probe verarbeitet hat — Ihre stehen auf Ihrem eigenen Befund.",
    ],
    author: { initials: "TF", name: "Dr Tiago Miguel Figueira", line: "IMC 523449 · Ärztlicher Leiter, Global Health" },
    reviewLine: "Fachlich geprüft von Dr Ahmed Maklad, Allgemeinmediziner, Global Health Irland.",
    navLabel: "In diesem Artikel",
    sections: [
      {
        id: "where",
        nav: "Wohin gehen",
        eyebrow: "Zugang",
        h2: "Wo Sie in Dublin Blut abnehmen lassen können",
        blocks: [
          lead("Drei Wege, und sie sind nicht austauschbar — sie unterscheiden sich darin, wer entscheidet, was untersucht wird, und wer das Ergebnis erklärt."),
          ul([
            "<strong>Ihre Hausarztpraxis.</strong> Die Praxis, die Ihre Vorgeschichte kennt, wählt die Untersuchungen, und der Befund geht an die Stelle zurück, die ihn angefordert hat. Dieser Weg erzeugt die wenigsten herrenlosen Zahlen.",
            "<strong>Blutentnahme im Krankenhaus.</strong> Wird genutzt, wenn eine Klinikärztin bestimmte Werte angefordert hat, oft vor oder nach einem ambulanten Termin. In der Regel brauchen Sie die Anforderung, um vorstellig zu werden.",
            "<strong>Private Praxis oder Labor.</strong> Direkttermine, schnelle Verfügbarkeit, breite Auswahl an Paketen. Bequem und wirklich nützlich, wenn Sie wissen, was Sie brauchen — aber Sie wählen die Untersuchungen selbst aus, sofern keine ärztliche Person beteiligt ist.",
          ]),
          p("Daneben gibt es die Blutentnahme zu Hause durch Pflegekraft oder Entnahmedienst. Es gilt dasselbe: die Entnahme ist unkompliziert, der klinische Wert entsteht daraus, was angefordert wurde und wer es liest."),
          p(`Wenn Sie den Mittelweg wollen — ärztliche Auswahl der Werte und danach ein Labortermin —, genau dafür gibt es die Sprechstunde mit Anforderung. Unsere heißt <a href="${href("de", "/services/referral-and-investigations")}">Überweisung und diagnostische Untersuchungen</a>, und die Paneele, die wir organisieren können, stehen unter <a href="${href("de", "/lab-tests")}">Laborwerte</a>.`),
        ],
      },
      {
        id: "referral",
        nav: "Anforderung nötig?",
        eyebrow: "Die eigentliche Frage",
        h2: "Brauchen Sie eine Anforderung für einen privaten Bluttest?",
        blocks: [
          lead("Für die meisten privaten Direktbuchungen nein. Ob Sie eine haben <em>sollten</em>, ist eine andere Frage."),
          p("Private Anbieter in Dublin nehmen Ihre Buchung in der Regel ohne Anforderung an. Der Grund, trotzdem ärztlichen Rat einzubeziehen, ist keine Türsteherei: Die Auswahl der Untersuchung <em>ist</em> die laufende Diagnostik. Müdigkeit etwa ist kein einzelner Wert. Je nach Alter, Vorgeschichte, Medikation und übrigem Bild kann sie auf Eisenstatus, Schilddrüsenfunktion, Zöliakie-Screening, Glukosestoffwechsel, Nierenfunktion — oder auf nichts davon deuten."),
          ul([
            "Ärztliche Beurteilung engt ein Symptom auf die Werte ein, die das weitere Vorgehen wirklich ändern können.",
            "Sie weiß, welche Ihrer Medikamente welche Ergebnisse verzerren und zu welcher Tages- oder Zykluszeit die Probe genommen werden soll.",
            "Und sie ist es, die auf einen auffälligen Wert reagiert. Ein Befund, für den niemand zuständig ist, ist das häufigste Versagen der Direktvermarktung von Labortests.",
          ]),
          warn("Mehr Werte sind nicht mehr Information", "Sehr breite Paneele erzeugen zuverlässig leicht auffällige Werte bei völlig gesunden Menschen. Jeder davon muss dann erklärt, wiederholt oder abgeklärt werden. Breite ohne klinische Frage erzeugt Angst und Folgetermine, keine Antworten."),
        ],
      },
      {
        id: "common-tests",
        nav: "Gängige Werte",
        eyebrow: "Klar erklärt",
        h2: "Was die gängigen Werte tatsächlich messen",
        blocks: [
          lead("Das sind die Paneele, die auf fast jeder Liste der Stadt stehen, und wofür sie wirklich gut sind."),
          ul([
            "<strong>Blutbild.</strong> Die Zellen selbst — rote und weiße Blutkörperchen, Blutplättchen. Dient der Suche nach Blutarmut, Infektion und Gerinnungsproblemen.",
            "<strong>Harnstoff und Elektrolyte.</strong> Nierenfunktion sowie der Salz- und Wasserhaushalt, den die Niere steuert.",
            "<strong>Leberwerte.</strong> Eine Gruppe von Enzymen und Proteinen, die sich verändern, wenn Leber oder Gallenwege gereizt, verlegt oder entzündet sind.",
            "<strong>Schilddrüsenfunktion (TSH, manchmal T4).</strong> Ob die Schilddrüse zu schnell, zu langsam oder normal arbeitet.",
            "<strong>Lipidprofil.</strong> Cholesterinfraktionen und Triglyzeride, genutzt für das Herz-Kreislauf-Risiko, nicht dafür, wie Sie sich heute fühlen.",
            "<strong>HbA1c.</strong> Ein Mittelwert Ihres Blutzuckers der zurückliegenden Monate — zur Diagnose und Kontrolle des Diabetes.",
            "<strong>Ferritin und Eisenstatus.</strong> Die Eisenspeicher, die einen großen Teil unerklärter Müdigkeit erklären, besonders bei menstruierenden Frauen.",
            "<strong>Vitamin D.</strong> In Irland aus schlicht geografischen Gründen relevant und dann sinnvoll, wenn es einen Anlass gibt.",
            "<strong>CRP.</strong> Ein allgemeiner Entzündungsmarker. Er sagt Ihnen, dass etwas vorliegt; er sagt nicht, was.",
          ]),
          p("Beachten Sie, was keiner davon leistet: Keiner diagnostiziert für sich allein eine Krankheit. Sie engen Möglichkeiten ein. Und das gelingt nur, wenn jemand weiß, womit Sie gekommen sind."),
          cite(`Allgemeine Patienteninformation zu Bluttests: <a href="${HSE_BLOOD_TESTS}" rel="nofollow noopener" target="_blank">HSE</a>.`),
        ],
      },
      {
        id: "preparation",
        nav: "Vorbereitung",
        eyebrow: "Praktisch",
        h2: "Nüchternheit, Zeitpunkt und was Sie mitbringen",
        blocks: [
          lead("Die meisten Werte brauchen gar keine Vorbereitung. Einige brauchen eine sehr genaue — und ein Fehler bedeutet eine zweite Probe."),
          ul([
            "<strong>Nüchternheit</strong> ist für manche Werte nötig und für andere belanglos. Fasten Sie nicht vorsorglich — fragen Sie die anfordernde Praxis oder das Labor, ob Ihre konkreten Werte es verlangen.",
            "<strong>Trinken Sie Wasser</strong>, sofern nichts anderes gesagt wurde. Gut gefüllte Venen beschleunigen die Entnahme und verringern die Wahrscheinlichkeit eines zweiten Versuchs.",
            "<strong>Bei manchen Hormonen zählt der Zeitpunkt.</strong> Bestimmte Werte schwanken über den Tag oder den Zyklus, und die Anforderung sollte angeben, wann Sie kommen sollen.",
            "<strong>Bringen Sie Ihre Medikamentenliste mit</strong>, einschließlich Nahrungsergänzung. Besonders Biotin kann manche Laborverfahren stören, und hoch dosierte Präparate verzerren genau den Wert, den Sie messen wollen.",
            "<strong>Bringen Sie einen Lichtbildausweis mit</strong> und Ihre Daten so, wie sie auf der Anforderung stehen, damit die Probe der richtigen Person zugeordnet wird.",
          ]),
          p("Wenn Ihnen bei einer Blutabnahme schon einmal schwindelig wurde, sagen Sie es vor der Nadel und nicht danach. Es ist häufig, es ist beherrschbar, und vorher hinzulegen ist deutlich besser als aufgefangen zu werden."),
        ],
      },
      {
        id: "results",
        nav: "Befunde lesen",
        eyebrow: "Deutung",
        h2: "Warum ein Wert außerhalb des Bereichs selten das bedeutet, wonach es aussieht",
        blocks: [
          lead("Referenzbereiche sind keine Grenze zwischen gesund und krank. Sie beschreiben, wo die meisten Ergebnisse einer Referenzbevölkerung liegen."),
          p("Ein Wert leicht außerhalb des auf Ihrem Befund gedruckten Bereichs kann für Sie völlig normal sein. Und ein Wert innerhalb des Bereichs kann für Sie falsch sein — ein Ferritin am unteren Rand bei einer Frau mit starken Blutungen und Erschöpfung ist ein Befund, auch wenn nichts markiert ist. Deshalb sind Befund und Deutung zweierlei."),
          ul([
            "Bereiche gelten <strong>spezifisch für das Labor</strong>, das die Probe verarbeitet hat. Ihre Zahl mit einer aus dem Internet oder mit dem Befund einer Bekannten aus einem anderen Labor zu vergleichen, ist kein Vergleich desselben.",
            "<strong>Der Verlauf schlägt die Momentaufnahme.</strong> Zwei Werte im Abstand von Monaten sagen meist mehr als ein einzelner.",
            "<strong>Kürzliche Erkrankung, intensiver Sport, Alkohol, Flüssigkeitsmangel und manche Präparate</strong> verschieben Werte, ohne dass eine Krankheit vorliegt.",
            "Ein unerwartet auffälliger Wert wird häufig wiederholt, bevor daraus etwas geschlossen wird. Das ist gute Praxis, keine Unentschlossenheit.",
          ]),
          warn("Ändern Sie keine Therapie wegen eines Wertes", "Beginnen, beenden oder verändern Sie niemals ein verordnetes Medikament wegen einer Zahl auf einem Befund. Bringen Sie den Befund der Praxis, die diese Therapie führt.",
          ),
        ],
      },
      {
        id: "red-flags",
        nav: "Nicht warten",
        eyebrow: "Sicherheit",
        h2: "Wann ein Bluttest der falsche nächste Schritt ist",
        blocks: [
          lead("Manche Beschwerden brauchen jetzt eine Beurteilung, nicht eine Probe und Wartezeit."),
          ul([
            "Brustschmerz oder Druck, besonders mit Atemnot, Schweißausbruch oder Ausstrahlung in Arm oder Kiefer.",
            "Plötzliche Schwäche, hängender Mundwinkel, Sprachstörung oder plötzlicher heftiger Kopfschmerz.",
            "Atemnot in Ruhe.",
            "Ein Ausschlag, der sich nicht wegdrücken lässt, besonders mit Fieber, Nackensteife oder Verwirrtheit.",
            "Starke Blutung oder Erbrechen von Blut oder kaffeesatzartigem Material.",
            "Ungeklärter Gewichtsverlust, durchnässender Nachtschweiß oder ein wachsender Knoten — das gehört gesehen und untersucht, nicht bloß gescreent.",
          ]),
          p("Bei den ersten vier rufen Sie <strong>112</strong> oder <strong>999</strong> an oder gehen Sie in die nächste Notaufnahme. Bei den übrigen buchen Sie eine Beurteilung statt eines Pakets — die Untersuchung steuert die Diagnostik."),
        ],
      },
    ],
    linksEyebrow: "Global Health Irland",
    linksH2: "Wie es weitergeht",
    linksLead: "Unsere Ärztinnen und Ärzte in Irland beraten per Video, entscheiden, welche Werte in Ihrem Fall sinnvoll sind, und gehen den Befund danach mit Ihnen durch.",
    links: [
      { label: "Sprechstunde, Überweisung und diagnostische Untersuchungen", href: href("de", "/services/referral-and-investigations") },
      { label: "Laborwerte über Global Health Irland", href: href("de", "/lab-tests") },
      { label: "Die registrierten Ärztinnen und Ärzte unseres irischen Dienstes", href: href("de", "/doctors") },
      { label: "Global Health Irland kontaktieren", href: href("de", "/contact") },
    ],
    ctaBox: {
      h3: "Lassen Sie die Werte ärztlich auswählen",
      text: "Eine kurze Videosprechstunde macht aus einem Symptom eine konkrete Anforderung — und gibt Ihnen jemanden, der für den Befund zuständig ist, wenn er kommt.",
      primary: { label: "Termin buchen", href: href("de", "/services/referral-and-investigations") },
      secondary: { label: "Unsere Ärztinnen und Ärzte", href: href("de", "/doctors") },
    },
    sourcesEyebrow: "Offizielle Quellen",
    sourcesH2: "Wo Sie es unabhängig prüfen",
    sourcesLead: "Patienteninformationen zu Bluttests und wie Sie prüfen, ob die Person, die Ihren Befund deutet, in Irland zur Berufsausübung registriert ist.",
    sources: [
      { label: "HSE — Bluttests", href: HSE_BLOOD_TESTS },
      { label: "Medical Council — Register prüfen", href: MEDICAL_COUNCIL },
    ],
    sourcesNote: "Die Links führen auf die Seite der jeweiligen Stelle. Die Referenzbereiche auf Ihrem eigenen Laborbefund haben immer Vorrang vor allgemeinen Informationen, auch vor diesem Artikel.",
    faqEyebrow: "FAQ",
    faqH2: "Häufige Fragen",
    faqs: [
      {
        q: "Wo kann ich in Dublin einen Bluttest machen lassen?",
        a: "In Ihrer Hausarztpraxis, in einer Blutentnahmestelle im Krankenhaus, wenn eine Klinikärztin die Werte angefordert hat, oder in einer privaten Praxis oder einem Labor mit Direkttermin. Auch die Entnahme zu Hause ist möglich. Der Unterschied liegt darin, wer die Untersuchungen festlegt und wer den Befund deutet, nicht in der Entnahme selbst.",
      },
      {
        q: "Brauche ich eine Anforderung für einen privaten Bluttest?",
        a: "Meist nicht — die meisten privaten Anbieter nehmen Direktbuchungen an. Ärztliche Beteiligung lohnt sich trotzdem, weil die Auswahl der richtigen Werte Teil der Diagnostik ist und weil ein auffälliger Befund jemanden braucht, der klinisch dafür zuständig ist.",
      },
      {
        q: "Muss ich nüchtern sein?",
        a: "Das hängt vollständig von den Untersuchungen ab. Manche verlangen Nüchternheit, die meisten nicht. Fragen Sie die anfordernde Praxis oder die entnehmende Stelle, statt vorsorglich zu fasten. Trinken Sie Wasser, sofern nichts anderes gesagt wurde.",
      },
      {
        q: "Wie lange dauern die Ergebnisse?",
        a: "Das hängt von Untersuchung und Labor ab — Routinepaneele sind meist schnell, spezialisierte Verfahren werden weitergeleitet und dauern länger. Die Stelle, die Ihre Probe nimmt, kann Ihnen die erwartete Dauer für Ihre konkreten Werte nennen.",
      },
      {
        q: "Was bedeutet ein Wert außerhalb des Normbereichs?",
        a: "Für sich genommen oft sehr wenig. Referenzbereiche beschreiben, wo die meisten Ergebnisse einer Referenzbevölkerung liegen, sie gelten spezifisch für das verarbeitende Labor, und kürzliche Erkrankung, Sport, Flüssigkeitsmangel oder Präparate verschieben Werte auch ohne Krankheit. Ein unerwartet auffälliger Wert wird meist wiederholt, bevor Schlüsse gezogen werden.",
      },
      {
        q: "Kann ich Werte ganz ohne ärztlichen Kontakt bestimmen lassen?",
        a: "Ja, über private Anbieter mit Direktbuchung. Der Preis dafür ist, dass Sie das Paket selbst wählen und niemand klinisch für den Befund zuständig ist. Wenn der Anlass ein Symptom und nicht Neugier ist, führt eine vorherige Sprechstunde meist zu einem nützlicheren Satz an Untersuchungen.",
      },
    ],
    disclaimerTitle: "Medizinischer Hinweis",
    disclaimer:
      "Verfasst von Dr Tiago Miguel Figueira (IMC 523449), Ärztlicher Leiter von Global Health, fachlich geprüft von Dr Ahmed Maklad, Allgemeinmediziner. Dieser Artikel enthält allgemeine Informationen zur Labordiagnostik in Irland und ersetzt keine persönliche ärztliche Beratung. Er ersetzt nicht die Beurteilung durch eine Praxis, die Ihre Vorgeschichte kennt, und darf weder zur Deutung des eigenen Befundes noch zur Änderung einer verordneten Therapie verwendet werden. Rufen Sie im medizinischen Notfall sofort 999 oder 112 an.",
  } satisfies Article,
};

export const IE_BLOOD_TESTS: PostSet = {
  key: "ie-blood-tests",
  countryCode: "ie",
  targetKeyword: "blood test dublin",
  searchVolume: 1600,
  keywordDifficulty: 0,
  evidence:
    "KD 0 at 1,600/mo with a local pack. SERP page 1 is entirely private phlebotomy product pages (liffeymedical.ie, thehealthlab.ie, bloodworks.ie, fola.care, dbt-bloodtest.ie, mccabespharmacy.com) — no doctor-authored explanation of test selection or interpretation. Supporting: 'blood tests ireland' 390 KD 0, 'private blood test dublin' KD 0, 'vitamin d test ireland' 40 KD 0. GSC: 'online lab test consultations' 123 impressions at pos 62 on /ireland/en/lab-tests.",
  serviceSlug: "referral-and-investigations",
  authorDoctorId: "cmp5r0if3002kssjug743x0p6",
  authorDisplayName: "Global Health Medical Team",
  reviewerDoctorId: "cmqas8yh9000b01pgpc0yp1la",
  reviewerDisplayName: "Dr Ahmed Maklad",
  posts: [en, pt, es, cs, roPost, de],
};
