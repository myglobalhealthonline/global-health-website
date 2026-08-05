import type { CountryCode } from "@/data/countries";
import { deepMergeLocale } from "@/lib/i18n/deep-merge-locale";
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

export const MARKET_FAQ: Partial<Record<CountryCode, Record<string, FaqItem[]>>> = {
  ie: {
    en: [
      {
        question: "Does the HSE use BMI?",
        answer:
          "Yes. BMI is the first-line screening measure in Irish practice, as it is internationally — normally read alongside waist circumference, blood pressure and blood tests rather than on its own. A raised BMI is what prompts further assessment; it is not a diagnosis by itself.",
      },
      {
        question: "Where can I get my BMI checked in Ireland?",
        answer:
          "Any GP appointment includes height and weight, and most pharmacies will measure them too. You can also work it out here in seconds and bring the number to a consultation — our Irish-registered doctors can review it together with your blood pressure, cholesterol and blood glucose.",
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
 * Market-specific FAQ items for a country/language, or an empty list when
 * that combination has none — the caller then shows the shared language FAQ
 * unchanged.
 */
export function getMarketFaq(code: string, lang: string): Array<{ question: string; answer: string }> {
  const market = MARKET_FAQ[code.toLowerCase() as CountryCode];
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
const BR_PT_TOOL: DeepPartial<ToolCopy> = {
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
        columns: ["IMC", "Categoria", "O que costuma indicar"],
        rows: [
          ["Abaixo de 18,5", "Baixo peso", "Vale uma conversa médica, principalmente se não for intencional"],
          ["18,5 – 24,9", "Peso saudável", "Nenhuma ação necessária apenas com base no IMC"],
          ["25,0 – 29,9", "Sobrepeso", "Revisar hábitos; checar pressão arterial e colesterol"],
          ["30,0 – 34,9", "Obesidade grau I", "Costuma ser indicado acompanhamento estruturado do peso"],
          ["35,0 – 39,9", "Obesidade grau II", "Avaliação médica; rastreamento de doenças associadas"],
          ["40,0 ou mais", "Obesidade grau III", "Encaminhamento para acompanhamento especializado do peso"],
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

const BR_PT_BANDS: DeepPartial<ToolsBandsCopy> = {
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
  tool?: DeepPartial<ToolCopy>;
  bands?: DeepPartial<ToolsBandsCopy>;
};

/**
 * Per-market copy overrides, merged over the shared language bundle. Only
 * Brazil needs one today; the same slot is how any market gets its own voice
 * without adding a locale.
 */
const MARKET_COPY: Partial<Record<CountryCode, Record<string, MarketCopyOverride>>> = {
  br: { pt: { tool: BR_PT_TOOL, bands: BR_PT_BANDS } },
};

/** Language copy for a tool, with this market's overrides applied. */
export function applyMarketToolCopy(code: string, lang: string, copy: ToolCopy): ToolCopy {
  const override = MARKET_COPY[code.toLowerCase() as CountryCode]?.[lang.toLowerCase()]?.tool;
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
