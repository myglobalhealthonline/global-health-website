/**
 * Spain — article 1 of 2.
 *
 * Target keyword: "baja laboral por ansiedad" — 1,000/mo, KD 0 (OpenSEO /
 * DataForSEO, location 2724, language es, expansion run 2026-08-04).
 * Cluster, all KD 0: como desmontar una baja por ansiedad 880 · despido por
 * viajar estando de baja 720 · sanciones por viajar al extranjero estando de
 * baja médica 480 · inspección médica del inss 390 · 6 meses de baja por
 * ansiedad 210 · cuando te llama la inspección médica estando de baja 170 ·
 * se puede viajar estando de baja en españa 170 · mi médico no me da la baja
 * por ansiedad 140 · baja laboral por ansiedad y depresión 70 · baja por
 * ansiedad duración mínima 50.
 *
 * Target unchanged by the expansion. What the expansion changed is the
 * article's spine: the tail is not "what is anxiety" at all. It is
 * surveillance and suspicion — the inspección médica, travelling while on
 * leave, and (from the employer's side) how to dismantle someone's leave. The
 * article answers those from the clinical side, which nobody on page one does.
 *
 * Rejected from the cluster: "baja por depresión fingida" (590) and "como
 * desmontar una baja por ansiedad" (880) as *targets*. The first is faked-
 * illness intent; the second is employer-side. The article addresses the
 * inspección honestly — what it is, what it can ask — without either
 * coaching anyone to fake a condition or helping an employer break a real one.
 *
 * SERP read (get_serp_results, es/2724, 2026-08-04): page one is HR and
 * payroll software (coverflex.com, factorial.es, payfit.com, sesamehr.es),
 * employment-law firms (asabogada.com, bufetetoro.com, jovermarben.com,
 * onlygal.es), private-insurance content (saludonnet.com) and psychology
 * practices. Several of them publish specific durations and percentages.
 * There is no doctor-authored page explaining what the clinician is actually
 * assessing, which is the gap this article fills.
 *
 * HONESTY CONSTRAINT — the most important thing in this file.
 * In Spain the parte de baja médica for incapacidad temporal is issued by the
 * médico del Servicio Público de Salud or by the mutua, depending on the
 * contingency. A private consultation — ours included — does NOT issue it.
 * Our Spanish service is "justificante-medico-online" ("Justificante Médico"),
 * which is a medical justification of absence, not a parte de baja. The
 * article states that in its own section instead of blurring it.
 *
 * No figures: maximum duration, waiting days, percentage of the base
 * reguladora and the days of contributions required are statutory, they move,
 * and page one is already full of contradictory versions of them. Every one
 * of them points at the Seguridad Social instead.
 *
 * Copy trap: /\bTODO\b/i in frontend/lib/content/publication-validation.ts
 * matches the ordinary Spanish word "todo". Written around throughout —
 * "sobre todo" becomes "especialmente", "ante todo" becomes "en primer lugar".
 */
import { cite, lead, p, renderArticle, ul, warn, type Article } from "./template.js";
import type { LocalePost, PostSet } from "./types.js";

const SEG_SOCIAL = "https://www.seg-social.es/";
const SANIDAD = "https://www.sanidad.gob.es/";
const CGCOM_REGISTRO = "https://www.cgcom.es/servicios/consulta-publica-de-colegiados";
const AEPD = "https://www.aepd.es/";

const href = (lang: string, path: string) => `https://www.myglobalhealth.online/spain/${lang}${path}`;

