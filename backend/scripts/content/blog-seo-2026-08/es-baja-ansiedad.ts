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

const en: LocalePost = {
  locale: "EN",
  slug: "sick-leave-anxiety-spain",
  title: "Sick leave for anxiety in Spain: who issues it and what is assessed",
  excerpt:
    "Sick leave for anxiety is temporary incapacity, and the certificate is issued by a public-health or mutua doctor — not by a private consultation. What the doctor assesses, what your employer learns, what the medical inspection is, and what an online consultation can do.",
  seoTitle: "Sick leave for anxiety in Spain: who issues it",
  seoDescription:
    "Sick leave for anxiety in Spain: who issues the parte de baja, what the doctor assesses, what your employer is told and what the medical inspection means.",
  category: "Mental Health",
  article: {
    lang: "en-GB",
    tagline: "Medicine Anytime, Anywhere",
    categoryLabel: "Mental Health",
    categoryHref: href("en", "/blog"),
    eyebrow: "Spain · Employee guide",
    h1: "Sick leave for anxiety",
    deck: "Neither a whim nor something granted on request. It is a clinical decision about whether you are, right now, in a condition to work.",
    intro:
      "<strong>Sick leave for anxiety</strong> is <strong>temporary incapacity</strong> like any other: a doctor certifies that a health problem prevents you working for a period. In Spain the <strong>parte de baja is issued by a doctor in the public health service</strong>, or by a mutua doctor where the contingency falls to the mutua. A private consultation — ours included — <strong>does not issue the parte de baja</strong>: it can assess you, treat you, issue a medical justification of absence and inform the process, which is not the same thing. What decides the leave is not the word «anxiety» but the degree of functional impairment the doctor observes.",
    facts: ["Issued by the public service or mutua", "Your employer never gets the diagnosis", "Function is what is assessed"],
    primaryCta: { label: "Mental health consultation", href: href("en", "/services/justificante-medico-online") },
    secondaryCta: { label: "Temporary incapacity — Seguridad Social", href: SEG_SOCIAL },
    panelChip: "What this guide covers",
    panelParas: [
      "Who can issue the parte de baja, and why the private route is not that route.",
      "What a doctor actually assesses when someone consults about anxiety, and how to arrive prepared.",
      "What your employer is told, what the medical inspection is and what it may ask you.",
      "Maximum duration, waiting days, the percentage of the base reguladora and the contribution days required are matters of law and change. No figures appear here: each point refers to the Seguridad Social.",
    ],
    author: {
      initials: "MC",
      name: "Dra. Mónica Fabiana Cornejo Román",
      line: "Consultant Psychiatrist · Global Health Spain",
    },
    reviewLine: "Clinically reviewed by Dr. Eduardo Daniel Rodríguez Olivas, General Practitioner, Global Health Spain.",
    navLabel: "In this article",
    sections: [
      {
        id: "que-es",
        nav: "What it is",
        eyebrow: "Starting point",
        h2: "What sick leave for anxiety actually is",
        blocks: [
          lead("There is no separate category of «anxiety leave». There is temporary incapacity whose cause is an anxiety disorder."),
          p("That distinction is not a technicality. It means the test is the same as for back pain or pneumonia: <strong>does this health problem stop you doing your job right now?</strong> Nobody assesses how much you suffer in the abstract, nor whether your distress is justified, nor whether your employer treats you well. Function is what is assessed."),
          p("That is why two people with the same diagnosis can get different answers. An isolated episode in someone who is still sleeping and doing their tasks is not the same as sustained insomnia, an inability to concentrate and a clear drop in performance."),
          ul([
            "<strong>Symptoms</strong> — anticipatory anxiety, panic episodes, insomnia, physical symptoms, irritability, avoidance.",
            "<strong>Function</strong> — concentration, working memory, tolerance of stress, ability to drive or operate machinery, dealing with the public.",
            "<strong>Risk</strong> — thoughts of self-harm, alcohol or other substance use, your safety and that of others at work.",
            "<strong>Context</strong> — what your job actually involves, because the same clinical picture disables one role and not another.",
            "<strong>Course</strong> — since when, what you have tried, what has worsened or improved.",
          ]),
          warn("Anxiety does not mean «not real»", "The physical symptoms of anxiety — palpitations, chest tightness, breathlessness, dizziness, digestive upset — are genuine, not imagined. And conversely: precisely because they resemble other illnesses, a new picture deserves assessment rather than being written off as nerves."),
        ],
      },
      {
        id: "quien-la-emite",
        nav: "Who issues it",
        eyebrow: "The circuit",
        h2: "Who issues the parte de baja, and why it matters",
        blocks: [
          lead("This is the question that wastes the most time, because the answer depends on the contingency."),
          p("If the process counts as <strong>contingencia común</strong>, the parte de baja is issued by your <strong>primary care doctor in the public health service</strong>. If it counts as <strong>contingencia profesional</strong> — an accident at work or occupational disease — it falls to the <strong>mutua</strong>. Either way there are periodic confirmation reports and a discharge report, and either way the process is not followed by a private consultation."),
          ul([
            "The <strong>parte de baja</strong> is a document of the public system or the mutua, not a private certificate.",
            "The <strong>payment</strong> depends on the Seguridad Social and its requirements, not on the doctor who sees you.",
            "The <strong>INSS</strong> and the mutua may call you for review during the process.",
            "If you disagree with a discharge there are routes of appeal: the Seguridad Social sets out which, and within what deadlines.",
          ]),
          p("One thing worth saying plainly, because it is often forgotten at work: <strong>asking for sick leave is not an accusation against your employer</strong>, and it does not require your employer to agree. It is a clinical decision."),
          cite(`Requirements, deadlines and appeals: <a href="${SEG_SOCIAL}" rel="nofollow noopener" target="_blank">Seguridad Social</a>.`),
        ],
      },
      {
        id: "consulta",
        nav: "In the consultation",
        eyebrow: "Preparation",
        h2: "What happens in the consultation and how to arrive prepared",
        blocks: [
          lead("The most common complaint — «my doctor won't sign me off» — is almost never solved by insisting, and almost always by explaining better."),
          p("The doctor has a few minutes and whatever you tell them. Describing your state in general terms — «I'm wrecked», «I can't go on» — asks them to guess the functional impact. Describing it concretely gives them exactly the material on which temporary incapacity is decided."),
          ul([
            "<strong>What you have stopped being able to do</strong>: specific tasks of your job you managed before and cannot now.",
            "<strong>Sleep</strong>: how many nights, how many hours, whether you wake in the early morning.",
            "<strong>Errors and lapses</strong> at work, and whether any situation became unsafe.",
            "<strong>Physical symptoms</strong> and their frequency: panic episodes, palpitations, dizziness, digestive upset.",
            "<strong>Risk</strong>: if you have had thoughts of harming yourself, say so. It is the information that most changes clinical management and the one most often withheld.",
          ]),
          p("If the assessment does not reflect your situation, you are entitled to ask for another and to explain what was missed. A private <strong>second opinion</strong> does not issue the parte de baja, but it helps to order the clinical facts and document the course."),
        ],
      },
      {
        id: "empresa-inspeccion",
        nav: "Employer and inspection",
        eyebrow: "Your rights",
        h2: "What your employer knows and what the medical inspection is",
        blocks: [
          lead("The confusion here is considerable, and it frightens people who are already unwell enough."),
          p("Your employer <strong>does not receive your diagnosis</strong>. What is communicated is the existence of the leave and its estimated duration. Health data is a specially protected category, and neither HR nor your manager has any right to be told what is wrong. You may tell them if you wish, but that is your decision, not an obligation."),
          p("The <strong>medical inspection</strong> — a summons from the INSS or the mutua — is not a punishment or an accusation either. It is a control of the process and a normal part of how temporary incapacity works. You are called, assessed, and that assessment may confirm the leave or propose discharge."),
          ul([
            "Attend the appointment: unjustified non-attendance has consequences for the payment.",
            "Bring reports, prescriptions and any clinical documentation of the process.",
            "Answer what you are asked about your state and its course, with the same concreteness as in the consultation.",
            "You do not have to prove that you are suffering. You have to describe how you are and what you can and cannot do.",
          ]),
          warn("On travelling or leaving the house while on leave", "Being on sick leave is not house arrest, and in many anxiety presentations going for a walk is part of the treatment. What is not appropriate is activity incompatible with recovery or contradicting the claimed incapacity. If you are going to travel, especially abroad, check first with your doctor and the Seguridad Social: getting it wrong affects the payment, not only your health."),
          cite(`Health data protection: <a href="${AEPD}" rel="nofollow noopener" target="_blank">AEPD</a>. Control of temporary incapacity: <a href="${SEG_SOCIAL}" rel="nofollow noopener" target="_blank">Seguridad Social</a>.`),
        ],
      },
      {
        id: "privada",
        nav: "Private consultation",
        eyebrow: "Transparency",
        h2: "What a private online consultation can and cannot do",
        blocks: [
          lead("We say it first and without hedging, because it is the question most people arrive with."),
          p("A private consultation, in person or by video, <strong>does not issue the parte de baja for temporary incapacity</strong>. That document belongs to the public health service or the mutua. Any service promising you «the baja» over the internet is promising something outside its power, and that promise is worth distrusting before you pay for it."),
          p("What a private consultation can do is often what the person needs that same week:"),
          ul([
            "<strong>Assess you without a waiting list</strong> and tell you frankly what it is seeing.",
            "<strong>Issue a medical justification</strong> of the absence — which is not a parte de baja, and we will say so.",
            "<strong>Start treatment</strong> where indicated, and explain what to expect and how soon.",
            "<strong>Rule out other causes</strong> of symptoms that resemble anxiety and are not.",
            "<strong>Organise the case</strong> for your primary care doctor: what to say, what to document, what to ask for.",
            "<strong>Support the return to work</strong>, which is the phase almost nobody prepares.",
          ]),
          p(`You can check any doctor's registration in the <a href="${CGCOM_REGISTRO}" rel="nofollow noopener" target="_blank">CGCOM public register</a>, with us as with anyone else.`),
          warn("No consultation guarantees sick leave", "A doctor who guarantees the outcome before assessing you is not practising medicine. The decision depends on what the clinical assessment shows, and in the case of temporary incapacity it depends on a circuit private medicine does not take part in."),
        ],
      },
      {
        id: "tratamiento",
        nav: "Treatment",
        eyebrow: "During the leave",
        h2: "What happens during the leave, and the return to work",
        blocks: [
          lead("Sick leave for anxiety without treatment tends to be sick leave that repeats."),
          p("Time alone rarely resolves an anxiety disorder. What resolves it is decided case by case: <strong>psychotherapy</strong>, <strong>medication</strong> where indicated, work on <strong>sleep</strong>, physical activity, reducing alcohol and — where the cause lies there — changes to working conditions."),
          p("The return deserves as much preparation as the exit. Going back on Monday to the same job, the same workload and nothing changed is the standard recipe for relapse. Discuss the return with your doctor in advance and, if your employer has an <strong>occupational health service</strong>, with them: adapting the role is a formal route and exists precisely for this."),
          ul([
            "Keep stable sleep hours, even when not working.",
            "Do not stop treatment as soon as you improve: early improvement is not the end of the process.",
          ]),
        ],
      },
      {
        id: "urgencia",
        nav: "When not to wait",
        eyebrow: "Safety",
        h2: "When this stops being a paperwork question",
        blocks: [
          lead("There are situations in which the leave is the least of it and care is immediate."),
          ul([
            "Thoughts of ending your life, a plan, or the sense that you cannot keep yourself safe.",
            "Being unable to care for yourself or for people who depend on you.",
            "Using alcohol or other substances in order to function or to sleep.",
            "Severe chest pain, breathlessness at rest or fainting — which can look like anxiety and not be.",
          ]),
          p("Spain has the <strong>024 line</strong> for suicidal behaviour, free and available around the clock. In a medical emergency, call <strong>112</strong>. Asking for help at that moment is not an employment formality: it is the only thing that matters."),
          cite(`Information on the 024 line and mental health: <a href="${SANIDAD}" rel="nofollow noopener" target="_blank">Ministry of Health</a>.`),
        ],
      },
    ],
    linksEyebrow: "Global Health Spain",
    linksH2: "Next steps",
    linksLead:
      "Our doctors in Spain assess by video, without a waiting list, and tell you clearly what can be settled today and what belongs to your primary care doctor or the mutua.",
    links: [
      { label: "Medical consultation and justification of absence", href: href("en", "/services/justificante-medico-online") },
      { label: "Our doctors in Spain", href: href("en", "/doctors") },
      { label: "Contact Global Health Spain", href: href("en", "/contact") },
    ],
    ctaBox: {
      h3: "Not sure where to start?",
      text: "A short consultation assesses how you are, starts treatment if indicated and organises what you need to take to your primary care doctor. We will always tell you which document we are issuing and which we are not.",
      primary: { label: "Book a consultation", href: href("en", "/services/justificante-medico-online") },
      secondary: { label: "See our doctors", href: href("en", "/doctors") },
    },
    sourcesEyebrow: "Official sources",
    sourcesH2: "Where to confirm the rules",
    sourcesLead: "Duration, payment, requirements and appeal deadlines are matters of law and change. Always confirm at the source.",
    sources: [
      { label: "Seguridad Social", href: SEG_SOCIAL },
      { label: "Ministry of Health", href: SANIDAD },
      { label: "Register of doctors — CGCOM", href: CGCOM_REGISTRO },
      { label: "Spanish Data Protection Agency", href: AEPD },
    ],
    sourcesNote:
      "Links open on the competent bodies' own websites. Global Health is not part of the public health service or any mutua, does not issue partes de baja for temporary incapacity and takes no part in decisions on benefits.",
    faqEyebrow: "FAQ",
    faqH2: "Common questions",
    faqs: [
      {
        q: "Who can sign me off for anxiety in Spain?",
        a: "The parte de baja is issued by your primary care doctor in the public health service when the process is contingencia común, or by the mutua doctor when it falls to contingencia profesional. A private consultation can assess you, treat you and issue a medical justification of absence, but it does not issue the parte de baja.",
      },
      {
        q: "My doctor won't sign me off for anxiety — what can I do?",
        a: "Consult again describing the functional impact concretely: which tasks of your job you can no longer do, how much you sleep, what errors you have made, what physical symptoms you have and how often. You may ask for a new assessment. A private second opinion does not issue the parte, but it helps document the course.",
      },
      {
        q: "Can my employer find out I am off for anxiety?",
        a: "Your employer knows the leave exists and its estimated duration, not the diagnosis. Health data is specially protected. Telling them is your decision, never an obligation.",
      },
      {
        q: "What happens if the medical inspection calls me while I am on leave?",
        a: "It is an ordinary control of the process, not an accusation. Attend, bring reports and clinical documentation, and describe your state and its course concretely. Unjustified non-attendance has consequences for the payment.",
      },
      {
        q: "Can I travel or leave the house while on sick leave?",
        a: "Being on leave does not mean staying indoors, and in many anxiety presentations activity is part of treatment. What is not appropriate is activity incompatible with recovery or contradicting the incapacity. Before travelling, especially abroad, check with your doctor and the Seguridad Social.",
      },
      {
        q: "How long does sick leave for anxiety last?",
        a: "There is no fixed duration: it depends on severity, response to treatment and the job. Maximum limits and extensions are set by law and change, so confirm them with the Seguridad Social rather than in an article.",
      },
    ],
    disclaimerTitle: "Medical Disclaimer",
    disclaimer:
      "Written by Dra. Mónica Fabiana Cornejo Román, Consultant Psychiatrist at Global Health Spain, and clinically reviewed by Dr. Eduardo Daniel Rodríguez Olivas, General Practitioner. This article contains general information about temporary incapacity for anxiety in Spain. It is not personalised medical advice, nor legal or employment advice. Recognition and control of temporary incapacity rest with the public health service, the mutua and the Seguridad Social. If you have thoughts of harming yourself, call 024. In a medical emergency, call 112.",
  } satisfies Article,
};

