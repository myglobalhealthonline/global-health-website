/**
 * APPLIED 2026-08-19 — 28 field writes across the 4 services below; all four
 * now serve `index, follow` and appear in the sitemap. Re-running is a no-op.
 *
 * Fill the four Spain services that ship an EMPTY body (`<p><br /></p>`) and
 * are therefore held back from the index by `isPublicServiceRecordIndexable`
 * (frontend/lib/content/publication-validation.ts — the body must reach 120
 * plain-text characters in the requested locale):
 *
 *   consulta-online-medicina-estetica      (GENERAL,    30 min)
 *   consulta-salud-vascular-circulatoria   (GENERAL,    20 min)
 *   consulta-diagnotico-vascular           (SPECIALIST, 30 min)
 *   consulta-flebologia-y-linfologia       (SPECIALIST, 30 min)
 *
 * Writes ES copy (name, hero, SEO, detailBody) to the base Service row AND to
 * its ES ServiceTranslation row. Spain's default locale is ES, so both are
 * authored in Spanish and `isFieldInLocale` accepts either. Nothing is written
 * for EN or any other locale, so those variants stay noindex until translated
 * — which is the intended behaviour, not an oversight.
 *
 *   node --env-file=.env --import tsx scripts/applied/patch-spain-vascular-aesthetic-services.ts           # dry-run
 *   node --env-file=.env --import tsx scripts/applied/patch-spain-vascular-aesthetic-services.ts --apply   # write
 *
 * SAFE BY DESIGN: only the four slugs below are touched; a field is written
 * only when the current value is empty or is the placeholder body, so
 * re-running is a no-op and hand-edited copy is never clobbered. The dry-run
 * runs inside a transaction that is always rolled back. Prices, duration,
 * doctor assignments, images, FAQs and slugs are NOT touched.
 */
import { LocaleCode, Prisma } from "@prisma/client";
import { prisma } from "../../src/db/prisma.js";

const COUNTRY_CODE = "es";
const LOCALE: LocaleCode = "ES";
const APPLY = process.argv.includes("--apply");

const log: string[] = [];
const note = (m: string) => {
  log.push(m);
  console.log(m);
};

/** Same floor the public indexability gate uses. */
const BODY_MIN_CHARS = 120;
const plain = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
/** True for null, "" and markup-only placeholders such as `<p><br /></p>`. */
const isEmptyBody = (v: string | null | undefined) => plain(v ?? "").length < BODY_MIN_CHARS;
const isBlank = (v: string | null | undefined) => (v ?? "").trim().length === 0;
/** Auto-generated placeholder SEO copy: "<name> | Global Health" / "Book <name> with a licensed doctor...". */
const isPlaceholderSeoTitle = (v: string | null | undefined) =>
  isBlank(v) || (v ?? "").endsWith(" | Global Health");
const isPlaceholderSeoDescription = (v: string | null | undefined) =>
  isBlank(v) || /^Book .* with a licensed doctor through Global Health\.$/.test((v ?? "").trim());

type ServiceCopy = {
  slug: string;
  /** Current DB name, matched before renaming so a hand-edit is never clobbered. */
  nameFrom: string;
  name: string;
  heroTitle: string;
  heroDescription: string;
  summary: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  detailBody: string;
};

