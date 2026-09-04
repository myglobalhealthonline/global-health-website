import type { CountryCode } from "@/data/countries";
import { deepMergeLocale } from "@/lib/i18n/deep-merge-locale";
import czechiaApprovedToolSeo from "@/lib/tools/czechia-approved-tool-seo.json";
import portugalApprovedToolSeo from "@/lib/tools/portugal-approved-tool-seo.json";
import type { ToolCopy, ToolsBandsCopy } from "@/lib/tools/registry";

/**
 * Market-specific FAQ entries, appended to the shared language FAQ.
 *
 * Why this exists: `locales/<lang>/tools.json` gives us six FAQ variants, one
 * per language — so `/ireland/en`, `/spain/en` and `/brazil/en` shipped a
 * byte-identical FAQ. Nothing on the page named the market, which is a problem
 * when the query we want is literally `bmi calculator ireland`. These entries
 * are the part that genuinely differs per market: the national health service
 * that uses BMI, and where to get it checked locally.
 *
 * WRITTEN BY HAND PER MARKET AND LANGUAGE, never templated. Country names
 * decline after prepositions in Czech ("v Irsku", not "v Irsko") and take
 * varying articles in Portuguese ("para o Brasil" but "para Portugal"), so a
 * `{country}` placeholder in a sentence would produce broken grammar in half
 * the locales. Placeholders are only used where the name stands alone — the
 * page title and the H1 trail.
 *
 * Coverage is each market's default language plus English, because those are
 * the combinations with real audiences. Anything else (`/ireland/cs`, say)
 * falls back to the shared language FAQ, which is correct and complete — just
 * not market-specific.
 *
 * Claims are kept to what is true of every one of these systems: BMI is a
 * first-line screening measure used alongside other checks, not a diagnosis.
 * No prices, waiting times or programme names — those go stale.
 */

type FaqItem = { question: string; answer: string };

type MarketFaq = Partial<Record<CountryCode, Record<string, FaqItem[]>>>;

const BMI_MARKET_FAQ: MarketFaq = {
  ie: {
    en: [
      {
        question: "Does the HSE use BMI?",
        answer:
          "Yes. BMI is the first-line screening measure in Irish practice and is usually read alongside waist circumference, blood pressure and blood tests rather than on its own. A raised BMI prompts further assessment; it is not a diagnosis by itself.",
      },
      {
        question: "Where can I get my BMI checked in Ireland?",
        answer:
          "Any GP appointment includes height and weight, and most pharmacies will measure them too. You can also work it out here in seconds and bring the number to a consultation. Our Irish-registered doctors can review it together with your blood pressure, cholesterol and blood glucose.",
      },
    ],
  },
  pt: {
    pt: [
      {
        question: "O SNS utiliza o IMC?",
        answer:
          "Sim. O IMC é a medida de rastreio de primeira linha na prática clínica em Portugal, tal como internacionalmente — normalmente interpretado em conjunto com o perímetro abdominal, a tensão arterial e as análises, e não isoladamente. Um IMC elevado é o que motiva uma avaliação mais aprofundada; não é um diagnóstico.",
      },
      {
        question: "Onde posso medir o meu IMC em Portugal?",
        answer:
          "Qualquer consulta médica inclui a medição da altura e do peso, e a maioria das farmácias também o faz. Pode ainda calculá-lo aqui em segundos e levar o valor a uma consulta — os nossos médicos registados podem analisá-lo juntamente com a sua tensão arterial, colesterol e glicemia.",
      },
    ],
    en: [
      {
        question: "Does the SNS use BMI?",
        answer:
          "Yes. BMI is the first-line screening measure in Portuguese practice, as it is internationally — normally read alongside waist circumference, blood pressure and blood tests rather than on its own. A raised BMI prompts further assessment; it is not a diagnosis by itself.",
      },
      {
        question: "Where can I get my BMI checked in Portugal?",
        answer:
          "Any medical appointment includes height and weight, and most pharmacies will measure them too. You can also work it out here and bring the number to a consultation — our registered doctors can review it alongside your blood pressure, cholesterol and blood glucose.",
      },
    ],
  },
  es: {
    es: [
      {
        question: "¿El Sistema Nacional de Salud utiliza el IMC?",
        answer:
          "Sí. El IMC es la medida de cribado de primera línea en la práctica clínica en España, igual que a nivel internacional: se interpreta junto con el perímetro abdominal, la tensión arterial y las analíticas, no de forma aislada. Un IMC elevado es lo que motiva una valoración más completa; no es un diagnóstico en sí mismo.",
      },
      {
        question: "¿Dónde puedo medirme el IMC en España?",
        answer:
          "Cualquier consulta médica incluye la medición de altura y peso, y la mayoría de las farmacias también las toman. También puedes calcularlo aquí en segundos y llevar el dato a una consulta: nuestros médicos colegiados pueden valorarlo junto con tu tensión arterial, tu colesterol y tu glucemia.",
      },
    ],
    en: [
      {
        question: "Does the Spanish health system use BMI?",
        answer:
          "Yes. BMI is the first-line screening measure in Spanish practice, as it is internationally — read alongside waist circumference, blood pressure and blood tests rather than on its own. A raised BMI prompts further assessment; it is not a diagnosis by itself.",
      },
      {
        question: "Where can I get my BMI checked in Spain?",
        answer:
          "Any medical appointment includes height and weight, and most pharmacies will measure them too. You can also work it out here and bring the number to a consultation — our registered doctors can review it alongside your blood pressure, cholesterol and blood glucose.",
      },
    ],
  },
  cz: {
    cs: [
      {
        question: "Používají čeští lékaři BMI?",
        answer:
          "Ano. BMI je v české praxi screeningová hodnota první volby, stejně jako v zahraničí — obvykle se hodnotí spolu s obvodem pasu, krevním tlakem a krevními testy, nikoli samostatně. Zvýšené BMI je podnětem k dalšímu vyšetření, samo o sobě není diagnózou.",
      },
      {
        question: "Kde si mohu nechat změřit BMI v Česku?",
        answer:
          "Součástí každé lékařské prohlídky je změření výšky a hmotnosti a většina lékáren je změří také. Můžete si ho ale spočítat i tady během několika sekund a hodnotu vzít s sebou na konzultaci — naši registrovaní lékaři ji posoudí spolu s krevním tlakem, cholesterolem a glykemií.",
      },
    ],
    en: [
      {
        question: "Do Czech doctors use BMI?",
        answer:
          "Yes. BMI is the first-line screening measure in Czech practice, as it is internationally — read alongside waist circumference, blood pressure and blood tests rather than on its own. A raised BMI prompts further assessment; it is not a diagnosis by itself.",
      },
      {
        question: "Where can I get my BMI checked in Czechia?",
        answer:
          "Any medical appointment includes height and weight, and most pharmacies will measure them too. You can also work it out here and bring the number to a consultation — our registered doctors can review it alongside your blood pressure, cholesterol and blood glucose.",
      },
    ],
  },
  ro: {
    ro: [
      {
        question: "Medicii din România folosesc IMC?",
        answer:
          "Da. IMC este măsura de screening de primă linie în practica medicală din România, ca peste tot — este citit împreună cu circumferința taliei, tensiunea arterială și analizele de sânge, nu izolat. Un IMC crescut este ceea ce declanșează o evaluare mai amănunțită; nu este un diagnostic în sine.",
      },
      {
        question: "Unde îmi pot măsura IMC-ul în România?",
        answer:
          "Orice consultație medicală include măsurarea înălțimii și a greutății, iar majoritatea farmaciilor le măsoară și ele. Îl poți calcula însă și aici, în câteva secunde, și poți duce valoarea la o consultație — medicii noștri înregistrați o pot evalua împreună cu tensiunea arterială, colesterolul și glicemia.",
      },
    ],
    en: [
      {
        question: "Do doctors in Romania use BMI?",
        answer:
          "Yes. BMI is the first-line screening measure in Romanian practice, as it is internationally — read alongside waist circumference, blood pressure and blood tests rather than on its own. A raised BMI prompts further assessment; it is not a diagnosis by itself.",
      },
      {
        question: "Where can I get my BMI checked in Romania?",
        answer:
          "Any medical appointment includes height and weight, and most pharmacies will measure them too. You can also work it out here and bring the number to a consultation — our registered doctors can review it alongside your blood pressure, cholesterol and blood glucose.",
      },
    ],
  },
  br: {
    pt: [
      {
        question: "O SUS utiliza o IMC?",
        answer:
          "Sim. O IMC é a medida de triagem de primeira linha na prática clínica no Brasil, assim como no resto do mundo — é lido junto com a circunferência abdominal, a pressão arterial e os exames de sangue, e não isoladamente. Um IMC elevado é o que motiva uma avaliação mais completa; não é um diagnóstico por si só.",
      },
      {
        question: "Onde posso medir o meu IMC no Brasil?",
        answer:
          "Qualquer consulta médica inclui a medição da altura e do peso, e a maioria das farmácias também faz essa medição. Você também pode calcular aqui em segundos e levar o valor para uma consulta — os nossos médicos registrados podem avaliá-lo junto com a sua pressão arterial, o colesterol e a glicemia.",
      },
    ],
    en: [
      {
        question: "Does the SUS use BMI?",
        answer:
          "Yes. BMI is the first-line screening measure in Brazilian practice, as it is internationally — read alongside waist circumference, blood pressure and blood tests rather than on its own. A raised BMI prompts further assessment; it is not a diagnosis by itself.",
      },
      {
        question: "Where can I get my BMI checked in Brazil?",
        answer:
          "Any medical appointment includes height and weight, and most pharmacies will measure them too. You can also work it out here and bring the number to a consultation — our registered doctors can review it alongside your blood pressure, cholesterol and blood glucose.",
      },
    ],
  },
};

/**
 * Same idea for the calorie tool. The market hook here is the reference intake
 * printed on food labels (2,000 kcal for an average adult in the EU, and on
 * ANVISA labels in Brazil) plus each country's own healthy-eating guideline —
 * both true everywhere we sell, and both things people actually search for.
 */
const CALORIE_MARKET_FAQ: MarketFaq = {
  ie: {
    en: [
      {
        question: "How many calories a day are recommended in Ireland?",
        answer:
          "The figure on Irish food labels is the EU reference intake of 2,000 kcal a day for an average adult, and the healthy eating guidelines are built around roughly 2,000 kcal for women and 2,500 for men. Those are population averages: your own maintenance figure depends on your height, weight, age and how active you are, which is what the calculator above estimates.",
      },
      {
        question: "Can a doctor in Ireland review my calorie target?",
        answer:
          "Yes. A GP can check whether a target is sensible for your history and refer you to a dietitian if you need a full eating plan. Our Irish-registered doctors can review your figure by video alongside your blood pressure, cholesterol and blood glucose, which is what tells you whether the number is the thing worth changing.",
      },
    ],
  },
  pt: {
    pt: [
      {
        question: "Quantas calorias por dia são recomendadas em Portugal?",
        answer:
          "O valor de referência inscrito nos rótulos alimentares em Portugal é o europeu: 2.000 kcal por dia para um adulto médio. A Roda dos Alimentos do SNS organiza a alimentação em torno de valores desta ordem, mas trata-se de médias populacionais — as suas necessidades dependem da altura, do peso, da idade e do nível de atividade, que é o que a calculadora acima estima.",
      },
      {
        question: "Um médico pode rever o meu objetivo calórico?",
        answer:
          "Sim. Uma consulta permite verificar se o valor faz sentido para o seu historial e encaminhá-lo para nutrição quando é preciso um plano alimentar completo. Os nossos médicos registados podem analisar o número por vídeo, juntamente com a tensão arterial, o colesterol e a glicemia.",
      },
    ],
    en: [
      {
        question: "How many calories a day are recommended in Portugal?",
        answer:
          "Portuguese food labels carry the EU reference intake of 2,000 kcal a day for an average adult, and the national healthy-eating wheel is built around figures of that order. They are population averages — your own needs depend on height, weight, age and activity, which is what the calculator above estimates.",
      },
      {
        question: "Can a doctor in Portugal review my calorie target?",
        answer:
          "Yes. A consultation can check whether the figure suits your history and refer you for a full eating plan when one is needed. Our registered doctors can review it by video alongside your blood pressure, cholesterol and blood glucose.",
      },
    ],
  },
  es: {
    es: [
      {
        question: "¿Cuántas calorías al día se recomiendan en España?",
        answer:
          "El valor que aparece en el etiquetado en España es la ingesta de referencia europea: 2.000 kcal al día para un adulto medio. Las recomendaciones de alimentación saludable de la AESAN se construyen sobre cifras de ese orden, pero son promedios de población: tus necesidades dependen de tu altura, tu peso, tu edad y tu actividad, que es lo que estima la calculadora de arriba.",
      },
      {
        question: "¿Puede un médico revisar mi objetivo de calorías?",
        answer:
          "Sí. Una consulta sirve para comprobar si la cifra encaja con tu historia clínica y derivarte a nutrición cuando hace falta un plan completo. Nuestros médicos colegiados pueden valorarla por vídeo junto con tu tensión arterial, tu colesterol y tu glucemia.",
      },
    ],
    en: [
      {
        question: "How many calories a day are recommended in Spain?",
        answer:
          "Spanish food labels carry the EU reference intake of 2,000 kcal a day for an average adult, and the national healthy-eating advice is built around figures of that order. They are population averages — your own needs depend on height, weight, age and activity, which is what the calculator above estimates.",
      },
      {
        question: "Can a doctor in Spain review my calorie target?",
        answer:
          "Yes. A consultation can check whether the figure suits your history and refer you for a full eating plan when one is needed. Our registered doctors can review it by video alongside your blood pressure, cholesterol and blood glucose.",
      },
    ],
  },
  cz: {
    cs: [
      {
        question: "Kolik kalorií denně se v Česku doporučuje?",
        answer:
          "Na obalech potravin v Česku je uvedena evropská referenční hodnota příjmu: 2 000 kcal denně pro průměrného dospělého. Česká výživová doporučení pracují s hodnotami tohoto řádu, jde ale o populační průměry — vaše vlastní potřeba závisí na výšce, hmotnosti, věku a pohybu, což je přesně to, co odhaduje kalkulačka výše.",
      },
      {
        question: "Může mi lékař zkontrolovat kalorický cíl?",
        answer:
          "Ano. Na konzultaci lze ověřit, zda hodnota odpovídá vaší anamnéze, a v případě potřeby vás odeslat na nutriční poradenství. Naši registrovaní lékaři ji posoudí po videu spolu s krevním tlakem, cholesterolem a glykemií.",
      },
    ],
    en: [
      {
        question: "How many calories a day are recommended in Czechia?",
        answer:
          "Czech food labels carry the EU reference intake of 2,000 kcal a day for an average adult, and national nutrition guidance works with figures of that order. They are population averages — your own needs depend on height, weight, age and activity, which is what the calculator above estimates.",
      },
      {
        question: "Can a doctor in Czechia review my calorie target?",
        answer:
          "Yes. A consultation can check whether the figure suits your history and refer you for nutrition advice when a full plan is needed. Our registered doctors can review it by video alongside your blood pressure, cholesterol and blood glucose.",
      },
    ],
  },
  ro: {
    ro: [
      {
        question: "Câte calorii pe zi sunt recomandate în România?",
        answer:
          "Valoarea de pe etichetele alimentare din România este referința europeană: 2.000 kcal pe zi pentru un adult obișnuit. Ghidurile de alimentație sănătoasă folosesc cifre de acest ordin, însă sunt medii pe populație — necesarul tău depinde de înălțime, greutate, vârstă și mișcare, adică exact ce estimează calculatorul de mai sus.",
      },
      {
        question: "Poate un medic să îmi verifice ținta calorică?",
        answer:
          "Da. O consultație poate verifica dacă valoarea se potrivește cu istoricul tău medical și te poate îndruma către un plan alimentar complet atunci când e nevoie. Medicii noștri înregistrați o pot evalua prin video, împreună cu tensiunea arterială, colesterolul și glicemia.",
      },
    ],
    en: [
      {
        question: "How many calories a day are recommended in Romania?",
        answer:
          "Romanian food labels carry the EU reference intake of 2,000 kcal a day for an average adult, and national healthy-eating guidance uses figures of that order. They are population averages — your own needs depend on height, weight, age and activity, which is what the calculator above estimates.",
      },
      {
        question: "Can a doctor in Romania review my calorie target?",
        answer:
          "Yes. A consultation can check whether the figure suits your history and point you to a full eating plan when one is needed. Our registered doctors can review it by video alongside your blood pressure, cholesterol and blood glucose.",
      },
    ],
  },
  br: {
    pt: [
      {
        question: "Quantas calorias por dia são recomendadas no Brasil?",
        answer:
          "O valor de referência usado na rotulagem no Brasil é de 2.000 kcal por dia para um adulto médio. O Guia Alimentar para a População Brasileira trabalha com valores dessa ordem, mas são médias populacionais — a sua necessidade depende da altura, do peso, da idade e do quanto você se movimenta, que é o que a calculadora acima estima.",
      },
      {
        question: "Um médico pode revisar a minha meta de calorias?",
        answer:
          "Pode. Uma consulta serve para checar se o valor faz sentido para o seu histórico e encaminhar para nutrição quando é preciso um plano alimentar completo. Os nossos médicos registrados avaliam o número por vídeo, junto com a sua pressão arterial, o colesterol e a glicemia.",
      },
    ],
    en: [
      {
        question: "How many calories a day are recommended in Brazil?",
        answer:
          "Brazilian food labels use a reference intake of 2,000 kcal a day for an average adult, and the national dietary guidelines work with figures of that order. They are population averages — your own needs depend on height, weight, age and activity, which is what the calculator above estimates.",
      },
      {
        question: "Can a doctor in Brazil review my calorie target?",
        answer:
          "Yes. A consultation can check whether the figure suits your history and refer you for a full eating plan when one is needed. Our registered doctors can review it by video alongside your blood pressure, cholesterol and blood glucose.",
      },
    ],
  },
};

