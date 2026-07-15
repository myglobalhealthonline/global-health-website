/**
 * Ireland Lab Tests page — non-EN locale translation pass (July 2026).
 *
 * Same false-claim removal as seed-ireland-labtests-brief.ts (EN), applied to
 * the 5 non-EN IE locales: PT, ES, CS, RO, DE. Owner-approved 2026-07-14.
 *
 *   npx tsx scripts/seed-ireland-labtests-locales.ts          # dry run
 *   npx tsx scripts/seed-ireland-labtests-locales.ts --apply  # write (PROD)
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");
const PAGE_KEY = "HEALTH_TESTS";

type LocaleCode = "PT" | "ES" | "CS" | "RO" | "DE";

type PageCopy = {
  heroTitle: string;
  heroSubtitle: string;
  seoTitle: string;
  seoDescription: string;
  intro: string;
  whoForTitle: string;
  whoForIntro: string;
  whoForItems: string[];
  whyChooseTitle: string;
  whyChooseItems: string[];
  faq: { question: string; answer: string }[];
  disclaimerParagraphs: string[];
  disclaimerShort: string;
};

type CardCopy = {
  resultsTimeline: string;
  sampleType: string;
  shortDescription: string;
};

const PAGE_COPY: Record<LocaleCode, PageCopy> = {
  PT: {
    heroTitle: "Testes de Sangue ao Domicílio na Irlanda — Kits Laboratoriais Randox, Resultados em até 10 Dias",
    heroSubtitle:
      "Encomende um kit de teste de sangue Randox para realizar em casa, recolha a sua amostra em casa e receba os seus resultados em até 10 dias. Quer que um médico lhe explique os resultados? Marque uma consulta de acompanhamento com um médico da Global Health inscrito no Irish Medical Council, a partir de €45.",
    seoTitle: "Testes de Sangue ao Domicílio na Irlanda — Kits Laboratoriais Randox | Global Health",
    seoDescription:
      "Encomende um kit de teste de sangue Randox na Irlanda a partir de €89. Hemograma Completo, Função Tiroideia e mais. Recolha a sua amostra em casa e receba os resultados em até 10 dias. Marque uma consulta de acompanhamento com um médico inscrito no Irish Medical Council a partir de €45.",
    intro:
      "A Global Health oferece kits de teste de sangue Randox ao domicílio na Irlanda — testes de qualidade clínica que realiza você mesmo em casa. Encomende o seu kit, recolha a sua amostra seguindo as instruções fornecidas e envie-a para o laboratório Randox no envelope de porte pago incluído. A Randox entrega os seus resultados digitalmente em até 10 dias. Se desejar que um médico lhe explique o que significam os seus resultados, pode marcar uma consulta de acompanhamento opcional com um médico da Global Health inscrito no Irish Medical Council, a partir de €45.",
    whoForTitle: "Para quem são estes testes",
    whoForIntro: "Os nossos testes de sangue ao domicílio podem ser adequados se está a considerar:",
    whoForItems: [
      "Hemograma Completo — para fadiga e baixa energia, suspeita de anemia, preocupações imunitárias ou uma verificação de saúde de rotina",
      "Teste de Função Tiroideia — para alterações de peso inexplicadas, fadiga, queda de cabelo, sensação constante de frio ou períodos irregulares",
      "Rastreio de saúde de rotina e verificações gerais de bem-estar a partir de casa",
      "Monitorização de uma condição conhecida entre consultas de clínico geral",
    ],
    whyChooseTitle: "Como funciona",
    whyChooseItems: [
      "Encomende o seu kit Randox — escolha o seu teste e adicione-o ao carrinho. O seu kit é enviado no prazo de 1 a 2 dias úteis.",
      "Recolha a sua amostra em casa — siga as instruções incluídas no kit (picada no dedo ou autocolheita venosa, consoante o teste).",
      "Envie a sua amostra para o laboratório Randox — em cada kit está incluído um envelope de devolução com porte pago.",
      "Receba os seus resultados — a Randox entrega os seus resultados digitalmente em até 10 dias.",
      "Opcional — marque uma consulta de acompanhamento com um médico da Global Health inscrito no Irish Medical Council, a partir de €45, para rever os seus resultados e aconselhar sobre os passos seguintes.",
    ],
    faq: [
      {
        question: "Como funciona um kit de teste de sangue ao domicílio?",
        answer:
          "Encomenda o seu kit online, recolhe a sua própria amostra em casa seguindo as instruções passo a passo fornecidas, e envia-a para o laboratório Randox utilizando o envelope de porte pago incluído. A Randox analisa a sua amostra e entrega os seus resultados digitalmente em até 10 dias.",
      },
      {
        question: "É difícil fazer uma colheita de sangue venosa em casa?",
        answer:
          "O kit de autocolheita venosa foi concebido para uso doméstico e inclui instruções claras. O Hemograma Completo também está disponível como uma amostra mais simples por picada no dedo. Não precisa de visitar uma clínica.",
      },
      {
        question: "Quanto tempo demoram os resultados?",
        answer: "A Randox entrega os seus resultados digitalmente em até 10 dias após a receção da sua amostra.",
      },
      {
        question: "Quem analisa a minha amostra de sangue?",
        answer:
          "A sua amostra é analisada pela Randox, um laboratório acreditado pela UKAS, com reconhecimento no Reino Unido e na Irlanda. Os seus resultados são entregues diretamente pela Randox.",
      },
      {
        question: "O que acontece se os meus resultados mostrarem algo anormal?",
        answer:
          "Os seus resultados são entregues pela Randox. Se algo parecer anormal, ou não tiver a certeza do que significam os seus resultados, recomendamos marcar uma consulta de acompanhamento com um médico da Global Health inscrito no Irish Medical Council (a partir de €45), que pode explicar os seus resultados e aconselhar sobre os passos seguintes. Em caso de emergência médica, ligue 112 ou dirija-se ao serviço de urgência mais próximo.",
      },
      {
        question: "A consulta médica está incluída nos €89?",
        answer:
          "Não. Os €89 cobrem o kit de teste Randox e a respetiva análise laboratorial. A revisão médica é opcional e é marcada separadamente como uma consulta de acompanhamento com um médico da Global Health inscrito no Irish Medical Council, a partir de €45.",
      },
      {
        question: "Posso fazer estes testes através do HSE?",
        answer:
          "Alguns testes de sangue podem estar disponíveis através do HSE ou do seu médico de família, por vezes sem custos. Os nossos kits de teste ao domicílio são uma opção privada e conveniente que pode encomendar e realizar em casa, sem necessidade de referenciação ou de esperar por uma consulta.",
      },
      {
        question: "Os testes Randox são clinicamente fiáveis?",
        answer:
          "Sim. A Randox é um laboratório acreditado pela UKAS e os kits são de qualidade clínica. A qualidade da amostra depende do cumprimento das instruções de recolha fornecidas no seu kit.",
      },
    ],
    disclaimerParagraphs: [
      "Os kits de teste de sangue ao domicílio oferecidos pela Global Health na Irlanda são fornecidos e analisados pela Randox, um laboratório acreditado pela UKAS. Os seus resultados são entregues diretamente pela Randox.",
      "Um resultado de teste não constitui, por si só, um diagnóstico. A revisão médica não está incluída no preço do kit. Se desejar que os seus resultados sejam explicados, pode marcar uma consulta de acompanhamento opcional, a partir de €45, com um médico inscrito no Irish Medical Council, que pode aconselhar sobre quaisquer passos seguintes recomendados, ao seu critério profissional.",
      "Os nossos médicos não prescrevem rotineiramente substâncias controladas através de consultas online.",
      "Os testes de sangue ao domicílio não são adequados para emergências médicas. Se estiver a passar por uma emergência médica, contacte imediatamente os serviços de emergência ligando 112 ou dirija-se ao serviço de urgência mais próximo.",
    ],
    disclaimerShort:
      "Os kits de teste de sangue ao domicílio na Irlanda são fornecidos e analisados pela Randox, um laboratório acreditado pela UKAS, e os resultados são entregues diretamente. Um resultado de teste não constitui, por si só, um diagnóstico, e a revisão médica não está incluída no preço do kit — está disponível separadamente uma consulta de acompanhamento opcional com um médico inscrito no Irish Medical Council, a partir de €45. Em caso de emergência médica, ligue 112.",
  },
  ES: {
    heroTitle: "Análisis de Sangre a Domicilio en Irlanda — Kits de Laboratorio Randox, Resultados en hasta 10 Días",
    heroSubtitle:
      "Solicita un kit de análisis de sangre Randox para hacer en casa, recoge tu muestra en casa y recibe tus resultados en hasta 10 días. ¿Quieres que un médico te explique tus resultados? Reserva una consulta de seguimiento con un médico de Global Health colegiado en el Irish Medical Council, desde 45 €.",
    seoTitle: "Análisis de Sangre a Domicilio en Irlanda — Kits de Laboratorio Randox | Global Health",
    seoDescription:
      "Solicita un kit de análisis de sangre Randox en Irlanda desde 89 €. Hemograma Completo, Función Tiroidea y más. Recoge tu muestra en casa y recibe los resultados en hasta 10 días. Reserva una consulta de seguimiento con un médico colegiado en el Irish Medical Council desde 45 €.",
    intro:
      "Global Health ofrece kits de análisis de sangre Randox a domicilio en Irlanda — pruebas de calidad clínica que realizas tú mismo en casa. Solicita tu kit, recoge tu muestra siguiendo las instrucciones proporcionadas y envíala al laboratorio Randox en el sobre de franqueo pagado incluido. Randox entrega tus resultados digitalmente en hasta 10 días. Si deseas que un médico te explique lo que significan tus resultados, puedes reservar una consulta de seguimiento opcional con un médico de Global Health colegiado en el Irish Medical Council, desde 45 €.",
    whoForTitle: "Para quién son estas pruebas",
    whoForIntro: "Nuestros análisis de sangre a domicilio pueden ser adecuados si estás considerando:",
    whoForItems: [
      "Hemograma Completo — para fatiga y falta de energía, sospecha de anemia, preocupaciones inmunitarias o una revisión de salud rutinaria",
      "Prueba de Función Tiroidea — para cambios de peso inexplicables, fatiga, caída del cabello, sensación constante de frío o periodos irregulares",
      "Cribado de salud rutinario y revisiones generales de bienestar desde casa",
      "Seguimiento de una afección conocida entre visitas al médico de cabecera",
    ],
    whyChooseTitle: "Cómo funciona",
    whyChooseItems: [
      "Solicita tu kit Randox — elige tu prueba y añádela a tu carrito. Tu kit se envía en 1-2 días laborables.",
      "Recoge tu muestra en casa — sigue las instrucciones incluidas en el kit (punción en el dedo o autoextracción venosa, según la prueba).",
      "Envía tu muestra al laboratorio Randox — cada kit incluye un sobre de devolución con franqueo pagado.",
      "Recibe tus resultados — Randox entrega tus resultados digitalmente en hasta 10 días.",
      "Opcional — reserva una consulta de seguimiento con un médico de Global Health colegiado en el Irish Medical Council, desde 45 €, para revisar tus resultados y asesorarte sobre los siguientes pasos.",
    ],
    faq: [
      {
        question: "¿Cómo funciona un kit de análisis de sangre a domicilio?",
        answer:
          "Solicitas tu kit online, recoges tu propia muestra en casa siguiendo las instrucciones paso a paso proporcionadas, y la envías al laboratorio Randox utilizando el sobre de franqueo pagado incluido. Randox analiza tu muestra y entrega tus resultados digitalmente en hasta 10 días.",
      },
      {
        question: "¿Es difícil hacerse una extracción de sangre venosa en casa?",
        answer:
          "El kit de autoextracción venosa está diseñado para uso doméstico e incluye instrucciones claras. El Hemograma Completo también está disponible como una muestra más sencilla por punción en el dedo. No necesitas visitar una clínica.",
      },
      {
        question: "¿Cuánto tardan los resultados?",
        answer: "Randox entrega tus resultados digitalmente en hasta 10 días tras recibir tu muestra.",
      },
      {
        question: "¿Quién analiza mi muestra de sangre?",
        answer:
          "Tu muestra es analizada por Randox, un laboratorio acreditado por la UKAS y de confianza en el Reino Unido e Irlanda. Tus resultados te los entrega directamente Randox.",
      },
      {
        question: "¿Qué ocurre si mis resultados muestran algo anómalo?",
        answer:
          "Tus resultados te los entrega Randox. Si algo parece anómalo, o no estás seguro de qué significan tus resultados, te recomendamos reservar una consulta de seguimiento con un médico de Global Health colegiado en el Irish Medical Council (desde 45 €), que puede explicarte tus resultados y asesorarte sobre los siguientes pasos. En caso de emergencia médica, llama al 112 o acude a tu servicio de urgencias más cercano.",
      },
      {
        question: "¿La consulta médica está incluida en los 89 €?",
        answer:
          "No. Los 89 € cubren el kit de análisis Randox y su análisis de laboratorio. La revisión médica es opcional y se reserva por separado como una consulta de seguimiento con un médico de Global Health colegiado en el Irish Medical Council, desde 45 €.",
      },
      {
        question: "¿Puedo hacerme estas pruebas a través del HSE?",
        answer:
          "Algunos análisis de sangre pueden estar disponibles a través del HSE o de tu médico de cabecera, a veces sin coste. Nuestros kits de prueba a domicilio son una opción privada y cómoda que puedes solicitar y completar en casa, sin necesidad de derivación ni de esperar una cita.",
      },
      {
        question: "¿Son fiables clínicamente las pruebas Randox?",
        answer:
          "Sí. Randox es un laboratorio acreditado por la UKAS y los kits son de calidad clínica. La calidad de la muestra depende de seguir las instrucciones de recogida incluidas en tu kit.",
      },
    ],
    disclaimerParagraphs: [
      "Los kits de análisis de sangre a domicilio ofrecidos por Global Health en Irlanda son proporcionados y analizados por Randox, un laboratorio acreditado por la UKAS. Tus resultados te los entrega directamente Randox.",
      "Un resultado de prueba no constituye por sí mismo un diagnóstico. La revisión médica no está incluida en el precio del kit. Si deseas que te expliquen tus resultados, puedes reservar una consulta de seguimiento opcional, desde 45 €, con un médico colegiado en el Irish Medical Council, que puede asesorarte sobre cualquier siguiente paso recomendado, a su criterio profesional.",
      "Nuestros médicos no recetan de forma rutinaria sustancias controladas a través de consultas online.",
      "Los análisis de sangre a domicilio no son adecuados para emergencias médicas. Si estás sufriendo una emergencia médica, contacta con los servicios de emergencia inmediatamente llamando al 112 o acude a tu servicio de urgencias más cercano.",
    ],
    disclaimerShort:
      "Los kits de análisis de sangre a domicilio en Irlanda son proporcionados y analizados por Randox, un laboratorio acreditado por la UKAS, y los resultados se entregan directamente. Un resultado de prueba no constituye por sí mismo un diagnóstico, y la revisión médica no está incluida en el precio del kit — hay disponible por separado una consulta de seguimiento opcional con un médico colegiado en el Irish Medical Council, desde 45 €. En caso de emergencia médica, llama al 112.",
  },
  CS: {
    heroTitle: "Domácí Krevní Testy v Irsku — Laboratorní Sady Randox, Výsledky do 10 Dnů",
    heroSubtitle:
      "Objednejte si domácí sadu na krevní test Randox, odeberte si vzorek doma a obdržíte výsledky do 10 dnů. Chcete, aby vám výsledky vysvětlil lékař? Objednejte si následnou konzultaci s lékařem Global Health registrovaným u Irish Medical Council, od 45 €.",
    seoTitle: "Domácí Krevní Testy v Irsku — Laboratorní Sady Randox | Global Health",
    seoDescription:
      "Objednejte si domácí sadu na krevní test Randox v Irsku od 89 €. Kompletní krevní obraz, test funkce štítné žlázy a další. Odeberte si vzorek doma a obdržíte výsledky do 10 dnů. Objednejte si následnou konzultaci s lékařem registrovaným u Irish Medical Council od 45 €.",
    intro:
      "Global Health nabízí v Irsku domácí sady na krevní testy Randox — klinicky kvalitní testy, které si provedete sami doma. Objednejte si sadu, odeberte vzorek podle přiložených pokynů a odešlete jej do laboratoře Randox v přiložené obálce s předplaceným poštovným. Randox doručí vaše výsledky digitálně do 10 dnů. Pokud chcete, aby vám lékař vysvětlil, co vaše výsledky znamenají, můžete si objednat volitelnou následnou konzultaci s lékařem Global Health registrovaným u Irish Medical Council, od 45 €.",
    whoForTitle: "Pro koho jsou tyto testy určeny",
    whoForIntro: "Naše domácí krevní testy mohou být vhodné, pokud řešíte:",
    whoForItems: [
      "Kompletní krevní obraz — při únavě a nedostatku energie, podezření na anémii, obavách o imunitu nebo v rámci běžné zdravotní kontroly",
      "Test funkce štítné žlázy — při nevysvětlitelných změnách hmotnosti, únavě, vypadávání vlasů, trvalém pocitu chladu nebo nepravidelné menstruaci",
      "Běžný zdravotní screening a kontrolu celkové pohody z domova",
      "Sledování známého zdravotního stavu mezi návštěvami praktického lékaře",
    ],
    whyChooseTitle: "Jak to funguje",
    whyChooseItems: [
      "Objednejte si sadu Randox — vyberte test a vložte jej do košíku. Vaše sada je odeslána do 1–2 pracovních dnů.",
      "Odeberte si vzorek doma — postupujte podle pokynů přiložených k sadě (odběr z prstu nebo žilní samoodběr, podle typu testu).",
      "Odešlete vzorek do laboratoře Randox — každá sada obsahuje obálku s předplaceným poštovným pro vrácení.",
      "Obdržíte výsledky — Randox doručí vaše výsledky digitálně do 10 dnů.",
      "Volitelně — objednejte si následnou konzultaci s lékařem Global Health registrovaným u Irish Medical Council, od 45 €, který s vámi projde výsledky a poradí ohledně dalších kroků.",
    ],
    faq: [
      {
        question: "Jak funguje domácí sada na krevní test?",
        answer:
          "Sadu si objednáte online, doma si sami odeberete vzorek podle přiložených podrobných pokynů a odešlete jej do laboratoře Randox v přiložené obálce s předplaceným poštovným. Randox váš vzorek analyzuje a výsledky doručí digitálně do 10 dnů.",
      },
      {
        question: "Je žilní odběr krve doma náročný?",
        answer:
          "Sada pro žilní samoodběr je určena pro domácí použití a obsahuje jasné pokyny. Kompletní krevní obraz je k dispozici i jako jednodušší vzorek z prstu. Návštěva kliniky není nutná.",
      },
      {
        question: "Jak dlouho trvá získání výsledků?",
        answer: "Randox doručí vaše výsledky digitálně do 10 dnů od přijetí vzorku.",
      },
      {
        question: "Kdo analyzuje můj vzorek krve?",
        answer:
          "Váš vzorek analyzuje Randox, laboratoř akreditovaná UKAS, které důvěřují ve Velké Británii i v Irsku. Výsledky vám doručuje přímo Randox.",
      },
      {
        question: "Co se stane, pokud moje výsledky ukážou něco neobvyklého?",
        answer:
          "Výsledky vám doručuje Randox. Pokud vám něco připadá neobvyklé, nebo si nejste jisti, co výsledky znamenají, doporučujeme objednat si následnou konzultaci s lékařem Global Health registrovaným u Irish Medical Council (od 45 €), který vám výsledky vysvětlí a poradí s dalšími kroky. V případě zdravotní pohotovosti volejte 112 nebo vyhledejte nejbližší pohotovost.",
      },
      {
        question: "Je konzultace s lékařem zahrnuta v ceně 89 €?",
        answer:
          "Ne. Cena 89 € zahrnuje sadu Randox a její laboratorní analýzu. Posouzení lékařem je volitelné a objednává se samostatně jako následná konzultace s lékařem Global Health registrovaným u Irish Medical Council, od 45 €.",
      },
      {
        question: "Mohu si tyto testy nechat udělat přes HSE?",
        answer:
          "Některé krevní testy mohou být dostupné přes HSE nebo vašeho praktického lékaře, někdy zdarma. Naše domácí testovací sady jsou pohodlnou soukromou alternativou, kterou si můžete objednat a provést doma bez doporučení nebo čekání na termín.",
      },
      {
        question: "Jsou testy Randox klinicky spolehlivé?",
        answer:
          "Ano. Randox je laboratoř akreditovaná UKAS a sady jsou klinické kvality. Kvalita vzorku závisí na dodržení pokynů k odběru přiložených k sadě.",
      },
    ],
    disclaimerParagraphs: [
      "Domácí sady na krevní test nabízené prostřednictvím Global Health v Irsku poskytuje a analyzuje Randox, laboratoř akreditovaná UKAS. Výsledky vám doručuje přímo Randox.",
      "Výsledek testu sám o sobě nepředstavuje diagnózu. Posouzení lékařem není zahrnuto v ceně sady. Pokud chcete, aby vám výsledky někdo vysvětlil, můžete si objednat volitelnou následnou konzultaci, od 45 €, s lékařem registrovaným u Irish Medical Council, který vám dle vlastního odborného uvážení poradí ohledně případných dalších doporučených kroků.",
      "Naši lékaři běžně nepředepisují kontrolované látky prostřednictvím online konzultací.",
      "Domácí krevní testy nejsou vhodné pro zdravotní pohotovost. Pokud se nacházíte ve zdravotní pohotovosti, okamžitě kontaktujte záchrannou službu na čísle 112 nebo vyhledejte nejbližší pohotovost.",
    ],
    disclaimerShort:
      "Domácí sady na krevní test v Irsku poskytuje a analyzuje Randox, laboratoř akreditovaná UKAS, a výsledky jsou doručovány přímo vám. Výsledek testu sám o sobě nepředstavuje diagnózu a posouzení lékařem není zahrnuto v ceně sady — volitelnou následnou konzultaci s lékařem registrovaným u Irish Medical Council lze objednat samostatně od 45 €. V případě zdravotní pohotovosti volejte 112.",
  },
  RO: {
    heroTitle: "Teste de Sânge la Domiciliu în Irlanda — Kituri de Laborator Randox, Rezultate în până la 10 Zile",
    heroSubtitle:
      "Comandă un kit de test de sânge Randox pentru acasă, recoltează proba la domiciliu și primește rezultatele în până la 10 zile. Vrei ca un medic să îți explice rezultatele? Programează o consultație ulterioară cu un medic Global Health înregistrat la Irish Medical Council, de la 45 €.",
    seoTitle: "Teste de Sânge la Domiciliu în Irlanda — Kituri de Laborator Randox | Global Health",
    seoDescription:
      "Comandă un kit de test de sânge Randox în Irlanda de la 89 €. Hemoleucogramă completă, testul funcției tiroidiene și altele. Recoltează proba acasă și primește rezultatele în până la 10 zile. Programează o consultație ulterioară cu un medic înregistrat la Irish Medical Council de la 45 €.",
    intro:
      "Global Health oferă kituri de test de sânge Randox pentru domiciliu în Irlanda — teste de calitate clinică pe care le realizezi singur, acasă. Comandă kitul, recoltează proba urmând instrucțiunile incluse și trimite-o către laboratorul Randox în plicul cu taxă poștală inclusă. Randox îți livrează rezultatele digital, în până la 10 zile. Dacă dorești ca un medic să îți explice ce înseamnă rezultatele, poți programa o consultație ulterioară opțională cu un medic Global Health înregistrat la Irish Medical Council, de la 45 €.",
    whoForTitle: "Pentru cine sunt aceste teste",
    whoForIntro: "Testele noastre de sânge la domiciliu pot fi potrivite dacă iei în considerare:",
    whoForItems: [
      "Hemoleucogramă completă — pentru oboseală și energie scăzută, suspiciune de anemie, îngrijorări legate de imunitate sau un control de rutină al stării de sănătate",
      "Testul funcției tiroidiene — pentru schimbări inexplicabile în greutate, oboseală, cădere a părului, senzație constantă de frig sau cicluri menstruale neregulate",
      "Screening de sănătate de rutină și verificări generale ale stării de bine, de acasă",
      "Monitorizarea unei afecțiuni cunoscute între vizitele la medicul de familie",
    ],
    whyChooseTitle: "Cum funcționează",
    whyChooseItems: [
      "Comandă kitul Randox — alege testul dorit și adaugă-l în coș. Kitul este expediat în 1–2 zile lucrătoare.",
      "Recoltează proba acasă — urmează instrucțiunile incluse în kit (înțepătură pe deget sau autorecoltare venoasă, în funcție de test).",
      "Trimite proba către laboratorul Randox — fiecare kit include un plic de retur cu taxă poștală inclusă.",
      "Primește rezultatele — Randox îți livrează rezultatele digital, în până la 10 zile.",
      "Opțional — programează o consultație ulterioară cu un medic Global Health înregistrat la Irish Medical Council, de la 45 €, pentru a-ți analiza rezultatele și a te sfătui cu privire la pașii următori.",
    ],
    faq: [
      {
        question: "Cum funcționează un kit de test de sânge la domiciliu?",
        answer:
          "Comanzi kitul online, recoltezi singur proba acasă urmând instrucțiunile pas cu pas incluse și o trimiți către laboratorul Randox folosind plicul cu taxă poștală inclusă. Randox îți analizează proba și livrează rezultatele digital, în până la 10 zile.",
      },
      {
        question: "Este dificilă o recoltare venoasă de sânge acasă?",
        answer:
          "Kitul de autorecoltare venoasă este conceput pentru uz casnic și vine cu instrucțiuni clare. Hemoleucograma completă este disponibilă și ca o probă mai simplă, prin înțepătură pe deget. Nu este nevoie să vizitezi o clinică.",
      },
      {
        question: "Cât durează obținerea rezultatelor?",
        answer: "Randox îți livrează rezultatele digital, în până la 10 zile de la primirea probei.",
      },
      {
        question: "Cine îmi analizează proba de sânge?",
        answer:
          "Proba ta este analizată de Randox, un laborator acreditat UKAS, de încredere în Regatul Unit și în Irlanda. Rezultatele îți sunt livrate direct de Randox.",
      },
      {
        question: "Ce se întâmplă dacă rezultatele mele arată ceva anormal?",
        answer:
          "Rezultatele îți sunt livrate de Randox. Dacă ceva pare anormal sau nu ești sigur ce înseamnă rezultatele, îți recomandăm să programezi o consultație ulterioară cu un medic Global Health înregistrat la Irish Medical Council (de la 45 €), care îți poate explica rezultatele și te poate sfătui cu privire la pașii următori. În caz de urgență medicală, sună la 112 sau mergi la cea mai apropiată unitate de primiri urgențe.",
      },
      {
        question: "Consultația medicală este inclusă în cei 89 €?",
        answer:
          "Nu. Cei 89 € acoperă kitul de test Randox și analiza sa de laborator. Analiza medicului este opțională și se programează separat, ca o consultație ulterioară cu un medic Global Health înregistrat la Irish Medical Council, de la 45 €.",
      },
      {
        question: "Pot face aceste teste prin HSE?",
        answer:
          "Unele teste de sânge pot fi disponibile prin HSE sau prin medicul tău de familie, uneori gratuit. Kiturile noastre de testare la domiciliu reprezintă o opțiune privată și convenabilă, pe care o poți comanda și realiza acasă, fără trimitere și fără să aștepți o programare.",
      },
      {
        question: "Sunt testele Randox fiabile din punct de vedere clinic?",
        answer:
          "Da. Randox este un laborator acreditat UKAS, iar kiturile sunt de calitate clinică. Calitatea probei depinde de respectarea instrucțiunilor de recoltare incluse în kit.",
      },
    ],
    disclaimerParagraphs: [
      "Kiturile de test de sânge la domiciliu oferite prin Global Health în Irlanda sunt furnizate și analizate de Randox, un laborator acreditat UKAS. Rezultatele îți sunt livrate direct de Randox.",
      "Un rezultat al testului nu constituie, prin el însuși, un diagnostic. Analiza medicului nu este inclusă în prețul kitului. Dacă dorești ca rezultatele să îți fie explicate, poți programa o consultație ulterioară opțională, de la 45 €, cu un medic înregistrat la Irish Medical Council, care te poate sfătui cu privire la orice pași următori recomandați, la latitudinea sa profesională.",
      "Medicii noștri nu prescriu, de regulă, substanțe controlate prin consultații online.",
      "Testele de sânge la domiciliu nu sunt potrivite pentru urgențe medicale. Dacă te confrunți cu o urgență medicală, contactează imediat serviciile de urgență sunând la 112 sau mergi la cea mai apropiată unitate de primiri urgențe.",
    ],
    disclaimerShort:
      "Kiturile de test de sânge la domiciliu în Irlanda sunt furnizate și analizate de Randox, un laborator acreditat UKAS, iar rezultatele sunt livrate direct. Un rezultat al testului nu constituie prin el însuși un diagnostic, iar analiza medicului nu este inclusă în prețul kitului — o consultație ulterioară opțională cu un medic înregistrat la Irish Medical Council este disponibilă separat, de la 45 €. În caz de urgență medicală, sună la 112.",
  },
  DE: {
    heroTitle: "Blutuntersuchungen für zu Hause in Irland — Randox-Labor-Kits, Ergebnisse in bis zu 10 Tagen",
    heroSubtitle:
      "Bestellen Sie ein Randox-Bluttest-Kit für zu Hause, entnehmen Sie Ihre Probe selbst und erhalten Sie Ihre Ergebnisse in bis zu 10 Tagen. Möchten Sie, dass ein Arzt Ihre Ergebnisse erklärt? Vereinbaren Sie eine Folgeberatung mit einem bei der Irish Medical Council registrierten Global-Health-Arzt, ab 45 €.",
    seoTitle: "Blutuntersuchungen für zu Hause in Irland — Randox-Labor-Kits | Global Health",
    seoDescription:
      "Bestellen Sie ein Randox-Bluttest-Kit in Irland ab 89 €. Kleines Blutbild, Schilddrüsenfunktionstest und mehr. Entnehmen Sie Ihre Probe zu Hause und erhalten Sie Ihre Ergebnisse in bis zu 10 Tagen. Vereinbaren Sie eine Folgeberatung mit einem bei der Irish Medical Council registrierten Arzt ab 45 €.",
    intro:
      "Global Health bietet in Irland Randox-Bluttest-Kits für zu Hause an — klinisch hochwertige Tests, die Sie selbst zu Hause durchführen. Bestellen Sie Ihr Kit, entnehmen Sie Ihre Probe gemäß den beiliegenden Anweisungen und senden Sie sie im beiliegenden frankierten Umschlag an das Randox-Labor. Randox liefert Ihre Ergebnisse digital in bis zu 10 Tagen. Wenn Sie möchten, dass ein Arzt Ihnen erklärt, was Ihre Ergebnisse bedeuten, können Sie eine optionale Folgeberatung mit einem bei der Irish Medical Council registrierten Global-Health-Arzt vereinbaren, ab 45 €.",
    whoForTitle: "Für wen diese Tests geeignet sind",
    whoForIntro: "Unsere Bluttests für zu Hause können geeignet sein, wenn Sie Folgendes in Betracht ziehen:",
    whoForItems: [
      "Kleines Blutbild — bei Müdigkeit und Energiemangel, Verdacht auf Anämie, Bedenken hinsichtlich des Immunsystems oder einer routinemäßigen Gesundheitskontrolle",
      "Schilddrüsenfunktionstest — bei unerklärlichen Gewichtsveränderungen, Müdigkeit, Haarausfall, ständigem Kältegefühl oder unregelmäßiger Periode",
      "Routinemäßiges Gesundheitsscreening und allgemeine Wohlbefindenskontrollen von zu Hause aus",
      "Überwachung einer bekannten Erkrankung zwischen Hausarztbesuchen",
    ],
    whyChooseTitle: "So funktioniert es",
    whyChooseItems: [
      "Bestellen Sie Ihr Randox-Kit — wählen Sie Ihren Test aus und legen Sie ihn in den Warenkorb. Ihr Kit wird innerhalb von 1–2 Werktagen versandt.",
      "Entnehmen Sie Ihre Probe zu Hause — folgen Sie den im Kit enthaltenen Anweisungen (Fingerstich oder venöse Selbstentnahme, je nach Test).",
      "Senden Sie Ihre Probe an das Randox-Labor — jedem Kit liegt ein frankierter Rückumschlag bei.",
      "Erhalten Sie Ihre Ergebnisse — Randox liefert Ihre Ergebnisse digital in bis zu 10 Tagen.",
      "Optional — vereinbaren Sie eine Folgeberatung mit einem bei der Irish Medical Council registrierten Global-Health-Arzt, ab 45 €, um Ihre Ergebnisse zu besprechen und sich zu den nächsten Schritten beraten zu lassen.",
    ],
    faq: [
      {
        question: "Wie funktioniert ein Bluttest-Kit für zu Hause?",
        answer:
          "Sie bestellen Ihr Kit online, entnehmen Ihre eigene Probe zu Hause gemäß den bereitgestellten Schritt-für-Schritt-Anweisungen und senden sie im beiliegenden frankierten Umschlag an das Randox-Labor. Randox analysiert Ihre Probe und liefert Ihre Ergebnisse digital in bis zu 10 Tagen.",
      },
      {
        question: "Ist eine venöse Blutentnahme zu Hause schwierig?",
        answer:
          "Das Kit zur venösen Selbstentnahme ist für die Verwendung zu Hause konzipiert und enthält klare Anweisungen. Das kleine Blutbild ist auch als einfachere Fingerstich-Probe verfügbar. Ein Klinikbesuch ist nicht erforderlich.",
      },
      {
        question: "Wie lange dauert es, bis die Ergebnisse vorliegen?",
        answer: "Randox liefert Ihre Ergebnisse digital in bis zu 10 Tagen nach Erhalt Ihrer Probe.",
      },
      {
        question: "Wer analysiert meine Blutprobe?",
        answer:
          "Ihre Probe wird von Randox analysiert, einem UKAS-akkreditierten Labor, dem im Vereinigten Königreich und in Irland vertraut wird. Ihre Ergebnisse werden Ihnen direkt von Randox übermittelt.",
      },
      {
        question: "Was passiert, wenn meine Ergebnisse etwas Ungewöhnliches zeigen?",
        answer:
          "Ihre Ergebnisse werden Ihnen von Randox übermittelt. Wenn etwas ungewöhnlich erscheint oder Sie sich nicht sicher sind, was Ihre Ergebnisse bedeuten, empfehlen wir eine Folgeberatung mit einem bei der Irish Medical Council registrierten Global-Health-Arzt (ab 45 €), der Ihnen Ihre Ergebnisse erklären und Sie zu den nächsten Schritten beraten kann. Bei einem medizinischen Notfall wählen Sie 112 oder suchen Sie die nächstgelegene Notaufnahme auf.",
      },
      {
        question: "Ist die ärztliche Beratung in den 89 € enthalten?",
        answer:
          "Nein. Die 89 € decken das Randox-Test-Kit und dessen Laboranalyse ab. Die ärztliche Beurteilung ist optional und wird separat als Folgeberatung mit einem bei der Irish Medical Council registrierten Global-Health-Arzt gebucht, ab 45 €.",
      },
      {
        question: "Kann ich diese Tests über den HSE bekommen?",
        answer:
          "Einige Bluttests sind möglicherweise über den HSE oder Ihren Hausarzt verfügbar, manchmal kostenlos. Unsere Test-Kits für zu Hause sind eine bequeme private Option, die Sie ohne Überweisung und ohne Wartezeit auf einen Termin bestellen und zu Hause durchführen können.",
      },
      {
        question: "Sind Randox-Tests klinisch zuverlässig?",
        answer:
          "Ja. Randox ist ein UKAS-akkreditiertes Labor, und die Kits sind von klinischer Qualität. Die Probenqualität hängt davon ab, ob die im Kit enthaltenen Entnahmeanweisungen befolgt werden.",
      },
    ],
    disclaimerParagraphs: [
      "Die über Global Health in Irland angebotenen Bluttest-Kits für zu Hause werden von Randox, einem UKAS-akkreditierten Labor, bereitgestellt und analysiert. Ihre Ergebnisse werden Ihnen direkt von Randox übermittelt.",
      "Ein Testergebnis stellt für sich genommen keine Diagnose dar. Eine ärztliche Beurteilung ist im Preis des Kits nicht enthalten. Wenn Sie möchten, dass Ihre Ergebnisse erklärt werden, können Sie eine optionale Folgeberatung ab 45 € mit einem bei der Irish Medical Council registrierten Arzt vereinbaren, der Sie nach eigenem fachlichen Ermessen zu etwaigen empfohlenen nächsten Schritten beraten kann.",
      "Unsere Ärzte verschreiben im Rahmen von Online-Beratungen in der Regel keine kontrollierten Substanzen.",
      "Bluttests für zu Hause sind nicht für medizinische Notfälle geeignet. Wenn Sie einen medizinischen Notfall erleben, wenden Sie sich sofort an den Rettungsdienst unter 112 oder suchen Sie die nächstgelegene Notaufnahme auf.",
    ],
    disclaimerShort:
      "Bluttest-Kits für zu Hause in Irland werden von Randox, einem UKAS-akkreditierten Labor, bereitgestellt und analysiert, und die Ergebnisse werden Ihnen direkt übermittelt. Ein Testergebnis stellt für sich genommen keine Diagnose dar, und eine ärztliche Beurteilung ist im Kitpreis nicht enthalten — eine optionale Folgeberatung mit einem bei der Irish Medical Council registrierten Arzt ist separat ab 45 € verfügbar. Bei einem medizinischen Notfall wählen Sie 112.",
  },
};

const RANDOX_ATTR: Record<LocaleCode, string> = {
  PT: "Fornecido e analisado pela Randox, um laboratório acreditado pela UKAS.",
  ES: "Proporcionado y analizado por Randox, un laboratorio acreditado por la UKAS.",
  CS: "Poskytuje a analyzuje Randox, laboratoř akreditovaná UKAS.",
  RO: "Furnizat și analizat de Randox, un laborator acreditat UKAS.",
  DE: "Bereitgestellt und analysiert von Randox, einem UKAS-akkreditierten Labor.",
};

const RESULTS_TIMELINE: Record<LocaleCode, string> = {
  PT: "Até 10 dias",
  ES: "Hasta 10 días",
  CS: "Až 10 dní",
  RO: "Până la 10 zile",
  DE: "Bis zu 10 Tagen",
};

const THYROID_SAMPLE_TYPE: Record<LocaleCode, string> = {
  PT: "Sangue venoso (kit de autocolheita incluído)",
  ES: "Sangre venosa (kit de autoextracción incluido)",
  CS: "Žilní krev (sada pro samoodběr součástí balení)",
  RO: "Sânge venos (kit de autorecoltare inclus)",
  DE: "Venöses Blut (Selbstentnahme-Kit enthalten)",
};

const CARD_BASE_DESCRIPTIONS: Record<LocaleCode, { fbc: string; thyroid: string }> = {
  PT: {
    fbc: "Um exame de sangue abrangente que verifica o seu estado geral de saúde, incluindo glóbulos vermelhos e brancos, hemoglobina e plaquetas. Disponível como picada no dedo ou colheita de sangue venoso.",
    thyroid:
      "Um exame de sangue que mede os níveis de hormonas da tiroide (TSH, T3, T4) para avaliar a função da tiroide e detetar condições como hipotiroidismo ou hipertiroidismo. Resultados entregues digitalmente.",
  },
  ES: {
    fbc: "Un análisis de sangre completo que evalúa su estado general de salud, incluidos los glóbulos rojos y blancos, la hemoglobina y las plaquetas. Disponible mediante punción en el dedo o extracción de sangre venosa.",
    thyroid:
      "Un análisis de sangre que mide los niveles de hormonas tiroideas (TSH, T3, T4) para evaluar la función tiroidea y detectar afecciones como hipotiroidismo o hipertiroidismo. Resultados entregados digitalmente.",
  },
  CS: {
    fbc: "Komplexní krevní test, který kontroluje váš celkový zdravotní stav, včetně červených a bílých krvinek, hemoglobinu a krevních destiček. K dispozici jako vpich do prstu nebo odběr žilní krve.",
    thyroid:
      "Krevní test, který měří hladiny hormonů štítné žlázy (TSH, T3, T4) za účelem posouzení funkce štítné žlázy a odhalení stavů, jako je hypotyreóza nebo hypertyreóza. Výsledky jsou doručovány digitálně.",
  },
  RO: {
    fbc: "Un test de sânge cuprinzător care vă verifică starea generală de sănătate, inclusiv globulele roșii și albe, hemoglobina și trombocitele. Disponibil ca înțepare în deget sau prelevare de sânge venos.",
    thyroid:
      "Un test de sânge care măsoară nivelurile hormonilor tiroidieni (TSH, T3, T4) pentru a evalua funcția tiroidiană și a detecta afecțiuni precum hipotiroidismul sau hipertiroidismul. Rezultatele sunt livrate digital.",
  },
  DE: {
    fbc: "Ein umfassender Bluttest, der Ihre allgemeine Gesundheit überprüft, einschließlich roter und weißer Blutkörperchen, Hämoglobin und Blutplättchen. Verfügbar als Fingerstich oder venöse Blutentnahme.",
    thyroid:
      "Ein Bluttest, der die Schilddrüsenhormonspiegel (TSH, T3, T4) misst, um die Schilddrüsenfunktion zu beurteilen und Erkrankungen wie Hypothyreose oder Hyperthyreose zu erkennen. Ergebnisse werden digital übermittelt.",
  },
};

const LOCALES: LocaleCode[] = ["PT", "ES", "CS", "RO", "DE"];

async function main(): Promise<void> {
  const ie = await prisma.country.findUnique({ where: { code: "ie" }, select: { id: true } });
  if (!ie) throw new Error("IE country not found");

  const pc = await prisma.pageContent.findUnique({
    where: { countryId_pageKey: { countryId: ie.id, pageKey: PAGE_KEY } },
  });
  if (!pc) throw new Error("IE HEALTH_TESTS PageContent row missing");

  const fbc = await prisma.healthTest.findUnique({
    where: { countryId_slug: { countryId: ie.id, slug: "full-blood-count" } },
    select: { id: true },
  });
  const thyroid = await prisma.healthTest.findUnique({
    where: { countryId_slug: { countryId: ie.id, slug: "thyroid-function-test" } },
    select: { id: true },
  });
  if (!fbc || !thyroid) throw new Error("IE HealthTest rows missing");

  for (const locale of LOCALES) {
    const copy = PAGE_COPY[locale];
    console.log(`\n=== ${locale} ===`);

    const before = await prisma.pageContentTranslation.findUnique({
      where: { pageContentId_locale: { pageContentId: pc.id, locale } },
      select: { heroTitle: true },
    });
    console.log("  heroTitle BEFORE:", before?.heroTitle ?? "(null)");
    console.log("  heroTitle AFTER :", copy.heroTitle);

    if (APPLY) {
      await prisma.pageContentTranslation.upsert({
        where: { pageContentId_locale: { pageContentId: pc.id, locale } },
        create: { pageContentId: pc.id, locale, ...copy },
        update: { ...copy },
      });
    }

    const fbcDesc = `${CARD_BASE_DESCRIPTIONS[locale].fbc} ${RANDOX_ATTR[locale]}`;
    const thyroidDesc = `${CARD_BASE_DESCRIPTIONS[locale].thyroid} ${RANDOX_ATTR[locale]}`;

    console.log("  fbc resultsTimeline:", RESULTS_TIMELINE[locale]);
    console.log("  thyroid sampleType :", THYROID_SAMPLE_TYPE[locale]);

    if (APPLY) {
      await prisma.healthTestTranslation.updateMany({
        where: { healthTestId: fbc.id, locale },
        data: { resultsTimeline: RESULTS_TIMELINE[locale], shortDescription: fbcDesc },
      });
      await prisma.healthTestTranslation.updateMany({
        where: { healthTestId: thyroid.id, locale },
        data: {
          resultsTimeline: RESULTS_TIMELINE[locale],
          sampleType: THYROID_SAMPLE_TYPE[locale],
          shortDescription: thyroidDesc,
        },
      });
    }
  }

  if (!APPLY) console.log("\nRe-run with --apply to write to PROD.");
  else console.log("\n✅ Applied all 5 non-EN IE locales to PROD.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
