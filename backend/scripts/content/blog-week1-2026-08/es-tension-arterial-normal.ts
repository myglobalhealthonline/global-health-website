/**
 * Spain — Week 1 editorial plan article.
 *
 * Target keyword: "tensión arterial normal" — 33,100/mo, KD 10
 * (OpenSEO / DataForSEO, editorial plan 2026-08-19; follow-up batch
 * 2026-08-19). Supporting: "tensión arterial normal mujer" 1,300 ·
 * "tensión arterial normal adultos" 880 · GSC 16 impressions @ pos 29.
 *
 * Why it can lead:
 * - the query volume is large and informational, but the intent naturally
 *   escalates into "do I need to repeat this, change anything, or see a
 *   cardiólogo?";
 * - Spain has an active specialist cardiology service (`cardiologo-online`);
 * - the site already owns a blood-pressure tool cluster, so the article can
 *   route both to a utility page and to clinical follow-up.
 *
 * Honesty constraint:
 * searchers expect a different "normal table" for men, women, and every age.
 * The article answers the query without inventing one. For most non-pregnant
 * adults, the practical office thresholds are not sex-specific. Age changes
 * cardiovascular risk and treatment targets in context; it does not create a
 * separate "normal" reading that makes 150/95 healthy because someone is older.
 */
import { cite, lead, p, renderArticle, ul, warn, type Article } from "../blog-seo-2026-08/template.js";
import type { LocalePost, PostSet } from "../blog-seo-2026-08/types.js";

const ESC_2024 =
  "https://www.escardio.org/guidelines/clinical-practice-guidelines/all-esc-practice-guidelines/elevated-blood-pressure-and-hypertension/";
const SEC_ESC_2024 =
  "https://secardiologia.es/images/2023/Gu%C3%ADas/Final_GPC_ESC_2024_PA_elevada_e_hipertensio%CC%81n.pdf";
const FEC_HTA =
  "https://fundaciondelcorazon.com/prevencion/riesgo-cardiovascular/hipertension-tension-alta.html";
const SEH = "https://www.seh-lelha.org/";

const href = (path: string) => `https://www.myglobalhealth.online/spain/es${path}`;
const toolHref = href("/tools/blood-pressure-chart");
const chronicCareHref = href("/services/enfermedades-cronicas-online");