/**
 * Blood pressure. The market-specific part is who measures it locally and what
 * threshold that system works to — the classification itself is the same
 * European one everywhere we operate, so it is not repeated per market.
 */
const BP_MARKET_FAQ: MarketFaq = {
  ie: {
    en: [
      {
        question: "What counts as high blood pressure in Ireland?",
        answer:
          "Irish practice follows the European thresholds: 140/90 mmHg or above measured in a clinic, or 135/85 or above on a validated home monitor. A single raised reading is not a diagnosis. A GP will normally ask for a week of home readings, or arrange 24-hour monitoring, before treating anything.",
      },
      {
        question: "Where can I get my blood pressure checked in Ireland?",
        answer:
          "Any GP appointment includes it, and most pharmacies will measure it for you. If you already have a home monitor, take a week of morning and evening readings and bring them to a consultation. Our Irish-registered doctors can review the set by video alongside your cholesterol and blood glucose.",
      },
    ],
  },
  pt: {
    pt: [
      {
        question: "O que é considerado tensão alta em Portugal?",
        answer:
          "A prática clínica em Portugal segue os limiares europeus: 140/90 mmHg ou mais medidos em consultório, ou 135/85 ou mais num medidor doméstico validado. Uma leitura alta isolada não é um diagnóstico — o médico pede normalmente uma semana de medições em casa, ou um registo de 24 horas, antes de iniciar qualquer tratamento.",
      },
      {
        question: "Onde posso medir a tensão arterial em Portugal?",
        answer:
          "Qualquer consulta inclui a medição e a maioria das farmácias mede-a também, no âmbito dos serviços do SNS e privados. Se já tem um medidor em casa, faça uma semana de medições de manhã e à noite e leve-as a uma consulta — os nossos médicos registados analisam o conjunto por vídeo, juntamente com o colesterol e a glicemia.",
      },
    ],
    en: [
      {
        question: "What counts as high blood pressure in Portugal?",
        answer:
          "Portuguese practice follows the European thresholds: 140/90 mmHg or above in a clinic, or 135/85 or above on a validated home monitor. A single raised reading is not a diagnosis — a doctor will normally ask for a week of home readings, or 24-hour monitoring, first.",
      },
      {
        question: "Where can I get my blood pressure checked in Portugal?",
        answer:
          "Any medical appointment includes it, and most pharmacies measure it too. Bring a week of home readings to a consultation and our registered doctors can review the whole set by video, alongside your cholesterol and blood glucose.",
      },
    ],
  },
  es: {
    es: [
      {
        question: "¿Qué se considera tensión alta en España?",
        answer:
          "La práctica clínica en España sigue los umbrales europeos: 140/90 mmHg o más medidos en consulta, o 135/85 o más en un tensiómetro doméstico validado. Una única lectura alta no es un diagnóstico: lo habitual es que el médico pida una semana de mediciones en casa, o un registro de 24 horas (MAPA), antes de tratar nada.",
      },
      {
        question: "¿Dónde puedo medirme la tensión en España?",
        answer:
          "Cualquier consulta médica la incluye y la mayoría de las farmacias también la toman. Si ya tienes tensiómetro en casa, haz una semana de mediciones de mañana y noche y llévalas a una consulta: nuestros médicos colegiados pueden revisar la serie por vídeo junto con tu colesterol y tu glucemia.",
      },
    ],
    en: [
      {
        question: "What counts as high blood pressure in Spain?",
        answer:
          "Spanish practice follows the European thresholds: 140/90 mmHg or above in a clinic, or 135/85 or above on a validated home monitor. A single raised reading is not a diagnosis — a doctor will normally ask for a week of home readings, or 24-hour monitoring, first.",
      },
      {
        question: "Where can I get my blood pressure checked in Spain?",
        answer:
          "Any medical appointment includes it, and most pharmacies will measure it too. Bring a week of home readings to a consultation and our registered doctors can review the whole set by video, alongside your cholesterol and blood glucose.",
      },
    ],
  },
  cz: {
    cs: [
      {
        question: "Co se v Česku považuje za vysoký krevní tlak?",
        answer:
          "Česká praxe se řídí evropskými hranicemi: 140/90 mmHg a více naměřených v ordinaci, nebo 135/85 a více na validovaném domácím tlakoměru. Jedna vysoká hodnota není diagnóza — praktický lékař obvykle nejdřív požádá o týden domácího měření nebo zajistí 24hodinové monitorování.",
      },
      {
        question: "Kde si mohu nechat změřit krevní tlak v Česku?",
        answer:
          "Součástí každé preventivní prohlídky u praktického lékaře je změření tlaku a změří vám ho i většina lékáren. Pokud máte tlakoměr doma, měřte týden ráno a večer a hodnoty vezměte na konzultaci — naši registrovaní lékaři je posoudí po videu spolu s cholesterolem a glykemií.",
      },
    ],
    en: [
      {
        question: "What counts as high blood pressure in Czechia?",
        answer:
          "Czech practice follows the European thresholds: 140/90 mmHg or above in a clinic, or 135/85 or above on a validated home monitor. A single raised reading is not a diagnosis — a doctor will normally ask for a week of home readings, or 24-hour monitoring, first.",
      },
      {
        question: "Where can I get my blood pressure checked in Czechia?",
        answer:
          "Every routine check-up with a GP includes it, and most pharmacies will measure it too. Bring a week of home readings to a consultation and our registered doctors can review the whole set by video, alongside your cholesterol and blood glucose.",
      },
    ],
  },
  ro: {
    ro: [
      {
        question: "Ce înseamnă tensiune mare în România?",
        answer:
          "Practica medicală din România urmează pragurile europene: 140/90 mmHg sau peste, măsurate în cabinet, ori 135/85 sau peste pe un tensiometru de acasă validat. O singură valoare mare nu este un diagnostic — medicul de familie cere de obicei o săptămână de măsurători acasă sau o monitorizare Holter de 24 de ore înainte de a trata ceva.",
      },
      {
        question: "Unde îmi pot măsura tensiunea în România?",
        answer:
          "Orice consultație include măsurarea tensiunii, iar majoritatea farmaciilor o măsoară și ele. Dacă ai deja tensiometru acasă, măsoară o săptămână dimineața și seara și du valorile la o consultație — medicii noștri înregistrați pot analiza toată seria prin video, împreună cu colesterolul și glicemia.",
      },
    ],
    en: [
      {
        question: "What counts as high blood pressure in Romania?",
        answer:
          "Romanian practice follows the European thresholds: 140/90 mmHg or above in a clinic, or 135/85 or above on a validated home monitor. A single raised reading is not a diagnosis — a doctor will normally ask for a week of home readings, or 24-hour monitoring, first.",
      },
      {
        question: "Where can I get my blood pressure checked in Romania?",
        answer:
          "Any medical appointment includes it, and most pharmacies will measure it too. Bring a week of home readings to a consultation and our registered doctors can review the whole set by video, alongside your cholesterol and blood glucose.",
      },
    ],
  },
  br: {
    pt: [
      {
        question: "O que é considerado pressão alta no Brasil?",
        answer:
          "A prática clínica no Brasil segue os mesmos limites usados internacionalmente: 140/90 mmHg ou mais aferidos no consultório, ou 135/85 ou mais em um aparelho de uso doméstico validado. Uma medida alta isolada não é diagnóstico — o médico costuma pedir uma semana de aferições em casa, ou uma MAPA de 24 horas, antes de tratar.",
      },
      {
        question: "Onde posso medir a pressão arterial no Brasil?",
        answer:
          "Qualquer consulta inclui a aferição, as unidades básicas de saúde do SUS medem a pressão e a maioria das farmácias também. Se você já tem aparelho em casa, afira uma semana de manhã e à noite e leve os valores para a consulta — os nossos médicos registrados avaliam a série por vídeo, junto com o colesterol e a glicemia.",
      },
    ],
    en: [
      {
        question: "What counts as high blood pressure in Brazil?",
        answer:
          "Brazilian practice follows the same thresholds used internationally: 140/90 mmHg or above measured in a clinic, or 135/85 or above on a validated home monitor. A single raised reading is not a diagnosis — a doctor will normally ask for a week of home readings, or 24-hour monitoring, first.",
      },
      {
        question: "Where can I get my blood pressure checked in Brazil?",
        answer:
          "Any medical appointment includes it, SUS primary care units measure it, and most pharmacies do too. Bring a week of home readings to a consultation and our registered doctors can review the whole set by video, alongside your cholesterol and blood glucose.",
      },
    ],
  },
};

/** Keyed by tool slug — each tool's market FAQ is its own hand-written set. */
/**
 * Due date. The market-specific part is who runs antenatal care locally and
 * when the dating scan is offered — the arithmetic is the same everywhere, but
 * "where do I go now" is not, and it is the question people have after seeing
 * an estimated date. No waiting times or prices: those go stale.
 */
const DUE_DATE_MARKET_FAQ: MarketFaq = {
  ie: {
    en: [
      {
        question: "How do I arrange antenatal care in Ireland?",
        answer:
          "Start with a GP. They confirm the pregnancy, do the first checks and refer you to a maternity unit, and the HSE's Maternity and Infant Care Scheme is what covers that shared GP-and-hospital care. The unit does the dating scan, and from then on its date is the one your notes use.",
      },
      {
        question: "When is the dating scan done in Ireland?",
        answer:
          "Irish maternity units normally scan in the first trimester, generally somewhere between about 11 and 14 weeks, with the anomaly scan around 20 weeks. Until then the estimate above is what you have to work with. Our Irish-registered doctors can go through early symptoms or any medicines you already take by video in the meantime.",
      },
    ],
  },
  pt: {
    pt: [
      {
        question: "Como se marca a vigilância da gravidez em Portugal?",
        answer:
          "Pelo centro de saúde: a consulta de saúde materna acompanha a gravidez de baixo risco e faz a articulação com o hospital quando é necessária. É aí que se pedem as primeiras análises e a ecografia, e a data que a ecografia dá passa a ser a usada no boletim de saúde da grávida.",
      },
      {
        question: "Quando se faz a ecografia de datação em Portugal?",
        answer:
          "A ecografia do primeiro trimestre é habitualmente feita entre as 11 e as 14 semanas, seguindo-se a morfológica por volta das 20 semanas. Até lá vale a estimativa acima — e os nossos médicos registados podem esclarecer por vídeo sintomas iniciais ou a medicação que já toma.",
      },
    ],
    en: [
      {
        question: "How do I arrange antenatal care in Portugal?",
        answer:
          "Through your local health centre, where the maternal health consultation follows a low-risk pregnancy and links in with a hospital when that is needed. The first blood tests and the scan are arranged there, and the scan's date is the one your pregnancy record uses afterwards.",
      },
      {
        question: "When is the dating scan done in Portugal?",
        answer:
          "The first-trimester scan is usually done between about 11 and 14 weeks, with the anomaly scan around 20 weeks. Until then the estimate above is what you have — and our registered doctors can talk through early symptoms or medicines you already take by video.",
      },
    ],
  },
  es: {
    es: [
      {
        question: "¿Cómo se organiza el seguimiento del embarazo en España?",
        answer:
          "En el centro de salud: la matrona y el médico de familia llevan el seguimiento del embarazo de bajo riesgo y te derivan al hospital cuando hace falta. Ahí se piden las primeras analíticas y la ecografía, y la fecha que da la ecografía es la que queda en tu cartilla de embarazo.",
      },
      {
        question: "¿Cuándo se hace la ecografía de datación en España?",
        answer:
          "La ecografía del primer trimestre se hace normalmente entre las semanas 11 y 14, y la morfológica alrededor de la semana 20. Hasta entonces la estimación de arriba es lo que tienes, y nuestros médicos colegiados pueden repasar por vídeo los primeros síntomas o la medicación que ya tomas.",
      },
    ],
    en: [
      {
        question: "How do I arrange antenatal care in Spain?",
        answer:
          "Through your local health centre, where a midwife and your family doctor follow a low-risk pregnancy and refer you to hospital when needed. The first blood tests and the scan are arranged there, and the scan's date is the one kept in your pregnancy record.",
      },
      {
        question: "When is the dating scan done in Spain?",
        answer:
          "The first-trimester scan is normally done between about 11 and 14 weeks, with the anomaly scan around week 20. Until then the estimate above is what you have — and our registered doctors can review early symptoms or medicines you already take by video.",
      },
    ],
  },
  cz: {
    cs: [
      {
        question: "Jak se v Česku zaregistrovat do prenatální poradny?",
        answer:
          "Přes gynekologa: ten těhotenství potvrdí, převezme vás do prenatální poradny a vede těhotenský průkaz. Tam se také objednává první ultrazvuk, a termín, který z něj vyjde, se dál používá jako ten platný.",
      },
      {
        question: "Kdy se v Česku dělá datovací ultrazvuk?",
        answer:
          "První ultrazvuk se obvykle provádí mezi 11. a 14. týdnem, screeningový pak okolo 20. týdne. Do té doby máte k dispozici odhad výše — a naši registrovaní lékaři mohou po videu probrat počáteční příznaky nebo léky, které už berete.",
      },
    ],
    en: [
      {
        question: "How do I arrange antenatal care in Czechia?",
        answer:
          "Through a gynaecologist, who confirms the pregnancy, takes you into antenatal care and keeps your pregnancy record. The first scan is arranged there, and the date it gives is the one used from then on.",
      },
      {
        question: "When is the dating scan done in Czechia?",
        answer:
          "The first scan is usually done between about 11 and 14 weeks, with the screening scan around 20 weeks. Until then the estimate above is what you have — and our registered doctors can go through early symptoms or medicines you already take by video.",
      },
    ],
  },
  ro: {
    ro: [
      {
        question: "Cum se începe urmărirea sarcinii în România?",
        answer:
          "Fie prin medicul de familie, fie direct la un medic obstetrician-ginecolog: sarcina se confirmă, se ia în evidență și se deschid analizele. Ecografia se programează acolo, iar data pe care o dă ea este cea folosită mai departe în documentele sarcinii.",
      },
      {
        question: "Când se face ecografia de datare în România?",
        answer:
          "Ecografia de prim trimestru se face de obicei între săptămânile 11 și 14, iar cea de morfologie fetală în jurul săptămânii 20. Până atunci ai estimarea de mai sus — iar medicii noștri înregistrați pot discuta prin video primele simptome sau medicamentele pe care le iei deja.",
      },
    ],
    en: [
      {
        question: "How do I arrange antenatal care in Romania?",
        answer:
          "Either through your family doctor or directly with an obstetrician-gynaecologist: the pregnancy is confirmed, you are taken onto their list and the first tests are ordered. The scan is arranged there, and the date it gives is the one used in your pregnancy records afterwards.",
      },
      {
        question: "When is the dating scan done in Romania?",
        answer:
          "The first-trimester scan is usually done between about 11 and 14 weeks, with the fetal anomaly scan around week 20. Until then the estimate above is what you have — and our registered doctors can discuss early symptoms or medicines you already take by video.",
      },
    ],
  },
  br: {
    pt: [
      {
        question: "Como começar o pré-natal no Brasil?",
        answer:
          "Pela unidade básica de saúde: o pré-natal é aberto ali, com as primeiras consultas, os exames e a caderneta da gestante. O ultrassom é solicitado nesse acompanhamento, e a data que ele indica passa a ser a usada no lugar da conta pela última menstruação.",
      },
      {
        question: "Quando se faz o ultrassom para datar a gravidez no Brasil?",
        answer:
          "O ultrassom de primeiro trimestre costuma ser feito entre 11 e 14 semanas, e o morfológico por volta das 20 semanas. Até lá, o que você tem é a estimativa acima — e os nossos médicos registrados podem conversar por vídeo sobre sintomas do início da gravidez ou sobre remédios que você já toma.",
      },
    ],
    en: [
      {
        question: "How do I start antenatal care in Brazil?",
        answer:
          "At a primary health unit, which opens your antenatal care with the first appointments, blood tests and pregnancy record. The scan is requested as part of that follow-up, and the date it gives replaces the one counted from your last period.",
      },
      {
        question: "When is the dating scan done in Brazil?",
        answer:
          "The first-trimester scan is usually done between about 11 and 14 weeks, with the anomaly scan around 20 weeks. Until then the estimate above is what you have — and our registered doctors can talk through early-pregnancy symptoms or medicines you already take by video.",
      },
    ],
  },
};