const pt: LocalePost = {
  locale: "PT",
  slug: "baixa-por-ansiedade-espanha",
  title: "Baixa por ansiedade em Espanha: quem a emite e o que é avaliado",
  excerpt:
    "A baixa por ansiedade é uma incapacidade temporária e o parte de baja é emitido por médico do serviço público ou da mútua, não por uma consulta privada. O que o médico avalia, o que a entidade patronal sabe, o que é a inspeção médica e o que uma consulta online pode fazer.",
  seoTitle: "Baixa por ansiedade em Espanha: quem a emite",
  seoDescription:
    "Baixa por ansiedade em Espanha: quem emite o parte de baja, o que o médico avalia, o que a entidade patronal recebe e o que é a inspeção médica.",
  category: "Saúde Mental",
  article: {
    lang: "pt-PT",
    tagline: "Medicina a qualquer hora, em qualquer lugar",
    categoryLabel: "Saúde Mental",
    categoryHref: href("pt", "/blog"),
    eyebrow: "Espanha · Guia para trabalhadores",
    h1: "Baixa por ansiedade",
    deck: "Não é um capricho nem se concede por se pedir. É uma decisão clínica sobre se está, neste momento, em condições de trabalhar.",
    intro:
      "Uma <strong>baixa por ansiedade</strong> é uma <strong>incapacidade temporária</strong> como qualquer outra: o médico certifica que um problema de saúde o impede de trabalhar durante um período. Em Espanha, o <strong>parte de baja é emitido pelo médico do Serviço Público de Saúde</strong> ou, quando a contingência cabe à mútua, pelo médico da mútua. Uma consulta privada — também a nossa — <strong>não emite o parte de baja</strong>: pode avaliá-lo, tratá-lo, emitir uma justificação médica de ausência e informar o processo, o que não é a mesma coisa. O que decide a baixa não é a palavra «ansiedade», mas o grau de afetação funcional que o médico observa.",
    facts: ["Emitida pelo serviço público ou pela mútua", "A empresa não recebe o diagnóstico", "O que se avalia é a função"],
    primaryCta: { label: "Consulta de saúde mental", href: href("pt", "/services/justificante-medico-online") },
    secondaryCta: { label: "Incapacidade temporária — Seguridad Social", href: SEG_SOCIAL },
    panelChip: "O que este guia cobre",
    panelParas: [
      "Quem pode emitir o parte de baja e por que a via privada não é essa via.",
      "O que o médico avalia realmente quando alguém consulta por ansiedade, e como chegar preparado.",
      "Que informação a empresa recebe, o que é a inspeção médica e o que lhe pode perguntar.",
      "A duração máxima, os dias de espera, a percentagem da base reguladora e os dias de descontos exigidos são matéria legal e mudam. Aqui não há números: cada ponto remete para a Seguridad Social.",
    ],
    author: {
      initials: "MC",
      name: "Dra. Mónica Fabiana Cornejo Román",
      line: "Psiquiatra consultora · Global Health Espanha",
    },
    reviewLine: "Revisto clinicamente pelo Dr. Eduardo Daniel Rodríguez Olivas, médico de clínica geral, Global Health Espanha.",
    navLabel: "Neste artigo",
    sections: [
      {
        id: "que-es",
        nav: "O que é",
        eyebrow: "Ponto de partida",
        h2: "O que é, exatamente, uma baixa por ansiedade",
        blocks: [
          lead("Não existe uma «baixa por ansiedade» como categoria à parte. Existe uma incapacidade temporária cuja causa é uma perturbação de ansiedade."),
          p("A distinção não é um tecnicismo. Significa que o critério é o mesmo de uma lombalgia ou de uma pneumonia: <strong>este problema de saúde impede-o de desempenhar o seu trabalho agora?</strong> Não se avalia quanto sofre em abstrato, nem se o seu mal-estar é justificado, nem se a empresa o trata bem. Avalia-se função."),
          p("Por isso duas pessoas com o mesmo diagnóstico podem receber respostas diferentes. Um episódio pontual em quem continua a dormir e a cumprir as suas tarefas não é o mesmo que insónia mantida, incapacidade de concentração e queda clara de rendimento."),
          ul([
            "<strong>Sintomas</strong> — ansiedade antecipatória, crises, insónia, sintomas físicos, irritabilidade, evitamento.",
            "<strong>Função</strong> — concentração, memória de trabalho, tolerância ao stress, capacidade de conduzir ou operar máquinas, atendimento ao público.",
            "<strong>Risco</strong> — ideação autolesiva, consumo de álcool ou outras substâncias, segurança própria e de terceiros no posto.",
            "<strong>Contexto</strong> — o que faz exatamente no seu trabalho, porque o mesmo quadro incapacita para um posto e não para outro.",
            "<strong>Evolução</strong> — desde quando, o que já tentou, o que piorou ou melhorou.",
          ]),
          warn("Ansiedade não significa «não é real»", "Os sintomas físicos da ansiedade — taquicardia, aperto no peito, falta de ar, tonturas, queixas digestivas — são autênticos, não imaginados. E ao contrário: precisamente por se parecerem com os de outras doenças, um quadro novo merece ser avaliado e não atribuído aos nervos sem mais."),
        ],
      },
      {
        id: "quien-la-emite",
        nav: "Quem a emite",
        eyebrow: "Circuito",
        h2: "Quem emite o parte de baja e por que importa",
        blocks: [
          lead("Esta é a pergunta que mais tempo faz perder, porque a resposta depende da contingência."),
          p("Se o processo for considerado <strong>contingencia común</strong>, o parte de baja é emitido pelo seu <strong>médico de cuidados primários do Serviço Público de Saúde</strong>. Se for considerado <strong>contingencia profesional</strong> — acidente de trabalho ou doença profissional —, cabe à <strong>mútua colaboradora</strong>. Em ambos os casos há partes de confirmação periódicos e um parte de alta, e em ambos o seguimento do processo não é feito por uma consulta privada."),
          ul([
            "O <strong>parte de baja</strong> é um documento do sistema público ou da mútua, não um certificado privado.",
            "A <strong>prestação económica</strong> depende da Seguridad Social e dos seus requisitos, não do médico que o atende.",
            "O <strong>INSS</strong> e a mútua podem convocá-lo para revisão ao longo do processo.",
            "Se não concordar com uma alta, existem vias de reclamação: a Seguridad Social indica quais e em que prazos.",
          ]),
          p("Vale a pena dizer com clareza algo que no trabalho se esquece com frequência: <strong>pedir uma baixa não é uma acusação contra a sua empresa</strong> e também não exige que a empresa concorde. É uma decisão clínica."),
          cite(`Requisitos, prazos e reclamações: <a href="${SEG_SOCIAL}" rel="nofollow noopener" target="_blank">Seguridad Social</a>.`),
        ],
      },
      {
        id: "consulta",
        nav: "Na consulta",
        eyebrow: "Preparação",
        h2: "O que acontece na consulta e como chegar preparado",
        blocks: [
          lead("A queixa mais repetida — «o meu médico não me passa a baixa» — quase nunca se resolve insistindo, e quase sempre se resolve explicando melhor."),
          p("O médico dispõe de poucos minutos e daquilo que lhe contar. Se descrever o seu estado em termos gerais — «estou péssimo», «não aguento mais» —, está a pedir-lhe que adivinhe o impacto funcional. Se o descrever em termos concretos, está a dar-lhe exatamente o material sobre o qual se decide uma incapacidade temporária."),
          ul([
            "<strong>O que deixou de conseguir fazer</strong>: tarefas concretas do seu posto que antes fazia e agora não.",
            "<strong>Sono</strong>: quantas noites, quantas horas, se acorda de madrugada.",
            "<strong>Erros e esquecimentos</strong> no trabalho, e se houve alguma situação de risco.",
            "<strong>Sintomas físicos</strong> e a sua frequência: crises, taquicardia, tonturas, queixas digestivas.",
            "<strong>Risco</strong>: se teve ideias de se magoar, diga-o. É a informação que mais muda a conduta clínica e a que mais se cala.",
          ]),
          p("Se a avaliação não refletir a sua situação, tem direito a pedir nova avaliação e a explicar o que faltou. Uma <strong>segunda opinião</strong> privada não emite o parte de baja, mas ajuda a ordenar os factos clínicos e a documentar a evolução."),
        ],
      },
      {
        id: "empresa-inspeccion",
        nav: "Empresa e inspeção",
        eyebrow: "Os seus direitos",
        h2: "O que a empresa sabe e o que é a inspeção médica",
        blocks: [
          lead("A confusão aqui é enorme e produz medo desnecessário em quem já está suficientemente mal."),
          p("A sua empresa <strong>não recebe o seu diagnóstico</strong>. O que é comunicado é a existência da baixa e a sua duração estimada. Os dados de saúde são uma categoria especialmente protegida, e nem os recursos humanos nem a chefia têm direito a que se lhes diga o que tem. Pode contá-lo se quiser, mas é uma decisão sua, não uma obrigação."),
          p("A <strong>inspeção médica</strong> — uma convocatória do INSS ou da mútua — também não é um castigo nem uma acusação. É um controlo do processo e faz parte do funcionamento normal da incapacidade temporária. É convocado, avaliado, e essa avaliação pode confirmar a baixa ou propor a alta."),
          ul([
            "Compareça à convocatória: a falta injustificada tem consequências na prestação.",
            "Leve relatórios, receitas e qualquer documentação clínica do processo.",
            "Responda ao que lhe perguntarem sobre o seu estado e a sua evolução, com a mesma concretização da consulta.",
            "Não tem de demonstrar que sofre. Tem de descrever como está e o que consegue e não consegue fazer.",
          ]),
          warn("Sobre viajar ou sair de casa durante a baixa", "Estar de baixa não equivale a prisão domiciliária, e em muitos quadros de ansiedade sair a caminhar faz parte do tratamento. O que não é adequado é realizar atividades incompatíveis com a recuperação ou que contradigam a incapacidade alegada. Se vai deslocar-se, sobretudo ao estrangeiro, consulte antes o seu médico e a Seguridad Social: as consequências de o fazer mal afetam a prestação, não só a sua saúde."),
          cite(`Proteção de dados de saúde: <a href="${AEPD}" rel="nofollow noopener" target="_blank">AEPD</a>. Controlo da incapacidade temporária: <a href="${SEG_SOCIAL}" rel="nofollow noopener" target="_blank">Seguridad Social</a>.`),
        ],
      },
      {
        id: "privada",
        nav: "Consulta privada",
        eyebrow: "Transparência",
        h2: "O que uma consulta privada online pode e não pode fazer",
        blocks: [
          lead("Dizemo-lo primeiro e sem rodeios, porque é a pergunta com que a maioria das pessoas chega."),
          p("Uma consulta privada, presencial ou por vídeo, <strong>não emite o parte de baja de incapacidade temporária</strong>. Esse documento pertence ao circuito do Serviço Público de Saúde ou da mútua. Qualquer serviço que lhe prometa «a baixa» pela internet está a prometer algo que não está na sua mão, e convém desconfiar dessa promessa antes de a pagar."),
          p("O que uma consulta privada pode fazer é, com frequência, aquilo de que a pessoa precisa nessa mesma semana:"),
          ul([
            "<strong>Avaliá-lo sem lista de espera</strong> e dizer-lhe com franqueza o que está a ver.",
            "<strong>Emitir uma justificação médica</strong> da ausência, que não é um parte de baja e assim lho diremos.",
            "<strong>Iniciar tratamento</strong> quando está indicado, e explicar o que esperar e em quanto tempo.",
            "<strong>Excluir outras causas</strong> de sintomas que se parecem com ansiedade e não o são.",
            "<strong>Ordenar o caso</strong> para o seu médico de cuidados primários: o que contar, o que documentar, o que pedir.",
            "<strong>Acompanhar o regresso ao trabalho</strong>, que é a fase que quase ninguém prepara.",
          ]),
          p(`Pode confirmar a inscrição de qualquer médico no <a href="${CGCOM_REGISTRO}" rel="nofollow noopener" target="_blank">registo público do CGCOM</a>, connosco como com qualquer outro.`),
          warn("Nenhuma consulta garante uma baixa", "Um médico que garanta o resultado antes de o avaliar não está a exercer medicina. A decisão depende do que mostrar a avaliação clínica e, no caso da incapacidade temporária, depende ainda de um circuito em que a medicina privada não participa."),
        ],
      },
      {
        id: "tratamiento",
        nav: "Tratamento",
        eyebrow: "Durante a baixa",
        h2: "O que se faz durante a baixa, e o regresso ao trabalho",
        blocks: [
          lead("Uma baixa por ansiedade sem tratamento costuma ser uma baixa que se repete."),
          p("O tempo, por si só, raramente resolve uma perturbação de ansiedade. O que a resolve decide-se caso a caso: <strong>psicoterapia</strong>, <strong>medicação</strong> quando indicada, intervenção sobre o <strong>sono</strong>, atividade física, redução do álcool e — quando a causa está aí — alterações nas condições de trabalho."),
          p("O regresso merece ser preparado com a mesma seriedade que a saída. Reincorporar-se na segunda-feira ao mesmo posto, com a mesma carga e sem nada ter mudado, é a receita habitual da recaída. Fale antecipadamente da reincorporação com o seu médico e, se a empresa dispuser de <strong>vigilância da saúde</strong>, com o serviço de prevenção: a adaptação do posto é uma via formal e existe precisamente para isto."),
          ul([
            "Mantenha horários de sono estáveis, mesmo sem trabalhar.",
            "Não abandone o tratamento assim que melhorar: a melhoria inicial não é o fim do processo.",
          ]),
        ],
      },
      {
        id: "urgencia",
        nav: "Quando não esperar",
        eyebrow: "Segurança",
        h2: "Quando isto deixa de ser um assunto de papéis",
        blocks: [
          lead("Há situações em que a baixa é o menos importante e a atenção é imediata."),
          ul([
            "Ideias de acabar com a vida, um plano, ou a sensação de não conseguir garantir a sua própria segurança.",
            "Incapacidade de cuidar de si próprio ou de pessoas a seu cargo.",
            "Consumo de álcool ou outras substâncias para conseguir funcionar ou dormir.",
            "Dor torácica intensa, falta de ar em repouso ou desmaio — que podem parecer ansiedade e não ser.",
          ]),
          p("Em Espanha existe a <strong>linha 024</strong> de atenção à conduta suicida, disponível vinte e quatro horas e gratuita. Perante uma emergência médica, ligue <strong>112</strong>. Pedir ajuda nesse momento não é um trâmite laboral: é a única coisa que importa."),
          cite(`Informação sobre a linha 024 e saúde mental: <a href="${SANIDAD}" rel="nofollow noopener" target="_blank">Ministerio de Sanidad</a>.`),
        ],
      },
    ],
    linksEyebrow: "Global Health Espanha",
    linksH2: "Passos seguintes",
    linksLead:
      "Os nossos médicos em Espanha avaliam por vídeo, sem lista de espera, e dizem-lhe com clareza o que pode ser resolvido hoje e o que compete ao seu médico de cuidados primários ou à mútua.",
    links: [
      { label: "Consulta médica e justificação médica", href: href("pt", "/services/justificante-medico-online") },
      { label: "Os nossos médicos em Espanha", href: href("pt", "/doctors") },
      { label: "Contactar a Global Health Espanha", href: href("pt", "/contact") },
    ],
    ctaBox: {
      h3: "Não sabe por onde começar?",
      text: "Uma consulta curta serve para avaliar como está, iniciar tratamento se estiver indicado e ordenar o que precisa de levar ao seu médico de cuidados primários. Diremos sempre que documento estamos a emitir e qual não.",
      primary: { label: "Marcar consulta", href: href("pt", "/services/justificante-medico-online") },
      secondary: { label: "Ver os nossos médicos", href: href("pt", "/doctors") },
    },
    sourcesEyebrow: "Fontes oficiais",
    sourcesH2: "Onde confirmar as regras",
    sourcesLead: "Duração, prestação económica, requisitos e prazos de reclamação são matéria legal e mudam. Confirme sempre na fonte.",
    sources: [
      { label: "Seguridad Social", href: SEG_SOCIAL },
      { label: "Ministerio de Sanidad", href: SANIDAD },
      { label: "Registo de médicos — CGCOM", href: CGCOM_REGISTRO },
      { label: "Agencia Española de Protección de Datos", href: AEPD },
    ],
    sourcesNote:
      "As ligações abrem nos sites dos organismos competentes. A Global Health não faz parte do Serviço Público de Saúde nem de qualquer mútua, não emite partes de baja de incapacidade temporária e não intervém na decisão sobre prestações.",
    faqEyebrow: "FAQ",
    faqH2: "Perguntas frequentes",
    faqs: [
      {
        q: "Quem me pode passar a baixa por ansiedade em Espanha?",
        a: "O parte de baja é emitido pelo médico de cuidados primários do Serviço Público de Saúde quando o processo é contingencia común, ou pelo médico da mútua quando corresponde a contingencia profesional. Uma consulta privada pode avaliá-lo, tratá-lo e emitir uma justificação médica de ausência, mas não emite o parte de baja.",
      },
      {
        q: "O meu médico não me passa a baixa por ansiedade, o que posso fazer?",
        a: "Volte a consultar descrevendo o impacto funcional em termos concretos: que tarefas do seu posto deixou de conseguir fazer, quanto dorme, que erros cometeu, que sintomas físicos tem e com que frequência. Pode pedir nova avaliação. Uma segunda opinião privada não emite o parte, mas ajuda a documentar a evolução.",
      },
      {
        q: "A minha empresa pode saber que estou de baixa por ansiedade?",
        a: "A empresa conhece a existência da baixa e a sua duração estimada, não o diagnóstico. Os dados de saúde estão especialmente protegidos. Contá-lo é uma decisão sua, nunca uma obrigação.",
      },
      {
        q: "O que acontece se a inspeção médica me convocar durante a baixa?",
        a: "É um controlo normal do processo, não uma acusação. Compareça, leve relatórios e documentação clínica e descreva o seu estado e a sua evolução com concretização. A falta injustificada tem consequências na prestação.",
      },
      {
        q: "Pode-se viajar ou sair de casa durante a baixa?",
        a: "Estar de baixa não implica ficar em casa, e em muitos quadros de ansiedade a atividade faz parte do tratamento. O que não é adequado são atividades incompatíveis com a recuperação ou que contradigam a incapacidade. Antes de uma deslocação, sobretudo ao estrangeiro, consulte o seu médico e a Seguridad Social.",
      },
      {
        q: "Quanto dura uma baixa por ansiedade?",
        a: "Não há uma duração fixa: depende da gravidade, da resposta ao tratamento e do posto de trabalho. Os limites máximos e as prorrogações são fixados por lei e mudam, pelo que convém confirmá-los na Seguridad Social e não num artigo.",
      },
    ],
    disclaimerTitle: "Aviso Médico",
    disclaimer:
      "Escrito pela Dra. Mónica Fabiana Cornejo Román, psiquiatra consultora da Global Health Espanha, e revisto clinicamente pelo Dr. Eduardo Daniel Rodríguez Olivas, médico de clínica geral. Este artigo contém informação geral sobre a incapacidade temporária por ansiedade em Espanha. Não constitui aconselhamento médico personalizado, nem aconselhamento jurídico ou laboral. O reconhecimento e o controlo da incapacidade temporária competem ao Serviço Público de Saúde, à mútua e à Seguridad Social. Se tem ideias de se magoar, ligue 024. Perante uma emergência médica, ligue 112.",
  } satisfies Article,
};