const es: LocalePost = {
  locale: "ES",
  slug: "tension-arterial-normal-tabla-edad-sexo",
  title: "Tensión arterial normal: tabla útil por edad y sexo, sin mitos",
  excerpt:
    "Qué cifras se consideran normales de verdad, por qué no existe una tabla distinta para hombres y mujeres adultos, y cuándo una tensión alta o baja merece revisión.",
  seoTitle: "Tensión arterial normal: tabla por edad y sexo",
  seoDescription:
    "Qué tensión arterial se considera normal en adultos, por qué no existe una tabla distinta para hombres y mujeres, y cuándo conviene consultar.",
  category: "Cardiología",
  article: {
    lang: "es-ES",
    tagline: "Medicina a cualquier hora, en cualquier lugar",
    categoryLabel: "Cardiología",
    categoryHref: href("/blog"),
    eyebrow: "España · Guía práctica",
    h1: "Tensión arterial normal",
    deck: "La cifra que importa no cambia porque seas hombre o mujer. Lo que cambia con la edad es el riesgo de ignorarla.",
    intro:
      "Para la mayoría de los adultos, una <strong>tensión claramente normal</strong> está por debajo de <strong>120/80 mmHg</strong>. Si las cifras suben de forma repetida hacia <strong>120-139</strong> de sistólica o <strong>70-89</strong> de diastólica, ya no hablamos de una lectura ideal y conviene vigilarla con más método. La <strong>hipertensión</strong> se confirma con lecturas repetidas, idealmente también fuera de la consulta: una sola medición no permite diagnosticarla. En la práctica clínica empieza cuando una medición en consulta se mantiene en <strong>140/90 mmHg o más</strong>. Lo importante para esta búsqueda es esto: en adultos no hay una tabla “normal” distinta para hombres y mujeres. La edad obliga a interpretar el contexto, no a llamar normal a una cifra que sigue siendo demasiado alta.",
    facts: [
      "Por debajo de 120/80 es una lectura claramente normal",
      "140/90 repetido en consulta ya entra en hipertensión",
      "Edad y sexo cambian el riesgo, no la física de la presión",
    ],
    primaryCta: { label: "Consulta de enfermedades crónicas", href: chronicCareHref },
    secondaryCta: { label: "Usar la calculadora de tensión", href: toolHref },
    panelChip: "Qué resuelve este artículo",
    panelParas: [
      "Qué números orientan de verdad en adultos, sin mezclar tablas antiguas, alarmismo y consejos de foro.",
      "Qué cambia con la edad y qué no cambia aunque el buscador pida una tabla distinta para hombres y mujeres.",
      "Cómo medir la tensión en casa sin fabricar una falsa alarma ni una falsa tranquilidad.",
      "Cuándo una lectura alta puede revisarse por vídeo y cuándo necesita urgencias o una valoración presencial.",
    ],
    author: {
      initials: "FM",
      name: "Dr. Fidel Ernesto Mesa Prado",
      line: "Médico Especialista en Cardiología · Global Health España",
    },
    reviewLine:
      "Revisado clínicamente por el Dr. Eduardo Daniel Rodríguez Olivas, médico general, Global Health España.",
    navLabel: "En este artículo",
    sections: [
      {
        id: "cifras",
        nav: "Las cifras",
        eyebrow: "Lo primero",
        h2: "Tabla rápida: qué tensión se considera normal en un adulto",
        blocks: [
          lead("La referencia práctica no cambia por sexo ni por década de edad: por debajo de 120/80 mmHg es una lectura claramente normal; 140/90 mmHg repetido ya obliga a pensar en hipertensión."),
          p("Entre ambos extremos está la zona que más se malinterpreta. Mucha gente lee 132/84, se queda con el “no llego a 14/9” y asume que está todo bien. No es así. Puede no ser aún hipertensión confirmada, pero tampoco es una cifra ideal, y merece seguimiento si se repite."),
          ul([
            "<strong>Por debajo de 120/80</strong>: lectura claramente normal.",
            "<strong>120-139 de sistólica o 70-89 de diastólica</strong>: no es la zona ideal; repítala bien y sígala.",
            "<strong>140/90 o más en consulta, de forma repetida</strong>: compatible con hipertensión y requiere confirmación.",
            "<strong>Una lectura aislada</strong> no hace diagnóstico si el contexto fue malo: dolor, fiebre, ansiedad, café, tabaco o una técnica de medida deficiente.",
          ]),
          cite(`Resumen práctico basado en la guía ESC 2024 y en materiales de educación cardiovascular de la <a href="${FEC_HTA}" rel="nofollow noopener" target="_blank">Fundación Española del Corazón</a>.`),
        ],
      },
      {
        id: "edad-sexo",
        nav: "Edad y sexo",
        eyebrow: "La parte engañosa",
        h2: "Por qué no existe una tabla distinta para hombres y mujeres adultos",
        blocks: [
          lead("El buscador pide una tabla por edad y sexo porque la gente quiere una excepción para sí misma. La guía clínica no funciona así."),
          p("En adultos no embarazados, la presión arterial no se interpreta con una tabla distinta para hombres y para mujeres. El mismo 148/92 sigue siendo una cifra demasiado alta en ambos. Lo que sí cambia es la <strong>probabilidad</strong> de que esa cifra ya esté causando daño, el resto del riesgo cardiovascular y la forma de fijar el objetivo terapéutico."),
          ul([
            "<strong>Adulto joven</strong>: una cifra repetidamente alta importa aunque se encuentre bien, porque la hipertensión suele no dar síntomas.",
            "<strong>Mediana edad</strong>: el peso del colesterol, el tabaco, el perímetro abdominal y la diabetes cambia la urgencia del plan.",
            "<strong>Mayor o frágil</strong>: el objetivo de tratamiento puede individualizarse, pero eso no convierte en normal una lectura alta.",
            "<strong>Embarazo</strong>: es una situación aparte y no debe mezclarse con una tabla general para adultos.",
          ]),
          warn(
            "La frase “para su edad es normal” suele estar mal usada",
            "Lo razonable en una persona mayor es individualizar el tratamiento y evitar bajadas bruscas que den mareo o caídas. No es razonable llamar normal a una cifra persistentemente alta solo por la edad.",
          ),
        ],
      },
      {
        id: "leerla",
        nav: "Cómo leerla",
        eyebrow: "Dos números",
        h2: "Qué significan la sistólica y la diastólica",
        blocks: [
          lead("La sistólica es la presión máxima, cuando el corazón expulsa sangre. La diastólica es la mínima, cuando el corazón se relaja entre latidos."),
          p("No hace falta ser cardiólogo para entender la regla práctica: si una de las dos se sale del rango, esa lectura merece atención. Un 154/78 no es “normal porque la mínima está bien”. Un 126/94 tampoco lo es “porque la máxima no llega a 13”."),
          ul([
            "<strong>Sistólica alta con diastólica normal</strong>: muy frecuente con la edad y no debe banalizarse.",
            "<strong>Diastólica alta con sistólica menos llamativa</strong>: también suma riesgo y se revisa igual.",
            "<strong>Pulsos, ECG o síntomas</strong> ayudan a decidir el siguiente paso, pero no corrigen por sí solos una mala cifra.",
            "<strong>El contexto manda</strong>: si el tensiómetro marca muy distinto de un día a otro, antes de sacar conclusiones revise la técnica.",
          ]),
          p(`Si quiere una lectura más estructurada de varios días, use nuestra <a href="${toolHref}">calculadora y registro de tensión arterial</a> en lugar de interpretar cada medición como un veredicto.`),
        ],
      },
      {
        id: "medir",
        nav: "Cómo medir",
        eyebrow: "La técnica",
        h2: "Cómo medirse bien en casa",
        blocks: [
          lead("La mayoría de los sustos con la tensión empiezan en un sofá, con el manguito mal puesto y después de subir escaleras."),
          ul([
            "Siéntese cinco minutos antes, con la espalda apoyada y sin cruzar las piernas.",
            "No se mida justo después de café, tabaco, ejercicio o una discusión.",
            "Use un manguito de brazo del tamaño correcto; la muñeca falla más.",
            "Apoye el brazo a la altura del corazón y no hable mientras se mide.",
            "Haga dos lecturas seguidas y anótelas junto con la hora y el contexto.",
            "Repita varios días, no solo el día que estaba nervioso o el día que salió perfecto.",
          ]),
          p("Con esa libreta de mediciones, la consulta cambia mucho. Ya no hablamos de una cifra suelta, sino de un patrón. Ese patrón es el que sirve para ajustar tratamiento, decidir si hace falta una analítica, un ECG o simplemente corregir hábitos y volver a revisar."),
          cite(`La automedida fuera de consulta forma parte de la confirmación diagnóstica y del seguimiento en la <a href="${SEC_ESC_2024}" rel="nofollow noopener" target="_blank">adaptación española de la guía ESC 2024</a>.`),
        ],
      },
      {
        id: "cuando-consultar",
        nav: "Cuándo consultar",
        eyebrow: "La decisión",
        h2: "Cuándo basta pedir cita y cuándo hay que ir a urgencias",
        blocks: [
          lead("La mayoría de las lecturas altas no son una urgencia. Algunas sí lo son, sobre todo si vienen con síntomas."),
          ul([
            "<strong>Pida cita</strong> si repite cifras altas durante varios días, aunque se encuentre bien.",
            "<strong>Adelante la revisión</strong> si además hay diabetes, enfermedad renal, embarazo o antecedentes cardiovasculares.",
            "<strong>Busque ayuda urgente</strong> si la tensión es muy alta y aparece dolor en el pecho, falta de aire, confusión, debilidad de un lado del cuerpo, desmayo o un dolor de cabeza súbito e intenso.",
            "<strong>No ajuste por su cuenta</strong> la medicación antihipertensiva de rescate que le dieron hace años para “casos así”.",
          ]),
          warn(
            "Lo peligroso no es solo el número",
            "Una persona con 182/118 sin síntomas y otra con 168/102 más dolor torácico no tienen la misma urgencia. El síntoma cambia la prioridad.",
          ),
        ],
      },
      {
        id: "online",
        nav: "Consulta online",
        eyebrow: "Lead real",
        h2: "Qué puede resolver atención primaria y cuándo ayuda cardiología",
        blocks: [
          lead("La hipertensión estable suele controlarse en atención primaria. El cardiólogo entra cuando el patrón, los síntomas o las pruebas piden una valoración más especializada."),
          p(`En una <a href="${chronicCareHref}">consulta de enfermedades crónicas con un médico de familia</a> puede revisar sus mediciones, hábitos, tratamiento actual y analíticas, y acordar un seguimiento. Es una vía adecuada para el control habitual de la hipertensión y otros factores como diabetes, colesterol o peso.`),
          p("Una consulta de cardiología online no sustituye un ecocardiograma ni una urgencia, pero sí resuelve bien la parte que suele atascarse: leer sus mediciones en contexto, revisar un ECG o un Holter ya hechos, ordenar analíticas pendientes y decidir si hace falta intensificar el tratamiento o pasar a una valoración presencial."),
          ul([
            "Seguimiento habitual con atención primaria cuando la hipertensión está estable.",
            "Interpretación de un registro domiciliario de tensión con criterio clínico.",
            "Revisión de ECG, ecocardiograma, Holter o analíticas cardiológicas ya realizadas.",
            "Valoración de hipertensión mal controlada o resistente.",
            "Plan de seguimiento y coordinación de derivación presencial cuando hace falta.",
          ]),
          p("Eso convierte una búsqueda informativa en algo útil para el paciente: pasar de una tabla genérica a una decisión concreta sobre su caso."),
        ],
      },
    ],
    linksEyebrow: "Global Health España",
    linksH2: "Siguientes pasos",
    linksLead:
      "Si ya tiene varias lecturas fuera de rango, el paso útil no es otra búsqueda: es revisar el patrón completo y decidir si necesita cambios, más pruebas o una valoración presencial.",
    links: [
      { label: "Consulta de enfermedades crónicas con médico de familia", href: chronicCareHref },
      { label: "Consulta cardiológica online en España", href: href("/services/cardiologo-online") },
      { label: "Calculadora y registro de tensión arterial", href: toolHref },
      { label: "Nuestros médicos en España", href: href("/doctors") },
      { label: "Contactar con Global Health España", href: href("/contact") },
    ],
    ctaBox: {
      h3: "¿Tiene cifras repetidas fuera de rango?",
      text: "Empiece por atención primaria para el seguimiento habitual. Si las cifras siguen mal controladas, hay síntomas o necesita interpretar pruebas cardiológicas, puede pasar a valoración especializada.",
      primary: { label: "Consulta de enfermedades crónicas", href: chronicCareHref },
      secondary: { label: "Consulta de cardiología", href: href("/services/cardiologo-online") },
    },
    sourcesEyebrow: "Fuentes",
    sourcesH2: "Qué conviene leer en la fuente",
    sourcesLead:
      "Las categorías y la estrategia de confirmación deben leerse en guía clínica actual; los recursos divulgativos sirven para traducirlas a lenguaje de paciente.",
    sources: [
      { label: "ESC 2024 — Elevated blood pressure and hypertension", href: ESC_2024 },
      { label: "SEC — adaptación / PDF de la guía ESC 2024", href: SEC_ESC_2024 },
      { label: "Fundación Española del Corazón — hipertensión", href: FEC_HTA },
      { label: "SEH-LELHA", href: SEH },
    ],
    sourcesNote:
      "Los enlaces abren sitios externos. Este artículo resume rangos y decisiones prácticas; el diagnóstico y el objetivo terapéutico se individualizan en consulta.",
    faqEyebrow: "FAQ",
    faqH2: "Preguntas frecuentes",
    faqs: [
      {
        q: "¿La tensión normal es distinta en hombres y mujeres?",
        a: "No en el sentido práctico que suele buscar el paciente adulto. La interpretación general de la cifra no usa una tabla distinta por sexo para la mayoría de los adultos no embarazados. Lo que cambia es el riesgo cardiovascular global y el contexto clínico.",
      },
      {
        q: "¿A partir de cuánto se considera hipertensión?",
        a: "Una lectura repetida de 140/90 mmHg o más en consulta ya obliga a confirmar hipertensión. Si las cifras son altas en casa durante varios días, también merecen revisión aunque un único número no haga diagnóstico por sí solo.",
      },
      {
        q: "¿Una lectura de 13/8 está bien?",
        a: "No es la peor cifra del mundo, pero tampoco es la ideal. Está por encima de una lectura claramente normal y conviene repetirla bien, varios días, para ver si es una tendencia o una medición aislada.",
      },
      {
        q: "¿La edad hace normal tener la tensión alta?",
        a: "No. La edad puede hacer que el objetivo terapéutico se individualice y que el riesgo acumulado sea distinto, pero no convierte en normal una presión arterial persistentemente alta.",
      },
      {
        q: "¿Cuándo debo ir a urgencias por la tensión?",
        a: "Cuando una cifra muy alta se acompaña de dolor torácico, falta de aire, síntomas neurológicos, desmayo o un dolor de cabeza muy brusco e intenso. La urgencia la decide la combinación de cifra y síntomas, no el número aislado.",
      },
      {
        q: "¿Una consulta online puede ayudar con esto de verdad?",
        a: "Sí, sobre todo para revisar mediciones repetidas, interpretar pruebas ya hechas y decidir si hace falta ajustar el plan o pasar a valoración presencial. Lo que no hace es sustituir una urgencia ni una prueba que solo puede hacerse en persona.",
      },
    ],
    disclaimerTitle: "Aviso médico",
    disclaimer:
      "Escrito por el Dr. Fidel Ernesto Mesa Prado, médico especialista en Cardiología de Global Health España, y revisado clínicamente por el Dr. Eduardo Daniel Rodríguez Olivas, médico general. Este artículo ofrece información general y no sustituye una valoración médica individual. Si tiene síntomas de alarma o una sospecha de urgencia hipertensiva, llame al 112 o acuda a urgencias.",
  } satisfies Article,
};

export const ES_TENSION_ARTERIAL_NORMAL: PostSet = {
  key: "es-tension-arterial-normal",
  countryCode: "es",
  targetKeyword: "tensión arterial normal",
  searchVolume: 33100,
  keywordDifficulty: 10,
  evidence:
    "Editorial plan 2026-08-19 and follow-up batch 2026-08-19: tensión arterial normal 33,100 / KD 10; tensión arterial normal mujer 1,300; tensión arterial normal adultos 880; GSC 16 impressions at position 29. Active lead paths exist through Spain primary-care chronic-conditions management, specialist cardiology and the blood-pressure tool cluster.",
  serviceSlug: "enfermedades-cronicas-online",
  authorDoctorId: "cmrdpqvkc000z01rui7z5it57",
  authorDisplayName: "Dr. Fidel Ernesto Mesa Prado",
  reviewerDoctorId: "cmrdpxpi0001v01ruqavjiq79",
  reviewerDisplayName: "Dr. Eduardo Daniel Rodríguez Olivas",
  posts: [es],
};