/**
 * Ovulation. The market-specific part is who to see locally when the cycle
 * itself is the problem, and where ovulation tests are actually sold — the
 * arithmetic and the "this is not contraception" line are the same everywhere,
 * so neither is repeated per market.
 */
const OVULATION_MARKET_FAQ: MarketFaq = {
  ie: {
    en: [
      {
        question: "Where do I get fertility advice in Ireland?",
        answer:
          "Start with a GP. They can check the basics: cycles, thyroid, rubella immunity and bloods for both partners, then refer on to a fertility service when that is the next step. Our Irish-registered doctors can go through irregular cycles and preconception checks by video first, which is often enough to know whether a referral is what you need.",
      },
      {
        question: "Can I buy ovulation tests in Ireland?",
        answer:
          "Yes. Ovulation predictor kits are sold over the counter in Irish pharmacies and supermarkets, with no prescription needed. They detect the LH surge 24 to 36 hours before the egg is released, so start testing a few days before the date this calculator estimates.",
      },
    ],
  },
  pt: {
    pt: [
      {
        question: "A quem me dirijo em Portugal para aconselhamento sobre fertilidade?",
        answer:
          "Comece pelo centro de saúde: o médico de família faz a avaliação inicial do casal e as primeiras análises, e encaminha para a consulta de ginecologia ou de medicina da reprodução quando é esse o passo seguinte. Os nossos médicos registados podem, entretanto, rever por vídeo ciclos irregulares e a preparação para engravidar.",
      },
      {
        question: "Onde compro testes de ovulação em Portugal?",
        answer:
          "Nas farmácias e parafarmácias, sem receita. Detetam o pico de LH na urina 24 a 36 horas antes de o óvulo ser libertado, por isso comece a testar alguns dias antes da data que esta calculadora estima.",
      },
    ],
    en: [
      {
        question: "Where do I get fertility advice in Portugal?",
        answer:
          "Start at your local health centre: the family doctor does the first assessment and blood tests for both partners and refers on to gynaecology or a reproductive medicine service when that is the next step. Our registered doctors can review irregular cycles and preconception checks by video in the meantime.",
      },
      {
        question: "Where can I buy ovulation tests in Portugal?",
        answer:
          "In pharmacies and parapharmacies, without a prescription. They detect the LH surge in urine 24 to 36 hours before the egg is released, so start testing a few days before the date estimated above.",
      },
    ],
  },
  es: {
    es: [
      {
        question: "¿A quién acudo en España para consultar sobre fertilidad?",
        answer:
          "Al centro de salud: el médico de familia hace la primera valoración de la pareja y las analíticas iniciales, y deriva a ginecología o a una unidad de reproducción cuando ese es el siguiente paso. Mientras tanto, nuestros médicos colegiados pueden revisar por vídeo los ciclos irregulares y las revisiones previas al embarazo.",
      },
      {
        question: "¿Dónde compro test de ovulación en España?",
        answer:
          "En farmacias y parafarmacias, sin receta. Detectan el pico de LH en la orina entre 24 y 36 horas antes de que se libere el óvulo, así que empieza a hacerlos unos días antes de la fecha que estima esta calculadora.",
      },
    ],
    en: [
      {
        question: "Where do I get fertility advice in Spain?",
        answer:
          "Through your local health centre: the family doctor makes the first assessment of both partners and orders the initial blood tests, referring on to gynaecology or a reproductive unit when that is the next step. Our registered doctors can review irregular cycles and preconception checks by video in the meantime.",
      },
      {
        question: "Where can I buy ovulation tests in Spain?",
        answer:
          "In pharmacies and parapharmacies, without a prescription. They detect the LH surge in urine 24 to 36 hours before the egg is released, so start testing a few days before the date estimated above.",
      },
    ],
  },
  cz: {
    cs: [
      {
        question: "Na koho se v Česku obrátit ohledně plodnosti?",
        answer:
          "Na svého gynekologa — ten udělá základní vyšetření, doplní hormonální odběry a ultrazvuk a v případě potřeby odešle do centra asistované reprodukce. Praktický lékař zvládne štítnou žlázu a základní krevní testy. Naši registrovaní lékaři mohou zatím po videu probrat nepravidelné cykly a přípravu na těhotenství.",
      },
      {
        question: "Kde koupím ovulační testy v Česku?",
        answer:
          "V lékárnách a drogeriích, bez receptu. Zachytí v moči vzestup LH 24 až 36 hodin před uvolněním vajíčka, takže začněte testovat několik dnů před datem, které tato kalkulačka odhaduje.",
      },
    ],
    en: [
      {
        question: "Who do I see about fertility in Czechia?",
        answer:
          "Your gynaecologist, who does the basic assessment, hormone bloods and an ultrasound, and refers to an assisted-reproduction centre when that is the next step. A GP covers thyroid and general blood tests. Our registered doctors can talk through irregular cycles and preconception checks by video in the meantime.",
      },
      {
        question: "Where can I buy ovulation tests in Czechia?",
        answer:
          "In pharmacies and drugstores, without a prescription. They detect the LH surge in urine 24 to 36 hours before the egg is released, so start testing a few days before the date estimated above.",
      },
    ],
  },
  ro: {
    ro: [
      {
        question: "La cine merg în România pentru probleme de fertilitate?",
        answer:
          "Fie la medicul de familie, care face evaluarea inițială și trimiterile pentru analize, fie direct la un medic obstetrician-ginecolog, care completează cu ecografie și analize hormonale și îndrumă spre reproducere asistată atunci când e cazul. Medicii noștri înregistrați pot discuta între timp prin video ciclurile neregulate și pregătirea pentru sarcină.",
      },
      {
        question: "De unde cumpăr teste de ovulație în România?",
        answer:
          "Din farmacii, fără rețetă. Detectează creșterea LH în urină cu 24–36 de ore înainte de eliberarea ovulului, așa că începe testarea cu câteva zile înainte de data estimată de acest calculator.",
      },
    ],
    en: [
      {
        question: "Who do I see about fertility in Romania?",
        answer:
          "Either your family doctor, who does the first assessment and orders blood tests, or an obstetrician-gynaecologist directly, who adds an ultrasound and hormone tests and refers on to assisted reproduction when that is the next step. Our registered doctors can discuss irregular cycles and preconception checks by video in the meantime.",
      },
      {
        question: "Where can I buy ovulation tests in Romania?",
        answer:
          "In pharmacies, without a prescription. They detect the LH surge in urine 24 to 36 hours before the egg is released, so start testing a few days before the date estimated above.",
      },
    ],
  },
  br: {
    pt: [
      {
        question: "A quem procurar no Brasil para tratar de fertilidade?",
        answer:
          "Comece pela unidade básica de saúde ou por um ginecologista: é lá que se avaliam os ciclos, se pedem os exames hormonais e a ultrassonografia e se encaminha para reprodução humana quando esse é o passo seguinte. Os nossos médicos registrados podem, enquanto isso, conversar por vídeo sobre ciclos irregulares e sobre o que checar antes de engravidar.",
      },
      {
        question: "Onde comprar teste de ovulação no Brasil?",
        answer:
          "Nas farmácias, sem receita. Eles detectam o pico de LH na urina de 24 a 36 horas antes de o óvulo ser liberado, então comece a testar alguns dias antes da data que esta calculadora estima.",
      },
    ],
    en: [
      {
        question: "Who do I see about fertility in Brazil?",
        answer:
          "Start at a primary health unit or with a gynaecologist: cycles are assessed there, hormone tests and an ultrasound are ordered, and a referral to a reproductive medicine service follows when that is the next step. Our registered doctors can talk through irregular cycles and preconception checks by video in the meantime.",
      },
      {
        question: "Where can I buy ovulation tests in Brazil?",
        answer:
          "In pharmacies, without a prescription. They detect the LH surge in urine 24 to 36 hours before the egg is released, so start testing a few days before the date estimated above.",
      },
    ],
  },
};

/**
 * ADHD. The screener is the same instrument everywhere, so the market-specific
 * part is the only thing that genuinely differs: who is allowed to diagnose
 * adult ADHD locally, and how you reach them. Every entry also says the same
 * two things, because they hold in all six systems — a questionnaire is not a
 * diagnosis, and no medicine is started from one.
 */
const ADHD_MARKET_FAQ: MarketFaq = {
  ie: {
    en: [
      {
        question: "How do I get assessed for ADHD in Ireland?",
        answer:
          "Through a GP first. Adult ADHD is assessed by psychiatrists and clinical psychologists, whether that happens in the public mental health services or privately, and a GP referral is what starts either route. The GP also checks the things that can look like ADHD, such as thyroid function, sleep problems, anxiety and depression, before anyone assesses for it.",
      },
      {
        question: "Can I be prescribed ADHD medication from an online test?",
        answer:
          "No, and be wary of anywhere that offers it. ADHD medicines are controlled drugs, started only after a full assessment and a diagnosis by a specialist, and prescribing afterwards is normally shared between that specialist and your GP. Our Irish-registered doctors can review a screening result, rule out the conditions that mimic ADHD and refer you on. They cannot diagnose it in a video call.",
      },
    ],
  },
  pt: {
    pt: [
      {
        question: "Como se faz a avaliação de PHDA em adultos em Portugal?",
        answer:
          "Começa no médico de família, que revê a história clínica, exclui o que se parece com PHDA — tiroide, sono, ansiedade, depressão — e encaminha para consulta de psiquiatria. O diagnóstico é feito por psiquiatra ou por psicólogo clínico, nunca a partir de um questionário.",
      },
      {
        question: "Posso ter medicação para a PHDA a partir de um teste online?",
        answer:
          "Não, e desconfie de quem o ofereça. Os medicamentos para a PHDA estão sujeitos a controlo especial e só são iniciados depois de uma avaliação completa e de um diagnóstico feito por um especialista. Os nossos médicos registados podem rever o resultado do rastreio, excluir as situações que o imitam e encaminhá-lo — diagnosticar por videoconsulta, não.",
      },
    ],
    en: [
      {
        question: "How is adult ADHD assessed in Portugal?",
        answer:
          "It starts with your family doctor, who reviews your history, rules out the conditions that look like ADHD — thyroid, sleep, anxiety, depression — and refers you to psychiatry. The diagnosis is made by a psychiatrist or a clinical psychologist, never from a questionnaire.",
      },
      {
        question: "Can an online test get me ADHD medication in Portugal?",
        answer:
          "No. ADHD medicines are controlled and are started only after a full specialist assessment and a diagnosis. Our registered doctors can review a screening result, check for the conditions that mimic ADHD and refer you onwards, but a diagnosis is not something a video consultation can give you.",
      },
    ],
  },
  es: {
    es: [
      {
        question: "¿Cómo se evalúa el TDAH en adultos en España?",
        answer:
          "Se empieza en atención primaria: tu médico de familia repasa la historia, descarta lo que se parece al TDAH — tiroides, sueño, ansiedad, depresión — y deriva a salud mental. El diagnóstico lo hace un psiquiatra o un psicólogo clínico, nunca un cuestionario.",
      },
      {
        question: "¿Puedo conseguir medicación para el TDAH con un test online?",
        answer:
          "No, y desconfía de quien te la ofrezca. Los fármacos para el TDAH están sometidos a control especial y solo se inician tras una evaluación completa y un diagnóstico del especialista. Nuestros médicos colegiados pueden revisar tu cribado, descartar los cuadros que lo imitan y derivarte, pero diagnosticar por vídeo no.",
      },
    ],
    en: [
      {
        question: "How is adult ADHD assessed in Spain?",
        answer:
          "It starts in primary care: your family doctor reviews your history, rules out the conditions that look like ADHD — thyroid, sleep, anxiety, depression — and refers you to mental health services. The diagnosis is made by a psychiatrist or a clinical psychologist, never by a questionnaire.",
      },
      {
        question: "Can an online test get me ADHD medication in Spain?",
        answer:
          "No. ADHD medicines are controlled and are started only after a full specialist assessment and a diagnosis. Our registered doctors can review a screening result, check for the conditions that mimic ADHD and refer you onwards; a diagnosis is not something a video consultation can give you.",
      },
    ],
  },
  cz: {
    cs: [
      {
        question: "Kde se v Česku vyšetřuje ADHD u dospělých?",
        answer:
          "V psychiatrické ambulanci pro dospělé nebo u klinického psychologa — to jsou odbornosti, které diagnózu stanoví. Praktický lékař bývá prvním krokem: projde s vámi anamnézu, vyloučí stavy, které ADHD připomínají (štítná žláza, spánek, úzkost, deprese), a odešle vás dál.",
      },
      {
        question: "Můžu dostat léky na ADHD na základě online testu?",
        answer:
          "Ne, a od nikoho, kdo to nabízí, to neberte. Léky na ADHD podléhají zvláštnímu režimu a nasazují se až po úplném vyšetření a stanovení diagnózy odborníkem. Naši registrovaní lékaři mohou výsledek screeningu probrat, vyloučit stavy, které ho napodobují, a odeslat vás dál — diagnózu po videu nestanoví.",
      },
    ],
    en: [
      {
        question: "Where is adult ADHD assessed in Czechia?",
        answer:
          "In adult psychiatric outpatient care or with a clinical psychologist — those are the specialties that make the diagnosis. A GP is the usual first step: they go through your history, rule out the conditions that resemble ADHD (thyroid, sleep, anxiety, depression) and refer you on.",
      },
      {
        question: "Can an online test get me ADHD medication in Czechia?",
        answer:
          "No. ADHD medicines are subject to special controls and are started only after a full assessment and a specialist diagnosis. Our registered doctors can talk a screening result through, rule out what mimics it and refer you onwards, but they cannot diagnose ADHD in a video call.",
      },
    ],
  },
  ro: {
    ro: [
      {
        question: "Cum se face evaluarea pentru ADHD la adulți în România?",
        answer:
          "Diagnosticul îl pune un medic psihiatru sau un psiholog clinician. Drumul obișnuit începe la medicul de familie: îți ia istoricul, exclude ce seamănă cu ADHD-ul — tiroidă, somn, anxietate, depresie — și îți dă trimitere mai departe.",
      },
      {
        question: "Pot primi medicație pentru ADHD pe baza unui test online?",
        answer:
          "Nu, iar dacă cineva îți oferă asta, ferește-te. Medicamentele pentru ADHD se eliberează sub regim special și se încep doar după o evaluare completă și un diagnostic pus de specialist. Medicii noștri înregistrați pot discuta rezultatul screeningului, pot exclude afecțiunile care îl imită și te pot îndruma — un diagnostic prin video, nu.",
      },
    ],
    en: [
      {
        question: "How is adult ADHD assessed in Romania?",
        answer:
          "The diagnosis is made by a psychiatrist or a clinical psychologist. The usual route starts with your family doctor, who takes the history, rules out what resembles ADHD — thyroid, sleep, anxiety, depression — and gives you the referral onwards.",
      },
      {
        question: "Can an online test get me ADHD medication in Romania?",
        answer:
          "No. ADHD medicines are dispensed under special controls and are started only after a full assessment and a specialist diagnosis. Our registered doctors can review a screening result, rule out the conditions that imitate it and point you to an assessment; they cannot diagnose ADHD by video.",
      },
    ],
  },
  br: {
    pt: [
      {
        question: "Como é feita a avaliação de TDAH em adultos no Brasil?",
        answer:
          "O diagnóstico é feito por psiquiatra ou por psicólogo clínico, numa avaliação que percorre a sua história desde a infância. O caminho costuma começar na atenção básica ou numa consulta clínica, que revisa o histórico, afasta o que se parece com TDAH — tireoide, sono, ansiedade, depressão — e encaminha.",
      },
      {
        question: "Dá para conseguir remédio para TDAH com um teste online?",
        answer:
          "Não, e desconfie de quem oferecer. Os medicamentos para TDAH são de controle especial e só entram depois de uma avaliação completa e de um diagnóstico feito por especialista. Os nossos médicos registrados podem revisar o resultado da triagem, afastar o que imita o quadro e encaminhar você — diagnosticar por vídeo, não.",
      },
    ],
    en: [
      {
        question: "How is adult ADHD assessed in Brazil?",
        answer:
          "The diagnosis is made by a psychiatrist or a clinical psychologist, from an assessment that goes through your history from childhood onwards. The route usually starts in primary care or a general consultation, which reviews your history, rules out what looks like ADHD — thyroid, sleep, anxiety, depression — and refers you on.",
      },
      {
        question: "Can an online test get me ADHD medication in Brazil?",
        answer:
          "No. ADHD medicines are controlled and are started only after a full assessment and a specialist diagnosis. Our registered doctors can review a screening result, rule out the conditions that imitate it and refer you onwards; a diagnosis is not something a video consultation can give you.",
      },
    ],
  },
};