const cs: LocalePost = {
  locale: "CS",
  slug: "pracovni-neschopnost-uzkost-spanelsko",
  title: "Pracovní neschopnost pro úzkost ve Španělsku: kdo ji vystavuje a co se posuzuje",
  excerpt:
    "Neschopnost pro úzkost je dočasná pracovní neschopnost a parte de baja vystavuje lékař veřejného systému nebo mutuy, ne soukromá konzultace. Co lékař posuzuje, co se dozví zaměstnavatel, co je lékařská inspekce a co zvládne online konzultace.",
  seoTitle: "Neschopnost pro úzkost ve Španělsku: kdo ji vystaví",
  seoDescription:
    "Pracovní neschopnost pro úzkost ve Španělsku: kdo vystavuje parte de baja, co lékař posuzuje, co se dozví zaměstnavatel a co je lékařská inspekce.",
  category: "Duševní zdraví",
  article: {
    lang: "cs-CZ",
    tagline: "Medicína kdykoli a kdekoli",
    categoryLabel: "Duševní zdraví",
    categoryHref: href("cs", "/blog"),
    eyebrow: "Španělsko · Průvodce pro zaměstnance",
    h1: "Pracovní neschopnost pro úzkost",
    deck: "Není to rozmar a nedostanete ji tím, že o ni požádáte. Je to klinické rozhodnutí o tom, zda jste právě teď schopni pracovat.",
    intro:
      "<strong>Pracovní neschopnost pro úzkost</strong> je <strong>dočasná pracovní neschopnost</strong> jako každá jiná: lékař potvrdí, že vám zdravotní problém brání pracovat po určitou dobu. Ve Španělsku <strong>parte de baja vystavuje lékař Veřejné zdravotní služby</strong>, nebo lékař mutuy, pokud případ spadá pod ni. Soukromá konzultace — i ta naše — <strong>parte de baja nevystavuje</strong>: může vás vyšetřit, léčit, vystavit lékařské potvrzení nepřítomnosti a doplnit informace do procesu, což není totéž. O neschopnosti nerozhoduje slovo „úzkost“, ale míra funkčního postižení, kterou lékař vidí.",
    facts: ["Vystavuje veřejná služba nebo mutua", "Zaměstnavatel diagnózu nedostane", "Posuzuje se funkce"],
    primaryCta: { label: "Konzultace duševního zdraví", href: href("cs", "/services/justificante-medico-online") },
    secondaryCta: { label: "Dočasná neschopnost — Seguridad Social", href: SEG_SOCIAL },
    panelChip: "Co v článku najdete",
    panelParas: [
      "Kdo smí vystavit parte de baja a proč soukromá cesta touto cestou není.",
      "Co lékař skutečně posuzuje, když někdo přijde s úzkostí, a jak přijít připraven.",
      "Jakou informaci dostane zaměstnavatel, co je lékařská inspekce a na co se smí ptát.",
      "Maximální délka, čekací dny, procento z vyměřovacího základu i požadované odpracované dny jsou dány zákonem a mění se. Čísla zde nejsou: každý bod odkazuje na Seguridad Social.",
    ],
    author: {
      initials: "MC",
      name: "Dra. Mónica Fabiana Cornejo Román",
      line: "Konzultantka psychiatrie · Global Health Španělsko",
    },
    reviewLine: "Klinicky zkontroloval Dr. Eduardo Daniel Rodríguez Olivas, praktický lékař, Global Health Španělsko.",
    navLabel: "Obsah článku",
    sections: [
      {
        id: "que-es",
        nav: "Co to je",
        eyebrow: "Východisko",
        h2: "Co přesně je neschopnost pro úzkost",
        blocks: [
          lead("Žádná zvláštní kategorie „neschopnost pro úzkost“ neexistuje. Existuje dočasná pracovní neschopnost, jejíž příčinou je úzkostná porucha."),
          p("To není slovíčkaření. Znamená to, že kritérium je stejné jako u bolesti zad nebo zápalu plic: <strong>brání vám tento zdravotní problém právě teď dělat vaši práci?</strong> Neposuzuje se, kolik abstraktně trpíte, ani zda je vaše nepohoda oprávněná, ani jak se k vám chová zaměstnavatel. Posuzuje se funkce."),
          p("Proto dva lidé se stejnou diagnózou mohou dostat různou odpověď. Ojedinělá epizoda u někoho, kdo dál spí a zvládá své úkoly, není totéž co trvalá nespavost, neschopnost soustředění a zřetelný pokles výkonu."),
          ul([
            "<strong>Příznaky</strong> — anticipační úzkost, ataky, nespavost, tělesné příznaky, podrážděnost, vyhýbavé chování.",
            "<strong>Funkce</strong> — soustředění, pracovní paměť, snášení zátěže, schopnost řídit nebo obsluhovat stroje, jednání s lidmi.",
            "<strong>Riziko</strong> — myšlenky na sebepoškození, užívání alkoholu či jiných látek, bezpečnost vlastní i cizí na pracovišti.",
            "<strong>Kontext</strong> — co přesně děláte v práci, protože tentýž stav u jedné pozice neschopnost zakládá a u jiné ne.",
            "<strong>Vývoj</strong> — odkdy, co jste zkoušeli, co se zhoršilo nebo zlepšilo.",
          ]),
          warn("Úzkost neznamená „není to skutečné“", "Tělesné příznaky úzkosti — bušení srdce, tlak na hrudi, dušnost, závratě, zažívací potíže — jsou skutečné, ne vymyšlené. A naopak: právě proto, že se podobají jiným nemocem, si nový stav zaslouží vyšetření, ne odbytí slovem nervy."),
        ],
      },
      {
        id: "quien-la-emite",
        nav: "Kdo ji vystaví",
        eyebrow: "Okruh",
        h2: "Kdo vystavuje parte de baja a proč na tom záleží",
        blocks: [
          lead("Tahle otázka bere nejvíc času, protože odpověď závisí na tom, o jaký typ případu jde."),
          p("Pokud jde o <strong>contingencia común</strong>, parte de baja vystavuje váš <strong>lékař primární péče Veřejné zdravotní služby</strong>. Pokud jde o <strong>contingencia profesional</strong> — pracovní úraz nebo nemoc z povolání —, přísluší to <strong>mutue</strong>. V obou případech následují pravidelná potvrzení a nakonec ukončení, a v obou případech proces nevede soukromá konzultace."),
          ul([
            "<strong>Parte de baja</strong> je dokument veřejného systému nebo mutuy, ne soukromé potvrzení.",
            "<strong>Peněžitá dávka</strong> závisí na Seguridad Social a jejích podmínkách, ne na lékaři, který vás ošetřil.",
            "<strong>INSS</strong> i mutua vás mohou v průběhu předvolat ke kontrole.",
            "Pokud nesouhlasíte s ukončením neschopnosti, existují cesty odvolání: Seguridad Social uvádí které a v jakých lhůtách.",
          ]),
          p("Stojí za to říct jasně něco, na co se v práci často zapomíná: <strong>žádost o neschopnost není obviněním zaměstnavatele</strong> a nevyžaduje jeho souhlas. Je to klinické rozhodnutí."),
          cite(`Podmínky, lhůty a odvolání: <a href="${SEG_SOCIAL}" rel="nofollow noopener" target="_blank">Seguridad Social</a>.`),
        ],
      },
      {
        id: "consulta",
        nav: "Při konzultaci",
        eyebrow: "Příprava",
        h2: "Co se děje při konzultaci a jak přijít připraven",
        blocks: [
          lead("Nejčastější stížnost — „lékař mi neschopnost nedá“ — se skoro nikdy nevyřeší naléháním a skoro vždy lepším vysvětlením."),
          p("Lékař má pár minut a to, co mu řeknete. Popíšete-li svůj stav obecně — „je mi hrozně“, „už nemůžu“ —, žádáte ho, aby si funkční dopad domyslel. Popíšete-li ho konkrétně, dáváte mu přesně ten materiál, na jehož základě se o dočasné neschopnosti rozhoduje."),
          ul([
            "<strong>Co jste přestali zvládat</strong>: konkrétní úkoly vaší práce, které jste dřív dělali a teď ne.",
            "<strong>Spánek</strong>: kolik nocí, kolik hodin, zda se budíte nad ránem.",
            "<strong>Chyby a opomenutí</strong> v práci a zda došlo k rizikové situaci.",
            "<strong>Tělesné příznaky</strong> a jejich četnost: ataky, bušení srdce, závratě, zažívací potíže.",
            "<strong>Riziko</strong>: pokud jste měli myšlenky ublížit si, řekněte to. Je to informace, která nejvíc mění postup, a zároveň ta nejčastěji zamlčená.",
          ]),
          p("Pokud posouzení neodpovídá vaší situaci, máte právo požádat o nové a vysvětlit, co chybělo. Soukromý <strong>druhý názor</strong> parte de baja nevystaví, ale pomůže uspořádat klinická fakta a doložit vývoj."),
        ],
      },
      {
        id: "empresa-inspeccion",
        nav: "Zaměstnavatel a inspekce",
        eyebrow: "Vaše práva",
        h2: "Co ví zaměstnavatel a co je lékařská inspekce",
        blocks: [
          lead("Zmatek je tu velký a vyvolává zbytečný strach u lidí, kterým už tak není dobře."),
          p("Váš zaměstnavatel <strong>vaši diagnózu nedostane</strong>. Sděluje se existence neschopnosti a její předpokládaná délka. Zdravotní údaje jsou zvlášť chráněnou kategorií a ani personální oddělení, ani nadřízený nemají právo na to, aby jim někdo řekl, co vám je. Můžete to říct sami, ale je to vaše rozhodnutí, ne povinnost."),
          p("<strong>Lékařská inspekce</strong> — předvolání od INSS nebo mutuy — také není trest ani obvinění. Je to kontrola procesu a běžná součást fungování dočasné neschopnosti. Předvolají vás, posoudí, a to posouzení může neschopnost potvrdit, nebo navrhnout ukončení."),
          ul([
            "K předvolání se dostavte: neomluvená neúčast má dopad na dávku.",
            "Vezměte zprávy, recepty a jakoukoli klinickou dokumentaci k případu.",
            "Odpovídejte na dotazy ke svému stavu a vývoji stejně konkrétně jako při konzultaci.",
            "Nemusíte dokazovat, že trpíte. Máte popsat, jak jste na tom a co zvládáte a nezvládáte.",
          ]),
          warn("K cestování a vycházení během neschopnosti", "Neschopnost není domácí vězení a u řady úzkostných stavů je procházka součástí léčby. Nevhodné jsou činnosti neslučitelné s úzdravou nebo odporující tvrzené neschopnosti. Chystáte-li se cestovat, zvlášť do zahraničí, poraďte se předem s lékařem a se Seguridad Social: chybný postup se dotkne dávky, nejen zdraví."),
          cite(`Ochrana zdravotních údajů: <a href="${AEPD}" rel="nofollow noopener" target="_blank">AEPD</a>. Kontrola dočasné neschopnosti: <a href="${SEG_SOCIAL}" rel="nofollow noopener" target="_blank">Seguridad Social</a>.`),
        ],
      },
      {
        id: "privada",
        nav: "Soukromá konzultace",
        eyebrow: "Transparentnost",
        h2: "Co soukromá online konzultace zvládne a co ne",
        blocks: [
          lead("Říkáme to hned a bez okolků, protože s touhle otázkou přichází většina lidí."),
          p("Soukromá konzultace, prezenční i videem, <strong>nevystavuje parte de baja</strong>. Ten dokument patří okruhu Veřejné zdravotní služby nebo mutuy. Každá služba, která vám „neschopnost“ slibuje po internetu, slibuje něco, co nemá ve své moci, a je namístě té nabídce nedůvěřovat dřív, než ji zaplatíte."),
          p("Co soukromá konzultace udělat může, bývá často přesně to, co člověk potřebuje týž týden:"),
          ul([
            "<strong>Vyšetřit vás bez čekací doby</strong> a otevřeně vám říct, co vidí.",
            "<strong>Vystavit lékařské potvrzení</strong> nepřítomnosti, které není parte de baja — a takto vám to řekneme.",
            "<strong>Zahájit léčbu</strong>, když je indikovaná, a vysvětlit, co čekat a v jakém čase.",
            "<strong>Vyloučit jiné příčiny</strong> příznaků, které úzkost připomínají a nejsou jí.",
            "<strong>Uspořádat případ</strong> pro vašeho lékaře primární péče: co říct, co doložit, o co požádat.",
            "<strong>Doprovodit návrat do práce</strong>, což je fáze, kterou skoro nikdo nepřipravuje.",
          ]),
          p(`Registraci kteréhokoli lékaře si ověříte ve <a href="${CGCOM_REGISTRO}" rel="nofollow noopener" target="_blank">veřejném registru CGCOM</a>, u nás stejně jako kdekoli jinde.`),
          warn("Žádná konzultace neschopnost nezaručuje", "Lékař, který slíbí výsledek dřív, než vás vyšetří, medicínu nedělá. Rozhodnutí závisí na tom, co ukáže klinické posouzení, a u dočasné neschopnosti navíc na okruhu, kterého se soukromá medicína neúčastní."),
        ],
      },
      {
        id: "tratamiento",
        nav: "Léčba",
        eyebrow: "Během neschopnosti",
        h2: "Co se během neschopnosti dělá a jak vypadá návrat",
        blocks: [
          lead("Neschopnost pro úzkost bez léčby bývá neschopností, která se opakuje."),
          p("Samotný čas úzkostnou poruchu vyřeší jen zřídka. Řeší ji kombinace, která se určuje případ od případu: <strong>psychoterapie</strong>, <strong>medikace</strong>, je-li indikovaná, práce se <strong>spánkem</strong>, pohyb, omezení alkoholu a — pokud je příčina tam — změny pracovních podmínek."),
          p("Návrat si zaslouží stejnou přípravu jako odchod. Nastoupit v pondělí na stejné místo se stejnou zátěží a beze změny je obvyklý recept na recidivu. Návrat proberte s lékařem předem, a pokud zaměstnavatel má <strong>pracovnělékařskou službu</strong>, i s ní: úprava pracovního místa je formální cesta a existuje právě pro tohle."),
          ul([
            "Udržujte stabilní dobu spánku, i když nepracujete.",
            "Nevysazujte léčbu hned, jak se zlepší: počáteční zlepšení není konec procesu.",
          ]),
        ],
      },
      {
        id: "urgencia",
        nav: "Kdy nečekat",
        eyebrow: "Bezpečnost",
        h2: "Kdy přestává jít o papíry",
        blocks: [
          lead("Jsou situace, ve kterých je neschopnost to poslední a péče je okamžitá."),
          ul([
            "Myšlenky ukončit život, plán, nebo pocit, že nedokážete zaručit vlastní bezpečí.",
            "Neschopnost postarat se o sebe nebo o osoby ve vaší péči.",
            "Užívání alkoholu či jiných látek proto, abyste fungovali nebo usnuli.",
            "Silná bolest na hrudi, dušnost v klidu nebo mdloba — což může úzkost připomínat a nebýt jí.",
          ]),
          p("Ve Španělsku funguje linka <strong>024</strong> pro suicidální chování, dostupná nepřetržitě a zdarma. Při lékařské pohotovosti volejte <strong>112</strong>. Požádat v takové chvíli o pomoc není pracovní formalita: je to jediné, na čem záleží."),
          cite(`Informace o lince 024 a duševním zdraví: <a href="${SANIDAD}" rel="nofollow noopener" target="_blank">Ministerio de Sanidad</a>.`),
        ],
      },
    ],
    linksEyebrow: "Global Health Španělsko",
    linksH2: "Kam dál",
    linksLead:
      "Naši lékaři ve Španělsku vyšetřují přes video, bez čekací doby, a jasně vám řeknou, co lze vyřešit dnes a co patří vašemu lékaři primární péče nebo mutue.",
    links: [
      { label: "Lékařská konzultace a lékařské potvrzení", href: href("cs", "/services/justificante-medico-online") },
      { label: "Naši lékaři ve Španělsku", href: href("cs", "/doctors") },
      { label: "Kontaktovat Global Health Španělsko", href: href("cs", "/contact") },
    ],
    ctaBox: {
      h3: "Nevíte, kde začít?",
      text: "Krátká konzultace posoudí, jak na tom jste, zahájí léčbu, je-li indikovaná, a uspořádá to, co potřebujete vzít svému lékaři primární péče. Vždy vám řekneme, jaký dokument vystavujeme a jaký ne.",
      primary: { label: "Objednat konzultaci", href: href("cs", "/services/justificante-medico-online") },
      secondary: { label: "Zobrazit naše lékaře", href: href("cs", "/doctors") },
    },
    sourcesEyebrow: "Oficiální zdroje",
    sourcesH2: "Kde si pravidla ověříte",
    sourcesLead: "Délka, výše dávky, podmínky i lhůty pro odvolání jsou dány zákonem a mění se. Ověřujte vždy u zdroje.",
    sources: [
      { label: "Seguridad Social", href: SEG_SOCIAL },
      { label: "Ministerio de Sanidad", href: SANIDAD },
      { label: "Registr lékařů — CGCOM", href: CGCOM_REGISTRO },
      { label: "Španělský úřad pro ochranu osobních údajů", href: AEPD },
    ],
    sourcesNote:
      "Odkazy vedou na weby příslušných institucí. Global Health není součástí Veřejné zdravotní služby ani žádné mutuy, nevystavuje parte de baja a do rozhodování o dávkách nezasahuje.",
    faqEyebrow: "FAQ",
    faqH2: "Časté dotazy",
    faqs: [
      {
        q: "Kdo mi ve Španělsku může dát neschopnost pro úzkost?",
        a: "Parte de baja vystavuje lékař primární péče Veřejné zdravotní služby, jde-li o contingencia común, nebo lékař mutuy, jde-li o contingencia profesional. Soukromá konzultace vás může vyšetřit, léčit a vystavit lékařské potvrzení nepřítomnosti, ale parte de baja nevystaví.",
      },
      {
        q: "Lékař mi neschopnost pro úzkost nedává, co mám dělat?",
        a: "Přijďte znovu a popište funkční dopad konkrétně: které úkoly své práce už nezvládáte, kolik spíte, jaké chyby jste udělali, jaké tělesné příznaky máte a jak často. Můžete požádat o nové posouzení. Soukromý druhý názor parte nevystaví, ale pomůže doložit vývoj.",
      },
      {
        q: "Může se zaměstnavatel dozvědět, že mám neschopnost pro úzkost?",
        a: "Zaměstnavatel zná existenci neschopnosti a její předpokládanou délku, ne diagnózu. Zdravotní údaje jsou zvlášť chráněné. Říct to je vaše rozhodnutí, nikdy povinnost.",
      },
      {
        q: "Co když mě během neschopnosti předvolá lékařská inspekce?",
        a: "Je to běžná kontrola procesu, ne obvinění. Dostavte se, vezměte zprávy a klinickou dokumentaci a popište svůj stav i vývoj konkrétně. Neomluvená neúčast má dopad na dávku.",
      },
      {
        q: "Smí se během neschopnosti cestovat nebo chodit ven?",
        a: "Neschopnost neznamená zůstat doma a u mnoha úzkostných stavů je pohyb součástí léčby. Nevhodné jsou činnosti neslučitelné s úzdravou nebo odporující neschopnosti. Před cestou, zvlášť do zahraničí, se poraďte s lékařem a se Seguridad Social.",
      },
      {
        q: "Jak dlouho trvá neschopnost pro úzkost?",
        a: "Pevná délka neexistuje: záleží na závažnosti, odpovědi na léčbu a na pracovním místě. Maximální limity a prodloužení jsou dány zákonem a mění se, takže je ověřte u Seguridad Social, ne v článku.",
      },
    ],
    disclaimerTitle: "Lékařské upozornění",
    disclaimer:
      "Napsala Dra. Mónica Fabiana Cornejo Román, konzultantka psychiatrie Global Health Španělsko, klinicky zkontroloval Dr. Eduardo Daniel Rodríguez Olivas, praktický lékař. Článek obsahuje obecné informace o dočasné pracovní neschopnosti pro úzkost ve Španělsku. Nejde o personalizované lékařské, právní ani pracovněprávní poradenství. Uznání a kontrolu dočasné neschopnosti mají na starosti Veřejná zdravotní služba, mutua a Seguridad Social. Máte-li myšlenky ublížit si, volejte 024. Při lékařské pohotovosti volejte 112.",
  } satisfies Article,
};