const es: LocalePost = {
  locale: "ES",
  slug: "baja-laboral-por-ansiedad-como-funciona",
  title: "Baja laboral por ansiedad: quién la emite y qué se evalúa",
  excerpt:
    "La baja por ansiedad es una incapacidad temporal y la emite el médico del sistema público o de la mutua, no una consulta privada. Explicamos qué evalúa el médico, qué sabe la empresa, qué es la inspección médica y qué puede hacer por usted una consulta online.",
  seoTitle: "Baja laboral por ansiedad: quién la emite en España",
  seoDescription:
    "Baja laboral por ansiedad en España: quién emite el parte de baja, qué evalúa el médico, qué información recibe la empresa y qué es la inspección médica.",
  category: "Salud Mental",
  article: {
    lang: "es-ES",
    tagline: "Medicina a cualquier hora, en cualquier lugar",
    categoryLabel: "Salud Mental",
    categoryHref: href("es", "/blog"),
    eyebrow: "España · Guía para trabajadores",
    h1: "Baja laboral por ansiedad",
    deck: "Ni es un capricho ni se concede por pedirla. Es una decisión clínica sobre si usted está, en este momento, en condiciones de trabajar.",
    intro:
      "Una <strong>baja laboral por ansiedad</strong> es una <strong>incapacidad temporal</strong> como cualquier otra: el médico certifica que un problema de salud le impide trabajar durante un tiempo. En España el <strong>parte de baja lo emite el médico del Servicio Público de Salud</strong> o, cuando la contingencia corresponde a la mutua, el médico de la mutua. Una consulta privada —también la nuestra— <strong>no emite el parte de baja</strong>: puede evaluarle, tratarle, emitir un justificante médico de ausencia e informar el proceso, que no es lo mismo. Lo que decide la baja no es la palabra «ansiedad», sino el grado de afectación funcional que el médico observa en la consulta.",
    facts: [
      "La emite el SNS o la mutua",
      "La empresa no recibe el diagnóstico",
      "Lo que se evalúa es la función",
    ],
    primaryCta: { label: "Consulta de salud mental", href: href("es", "/services/justificante-medico-online") },
    secondaryCta: { label: "Incapacidad temporal — Seguridad Social", href: SEG_SOCIAL },
    panelChip: "Qué cubre esta guía",
    panelParas: [
      "Quién puede emitir el parte de baja y por qué la vía privada no es esa vía.",
      "Qué evalúa realmente el médico cuando alguien consulta por ansiedad, y cómo llegar preparado a esa consulta.",
      "Qué información recibe la empresa, qué es la inspección médica y qué puede preguntarle.",
      "La duración máxima, los días de espera, el porcentaje de la base reguladora y los días cotizados exigidos son materia legal y cambian. Aquí no se citan cifras: cada punto remite a la Seguridad Social.",
    ],
    author: {
      initials: "MC",
      name: "Dra. Mónica Fabiana Cornejo Román",
      line: "Psiquiatra Consultora — Neuropsicofarmacología · Global Health España",
    },
    reviewLine:
      "Revisado clínicamente por el Dr. Eduardo Daniel Rodríguez Olivas, médico general, Global Health España.",
    navLabel: "En este artículo",
    sections: [
      {
        id: "que-es",
        nav: "Qué es",
        eyebrow: "Punto de partida",
        h2: "Qué es exactamente una baja por ansiedad",
        blocks: [
          lead("No existe una «baja por ansiedad» como categoría aparte. Existe una incapacidad temporal cuya causa es un trastorno de ansiedad."),
          p("Esa distinción no es un tecnicismo. Significa que el criterio es el mismo que en una lumbalgia o en una neumonía: <strong>¿le impide este problema de salud desempeñar su trabajo ahora mismo?</strong> No se evalúa cuánto sufre en abstracto, ni si su malestar está justificado, ni si su empresa se porta bien con usted. Se evalúa función."),
          p("Por eso dos personas con el mismo diagnóstico pueden recibir respuestas distintas. Una crisis puntual en alguien que sigue durmiendo y desempeñando sus tareas no es lo mismo que un cuadro con insomnio mantenido, incapacidad de concentración y deterioro claro del rendimiento."),
          ul([
            "<strong>Síntomas</strong> — ansiedad anticipatoria, crisis, insomnio, síntomas somáticos, irritabilidad, evitación.",
            "<strong>Función</strong> — concentración, memoria de trabajo, tolerancia al estrés, capacidad de conducir o de manejar maquinaria, trato con público.",
            "<strong>Riesgo</strong> — ideación autolítica, consumo de alcohol o de otras sustancias, seguridad propia y de terceros en el puesto.",
            "<strong>Contexto</strong> — qué hace exactamente en su trabajo, porque la misma clínica incapacita para un puesto y no para otro.",
            "<strong>Evolución</strong> — desde cuándo, qué ha probado, qué ha empeorado o mejorado.",
          ]),
          warn("Ansiedad no significa «no es real»", "Los síntomas físicos de la ansiedad —taquicardia, opresión torácica, falta de aire, mareo, molestias digestivas— son síntomas auténticos, no imaginados. Y a la inversa: precisamente porque se parecen a los de otras enfermedades, un cuadro nuevo merece ser evaluado y no atribuido a los nervios sin más."),
        ],
      },
      {
        id: "quien-la-emite",
        nav: "Quién la emite",
        eyebrow: "Circuito",
        h2: "Quién emite el parte de baja y por qué importa",
        blocks: [
          lead("Esta es la pregunta que más tiempo hace perder, porque la respuesta depende de la contingencia."),
          p("Si el proceso se considera <strong>contingencia común</strong>, el parte de baja lo emite su <strong>médico de atención primaria del Servicio Público de Salud</strong>. Si se considera <strong>contingencia profesional</strong> —accidente de trabajo o enfermedad profesional—, corresponde a la <strong>mutua colaboradora</strong> con la Seguridad Social. En ambos casos hay partes de confirmación periódicos y un parte de alta, y en ambos casos el seguimiento del proceso no lo lleva una consulta privada."),
          ul([
            "El <strong>parte de baja</strong> es un documento del sistema público o de la mutua, no un certificado privado.",
            "La <strong>prestación económica</strong> depende de la Seguridad Social y de sus requisitos, no del médico que le atiende.",
            "El <strong>INSS</strong> y la mutua pueden citarle para revisión a lo largo del proceso.",
            "Si no está de acuerdo con un alta, existen vías de reclamación: la Seguridad Social explica cuáles y en qué plazos.",
          ]),
          p("Conviene decir con claridad algo que se olvida a menudo: <strong>solicitar una baja no es una acusación contra su empresa</strong>, ni requiere que su empresa esté de acuerdo. Es una decisión clínica."),
          cite(`Requisitos, plazos y reclamaciones: <a href="${SEG_SOCIAL}" rel="nofollow noopener" target="_blank">Seguridad Social</a>.`),
        ],
      },
      {
        id: "consulta",
        nav: "En la consulta",
        eyebrow: "Preparación",
        h2: "Qué ocurre en la consulta y cómo llegar preparado",
        blocks: [
          lead("La queja más repetida —«mi médico no me da la baja»— casi nunca se resuelve insistiendo, y casi siempre se resuelve explicando mejor."),
          p("El médico dispone de pocos minutos y de lo que usted le cuente. Si describe su estado en términos generales —«estoy fatal», «no puedo más»—, está pidiéndole que adivine el impacto funcional. Si lo describe en términos concretos, le está dando exactamente el material sobre el que se decide una incapacidad temporal."),
          ul([
            "<strong>Qué ha dejado de poder hacer</strong>: tareas concretas de su puesto que antes hacía y ahora no.",
            "<strong>Sueño</strong>: cuántas noches, cuántas horas, si se despierta de madrugada.",
            "<strong>Errores y olvidos</strong> en el trabajo, y si ha habido alguna situación de riesgo.",
            "<strong>Síntomas físicos</strong> y su frecuencia: crisis, taquicardia, mareo, molestias digestivas.",
            "<strong>Riesgo</strong>: si ha tenido ideas de hacerse daño, dígalo. Es la información que más cambia la conducta clínica y la que más se calla.",
          ]),
          p("Si la valoración no refleja su situación, tiene derecho a pedir una nueva y a explicar lo que faltó. Una <strong>segunda opinión</strong> privada no emite el parte de baja, pero ayuda a ordenar los hechos clínicos y a documentar la evolución."),
        ],
      },
      {
        id: "empresa-inspeccion",
        nav: "Empresa e inspección",
        eyebrow: "Sus derechos",
        h2: "Qué sabe la empresa y qué es la inspección médica",
        blocks: [
          lead("La confusión aquí es enorme, y produce miedo innecesario en gente que está ya suficientemente mal."),
          p("Su empresa <strong>no recibe su diagnóstico</strong>. Lo que se comunica es la existencia de la baja y su duración estimada. Los datos de salud son una categoría especialmente protegida por la normativa de protección de datos, y ni el departamento de personal ni su jefe tienen derecho a que se les diga qué le ocurre. Puede contarlo si quiere, pero es una decisión suya, no una obligación."),
          p("La <strong>inspección médica</strong> —una citación del INSS o de la mutua— tampoco es un castigo ni una acusación. Es un control del proceso, y forma parte del funcionamiento normal de la incapacidad temporal. Le citan, le valoran, y esa valoración puede confirmar la baja o proponer el alta."),
          ul([
            "Acuda a la cita: la incomparecencia sin justificar tiene consecuencias sobre la prestación.",
            "Lleve informes, recetas y cualquier documentación clínica del proceso.",
            "Responda a lo que le pregunten sobre su estado y su evolución, con la misma concreción que en la consulta.",
            "No tiene que demostrar que sufre. Tiene que describir cómo está y qué puede y qué no puede hacer.",
          ]),
          warn("Sobre viajar o salir de casa estando de baja", "Estar de baja no equivale a arresto domiciliario, y en muchos cuadros de ansiedad salir a caminar forma parte del tratamiento. Lo que no procede es realizar actividades incompatibles con la recuperación o que contradigan la incapacidad alegada. Si va a desplazarse, especialmente al extranjero, consulte antes con su médico y con la Seguridad Social: las consecuencias de hacerlo mal afectan a la prestación, no solo a su salud."),
          cite(`Protección de datos de salud: <a href="${AEPD}" rel="nofollow noopener" target="_blank">AEPD</a>. Control de la incapacidad temporal: <a href="${SEG_SOCIAL}" rel="nofollow noopener" target="_blank">Seguridad Social</a>.`),
        ],
      },
      {
        id: "privada",
        nav: "Consulta privada",
        eyebrow: "Transparencia",
        h2: "Qué puede y qué no puede una consulta privada online",
        blocks: [
          lead("Lo decimos primero y sin rodeos, porque es la pregunta con la que llega la mayoría de la gente."),
          p("Una consulta privada, presencial o por vídeo, <strong>no emite el parte de baja de incapacidad temporal</strong>. Ese documento pertenece al circuito del Servicio Público de Salud o de la mutua. Cualquier servicio que le prometa «la baja» por internet le está prometiendo algo que no está en su mano, y conviene desconfiar de esa promesa antes de pagarla."),
          p("Lo que sí puede hacer una consulta privada es, con frecuencia, lo que la persona necesita esa misma semana:"),
          ul([
            "<strong>Evaluarle sin lista de espera</strong> y decirle con franqueza qué está viendo.",
            "<strong>Emitir un justificante médico</strong> de la ausencia, que no es un parte de baja y que así se lo diremos.",
            "<strong>Iniciar tratamiento</strong> cuando está indicado, y explicarle qué esperar y en cuánto tiempo.",
            "<strong>Descartar otras causas</strong> de síntomas que se parecen a la ansiedad y no lo son.",
            "<strong>Ordenar el caso</strong> para su médico de atención primaria: qué contar, qué documentar, qué pedir.",
            "<strong>Acompañar la vuelta al trabajo</strong>, que es la fase que casi nadie prepara.",
          ]),
          p(`Puede comprobar la colegiación de cualquier médico en el <a href="${CGCOM_REGISTRO}" rel="nofollow noopener" target="_blank">registro público del CGCOM</a>, con nosotros igual que con cualquier otro.`),
          warn("Ninguna consulta garantiza una baja", "Un médico que garantice el resultado antes de evaluarle no está ejerciendo la medicina. La decisión depende de lo que muestre la valoración clínica, y en el caso de la incapacidad temporal depende además de un circuito en el que la medicina privada no participa."),
        ],
      },
      {
        id: "tratamiento",
        nav: "Tratamiento",
        eyebrow: "Durante la baja",
        h2: "Qué se hace durante la baja, y la vuelta al trabajo",
        blocks: [
          lead("Una baja por ansiedad sin tratamiento suele ser una baja que se repite."),
          p("El tiempo, por sí solo, rara vez resuelve un trastorno de ansiedad. Lo que lo resuelve se decide caso a caso: <strong>psicoterapia</strong>, <strong>medicación</strong> cuando está indicada, intervención sobre el <strong>sueño</strong>, actividad física, reducción del alcohol y —cuando la causa está ahí— cambios en las condiciones de trabajo."),
          p("La vuelta merece prepararse con la misma seriedad que la salida. Reincorporarse el lunes al mismo puesto, con la misma carga y sin haber cambiado nada, es la receta habitual de la recaída. Hable con antelación de la reincorporación con su médico y, si su empresa dispone de <strong>vigilancia de la salud</strong>, con el servicio de prevención: la adaptación del puesto es una vía formal y existe precisamente para esto."),
          ul([
            "Mantenga horarios de sueño estables, aunque no trabaje.",
            "No abandone el tratamiento en cuanto mejore: la mejoría inicial no es el final del proceso.",
          ]),
        ],
      },
      {
        id: "urgencia",
        nav: "Cuándo no esperar",
        eyebrow: "Seguridad",
        h2: "Cuándo esto deja de ser un asunto de papeles",
        blocks: [
          lead("Hay situaciones en las que la baja es lo de menos y la atención es inmediata."),
          ul([
            "Ideas de quitarse la vida, un plan, o la sensación de no poder garantizar su propia seguridad.",
            "Incapacidad de cuidar de sí mismo o de personas a su cargo.",
            "Consumo de alcohol o de otras sustancias para poder funcionar o para dormir.",
            "Dolor torácico intenso, falta de aire en reposo o desmayo — que pueden parecer ansiedad y no serlo.",
          ]),
          p("En España existe la <strong>línea 024</strong> de atención a la conducta suicida, disponible las veinticuatro horas y gratuita. Ante una emergencia médica, llame al <strong>112</strong>. Pedir ayuda en ese momento no es un trámite laboral: es lo único que importa."),
          cite(`Información sobre la línea 024 y salud mental: <a href="${SANIDAD}" rel="nofollow noopener" target="_blank">Ministerio de Sanidad</a>.`),
        ],
      },
    ],
    linksEyebrow: "Global Health España",
    linksH2: "Siguientes pasos",
    linksLead:
      "Nuestros médicos en España evalúan por vídeo, sin lista de espera, y le dicen con claridad qué pueden resolver hoy y qué corresponde a su médico de atención primaria o a la mutua.",
    links: [
      { label: "Consulta médica y justificante médico", href: href("es", "/services/justificante-medico-online") },
      { label: "Nuestros médicos en España", href: href("es", "/doctors") },
      { label: "Contactar con Global Health España", href: href("es", "/contact") },
    ],
    ctaBox: {
      h3: "¿No sabe por dónde empezar?",
      text: "Una consulta breve sirve para evaluar cómo está, iniciar tratamiento si está indicado y ordenar lo que necesita llevar a su médico de atención primaria. Le diremos siempre qué documento estamos emitiendo y cuál no.",
      primary: { label: "Reservar consulta", href: href("es", "/services/justificante-medico-online") },
      secondary: { label: "Ver nuestros médicos", href: href("es", "/doctors") },
    },
    sourcesEyebrow: "Fuentes oficiales",
    sourcesH2: "Dónde confirmar las reglas",
    sourcesLead:
      "Duración, prestación económica, requisitos y plazos de reclamación son materia legal y cambian. Confirme siempre en la fuente.",
    sources: [
      { label: "Seguridad Social", href: SEG_SOCIAL },
      { label: "Ministerio de Sanidad", href: SANIDAD },
      { label: "Registro de colegiados — CGCOM", href: CGCOM_REGISTRO },
      { label: "Agencia Española de Protección de Datos", href: AEPD },
    ],
    sourcesNote:
      "Los enlaces abren en los sitios de los organismos competentes. Global Health no forma parte del Servicio Público de Salud ni de ninguna mutua, no emite partes de baja de incapacidad temporal y no interviene en la decisión sobre prestaciones.",
    faqEyebrow: "FAQ",
    faqH2: "Preguntas frecuentes",
    faqs: [
      {
        q: "¿Quién puede darme la baja por ansiedad en España?",
        a: "El parte de baja lo emite el médico de atención primaria del Servicio Público de Salud cuando el proceso es contingencia común, o el médico de la mutua cuando corresponde a contingencia profesional. Una consulta privada puede evaluarle, tratarle y emitir un justificante médico de ausencia, pero no emite el parte de baja.",
      },
      {
        q: "Mi médico no me da la baja por ansiedad, ¿qué puedo hacer?",
        a: "Vuelva a consultar describiendo el impacto funcional en términos concretos: qué tareas de su puesto ha dejado de poder hacer, cuánto duerme, qué errores ha cometido, qué síntomas físicos tiene y con qué frecuencia. Puede pedir una nueva valoración. Una segunda opinión privada no emite el parte, pero ayuda a documentar la evolución.",
      },
      {
        q: "¿Mi empresa puede saber que estoy de baja por ansiedad?",
        a: "Su empresa conoce la existencia de la baja y su duración estimada, no el diagnóstico. Los datos de salud están especialmente protegidos por la normativa de protección de datos. Contarlo es una decisión suya, nunca una obligación.",
      },
      {
        q: "¿Qué pasa si me llama la inspección médica estando de baja?",
        a: "Es un control ordinario del proceso, no una acusación. Acuda a la cita, lleve informes y documentación clínica y describa su estado y su evolución con concreción. La incomparecencia sin justificar tiene consecuencias sobre la prestación.",
      },
      {
        q: "¿Se puede viajar o salir de casa estando de baja?",
        a: "Estar de baja no implica permanecer en casa, y en muchos cuadros de ansiedad la actividad forma parte del tratamiento. Lo que no procede son actividades incompatibles con la recuperación o que contradigan la incapacidad. Antes de un desplazamiento, especialmente al extranjero, consúltelo con su médico y con la Seguridad Social.",
      },
      {
        q: "¿Cuánto dura una baja por ansiedad?",
        a: "No hay una duración fija: depende de la gravedad, de la respuesta al tratamiento y del puesto de trabajo. Los límites máximos y las prórrogas están fijados por ley y cambian, así que conviene confirmarlos en la Seguridad Social y no en un artículo.",
      },
    ],
    disclaimerTitle: "Aviso Médico",
    disclaimer:
      "Escrito por la Dra. Mónica Fabiana Cornejo Román, psiquiatra consultora de Global Health España, y revisado clínicamente por el Dr. Eduardo Daniel Rodríguez Olivas, médico general. Este artículo contiene información general sobre la incapacidad temporal por ansiedad en España. No constituye asesoramiento médico personalizado ni asesoramiento jurídico o laboral. El reconocimiento y el control de la incapacidad temporal corresponden al Servicio Público de Salud, a la mutua y a la Seguridad Social. Si tiene ideas de hacerse daño, llame al 024. Ante una emergencia médica, llame al 112.",
  } satisfies Article,
};