const OSTEOPOROSIS_MARKET_FAQ: MarketFaq = {
  ie: {
    en: [
      {
        question: "Does the HSE offer DXA bone density scans?",
        answer:
          "Yes. DXA scanning is available through the public hospital system on referral, and privately without one in most clinics. Ireland follows the same NICE-aligned case-finding approach this checker uses. Risk factors decide who is assessed, not age or a scan alone.",
      },
      {
        question: "Where can I get assessed for osteoporosis in Ireland?",
        answer:
          "Start with a GP appointment. They will go through your risk factors and, where the guideline threshold is met, refer you for a DXA scan through the public system or arrange a private one.",
      },
    ],
  },
  pt: {
    pt: [
      {
        question: "O SNS faz densitometrias ósseas?",
        answer:
          "Sim. A densitometria óssea (DXA) está disponível no SNS mediante referenciação médica, e também no privado sem referenciação na maioria das clínicas. Portugal segue uma abordagem de identificação de risco semelhante à desta ferramenta — são os fatores de risco que decidem quem é avaliado, não a idade nem um exame isolados.",
      },
      {
        question: "Onde posso ser avaliado para a osteoporose em Portugal?",
        answer:
          "Comece por uma consulta médica. O médico vai rever os seus fatores de risco e, quando o limiar das orientações clínicas for atingido, referenciá-lo(a) para uma densitometria óssea no SNS ou encaminhá-lo(a) para o privado.",
      },
    ],
    en: [
      {
        question: "Does the SNS offer DXA bone density scans?",
        answer:
          "Yes. DXA scanning is available through the SNS on referral, and privately without one in most clinics. Portugal follows a risk-factor-led approach similar to this checker's — risk factors decide who is assessed, not age or a scan alone.",
      },
      {
        question: "Where can I get assessed for osteoporosis in Portugal?",
        answer:
          "Start with a medical appointment. The doctor will go through your risk factors and, where the guideline threshold is met, refer you for a DXA scan through the SNS or arrange a private one.",
      },
    ],
  },
  es: {
    es: [
      {
        question: "¿El Sistema Nacional de Salud hace densitometrías óseas?",
        answer:
          "Sí. La densitometría ósea (DXA) está disponible en la sanidad pública mediante derivación médica, y también en clínicas privadas sin derivación previa. España sigue un enfoque de identificación de riesgo similar al de esta herramienta — son los factores de riesgo los que deciden a quién evaluar, no la edad ni una prueba aislada.",
      },
      {
        question: "¿Dónde puedo evaluarme por osteoporosis en España?",
        answer:
          "Empieza por una consulta médica. El médico revisará tus factores de riesgo y, si se alcanza el umbral de las guías clínicas, te derivará a una densitometría ósea en la sanidad pública o te orientará hacia una privada.",
      },
    ],
    en: [
      {
        question: "Does the Spanish health system offer DXA bone density scans?",
        answer:
          "Yes. DXA scanning is available through the public health system on referral, and privately without one in most clinics. Spain follows a risk-factor-led approach similar to this checker's — risk factors decide who is assessed, not age or a scan alone.",
      },
      {
        question: "Where can I get assessed for osteoporosis in Spain?",
        answer:
          "Start with a medical appointment. The doctor will go through your risk factors and, where the guideline threshold is met, refer you for a DXA scan through the public system or arrange a private one.",
      },
    ],
  },
  cz: {
    cs: [
      {
        question: "Provádí se v Česku kostní denzitometrie v rámci veřejného zdravotnictví?",
        answer:
          "Ano. Kostní denzitometrie (DXA) je dostupná na doporučení lékaře v rámci veřejného zdravotního pojištění a v mnoha klinikách i samoplátcům bez doporučení. Česko se řídí podobným přístupem založeným na rizikových faktorech jako tento nástroj — o vyšetření rozhodují rizikové faktory, ne jen věk nebo samotné vyšetření.",
      },
      {
        question: "Kde se mohu v Česku nechat vyšetřit na osteoporózu?",
        answer:
          "Začněte u lékaře. Projde s vámi vaše rizikové faktory a v případě, že je naplněna hranice doporučeného postupu, vás doporučí na kostní denzitometrii v rámci pojištění, nebo vás nasměruje na samoplátecké vyšetření.",
      },
    ],
    en: [
      {
        question: "Do Czech doctors offer DXA bone density scans?",
        answer:
          "Yes. DXA scanning is available on referral within the public insurance system, and privately without one in many clinics. Czechia follows a similar risk-factor-led approach to this checker — risk factors decide who is assessed, not age or a scan alone.",
      },
      {
        question: "Where can I get assessed for osteoporosis in Czechia?",
        answer:
          "Start with a doctor's appointment. They will go through your risk factors and, where the guideline threshold is met, refer you for a DXA scan within the insurance system or point you to a private one.",
      },
    ],
  },
  ro: {
    ro: [
      {
        question: "Se fac densitometrii osoase în sistemul public din România?",
        answer:
          "Da. Densitometria osoasă (DXA) este disponibilă pe bază de trimitere medicală în sistemul asigurărilor de sănătate, iar în multe clinici și fără trimitere, contra cost. România urmează o abordare bazată pe factori de risc similară celei din acest instrument — factorii de risc decid cine este evaluat, nu doar vârsta sau o singură investigație.",
      },
      {
        question: "Unde mă pot evalua pentru osteoporoză în România?",
        answer:
          "Începe cu o consultație medicală. Medicul îți va analiza factorii de risc și, dacă este atins pragul din ghidurile clinice, te va trimite pentru o densitometrie osoasă decontată sau te va îndruma către una privată.",
      },
    ],
    en: [
      {
        question: "Do doctors in Romania offer DXA bone density scans?",
        answer:
          "Yes. DXA scanning is available on referral within the public health insurance system, and privately without one in many clinics. Romania follows a similar risk-factor-led approach to this checker — risk factors decide who is assessed, not age or a scan alone.",
      },
      {
        question: "Where can I get assessed for osteoporosis in Romania?",
        answer:
          "Start with a doctor's appointment. They will go through your risk factors and, where the guideline threshold is met, refer you for a covered DXA scan or point you to a private one.",
      },
    ],
  },
  br: {
    pt: [
      {
        question: "O SUS faz densitometria óssea?",
        answer:
          "Sim. A densitometria óssea (DXA) está disponível pelo SUS mediante encaminhamento médico, e também na rede particular sem encaminhamento na maioria das clínicas. O Brasil segue uma abordagem de identificação de risco semelhante à desta ferramenta — são os fatores de risco que decidem quem deve ser avaliado, não a idade ou um exame isolado.",
      },
      {
        question: "Onde posso ser avaliado(a) para osteoporose no Brasil?",
        answer:
          "Comece por uma consulta médica. O médico vai revisar seus fatores de risco e, quando o limiar das diretrizes clínicas for atingido, encaminhar você para uma densitometria óssea pelo SUS ou indicar uma na rede particular.",
      },
    ],
    en: [
      {
        question: "Does the SUS offer DXA bone density scans?",
        answer:
          "Yes. DXA scanning is available through the SUS on referral, and privately without one in most clinics. Brazil follows a risk-factor-led approach similar to this checker's — risk factors decide who should be assessed, not age or a scan alone.",
      },
      {
        question: "Where can I get assessed for osteoporosis in Brazil?",
        answer:
          "Start with a medical appointment. The doctor will go through your risk factors and, where the guideline threshold is met, refer you for a DXA scan through the SUS or point you to a private one.",
      },
    ],
  },
};

const MARKET_FAQ: Record<string, MarketFaq> = {
  "bmi-calculator": BMI_MARKET_FAQ,
  "calorie-calculator": CALORIE_MARKET_FAQ,
  "blood-pressure-chart": BP_MARKET_FAQ,
  "due-date-calculator": DUE_DATE_MARKET_FAQ,
  "ovulation-calculator": OVULATION_MARKET_FAQ,
  "adhd-test": ADHD_MARKET_FAQ,
  "osteoporosis-risk-checker": OSTEOPOROSIS_MARKET_FAQ,
};

/**
 * Market-specific FAQ items for a tool in a country/language, or an empty list
 * when that combination has none — the caller then shows the shared language
 * FAQ unchanged.
 */
export function getMarketFaq(
  code: string,
  lang: string,
  slug: string,
): Array<{ question: string; answer: string }> {
  const market = MARKET_FAQ[slug]?.[code.toLowerCase() as CountryCode];
  return market?.[lang.toLowerCase()] ?? [];
}

/* ------------------------------------------------------------------ pt-BR */

/**
 * Brazilian Portuguese, overriding the shared `pt` file.
 *
 * Portugal and Brazil share the `pt` locale, so `/brazil/pt` shipped European
 * Portuguese: "tensão arterial" for what Brazilians call "pressão arterial",
 * "rastreio" for "triagem", "Introduza" for "Insira", "guardado" for "salvo",
 * "Marcar consulta" for "Agendar consulta". Brazil is the largest tool market
 * we have — `calculadora imc` is 246,000/mo there against 9,900 in Portugal —
 * so it earns its own copy rather than a foreign-sounding translation.
 *
 * A market override rather than a `pt-BR` locale folder: `LocaleCode` and the
 * whole `locales/` loader are language-keyed, and adding a seventh locale to
 * satisfy one market would touch every namespace on the site.
 *
 * Arrays replace wholesale on merge (see `deepMergeLocale`), so `sections`,
 * `faq` and `trustPoints` are given in full. Anything omitted falls back to
 * the shared `pt` copy.
 */
const BR_PT_BMI: DeepPartial<ToolCopy> = {
  // `calculadora imc` is 246,000/mo in Brazil against 49,500 for `calculadora
  // DE imc` — the shared `pt` copy targets the smaller of the two variants.
  h1Accent: "IMC",
  metaTitle: "Calculadora IMC {country} | Calcular o IMC Online",
  metaDescription:
    "Calcule seu índice de massa corporal em segundos. Sistema métrico ou imperial, categorias da OMS para adultos e o que o resultado significa na prática.",
  lede: "Insira sua altura e seu peso para ver o índice de massa corporal e onde ele se situa na escala da Organização Mundial da Saúde para adultos.",
  trustPoints: [
    "Métrico e imperial (kg, stone, libras)",
    "Categorias de peso da OMS para adultos",
    "Roda no seu navegador — nada é enviado nem salvo",
  ],
  widget: {
    placeholder: "Insira a altura e o peso para ver seu índice de massa corporal.",
    note: "O IMC é uma medida de triagem, não um diagnóstico. Não distingue músculo de gordura e não vale na gravidez nem para menores de 18 anos.",
    healthyRangeLabel: "Peso saudável para sua altura",
    gapAbove: "{kg} kg acima da faixa saudável",
    gapBelow: "{kg} kg abaixo da faixa saudável",
    gapInside: "Dentro da faixa saudável",
    gapLabel: "Distância até a faixa saudável",
    scaleLabel: "Onde seu IMC se situa na escala da OMS",
  },
  sections: [
    {
      heading: "O que significa seu resultado de IMC",
      body: [
        "A Organização Mundial da Saúde agrupa o IMC dos adultos nas faixas abaixo. Elas descrevem uma população, não uma pessoa: duas pessoas com o mesmo IMC podem ter estados de saúde bem diferentes.",
      ],
      bullets: [],
      table: {
        caption: "Categorias de IMC da OMS para adultos",
        columns: ["IMC", "Categoria", "O que costuma significar"],
        rows: [
          ["Abaixo de 18,5", "Baixo peso", "Vale uma conversa com um médico, principalmente se a perda não foi procurada"],
          ["18,5 – 24,9", "Peso saudável", "Nada que precise mudar só por causa desse número"],
          ["25,0 – 29,9", "Sobrepeso", "Bom momento para checar a pressão arterial e o colesterol"],
          ["30,0 – 34,9", "Obesidade grau I", "Daqui em diante costuma ser oferecido acompanhamento estruturado do peso"],
          ["35,0 – 39,9", "Obesidade grau II", "Uma avaliação médica, e rastreamento das doenças que costumam vir junto"],
          ["40,0 ou mais", "Obesidade grau III", "Um encaminhamento para acompanhamento especializado do peso"],
        ],
        footnote:
          "Pessoas de origem sul-asiática, chinesa e de algumas outras origens asiáticas têm risco cardiometabólico maior com um IMC mais baixo. A OMS sugere 23,0 e 27,5 como pontos de ação adicionais nessas populações.",
      },
    },
    {
      heading: "Como o IMC é calculado",
      body: [
        "O IMC é seu peso em quilogramas dividido pelo quadrado da sua altura em metros. Essa é a fórmula inteira — não entram idade, sexo nem composição corporal.",
        "Exemplo prático: alguém com 1,75 m pesando 78 kg tem um IMC de 78 ÷ (1,75 × 1,75) = 25,5, o que cai na faixa de sobrepeso.",
        "Os valores imperiais são convertidos antes (1 stone = 6,35 kg, 1 polegada = 2,54 cm), então o resultado é idêntico nos dois sistemas.",
      ],
      bullets: [],
    },
    {
      heading: "O que o IMC não diz",
      body: [
        "O IMC é um número de triagem, não um diagnóstico. Ele é útil justamente por ser simples — bastam uma fita métrica e uma balança — mas é aí que está também o seu limite.",
      ],
      bullets: [
        "Não separa músculo de gordura. Pessoas bem musculosas são classificadas com sobrepeso com frequência.",
        "Ignora onde a gordura está. A circunferência abdominal prevê o risco cardiometabólico melhor do que o IMC.",
        "Não é validado para a gravidez — use o IMC anterior à gestação no planejamento do pré-natal.",
        "Crianças e adolescentes precisam de curvas de percentil por idade e sexo, não das faixas de adulto acima.",
        "Em adultos com mais de 65 anos, um IMC pouco acima de 25 não está consistentemente ligado a desfechos piores.",
      ],
    },
    {
      heading: "Quando falar com um médico sobre seu peso",
      body: [],
      bullets: [
        "Você perdeu ou ganhou peso sem querer.",
        "Seu IMC é 30 ou mais, ou 25 ou mais junto com pressão alta, colesterol alto ou glicemia elevada.",
        "Você está investigando, ou já trata, diabetes tipo 2, apneia do sono, SOP ou esteatose hepática.",
        "Você quer discutir acompanhamento médico do peso em vez de mais uma dieta.",
      ],
    },
  ],
  faq: [
    {
      question: "Qual é um IMC saudável para um adulto?",
      answer:
        "Para a maioria dos adultos de 18 a 65 anos, a Organização Mundial da Saúde considera saudável um IMC entre 18,5 e 24,9. Acima de 25 é classificado como sobrepeso e 30 ou mais como obesidade. São limites populacionais, então um valor isolado é um convite a investigar mais, não um veredito.",
    },
    {
      question: "O IMC é calculado de forma diferente para homens e mulheres?",
      answer:
        "Não. A fórmula e as categorias de adulto são idênticas. As mulheres costumam ter uma proporção maior de gordura corporal que os homens com o mesmo IMC, e essa é uma das razões pelas quais o número é só um ponto de partida.",
    },
    {
      question: "Qual é a precisão de uma calculadora de IMC?",
      answer:
        "A conta é exata — a incerteza está no que o IMC mede. Ele se correlaciona razoavelmente com a gordura corporal no nível populacional, mas pode classificar mal indivíduos, principalmente atletas, idosos e pessoas com muita massa muscular.",
    },
    {
      question: "O que fazer se meu IMC estiver na faixa de obesidade?",
      answer:
        "Cheque sua pressão arterial, seu colesterol e sua glicemia, e converse com um médico sobre um plano que você consiga manter. O acompanhamento do peso com avaliação médica funciona bem melhor do que fazer dieta sozinho.",
    },
    {
      question: "Esta calculadora de IMC guarda meus dados?",
      answer:
        "Não. O cálculo roda inteiramente no seu navegador. Nada do que você digitar é enviado aos nossos servidores nem salvo.",
    },
    {
      question: "Preciso de um IMC para conseguir tratamento para emagrecer?",
      answer:
        "Os profissionais costumam usar o IMC como um dos critérios de entrada em programas de acompanhamento do peso, normalmente junto com seu histórico médico e eventuais doenças associadas. Seu médico vai confirmar o que se aplica ao seu caso.",
    },
  ],
  cta: {
    heading: "Quer conversar sobre seu resultado?",
    body: "Agende uma teleconsulta com um médico registrado e receba um plano construído a partir do seu histórico, não de um número.",
    label: "Agendar consulta",
  },
};

