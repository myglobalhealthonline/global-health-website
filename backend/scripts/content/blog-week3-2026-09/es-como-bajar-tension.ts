/**
 * Spain — Week 3 editorial article.
 *
 * Primary keyword: "como bajar la tensión" — 2,900/mo, KD 0, informational.
 * Secondary: "tensión alta como bajarla rápidamente" — 1,600/mo, KD 2;
 *            "como bajar la tensión de forma natural" — 720/mo, KD 2.
 * Myth queries handled by correction, not by serving them:
 * "remedios de la abuela para bajar la tensión" 1,900, "infusiones para
 * bajar la tensión" 1,900, "la tila baja la tensión" 590.
 * OpenSEO research 2026-09-07 (location 2724, es). SERP: Mayo Clinic,
 * NIH, FEC, hospital blogs; AI Overview present.
 *
 * Facts anchored to the 2024 ESC guideline (EHJ), WHO hypertension fact
 * sheet (2025-09-25), SEH-LELHA AMPA guidance and the EHJ 2022 slow-
 * breathing meta-analysis, read 2026-09-07. Separate from the existing
 * urgent-symptoms post and the normal-values table.
 */
import { cite, lead, p, ul, warn, type Article } from "../blog-seo-2026-08/template.js";
import type { LocalePost, PostSet } from "../blog-seo-2026-08/types.js";

const ESC_2024 = "https://academic.oup.com/eurheartj/article/45/38/3912/7741010";
const WHO_HTA = "https://www.who.int/news-room/fact-sheets/detail/hypertension";
const SEH_AMPA = "https://seh-lelha.org/automedicion-presion-arterial-ampa/";
const EHJ_BREATHING = "https://academic.oup.com/eurheartj/article/43/Supplement_2/ehac544.2208/6745993";
const PMC_ESC_REVIEW = "https://pmc.ncbi.nlm.nih.gov/articles/PMC11857694/";
const SEMES_AMPA = "https://www.semes.org/semes-divulgacion/automedida-de-la-presion-arterial/";

const base = "https://www.myglobalhealth.online/spain/es";
const links = {
  blog: `${base}/blog`,
  doctors: `${base}/doctors`,
  contact: `${base}/contact`,
  service: `${base}/services/enfermedades-cronicas-online`,
  cardio: `${base}/services/cardiologo-online`,
  urgencias: `${base}/blog/tension-alta-sintomas-cuando-urgencias`,
  tabla: `${base}/blog/tension-arterial-normal-tabla-edad-sexo`,
};
const AUTHOR = { initials: "GH", name: "Global Health Medical Team", line: "Global Health" } as const;