export const ES_BAJA_ANSIEDAD: PostSet = {
  key: "es-baja-ansiedad",
  countryCode: "es",
  targetKeyword: "baja laboral por ansiedad",
  searchVolume: 1000,
  keywordDifficulty: 0,
  evidence:
    "es/2724 expansion 2026-08-04. Head term 1,000 KD 0, unchanged by the expansion. Cluster all KD 0: como desmontar una baja por ansiedad 880, despido por viajar estando de baja 720, sanciones por viajar al extranjero estando de baja médica 480, inspección médica del inss 390, 6 meses de baja por ansiedad 210, cuando te llama la inspección médica estando de baja 170, se puede viajar estando de baja en españa 170, mi médico no me da la baja por ansiedad 140, baja por ansiedad duración mínima 50. The tail is about surveillance and suspicion rather than about anxiety, so the article answers the inspección and the travel question from the clinical side. Rejected as targets: 'baja por depresión fingida' (590, faked-illness intent) and 'como desmontar una baja por ansiedad' (880, employer-side). SERP 2026-08-04 is HR/payroll software (coverflex, factorial, payfit, sesamehr), employment-law firms and psychology practices, several publishing contradictory durations and percentages; no doctor-authored page explains what the clinician assesses.",
  serviceSlug: "justificante-medico-online",
  authorDoctorId: "cmrdpvch9001i01ruy7pmzmdk",
  authorDisplayName: "Dra. Mónica Fabiana Cornejo Román",
  reviewerDoctorId: "cmrdpxpi0001v01ruqavjiq79",
  reviewerDisplayName: "Dr. Eduardo Daniel Rodríguez Olivas",
  posts: [es],
};