const SERVICES: ServiceCopy[] = [
  {
    slug: "consulta-online-medicina-estetica",
    nameFrom: "Consulta Online Medicina Estetica",
    name: "Medicina Estética Online",
    heroTitle: "Medicina Estética Online — Valoración Médica Independiente",
    heroDescription:
      "Antes de decidirte por un tratamiento estético conviene que un médico valore tu caso sin tener el procedimiento que venderte. Esta consulta de medicina estética online es exactamente eso: una valoración independiente por videollamada sobre qué tratamientos están indicados para tu piel y tus objetivos, cuáles no lo están, qué resultado es realista, qué riesgos asume cada opción y qué comprobar en la clínica que finalmente te trate. Realizada por médicas colegiadas conforme a los requisitos de la Organización Médica Colegial (OMC) con práctica en medicina estética, desde cualquier punto de España, en español, inglés o portugués.",
    summary:
      "Valoración médica independiente en medicina estética por videollamada: indicación, expectativas realistas, riesgos y plan de tratamiento, sin la presión comercial del centro que vende el procedimiento.",
    seoTitle: "Medicina Estética Online España | Valoración Médica Independiente",
    seoDescription:
      "Consulta de medicina estética online con médica colegiada en España. Valoración independiente antes de tratarte: indicación, expectativas realistas, riesgos y plan escrito. Cita el mismo día.",
    seoKeywords: [
      "medicina estética online España",
      "consulta medicina estética online",
      "segunda opinión medicina estética España",
      "valoración estética médica online",
      "médico estético online España",
    ],
    detailBody: [
      "<h2>Para quién es este servicio</h2>",
      "<p>Esta consulta de medicina estética online es apropiada para adultos que quieren:</p>",
      "<ul>",
      "<li>Una valoración médica antes de contratar un tratamiento — toxina botulínica, rellenos de ácido hialurónico, peelings químicos, láser, mesoterapia, hilos tensores o radiofrecuencia</li>",
      "<li>Saber qué es realista en su caso y qué no lo es, antes de pagar por un procedimiento</li>",
      "<li>Una segunda opinión independiente sobre un plan de tratamiento o un presupuesto propuesto por otro centro</li>",
      "<li>Orientación sobre una preocupación cutánea con componente estético — arrugas, flacidez, manchas, poro dilatado, textura irregular, marcas de acné o rojeces</li>",
      "<li>Un plan de cuidado domiciliario con activos de eficacia demostrada, antes de un procedimiento o en lugar de él</li>",
      "<li>Revisión de la evolución tras un tratamiento estético reciente, cuando no hay signos de complicación urgente</li>",
      "<li>Entender qué comprobar en una clínica estética: quién realiza el procedimiento, con qué producto y con qué consentimiento informado</li>",
      "<li>Residentes internacionales y expatriados que prefieren una valoración en inglés o portugués</li>",
      "</ul>",
      "<h2>Qué es este servicio — y qué no es</h2>",
      "<p>Esta consulta cubre:</p>",
      "<ul>",
      "<li>Valoración médica de la indicación: qué tratamiento corresponde a qué problema, y en qué orden</li>",
      "<li>Expectativas realistas — qué cambio es alcanzable, en cuántas sesiones y cuánto dura</li>",
      "<li>Riesgos, contraindicaciones e interacciones con tu historia clínica y tu medicación actual</li>",
      "<li>Plan de cuidado de la piel con activos tópicos y fotoprotección</li>",
      "<li>Segunda opinión sobre un plan o un presupuesto de otro centro</li>",
      "<li>Revisión de evolución postratamiento no urgente</li>",
      "<li>Derivación coordinada a dermatología o a valoración presencial cuando esté indicado</li>",
      "</ul>",
      "<p>Este servicio no cubre:</p>",
      "<ul>",
      "<li>La realización del procedimiento. Ninguna infiltración, láser o peeling puede hacerse por videollamada: la consulta planifica el tratamiento, no lo ejecuta</li>",
      "<li>Complicaciones urgentes tras una infiltración. El dolor intenso y desproporcionado, la palidez o coloración violácea de la piel y la pérdida o borrosidad de visión tras un relleno son urgencias médicas: acude a urgencias o llama al 112 de inmediato</li>",
      "<li>Signos de infección tras un procedimiento — fiebre, calor local, supuración o inflamación progresiva — que requieren valoración presencial el mismo día</li>",
      "<li>Cirugía plástica. La valoración de un procedimiento quirúrgico corresponde a cirugía plástica presencial</li>",
      "<li>Lesiones cutáneas sospechosas. Un lunar que cambia, sangra o pica necesita dermatoscopia presencial; la consulta te orienta y coordina la derivación</li>",
      "</ul>",
      "<h2>Preocupaciones habitualmente evaluadas</h2>",
      "<ul>",
      "<li>Arrugas dinámicas de expresión — entrecejo, frente y contorno ocular</li>",
      "<li>Pérdida de volumen y flacidez facial leve o moderada</li>",
      "<li>Hiperpigmentación: melasma, léntigos solares y manchas postinflamatorias</li>",
      "<li>Secuelas de acné — marcas, cicatrices atróficas y textura irregular</li>",
      "<li>Rojeces persistentes y rosácea con impacto estético</li>",
      "<li>Ojeras y surco lagrimal</li>",
      "<li>Piel apagada, poro dilatado y fotoenvejecimiento</li>",
      "<li>Hiperhidrosis axilar o palmar</li>",
      "<li>Resultados insatisfactorios o asimetrías tras un tratamiento previo</li>",
      "</ul>",
      "<h2>Qué incluye la consulta</h2>",
      "<p><strong>Valoración por videollamada segura</strong></p>",
      "<p>La consulta se realiza por videollamada cifrada. Puedes enviar antes de la cita fotografías con buena iluminación de la zona que te preocupa, además de informes o presupuestos de otros centros.</p>",
      "<p><strong>Historia clínica y seguridad</strong></p>",
      "<p>Se revisan antecedentes relevantes, medicación actual, alergias, tratamientos estéticos previos y objetivos. Buena parte de las contraindicaciones de la medicina estética — embarazo y lactancia, enfermedad autoinmune activa, anticoagulación, infección cutánea activa, herpes labial recurrente o tratamiento reciente con isotretinoína — solo aparecen en una historia clínica hecha con tiempo.</p>",
      "<p><strong>Plan escrito</strong></p>",
      "<p>Tras la consulta recibes un plan por escrito: qué tratamiento está indicado, en qué orden, qué alternativa menos invasiva existe, qué resultado es esperable y qué señales de alarma vigilar si finalmente te tratas.</p>",
      "<p><strong>Prescripción cuando esté indicada</strong></p>",
      "<p>La prescripción de tratamiento tópico o sistémico es una decisión clínica y se realiza únicamente cuando resulta apropiada tras la valoración.</p>",
      "<p><strong>Derivación coordinada</strong></p>",
      "<p>Cuando el caso corresponde a dermatología, a cirugía plástica o a una valoración presencial, la médica lo indica con claridad y coordina la derivación con el informe completo.</p>",
      "<h2>Antes de tratarte: qué comprobar</h2>",
      "<p>La medicina estética es un acto médico. Antes de cualquier procedimiento conviene verificar:</p>",
      "<ul>",
      "<li>Quién realiza el tratamiento y con qué titulación — la infiltración de toxina botulínica y de rellenos es un acto médico</li>",
      "<li>Qué producto exacto se va a utilizar, con qué marcado CE y en qué cantidad</li>",
      "<li>Que existe consentimiento informado por escrito, con riesgos y alternativas</li>",
      "<li>Qué protocolo de complicaciones tiene el centro y quién responde fuera del horario de consulta</li>",
      "<li>Qué incluye el precio: número de sesiones, revisión posterior y retoque</li>",
      "</ul>",
      "<h2>Medicina estética en España — el problema del acceso</h2>",
      "<p>En España la primera valoración estética suele ofrecerse gratuitamente en el mismo centro que después vende el tratamiento. Esa valoración tiene valor, pero no es independiente: quien la realiza tiene un interés económico directo en el procedimiento que recomienda.</p>",
      "<p>El resultado es previsible — tratamientos indicados a pacientes que no los necesitaban, expectativas mal ajustadas y presupuestos imposibles de comparar entre clínicas, porque cada una describe lo que hace con nombres comerciales distintos.</p>",
      "<p>Esta consulta existe para cubrir ese hueco: una valoración médica que paga el paciente, sin ningún tratamiento que vender, disponible el mismo día desde cualquier punto de España y también en inglés o portugués.</p>",
    ].join(""),
  },
  {
    slug: "consulta-salud-vascular-circulatoria",
    nameFrom: "Consulta Salud Vascular / Circulatoria",
    name: "Salud Vascular y Circulatoria Online",
    heroTitle: "Salud Vascular y Circulatoria Online — Consulta Médica",
    heroDescription:
      "Piernas pesadas al final del día, varices que van a más, hinchazón vespertina, calambres nocturnos o antecedentes familiares de enfermedad venosa: son motivos frecuentes de consulta que rara vez se evalúan con calma. Esta consulta de salud vascular y circulatoria online es una valoración médica por videollamada de tus síntomas y de tus factores de riesgo, con revisión de las pruebas que ya tengas, solicitud de eco-Doppler cuando esté indicado y un plan escrito. Desde cualquier punto de España, en español, inglés o portugués.",
    summary:
      "Valoración médica por videollamada de síntomas venosos y circulatorios: piernas pesadas, varices, hinchazón y calambres, con revisión de pruebas, solicitud de eco-Doppler cuando procede y plan escrito.",
    seoTitle: "Salud Vascular y Circulatoria Online España | Consulta Médica",
    seoDescription:
      "Piernas pesadas, varices, hinchazón o calambres. Valoración médica online de tu salud venosa y circulatoria en España: revisión de pruebas, solicitud de eco-Doppler y plan. Cita el mismo día.",
    seoKeywords: [
      "salud vascular online España",
      "consulta circulatoria online España",
      "piernas pesadas médico online",
      "varices consulta online España",
      "mala circulación piernas consulta online",
    ],
    detailBody: [
      "<h2>Para quién es este servicio</h2>",
      "<p>Esta consulta de salud vascular y circulatoria es apropiada para adultos con:</p>",
      "<ul>",
      "<li>Sensación de piernas pesadas o cansadas, sobre todo al final del día o tras muchas horas de pie</li>",
      "<li>Varices visibles, arañas vasculares o venas reticulares que aumentan con el tiempo</li>",
      "<li>Hinchazón de tobillos vespertina, que mejora al elevar las piernas</li>",
      "<li>Calambres nocturnos, picor o inquietud en las piernas de perfil venoso</li>",
      "<li>Cambios de coloración en la piel de la pierna: manchas ocres, endurecimiento o eccema en el tobillo</li>",
      "<li>Antecedentes familiares de enfermedad venosa y dudas sobre qué prevención tiene sentido</li>",
      "<li>Antecedente personal de trombosis venosa y dudas sobre el seguimiento actual</li>",
      "<li>Factores de riesgo cardiovascular — tabaquismo, diabetes, hipertensión, dislipemia, obesidad, sedentarismo — y ninguna evaluación vascular hecha</li>",
      "<li>Dolor en la pantorrilla al caminar que cede con el reposo, para orientar el estudio arterial</li>",
      "<li>Trabajo de riesgo venoso (bipedestación prolongada, sedestación continuada, viajes largos frecuentes) y necesidad de un plan preventivo</li>",
      "<li>Residentes internacionales y expatriados que necesitan atención vascular en inglés o portugués</li>",
      "</ul>",
      "<h2>Qué es este servicio — y qué no es</h2>",
      "<p>Esta consulta cubre:</p>",
      "<ul>",
      "<li>Evaluación clínica de síntomas venosos y circulatorios no urgentes</li>",
      "<li>Revisión e interpretación de pruebas que ya tengas: eco-Doppler, índice tobillo-brazo, analíticas</li>",
      "<li>Valoración del riesgo cardiovascular global y plan para reducirlo</li>",
      "<li>Solicitud de eco-Doppler venoso o arterial y de analítica cuando estén clínicamente indicados</li>",
      "<li>Indicación de terapia compresiva: tipo de media, clase de compresión y cómo usarla</li>",
      "<li>Medidas conservadoras con evidencia — ejercicio, control de peso, elevación, higiene postural</li>",
      "<li>Derivación coordinada a flebología, angiología o cirugía vascular cuando corresponde</li>",
      "</ul>",
      "<p>Este servicio no cubre:</p>",
      "<ul>",
      "<li>Urgencias vasculares. El dolor e hinchazón brusca de una sola pierna, con calor y enrojecimiento, obliga a descartar una trombosis venosa profunda el mismo día; si se acompaña de dolor torácico o dificultad para respirar, llama al 112 inmediatamente</li>",
      "<li>Isquemia arterial aguda — pierna fría, pálida, dolorosa y sin pulso — que es una urgencia hospitalaria inmediata</li>",
      "<li>La realización de la ecografía. El eco-Doppler es presencial: la consulta lo solicita e interpreta el informe, no lo ejecuta</li>",
      "<li>Procedimientos venosos. La escleroterapia, la ablación endovenosa y la cirugía de varices requieren valoración y ejecución presencial</li>",
      "<li>Úlceras infectadas o de evolución tórpida, que necesitan cura y valoración presencial</li>",
      "</ul>",
      "<h2>Qué incluye la consulta</h2>",
      "<p><strong>Historia clínica vascular dirigida</strong></p>",
      "<p>Tiempo de evolución, patrón horario de los síntomas, antecedentes personales y familiares de trombosis o varices, embarazos, medicación —anticonceptivos y terapia hormonal incluidos—, actividad laboral y factores de riesgo cardiovascular.</p>",
      "<p><strong>Exploración guiada por videollamada</strong></p>",
      "<p>La médica te guía para mostrar la pierna afectada: distribución de las varices, edema, cambios cutáneos y simetría entre ambas piernas. Puedes enviar fotografías antes de la cita.</p>",
      "<p><strong>Revisión de pruebas previas</strong></p>",
      "<p>Si ya tienes un eco-Doppler, un índice tobillo-brazo o una analítica, se revisan e interpretan en la consulta y se te explica qué significan en tu caso concreto.</p>",
      "<p><strong>Solicitud de pruebas</strong></p>",
      "<p>Cuando el estudio está indicado, la solicitud de eco-Doppler venoso o arterial y de analítica se emite el mismo día para realizarla en un centro de tu zona.</p>",
      "<p><strong>Plan escrito y terapia compresiva</strong></p>",
      "<p>Recibes un plan por escrito con las medidas conservadoras indicadas y, cuando procede, la prescripción de compresión graduada con la clase adecuada, explicando cómo y cuándo usarla.</p>",
      "<p><strong>Derivación coordinada</strong></p>",
      "<p>Si la evaluación apunta a una enfermedad venosa avanzada o a patología arterial, la médica coordina la derivación al especialista con el informe completo, sin que tengas que empezar de cero.</p>",
      "<h2>Cuándo conviene no esperar</h2>",
      "<p>Acude a urgencias o llama al 112 si aparece:</p>",
      "<ul>",
      "<li>Dolor e hinchazón brusca de una sola pierna, con calor o enrojecimiento</li>",
      "<li>Dolor torácico o dificultad respiratoria de aparición súbita</li>",
      "<li>Pierna fría, pálida y dolorosa, con pérdida de sensibilidad o de fuerza</li>",
      "<li>Sangrado de una variz que no cede con compresión y elevación</li>",
      "<li>Úlcera con fiebre, supuración o celulitis alrededor</li>",
      "</ul>",
      "<h2>Salud vascular en España — el problema del acceso</h2>",
      "<p>Los síntomas venosos son extraordinariamente frecuentes y sistemáticamente minimizados. La mayoría de los pacientes conviven años con piernas pesadas y varices progresivas sin que nadie evalúe el reflujo venoso ni indique una compresión correcta, hasta que aparecen cambios cutáneos o una úlcera que ya es difícil de revertir.</p>",
      "<p>La enfermedad venosa crónica es progresiva, y las medidas que la frenan — compresión bien indicada, ejercicio, control del peso y tratamiento del reflujo cuando corresponde — son más eficaces cuanto antes se aplican.</p>",
      "<p>Esta consulta permite hacer esa evaluación sin esperas y desde cualquier punto de España, con solicitud de pruebas el mismo día cuando están indicadas.</p>",
    ].join(""),
  },
  {
    slug: "consulta-diagnotico-vascular",
    nameFrom: "Consulta Diagnostico vascular",
    name: "Diagnóstico Vascular Especialista",
    heroTitle: "Diagnóstico Vascular Especialista — Revisión de Pruebas Online",
    heroDescription:
      "Un eco-Doppler cuyo informe nadie te ha explicado, un angio-TC con hallazgos que no entiendes, un índice tobillo-brazo alterado o una trombosis previa cuyo seguimiento se quedó a medias: son situaciones que necesitan la lectura de un médico con práctica en patología vascular. Esta consulta de diagnóstico vascular es una revisión especializada de tus pruebas por videollamada, con interpretación, plan y solicitud de los estudios que falten. Desde cualquier punto de España, en español, inglés o portugués.",
    summary:
      "Revisión especializada de pruebas vasculares por videollamada: eco-Doppler, índice tobillo-brazo, angio-TC y angio-RM interpretados, con plan escrito y solicitud de los estudios que falten.",
    seoTitle: "Diagnóstico Vascular Online España | Revisión de Eco-Doppler",
    seoDescription:
      "Revisión especializada de tu eco-Doppler, índice tobillo-brazo o angio-TC por videollamada en España. Interpretación, plan y solicitud de pruebas el mismo día.",
    seoKeywords: [
      "diagnóstico vascular online España",
      "interpretación eco-Doppler online",
      "revisión pruebas vasculares España",
      "segunda opinión vascular online España",
      "índice tobillo-brazo consulta online",
    ],
    detailBody: [
      "<h2>Para quién es este servicio</h2>",
      "<p>Esta consulta de diagnóstico vascular especialista es apropiada para adultos con:</p>",
      "<ul>",
      "<li>Un eco-Doppler venoso o arterial cuyo informe no te ha explicado nadie con detalle</li>",
      "<li>Un angio-TC o una angio-RM con hallazgos vasculares que necesitan interpretación</li>",
      "<li>Un índice tobillo-brazo alterado o dudoso</li>",
      "<li>Diagnóstico de insuficiencia venosa crónica y necesidad de saber en qué estadio está y qué implica</li>",
      "<li>Antecedente de trombosis venosa profunda o embolia pulmonar, con dudas sobre el seguimiento, la duración de la anticoagulación o el riesgo de recurrencia</li>",
      "<li>Enfermedad arterial periférica conocida — claudicación intermitente estable — que requiere revisión especializada</li>",
      "<li>Aneurisma de aorta abdominal en programa de seguimiento, con informes que revisar</li>",
      "<li>Sospecha de síndrome postrombótico tras una trombosis previa</li>",
      "<li>Fenómeno de Raynaud, acrocianosis u otras alteraciones vasomotoras que necesitan orientación diagnóstica</li>",
      "<li>Una segunda opinión sobre un diagnóstico vascular o sobre una indicación quirúrgica ya recibida</li>",
      "<li>Residentes internacionales y expatriados que necesitan interpretación vascular especializada en inglés o portugués</li>",
      "</ul>",
      "<h2>Qué es este servicio — y qué no es</h2>",
      "<p>Esta consulta cubre:</p>",
      "<ul>",
      "<li>Interpretación especializada de pruebas vasculares ya realizadas</li>",
      "<li>Correlación entre el informe de la prueba y tus síntomas — que es donde la mayoría de los informes se quedan cortos</li>",
      "<li>Estadificación de la enfermedad venosa crónica y explicación de lo que implica cada estadio</li>",
      "<li>Solicitud de los estudios que falten para completar el diagnóstico</li>",
      "<li>Plan de tratamiento y de seguimiento por escrito</li>",
      "<li>Segunda opinión sobre un diagnóstico o una indicación de procedimiento</li>",
      "<li>Coordinación de derivación a cirugía vascular o a flebología intervencionista cuando está indicada</li>",
      "</ul>",
      "<p>Este servicio no cubre:</p>",
      "<ul>",
      "<li>La realización de las pruebas. El eco-Doppler, el índice tobillo-brazo y las pruebas de imagen son presenciales: esta consulta las interpreta y las solicita, no las ejecuta</li>",
      "<li>Urgencias vasculares. La sospecha de trombosis venosa profunda aguda, la isquemia arterial aguda y el dolor abdominal o lumbar intenso en un paciente con aneurisma conocido son urgencias: acude a urgencias o llama al 112</li>",
      "<li>Procedimientos e intervención — escleroterapia, ablación endovenosa, angioplastia o cirugía — que requieren valoración presencial</li>",
      "<li>Ajuste urgente de anticoagulación ante sangrado activo, que es una urgencia hospitalaria</li>",
      "</ul>",
      "<h2>Revisión de pruebas vasculares — cómo funciona</h2>",
      "<p>Sube tus informes y tus imágenes antes de la cita: eco-Doppler venoso o arterial, índice tobillo-brazo, angio-TC, angio-RM, analíticas con estudio de trombofilia o dímero D, e informes de ingresos previos. El médico los revisa antes de la videollamada.</p>",
      "<p>Durante la consulta se explica, en lenguaje claro, qué dice cada prueba: dónde hay reflujo y de qué duración, qué segmentos venosos están afectados, si existe obstrucción residual tras una trombosis, qué grado de estenosis arterial se documenta y qué significa el índice tobillo-brazo obtenido.</p>",
      "<p>Al terminar sabes tres cosas: qué tienes, qué falta por estudiar y qué se hace a continuación.</p>",
      "<h2>Condiciones habitualmente evaluadas</h2>",
      "<ul>",
      "<li>Insuficiencia venosa crónica y reflujo safeno</li>",
      "<li>Síndrome postrombótico</li>",
      "<li>Trombosis venosa superficial y profunda en fase de seguimiento</li>",
      "<li>Enfermedad arterial periférica y claudicación intermitente estable</li>",
      "<li>Aneurisma de aorta abdominal en vigilancia</li>",
      "<li>Estenosis carotídea documentada en seguimiento</li>",
      "<li>Fenómeno de Raynaud y alteraciones vasomotoras</li>",
      "<li>Edema de miembros inferiores de origen no aclarado</li>",
      "<li>Malformaciones venosas y varices atípicas</li>",
      "</ul>",
      "<h2>Qué incluye la consulta</h2>",
      "<p><strong>Revisión documental previa</strong></p>",
      "<p>Los informes y las imágenes que aportas se revisan antes de la videollamada, de modo que el tiempo de consulta se dedica a explicar y decidir, no a leer.</p>",
      "<p><strong>Interpretación especializada</strong></p>",
      "<p>Cada hallazgo se traduce a consecuencias prácticas: qué explica tus síntomas, qué es un hallazgo incidental sin relevancia y qué exige seguimiento.</p>",
      "<p><strong>Solicitud de pruebas complementarias</strong></p>",
      "<p>Cuando falta un estudio para cerrar el diagnóstico, la solicitud se emite el mismo día para realizarla en un centro privado de tu zona.</p>",
      "<p><strong>Plan escrito</strong></p>",
      "<p>Recibes un informe con el diagnóstico, el tratamiento indicado, la pauta de compresión cuando corresponde, los objetivos de control de factores de riesgo y el calendario de seguimiento.</p>",
      "<p><strong>Segunda opinión</strong></p>",
      "<p>Si ya tienes una indicación quirúrgica o de procedimiento, se revisa la documentación disponible y se te explica en qué se sustenta, qué alternativas existen y qué preguntas conviene plantear.</p>",
      "<p><strong>Derivación coordinada</strong></p>",
      "<p>Cuando corresponde tratamiento intervencionista o valoración presencial, la derivación se coordina con el informe especializado completo.</p>",
      "<h2>Diagnóstico vascular en España — el problema del acceso</h2>",
      "<p>El eco-Doppler es una prueba accesible en España; la interpretación clínica que la acompaña, mucho menos. Es habitual salir del centro de imagen con un informe técnico y quedarse semanas esperando a que alguien lo relacione con los síntomas y decida qué hacer.</p>",
      "<p>Esa espera importa. En la enfermedad venosa determina el momento en que se inicia la compresión o se trata el reflujo; en la enfermedad arterial periférica, el momento en que se empieza a controlar el riesgo cardiovascular, que es lo que realmente marca el pronóstico.</p>",
      "<p>Esta consulta acorta ese intervalo: revisión especializada de tus pruebas con plan escrito, sin esperas y desde cualquier punto de España.</p>",
    ].join(""),
  },
  {
    slug: "consulta-flebologia-y-linfologia",
    nameFrom: "Consulta Online Flebologia y Linfologia",
    name: "Flebología y Linfología Especialista",
    heroTitle: "Flebología y Linfología Especialista — Consulta Online",
    heroDescription:
      "Varices que progresan, una pierna que se hincha y no desde ayer, linfedema tras una cirugía oncológica, lipedema mal diagnosticado durante años o una úlcera venosa que no termina de cerrar: la patología venosa y linfática necesita un plan, no una opinión suelta. Esta consulta especialista en flebología y linfología evalúa tu caso por videollamada, revisa tus pruebas, indica la compresión adecuada y planifica el tratamiento — escleroterapia, ablación o terapia descongestiva — coordinando la derivación presencial cuando toca. Desde cualquier punto de España, en español, inglés o portugués.",
    summary:
      "Consulta especialista en enfermedad venosa y linfática por videollamada: varices, insuficiencia venosa crónica, síndrome postrombótico, linfedema y lipedema, con indicación de compresión y plan de tratamiento.",
    seoTitle: "Flebología y Linfología Online España | Varices y Linfedema",
    seoDescription:
      "Consulta especialista online en varices, insuficiencia venosa, linfedema y lipedema en España. Revisión de pruebas, compresión indicada y plan de tratamiento. Cita el mismo día.",
    seoKeywords: [
      "flebología online España",
      "linfedema consulta online España",
      "varices especialista online España",
      "lipedema diagnóstico online España",
      "insuficiencia venosa crónica consulta online",
    ],
    detailBody: [
      "<h2>Para quién es este servicio</h2>",
      "<p>Esta consulta especialista en flebología y linfología es apropiada para adultos con:</p>",
      "<ul>",
      "<li>Varices sintomáticas o en progresión, con o sin eco-Doppler previo</li>",
      "<li>Insuficiencia venosa crónica ya diagnosticada que necesita plan de tratamiento</li>",
      "<li>Arañas vasculares y telangiectasias, para valorar si procede escleroterapia y en qué orden</li>",
      "<li>Cambios cutáneos de origen venoso: dermatitis ocre, lipodermatoesclerosis o eccema del tobillo</li>",
      "<li>Úlcera venosa en cicatrización que necesita revisión del plan de compresión</li>",
      "<li>Síndrome postrombótico tras una trombosis venosa profunda</li>",
      "<li>Linfedema primario o secundario — tras cirugía oncológica, vaciamiento ganglionar o radioterapia</li>",
      "<li>Sospecha de lipedema, frecuentemente confundido con obesidad o con linfedema durante años</li>",
      "<li>Hinchazón crónica de una o ambas piernas de causa no aclarada</li>",
      "<li>Celulitis de repetición sobre una extremidad con linfedema, para revisar la estrategia preventiva</li>",
      "<li>Una segunda opinión sobre una indicación de cirugía de varices o de procedimiento endovenoso</li>",
      "<li>Residentes internacionales y expatriados que necesitan flebología especializada en inglés o portugués</li>",
      "</ul>",
      "<h2>Qué es este servicio — y qué no es</h2>",
      "<p>Esta consulta cubre:</p>",
      "<ul>",
      "<li>Evaluación especializada de patología venosa y linfática</li>",
      "<li>Estadificación de la enfermedad venosa crónica y del linfedema, y explicación de lo que implica</li>",
      "<li>Diagnóstico diferencial entre linfedema, lipedema, edema venoso y edema sistémico</li>",
      "<li>Revisión e interpretación de eco-Doppler y de otros estudios previos</li>",
      "<li>Indicación de terapia compresiva: tipo de prenda, clase de compresión, medida y pauta de uso</li>",
      "<li>Planificación del tratamiento — escleroterapia, ablación endovenosa con láser o radiofrecuencia, cirugía, terapia descongestiva compleja</li>",
      "<li>Solicitud de pruebas cuando faltan para decidir</li>",
      "<li>Coordinación de la derivación presencial para el procedimiento indicado</li>",
      "</ul>",
      "<p>Este servicio no cubre:</p>",
      "<ul>",
      "<li>La realización del procedimiento. La escleroterapia, la ablación endovenosa y la cirugía de varices son presenciales: esta consulta los indica y los planifica, no los ejecuta</li>",
      "<li>El drenaje linfático manual y la terapia descongestiva, que realiza un fisioterapeuta con formación específica; la consulta la indica y la coordina</li>",
      "<li>Urgencias. La sospecha de trombosis venosa profunda aguda — dolor e hinchazón brusca de una pierna, con calor o enrojecimiento — obliga a una valoración el mismo día, y si se acompaña de dolor torácico o dificultad respiratoria hay que llamar al 112</li>",
      "<li>Celulitis aguda con fiebre, que necesita antibioterapia y valoración presencial sin demora</li>",
      "<li>Sangrado activo de una variz, que exige compresión, elevación y atención urgente</li>",
      "</ul>",
      "<h2>Condiciones habitualmente evaluadas</h2>",
      "<ul>",
      "<li>Varices tronculares y reflujo de safena interna o externa</li>",
      "<li>Telangiectasias y venas reticulares</li>",
      "<li>Insuficiencia venosa crónica en sus distintos estadios clínicos</li>",
      "<li>Síndrome postrombótico y obstrucción venosa residual</li>",
      "<li>Úlcera venosa activa o cicatrizada</li>",
      "<li>Linfedema primario y secundario</li>",
      "<li>Lipedema y su diagnóstico diferencial</li>",
      "<li>Flebitis superficial en fase de seguimiento</li>",
      "<li>Edema del embarazo y patología venosa gestacional</li>",
      "<li>Varices recidivadas tras cirugía o tras procedimiento endovenoso previo</li>",
      "</ul>",
      "<h2>Qué incluye la consulta</h2>",
      "<p><strong>Historia clínica especializada</strong></p>",
      "<p>Evolución, patrón de la hinchazón, respuesta a la elevación, antecedentes de trombosis, embarazos, cirugía oncológica o radioterapia previas, episodios de celulitis, medicación y tratamientos venosos anteriores.</p>",
      "<p><strong>Exploración guiada por videollamada</strong></p>",
      "<p>El médico te guía para mostrar ambas piernas: distribución de las varices, extensión del edema, afectación del dorso del pie y de los dedos, estado de la piel y simetría. Puedes enviar fotografías y medidas perimétricas antes de la cita.</p>",
      "<p><strong>Revisión de pruebas y solicitud de las que falten</strong></p>",
      "<p>Se interpretan el eco-Doppler y los estudios previos, y se solicitan las pruebas necesarias — eco-Doppler venoso, analítica u otras — para completar el diagnóstico.</p>",
      "<p><strong>Compresión correctamente indicada</strong></p>",
      "<p>La compresión mal elegida es el motivo más frecuente de abandono del tratamiento. Se indica la prenda concreta, la clase de compresión, la longitud y la pauta de uso, con las contraindicaciones revisadas — la enfermedad arterial periférica entre ellas.</p>",
      "<p><strong>Plan de tratamiento escrito</strong></p>",
      "<p>Recibes un plan con la secuencia del tratamiento, qué procedimiento está indicado y con qué objetivo, qué resultado es esperable y qué seguimiento necesitas después.</p>",
      "<p><strong>Derivación coordinada</strong></p>",
      "<p>Cuando corresponde escleroterapia, ablación endovenosa, cirugía o terapia descongestiva presencial, la derivación se coordina con el informe especializado completo.</p>",
      "<h2>Linfedema y lipedema — por qué el diagnóstico llega tarde</h2>",
      "<p>El linfedema secundario a tratamiento oncológico suele detectarse tarde, cuando el tejido ya se ha fibrosado y la terapia descongestiva rinde menos. La detección precoz y una compresión bien indicada cambian el curso de la enfermedad.</p>",
      "<p>El lipedema tiene un retraso diagnóstico aún mayor: durante años se atribuye a obesidad, con la carga añadida de responsabilizar a la paciente de un cuadro que no depende de la dieta. Distinguirlo del linfedema y del edema venoso —por su distribución simétrica, el respeto del pie y el dolor a la presión— es el primer paso para tratarlo correctamente.</p>",
      "<h2>Flebología en España — el problema del acceso</h2>",
      "<p>La atención venosa en España se concentra en las consultas privadas de las grandes ciudades, y la linfología especializada es aún más escasa. Las pacientes con linfedema o lipedema recorren varios profesionales antes de recibir un diagnóstico correcto, y muchos pacientes con varices solo son evaluados cuando la piel ya ha cambiado.</p>",
      "<p>Esta consulta acerca esa evaluación especializada a cualquier punto de España, con revisión de pruebas, compresión bien indicada y un plan de tratamiento escrito, coordinando la parte presencial únicamente cuando es imprescindible.</p>",
    ].join(""),
  },
];