const es: LocalePost = {
  locale: "ES",
  slug: "como-bajar-la-tension-que-funciona-segun-la-evidencia",
  title: "Cómo bajar la tensión: lo que funciona según las guías y lo que solo parece funcionar",
  excerpt:
    "Menos sal, más movimiento, menos alcohol y peso: las cinco medidas con efecto medido sobre la tensión, cuánto bajan, cuánto tardan y por qué la tila no cuenta.",
  seoTitle: "Cómo bajar la tensión: qué funciona de verdad",
  seoDescription:
    "Cinco medidas con efecto demostrado sobre la tensión, cuánto tardan, qué dice la guía ESC 2024 sobre las infusiones y cuándo hay que llamar al 112.",
  category: "Enfermedades crónicas",
  article: {
    lang: "es-ES",
    tagline: "Medicina a cualquier hora, en cualquier lugar",
    categoryLabel: "Enfermedades crónicas",
    categoryHref: links.blog,
    eyebrow: "España · Guía de hipertensión",
    h1: "Cómo bajar la tensión: qué funciona según la evidencia",
    deck: "No hay forma de bajar la tensión en cinco minutos. Sí hay cinco medidas que la bajan en unas semanas, y una lista corta de remedios que no hacen nada.",
    intro:
      "Para <strong>bajar la tensión</strong> de forma duradera hay cinco medidas con efecto medido: reducir la sal a menos de 5 gramos al día, hacer al menos 150 minutos semanales de ejercicio aeróbico moderado, perder peso si sobra, limitar el alcohol y seguir una dieta tipo mediterránea o DASH rica en potasio. La guía europea de 2024 da tres meses de estilo de vida antes de decidir sobre fármacos si la tensión está elevada sin ser hipertensión. Ninguna infusión ni remedio casero la baja de forma rápida y demostrada. Con 180/110 y síntomas, 112.",
    facts: [
      "Sal por debajo de 5 g al día (unos 2 g de sodio)",
      "150 minutos semanales de ejercicio: unos 7 mmHg menos de sistólica",
      "Tres meses de estilo de vida antes de decidir sobre fármacos, si no hay riesgo alto",
    ],
    primaryCta: { label: "Guía ESC 2024 de hipertensión", href: ESC_2024 },
    secondaryCta: { label: "Síntomas de tensión alta y urgencias", href: links.urgencias },
    panelChip: "Antes de cambiar nada",
    panelParas: [
      "Mida bien. Siete días, mañana y tarde, sentado y tras cinco minutos de reposo. Una lectura aislada no decide nada.",
      "Si ya toma pastillas, no las cambie ni las deje por su cuenta. Los cambios de estilo de vida permiten a veces reducir la dosis, pero eso lo decide su médico.",
      "Una infusión no hace daño. Sustituir el tratamiento por una infusión, sí.",
    ],
    author: AUTHOR,
    reviewLine: "Revisado por el equipo médico de Global Health.",
    navLabel: "En este artículo",
    sections: [
      {
        id: "umbrales",
        nav: "Qué es tensión alta",
        eyebrow: "ESC 2024",
        h2: "Primero, qué cuenta como tensión alta",
        blocks: [
          lead("La guía europea de 2024 distingue tres franjas, y en dos de ellas el estilo de vida es el tratamiento principal."),
          ul([
            "<strong>No elevada:</strong> por debajo de 120/70 mmHg en consulta.",
            "<strong>Elevada:</strong> 120–139 de sistólica o 70–89 de diastólica. Aquí la guía recomienda tres meses de medidas de estilo de vida antes de valorar fármacos, salvo riesgo cardiovascular alto.",
            "<strong>Hipertensión:</strong> 140/90 o más, confirmada fuera de la consulta. En casa, el umbral es 135/85.",
          ]),
          p("El objetivo en tratamiento es una sistólica de 120 a 129 mmHg si se tolera, más laxo a partir de los 85 años o con fragilidad. Para situar sus cifras, vea la <a href=\"" + links.tabla + "\">tabla de tensión arterial normal por edad y sexo</a>."),
          cite("<a href=\"" + ESC_2024 + "\" rel=\"nofollow noopener\" target=\"_blank\">2024 ESC Guidelines for the management of elevated blood pressure and hypertension</a>, consultada el 7 de septiembre de 2026."),
        ],
      },
      {
        id: "cinco-medidas",
        nav: "Las cinco medidas",
        eyebrow: "Con efecto medido",
        h2: "Cómo bajar la tensión: las cinco medidas que funcionan",
        blocks: [
          lead("Las cinco aparecen en la guía europea, en la de la Sociedad Europea de Hipertensión y en la ficha de la OMS. Lo que cambia entre ellas es cuánto bajan y cuánto tardan."),
          ul([
            "<strong>1. Sal por debajo de 5 g al día</strong> (unos 2 g de sodio). El pan, los embutidos, el queso y los precocinados aportan más que el salero.",
            "<strong>2. Ejercicio aeróbico, 150 minutos semanales.</strong> La revisión de la guía ESC 2024 publicada en PMC cifra la bajada media en 7,2 mmHg de sistólica y 5,6 de diastólica. Añada ejercicio de fuerza dos o tres días por semana.",
            "<strong>3. Peso.</strong> IMC entre 20 y 25, cintura por debajo de 94 cm en hombres y 80 en mujeres. La guía estadounidense ACC/AHA estima alrededor de 1 mmHg menos por cada kilo perdido.",
            "<strong>4. Alcohol.</strong> Límite ESC de 100 g de alcohol a la semana; la guía ESH 2023 recomienda acercarse a la abstinencia.",
            "<strong>5. Dieta mediterránea o DASH, con potasio.</strong> La ESC recomienda aumentar el potasio de la dieta, por encima de 3,5 g al día, si el riñón funciona bien.",
          ]),
          p("Dejar de fumar está en la misma lista por otro motivo: apenas mueve el tensiómetro y sí reduce el riesgo de infarto e ictus, que es para lo que se baja la tensión."),
          cite("<a href=\"" + ESC_2024 + "\" rel=\"nofollow noopener\" target=\"_blank\">ESC 2024</a>, <a href=\"" + PMC_ESC_REVIEW + "\" rel=\"nofollow noopener\" target=\"_blank\">revisión de la guía ESC 2024 (PMC)</a> y <a href=\"" + WHO_HTA + "\" rel=\"nofollow noopener\" target=\"_blank\">OMS, ficha de hipertensión (2025)</a>."),
        ],
      },
      {
        id: "cuanto-tarda",
        nav: "Cuánto tarda",
        eyebrow: "Semanas, no minutos",
        h2: "¿Se puede bajar la tensión rápidamente?",
        blocks: [
          lead("No de forma útil. Lo que baja la tensión en minutos es sentarse y descansar, y eso solo corrige la lectura, no la enfermedad."),
          p("«Cómo bajar la tensión en cinco minutos» tiene respuesta corta: la respiración lenta relaja y puede restar unos puntos durante la medición, pero el metaanálisis del European Heart Journal de 2022 no encontró efecto significativo de la respiración guiada frente a la atención habitual, y la guía ESC 2024 no la recomienda. Las medidas reales tardan semanas. Por eso la guía ESC da tres meses de estilo de vida antes de revisar si hace falta medicación: con menos tiempo no se ve el efecto."),
          cite("<a href=\"" + EHJ_BREATHING + "\" rel=\"nofollow noopener\" target=\"_blank\">European Heart Journal 2022, metaanálisis sobre respiración guiada</a>."),
        ],
      },
      {
        id: "mitos",
        nav: "Lo que no funciona",
        eyebrow: "Tila, manzanilla y compañía",
        h2: "Remedios de la abuela para bajar la tensión: qué dice la evidencia",
        blocks: [
          lead("Ninguna guía europea, ni la OMS, ni la Sociedad Española de Hipertensión recogen una infusión, un alimento o un truco que baje la tensión de forma aguda."),
          ul([
            "<strong>Tila, manzanilla, valeriana:</strong> pueden relajar. Relajarse baja la lectura del momento. No tratan la hipertensión.",
            "<strong>Ajo, limón, vinagre:</strong> aparecen en las webs de cardiología solo como sustitutos de la sal. Ese es todo su papel.",
            "<strong>«Pastillas para la tensión sin receta»:</strong> no existen. Cualquier producto que se venda así es un suplemento sin efecto demostrado.",
            "<strong>Tomar una pastilla extra cuando la tensión sube:</strong> la SEH-LELHA lo dice sin rodeos: nunca tome decisiones por su cuenta. Una bajada brusca puede ser peor que la subida.",
          ]),
          warn("Cuándo dejar la infusión y llamar al 112", "Con 180/110 o más y dolor en el pecho, dificultad para respirar, debilidad en un lado del cuerpo, dificultad para hablar o confusión, es una emergencia. Con 180/110 sin síntomas no lo es, pero necesita valoración médica el mismo día, no una tila. Los detalles están en nuestra guía de <a href=\"" + links.urgencias + "\">síntomas de tensión alta y urgencias</a>."),
          cite("<a href=\"" + SEH_AMPA + "\" rel=\"nofollow noopener\" target=\"_blank\">SEH-LELHA, automedición de la presión arterial</a>."),
        ],
      },
      {
        id: "medir",
        nav: "Medir bien",
        eyebrow: "AMPA",
        h2: "Cómo saber si está funcionando",
        blocks: [
          lead("Con un tensiómetro de brazo validado y un protocolo de siete días. Una lectura suelta no sirve para decidir nada."),
          p("SEH-LELHA y ESC coinciden: siete días, dos o tres lecturas por la mañana antes de la medicación y otras tantas por la tarde, sentado, espalda apoyada, brazo a la altura del corazón, cinco minutos de reposo. Se descarta el primer día y se hace la media. 135/85 o más en casa es hipertensión. Si quiere un plan con seguimiento, o ya tiene hipertensión estable y necesita revisar tratamiento, puede hacerlo en una <a href=\"" + links.service + "\">consulta de enfermedades crónicas online</a>; para cifras difíciles de controlar, en <a href=\"" + links.cardio + "\">cardiología</a>. Ninguna consulta sustituye la medición correcta en casa."),
          cite("<a href=\"" + SEMES_AMPA + "\" rel=\"nofollow noopener\" target=\"_blank\">SEMES, automedida de la presión arterial</a>."),
        ],
      },
    ],
    linksEyebrow: "Global Health España",
    linksH2: "Seguimiento médico",
    linksLead: "El estilo de vida lo pone usted. El seguimiento y los fármacos, un médico.",
    links: [
      { label: "Consulta de enfermedades crónicas online", href: links.service },
      { label: "Cardiólogo online", href: links.cardio },
      { label: "Tensión alta: síntomas y cuándo ir a urgencias", href: links.urgencias },
      { label: "Tabla de tensión arterial normal por edad", href: links.tabla },
      { label: "Médicos en España", href: links.doctors },
      { label: "Contactar con Global Health", href: links.contact },
    ],
    ctaBox: {
      h3: "¿Quiere un plan con seguimiento?",
      text: "Un médico revisa sus mediciones, ajusta el tratamiento si hace falta y fija la próxima revisión.",
      primary: { label: "Reservar consulta de enfermedades crónicas", href: links.service },
      secondary: { label: "Ver médicos", href: links.doctors },
    },
    sourcesEyebrow: "Fuentes clínicas",
    sourcesH2: "Fuentes de esta guía",
    sourcesLead: "Guías europeas y sociedades españolas, consultadas el 7 de septiembre de 2026.",
    sources: [
      { label: "ESC 2024 — Guidelines for elevated blood pressure and hypertension", href: ESC_2024 },
      { label: "OMS — Hipertensión, ficha informativa", href: WHO_HTA },
      { label: "SEH-LELHA — Automedición de la presión arterial (AMPA)", href: SEH_AMPA },
      { label: "SEMES — Automedida de la presión arterial", href: SEMES_AMPA },
      { label: "European Heart Journal 2022 — respiración guiada, metaanálisis (resumen de congreso)", href: EHJ_BREATHING },
      { label: "Revisión de la guía ESC 2024 (PMC) — efecto del ejercicio", href: PMC_ESC_REVIEW },
    ],
    sourcesNote: "Las cifras de efecto son medias de estudios. Su respuesta individual puede ser mayor o menor.",
    faqEyebrow: "FAQ",
    faqH2: "Preguntas sobre cómo bajar la tensión",
    faqs: [
      { q: "¿Cómo bajar la tensión alta rápidamente en casa?", a: "No hay un método rápido con evidencia. Siéntese, repose cinco minutos y vuelva a medir. Si sigue en 180/110 o más con síntomas, llame al 112; sin síntomas, pida valoración médica el mismo día." },
      { q: "¿La tila o la manzanilla bajan la tensión?", a: "Pueden relajar y cambiar la lectura del momento. No tratan la hipertensión y ninguna guía las recomienda con ese fin." },
      { q: "¿Las pastillas de la tensión son para siempre?", a: "A menudo sí, pero no siempre. La guía ESC 2024 reconoce que los cambios de estilo de vida pueden permitir reducir o retirar fármacos. Es una decisión médica, nunca por su cuenta." },
      { q: "¿Cuánto tardan en notarse los cambios de estilo de vida?", a: "Semanas, no días. La guía europea de 2024 da tres meses de estilo de vida antes de reevaluar si hace falta medicación." },
    ],
    disclaimerTitle: "Aviso médico",
    disclaimer:
      "Información general a septiembre de 2026; no sustituye la valoración médica ni el tratamiento prescrito. Ante síntomas de alarma, llame al 112.",
  } satisfies Article,
};

export const ES_COMO_BAJAR_TENSION: PostSet = {
  key: "es-como-bajar-tension",
  countryCode: "es",
  targetKeyword: "como bajar la tensión",
  searchVolume: 2900,
  keywordDifficulty: 0,
  evidence:
    "OpenSEO 2026-09-07 (2724/es): 'como bajar la tensión' 2,900/KD0; 'tensión alta como bajarla rápidamente' 1,600/KD2; 'como bajar la tensión de forma natural' 720/KD2. Myth cluster corrected, not served: 'remedios de la abuela para bajar la tensión' 1,900, 'infusiones para bajar la tensión' 1,900, 'la tila baja la tensión' 590. Named in editorial-plan §7.3 (Spain evidence-based BP management). Distinct from the urgent-symptoms post.",
  serviceSlug: "enfermedades-cronicas-online",
  authorDoctorId: "cmrdpqvkc000z01rui7z5it57",
  authorDisplayName: "Global Health Medical Team",
  reviewerDoctorId: "cmrdpxpi0001v01ruqavjiq79",
  reviewerDisplayName: "Dr. Eduardo Daniel Rodríguez Olivas",
  posts: [es],
};