/** Same treatment for the calorie tool: `déficit`/`superávit`, not `défice`. */
const BR_PT_CALORIE: DeepPartial<ToolCopy> = {
  cardBlurb: "Quantas calorias por dia você precisa para manter, perder ou ganhar peso.",
  metaDescription:
    "Calcule quantas calorias você precisa por dia para manter, perder ou ganhar peso. Equação de Mifflin-St Jeor, cinco níveis de atividade e o que os números significam na prática.",
  lede: "Insira sexo, idade, altura, peso e o quanto você se movimenta para ver quantas calorias gasta por dia — e quantas comer para manter, perder ou ganhar peso.",
  trustPoints: [
    "Equação de Mifflin-St Jeor, a que os médicos usam",
    "Manutenção, perda e ganho numa única tela",
    "Roda no seu navegador — nada é enviado nem salvo",
  ],
  suggestionsIntro:
    "Um número de calorias é um ponto de partida, não um plano. Estas são as consultas que os nossos médicos fazem para peso, nutrição e os exames que um número não dá.",
  widget: {
    placeholder: "Insira seus dados para ver quantas calorias você gasta por dia.",
    note: "Estimativas para adultos saudáveis e uma ferramenta de orientação, não um diagnóstico nem uma dieta prescrita. Fale com um médico antes de mudar a sua ingestão se estiver grávida ou amamentando, tiver menos de 18 anos ou estiver em tratamento de alguma doença.",
    noteFloored:
      "A sua meta de perda foi mantida em 1.200 kcal, a menor ingestão diária que esta calculadora sugere. Comer abaixo disso só com acompanhamento médico.",
    resultSummary: "O que você gasta num dia comum nesse nível de atividade, tudo incluído.",
    mildLossLabel: "Perder cerca de 0,25 kg por semana",
    lossLabel: "Perder cerca de 0,5 kg por semana",
    gainLabel: "Ganhar cerca de 0,25 kg por semana",
  },
  sections: [
    {
      heading: "O que significam seus números de calorias",
      body: [
        "O número principal é a sua manutenção: aproximadamente o que você gasta num dia, já contando a atividade. Se comer isso, o peso fica onde está.",
        "As metas abaixo dele são o mesmo número com um déficit ou um superávit aplicado. Um déficit diário de 500 kcal dá cerca de meio quilo por semana, que é o ritmo em que a maioria das recomendações se apoia — rápido o bastante para aparecer e lento o bastante para sustentar.",
      ],
      bullets: [],
      table: {
        caption: "Metas diárias de calorias a partir da sua manutenção",
        columns: ["Objetivo", "Ingestão diária", "O que esperar"],
        rows: [
          ["Manter", "O seu valor de manutenção", "O peso se mantém ao longo de semanas, não de dias"],
          ["Perda leve", "Manutenção − 250 kcal", "Cerca de 0,25 kg por semana"],
          ["Perda constante", "Manutenção − 500 kcal", "Cerca de 0,5 kg por semana"],
          [
            "Ganho",
            "Manutenção + 300 kcal",
            "Cerca de 0,25 kg por semana, de preferência com treino de força",
          ],
        ],
        footnote:
          "Aqui as metas de perda nunca descem abaixo de 1.200 kcal por dia. Abaixo disso fica difícil cobrir com comida as necessidades de proteína, vitaminas e minerais, e uma ingestão tão baixa deve ter acompanhamento médico.",
      },
    },
    {
      heading: "Como escolher seu nível de atividade",
      body: [
        "O multiplicador de atividade é a maior alavanca desse cálculo: para o mesmo corpo, a diferença entre sedentário e extremamente ativo passa de 700 kcal por dia. Entra tudo o que você faz, não só o treino — ficar em pé, caminhar, as tarefas de casa e o seu trabalho contam.",
        "A maioria das pessoas escolhe um nível acima do real. Se você treina três vezes por semana e passa o resto do tempo sentado, está entre levemente e moderadamente ativo, não muito ativo.",
      ],
      bullets: [
        "Sedentário — trabalho sentado e pouco ou nenhum exercício proposital.",
        "Levemente ativo — exercício leve ou esporte de um a três dias por semana.",
        "Moderadamente ativo — exercício moderado de três a cinco dias por semana.",
        "Muito ativo — exercício intenso seis ou sete dias por semana.",
        "Extremamente ativo — trabalho fisicamente pesado ou treino intenso duas vezes por dia.",
      ],
    },
    {
      heading: "Como o cálculo funciona",
      body: [
        "O seu metabolismo basal — o que o corpo gasta em repouso completo — vem da equação de Mifflin-St Jeor: 10 × peso em kg, mais 6,25 × altura em cm, menos 5 × idade, e depois mais 5 nos homens ou menos 161 nas mulheres.",
        "Esse valor é multiplicado pelo seu nível de atividade, de 1,2 para sedentário até 1,9 para extremamente ativo. O resultado é o gasto energético total diário — o número de manutenção que aparece no topo.",
        "Exemplo prático: um homem de 30 anos, com 180 cm e 80 kg, tem metabolismo basal de 1.780 kcal. Levemente ativo (× 1,375) são cerca de 2.448 kcal por dia para manter o peso.",
      ],
      bullets: [],
    },
    {
      heading: "O que uma calculadora de calorias não diz",
      body: [
        "Toda equação aqui é uma média populacional ajustada a dados medidos, e as pessoas ficam de um lado ou do outro dela. Trate o número como uma estimativa para testar na balança por três ou quatro semanas, não como um fato sobre o seu corpo.",
      ],
      bullets: [
        "Na maioria dos adultos a estimativa costuma ficar dentro de uns 10 % — são 200 kcal para cada lado num dia de 2.000 kcal.",
        "Ela não diz nada sobre do que essas calorias são feitas, e são a proteína, as fibras e os micronutrientes que decidem se a alimentação se sustenta.",
        "Doenças da tireoide, alguns medicamentos e um longo histórico de dietas afastam o gasto real da estimativa.",
        "Não foi pensada para crianças, para gravidez ou amamentação, nem para atletas em blocos pesados de treino.",
        "Subestima pessoas muito musculosas, porque a equação usa o peso total e não a massa magra.",
      ],
    },
  ],
  faq: [
    {
      question: "Quantas calorias devo comer por dia?",
      answer:
        "As que você gasta, se o seu peso já está onde você quer. Na maioria dos adultos isso cai entre 1.800 e 2.800 kcal, mas a faixa é larga porque depende do seu tamanho, da idade e do quanto você se movimenta. A calculadora acima dá o seu número em vez da média.",
    },
    {
      question: "Quantas calorias preciso comer para emagrecer?",
      answer:
        "Cerca de 500 kcal por dia abaixo da manutenção dão mais ou menos meio quilo por semana, e 250 abaixo dão cerca de um quarto de quilo. Déficits maiores não funcionam de forma confiável mais rápido — são só mais difíceis de manter, e uma parte maior da perda vem do músculo.",
    },
    {
      question: "1.200 calorias por dia é seguro?",
      answer:
        "É a menor ingestão que esta calculadora sugere e funciona como piso, não como recomendação. Abaixo desse nível fica difícil obter proteína, vitaminas e minerais suficientes pela comida, então uma ingestão menor só deve ser seguida com acompanhamento médico.",
    },
    {
      question: "Qual fórmula esta calculadora de calorias usa?",
      answer:
        "Mifflin-St Jeor para o metabolismo basal e depois um multiplicador de atividade padrão. Ela substituiu a antiga equação de Harris-Benedict na prática clínica por ser mais precisa para as composições corporais atuais, normalmente dentro de uns 10 % em adultos saudáveis.",
    },
    {
      question: "Preciso contar calorias para emagrecer?",
      answer:
        "Não. Contar é só um jeito de manter um déficit, e muita gente consegue o mesmo mudando o que come em vez de pesar. Saber mais ou menos onde está a sua manutenção ajuda de qualquer forma, porque mostra o tamanho real da mudança que você está fazendo.",
    },
    {
      question: "Esta calculadora de calorias guarda meus dados?",
      answer:
        "Não. O cálculo roda inteiramente no seu navegador. Nada do que você digitar é enviado aos nossos servidores nem salvo.",
    },
  ],
  cta: {
    heading: "Quer um plano, não só um número?",
    body: "Agende uma teleconsulta com um médico registrado e veja o que o número significa para o seu peso, seus exames e seu histórico.",
    label: "Agendar consulta",
  },
};

/**
 * Blood pressure is the sharpest pt-PT/pt-BR split of the set: Portugal says
 * "tensão arterial" and "medir", Brazil says "pressão arterial" and "aferir",
 * and `tabela pressão arterial` is a 2,400/mo Brazilian query that the
 * European wording would not rank for at all. The emergency number is also
 * market-specific — SAMU 192 — so the urgent copy is rewritten, not merged.
 */
const BR_PT_BP: DeepPartial<ToolCopy> = {
  cardTitle: "Tabela de pressão arterial",
  cardBlurb:
    "O que os seus dois números significam na tabela de pressão arterial para adultos.",
  // `pressão arterial normal` is 22,200/mo at KD 1 in Brazil against 2,900 for
  // `tabela de pressão arterial` — and the SERP for it is exactly this page
  // type (explainer carrying a value table), not a calculator. The chart stays
  // in the tail and in `cardTitle`, which is what the nav and breadcrumb use.
  h1Lead: "Pressão arterial",
  h1Accent: "normal",
  metaTitle: "Pressão Arterial Normal {country} | Tabela de Valores",
  metaDescription:
    "Compare sua pressão sistólica e diastólica com a tabela para adultos. Veja a categoria, o que ela significa e quais medidas exigem atendimento médico no mesmo dia.",
  lede: "Insira os dois números do seu aparelho para ver onde a medida se encaixa na tabela para adultos — e o que fazer, se houver algo a fazer.",
  trustPoints: [
    "Categorias europeias (ESC/ESH) para adultos",
    "Sinaliza as medidas que precisam de atendimento no mesmo dia",
    "Roda no seu navegador — nada é enviado nem salvo",
  ],
  suggestionsIntro:
    "Uma medida de pressão é um sinal, não um plano. Estas são as consultas que os nossos médicos fazem para o que ela aponta.",
  widget: {
    title: "Sua medida",
    placeholder:
      "O número de cima precisa ser maior que o de baixo — confira os dois valores no seu aparelho.",
    note: "Esta tabela é uma referência de triagem, não um diagnóstico. A hipertensão é diagnosticada com medidas repetidas, normalmente uma semana de aferições em casa ou uma MAPA de 24 horas, nunca com um valor isolado.",
    scaleLabel: "Onde está o seu valor sistólico",
    optimalLabel: "Ótima para a maioria dos adultos",
    optimalValue: "Abaixo de {systolic}/{diastolic} mmHg",
    urgentTitle: "Procure atendimento médico hoje",
    urgentBody:
      "Uma medida tão alta precisa ser avaliada no mesmo dia. Sente-se, fique cinco minutos em repouso e afira de novo — se continuar assim, procure um médico ainda hoje.",
    urgentSymptoms:
      "Ligue agora para o SAMU (192) se você também tiver dor no peito, fraqueza ou dormência em um lado do corpo, dificuldade para falar ou uma alteração súbita da visão.",
  },
  sections: [
    {
      heading: "A tabela de pressão arterial para adultos",
      body: [
        "A pressão arterial é escrita com dois números: a pressão sistólica, enquanto o coração se contrai, sobre a pressão diastólica, enquanto ele relaxa entre os batimentos. As duas são medidas em milímetros de mercúrio (mmHg).",
        "As categorias abaixo são as europeias (ESC/ESH). Quando os dois números caem em categorias diferentes, vale a mais alta: 128/95 é hipertensão grau 1, e não pressão normal.",
      ],
      bullets: [],
      table: {
        caption: "Categorias de pressão arterial em adultos",
        columns: ["Categoria", "Sistólica (mmHg)", "Diastólica (mmHg)"],
        rows: [
          ["Baixa", "Menos de 90", "ou menos de 60"],
          ["Ótima", "Menos de 120", "e menos de 80"],
          ["Normal", "120 – 129", "e/ou 80 – 84"],
          ["Normal-alta", "130 – 139", "e/ou 85 – 89"],
          ["Hipertensão grau 1", "140 – 159", "e/ou 90 – 99"],
          ["Hipertensão grau 2", "160 – 179", "e/ou 100 – 109"],
          ["Hipertensão grau 3", "180 ou mais", "e/ou 110 ou mais"],
          ["Sistólica isolada", "140 ou mais", "e menos de 90"],
        ],
        footnote:
          "Limites para a aferição em consultório, em adultos. Aparelhos de uso doméstico e a MAPA de 24 horas registram valores mais baixos, então em casa a hipertensão começa em 135/85 e não em 140/90. Gravidez, infância e diálise têm alvos totalmente diferentes.",
      },
    },
    {
      heading: "Como aferir a pressão de um jeito confiável",
      body: [
        "A maior parte das medidas assustadoras é erro de aferição. A pressão muda ao longo do dia e sobe se você chega correndo, está com a bexiga cheia ou conversa com o manguito no braço, então o jeito de medir muda o número mais do que as pessoas imaginam.",
      ],
      bullets: [
        "Fique sentado em repouso por cinco minutos antes — costas apoiadas, pés no chão, pernas descruzadas.",
        "Nada de café, comida, exercício ou cigarro nos 30 minutos anteriores, e esvazie a bexiga.",
        "Apoie o braço na mesa para que o manguito fique na altura do coração, sobre a pele.",
        "Use um manguito do tamanho certo. Um manguito pequeno demais mede alto e é o erro mais comum em casa.",
        "Não fale durante a aferição: falar acrescenta vários mmHg.",
        "Faça duas medidas com um minuto de intervalo e use a segunda, ou a média das duas.",
        "Afira de manhã e à noite por sete dias e leve a série inteira ao médico.",
      ],
    },
    {
      heading: "O que uma única medida não diz",
      body: [
        "Uma medida é uma fotografia de um momento, em um braço. Serve para sinalizar um problema, mas não para dar nome a ele, e é por isso que o diagnóstico se apoia em medidas repetidas e não no primeiro número que assusta.",
      ],
      bullets: [
        "Hipertensão do avental branco: alta no consultório e normal em casa. É comum, e só a aferição em casa ou a MAPA separam uma coisa da outra.",
        "Hipertensão mascarada: normal no consultório e alta no resto do tempo. É a mais arriscada das duas e fica invisível sem aferições em casa.",
        "Os braços diferem. Uma diferença maior que 10 mmHg entre eles importa, e a partir daí usa-se sempre o braço de valor mais alto.",
        "Pulso irregular, inclusive fibrilação atrial, torna a maioria dos aparelhos automáticos pouco confiável.",
        "Nem todo aparelho doméstico é validado clinicamente, e um aparelho não validado pode errar bastante.",
        "A gravidez tem limites e riscos próprios: pressão alta na gestação precisa de avaliação obstétrica, não desta tabela.",
      ],
    },
    {
      heading: "Quando procurar um médico e quando pedir ajuda agora",
      body: ["A maior parte das medidas altas se resolve em uma consulta comum. Algumas não."],
      bullets: [
        "Ligue agora para o SAMU (192) se uma medida muito alta vier com dor no peito, fraqueza ou dormência em um lado do corpo, dificuldade para falar ou alteração súbita da visão. São sinais de infarto ou de AVC.",
        "Procure atendimento no mesmo dia diante de uma medida de 180/120 ou mais, mesmo sem nenhum sintoma.",
        "Marque uma avaliação nas semanas seguintes se as medidas ficarem repetidamente em 140/90 ou acima.",
        "Converse com um médico se as medidas ficarem repetidamente abaixo de 90/60 e você sentir tontura, desmaio ou cansaço fora do comum.",
        "Leve à consulta as suas aferições e também o aparelho. O que se trata é o padrão, não o pior número.",
      ],
    },
  ],
  faq: [
    {
      question: "Qual é a pressão arterial normal de um adulto?",
      answer:
        "Abaixo de 120/80 mmHg é ótima, e 120–129 sobre 80–84 ainda é considerada normal. A partir de 130/85 a medida é normal-alta, e 140/90 ou mais aferidos no consultório indicam hipertensão. Aparelhos domésticos registram valores mais baixos, então em casa o limite é 135/85.",
    },
    {
      question: "Qual número importa mais, o de cima ou o de baixo?",
      answer:
        "Os dois. A categoria é definida pelo pior deles, então 128/95 conta como hipertensão grau 1 só pelo número de baixo. A sistólica prevê melhor o risco cardiovascular depois dos 50 anos, e a diastólica antes disso.",
    },
    {
      question: "O que significa uma pressão sistólica isolada?",
      answer:
        "Uma sistólica de 140 ou mais com a diastólica abaixo de 90. É o padrão mais comum de pressão alta depois dos 60 anos, vem do enrijecimento das artérias com a idade e traz risco cardiovascular real — não é uma peculiaridade inofensiva do número de cima.",
    },
    {
      question: "Uma única medida alta significa que eu tenho hipertensão?",
      answer:
        "Não. A hipertensão é diagnosticada com medidas altas repetidas, normalmente apoiadas por uma semana de aferições em casa ou por uma MAPA de 24 horas. Uma medida alta isolada é motivo para aferir de novo com calma, não um diagnóstico.",
    },
    {
      question: "Qual pressão arterial é perigosa?",
      answer:
        "Uma medida de 180/120 ou mais precisa de atendimento médico no mesmo dia. Se vier com dor no peito, fraqueza ou dormência em um lado, dificuldade para falar ou alteração súbita da visão, ligue imediatamente para o SAMU (192) — são sintomas de infarto ou de AVC.",
    },
    {
      question: "Esta tabela de pressão arterial guarda a minha medida?",
      answer:
        "Não. A comparação roda inteiramente no seu navegador. Nada do que você digitar é enviado aos nossos servidores nem salvo.",
    },
  ],
  cta: {
    heading: "Quer que um médico veja as suas medidas?",
    body: "Agende uma teleconsulta com um médico registrado, leve uma semana de aferições em casa e receba um plano construído a partir do padrão, não de um número isolado.",
    label: "Agendar consulta",
  },
};