/** Sentinel used to roll the dry-run transaction back. */
class ROLLBACK extends Error {}

async function main() {
  for (const s of SERVICES) {
    const len = plain(s.detailBody).length;
    if (len < BODY_MIN_CHARS) {
      throw new Error(`${s.slug}: authored body is ${len} plain chars, below the ${BODY_MIN_CHARS} gate`);
    }
  }

  const country = await prisma.country.findUnique({
    where: { code: COUNTRY_CODE },
    select: { id: true },
  });
  if (!country) throw new Error(`Country ${COUNTRY_CODE} not found`);
  const countryId = country.id;

  await prisma
    .$transaction(
      async (tx) => {
        for (const copy of SERVICES) {
          const service = await tx.service.findFirst({
            where: { countryId, slug: copy.slug },
            select: {
              id: true,
              name: true,
              summary: true,
              seoTitle: true,
              seoDescription: true,
              seoKeywords: true,
              heroTitle: true,
              heroDescription: true,
              detailBody: true,
            },
          });
          if (!service) {
            note(`⚠ ${copy.slug}: no Service row for country ${COUNTRY_CODE} — skipped.`);
            continue;
          }

          // ── base Service row (authored in the market default locale, ES) ──
          const base: Prisma.ServiceUpdateInput = {};
          if (isEmptyBody(service.detailBody)) {
            base.detailBody = copy.detailBody;
            note(`${copy.slug}: base detailBody ${plain(service.detailBody ?? "").length} -> ${plain(copy.detailBody).length} chars`);
          } else {
            note(`${copy.slug}: base detailBody already has content — left as-is.`);
          }
          if (isBlank(service.summary)) base.summary = copy.summary;
          if (isBlank(service.heroTitle)) base.heroTitle = copy.heroTitle;
          if (isBlank(service.heroDescription)) base.heroDescription = copy.heroDescription;
          if (service.name === copy.nameFrom) {
            base.name = copy.name;
            note(`${copy.slug}: name "${service.name}" -> "${copy.name}"`);
          }
          if (isPlaceholderSeoTitle(service.seoTitle)) {
            base.seoTitle = copy.seoTitle;
            note(`${copy.slug}: seoTitle "${service.seoTitle ?? "∅"}" -> "${copy.seoTitle}"`);
          }
          if (isPlaceholderSeoDescription(service.seoDescription)) {
            base.seoDescription = copy.seoDescription;
            note(`${copy.slug}: seoDescription replaced (was English placeholder or empty)`);
          }
          if (service.seoKeywords.length === 0) base.seoKeywords = copy.seoKeywords;

          if (Object.keys(base).length) {
            note(`${copy.slug}: base fields written -> ${Object.keys(base).join(", ")}`);
            if (APPLY) await tx.service.update({ where: { id: service.id }, data: base });
          }

          // ── ES ServiceTranslation row ──
          const tr = await tx.serviceTranslation.findUnique({
            where: { serviceId_locale: { serviceId: service.id, locale: LOCALE } },
            select: {
              id: true,
              name: true,
              summary: true,
              seoTitle: true,
              seoDescription: true,
              heroTitle: true,
              heroDescription: true,
              detailBody: true,
            },
          });
          if (!tr) {
            note(`${copy.slug}: no ES translation row — creating one.`);
            if (APPLY) {
              await tx.serviceTranslation.create({
                data: {
                  serviceId: service.id,
                  locale: LOCALE,
                  name: copy.name,
                  summary: copy.summary,
                  seoTitle: copy.seoTitle,
                  seoDescription: copy.seoDescription,
                  heroTitle: copy.heroTitle,
                  heroDescription: copy.heroDescription,
                  detailBody: copy.detailBody,
                },
              });
            }
            continue;
          }

          const trData: Prisma.ServiceTranslationUpdateInput = {};
          if (isEmptyBody(tr.detailBody)) {
            trData.detailBody = copy.detailBody;
            note(`${copy.slug}: ES translation detailBody ${plain(tr.detailBody ?? "").length} -> ${plain(copy.detailBody).length} chars`);
          } else {
            note(`${copy.slug}: ES translation detailBody already has content — left as-is.`);
          }
          if (isBlank(tr.summary)) trData.summary = copy.summary;
          if (isBlank(tr.heroTitle)) trData.heroTitle = copy.heroTitle;
          if (isBlank(tr.heroDescription)) trData.heroDescription = copy.heroDescription;
          if (tr.name === copy.nameFrom) trData.name = copy.name;
          if (isPlaceholderSeoTitle(tr.seoTitle)) trData.seoTitle = copy.seoTitle;
          if (isPlaceholderSeoDescription(tr.seoDescription)) trData.seoDescription = copy.seoDescription;

          if (Object.keys(trData).length) {
            note(`${copy.slug}: ES translation fields written -> ${Object.keys(trData).join(", ")}`);
            if (APPLY) await tx.serviceTranslation.update({ where: { id: tr.id }, data: trData });
          }
        }

        if (!APPLY) throw new ROLLBACK();
      },
      { timeout: 60_000 },
    )
    .catch((e) => {
      if (e instanceof ROLLBACK) return; // dry-run: intentional rollback
      throw e;
    });

  console.log("\n── verification: es services with an empty body ──");
  const empties = await prisma.service.findMany({
    where: { countryId, kind: { in: ["GENERAL", "SPECIALIST"] }, isActive: true },
    select: { slug: true, detailBody: true, translations: { where: { locale: LOCALE }, select: { detailBody: true } } },
    orderBy: { slug: "asc" },
  });
  const stillEmpty = empties.filter(
    (s) => isEmptyBody(s.translations[0]?.detailBody) && isEmptyBody(s.detailBody),
  );
  if (stillEmpty.length === 0) console.log("  none — every active es service has ES body content.");
  else stillEmpty.forEach((s) => console.log(`  ${s.slug} — still empty`));

  console.log("\n────────────");
  console.log(
    APPLY
      ? `APPLIED: ${log.length} change line(s) written for Spain services.`
      : `DRY-RUN: ${log.length} change line(s) would be written. Pass --apply to persist.`,
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