const roPost: LocalePost = {
  locale: "RO",
  slug: "concediu-medical-anxietate-spania",
  title: "Concediu medical pentru anxietate în Spania: cine îl emite și ce se evaluează",
  excerpt:
    "Concediul pentru anxietate este o incapacitate temporară, iar parte de baja este emis de medicul din sistemul public sau de la mutua, nu de o consultație privată. Ce evaluează medicul, ce află angajatorul, ce este inspecția medicală și ce poate face o consultație online.",
  seoTitle: "Concediu medical pentru anxietate în Spania",
  seoDescription:
    "Concediu medical pentru anxietate în Spania: cine emite parte de baja, ce evaluează medicul, ce află angajatorul și ce înseamnă inspecția medicală.",
  category: "Sănătate mintală",
  article: {
    lang: "ro-RO",
    tagline: "Îngrijire medicală oricând, oriunde",
    categoryLabel: "Sănătate mintală",
    categoryHref: href("ro", "/blog"),
    eyebrow: "Spania · Ghid pentru angajați",
    h1: "Concediu medical pentru anxietate",
    deck: "Nu este un moft și nu se acordă pentru că este cerut. Este o decizie clinică despre dacă sunteți, în acest moment, în stare să munciți.",
    intro:
      "<strong>Concediul medical pentru anxietate</strong> este o <strong>incapacitate temporară</strong> ca oricare alta: medicul certifică faptul că o problemă de sănătate vă împiedică să munciți o perioadă. În Spania, <strong>parte de baja este emis de medicul din Serviciul Public de Sănătate</strong> sau, când situația ține de mutua, de medicul acesteia. O consultație privată — inclusiv a noastră — <strong>nu emite parte de baja</strong>: vă poate evalua, trata, emite o justificare medicală a absenței și documenta cazul, ceea ce nu este același lucru. Ce decide concediul nu este cuvântul „anxietate”, ci gradul de afectare funcțională pe care medicul îl constată.",
    facts: ["Emis de serviciul public sau de mutua", "Angajatorul nu primește diagnosticul", "Se evaluează funcția"],
    primaryCta: { label: "Consultație de sănătate mintală", href: href("ro", "/services/justificante-medico-online") },
    secondaryCta: { label: "Incapacitate temporară — Seguridad Social", href: SEG_SOCIAL },
    panelChip: "Ce acoperă acest ghid",
    panelParas: [
      "Cine poate emite parte de baja și de ce calea privată nu este acea cale.",
      "Ce evaluează de fapt medicul când cineva se prezintă cu anxietate și cum ajungeți pregătit.",
      "Ce informație primește angajatorul, ce este inspecția medicală și ce vă poate întreba.",
      "Durata maximă, zilele de așteptare, procentul din baza de calcul și zilele de contribuție cerute sunt materie de lege și se modifică. Aici nu apar cifre: fiecare punct trimite la Seguridad Social.",
    ],
    author: {
      initials: "MC",
      name: "Dra. Mónica Fabiana Cornejo Román",
      line: "Medic psihiatru consultant · Global Health Spania",
    },
    reviewLine: "Revizuit clinic de Dr. Eduardo Daniel Rodríguez Olivas, medic generalist, Global Health Spania.",
    navLabel: "În acest articol",
    sections: [
      {
        id: "que-es",
        nav: "Ce este",
        eyebrow: "Punct de plecare",
        h2: "Ce este, mai exact, un concediu pentru anxietate",
        blocks: [
          lead("Nu există un „concediu pentru anxietate” ca o categorie separată. Există o incapacitate temporară a cărei cauză este o tulburare de anxietate."),
          p("Distincția nu este un tehnicism. Înseamnă că criteriul este același ca la o lombalgie sau la o pneumonie: <strong>vă împiedică această problemă de sănătate să vă faceți munca chiar acum?</strong> Nu se evaluează cât suferiți în abstract, nici dacă disconfortul este justificat, nici dacă angajatorul se poartă bine cu dumneavoastră. Se evaluează funcția."),
          p("De aceea două persoane cu același diagnostic pot primi răspunsuri diferite. O criză izolată la cineva care continuă să doarmă și să-și facă sarcinile nu este același lucru cu insomnia persistentă, incapacitatea de concentrare și scăderea clară a randamentului."),
          ul([
            "<strong>Simptome</strong> — anxietate anticipatorie, crize, insomnie, simptome fizice, iritabilitate, evitare.",
            "<strong>Funcție</strong> — concentrare, memorie de lucru, toleranță la stres, capacitatea de a conduce sau de a opera utilaje, relația cu publicul.",
            "<strong>Risc</strong> — idei de autovătămare, consum de alcool sau alte substanțe, siguranța proprie și a celorlalți la locul de muncă.",
            "<strong>Context</strong> — ce faceți exact la muncă, pentru că același tablou incapacitează pentru un post și nu pentru altul.",
            "<strong>Evoluție</strong> — de când, ce ați încercat, ce s-a agravat sau s-a ameliorat.",
          ]),
          warn("Anxietate nu înseamnă „nu este real”", "Simptomele fizice ale anxietății — palpitații, apăsare în piept, lipsă de aer, amețeli, tulburări digestive — sunt reale, nu imaginate. Și invers: tocmai pentru că seamănă cu ale altor boli, un tablou nou merită evaluat, nu pus pe seama nervilor."),
        ],
      },
      {
        id: "quien-la-emite",
        nav: "Cine îl emite",
        eyebrow: "Circuitul",
        h2: "Cine emite parte de baja și de ce contează",
        blocks: [
          lead("Aceasta este întrebarea care face să se piardă cel mai mult timp, pentru că răspunsul depinde de tipul situației."),
          p("Dacă situația este <strong>contingencia común</strong>, parte de baja este emis de <strong>medicul de asistență primară din Serviciul Public de Sănătate</strong>. Dacă este <strong>contingencia profesional</strong> — accident de muncă sau boală profesională —, revine <strong>mutuei</strong>. În ambele cazuri există confirmări periodice și un document de încheiere, iar în ambele urmărirea nu este făcută de o consultație privată."),
          ul([
            "<strong>Parte de baja</strong> este un document al sistemului public sau al mutuei, nu un certificat privat.",
            "<strong>Indemnizația</strong> depinde de Seguridad Social și de condițiile ei, nu de medicul care vă consultă.",
            "<strong>INSS</strong> și mutua vă pot chema la reevaluare pe parcurs.",
            "Dacă nu sunteți de acord cu încheierea concediului, există căi de contestație: Seguridad Social arată care și în ce termene.",
          ]),
          p("Merită spus clar ceva ce la muncă se uită des: <strong>a cere concediu medical nu este o acuzație la adresa angajatorului</strong> și nici nu cere acordul acestuia. Este o decizie clinică."),
          cite(`Condiții, termene și contestații: <a href="${SEG_SOCIAL}" rel="nofollow noopener" target="_blank">Seguridad Social</a>.`),
        ],
      },
      {
        id: "consulta",
        nav: "La consultație",
        eyebrow: "Pregătire",
        h2: "Ce se întâmplă la consultație și cum ajungeți pregătit",
        blocks: [
          lead("Cea mai repetată nemulțumire — „medicul nu îmi dă concediu” — aproape niciodată nu se rezolvă insistând și aproape întotdeauna se rezolvă explicând mai bine."),
          p("Medicul are câteva minute și ce îi spuneți. Dacă vă descrieți starea în termeni generali — „sunt distrus”, „nu mai pot” —, îi cereți să ghicească impactul funcional. Dacă o descrieți concret, îi dați exact materialul pe baza căruia se decide o incapacitate temporară."),
          ul([
            "<strong>Ce nu mai reușiți să faceți</strong>: sarcini concrete ale postului pe care înainte le făceați și acum nu.",
            "<strong>Somn</strong>: câte nopți, câte ore, dacă vă treziți spre dimineață.",
            "<strong>Greșeli și scăpări</strong> la muncă și dacă a existat vreo situație de risc.",
            "<strong>Simptome fizice</strong> și frecvența lor: crize, palpitații, amețeli, tulburări digestive.",
            "<strong>Risc</strong>: dacă ați avut gânduri de a vă face rău, spuneți-o. Este informația care schimbă cel mai mult conduita clinică și cea care se tace cel mai des.",
          ]),
          p("Dacă evaluarea nu reflectă situația dumneavoastră, aveți dreptul să cereți una nouă și să explicați ce a lipsit. O <strong>a doua opinie</strong> privată nu emite parte de baja, dar ajută la ordonarea faptelor clinice și la documentarea evoluției."),
        ],
      },
      {
        id: "empresa-inspeccion",
        nav: "Angajator și inspecție",
        eyebrow: "Drepturile dumneavoastră",
        h2: "Ce știe angajatorul și ce este inspecția medicală",
        blocks: [
          lead("Confuzia este mare aici și produce teamă inutilă unor oameni cărora deja le este suficient de rău."),
          p("Angajatorul <strong>nu primește diagnosticul</strong>. Se comunică existența concediului și durata estimată. Datele de sănătate sunt o categorie special protejată, iar nici departamentul de personal, nici șeful nu au dreptul să li se spună ce aveți. Puteți spune dumneavoastră, dacă vreți, dar este decizia dumneavoastră, nu o obligație."),
          p("<strong>Inspecția medicală</strong> — o convocare de la INSS sau de la mutua — nu este nici ea o pedeapsă sau o acuzație. Este un control al procesului și face parte din funcționarea normală a incapacității temporare. Sunteți convocat, evaluat, iar evaluarea poate confirma concediul sau poate propune încheierea lui."),
          ul([
            "Prezentați-vă la convocare: neprezentarea nejustificată are consecințe asupra indemnizației.",
            "Luați rapoarte, rețete și orice documentație clinică a cazului.",
            "Răspundeți la ce vi se cere despre starea și evoluția dumneavoastră, cu aceeași concretețe ca la consultație.",
            "Nu trebuie să demonstrați că suferiți. Trebuie să descrieți cum sunteți și ce puteți și ce nu puteți face.",
          ]),
          warn("Despre călătorii sau ieșiri în timpul concediului", "Concediul medical nu înseamnă arest la domiciliu, iar în multe tablouri de anxietate plimbarea face parte din tratament. Nepotrivite sunt activitățile incompatibile cu recuperarea sau care contrazic incapacitatea invocată. Dacă urmează să vă deplasați, mai ales în străinătate, întrebați înainte medicul și Seguridad Social: consecințele unei greșeli ating indemnizația, nu doar sănătatea."),
          cite(`Protecția datelor de sănătate: <a href="${AEPD}" rel="nofollow noopener" target="_blank">AEPD</a>. Controlul incapacității temporare: <a href="${SEG_SOCIAL}" rel="nofollow noopener" target="_blank">Seguridad Social</a>.`),
        ],
      },
      {
        id: "privada",
        nav: "Consultația privată",
        eyebrow: "Transparență",
        h2: "Ce poate și ce nu poate face o consultație privată online",
        blocks: [
          lead("O spunem prima și fără ocolișuri, pentru că este întrebarea cu care vine majoritatea oamenilor."),
          p("O consultație privată, față în față sau video, <strong>nu emite parte de baja pentru incapacitate temporară</strong>. Acel document aparține circuitului Serviciului Public de Sănătate sau al mutuei. Orice serviciu care vă promite „concediul” pe internet promite ceva ce nu îi stă în putere, iar acea promisiune merită privită cu neîncredere înainte de a o plăti."),
          p("Ce poate face o consultație privată este, adesea, exact ce îi trebuie omului în aceeași săptămână:"),
          ul([
            "<strong>Să vă evalueze fără listă de așteptare</strong> și să vă spună sincer ce vede.",
            "<strong>Să emită o justificare medicală</strong> a absenței — care nu este parte de baja, și v-o vom spune.",
            "<strong>Să înceapă tratamentul</strong> când este indicat și să explice la ce să vă așteptați și în cât timp.",
            "<strong>Să excludă alte cauze</strong> ale unor simptome care seamănă cu anxietatea fără să fie.",
            "<strong>Să ordoneze cazul</strong> pentru medicul dumneavoastră de familie: ce să spuneți, ce să documentați, ce să cereți.",
            "<strong>Să însoțească revenirea la muncă</strong>, faza pe care aproape nimeni nu o pregătește.",
          ]),
          p(`Puteți verifica înscrierea oricărui medic în <a href="${CGCOM_REGISTRO}" rel="nofollow noopener" target="_blank">registrul public CGCOM</a>, la noi ca la oricare altul.`),
          warn("Nicio consultație nu garantează un concediu", "Un medic care garantează rezultatul înainte de a vă evalua nu practică medicina. Decizia depinde de ce arată evaluarea clinică, iar în cazul incapacității temporare depinde în plus de un circuit la care medicina privată nu participă."),
        ],
      },
      {
        id: "tratamiento",
        nav: "Tratament",
        eyebrow: "În timpul concediului",
        h2: "Ce se face în timpul concediului și cum arată revenirea",
        blocks: [
          lead("Un concediu pentru anxietate fără tratament este de obicei un concediu care se repetă."),
          p("Timpul, singur, rareori rezolvă o tulburare de anxietate. Ce o rezolvă se decide de la caz la caz: <strong>psihoterapie</strong>, <strong>medicație</strong> când este indicată, intervenție asupra <strong>somnului</strong>, activitate fizică, reducerea alcoolului și — când acolo este cauza — schimbări ale condițiilor de muncă."),
          p("Revenirea merită pregătită la fel de serios ca plecarea. Să reveniți luni pe același post, cu aceeași încărcătură și fără să se fi schimbat nimic este rețeta obișnuită a recăderii. Discutați revenirea din timp cu medicul și, dacă angajatorul are <strong>medicina muncii</strong>, cu serviciul de prevenție: adaptarea postului este o cale formală și există exact pentru asta."),
          ul([
            "Păstrați ore de somn stabile, chiar dacă nu munciți.",
            "Nu abandonați tratamentul imediat ce vă simțiți mai bine: ameliorarea inițială nu este finalul procesului.",
          ]),
        ],
      },
      {
        id: "urgencia",
        nav: "Când nu așteptați",
        eyebrow: "Siguranță",
        h2: "Când nu mai este o chestiune de acte",
        blocks: [
          lead("Există situații în care concediul contează cel mai puțin, iar îngrijirea este imediată."),
          ul([
            "Gânduri de a vă lua viața, un plan sau senzația că nu vă puteți garanta propria siguranță.",
            "Imposibilitatea de a avea grijă de dumneavoastră sau de persoanele aflate în îngrijirea dumneavoastră.",
            "Consum de alcool sau de alte substanțe pentru a putea funcționa sau pentru a dormi.",
            "Durere puternică în piept, lipsă de aer în repaus sau leșin — care pot semăna cu anxietatea fără să fie.",
          ]),
          p("În Spania există <strong>linia 024</strong> pentru comportamentul suicidar, disponibilă non-stop și gratuită. În caz de urgență medicală, sunați la <strong>112</strong>. A cere ajutor în acel moment nu este o formalitate de serviciu: este singurul lucru care contează."),
          cite(`Informații despre linia 024 și sănătatea mintală: <a href="${SANIDAD}" rel="nofollow noopener" target="_blank">Ministerio de Sanidad</a>.`),
        ],
      },
    ],
    linksEyebrow: "Global Health Spania",
    linksH2: "Pașii următori",
    linksLead:
      "Medicii noștri din Spania evaluează prin video, fără listă de așteptare, și vă spun clar ce se poate rezolva azi și ce ține de medicul de familie sau de mutua.",
    links: [
      { label: "Consultație medicală și justificare medicală", href: href("ro", "/services/justificante-medico-online") },
      { label: "Medicii noștri din Spania", href: href("ro", "/doctors") },
      { label: "Contactați Global Health Spania", href: href("ro", "/contact") },
    ],
    ctaBox: {
      h3: "Nu știți de unde să începeți?",
      text: "O consultație scurtă evaluează cum sunteți, începe tratamentul dacă este indicat și ordonează ce trebuie să duceți medicului de familie. Vă vom spune întotdeauna ce document emitem și care nu.",
      primary: { label: "Programați o consultație", href: href("ro", "/services/justificante-medico-online") },
      secondary: { label: "Vedeți medicii noștri", href: href("ro", "/doctors") },
    },
    sourcesEyebrow: "Surse oficiale",
    sourcesH2: "Unde verificați regulile",
    sourcesLead: "Durata, indemnizația, condițiile și termenele de contestație sunt materie de lege și se modifică. Verificați întotdeauna la sursă.",
    sources: [
      { label: "Seguridad Social", href: SEG_SOCIAL },
      { label: "Ministerio de Sanidad", href: SANIDAD },
      { label: "Registrul medicilor — CGCOM", href: CGCOM_REGISTRO },
      { label: "Agenția Spaniolă de Protecție a Datelor", href: AEPD },
    ],
    sourcesNote:
      "Linkurile deschid site-urile instituțiilor competente. Global Health nu face parte din Serviciul Public de Sănătate și nici din vreo mutua, nu emite parte de baja și nu intervine în deciziile privind indemnizațiile.",
    faqEyebrow: "Întrebări frecvente",
    faqH2: "Întrebări frecvente",
    faqs: [
      {
        q: "Cine îmi poate da concediu pentru anxietate în Spania?",
        a: "Parte de baja este emis de medicul de asistență primară din Serviciul Public de Sănătate când situația este contingencia común, sau de medicul mutuei când este contingencia profesional. O consultație privată vă poate evalua, trata și emite o justificare medicală a absenței, dar nu emite parte de baja.",
      },
      {
        q: "Medicul nu îmi dă concediu pentru anxietate, ce pot face?",
        a: "Reveniți la consultație descriind impactul funcțional concret: ce sarcini ale postului nu mai reușiți, cât dormiți, ce greșeli ați făcut, ce simptome fizice aveți și cât de des. Puteți cere o nouă evaluare. O a doua opinie privată nu emite documentul, dar ajută la documentarea evoluției.",
      },
      {
        q: "Poate afla angajatorul că am concediu pentru anxietate?",
        a: "Angajatorul cunoaște existența concediului și durata estimată, nu diagnosticul. Datele de sănătate sunt special protejate. Să spuneți este decizia dumneavoastră, niciodată o obligație.",
      },
      {
        q: "Ce se întâmplă dacă mă cheamă inspecția medicală?",
        a: "Este un control obișnuit al procesului, nu o acuzație. Prezentați-vă, luați rapoarte și documentație clinică și descrieți concret starea și evoluția. Neprezentarea nejustificată are consecințe asupra indemnizației.",
      },
      {
        q: "Se poate călători sau ieși din casă în timpul concediului?",
        a: "Concediul nu înseamnă să stați în casă, iar în multe tablouri de anxietate activitatea face parte din tratament. Nepotrivite sunt activitățile incompatibile cu recuperarea sau care contrazic incapacitatea. Înainte de o deplasare, mai ales în străinătate, consultați medicul și Seguridad Social.",
      },
      {
        q: "Cât durează un concediu pentru anxietate?",
        a: "Nu există o durată fixă: depinde de gravitate, de răspunsul la tratament și de postul de muncă. Limitele maxime și prelungirile sunt stabilite prin lege și se modifică, așa că verificați-le la Seguridad Social, nu într-un articol.",
      },
    ],
    disclaimerTitle: "Aviz medical",
    disclaimer:
      "Scris de Dra. Mónica Fabiana Cornejo Román, medic psihiatru consultant la Global Health Spania, și revizuit clinic de Dr. Eduardo Daniel Rodríguez Olivas, medic generalist. Articolul conține informații generale despre incapacitatea temporară pentru anxietate în Spania. Nu constituie sfat medical personalizat și nici consultanță juridică sau de dreptul muncii. Recunoașterea și controlul incapacității temporare revin Serviciului Public de Sănătate, mutuei și Seguridad Social. Dacă aveți gânduri de a vă face rău, sunați la 024. În caz de urgență medicală, sunați la 112.",
  } satisfies Article,
};