/**
 * Due date, Brazilian Portuguese. The biggest single tool opportunity we have:
 * `calculadora gestacional` is 135,000/mo in Brazil at KD 0 — so the Brazilian
 * page leads on that name rather than on Portugal's "calculadora da data do
 * parto", and swaps the European clinical vocabulary throughout ("ultrassom"
 * for "ecografia", "pré-natal" for "vigilância da gravidez", "bebê", "vômitos",
 * "pressão arterial", "concepção").
 */
const BR_PT_DUE_DATE: DeepPartial<ToolCopy> = {
  cardTitle: "Calculadora gestacional",
  cardBlurb:
    "A data provável do parto, quantas semanas de gestação você tem e as semanas que importam no caminho.",
  h1Lead: "Calculadora",
  h1Accent: "gestacional",
  // `calculadora gestacional` is 135,000/mo at KD 0 and the SERP is full of
  // single-clinic domains, so this is the most winnable page we have. Seven of
  // the top twenty title themselves "calculadora de IDADE gestacional" — the
  // phrase belongs in the tail rather than only in the body copy.
  metaTitle: "Calculadora Gestacional {country} | Idade Gestacional e DPP",
  metaDescription:
    "Calcule a idade gestacional e a data provável do parto (DPP) a partir do primeiro dia da última menstruação. Ajusta-se à duração do seu ciclo, com as 40 semanas detalhadas.",
  lede: "Informe o primeiro dia da última menstruação para ver a data provável do parto, em qual semana você está hoje e quando começa cada trimestre.",
  trustPoints: [
    "Ajusta-se a ciclos de 20 a 45 dias",
    "Datas dos trimestres e a janela de termo (37–42 semanas)",
    "Roda no seu navegador — nada é enviado nem salvo",
  ],
  suggestionsIntro:
    "Uma data estimada é onde o pré-natal começa, não tudo o que ele é. Estas são as consultas que dão o passo seguinte.",
  widget: {
    title: "Sua data provável do parto",
    placeholder: "Informe o primeiro dia da última menstruação para ver a data provável do parto.",
    note: "É uma estimativa a partir das datas que você informa, não um diagnóstico. O ultrassom de datação mede o bebê diretamente e substitui essa conta.",
    lmpLabel: "Primeiro dia da última menstruação",
    lmpHint: "O dia em que o sangramento começou, não o dia em que terminou.",
    cycleLabel: "Duração do ciclo",
    cycleHint:
      "Dias do início de uma menstruação até o início da seguinte. Se não souber, deixe 28.",
    daysUnit: "dias",
    gestationalAgeLabel: "Semanas de gestação hoje",
    daysToGoLabel: "Dias que faltam",
    secondTrimesterLabel: "Início do segundo trimestre",
    thirdTrimesterLabel: "Início do terceiro trimestre",
    termWindowLabel: "Janela de termo (37–42 semanas)",
    trimester1: "Primeiro trimestre",
    trimester1Note:
      "Semanas 1 a 13. É quando o pré-natal é aberto e se faz o ultrassom de datação.",
    trimester2: "Segundo trimestre",
    trimester2Note:
      "Semanas 14 a 27. O ultrassom morfológico costuma ser feito por volta das 20 semanas.",
    trimester3: "Terceiro trimestre",
    trimester3Note:
      "Da semana 28 em diante. As avaliações de crescimento e de pressão arterial ficam mais próximas conforme o termo se aproxima.",
    outOfRangeNote:
      "Confira a data — ela está no futuro ou há mais de 42 semanas, fora do intervalo que esta calculadora consegue datar.",
  },
  sections: [
    {
      heading: "Sua gestação semana a semana",
      body: [
        "A gestação é datada a partir do primeiro dia da última menstruação, e não da concepção, e conta 40 semanas de lá. Antes de 37 semanas o parto é prematuro, de 42 semanas em diante é pós-termo, e é entre essas semanas que praticamente todos os bebês nascem.",
        "A tabela abaixo são as 40 semanas inteiras, divididas como o pré-natal as divide.",
      ],
      bullets: [],
      table: {
        caption: "Fases da gestação em semanas a partir da última menstruação",
        columns: ["Semanas", "Fase", "O que costuma acontecer"],
        rows: [
          [
            "1 – 13",
            "Primeiro trimestre",
            "Abertura do pré-natal, primeiros exames e ultrassom de datação",
          ],
          [
            "14 – 27",
            "Segundo trimestre",
            "O ultrassom morfológico, normalmente por volta das 20 semanas",
          ],
          [
            "28 – 36",
            "Terceiro trimestre",
            "As avaliações de crescimento, pressão e posição ficam mais próximas",
          ],
          ["37 – 38", "Termo precoce", "Daqui em diante o parto já não é prematuro"],
          ["39 – 40", "Termo completo", "A data provável do parto fica no fim da semana 40"],
          ["41", "Termo tardio", "O acompanhamento aumenta e costuma-se discutir a indução"],
          ["42 ou mais", "Pós-termo", "O parto normalmente é induzido em vez de se esperar"],
        ],
        footnote:
          "As últimas quatro linhas são todas o fim do terceiro trimestre — a partir de 37 semanas conta-se em intervalos mais curtos porque é isso que muda a conduta. Só cerca de uma gestação em vinte termina exatamente na data prevista.",
      },
    },
    {
      heading: "Como a data do parto é calculada",
      body: [
        "A estimativa é a regra de Naegele: 280 dias, ou 40 semanas, a partir do primeiro dia da última menstruação. Ela pressupõe um ciclo de 28 dias com ovulação por volta do dia 14.",
        "Se os seus ciclos são mais longos ou mais curtos, a ovulação acompanha, então a calculadora desloca a data pela mesma diferença. Um ciclo de 32 dias joga a estimativa quatro dias para frente; um de 24 dias traz quatro dias para trás.",
        "Exemplo prático: uma última menstruação começando em 1º de janeiro com ciclo de 28 dias dá 8 de outubro. A mesma menstruação com ciclo de 32 dias dá 12 de outubro.",
      ],
      bullets: [],
    },
    {
      heading: "Por que o ultrassom substitui esta estimativa",
      body: [
        "Uma calculadora só trabalha com as datas que você dá. O ultrassom mede o bebê, e é por isso que a data dele passa a valer no pré-natal.",
      ],
      bullets: [
        "Depende de lembrar com exatidão o primeiro dia da última menstruação.",
        "Pressupõe que você ovulou no meio do ciclo, o que não acontece com todas as pessoas.",
        "Ciclos irregulares, anticoncepcional interrompido há pouco tempo e amamentação deixam a última menstruação como referência fraca.",
        "O ultrassom de primeiro trimestre mede o bebê, em geral entre 11 e 14 semanas, com margem de poucos dias.",
        "Depois de uma FIV a datação parte da data da transferência, e não de uma menstruação, então esta estimativa não se aplica.",
      ],
    },
    {
      heading: "Quando procurar um médico",
      body: [],
      bullets: [
        "Você acha que está grávida e ainda não abriu o pré-natal — a primeira consulta e o ultrassom de datação são as duas coisas do começo.",
        "Você tem sangramento, cólica ou dor de um lado só no início da gestação.",
        "Você tem vômitos intensos ou constantes, ou não consegue segurar líquidos.",
        "Você tem uma doença crônica ou usa medicamento de uso contínuo — alguns precisam ser revistos assim que a gestação é confirmada.",
        "Você chegou às 41 semanas, ou passou da data prevista e os movimentos do bebê mudaram.",
      ],
    },
  ],
  faq: [
    {
      question: "Qual é a precisão de uma calculadora gestacional?",
      answer:
        "A conta é exata; as suposições atrás dela não. Só cerca de uma gestação em vinte termina exatamente na data prevista, e a grande maioria dos partos acontece nas semanas em torno dela. A versão precisa é o ultrassom de primeiro trimestre e, depois de fazê-lo, é a data dele que vale.",
    },
    {
      question: "De quantas semanas eu estou?",
      answer:
        "As semanas são contadas do primeiro dia da última menstruação, não da concepção — é por isso que você já está com cerca de quatro semanas quando o teste dá positivo pela primeira vez. A concepção acontece cerca de duas semanas depois daquele primeiro dia, então a gestação é sempre datada cerca de duas semanas mais «velha» do que o embrião.",
    },
    {
      question: "O que significa 9w 3d?",
      answer:
        "Nove semanas completas e três dias desde o primeiro dia da última menstruação. A caderneta da gestante e os laudos usam essa forma porque uma semana inteira é grosseira demais quando um ultrassom ou um exame precisa ser feito em uma janela específica.",
    },
    {
      question: "Posso usar se meus ciclos são irregulares?",
      answer:
        "Pode, e informar a duração habitual do seu ciclo chega mais perto do que os 28 dias padrão. Mas ciclo irregular é justamente o caso em que a última menstruação é uma referência fraca, então trate o resultado como orientação até fazer o ultrassom.",
    },
    {
      question: "A data do parto muda depois do ultrassom?",
      answer:
        "Muitas vezes sim, normalmente alguns dias. O ultrassom mede o bebê em vez de contar a partir de uma data lembrada, então é a dele que fica. Diferença de uma semana ou mais é comum quando a data da última menstruação era incerta.",
    },
    {
      question: "Esta calculadora guarda meus dados?",
      answer:
        "Não. O cálculo roda inteiramente no seu navegador. Nada do que você digitar é enviado aos nossos servidores nem salvo.",
    },
  ],
  cta: {
    heading: "Dúvidas no início da gestação?",
    body: "Fale por vídeo com um médico registrado sobre sintomas, os remédios que você já usa ou o que preferir não deixar para a primeira consulta.",
    label: "Agendar consulta",
  },
};

/**
 * Ovulation, Brazilian Portuguese. `calculadora de ovulação` is 2,900/mo in
 * Brazil, and the European copy would land wrong on most of it: Brazil says
 * "período fértil" rather than "janela fértil", "anticoncepcional" rather than
 * "contraceção", "contraceptivo" rather than "contracetivo", and "Insira"
 * rather than "Indique".
 */
const BR_PT_OVULATION: DeepPartial<ToolCopy> = {
  cardBlurb:
    "Seu período fértil, o dia previsto da ovulação e quando a próxima menstruação deve vir.",
  // `período fértil` is 90,500/mo at KD 1 in Brazil; `calculadora de ovulação`
  // has no measurable volume there. The tool keeps its name in `cardTitle` for
  // the nav and the related strip — only the search-facing surfaces flip.
  h1Lead: "Período",
  h1Accent: "fértil",
  metaTitle: "Período Fértil {country} | Calculadora de Ovulação",
  metaDescription:
    "Calcule seu período fértil e o dia previsto da ovulação a partir do primeiro dia da última menstruação. Ajusta-se à duração do seu ciclo, com os seis dias mais férteis detalhados.",
  lede: "Insira o primeiro dia da última menstruação para ver os seis dias com maior chance de engravidar, o dia previsto da ovulação e quando a próxima menstruação deve vir.",
  trustPoints: [
    "Conta de trás para frente a partir da próxima menstruação, então ciclos longos ficam certos",
    "O período fértil inteiro, de seis dias, e não um único dia",
    "Roda no seu navegador — nada é enviado nem salvo",
  ],
  suggestionsIntro:
    "Uma estimativa de ovulação é uma orientação de datas, não uma avaliação de fertilidade. Estas são as consultas que os nossos médicos fazem quando você quer que alguém olhe o quadro completo.",
  widget: {
    title: "Seu período fértil",
    placeholder: "Insira o primeiro dia da última menstruação para ver o seu período fértil.",
    note: "É uma estimativa a partir das datas que você informa, não um diagnóstico — e não é método anticoncepcional. A ovulação muda de um ciclo para outro e é possível engravidar em dias fora do período mostrado.",
    lmpLabel: "Primeiro dia da última menstruação",
    lmpHint: "O dia em que o sangramento começou, não o dia em que terminou.",
    cycleLabel: "Duração do ciclo",
    cycleHint:
      "Dias do início de uma menstruação até o início da seguinte. Se não souber, deixe 28.",
    daysUnit: "dias",
    resultLabel: "Ovulação prevista",
    resultSummary:
      "Contada 14 dias antes da próxima menstruação esperada, que é o que mantém as datas certas em ciclos que não têm 28 dias.",
    fertileWindowLabel: "Período fértil (6 dias)",
    daysToOvulationLabel: "Dias até a ovulação",
    nextPeriodLabel: "Próxima menstruação",
    testFromLabel: "Teste a partir de",
  },
  sections: [
    {
      heading: "Seu ciclo, dia a dia",
      body: [
        "O ciclo é contado a partir do primeiro dia de sangramento. A ovulação não é fixa no dia 14: ela acontece cerca de 14 dias antes da PRÓXIMA menstruação, então num ciclo de 35 dias cai por volta do dia 21 e num de 24 dias por volta do dia 10. É por isso que contar 14 dias para a frente a partir da última menstruação erra em todo ciclo que não tem 28 dias.",
        "Os dias abaixo são um ciclo de 28 dias. A calculadora acima desloca tudo para a duração que você informar.",
      ],
      bullets: [],
      table: {
        caption: "Dias férteis em um ciclo de 28 dias",
        columns: ["Dia do ciclo", "O que está acontecendo", "Chance de engravidar"],
        rows: [
          ["Dia 1", "Começa o sangramento — o ciclo é contado daqui", "Muito baixa"],
          ["Dias 2 – 8", "Um óvulo está amadurecendo; o período fértil ainda não abriu", "Baixa"],
          [
            "Dias 9 – 13",
            "Período fértil: os espermatozoides sobrevivem até cinco dias",
            "Alta",
          ],
          ["Dia 14", "Ovulação — o óvulo é liberado", "A mais alta"],
          ["Dias 15 – 16", "O óvulo sobrevive menos de um dia depois de liberado", "Cai rápido"],
          [
            "Dia 28",
            "A próxima menstruação é esperada — se não vier, teste a partir daqui",
            "Muito baixa",
          ],
        ],
        footnote:
          "Os espermatozoides sobrevivem até cinco dias no trato reprodutivo e o óvulo menos de um, e é por isso que o período fértil abre bem antes da ovulação e fecha quase logo depois dela.",
      },
    },
    {
      heading: "Sinais de que você ovulou mesmo",
      body: [
        "A calculadora prevê; estes sinais confirmam. Acompanhar um ou dois deles por alguns ciclos mostra se a sua ovulação bate com a estimativa — e isso vale saber antes de organizar qualquer coisa em cima dela.",
      ],
      bullets: [
        "O muco cervical fica transparente, elástico e escorregadio, parecido com clara de ovo crua, nos dias logo antes da ovulação.",
        "Os testes de ovulação detectam o pico de LH na urina, que vem de 24 a 36 horas antes de o óvulo ser liberado. Comece a testar alguns dias antes da data prevista.",
        "A temperatura basal sobe cerca de 0,3 °C depois da ovulação, então ela confirma depois, em vez de prever antes.",
        "Algumas pessoas sentem uma dor de um lado só no meio do ciclo, outras notam os seios sensíveis ou uma mudança na libido.",
        "Um ciclo pode passar sem ovulação. Isso acontece de vez em quando com a maioria das pessoas e, sozinho, não quer dizer que algo esteja errado.",
      ],
    },
    {
      heading: "O que esta calculadora não faz",
      body: [
        "Ela trabalha com duas coisas apenas: a data que você informa e a suposição de que a sua fase lútea dura os 14 dias de sempre. As duas são razoáveis, nenhuma é garantida.",
      ],
      bullets: [
        "Não é método anticoncepcional. Os ciclos mudam, os espermatozoides sobrevivem por dias e é possível engravidar em dias fora do período mostrado aqui.",
        "Ciclos irregulares, anticoncepcional hormonal interrompido há pouco, amamentação, SOP e problemas de tireoide enfraquecem a previsão.",
        "O anticoncepcional hormonal suprime a ovulação, então enquanto você o usa não há nada a prever.",
        "Estresse, doença, viagem e treino pesado podem atrasar a ovulação em um ciclo.",
        "É uma ferramenta de planejamento, não um exame de fertilidade: não diz nada sobre a qualidade dos óvulos, sobre o espermograma ou sobre as trompas.",
      ],
    },
    {
      heading: "Quando procurar um médico",
      body: [],
      bullets: [
        "Você está tentando engravidar há 12 meses, ou há 6 meses se tem mais de 35 anos.",
        "Seus ciclos são mais curtos que 21 dias, mais longos que 35 ou imprevisíveis de um mês para o outro.",
        "A menstruação parou, ou você tem sangramento entre as menstruações.",
        "Você tem cólicas fortes, dor na relação sexual ou diagnóstico de SOP, endometriose ou doença da tireoide.",
        "Você quer orientação antes de engravidar — ácido fólico, os remédios que já usa, vacinas e a medida da pressão arterial ficam antes da gestação, não depois.",
      ],
    },
  ],
  faq: [
    {
      question: "Quando estou mais fértil?",
      answer:
        "No dia da ovulação e nos dois dias antes dele. O período fértil inteiro cobre cerca de seis dias: os cinco antes da ovulação mais o próprio dia. Os espermatozoides sobrevivem até cinco dias e o óvulo menos de um, por isso o período abre cedo e fecha rápido.",
    },
    {
      question: "A ovulação é sempre no dia 14?",
      answer:
        "Não. O dia 14 só vale para o ciclo de livro, de 28 dias. A ovulação fica cerca de 14 dias antes da menstruação seguinte, então num ciclo de 32 dias cai por volta do dia 18 e num de 24 dias por volta do dia 10. Contar 14 dias para a frente a partir da última menstruação é o jeito mais comum de errar a conta.",
    },
    {
      question: "Como calcular a ovulação com ciclo irregular?",
      answer:
        "Informe a duração habitual do seu ciclo e trate o resultado como um intervalo largo, não como uma data. Se os seus ciclos variam mais do que alguns dias, os testes de ovulação ou a observação do muco cervical dizem muito mais do que qualquer conta de calendário, e ciclos sempre abaixo de 21 ou acima de 35 dias merecem avaliação médica.",
    },
    {
      question: "Posso usar a calculadora de ovulação como anticoncepcional?",
      answer:
        "Não. Ela não é método anticoncepcional e nunca deve ser usada assim. A ovulação muda de um ciclo para outro, os espermatozoides sobrevivem até cinco dias e é possível engravidar em dias que a calculadora marca como fora do período fértil. Se você quer evitar a gravidez, use um método anticoncepcional reconhecido.",
    },
    {
      question: "Quando posso fazer o teste de gravidez depois da ovulação?",
      answer:
        "A maioria dos testes de farmácia é confiável a partir do dia em que a menstruação deveria vir, cerca de 14 dias depois da ovulação — a data «Teste a partir de» no resultado. Testar antes pode dar negativo mesmo você estando grávida, porque ainda não há hCG suficiente na urina.",
    },
    {
      question: "Esta calculadora de ovulação guarda meus dados?",
      answer:
        "Não. O cálculo roda inteiramente no seu navegador. Nada do que você digitar é enviado aos nossos servidores nem salvo.",
    },
  ],
  cta: {
    heading: "Tentando engravidar?",
    body: "Fale por vídeo com um médico registrado sobre ciclos irregulares, os exames de antes da gestação ou os remédios que você já usa.",
    label: "Agendar consulta",
  },
};

/**
 * ADHD, Brazilian Portuguese — the sharpest terminology split of the whole set.
 * Portugal says PHDA (perturbação de hiperatividade e défice de atenção),
 * Brazil says TDAH, and `teste tdah` is the query with the volume there; a page
 * written in European Portuguese would not rank for it at all. Everything else
 * follows the same swaps as the other tools ("triagem" for "rastreio", "você",
 * "salvo" for "guardado", "Agendar consulta" for "Marcar consulta").
 */
const BR_PT_ADHD: DeepPartial<ToolCopy> = {
  cardTitle: "Teste de TDAH",
  cardBlurb: "A triagem de TDAH em adultos com seis perguntas, pontuada como a escala foi feita.",
  h1Lead: "Teste de",
  h1Accent: "TDAH",
  metaTitle: "Teste de TDAH {country} | Triagem Gratuita para Adultos",
  metaDescription:
    "Faça a triagem de TDAH em adultos com seis perguntas (ASRS v1.1, parte A) e veja o que as suas respostas significam. Uma triagem não é diagnóstico — quem diagnostica é o psiquiatra ou o psicólogo clínico.",
  lede: "Responda a seis perguntas sobre os últimos seis meses para ver se as suas respostas seguem o padrão que a triagem de TDAH em adultos procura.",
  trustPoints: [
    "A triagem ASRS v1.1, parte A — seis perguntas",
    "Pontuada pergunta a pergunta, como a escala foi feita",
    "Roda no seu navegador — nada é enviado nem salvo",
  ],
  suggestionsIntro:
    "Um resultado de triagem é motivo para buscar avaliação, não um diagnóstico. Estas são as consultas que podem dar o passo seguinte.",
  widget: {
    title: "Suas respostas",
    instructions: "Em cada pergunta, escolha com que frequência isso aconteceu nos últimos seis meses.",
    placeholder: "Responda às seis perguntas para ver o resultado da triagem.",
    note: "Este é um questionário de triagem, não um diagnóstico. O TDAH só é diagnosticado por psiquiatra ou psicólogo clínico, depois de uma avaliação completa. Nada aqui é recomendação de medicamento.",
    thresholdLabel: "Triagem positiva",
    thresholdValue: "{count} ou mais de {total}",
  },
  sections: [
    {
      heading: "Como a triagem é pontuada",
      body: [
        "As perguntas são a parte A da Adult ADHD Self-Report Scale da Organização Mundial da Saúde — a versão curta que serve para decidir se vale a pena marcar uma avaliação completa. A avaliação em si ela não é.",
        "A pontuação é feita pergunta a pergunta, e não como soma. Cada item tem o seu próprio limiar, e quatro ou mais itens que atingem o limiar deles dão uma triagem positiva. O erro comum é tratar isso como uma regra fixa de «quatro respostas Frequentemente»: assim escapa a apresentação desatenta, justamente a que mais passa batida em adultos.",
      ],
      bullets: [],
      table: {
        caption: "As seis perguntas da triagem e a resposta a partir da qual cada uma conta",
        columns: ["Pergunta", "Sobre o que é", "Conta a partir de"],
        rows: [
          ["1", "Terminar os últimos detalhes de um projeto", "Às vezes"],
          ["2", "Colocar as coisas em ordem para uma tarefa", "Às vezes"],
          ["3", "Lembrar de compromissos e combinados", "Às vezes"],
          ["4", "Adiar tarefas que exigem pensar muito", "Frequentemente"],
          ["5", "Se mexer quando precisa ficar sentado muito tempo", "Frequentemente"],
          ["6", "Sensação de estar sendo empurrado a continuar", "Frequentemente"],
        ],
        footnote:
          "Quatro ou mais perguntas no limiar delas ou acima dele dão uma triagem positiva. A escala foi feita para adultos a partir dos 18 anos e não é uma triagem para crianças.",
      },
    },
    {
      heading: "Como o TDAH aparece no adulto",
      body: [
        "O TDAH no adulto raramente se parece com a cena da sala de aula. A hiperatividade costuma virar para dentro — inquietação, uma cabeça que não desliga — enquanto a desatenção fica e começa a custar caro: prazos que passam, papelada sem abrir, uma memória de trabalho que deixa cair as coisas.",
        "Para o diagnóstico, o que conta é que as dificuldades venham de longe, apareçam em mais de uma área da vida e atrapalhem de verdade. Todo mundo perde a chave de vez em quando; não é disso que se está falando.",
      ],
      bullets: [
        "Começar as tarefas que importam e terminar as que deixaram de ser interessantes.",
        "O tempo: subestimar, perder, chegar atrasado mesmo tentando de verdade.",
        "Organização — papéis, contas, consultas — custando muito mais esforço do que parece custar aos outros.",
        "Inquietação, ou uma necessidade constante e surda de estar fazendo alguma coisa.",
        "Interromper, falar sem pensar ou agir antes de fechar a ideia.",
        "Emoções que chegam rápido e passam rápido, muitas vezes maiores do que o motivo.",
      ],
    },
    {
      heading: "O que esta triagem não diz",
      body: [
        "Um questionário de seis perguntas é uma ferramenta de separação. Ele é rápido de propósito e amplo de propósito, porque a função dele é decidir quem precisa ser avaliado direito — e não quem tem TDAH.",
      ],
      bullets: [
        "Não é diagnóstico: sozinho, um resultado positivo significa apenas «vale uma avaliação».",
        "Um resultado negativo não descarta o TDAH, principalmente na apresentação desatenta e principalmente em mulheres, que recebem o diagnóstico mais tarde e com menos frequência.",
        "Ansiedade, depressão, sono ruim, doença da tireoide, dor crônica e consumo alto de álcool produzem as mesmas respostas.",
        "Não separa TDAH de autismo, de um transtorno específico de aprendizagem nem dos efeitos de um período longo de estresse.",
        "Foi feito e validado para adultos. Crianças e adolescentes precisam de uma avaliação totalmente diferente.",
        "Não diz nada sobre tratamento. Medicamento é uma opção entre outras e só entra na conversa depois do diagnóstico.",
      ],
    },
    {
      heading: "Como chegar a uma avaliação de verdade",
      body: [
        "O diagnóstico de TDAH é feito por psiquiatra ou por psicólogo clínico. A avaliação é uma entrevista clínica estruturada sobre a sua história desde a infância, normalmente com escalas e, quando dá, com o relato de alguém que convive com você há muito tempo.",
      ],
      bullets: [
        "Comece por um médico. Ele revisa a sua história, afasta os quadros que se parecem com TDAH e encaminha para a avaliação.",
        "Leve coisas concretas em vez de uma pontuação: boletins, avaliações do trabalho, o que dá errado sempre e há quanto tempo.",
        "Conte o que mais está acontecendo — sono, humor, álcool, tireoide, traumatismo de crânio antigo. Isso muda a avaliação e a ordem dela.",
        "O resultado da triagem é o começo dessa conversa, não o substituto dela. Leve o seu.",
        "Se você não está dando conta, ou tem pensamentos de se machucar, procure um médico agora ou ligue para o SAMU (192) em vez de esperar por uma avaliação.",
      ],
    },
  ],
  faq: [
    {
      question: "Um teste de TDAH online pode dar diagnóstico?",
      answer:
        "Não, e nenhum questionário online consegue. Isto é uma triagem: separa quem vale avaliar direito de quem, por essas respostas, não. O diagnóstico é feito por psiquiatra ou psicólogo clínico, a partir de uma entrevista completa sobre a sua história, e não de seis perguntas.",
    },
    {
      question: "O que é a ASRS?",
      answer:
        "A Adult ADHD Self-Report Scale, criada junto com a Organização Mundial da Saúde. A parte A é a triagem de seis perguntas usada aqui; a escala completa tem dezoito itens. É o instrumento de triagem de TDAH em adultos mais usado no mundo, e por isso o resultado que você leva é reconhecido na consulta.",
    },
    {
      question: "O que conta como resultado positivo?",
      answer:
        "Quatro ou mais das seis perguntas respondidas no limiar delas ou acima dele. As três primeiras contam a partir de «Às vezes» e as três últimas só a partir de «Frequentemente» — os limiares mudam porque as perguntas mudam, e um corte único deixaria a apresentação desatenta de fora.",
    },
    {
      question: "Posso ter TDAH com resultado negativo?",
      answer:
        "Pode. Seis perguntas não cobrem um quadro que aparece de formas diferentes em idades e pessoas diferentes, e a apresentação desatenta em especial é pouco detectada — um dos motivos de as mulheres receberem o diagnóstico mais tarde e com menos frequência. Se as dificuldades atrapalham a sua vida, uma triagem negativa não é motivo para parar de investigar.",
    },
    {
      question: "Quem pode diagnosticar TDAH?",
      answer:
        "Psiquiatra ou psicólogo clínico. O caminho costuma começar numa consulta clínica: o médico levanta a história, afasta os quadros que imitam o TDAH — tireoide, distúrbios do sono, ansiedade, depressão — e encaminha para a avaliação propriamente dita.",
    },
    {
      question: "Este teste de TDAH guarda minhas respostas?",
      answer:
        "Não. A pontuação roda inteiramente no seu navegador. Nada do que você escolher é enviado aos nossos servidores nem salvo.",
    },
  ],
  cta: {
    heading: "Quer conversar sobre seu resultado?",
    body: "Agende uma teleconsulta com um médico registrado, revise sua história e os quadros que podem parecer TDAH, e entenda o que uma avaliação envolve.",
    label: "Agendar consulta",
  },
};

/**
 * Brazilian Portuguese differs from the shared `pt` (Portugal) copy in ways
 * generic word substitution can't fully smooth over, but the load-bearing
 * ones are: "anca" (PT hip) → "quadril" (BR hip), "rastreio" → "triagem",
 * "fumador" → "fumante", "hipertiroidismo"/"estrogénio" → the BR spellings
 * "hipertireoidismo"/"estrogênio", and "Marcar consulta" → "Agendar
 * consulta" — the same swap every other BR_PT_* override makes.
 */