const de: LocalePost = {
  locale: "DE",
  slug: "krankschreibung-angst-spanien",
  title: "Krankschreibung wegen Angst in Spanien: wer sie ausstellt und was beurteilt wird",
  excerpt:
    "Die Krankschreibung wegen Angst ist eine vorübergehende Arbeitsunfähigkeit, und der parte de baja wird ärztlich im öffentlichen System oder bei der Mutua ausgestellt, nicht in einer Privatsprechstunde. Was beurteilt wird, was der Arbeitgeber erfährt und was die ärztliche Kontrolle ist.",
  seoTitle: "Krankschreibung wegen Angst in Spanien",
  seoDescription:
    "Krankschreibung wegen Angst in Spanien: wer den parte de baja ausstellt, was beurteilt wird und was der Arbeitgeber erfährt.",
  category: "Psychische Gesundheit",
  article: {
    lang: "de-DE",
    tagline: "Medizin jederzeit und überall",
    categoryLabel: "Psychische Gesundheit",
    categoryHref: href("de", "/blog"),
    eyebrow: "Spanien · Leitfaden für Beschäftigte",
    h1: "Krankschreibung wegen Angst",
    deck: "Weder Laune noch etwas, das man auf Wunsch bekommt. Es ist eine klinische Entscheidung darüber, ob Sie gerade jetzt arbeitsfähig sind.",
    intro:
      "Eine <strong>Krankschreibung wegen Angst</strong> ist eine <strong>vorübergehende Arbeitsunfähigkeit</strong> wie jede andere: ärztlich wird bescheinigt, dass ein Gesundheitsproblem Sie eine Zeit lang an der Arbeit hindert. In Spanien wird der <strong>parte de baja von einer Praxis des öffentlichen Gesundheitsdienstes</strong> ausgestellt oder, wenn der Fall zur Mutua gehört, von deren Ärztin. Eine Privatsprechstunde — auch unsere — <strong>stellt den parte de baja nicht aus</strong>: sie kann Sie beurteilen, behandeln, eine ärztliche Bescheinigung der Abwesenheit ausstellen und den Verlauf dokumentieren, was nicht dasselbe ist. Über die Krankschreibung entscheidet nicht das Wort „Angst“, sondern das Ausmaß der funktionellen Beeinträchtigung, das ärztlich festgestellt wird.",
    facts: ["Vom öffentlichen Dienst oder der Mutua", "Der Arbeitgeber erfährt die Diagnose nie", "Beurteilt wird die Funktion"],
    primaryCta: { label: "Sprechstunde psychische Gesundheit", href: href("de", "/services/justificante-medico-online") },
    secondaryCta: { label: "Vorübergehende Arbeitsunfähigkeit — Seguridad Social", href: SEG_SOCIAL },
    panelChip: "Was dieser Leitfaden abdeckt",
    panelParas: [
      "Wer den parte de baja ausstellen darf und warum der private Weg dieser Weg nicht ist.",
      "Was ärztlich tatsächlich beurteilt wird, wenn jemand wegen Angst kommt, und wie Sie vorbereitet erscheinen.",
      "Welche Information der Arbeitgeber erhält, was die ärztliche Kontrolle ist und was sie fragen darf.",
      "Höchstdauer, Wartetage, der Prozentsatz der Bemessungsgrundlage und die geforderten Beitragstage sind Rechtsfragen und ändern sich. Hier stehen keine Zahlen: jeder Punkt verweist auf die Seguridad Social.",
    ],
    author: {
      initials: "MC",
      name: "Dra. Mónica Fabiana Cornejo Román",
      line: "Fachärztin für Psychiatrie · Global Health Spanien",
    },
    reviewLine: "Fachlich geprüft von Dr. Eduardo Daniel Rodríguez Olivas, Allgemeinmediziner, Global Health Spanien.",
    navLabel: "In diesem Artikel",
    sections: [
      {
        id: "que-es",
        nav: "Was es ist",
        eyebrow: "Ausgangspunkt",
        h2: "Was eine Krankschreibung wegen Angst genau ist",
        blocks: [
          lead("Eine eigene Kategorie „Krankschreibung wegen Angst“ gibt es nicht. Es gibt eine vorübergehende Arbeitsunfähigkeit, deren Ursache eine Angststörung ist."),
          p("Diese Unterscheidung ist keine Spitzfindigkeit. Sie bedeutet, dass der Maßstab derselbe ist wie bei Rückenschmerz oder Lungenentzündung: <strong>hindert Sie dieses Gesundheitsproblem gerade jetzt an Ihrer Arbeit?</strong> Beurteilt wird nicht, wie sehr Sie im Abstrakten leiden, nicht ob Ihr Leiden berechtigt ist und nicht, ob Ihr Arbeitgeber gut mit Ihnen umgeht. Beurteilt wird Funktion."),
          p("Deshalb können zwei Menschen mit derselben Diagnose unterschiedliche Antworten erhalten. Eine einzelne Episode bei jemandem, der weiter schläft und seine Aufgaben erledigt, ist nicht dasselbe wie anhaltende Schlaflosigkeit, Konzentrationsunfähigkeit und ein deutlicher Leistungsabfall."),
          ul([
            "<strong>Symptome</strong> — Erwartungsangst, Panikattacken, Schlaflosigkeit, körperliche Symptome, Reizbarkeit, Vermeidung.",
            "<strong>Funktion</strong> — Konzentration, Arbeitsgedächtnis, Belastbarkeit, Fahren oder Bedienen von Maschinen, Umgang mit Publikum.",
            "<strong>Risiko</strong> — Gedanken an Selbstverletzung, Alkohol- oder Substanzkonsum, eigene Sicherheit und die anderer am Arbeitsplatz.",
            "<strong>Kontext</strong> — was Sie beruflich genau tun, denn dasselbe Bild macht für die eine Tätigkeit arbeitsunfähig und für die andere nicht.",
            "<strong>Verlauf</strong> — seit wann, was Sie versucht haben, was schlechter oder besser wurde.",
          ]),
          warn("Angst heißt nicht „nicht echt“", "Die körperlichen Symptome der Angst — Herzrasen, Brustenge, Atemnot, Schwindel, Magen-Darm-Beschwerden — sind echt, nicht eingebildet. Und umgekehrt: gerade weil sie denen anderer Erkrankungen ähneln, verdient ein neues Bild eine Abklärung statt der Erklärung „Nerven“."),
        ],
      },
      {
        id: "quien-la-emite",
        nav: "Wer ausstellt",
        eyebrow: "Der Weg",
        h2: "Wer den parte de baja ausstellt und warum das zählt",
        blocks: [
          lead("Diese Frage kostet die meiste Zeit, weil die Antwort davon abhängt, welcher Art der Fall ist."),
          p("Gilt der Fall als <strong>contingencia común</strong>, stellt Ihre <strong>Hausarztpraxis im öffentlichen Gesundheitsdienst</strong> den parte de baja aus. Gilt er als <strong>contingencia profesional</strong> — Arbeitsunfall oder Berufskrankheit —, ist die <strong>Mutua</strong> zuständig. In beiden Fällen folgen regelmäßige Bestätigungen und eine Gesundschreibung, und in beiden begleitet keine Privatsprechstunde den Verlauf."),
          ul([
            "Der <strong>parte de baja</strong> ist ein Dokument des öffentlichen Systems oder der Mutua, keine private Bescheinigung.",
            "Die <strong>Geldleistung</strong> hängt von der Seguridad Social und ihren Voraussetzungen ab, nicht von der behandelnden Praxis.",
            "<strong>INSS</strong> und Mutua können Sie im Verlauf zur Nachbegutachtung einbestellen.",
            "Sind Sie mit einer Gesundschreibung nicht einverstanden, gibt es Rechtsbehelfe: die Seguridad Social nennt welche und mit welchen Fristen.",
          ]),
          p("Eines sei klar gesagt, weil es im Arbeitsalltag oft vergessen wird: <strong>eine Krankschreibung zu erbitten ist kein Vorwurf gegen den Arbeitgeber</strong> und verlangt auch nicht dessen Einverständnis. Es ist eine klinische Entscheidung."),
          cite(`Voraussetzungen, Fristen und Rechtsbehelfe: <a href="${SEG_SOCIAL}" rel="nofollow noopener" target="_blank">Seguridad Social</a>.`),
        ],
      },
      {
        id: "consulta",
        nav: "In der Sprechstunde",
        eyebrow: "Vorbereitung",
        h2: "Was in der Sprechstunde geschieht und wie Sie vorbereitet kommen",
        blocks: [
          lead("Die häufigste Klage — „meine Praxis schreibt mich nicht krank“ — löst sich fast nie durch Beharren und fast immer durch besseres Erklären."),
          p("Ärztlich stehen wenige Minuten zur Verfügung und das, was Sie erzählen. Beschreiben Sie Ihren Zustand allgemein — „mir geht es furchtbar“, „ich kann nicht mehr“ —, verlangen Sie, die funktionellen Folgen zu erraten. Beschreiben Sie ihn konkret, liefern Sie genau das Material, auf dem über Arbeitsunfähigkeit entschieden wird."),
          ul([
            "<strong>Was Sie nicht mehr können</strong>: konkrete Aufgaben Ihrer Stelle, die Sie früher erledigt haben und jetzt nicht.",
            "<strong>Schlaf</strong>: wie viele Nächte, wie viele Stunden, ob Sie früh aufwachen.",
            "<strong>Fehler und Aussetzer</strong> bei der Arbeit und ob es eine gefährliche Situation gab.",
            "<strong>Körperliche Symptome</strong> und ihre Häufigkeit: Attacken, Herzrasen, Schwindel, Magen-Darm-Beschwerden.",
            "<strong>Risiko</strong>: wenn Sie Gedanken hatten, sich zu verletzen, sagen Sie es. Das ist die Angabe, die das Vorgehen am stärksten verändert, und die am häufigsten verschwiegen wird.",
          ]),
          p("Spiegelt die Beurteilung Ihre Lage nicht wider, dürfen Sie eine erneute verlangen und erklären, was gefehlt hat. Eine private <strong>Zweitmeinung</strong> stellt den parte de baja nicht aus, hilft aber, die klinischen Fakten zu ordnen und den Verlauf zu dokumentieren."),
        ],
      },
      {
        id: "empresa-inspeccion",
        nav: "Arbeitgeber und Kontrolle",
        eyebrow: "Ihre Rechte",
        h2: "Was der Arbeitgeber weiß und was die ärztliche Kontrolle ist",
        blocks: [
          lead("Die Verwirrung ist hier groß und macht Menschen Angst, denen es ohnehin schlecht genug geht."),
          p("Ihr Arbeitgeber <strong>erhält Ihre Diagnose nicht</strong>. Mitgeteilt werden das Bestehen der Krankschreibung und ihre voraussichtliche Dauer. Gesundheitsdaten sind besonders geschützt, und weder die Personalabteilung noch Vorgesetzte haben ein Recht darauf zu erfahren, was Ihnen fehlt. Sie dürfen es erzählen, aber das ist Ihre Entscheidung, keine Pflicht."),
          p("Die <strong>ärztliche Kontrolle</strong> — eine Vorladung durch INSS oder Mutua — ist ebenfalls weder Strafe noch Vorwurf. Sie ist eine Kontrolle des Verfahrens und gehört zum normalen Ablauf. Sie werden vorgeladen, beurteilt, und diese Beurteilung kann die Krankschreibung bestätigen oder die Gesundschreibung vorschlagen."),
          ul([
            "Nehmen Sie den Termin wahr: unentschuldigtes Fernbleiben hat Folgen für die Leistung.",
            "Bringen Sie Befunde, Rezepte und jede klinische Dokumentation mit.",
            "Antworten Sie auf Fragen zu Zustand und Verlauf so konkret wie in der Sprechstunde.",
            "Sie müssen nicht beweisen, dass Sie leiden. Sie müssen beschreiben, wie es Ihnen geht und was Sie können und nicht können.",
          ]),
          warn("Zu Reisen oder Ausgehen während der Krankschreibung", "Krankgeschrieben zu sein ist kein Hausarrest, und bei vielen Angstbildern gehört Spazierengehen zur Behandlung. Unangemessen sind Tätigkeiten, die mit der Genesung unvereinbar sind oder der geltend gemachten Arbeitsunfähigkeit widersprechen. Wollen Sie verreisen, besonders ins Ausland, klären Sie das vorher ärztlich und mit der Seguridad Social: ein Fehler trifft die Leistung, nicht nur die Gesundheit."),
          cite(`Schutz von Gesundheitsdaten: <a href="${AEPD}" rel="nofollow noopener" target="_blank">AEPD</a>. Kontrolle der Arbeitsunfähigkeit: <a href="${SEG_SOCIAL}" rel="nofollow noopener" target="_blank">Seguridad Social</a>.`),
        ],
      },
      {
        id: "privada",
        nav: "Privatsprechstunde",
        eyebrow: "Transparenz",
        h2: "Was eine private Online-Sprechstunde kann und was nicht",
        blocks: [
          lead("Wir sagen es zuerst und ohne Umschweife, weil die meisten Menschen genau mit dieser Frage kommen."),
          p("Eine Privatsprechstunde, vor Ort oder per Video, <strong>stellt den parte de baja nicht aus</strong>. Dieses Dokument gehört zum Weg des öffentlichen Gesundheitsdienstes oder der Mutua. Jeder Dienst, der Ihnen „die Krankschreibung“ über das Internet verspricht, verspricht etwas außerhalb seiner Möglichkeiten — und diesem Versprechen sollte man misstrauen, bevor man dafür zahlt."),
          p("Was eine Privatsprechstunde leisten kann, ist häufig genau das, was in derselben Woche gebraucht wird:"),
          ul([
            "<strong>Beurteilung ohne Warteliste</strong> und eine offene Rückmeldung, was zu sehen ist.",
            "<strong>Eine ärztliche Bescheinigung</strong> der Abwesenheit — die kein parte de baja ist, und das sagen wir Ihnen.",
            "<strong>Behandlungsbeginn</strong>, wo angezeigt, mit einer Erklärung, was wann zu erwarten ist.",
            "<strong>Ausschluss anderer Ursachen</strong> von Beschwerden, die wie Angst aussehen und keine sind.",
            "<strong>Ordnung des Falls</strong> für Ihre Hausarztpraxis: was zu sagen, zu dokumentieren, zu erbitten ist.",
            "<strong>Begleitung der Rückkehr</strong> an den Arbeitsplatz, die Phase, die fast niemand vorbereitet.",
          ]),
          p(`Die Registrierung jeder Ärztin und jedes Arztes können Sie im <a href="${CGCOM_REGISTRO}" rel="nofollow noopener" target="_blank">öffentlichen CGCOM-Register</a> prüfen, bei uns wie bei allen anderen.`),
          warn("Keine Sprechstunde garantiert eine Krankschreibung", "Wer das Ergebnis zusagt, bevor er Sie beurteilt hat, praktiziert keine Medizin. Die Entscheidung hängt vom Befund ab und bei der Arbeitsunfähigkeit zusätzlich von einem Weg, an dem die Privatmedizin nicht teilnimmt."),
        ],
      },
      {
        id: "tratamiento",
        nav: "Behandlung",
        eyebrow: "Während der Krankschreibung",
        h2: "Was während der Krankschreibung geschieht und wie die Rückkehr gelingt",
        blocks: [
          lead("Eine Krankschreibung wegen Angst ohne Behandlung ist meist eine, die sich wiederholt."),
          p("Zeit allein löst eine Angststörung selten. Was sie löst, wird von Fall zu Fall entschieden: <strong>Psychotherapie</strong>, <strong>Medikation</strong>, wo angezeigt, Arbeit am <strong>Schlaf</strong>, Bewegung, weniger Alkohol und — wenn die Ursache dort liegt — Veränderungen der Arbeitsbedingungen."),
          p("Die Rückkehr verdient dieselbe Sorgfalt wie der Ausstieg. Am Montag an dieselbe Stelle zurückzukehren, mit derselben Last und ohne dass sich etwas geändert hat, ist das übliche Rezept für den Rückfall. Besprechen Sie die Rückkehr frühzeitig ärztlich und, wenn es beim Arbeitgeber eine <strong>arbeitsmedizinische Betreuung</strong> gibt, auch dort: die Anpassung des Arbeitsplatzes ist ein formaler Weg und existiert genau dafür."),
          ul([
            "Halten Sie stabile Schlafzeiten ein, auch ohne Arbeit.",
            "Beenden Sie die Behandlung nicht, sobald es besser wird: die erste Besserung ist nicht das Ende des Prozesses.",
          ]),
        ],
      },
      {
        id: "urgencia",
        nav: "Nicht warten",
        eyebrow: "Sicherheit",
        h2: "Wann es nicht mehr um Papiere geht",
        blocks: [
          lead("Es gibt Situationen, in denen die Krankschreibung das Geringste ist und Hilfe sofort nötig wird."),
          ul([
            "Gedanken, sich das Leben zu nehmen, ein Plan, oder das Gefühl, die eigene Sicherheit nicht gewährleisten zu können.",
            "Unfähigkeit, für sich selbst oder für abhängige Personen zu sorgen.",
            "Alkohol- oder Substanzkonsum, um funktionieren oder schlafen zu können.",
            "Starker Brustschmerz, Atemnot in Ruhe oder Ohnmacht — was wie Angst aussehen kann und keine ist.",
          ]),
          p("In Spanien gibt es die <strong>Linie 024</strong> für suizidales Verhalten, rund um die Uhr und kostenfrei. Rufen Sie im medizinischen Notfall <strong>112</strong> an. In diesem Moment um Hilfe zu bitten ist keine arbeitsrechtliche Formalität: es ist das Einzige, was zählt."),
          cite(`Informationen zur Linie 024 und zur psychischen Gesundheit: <a href="${SANIDAD}" rel="nofollow noopener" target="_blank">Ministerio de Sanidad</a>.`),
        ],
      },
    ],
    linksEyebrow: "Global Health Spanien",
    linksH2: "Nächste Schritte",
    linksLead:
      "Unsere Ärztinnen und Ärzte in Spanien beurteilen per Video, ohne Warteliste, und sagen Ihnen klar, was heute geklärt werden kann und was zur Hausarztpraxis oder zur Mutua gehört.",
    links: [
      { label: "Ärztliche Sprechstunde und Bescheinigung", href: href("de", "/services/justificante-medico-online") },
      { label: "Unsere Ärztinnen und Ärzte in Spanien", href: href("de", "/doctors") },
      { label: "Global Health Spanien kontaktieren", href: href("de", "/contact") },
    ],
    ctaBox: {
      h3: "Unklar, wo anfangen?",
      text: "Eine kurze Sprechstunde beurteilt, wie es Ihnen geht, beginnt bei Bedarf eine Behandlung und ordnet, was Sie in Ihre Hausarztpraxis mitnehmen. Wir sagen Ihnen immer, welches Dokument wir ausstellen und welches nicht.",
      primary: { label: "Termin buchen", href: href("de", "/services/justificante-medico-online") },
      secondary: { label: "Unsere Ärztinnen und Ärzte", href: href("de", "/doctors") },
    },
    sourcesEyebrow: "Offizielle Quellen",
    sourcesH2: "Wo Sie die Regeln prüfen",
    sourcesLead: "Dauer, Geldleistung, Voraussetzungen und Rechtsbehelfsfristen sind Rechtsfragen und ändern sich. Prüfen Sie immer an der Quelle.",
    sources: [
      { label: "Seguridad Social", href: SEG_SOCIAL },
      { label: "Ministerio de Sanidad", href: SANIDAD },
      { label: "Ärzteregister — CGCOM", href: CGCOM_REGISTRO },
      { label: "Spanische Datenschutzbehörde", href: AEPD },
    ],
    sourcesNote:
      "Die Links führen auf die Seiten der zuständigen Stellen. Global Health ist weder Teil des öffentlichen Gesundheitsdienstes noch einer Mutua, stellt keine partes de baja aus und wirkt an Leistungsentscheidungen nicht mit.",
    faqEyebrow: "FAQ",
    faqH2: "Häufige Fragen",
    faqs: [
      {
        q: "Wer kann mich in Spanien wegen Angst krankschreiben?",
        a: "Den parte de baja stellt die Hausarztpraxis des öffentlichen Gesundheitsdienstes aus, wenn der Fall contingencia común ist, oder die Ärztin der Mutua, wenn er zur contingencia profesional gehört. Eine Privatsprechstunde kann beurteilen, behandeln und eine ärztliche Bescheinigung der Abwesenheit ausstellen, den parte de baja jedoch nicht.",
      },
      {
        q: "Meine Praxis schreibt mich wegen Angst nicht krank — was kann ich tun?",
        a: "Stellen Sie sich erneut vor und beschreiben Sie die funktionellen Folgen konkret: welche Aufgaben Ihrer Stelle Sie nicht mehr schaffen, wie viel Sie schlafen, welche Fehler passiert sind, welche körperlichen Symptome wie häufig auftreten. Sie dürfen eine erneute Beurteilung verlangen. Eine private Zweitmeinung stellt das Dokument nicht aus, hilft aber, den Verlauf zu belegen.",
      },
      {
        q: "Kann mein Arbeitgeber erfahren, dass ich wegen Angst krankgeschrieben bin?",
        a: "Der Arbeitgeber kennt das Bestehen der Krankschreibung und ihre voraussichtliche Dauer, nicht die Diagnose. Gesundheitsdaten sind besonders geschützt. Es zu erzählen ist Ihre Entscheidung, nie eine Pflicht.",
      },
      {
        q: "Was passiert, wenn mich die ärztliche Kontrolle vorlädt?",
        a: "Das ist eine übliche Kontrolle des Verfahrens, kein Vorwurf. Nehmen Sie den Termin wahr, bringen Sie Befunde und Dokumentation mit und beschreiben Sie Zustand und Verlauf konkret. Unentschuldigtes Fernbleiben hat Folgen für die Leistung.",
      },
      {
        q: "Darf man während der Krankschreibung reisen oder das Haus verlassen?",
        a: "Krankgeschrieben zu sein bedeutet nicht, zu Hause zu bleiben, und bei vielen Angstbildern gehört Aktivität zur Behandlung. Unangemessen sind Tätigkeiten, die der Genesung widersprechen oder die Arbeitsunfähigkeit in Frage stellen. Vor einer Reise, besonders ins Ausland, klären Sie es ärztlich und mit der Seguridad Social.",
      },
      {
        q: "Wie lange dauert eine Krankschreibung wegen Angst?",
        a: "Eine feste Dauer gibt es nicht: sie hängt vom Schweregrad, vom Ansprechen auf die Behandlung und von der Tätigkeit ab. Höchstgrenzen und Verlängerungen sind gesetzlich geregelt und ändern sich; prüfen Sie sie bei der Seguridad Social und nicht in einem Artikel.",
      },
    ],
    disclaimerTitle: "Medizinischer Hinweis",
    disclaimer:
      "Verfasst von Dra. Mónica Fabiana Cornejo Román, Fachärztin für Psychiatrie bei Global Health Spanien, fachlich geprüft von Dr. Eduardo Daniel Rodríguez Olivas, Allgemeinmediziner. Der Artikel enthält allgemeine Informationen zur vorübergehenden Arbeitsunfähigkeit wegen Angst in Spanien. Er ist keine persönliche ärztliche Beratung und keine Rechts- oder Arbeitsrechtsberatung. Anerkennung und Kontrolle der Arbeitsunfähigkeit liegen beim öffentlichen Gesundheitsdienst, der Mutua und der Seguridad Social. Bei Gedanken an Selbstverletzung rufen Sie 024. Im medizinischen Notfall rufen Sie 112.",
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
  authorDisplayName: "Global Health Medical Team",
  reviewerDoctorId: "cmrdpxpi0001v01ruqavjiq79",
  reviewerDisplayName: "Dr. Eduardo Daniel Rodríguez Olivas",
  posts: [es, en, pt, cs, roPost, de],
};