const BR_PT_OSTEOPOROSIS: DeepPartial<ToolCopy> = {
  cardTitle: "Avaliação de risco de osteoporose",
  cardBlurb:
    "Quais os fatores de risco publicados para fratura de fragilidade que se aplicam a si, e se vale a pena pedir uma densitometria óssea.",
  eyebrow: "Ferramenta de saúde gratuita",
  h1Lead: "Risco de",
  h1Accent: "osteoporose",
  h1Trail: "{country}",
  metaTitle: "Avaliação de Risco de Osteoporose {country} | Preciso de uma Densitometria Óssea?",
  metaDescription:
    "Verifique os fatores de risco publicados para osteoporose e fratura de fragilidade, e veja se as orientações clínicas recomendam que seja avaliado. Não é o FRAX nem um diagnóstico — uma lista de verificação para levar ao médico.",
  lede: "Responda a perguntas sobre a sua idade, sexo e fatores de risco para ver se as orientações clínicas publicadas recomendam que peça uma avaliação da densidade óssea.",
  trustPoints: [
    "Baseado nas orientações de triagem da NICE, não numa pontuação proprietária",
    "Mostra separadamente os fatores de risco maiores e contribuintes",
    "Funciona no seu navegador — nada é enviado nem guardado",
  ],
  suggestionsIntro:
    "Um fator de risco identificado é motivo para perguntar sobre uma densitometria óssea, não um diagnóstico. Estas são as consultas que podem aprofundar o assunto.",
  widget: {
    title: "Os seus fatores de risco",
    placeholder: "Responda às perguntas para ver se vale a pena pedir uma avaliação da densidade óssea.",
    note: "Isto identifica quem deve ser avaliado para osteoporose — não estima o seu risco de fratura e não é um diagnóstico. Uma avaliação completa utiliza uma densitometria óssea (DXA) e uma ferramenta validada como o FRAX, realizada por um médico.",
    fractureLabel: "Fratura de fragilidade depois dos 50 anos",
    fractureHint: "Uma fratura resultante de uma queda de pé ou inferior — pulso, quadril, coluna ou braço.",
    glucocorticoidLabel: "Corticosteroides orais durante 3 meses ou mais",
    parentalHipLabel: "Um dos pais fraturou o quadril",
    smokerLabel: "Fumante atual",
    alcoholLabel: "3 ou mais unidades de álcool por dia",
    raLabel: "Artrite reumatoide",
    secondaryLabel: "Uma causa secundária de perda óssea",
    secondaryHint: "Como hipertireoidismo, má absorção, ou doença hepática ou renal de longa duração.",
    fallsLabel: "2 ou mais quedas no último ano",
    menopauseLabel: "Menopausa antes dos 45 anos",
    majorLabel: "Fatores maiores identificados",
    contributingLabel: "Fatores contribuintes identificados",
  },
  sections: [
    {
      heading: "Fatores de risco de fratura de fragilidade",
      body: [
        "A osteoporose não tem sintomas — o primeiro sinal é muitas vezes uma fratura resultante de uma queda que normalmente não partiria um osso. Por isso, as orientações clínicas partem dos fatores de risco para decidir quem vale a pena avaliar antes de a fratura acontecer, e não depois.",
        "Os dez fatores abaixo são os que a orientação CG146 da NICE indica para essa decisão. Dois são considerados maiores por si só; os restantes somam-se em vez de atuarem isoladamente.",
      ],
      bullets: [],
      table: {
        caption: "Fatores de risco que as orientações de triagem da NICE assinalam para avaliação",
        columns: ["Fator de risco", "Porque é importante", "Maior ou contribuinte"],
        rows: [
          [
            "Fratura de fragilidade depois dos 50",
            "Uma fratura do pulso, quadril, coluna ou braço numa queda ligeira é o indicador mais forte de uma nova fratura.",
            "Maior",
          ],
          [
            "Corticosteroides orais de longa duração (3+ meses)",
            "Os glicocorticoides enfraquecem diretamente o osso, independentemente de qualquer outro fator desta lista.",
            "Maior",
          ],
          [
            "Um dos pais fraturou o quadril",
            "Aponta para uma predisposição hereditária da resistência óssea, distinta do seu próprio estilo de vida.",
            "Contribuinte",
          ],
          [
            "Fumante atual",
            "Reduz a densidade óssea e atrasa a cicatrização caso ocorra uma fratura.",
            "Contribuinte",
          ],
          [
            "3+ unidades de álcool por dia",
            "Reduz a formação óssea e aumenta o próprio risco de queda.",
            "Contribuinte",
          ],
          [
            "Artrite reumatoide",
            "A doença e, muitas vezes, o seu tratamento afetam o metabolismo ósseo.",
            "Contribuinte",
          ],
          [
            "Uma causa secundária de perda óssea",
            "Condições como hipertireoidismo ou doença hepática ou renal de longa duração reduzem a densidade óssea por si só.",
            "Contribuinte",
          ],
          [
            "2+ quedas no último ano",
            "A maioria das fraturas de fragilidade acontece depois de uma queda de pé, não isoladamente.",
            "Contribuinte",
          ],
          [
            "Menopausa antes dos 45 anos",
            "O estrogênio protege o osso, pelo que a sua perda mais cedo dá mais tempo à perda óssea.",
            "Contribuinte",
          ],
          [
            "Baixo peso corporal (IMC abaixo de 18,5)",
            "Menos massa corporal significa geralmente menos massa óssea, e menos amortecimento numa queda.",
            "Contribuinte",
          ],
        ],
        footnote:
          "Baseado nos fatores de risco que a orientação CG146 da NICE (avaliação do risco de fratura de fragilidade) indica para a triagem. É uma lista de triagem, não uma pontuação de diagnóstico.",
      },
    },
    {
      heading: "Quem as orientações clínicas dizem que deve ser avaliado",
      body: [
        "A NICE, o National Osteoporosis Guideline Group (NOGG) do Reino Unido e a European Society for Clinical and Economic Aspects of Osteoporosis (ESCEO) definem um limiar essencialmente igual. É um critério de idade mais um critério de fatores de risco, não um único número.",
      ],
      bullets: [
        "Todas as mulheres com 65 anos ou mais, e todos os homens com 75 anos ou mais — a avaliação é recomendada só pela idade.",
        "Pessoas mais jovens com um fator de risco maior — uma fratura de fragilidade anterior ou corticosteroides orais de longa duração — a qualquer idade, incluindo antes dos 50 anos.",
        "Qualquer pessoa com 50 anos ou mais que tenha um dos fatores contribuintes indicados na tabela acima.",
        "Esta ferramenta aplica essa regra publicada ao que introduzir. Não calcula uma probabilidade e não é o FRAX — o FRAX é uma ferramenta proprietária distinta, utilizada por um médico, que combina este tipo de fatores com uma medição da densidade óssea.",
      ],
    },
    {
      heading: "O que esta avaliação não lhe diz",
      body: [
        "Uma lista de fatores de risco é um instrumento de triagem, não uma medição. Diz-lhe se vale a pena perguntar sobre um exame — não lhe diz o que esse exame mostraria.",
      ],
      bullets: [
        "Não é um diagnóstico. A osteoporose é diagnosticada através de uma densitometria óssea (DXA), não através de um questionário.",
        "Não indica uma probabilidade de fratura. As ferramentas que o fazem — FRAX, o nomograma de Garvan, o QFracture — combinam fatores de risco com uma medição da densidade óssea, e são utilizadas por um médico.",
        "Não é o FRAX e não utiliza os seus coeficientes, que são propriedade da Universidade de Sheffield.",
        'Um resultado "nenhum fator de risco específico identificado" é tranquilizador, mas não é uma garantia — mencione sempre uma nova fratura ou queda a um médico.',
        "Não diz nada sobre tratamento. A medicação é uma decisão de um médico, tomada depois de um diagnóstico, e não a partir de uma lista de fatores de risco.",
      ],
    },
    {
      heading: "Como avançar para uma avaliação",
      body: [],
      bullets: [
        "Comece por falar com um médico. Ele ou ela vai ponderar os seus fatores de risco e decidir se faz sentido pedir uma densitometria óssea.",
        "Leve os fatores que esta ferramenta identificou para si — quais, e não apenas o resultado — para tornar a consulta mais rápida.",
        "Se já teve uma fratura de fragilidade, pergunte sobre avaliação independentemente da sua idade ou do resultado desta ferramenta.",
        "Cálcio, vitamina D, exercício com impacto e deixar de fumar ajudam a saúde óssea enquanto aguarda qualquer avaliação.",
        "Procure cuidados médicos rapidamente perante uma nova fratura resultante de uma queda ligeira, seja qual for o resultado desta ferramenta — precisa de ser tratada por si só.",
      ],
    },
  ],
  faq: [
    {
      question: "Isto é o mesmo que o FRAX?",
      answer:
        "Não. O FRAX é uma ferramenta proprietária distinta, desenvolvida pela Universidade de Sheffield, cujos coeficientes não são publicados — esta ferramenta não o reproduz nem afirma corresponder ao seu resultado. Esta é uma lista de triagem baseada em orientações publicadas (NICE CG146): diz-lhe se vale a pena ser avaliado, nunca uma probabilidade de fratura.",
    },
    {
      question: "O que é uma densitometria óssea (DXA)?",
      answer:
        "Um exame de absorciometria de raios X de dupla energia — um raio X de baixa dose que mede a densidade óssea, normalmente no quadril e na coluna. É o exame em que uma avaliação realmente se baseia; nada nesta página o substitui.",
    },
    {
      question: "Ter fatores de risco significa que tenho osteoporose?",
      answer:
        "Não. Um fator de risco identificado significa que as orientações recomendam que seja avaliado, não que tenha a doença. Muitas pessoas com fatores de risco têm uma densitometria óssea normal, e a osteoporose também pode surgir sem nenhum dos fatores aqui listados.",
    },
    {
      question: "E se o meu resultado for 'nenhum fator de risco específico identificado' mas continuo preocupado?",
      answer:
        "Fale com um médico na mesma. Esta ferramenta cobre os fatores de risco de uma orientação clínica; não cobre todo o historial pessoal ou familiar que possa ser relevante, e uma conversa não custa nada que esta lista não consiga avaliar.",
    },
    {
      question: "Quem diagnostica efetivamente a osteoporose?",
      answer:
        "Um médico, a partir de uma densitometria óssea (DXA) — normalmente um T-score de -2,5 ou inferior no quadril ou na coluna. Um questionário de fatores de risco como este só pode sugerir quem deve fazer esse exame; não pode diagnosticar nada por si próprio.",
    },
    {
      question: "Esta avaliação guarda as minhas respostas?",
      answer:
        "Não. O cálculo é feito inteiramente no seu navegador. Nada do que selecionar é enviado para os nossos servidores nem guardado.",
    },
  ],
  cta: {
    heading: "Quer falar sobre a sua saúde óssea?",
    body: "Agende uma teleconsulta com um médico registrado, reveja os seus fatores de risco e saiba se faz sentido pedir uma densitometria óssea.",
    label: "Agendar consulta",
  },
};

const BR_PT_BANDS: DeepPartial<ToolsBandsCopy> = {
  // pt-PT calls the condition PHDA and pt-BR calls it TDAH, so the result
  // read-out has to be swapped wholesale, not just re-worded.
  adhd: {
    positive: {
      label: "Resultado da triagem: positivo",
      summary:
        "Suas respostas seguem o padrão que esta triagem procura, então vale marcar uma avaliação completa. Diagnóstico não é: o TDAH só é diagnosticado por psiquiatra ou psicólogo clínico, a partir de toda a sua história e não de seis perguntas.",
    },
    negative: {
      label: "Resultado da triagem: negativo",
      summary:
        "Suas respostas não seguem o padrão que esta triagem procura. Isso não descarta o TDAH — seis perguntas cobrem só uma parte — então, se essas dificuldades atrapalham seu trabalho, seus estudos ou suas relações, converse com um médico mesmo assim.",
    },
  },
  adhdFrequencies: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Muito frequentemente"],
  adhdQuestions: [
    "Com que frequência você deixa os últimos detalhes de um projeto sem terminar depois de passar a parte difícil?",
    "Com que frequência você tem dificuldade de colocar as coisas em ordem quando a tarefa exige organização?",
    "Com que frequência você esquece compromissos ou coisas que combinou?",
    "Com que frequência você adia ou evita começar algo que exige pensar muito?",
    "Com que frequência você mexe as mãos ou os pés quando precisa ficar sentado muito tempo?",
    "Com que frequência você se sente empurrado a continuar fazendo coisas, como se algo estivesse te tocando para frente?",
  ],
  bp: {
    low: {
      label: "Pressão baixa",
      summary:
        "Abaixo da faixa habitual em adultos. Muitas vezes não tem importância, mas vale a opinião de um médico se você sentir tontura, desmaio ou cansaço fora do comum.",
    },
    optimal: {
      label: "Ótima",
      summary: "A faixa de menor risco em adultos. Não há nada a fazer só por causa desta medida.",
    },
    normal: {
      label: "Normal",
      summary:
        "Dentro da faixa normal para adultos. Vale aferir de novo de vez em quando, principalmente se vem subindo.",
    },
    "high-normal": {
      label: "Normal-alta",
      summary:
        "Acima do normal, mas ainda não é hipertensão. É a fase em que sal, álcool, peso e atividade física fazem mais diferença.",
    },
    "grade-1": {
      label: "Hipertensão grau 1",
      summary:
        "Levemente elevada. Afira uma semana em casa e leve os valores ao médico — o diagnóstico precisa do padrão, não de um número isolado.",
    },
    "isolated-systolic": {
      label: "Hipertensão sistólica isolada",
      summary:
        "O número de cima está elevado e o de baixo está normal. É o padrão mais comum depois dos 60 anos e mesmo assim exige avaliação médica.",
    },
    "grade-2": {
      label: "Hipertensão grau 2",
      summary:
        "Bastante elevada. Marque uma avaliação médica em breve, sem esperar por uma consulta de rotina.",
    },
    "grade-3": {
      label: "Hipertensão grau 3",
      summary: "Muito elevada. Esta medida precisa ser avaliada por um médico ainda hoje.",
    },
  },
  activity: {
    sedentary: { label: "Sedentário", summary: "Trabalho sentado, pouco ou nenhum exercício" },
    light: { label: "Levemente ativo", summary: "Exercício leve 1–3 dias por semana" },
    moderate: { label: "Moderadamente ativo", summary: "Exercício moderado 3–5 dias por semana" },
    very: { label: "Muito ativo", summary: "Exercício intenso 6–7 dias por semana" },
    extra: {
      label: "Extremamente ativo",
      summary: "Trabalho físico ou treino intenso duas vezes por dia",
    },
  },
  bmi: {
    underweight: {
      label: "Baixo peso",
      summary:
        "Abaixo da faixa saudável. Vale conversar com um médico, principalmente se a perda de peso não foi intencional.",
    },
    healthy: {
      label: "Peso saudável",
      summary: "Dentro da faixa que a OMS classifica como saudável para adultos.",
    },
    overweight: {
      label: "Sobrepeso",
      summary:
        "Acima da faixa saudável. Checar a pressão arterial e o colesterol é um próximo passo sensato.",
    },
    "obese-1": {
      label: "Obesidade grau I",
      summary: "Nesse nível costuma ser indicado um acompanhamento estruturado do peso.",
    },
    "obese-2": {
      label: "Obesidade grau II",
      summary: "Recomenda-se avaliação médica, incluindo rastreamento de doenças associadas ao peso.",
    },
    "obese-3": {
      label: "Obesidade grau III",
      summary: "Recomenda-se avaliação especializada em acompanhamento do peso.",
    },
  },
};

/** Deep-partial: an override supplies only the keys it changes. */
type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

type MarketCopyOverride = {
  /** Keyed by tool slug — a BMI override must never land on another tool. */
  tools?: Record<string, DeepPartial<ToolCopy>>;
  bands?: DeepPartial<ToolsBandsCopy>;
};

/**
 * Per-market copy overrides, merged over the shared language bundle. This is
 * how a market gets its own voice without changing a shared locale.
 */
const MARKET_COPY: Partial<Record<CountryCode, Record<string, MarketCopyOverride>>> = {
  pt: {
    pt: {
      tools: portugalApprovedToolSeo,
    },
  },
  cz: {
    cs: {
      tools: czechiaApprovedToolSeo,
    },
  },
  br: {
    pt: {
      tools: {
        "bmi-calculator": BR_PT_BMI,
        "calorie-calculator": BR_PT_CALORIE,
        "blood-pressure-chart": BR_PT_BP,
        "due-date-calculator": BR_PT_DUE_DATE,
        "ovulation-calculator": BR_PT_OVULATION,
        "adhd-test": BR_PT_ADHD,
        "osteoporosis-risk-checker": BR_PT_OSTEOPOROSIS,
      },
      bands: BR_PT_BANDS,
    },
  },
};

/** Language copy for a tool, with this market's overrides applied. */
export function applyMarketToolCopy(
  code: string,
  lang: string,
  slug: string,
  copy: ToolCopy,
): ToolCopy {
  const override =
    MARKET_COPY[code.toLowerCase() as CountryCode]?.[lang.toLowerCase()]?.tools?.[slug];
  return override ? deepMergeLocale(copy, override as ToolCopy) : copy;
}

/** Band labels and summaries, with this market's overrides applied. */
export function applyMarketBands(
  code: string,
  lang: string,
  bands: ToolsBandsCopy,
): ToolsBandsCopy {
  const override = MARKET_COPY[code.toLowerCase() as CountryCode]?.[lang.toLowerCase()]?.bands;
  return override ? deepMergeLocale(bands, override as ToolsBandsCopy) : bands;
}
