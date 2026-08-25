/**
 * Spain — Week 2 editorial plan article.
 *
 * Primary keyword: "tensión alta" — 12,100/mo, KD 3, CPC USD 0.32.
 * Supporting cluster: "síntomas de tensión alta" — 5,400/mo, KD 9.
 * Metrics supplied from the 2026-08-24 OpenSEO / DataForSEO refresh.
 *
 * Intent boundary:
 * - Week 1 owns normal ranges and measurement tables;
 * - this article owns symptoms, emergency red flags and safe next steps;
 * - the planned treatment article owns long-term ways to lower pressure.
 *
 * Safety boundary: no diagnosis from symptoms alone, no unsupervised dose or
 * prescription changes, and no folk remedy is presented as acute treatment.
 */
import { cite, lead, p, ul, warn, type Article } from "../blog-seo-2026-08/template.js";
import type { LocalePost, PostSet } from "../blog-seo-2026-08/types.js";

const ESC_2024 =
  "https://www.escardio.org/guidelines/clinical-practice-guidelines/all-esc-practice-guidelines/elevated-blood-pressure-and-hypertension/";
const SEC_ESC_2024 =
  "https://secardiologia.es/images/2023/Gu%C3%ADas/Final_GPC_ESC_2024_PA_elevada_e_hipertensio%CC%81n.pdf";
const FEC_HTA =
  "https://fundaciondelcorazon.com/prevencion/riesgo-cardiovascular/hipertension-tension-alta.html";
const FARMACIA_URGENCIAS =
  "https://www.farmaceuticos.com/tu-farmaceutico-informa/consejos-de-salud/urgencias-farmacia/";

const href = (lang: string, path: string) => `https://www.myglobalhealth.online/spain/${lang}${path}`;
const toolHref = (lang: string) => href(lang, "/tools/blood-pressure-chart");
const chronicHref = (lang: string) => href(lang, "/services/enfermedades-cronicas-online");
const cardioHref = (lang: string) => href(lang, "/services/cardiologo-online");

const es: LocalePost = {
  locale: "ES",
  slug: "tension-alta-sintomas-cuando-urgencias",
  title: "Tensión alta: síntomas y cuándo llamar al 112",
  excerpt:
    "La tensión alta suele no dar síntomas. Sepa cuándo llamar al 112, cómo repetir una lectura sin retrasar ayuda y por qué no debe cambiar la medicación por su cuenta.",
  seoTitle: "Tensión alta: síntomas y cuándo llamar al 112",
  seoDescription:
    "Qué síntomas con tensión alta requieren llamar al 112, cómo repetir una lectura y cuándo pedir atención primaria sin automedicarse.",
  category: "Medicina general",
  article: {
    lang: "es-ES",
    tagline: "Medicina a cualquier hora, en cualquier lugar",
    categoryLabel: "Medicina general",
    categoryHref: href("es", "/blog"),
    eyebrow: "España · Guía de seguridad",
    h1: "Tensión alta: síntomas y cuándo llamar al 112",
    deck: "Los síntomas súbitos deciden la respuesta.",
    intro:
      "La <strong>tensión alta suele ser silenciosa</strong>: sentirse bien no descarta hipertensión y un dolor de cabeza aislado no la confirma. Llame al <strong>112</strong> si una lectura alta coincide con dolor u opresión en el pecho, falta de aire intensa, debilidad o pérdida de sensibilidad de un lado, dificultad para hablar, confusión, desmayo, pérdida súbita de visión o un dolor de cabeza repentino y muy intenso. No conduzca. Si no hay señales de alarma, descanse unos minutos, repita correctamente una vez y pida valoración sanitaria rápida si la lectura sigue alrededor de 180/120 mmHg o más. No duplique dosis ni tome medicación prestada.",
    facts: [
      "La hipertensión suele no dar síntomas",
      "Síntomas torácicos, respiratorios o neurológicos: 112",
      "No cambie dosis sin un plan personal",
    ],
    primaryCta: { label: "Consulta de medicina general", href: chronicHref("es") },
    secondaryCta: { label: "Registrar mis lecturas", href: toolHref("es") },
    panelChip: "Decida por seguridad",
    panelParas: [
      "Una lectura aislada puede alterarse por dolor, esfuerzo, ansiedad o una técnica incorrecta.",
      "Los signos de posible ictus, infarto o edema pulmonar requieren 112 aunque una segunda lectura sea menor.",
    ],
    author: {
      initials: "FM",
      name: "Dr. Fidel Ernesto Mesa Prado",
      line: "Médico Especialista en Cardiología · Global Health España",
    },
    reviewLine: "Revisión clínica y editorial en español de España obligatoria antes de la publicación.",
    navLabel: "En este artículo",
    sections: [
      {
        id: "sintomas",
        nav: "Síntomas",
        eyebrow: "Primera distinción",
        h2: "¿La tensión alta siempre da síntomas?",
        blocks: [
          lead("No. Muchas personas tienen cifras elevadas sin notar nada. La medición repetida, no las sensaciones, permite valorar si existe hipertensión."),
          p("Cefalea, mareo, palpitaciones o visión borrosa pueden aparecer durante una lectura alta, pero también con dolor, ansiedad, esfuerzo o una mala técnica. No atribuya un síntoma nuevo al nerviosismo sin valorar su gravedad."),
          p("Separe dos preguntas: cifras altas repetidas durante días requieren evaluación programada; síntomas bruscos torácicos, respiratorios, neurológicos o visuales priorizan el 112."),
          cite('La <a href="https://www.saludcastillayleon.es/escueladepacientes/es/enfermedades/hipertension-arterial-hta" rel="nofollow noopener" target="_blank">Escuela de Pacientes de Castilla y León</a> explica que la hipertensión suele ser silenciosa y se diagnostica con mediciones repetidas.'),
        ],
      },
      {
        id: "112",
        nav: "Llamar al 112",
        eyebrow: "Señales de alarma",
        h2: "Cuándo llamar al 112 por una tensión alta",
        blocks: [
          lead("Llame al 112 ante síntomas súbitos compatibles con afectación del corazón, el cerebro, los pulmones o la circulación. No retrase la llamada para seguir midiendo."),
          ul([
            "Dolor u opresión intensa en el pecho, sobre todo con sudor, náuseas o dolor hacia brazo, espalda, cuello o mandíbula.",
            "Falta de aire importante, sensación de ahogo o deterioro rápido de la respiración.",
            "Cara desviada, pérdida de fuerza o sensibilidad de un lado, habla extraña o dificultad para entender.",
            "Confusión nueva, convulsión, desmayo o disminución del nivel de conciencia.",
            "Pérdida súbita de visión o dolor de cabeza explosivo y diferente de los habituales.",
          ]),
          p("No conduzca. Anote la hora en que comenzaron los síntomas, tenga a mano la lista de medicamentos y siga las instrucciones del 112. Una cifra algo menor al repetirla no anula un posible ictus o infarto."),
          cite('La <a href="https://www.comunidad.madrid/salud/codigo-ictus" rel="nofollow noopener" target="_blank">Comunidad de Madrid</a> considera el ictus una emergencia y enumera debilidad de un lado, dificultad para hablar, pérdida brusca de visión y cefalea súbita entre sus señales.'),
        ],
      },
      {
        id: "sin-alarmas",
        nav: "Sin alarmas",
        eyebrow: "Medición segura",
        h2: "Qué hacer si la cifra es muy alta pero no hay señales de alarma",
        blocks: [
          lead("Si está estable, siéntese, respire con normalidad y repita la medición una vez tras unos minutos de reposo."),
          ul([
            "Apoye espalda y pies; no cruce las piernas.",
            "Coloque un manguito adecuado sobre el brazo desnudo y apóyelo a la altura del corazón.",
            "No hable durante la medición. Anote las dos cifras, el pulso, la hora y cómo se encontraba.",
            "Si el resultado persiste alrededor de 180/120 mmHg o más, busque valoración sanitaria urgente el mismo día.",
          ]),
          p("Una cifra muy alta sin síntomas no descarta lesión de órgano. Si aparece una señal de alarma, llame al 112."),
          p('El <a href="' + toolHref("es") + '">registro de tensión arterial</a> sirve para ordenar mediciones estables y enseñarlas a un profesional. No debe usarse para retrasar urgencias ni para decidir una dosis.'),
          warn("No se automedique", "No duplique, adelante ni combine antihipertensivos. No tome captopril, nifedipino u otra pastilla prestada. Solo siga una pauta de rescate si su propio médico la dejó indicada para usted y para esta situación."),
        ],
      },
      {
        id: "seguimiento",
        nav: "Seguimiento",
        eyebrow: "Atención estable",
        h2: "La hipertensión estable empieza en medicina general",
        blocks: [
          lead("La mayoría de los casos estables se valoran y siguen en atención primaria. No necesita cardiología como primera puerta por una lectura aislada sin señales de alarma."),
          p('En una <a href="' + chronicHref("es") + '">consulta de medicina general y enfermedades crónicas</a> pueden revisar la técnica, el registro, la medicación y riesgos como diabetes o enfermedad renal. También pueden indicar análisis, ECG o valoración presencial.'),
          p('La <a href="' + cardioHref("es") + '">consulta de cardiología</a> es una escalada razonable si hay cardiopatía conocida, pruebas anormales, síntomas cardiovasculares, hipertensión resistente o una derivación desde atención primaria. No sustituye al 112.'),
          p('Puede consultar los <a href="' + href("es", "/doctors") + '">médicos disponibles en España</a> o <a href="' + href("es", "/contact") + '">contactar con Global Health</a> si está estable.'),
        ],
      },
      {
        id: "preparar-cita",
        nav: "Preparar la cita",
        eyebrow: "Información útil",
        h2: "Qué llevar a la consulta si no es una urgencia",
        blocks: [
          lead("Lleve lecturas recientes, su lista de medicamentos y los informes que ya tenga."),
        ],
      },
    ],
    linksEyebrow: "Global Health España",
    linksH2: "Siguientes pasos si está estable",
    linksLead:
      "Lleve lecturas, medicamentos e informes para valorar el patrón completo.",
    links: [
      { label: "Medicina general y enfermedades crónicas", href: chronicHref("es") },
      { label: "Registro de tensión arterial", href: toolHref("es") },
      { label: "Cardiología, si necesita escalada", href: cardioHref("es") },
      { label: "Médicos en España", href: href("es", "/doctors") },
    ],
    ctaBox: {
      h3: "¿Tiene lecturas repetidamente altas sin señales de alarma?",
      text: "Empiece por medicina general con su registro y medicación. Si aparece dolor torácico, falta de aire o un síntoma neurológico súbito, llame al 112.",
      primary: { label: "Consulta de medicina general", href: chronicHref("es") },
      secondary: { label: "Ver médicos", href: href("es", "/doctors") },
    },
    sourcesEyebrow: "Fuentes clínicas",
    sourcesH2: "Fuentes utilizadas",
    sourcesLead:
      "La seguridad depende de distinguir una lectura elevada de síntomas compatibles con daño agudo.",
    sources: [
      { label: "ESC 2024 — presión arterial elevada e hipertensión", href: ESC_2024 },
      {
        label: "Castilla y León — hipertensión arterial",
        href: "https://www.saludcastillayleon.es/escueladepacientes/es/enfermedades/hipertension-arterial-hta",
      },
      { label: "Comunidad de Madrid — Código Ictus", href: "https://www.comunidad.madrid/salud/codigo-ictus" },
      { label: "Castilla y León — dolor torácico y 112", href: "https://www.saludcastillayleon.es/es/asistencia-sanitaria/urgencias-emergencias/emergencias-sanitarias-castilla-leon/actuar/dolor-toracico-origen-cardiaco" },
    ],
    sourcesNote:
      "Información general. No permite diagnosticar ni tratar una emergencia a distancia.",
    faqEyebrow: "FAQ",
    faqH2: "Preguntas sobre tensión alta y urgencias",
    faqs: [
      {
        q: "¿Qué síntomas da la tensión alta?",
        a: "A menudo ninguno. Cefalea, mareo o visión borrosa no son específicos. La hipertensión se valora con mediciones repetidas; la urgencia depende de la cifra, el inicio y las señales de posible daño agudo.",
      },
      {
        q: "¿Con 180/120 tengo que llamar al 112?",
        a: "Llame al 112 si esa cifra coincide con dolor torácico, falta de aire, síntomas neurológicos, confusión, desmayo, pérdida visual o cefalea súbita intensa. Sin esos síntomas, repita una vez bien y busque valoración urgente el mismo día si persiste.",
      },
      {
        q: "¿Puedo tomar una dosis extra para bajarla?",
        a: "No sin una pauta personal explícita. Duplicar, adelantar o mezclar antihipertensivos puede causar una bajada peligrosa y no trata por sí solo una posible lesión aguda.",
      },
      {
        q: "¿Quién controla una hipertensión estable?",
        a: "Medicina general o atención primaria suele coordinar mediciones, análisis y tratamiento. Cardiología se añade si hay cardiopatía, pruebas anormales, mal control persistente o una derivación.",
      },
    ],
    disclaimerTitle: "Aviso médico",
    disclaimer:
      "Información general, no diagnóstico ni pauta de tratamiento. No cambie medicamentos o dosis por su cuenta. Borrador preparado con asistencia de IA; exige revisión clínica y editorial en español de España antes de publicarse. Ante dolor torácico, falta de aire, síntomas neurológicos, confusión, desmayo o pérdida súbita de visión, llame al 112.",
  } satisfies Article,
};

const en: LocalePost = {
  locale: "EN",
  slug: "high-blood-pressure-symptoms-emergency-spain",
  title: "High blood pressure: symptoms and when to seek emergency care in Spain",
  excerpt:
    "High blood pressure often causes no symptoms. Learn which warning signs mean call 112, what to do with a very high reading and why not to self-medicate.",
  seoTitle: "High blood pressure symptoms: when to call 112",
  seoDescription:
    "High blood pressure symptoms, signs of acute organ damage, when to call 112 in Spain, and what to do without extra doses or home remedies.",
  category: "Cardiology",
  article: {
    lang: "en-GB",
    tagline: "Medicine Anytime, Anywhere",
    categoryLabel: "Cardiology",
    categoryHref: href("en", "/blog"),
    eyebrow: "Spain · Emergency guide",
    h1: "High blood pressure symptoms and emergencies",
    deck: "A high number matters, but signs of acute organ injury are what turn a reading into a medical emergency.",
    intro:
      "<strong>High blood pressure usually has no symptoms.</strong> You cannot confirm or rule it out by how you feel. The urgent question is different. If a very high reading occurs with <strong>chest pain, severe breathlessness, one-sided weakness or numbness, trouble speaking, confusion, collapse, sudden loss of vision or a sudden severe headache</strong>, call <strong>112 in Spain</strong>. These can be signs of acute injury to the heart, brain, lungs, eyes or major blood vessels. Do not wait for tea or garlic to work, and do not take an extra prescription dose unless your own clinician has given you a specific written plan for that exact situation.",
    facts: ["Hypertension is often silent", "Warning signs with a high reading: call 112", "Never improvise an extra dose"],
    primaryCta: { label: "General practice review", href: chronicHref("en") },
    secondaryCta: { label: "Cardiology review", href: cardioHref("en") },
    panelChip: "What this guide helps you decide",
    panelParas: [
      "Which sudden symptoms may indicate acute organ injury and should bypass a video appointment completely.",
      "Why a very high reading without symptoms still needs prompt assessment, even though it is not automatically a hypertensive emergency.",
      "What to do while seeking help and why borrowed tablets, extra doses and folk remedies can add risk.",
      "When routine follow-up belongs in general practice and when a cardiologist can add value.",
    ],
    author: { initials: "FM", name: "Dr. Fidel Ernesto Mesa Prado", line: "Specialist in Cardiology · Global Health Spain" },
    reviewLine: "Clinically reviewed by Dr. Eduardo Daniel Rodríguez Olivas, general practitioner, Global Health Spain.",
    navLabel: "In this guide",
    sections: [
      {
        id: "symptoms",
        nav: "Symptoms",
        eyebrow: "First principle",
        h2: "What symptoms can high blood pressure cause?",
        blocks: [
          lead("The honest answer is that it usually causes none. Measuring it is the only way to know the number."),
          p("Headache, dizziness, ringing in the ears, nosebleed, palpitations or blurred vision can occur when pressure rises, but none is specific. The same symptoms occur with anxiety, migraine, fever, pain, dehydration, sleep loss and many other problems. Feeling perfectly well is not reassuring either: blood pressure can remain raised for years without announcing itself."),
          p("Separate two questions. ‘Do I have hypertension?’ needs repeated measurements and clinical assessment. ‘Could something dangerous be happening now?’ requires a search for acute warning signs and an assessment of the whole situation."),
          ul([
            "A familiar headache does not prove that blood pressure is its cause.",
            "Dizziness does not prove the pressure is high; it can also occur when pressure is low.",
            "Pain or panic may temporarily raise a reading, but an extreme result still deserves attention.",
            "Sudden neurological, breathing or chest symptoms change the priority immediately.",
          ]),
          cite(`The <a href="${FEC_HTA}" rel="nofollow noopener" target="_blank">Spanish Heart Foundation</a> describes hypertension as a largely silent condition detected by measurement.`),
        ],
      },
      {
        id: "emergency",
        nav: "Emergency",
        eyebrow: "The critical distinction",
        h2: "A very high reading does not always mean the same emergency",
        blocks: [
          lead("A hypertensive emergency is not defined by the number alone. It means severe elevation accompanied by acute organ injury or symptoms that suggest it."),
          p("You cannot confirm organ injury at home. Clinicians may need an examination, ECG, blood and urine tests, an eye examination or imaging to assess the heart, brain, kidneys, retina and aorta. What you can recognise is a group of warning signs that should be treated as dangerous until assessed."),
          p("A repeated reading around 180/120 mmHg or above is markedly high. With no warning symptoms it is not automatically an organ-damage emergency, but it still needs prompt same-day medical advice. With warning symptoms, stop repeatedly checking the monitor and call 112."),
          warn("Do not try to label ‘urgency’ versus ‘emergency’ yourself", "No pain does not prove that organs are safe, and a lower number does not rule out stroke, an acute coronary syndrome or an aortic emergency. Sudden symptoms and change from normal matter as much as the reading."),
          cite(`The <a href="${ESC_2024}" rel="nofollow noopener" target="_blank">2024 ESC guideline</a> distinguishes markedly elevated blood pressure from a hypertensive emergency with acute organ damage.`),
        ],
      },
      {
        id: "call-112",
        nav: "Call 112",
        eyebrow: "Do not wait",
        h2: "When to call 112 for high blood pressure in Spain",
        blocks: [
          lead("Call 112 when a high reading occurs with sudden symptoms involving the chest, breathing, brain, vision or circulation."),
          ul([
            "Chest pain, pressure or burning, especially with cold sweat, nausea or pain into an arm, back, neck or jaw.",
            "Severe breathlessness, laboured breathing, choking at rest or coughing pink froth.",
            "A drooping face, one-sided weakness or numbness, or new trouble speaking, understanding, walking or coordinating movement.",
            "New confusion, a seizure, fainting or reduced consciousness.",
            "Sudden loss of vision, new double vision or an explosive headache unlike your usual headaches.",
            "Sudden tearing pain in the chest, back or abdomen, or rapid deterioration during pregnancy or after delivery.",
          ]),
          p("Do not drive yourself if you have neurological symptoms, chest pain, breathlessness, visual disturbance or fainting. Note the time symptoms began, unlock the door if you are alone and keep your medication list nearby. Follow the emergency operator’s instructions."),
          cite(`Spain’s <a href="${FARMACIA_URGENCIAS}" rel="nofollow noopener" target="_blank">General Council of Pharmacists</a> includes hypertensive crises in its community-pharmacy urgent referral guidance.`),
        ],
      },
      {
        id: "what-to-do",
        nav: "What to do",
        eyebrow: "If you are stable",
        h2: "What to do with a very high reading and no warning symptoms",
        blocks: [
          lead("If you feel stable and have none of the warning signs, sit quietly for a few minutes and repeat the measurement once using proper technique."),
          ul([
            "Support your back and feet, keep legs uncrossed and rest the arm at heart level.",
            "Make sure the cuff fits and sits on bare skin rather than clothing.",
            "Do not talk during the measurement; record both numbers, the time and any symptoms.",
            "If the repeat remains around 180/120 mmHg or higher, obtain urgent same-day medical assessment even if you feel well.",
            "If a warning sign begins while you wait, change course and call 112.",
          ]),
          p(`For non-urgent follow-up, organise readings with the <a href="${toolHref("en")}">blood pressure record</a>. It is not a dose calculator and must never delay emergency care. Its purpose is to give a clinician a clearer pattern later.`),
          p("If the repeat is lower, keep the first result. Arrange review if the event was new, keeps recurring or came with symptoms. A video appointment can review stable readings and history, but cannot examine an emergency or replace tests that require an in-person setting."),
        ],
      },
      {
        id: "myths",
        nav: "Remedies and tablets",
        eyebrow: "Avoid extra harm",
        h2: "Herbal tea, garlic, lemon and tablets: what not to do",
        blocks: [
          lead("No folk remedy reliably treats a possible hypertensive emergency, and forcing the number down rapidly can be unsafe."),
          p("People search for herbal teas, garlic, lemon, cold water or breathing techniques because they want an immediate action. Sitting and breathing calmly while arranging help is reasonable, but it does not treat a stroke, heart attack, pulmonary oedema or aortic injury. Large amounts of water, salt, alcohol or herbal products can also conflict with other conditions and medicines."),
          p("Do not take someone else’s captopril, nifedipine or other antihypertensive. Do not double a dose, take the next dose early or revive an old ‘rescue’ instruction unless your own clinician has set out an individual plan for this exact situation. A sudden fall can reduce blood flow to organs already at risk."),
          warn("Natural does not mean suitable for an emergency", "A tea may be part of your normal diet, but it is not an alternative to 112, clinical assessment or prescribed treatment. The immediate task is to recognise acute injury, not to race the monitor."),
        ],
      },
      {
        id: "follow-up",
        nav: "Follow-up",
        eyebrow: "After the episode",
        h2: "When to start with a GP and when cardiology helps",
        blocks: [
          lead("General practice coordinates most stable cases; cardiology helps when control remains difficult, symptoms persist or tests suggest cardiovascular disease."),
          p(`A <a href="${chronicHref("en")}">general practice and chronic-care appointment</a> can review measurement technique, home records, current prescriptions, adherence, side effects and related risks such as diabetes, kidney disease, cholesterol or weight. That is the right route when no emergency signs are present.`),
          p(`An <a href="${cardioHref("en")}">online cardiology appointment in Spain</a> can help interpret an existing ECG, Holter report, echocardiogram or hospital letter and assess difficult-to-control hypertension. It cannot replace emergency care or hands-on investigations.`),
          p(`You can also view the <a href="${href("en", "/doctors")}">medical team in Spain</a> or <a href="${href("en", "/contact")}">contact Global Health Spain</a> if you are unsure which appointment fits. If warning signs are present, use 112 instead.`),
        ],
      },
    ],
    linksEyebrow: "Global Health Spain",
    linksH2: "Next steps when this is not an emergency",
    linksLead: "Bring a short set of properly taken readings, your medication list and available reports. That gives the clinician a pattern rather than one frightening number.",
    links: [
      { label: "General practice and chronic care", href: chronicHref("en") },
      { label: "Online cardiology in Spain", href: cardioHref("en") },
      { label: "Blood pressure record", href: toolHref("en") },
      { label: "Doctors in Spain", href: href("en", "/doctors") },
      { label: "Contact Global Health Spain", href: href("en", "/contact") },
    ],
    ctaBox: {
      h3: "Are high readings recurring without emergency symptoms?",
      text: "Start with general practice for the complete pattern. If control remains difficult or cardiac tests are abnormal, cardiology can extend the assessment.",
      primary: { label: "Book general practice", href: chronicHref("en") },
      secondary: { label: "Book cardiology", href: cardioHref("en") },
    },
    sourcesEyebrow: "Clinical sources",
    sourcesH2: "Sources used for this guide",
    sourcesLead: "The distinction between a high reading and acute organ damage should come from clinical guidance, not viral advice.",
    sources: [
      { label: "ESC 2024 — elevated blood pressure and hypertension", href: ESC_2024 },
      { label: "Spanish Society of Cardiology — ESC 2024 guide", href: SEC_ESC_2024 },
      { label: "Spanish Heart Foundation — hypertension", href: FEC_HTA },
      { label: "General Council of Pharmacists — emergencies", href: FARMACIA_URGENCIAS },
    ],
    sourcesNote: "External resources open in a new tab. This guide cannot diagnose or treat an emergency remotely. Call 112 when warning symptoms are present.",
    faqEyebrow: "FAQ",
    faqH2: "Questions about high blood pressure and emergencies",
    faqs: [
      { q: "What symptoms does high blood pressure cause?", a: "Often none. Headache, dizziness, palpitations and blurred vision can occur but are not specific. Measurement identifies the number; the combination of reading, sudden onset and signs of acute organ injury determines urgency." },
      { q: "Should I call 112 for a reading of 180/120?", a: "Call 112 if it comes with chest pain, breathlessness, neurological symptoms, confusion, fainting, sudden visual loss or a sudden severe headache. Without these symptoms, repeat once correctly and seek urgent same-day assessment if it persists." },
      { q: "Can I take an extra blood pressure tablet?", a: "Not unless your own clinician has given you a specific plan for that exact situation. Doubling, advancing or combining medicines can cause a dangerous fall and does not by itself treat possible organ injury." },
      { q: "Will herbal tea or garlic lower it quickly?", a: "They are not reliable treatments for an acute rise and never replace 112 or clinical assessment. Home remedies may delay care, and some herbal products interact with medicines or existing disease." },
      { q: "Can an online appointment deal with a high reading?", a: "It can review a stable home record and arrange follow-up, but it cannot examine acute organ injury. Warning signs require 112 or in-person emergency care; without them, general practice is usually the first step." },
    ],
    disclaimerTitle: "Medical notice",
    disclaimer: "Written by Dr. Fidel Ernesto Mesa Prado, specialist in Cardiology at Global Health Spain, and clinically reviewed by Dr. Eduardo Daniel Rodríguez Olivas, general practitioner. AI-assisted content requiring native editorial and final clinical approval before publication. It does not replace individual assessment. Do not change a medicine or dose without your clinician’s plan. Call 112 for chest pain, severe breathlessness, neurological symptoms, confusion, collapse or sudden loss of vision.",
  } satisfies Article,
};

const de: LocalePost = {
  locale: "DE",
  slug: "hoher-blutdruck-symptome-notfall-spanien",
  title: "Hoher Blutdruck: Symptome und wann Sie in Spanien den Notruf wählen",
  excerpt: "Hoher Blutdruck verursacht oft keine Beschwerden. Welche Warnzeichen den Notruf 112 erfordern, was bei einem sehr hohen Wert zu tun ist und warum Selbstmedikation riskant ist.",
  seoTitle: "Hoher Blutdruck: Symptome und Notfallzeichen",
  seoDescription: "Symptome bei hohem Blutdruck, Zeichen akuter Organschäden, wann Sie in Spanien 112 wählen und was Sie ohne Zusatzdosis tun können.",
  category: "Kardiologie",
  article: {
    lang: "de-DE",
    tagline: "Medizin jederzeit und überall",
    categoryLabel: "Kardiologie",
    categoryHref: href("de", "/blog"),
    eyebrow: "Spanien · Notfallratgeber",
    h1: "Hoher Blutdruck: Symptome und Notfälle",
    deck: "Ein hoher Messwert ist wichtig. Zum Notfall wird die Situation vor allem durch Zeichen einer akuten Organschädigung.",
    intro: "<strong>Hoher Blutdruck verursacht meistens keine Symptome.</strong> Das eigene Befinden kann ihn weder bestätigen noch ausschließen. Dringend wird es, wenn ein sehr hoher Wert zusammen mit <strong>Brustschmerz, schwerer Atemnot, einseitiger Schwäche oder Taubheit, Sprachstörung, Verwirrtheit, Bewusstlosigkeit, plötzlichem Sehverlust oder einem schlagartig einsetzenden starken Kopfschmerz</strong> auftritt. Wählen Sie dann in Spanien <strong>112</strong>. Solche Zeichen können auf eine akute Schädigung von Herz, Gehirn, Lunge, Augen oder großen Gefäßen hindeuten. Warten Sie nicht auf Hausmittel und nehmen Sie keine zusätzliche Dosis eines verschreibungspflichtigen Medikaments, sofern Ihre eigene Ärztin oder Ihr eigener Arzt dafür keinen individuellen Plan festgelegt hat.",
    facts: ["Hypertonie bleibt oft symptomlos", "Warnzeichen plus hoher Wert: 112", "Keine Dosis eigenmächtig erhöhen"],
    primaryCta: { label: "Hausärztliche Sprechstunde", href: chronicHref("de") },
    secondaryCta: { label: "Kardiologische Sprechstunde", href: cardioHref("de") },
    panelChip: "Was dieser Ratgeber klärt",
    panelParas: [
      "Welche plötzlichen Beschwerden auf eine akute Organschädigung hindeuten und keine Videosprechstunde dulden.",
      "Warum ein sehr hoher Wert ohne Beschwerden trotzdem rasch abgeklärt werden muss, aber nicht automatisch eine hypertensive Notfallsituation bedeutet.",
      "Was Sie während der Hilfesuche tun können und warum geliehene Tabletten, Zusatzdosen und Hausmittel schaden können.",
      "Wann die Hausarztmedizin zuständig ist und wann Kardiologie die Abklärung sinnvoll ergänzt.",
    ],
    author: { initials: "FM", name: "Dr. Fidel Ernesto Mesa Prado", line: "Facharzt für Kardiologie · Global Health Spanien" },
    reviewLine: "Klinisch geprüft von Dr. Eduardo Daniel Rodríguez Olivas, Allgemeinmediziner, Global Health Spanien.",
    navLabel: "In diesem Ratgeber",
    sections: [
      {
        id: "symptome",
        nav: "Symptome",
        eyebrow: "Grundsatz",
        h2: "Welche Symptome kann hoher Blutdruck verursachen?",
        blocks: [
          lead("Die ehrliche Antwort lautet: meistens keine. Nur eine Messung zeigt, wie hoch der Blutdruck tatsächlich ist."),
          p("Kopfschmerz, Schwindel, Ohrgeräusche, Nasenbluten, Herzklopfen oder verschwommenes Sehen können bei einem Anstieg vorkommen, sind aber unspezifisch. Dieselben Beschwerden entstehen bei Angst, Migräne, Fieber, Schmerzen, Flüssigkeitsmangel oder Schlafmangel. Auch völlige Beschwerdefreiheit beruhigt nicht: Erhöhte Werte können jahrelang unbemerkt bleiben."),
          p("Trennen Sie deshalb zwei Fragen. Ob eine Hypertonie vorliegt, klären wiederholte Messungen und eine ärztliche Beurteilung. Ob jetzt etwas Gefährliches geschieht, hängt von plötzlich auftretenden Warnzeichen und der Gesamtsituation ab."),
          ul(["Ein bekannter Kopfschmerz beweist nicht, dass der Blutdruck die Ursache ist.", "Schwindel beweist keinen hohen Wert; er kann auch bei niedrigem Blutdruck auftreten.", "Schmerz oder Panik können vorübergehend erhöhen, ein extrem hoher Wert bleibt dennoch relevant.", "Plötzliche neurologische, respiratorische oder thorakale Beschwerden ändern die Dringlichkeit sofort."]),
          cite(`Die <a href="${FEC_HTA}" rel="nofollow noopener" target="_blank">Spanische Herzstiftung</a> beschreibt Hypertonie als überwiegend symptomlose Erkrankung, die durch Messung erkannt wird.`),
        ],
      },
      {
        id: "notfall",
        nav: "Notfall",
        eyebrow: "Der wichtige Unterschied",
        h2: "Ein sehr hoher Wert bedeutet nicht immer denselben Notfall",
        blocks: [
          lead("Eine hypertensive Notfallsituation wird nicht allein durch die Zahl definiert, sondern durch die Kombination mit akuter Organschädigung oder entsprechenden Symptomen."),
          p("Zu Hause lässt sich eine Organschädigung nicht sicher feststellen. In der Klinik können Untersuchung, EKG, Blut- und Urintests, Augenhintergrund oder Bildgebung nötig sein, um Herz, Gehirn, Nieren, Netzhaut und Aorta zu beurteilen. Erkennbar sind jedoch Warnzeichen, die bis zur Abklärung als gefährlich gelten müssen."),
          p("Ein korrekt wiederholter Wert um 180/120 mmHg oder höher ist deutlich erhöht. Ohne Warnzeichen liegt nicht automatisch eine akute Organschädigung vor, dennoch ist eine dringende ärztliche Beurteilung am selben Tag nötig. Mit Warnzeichen messen Sie nicht immer weiter, sondern wählen 112."),
          warn("Versuchen Sie nicht, Dringlichkeit und Notfall selbst zu unterscheiden", "Schmerzfreiheit schließt eine Schädigung nicht aus. Ein niedrigerer Messwert schließt Schlaganfall, akutes Koronarsyndrom oder einen Aortennotfall ebenfalls nicht aus. Plötzliche Symptome sind ebenso wichtig wie die Zahl."),
          cite(`Die <a href="${ESC_2024}" rel="nofollow noopener" target="_blank">ESC-Leitlinie 2024</a> unterscheidet stark erhöhte Werte von der hypertensiven Notfallsituation mit akuter Organschädigung.`),
        ],
      },
      {
        id: "notruf-112",
        nav: "Notruf 112",
        eyebrow: "Nicht abwarten",
        h2: "Wann Sie in Spanien 112 wählen sollten",
        blocks: [
          lead("Wählen Sie 112, wenn ein hoher Blutdruckwert zusammen mit plötzlich einsetzenden Beschwerden an Brust, Atmung, Nervensystem, Sehen oder Kreislauf auftritt."),
          ul(["Brustschmerz, Druck oder Brennen, besonders mit kaltem Schweiß, Übelkeit oder Ausstrahlung in Arm, Rücken, Hals oder Kiefer.", "Starke Atemnot, angestrengte Atmung, Erstickungsgefühl in Ruhe oder rosiger Schaum beim Husten.", "Hängender Mundwinkel, einseitige Schwäche oder Taubheit, neue Sprach-, Verständnis-, Gang- oder Koordinationsstörung.", "Neue Verwirrtheit, Krampfanfall, Ohnmacht oder Bewusstseinstrübung.", "Plötzlicher Sehverlust, neue Doppelbilder oder explosionsartiger, ungewohnter Kopfschmerz.", "Plötzlich reißender Schmerz in Brust, Rücken oder Bauch oder rasche Verschlechterung in Schwangerschaft beziehungsweise Wochenbett."]),
          p("Fahren Sie bei neurologischen Beschwerden, Brustschmerz, Atemnot, Sehstörung oder Ohnmacht nicht selbst. Merken Sie sich den Beginn, öffnen Sie allein zu Hause die Tür und halten Sie Ihre Medikamentenliste bereit. Folgen Sie den Anweisungen der Leitstelle."),
          cite(`Der <a href="${FARMACIA_URGENCIAS}" rel="nofollow noopener" target="_blank">Spanische Apothekerverband</a> führt hypertensive Krisen in seinen Empfehlungen zur dringlichen Weiterleitung aus der öffentlichen Apotheke.`),
        ],
      },
      {
        id: "vorgehen",
        nav: "Was tun?",
        eyebrow: "Wenn Sie stabil sind",
        h2: "Was Sie bei einem sehr hohen Wert ohne Warnzeichen tun",
        blocks: [
          lead("Wenn Sie sich stabil fühlen und kein Warnzeichen vorliegt, setzen Sie sich ruhig hin und wiederholen Sie die Messung nach einigen Minuten einmal mit korrekter Technik."),
          ul(["Rücken und Füße abstützen, Beine nicht kreuzen und den Arm auf Herzhöhe lagern.", "Passende Manschette direkt auf der Haut verwenden.", "Während der Messung nicht sprechen; beide Werte, Uhrzeit und Beschwerden notieren.", "Bleibt der Wert um 180/120 mmHg oder höher, noch am selben Tag dringend ärztlich abklären lassen.", "Tritt während des Wartens ein Warnzeichen auf, sofort 112 wählen."]),
          p(`Für eine nicht dringliche Verlaufskontrolle können Sie das <a href="${toolHref("de")}">Blutdruckprotokoll</a> nutzen. Es berechnet keine Medikamentendosis und darf einen Notruf niemals verzögern. Es dient später der ärztlichen Beurteilung des Verlaufs.`),
          p("Sinkt der zweite Wert, löschen Sie den ersten nicht. Lassen Sie einen neuen, wiederkehrenden oder von Beschwerden begleiteten Anstieg prüfen. Eine Videosprechstunde kann stabile Verläufe einordnen, aber weder einen Notfall untersuchen noch Präsenzdiagnostik ersetzen."),
        ],
      },
      {
        id: "mythen",
        nav: "Hausmittel",
        eyebrow: "Zusätzlichen Schaden vermeiden",
        h2: "Tee, Knoblauch, Zitrone und Tabletten: Was Sie nicht tun sollten",
        blocks: [
          lead("Kein Hausmittel behandelt zuverlässig eine mögliche hypertensive Notfallsituation, und ein erzwungener schneller Blutdruckabfall kann gefährlich sein."),
          p("Tee, Knoblauch, Zitrone, kaltes Wasser oder Atemübungen werden gesucht, weil Betroffene sofort handeln möchten. Ruhiges Sitzen und Atmen während der Hilfesuche ist sinnvoll, behandelt aber weder Schlaganfall noch Herzinfarkt, Lungenödem oder Aortenverletzung. Große Mengen Wasser, Salz, Alkohol oder Kräuterprodukte können zudem mit Erkrankungen und Medikamenten kollidieren."),
          p("Nehmen Sie kein Captopril, Nifedipin oder anderes Blutdruckmittel einer anderen Person. Verdoppeln Sie keine Dosis, ziehen Sie die nächste nicht vor und verwenden Sie keine alte Notfallanweisung, außer Ihre eigene Ärztin oder Ihr eigener Arzt hat genau dafür einen individuellen Plan erstellt. Ein abrupter Abfall kann die Durchblutung gefährdeter Organe weiter verschlechtern."),
          warn("Natürlich bedeutet nicht notfallgeeignet", "Ein Tee darf Teil der normalen Ernährung sein, ersetzt aber weder 112 noch Untersuchung und verordnete Therapie. Im Moment zählt das Erkennen akuter Schäden, nicht ein Wettlauf mit dem Messgerät."),
        ],
      },
      {
        id: "nachsorge",
        nav: "Nachsorge",
        eyebrow: "Nach dem Ereignis",
        h2: "Wann Hausarztmedizin reicht und wann Kardiologie hilft",
        blocks: [
          lead("Stabile Fälle werden meist hausärztlich koordiniert; Kardiologie ergänzt bei schwieriger Einstellung, Beschwerden oder auffälligen Herz-Kreislauf-Befunden."),
          p(`In einer <a href="${chronicHref("de")}">hausärztlichen Sprechstunde für chronische Erkrankungen</a> lassen sich Messtechnik, Heimprotokoll, verordnete Medikamente, Einnahmetreue, Nebenwirkungen sowie Diabetes, Nierenfunktion, Cholesterin und Gewicht gemeinsam prüfen. Das ist ohne Notfallzeichen der passende Einstieg.`),
          p(`Eine <a href="${cardioHref("de")}">kardiologische Videosprechstunde in Spanien</a> kann vorhandene EKG-, Langzeit-EKG- oder Echokardiografieberichte einordnen und bei schwer einstellbarer Hypertonie weiterhelfen. Notfallversorgung und Untersuchungen vor Ort ersetzt sie nicht.`),
          p(`Sie können auch das <a href="${href("de", "/doctors")}">Ärzteteam in Spanien</a> ansehen oder <a href="${href("de", "/contact")}">Global Health Spanien kontaktieren</a>. Bei Warnzeichen gilt stattdessen: 112.`),
        ],
      },
    ],
    linksEyebrow: "Global Health Spanien",
    linksH2: "Nächste Schritte, wenn kein Notfall vorliegt",
    linksLead: "Bringen Sie korrekt gemessene Werte, Ihre Medikamentenliste und vorhandene Befunde mit. So entsteht ein Verlauf statt einer einzelnen beunruhigenden Zahl.",
    links: [
      { label: "Hausärztliche Betreuung chronischer Erkrankungen", href: chronicHref("de") },
      { label: "Kardiologie online in Spanien", href: cardioHref("de") },
      { label: "Blutdruckprotokoll", href: toolHref("de") },
      { label: "Ärztinnen und Ärzte in Spanien", href: href("de", "/doctors") },
      { label: "Kontakt Global Health Spanien", href: href("de", "/contact") },
    ],
    ctaBox: { h3: "Treten hohe Werte wiederholt ohne Warnzeichen auf?", text: "Beginnen Sie hausärztlich mit dem gesamten Verlauf. Bei schwieriger Einstellung oder auffälligen Herzbefunden kann die Kardiologie ergänzen.", primary: { label: "Hausärztliche Sprechstunde", href: chronicHref("de") }, secondary: { label: "Kardiologische Sprechstunde", href: cardioHref("de") } },
    sourcesEyebrow: "Klinische Quellen",
    sourcesH2: "Quellen dieses Ratgebers",
    sourcesLead: "Die Trennung zwischen erhöhtem Wert und akuter Organschädigung gehört in Leitlinien und Notfallprotokolle, nicht in virale Tipps.",
    sources: [
      { label: "ESC 2024 — erhöhter Blutdruck und Hypertonie", href: ESC_2024 },
      { label: "Spanische Gesellschaft für Kardiologie — ESC 2024", href: SEC_ESC_2024 },
      { label: "Spanische Herzstiftung — Hypertonie", href: FEC_HTA },
      { label: "Spanischer Apothekerverband — Notfälle", href: FARMACIA_URGENCIAS },
    ],
    sourcesNote: "Externe Quellen öffnen in einem neuen Tab. Dieser Ratgeber kann einen Notfall nicht aus der Ferne diagnostizieren oder behandeln. Bei Warnzeichen wählen Sie 112.",
    faqEyebrow: "FAQ",
    faqH2: "Häufige Fragen zu hohem Blutdruck und Notfällen",
    faqs: [
      { q: "Welche Symptome verursacht hoher Blutdruck?", a: "Oft gar keine. Kopfschmerz, Schwindel, Herzklopfen oder verschwommenes Sehen können vorkommen, sind aber unspezifisch. Die Messung zeigt die Zahl; Dringlichkeit entsteht aus Messwert, plötzlichem Beginn und Zeichen akuter Organschädigung." },
      { q: "Muss ich bei 180/120 den Notruf 112 wählen?", a: "Mit Brustschmerz, Atemnot, neurologischen Beschwerden, Verwirrtheit, Ohnmacht, plötzlichem Sehverlust oder schlagartig starkem Kopfschmerz wählen Sie 112. Ohne Warnzeichen einmal korrekt nachmessen und bei anhaltendem Wert noch am selben Tag dringend abklären lassen." },
      { q: "Darf ich eine zusätzliche Blutdrucktablette nehmen?", a: "Nur wenn Ihre eigene Ärztin oder Ihr eigener Arzt dafür einen eindeutigen individuellen Plan gegeben hat. Eigenmächtiges Verdoppeln, Vorziehen oder Kombinieren kann einen gefährlichen Abfall verursachen und behandelt keine mögliche Organschädigung." },
      { q: "Senken Tee oder Knoblauch den Blutdruck schnell?", a: "Sie sind keine zuverlässige Behandlung eines akuten Anstiegs und ersetzen niemals 112 oder eine ärztliche Beurteilung. Hausmittel können Hilfe verzögern; manche Kräuterprodukte interagieren mit Medikamenten." },
      { q: "Kann eine Videosprechstunde einen hohen Wert klären?", a: "Sie kann ein stabiles Heimprotokoll auswerten und die Nachsorge planen, aber keine akute Organschädigung untersuchen. Warnzeichen gehören zum Notruf oder in die Notaufnahme; ohne Warnzeichen ist die Hausarztmedizin meist der erste Schritt." },
    ],
    disclaimerTitle: "Medizinischer Hinweis",
    disclaimer: "Verfasst von Dr. Fidel Ernesto Mesa Prado, Facharzt für Kardiologie bei Global Health Spanien, und klinisch geprüft von Dr. Eduardo Daniel Rodríguez Olivas, Allgemeinmediziner. KI-unterstützter Inhalt, der vor Veröffentlichung muttersprachliche Redaktion und abschließende klinische Freigabe benötigt. Er ersetzt keine individuelle Untersuchung. Ändern Sie Medikamente oder Dosen nicht ohne ärztlichen Plan. Wählen Sie bei Brustschmerz, schwerer Atemnot, neurologischen Symptomen, Verwirrtheit, Ohnmacht oder plötzlichem Sehverlust 112.",
  } satisfies Article,
};

const pt: LocalePost = {
  locale: "PT",
  slug: "tensao-alta-sintomas-quando-ir-urgencias-espanha",
  title: "Tensão alta: sintomas e quando ir às urgências em Espanha",
  excerpt: "A tensão alta costuma ser silenciosa. Saiba quando ligar 112 em Espanha, o que fazer perante um valor muito alto e por que não deve alterar a medicação sozinho.",
  seoTitle: "Tensão alta: sintomas e urgências em Espanha",
  seoDescription: "Sinais de alarme, quando ligar 112 em Espanha e como agir perante tensão muito alta sem doses extra nem remédios caseiros.",
  category: "Cardiologia",
  article: {
    lang: "pt-PT",
    tagline: "Cuidados médicos onde estiver",
    categoryLabel: "Cardiologia",
    categoryHref: href("pt", "/blog"),
    eyebrow: "Espanha · Guia de segurança",
    h1: "Tensão alta: sintomas e urgências",
    deck: "Uma leitura elevada merece atenção; sintomas de lesão aguda determinam quando é uma emergência.",
    intro: "A <strong>tensão alta geralmente não provoca sintomas</strong>. Não é possível confirmar ou excluir hipertensão apenas pela forma como se sente. Em Espanha, se uma leitura muito alta surgir com <strong>dor ou pressão no peito, falta de ar, fraqueza de um lado, fala alterada, confusão, desmaio, perda súbita de visão ou uma dor de cabeça abrupta e invulgar</strong>, ligue <strong>112</strong>. Esses sinais podem indicar lesão aguda do coração, cérebro, pulmões, olhos ou aorta. Não espere por um chá e não tome uma dose extra ou um medicamento emprestado.",
    facts: ["A hipertensão é frequentemente silenciosa", "Valor alto com sinais de alarme: 112", "Não improvise doses ou tratamentos"],
    primaryCta: { label: "Consulta de medicina geral", href: chronicHref("pt") },
    secondaryCta: { label: "Consulta de cardiologia", href: cardioHref("pt") },
    panelChip: "O que este guia esclarece",
    panelParas: [
      "Como distinguir sintomas vagos de sinais que podem representar lesão aguda de órgãos.",
      "O que fazer perante um valor repetido próximo de 180/120 mmHg sem sinais de alarme.",
      "Por que remédios caseiros e alterações autónomas da medicação podem atrasar cuidados seguros.",
      "Quando recorrer à medicina geral em Espanha e quando acrescentar cardiologia.",
    ],
    author: { initials: "FM", name: "Dr. Fidel Ernesto Mesa Prado", line: "Especialista em Cardiologia · Global Health Espanha" },
    reviewLine: "Revisto clinicamente pelo Dr. Eduardo Daniel Rodríguez Olivas, médico de medicina geral, Global Health Espanha.",
    navLabel: "Neste artigo",
    sections: [
      {
        id: "sintomas",
        nav: "Sintomas",
        eyebrow: "Primeiro ponto",
        h2: "Que sintomas pode causar a tensão alta?",
        blocks: [
          lead("Na maioria das pessoas, não causa sintomas reconhecíveis. A medição é a única forma de conhecer o valor."),
          p("Dor de cabeça, tonturas, zumbidos, hemorragia nasal, palpitações ou visão turva podem coincidir com uma subida, mas não são específicos. Ansiedade, enxaqueca, febre, dor, desidratação e falta de sono também os provocam. Sentir-se bem não garante que a pressão esteja normal: a hipertensão pode permanecer despercebida durante anos."),
          p("Separe duas perguntas. O diagnóstico de hipertensão exige medições repetidas e avaliação clínica. A urgência do momento depende do início súbito, dos sintomas, do contexto — incluindo gravidez ou pós-parto — e de sinais compatíveis com lesão aguda."),
          ul(["Uma dor de cabeça habitual não prova que a tensão seja a causa.", "Tonturas também podem acontecer com pressão baixa.", "Dor e ansiedade podem elevar temporariamente a leitura, mas um valor extremo continua a exigir atenção.", "Alterações neurológicas, respiratórias, visuais ou torácicas mudam imediatamente a prioridade."]),
          cite(`A <a href="${FEC_HTA}" rel="nofollow noopener" target="_blank">Fundación Española del Corazón</a> explica que a hipertensão é habitualmente assintomática e identificada através da medição.`),
        ],
      },
      {
        id: "emergencia",
        nav: "Emergência",
        eyebrow: "A distinção essencial",
        h2: "Um valor muito alto nem sempre significa a mesma emergência",
        blocks: [
          lead("A emergência hipertensiva é a combinação de pressão muito elevada com lesão aguda de órgão, não apenas um número no aparelho."),
          p("Em casa não consegue excluir lesão no cérebro, coração, rins, retina ou aorta. No hospital podem ser necessários exame físico, eletrocardiograma, análises, observação do fundo ocular ou exames de imagem. Por isso, sintomas de alarme devem ser tratados como perigosos até avaliação presencial."),
          p("Uma medição corretamente repetida em torno de 180/120 mmHg ou superior é marcadamente elevada. Sem sinais de alarme, não confirma por si só lesão aguda, mas requer avaliação médica urgente no próprio dia. Com sinais de alarme, não continue a medir à espera de uma descida: ligue 112."),
          warn("Não tente fazer a triagem definitiva em casa", "A ausência de dor não exclui lesão. Um valor abaixo de 180/120 também não exclui AVC, síndrome coronária aguda ou problema da aorta quando há sintomas súbitos."),
          cite(`As <a href="${ESC_2024}" rel="nofollow noopener" target="_blank">orientações ESC de 2024</a> distinguem pressão marcadamente elevada de emergência hipertensiva com lesão aguda de órgão.`),
        ],
      },
      {
        id: "ligar-112",
        nav: "Ligar 112",
        eyebrow: "Não espere",
        h2: "Quando ligar 112 em Espanha",
        blocks: [
          lead("Ligue 112 se a leitura alta vier acompanhada de sintomas súbitos do peito, respiração, sistema nervoso, visão ou consciência."),
          ul(["Dor, pressão ou ardor no peito, sobretudo com suor frio, náuseas ou irradiação para braço, costas, pescoço ou maxilar.", "Falta de ar intensa, dificuldade para respirar em repouso ou expetoração rosada e espumosa.", "Face descaída, fraqueza ou dormência de um lado, fala arrastada, dificuldade em compreender, caminhar ou coordenar movimentos.", "Confusão nova, convulsão, desmaio ou redução do estado de consciência.", "Perda súbita de visão, visão dupla nova ou dor de cabeça explosiva e diferente do habitual.", "Dor súbita e dilacerante no peito, costas ou abdómen, ou agravamento rápido durante a gravidez ou após o parto."]),
          p("Não conduza se houver sinais neurológicos, dor no peito, falta de ar, alteração visual ou desmaio. Anote a hora de início, tenha a lista de medicamentos disponível e siga as instruções do operador. Uma videoconsulta não substitui o 112 nem a avaliação presencial nestas situações."),
          cite(`O <a href="${FARMACIA_URGENCIAS}" rel="nofollow noopener" target="_blank">Consejo General de Colegios Farmacéuticos de Espanha</a> inclui as crises hipertensivas entre as situações que justificam encaminhamento urgente.`),
        ],
      },
      {
        id: "o-que-fazer",
        nav: "O que fazer",
        eyebrow: "Se estiver estável",
        h2: "Como repetir a medição sem atrasar ajuda",
        blocks: [
          lead("Sem sinais de alarme e sentindo-se estável, sente-se tranquilamente e repita uma vez após alguns minutos com técnica correta."),
          ul(["Apoie costas e pés, descruze as pernas e mantenha o braço à altura do coração.", "Use uma braçadeira adequada diretamente sobre a pele e não fale durante a leitura.", "Registe os dois valores, a hora, os sintomas e os medicamentos habituais.", "Se continuar perto de 180/120 mmHg ou acima, procure avaliação urgente no mesmo dia.", "Se surgir qualquer sinal de alarme enquanto espera, ligue 112 imediatamente."]),
          p(`Para acompanhamento não urgente, o <a href="${toolHref("pt")}">registo de tensão arterial</a> pode organizar as leituras. Não calcula doses, não diagnostica uma crise e nunca deve atrasar uma chamada de emergência.`),
          p("Não apague a primeira leitura se a segunda baixar. Um episódio novo, recorrente ou associado a sintomas deve ser discutido com um profissional. A teleconsulta é útil para rever um registo estável, mas não permite examinar lesão aguda."),
        ],
      },
      {
        id: "remedios-e-medicacao",
        nav: "Remédios",
        eyebrow: "Evite dano adicional",
        h2: "Chá, alho, limão e comprimidos não resolvem uma emergência",
        blocks: [
          lead("Nenhum remédio caseiro trata de forma fiável uma possível lesão aguda, e forçar uma queda rápida da pressão pode ser perigoso."),
          p("Chá, alho, limão, água fria ou exercícios respiratórios são procurados porque parecem uma ação imediata. Sentar-se e respirar calmamente enquanto pede ajuda pode reduzir ansiedade, mas não trata AVC, enfarte, edema pulmonar ou lesão da aorta. Produtos naturais também podem interagir com medicamentos ou doenças renais."),
          p("Não tome captopril, nifedipina ou outro anti-hipertensor de outra pessoa. Não duplique, antecipe nem combine doses prescritas, salvo se o seu próprio médico tiver deixado um plano individual explícito para essa situação. Uma descida abrupta pode reduzir ainda mais o fluxo de sangue para órgãos vulneráveis."),
          warn("Natural não significa adequado numa urgência", "Alimentos e infusões podem fazer parte da rotina, mas não substituem 112, exame presencial ou a terapêutica prescrita. O objetivo imediato é reconhecer lesão, não competir com o aparelho."),
        ],
      },
      {
        id: "seguimento-em-espanha",
        nav: "Seguimento",
        eyebrow: "Depois do episódio",
        h2: "Medicina geral primeiro; cardiologia quando é necessário aprofundar",
        blocks: [
          lead("Em situações estáveis, a medicina geral coordena o seguimento; a cardiologia acrescenta avaliação quando o controlo é difícil ou existem achados cardiovasculares."),
          p(`Numa <a href="${chronicHref("pt")}">consulta de doenças crónicas em Espanha</a>, o médico pode rever técnica de medição, registo domiciliário, adesão, efeitos adversos e fatores como diabetes, função renal, colesterol e peso. Sem sinais de emergência, este é habitualmente o ponto de partida.`),
          p(`Uma <a href="${cardioHref("pt")}">consulta de cardiologia online em Espanha</a> pode interpretar relatórios já disponíveis, como ECG, monitorização ou ecocardiograma, e orientar casos difíceis. Não substitui exames presenciais nem urgências.`),
          p(`Consulte também a <a href="${href("pt", "/doctors")}">equipa médica em Espanha</a> ou <a href="${href("pt", "/contact")}">contacte a Global Health Espanha</a>. Se aparecer um sinal de alarme, a via correta continua a ser 112.`),
        ],
      },
    ],
    linksEyebrow: "Global Health Espanha",
    linksH2: "Próximos passos quando não é uma emergência",
    linksLead: "Leve as leituras, horários, sintomas, lista de medicamentos e relatórios disponíveis para que a decisão se baseie no conjunto do episódio.",
    links: [
      { label: "Medicina geral e doenças crónicas", href: chronicHref("pt") },
      { label: "Cardiologia online em Espanha", href: cardioHref("pt") },
      { label: "Registo de tensão arterial", href: toolHref("pt") },
      { label: "Equipa médica em Espanha", href: href("pt", "/doctors") },
      { label: "Contactar Global Health Espanha", href: href("pt", "/contact") },
    ],
    ctaBox: { h3: "Valores altos repetidos, mas sem sinais de alarme?", text: "Comece pela medicina geral para rever o quadro completo. A cardiologia pode complementar quando o controlo é difícil ou há alterações cardíacas.", primary: { label: "Marcar medicina geral", href: chronicHref("pt") }, secondary: { label: "Falar com cardiologia", href: cardioHref("pt") } },
    sourcesEyebrow: "Fontes clínicas",
    sourcesH2: "Fontes deste guia",
    sourcesLead: "A triagem baseia-se em orientações cardiovasculares europeias e recursos clínicos espanhóis.",
    sources: [
      { label: "ESC 2024 — pressão arterial elevada e hipertensão", href: ESC_2024 },
      { label: "Sociedad Española de Cardiología — orientação ESC 2024", href: SEC_ESC_2024 },
      { label: "Fundación Española del Corazón — hipertensão", href: FEC_HTA },
      { label: "Consejo General de Farmacéuticos — urgências", href: FARMACIA_URGENCIAS },
    ],
    sourcesNote: "As fontes externas abrem num novo separador. Este guia não diagnostica nem trata uma emergência à distância. Perante sinais de alarme, ligue 112.",
    faqEyebrow: "Perguntas frequentes",
    faqH2: "Dúvidas sobre tensão alta e urgências",
    faqs: [
      { q: "Quais são os sintomas da tensão alta?", a: "Muitas vezes não existem. Dor de cabeça, tonturas, palpitações ou visão turva são inespecíficas. A medição mostra o valor; a urgência depende de sintomas súbitos e possível lesão aguda." },
      { q: "Devo ligar 112 com uma leitura de 180/120?", a: "Ligue 112 se houver dor no peito, falta de ar, sinais neurológicos, confusão, desmaio, perda súbita de visão ou dor de cabeça explosiva. Sem esses sinais, repita corretamente uma vez e procure avaliação urgente no próprio dia se persistir." },
      { q: "Posso tomar um comprimido extra?", a: "Só se o seu médico tiver fornecido previamente um plano individual explícito. Não duplique, antecipe ou combine doses por iniciativa própria e nunca use medicação emprestada." },
      { q: "Chá, alho ou limão baixam rapidamente a tensão?", a: "Não tratam uma emergência hipertensiva nem lesão de órgãos e podem atrasar cuidados. Alguns produtos naturais interagem com medicamentos. Nunca substituem 112 ou avaliação clínica." },
      { q: "Uma videoconsulta consegue avaliar uma crise?", a: "Pode rever um registo estável e planear seguimento, mas não examina lesão aguda. Sinais de alarme exigem 112 ou urgência presencial; sem sinais, a medicina geral é geralmente o primeiro passo." },
    ],
    disclaimerTitle: "Informação médica",
    disclaimer: "Elaborado pelo Dr. Fidel Ernesto Mesa Prado, especialista em cardiologia da Global Health Espanha, e revisto clinicamente pelo Dr. Eduardo Daniel Rodríguez Olivas, médico de medicina geral. Conteúdo produzido com assistência de IA, sujeito a revisão editorial por falante nativo e aprovação clínica final antes da publicação. Não substitui avaliação individual. Não altere medicamentos ou doses sem um plano médico. Perante dor no peito, falta de ar intensa, sinais neurológicos, confusão, desmaio ou perda súbita de visão, ligue 112.",
  } satisfies Article,
};

const cs: LocalePost = {
  locale: "CS",
  slug: "vysoky-krevni-tlak-priznaky-pohotovost-spanelsko",
  title: "Vysoký krevní tlak: příznaky a pohotovost ve Španělsku",
  excerpt: "Vysoký tlak často nemá příznaky. Zjistěte, kdy ve Španělsku volat 112 a proč bez pokynu lékaře nepřidávat léky ani domácí prostředky.",
  seoTitle: "Vysoký tlak: příznaky a pohotovost ve Španělsku",
  seoDescription: "Varovné příznaky, volání 112 ve Španělsku a bezpečný postup při velmi vysokém tlaku bez svévolných dávek či domácí léčby.",
  category: "Kardiologie",
  article: {
    lang: "cs-CZ", tagline: "Lékařská péče, ať jste kdekoli", categoryLabel: "Kardiologie", categoryHref: href("cs", "/blog"), eyebrow: "Španělsko · Bezpečnostní průvodce", h1: "Vysoký krevní tlak: příznaky a pohotovost", deck: "Samotné číslo je důležité, ale o bezprostředním nebezpečí rozhodují známky akutního poškození orgánů.",
    intro: "<strong>Vysoký krevní tlak bývá bez příznaků</strong>, takže podle pocitu nelze hypertenzi potvrdit ani vyloučit. Pokud se ve Španělsku velmi vysoká hodnota spojí s <strong>bolestí na hrudi, těžkou dušností, jednostrannou slabostí, poruchou řeči, zmateností, bezvědomím, náhlou ztrátou zraku nebo náhlou nezvyklou silnou bolestí hlavy</strong>, volejte <strong>112</strong>. Může jít o akutní poškození srdce, mozku, plic, očí či aorty. Nečekejte na účinek čaje a neužívejte další ani vypůjčenou tabletu.",
    facts: ["Hypertenze bývá tichá", "Vysoká hodnota s varovnými příznaky: 112", "Dávky léků sami neměňte"],
    primaryCta: { label: "Praktický lékař", href: chronicHref("cs") }, secondaryCta: { label: "Kardiologická konzultace", href: cardioHref("cs") },
    panelChip: "Co průvodce řeší", panelParas: ["Které náhlé obtíže mohou znamenat akutní orgánové poškození.", "Jak jednou správně zopakovat velmi vysokou hodnotu bez oddalování pomoci.", "Proč domácí prostředky a svévolné úpravy léků představují riziko.", "Kdy ve Španělsku začít u praktického lékaře a kdy zapojit kardiologa."],
    author: { initials: "FM", name: "Dr. Fidel Ernesto Mesa Prado", line: "Specialista v kardiologii · Global Health Španělsko" }, reviewLine: "Klinicky zkontroloval Dr. Eduardo Daniel Rodríguez Olivas, praktický lékař, Global Health Španělsko.", navLabel: "V článku",
    sections: [
      { id: "priznaky", nav: "Příznaky", eyebrow: "První zásada", h2: "Jaké příznaky může vysoký tlak způsobit?", blocks: [
        lead("Nejčastěji žádné rozpoznatelné. Skutečnou hodnotu zjistí pouze měření."),
        p("Bolest hlavy, závratě, hučení v uších, krvácení z nosu, bušení srdce nebo rozmazané vidění se mohou objevit, nejsou však specifické. Stejné obtíže vyvolává úzkost, migréna, horečka, bolest, dehydratace či nedostatek spánku. Ani dobrý pocit není zárukou: zvýšené hodnoty mohou zůstat roky nepovšimnuté."),
        p("Oddělte diagnózu od akutního třídění. Hypertenzi potvrzuje série správných měření a lékařské posouzení. Okamžitou naléhavost určují náhle vzniklé příznaky, souvislosti včetně těhotenství či šestinedělí a možné známky poškození orgánů."),
        ul(["Běžná bolest hlavy nedokazuje, že ji způsobil tlak.", "Závratě mohou nastat také při nízkém tlaku.", "Bolest a panika mohou hodnotu dočasně zvýšit, extrémní měření však nelze ignorovat.", "Náhlé neurologické, dechové, zrakové nebo hrudní obtíže zásadně mění naléhavost."]),
        cite(`Informace <a href="${FEC_HTA}" rel="nofollow noopener" target="_blank">Španělské nadace srdce</a> uvádějí, že hypertenze obvykle probíhá bez příznaků a odhaluje se měřením.`),
      ] },
      { id: "akutni-poskozeni", nav: "Akutní stav", eyebrow: "Rozhodující rozdíl", h2: "Velmi vysoké číslo není vždy stejný typ pohotovosti", blocks: [
        lead("Hypertenzní emergency znamená velmi vysoký tlak spolu s akutním orgánovým poškozením, nikoli jen dosažení určitého čísla."),
        p("Doma nelze bezpečně vyloučit postižení mozku, srdce, ledvin, sítnice nebo aorty. V nemocnici může být nutné vyšetření, EKG, krevní a močové testy, oční pozadí či zobrazovací metoda. Varovné příznaky proto vyžadují osobní akutní posouzení."),
        p("Správně zopakovaná hodnota kolem 180/120 mmHg nebo vyšší je výrazně zvýšená. Bez varovných příznaků sama nepotvrzuje akutní orgánové poškození, ale vyžaduje naléhavé vyšetření ještě tentýž den. S varovnými příznaky dále neměřte a volejte 112."),
        warn("Nesnažte se doma stanovit konečnou diagnózu", "Nepřítomnost bolesti nevylučuje poškození. Ani nižší hodnota nevylučuje cévní mozkovou příhodu, akutní koronární syndrom nebo aortální příhodu, pokud začaly typické obtíže."),
        cite(`Doporučení <a href="${ESC_2024}" rel="nofollow noopener" target="_blank">ESC 2024</a> odlišují výrazně zvýšený tlak od hypertenzní emergency s akutním orgánovým poškozením.`),
      ] },
      { id: "volat-112", nav: "Volat 112", eyebrow: "Nečekejte", h2: "Kdy ve Španělsku volat 112", blocks: [
        lead("Volejte 112, pokud se vysoká hodnota spojí s náhlými příznaky na hrudi, při dýchání, v nervovém systému, zraku nebo vědomí."),
        ul(["Bolest, tlak či pálení na hrudi, zvláště se studeným potem, nevolností nebo šířením do paže, zad, krku či čelisti.", "Těžká dušnost, namáhavé dýchání v klidu nebo růžové pěnivé sputum.", "Pokles koutku, jednostranná slabost či necitlivost, nová porucha řeči, porozumění, chůze nebo koordinace.", "Nová zmatenost, křeče, mdloba nebo porucha vědomí.", "Náhlá ztráta zraku, nové dvojité vidění nebo explozivní nezvyklá bolest hlavy.", "Náhlá trhavá bolest na hrudi, v zádech či břiše nebo rychlé zhoršení v těhotenství či po porodu."]),
        p("Při neurologických příznacích, bolesti na hrudi, dušnosti, poruše zraku nebo mdlobě neřiďte. Poznamenejte si začátek obtíží, připravte seznam léků a postupujte podle pokynů operátora. Videokonzultace v takové situaci nenahrazuje 112."),
        cite(`Španělská profesní organizace lékárníků uvádí <a href="${FARMACIA_URGENCIAS}" rel="nofollow noopener" target="_blank">hypertenzní krize mezi stavy vyžadujícími urgentní předání</a>.`),
      ] },
      { id: "spravne-mereni", nav: "Co dělat", eyebrow: "Jste-li stabilní", h2: "Jedno správné opakování bez zdržování", blocks: [
        lead("Pokud se cítíte stabilně a nemáte varovné příznaky, v klidu se posaďte a po několika minutách měření jednou správně zopakujte."),
        ul(["Opřete záda i chodidla, nepřekřižujte nohy a paži podepřete ve výši srdce.", "Použijte vhodnou manžetu na holé paži a při měření nemluvte.", "Zapište obě hodnoty, čas, příznaky a své běžné léky.", "Přetrvává-li hodnota kolem 180/120 mmHg nebo výše, zajistěte vyšetření tentýž den.", "Objeví-li se varovný příznak, okamžitě volejte 112."]),
        p(`Pro neakutní sledování lze použít <a href="${toolHref("cs")}">záznam krevního tlaku</a>. Nevypočítává dávky, neurčuje diagnózu a nikdy nesmí oddálit tísňové volání.`),
        p("První hodnotu nemažte, ani když druhá klesne. Nová, opakovaná nebo symptomatická epizoda patří k lékařskému posouzení. Telemedicína pomůže s klidným domácím záznamem, nikoli s vyšetřením akutního orgánového poškození."),
      ] },
      { id: "domaci-prostredky", nav: "Domácí léčba", eyebrow: "Nepřidávejte riziko", h2: "Čaj, česnek ani cizí tableta akutní stav neléčí", blocks: [
        lead("Žádný domácí prostředek spolehlivě neléčí možné akutní poškození a vynucený rychlý pokles tlaku může být nebezpečný."),
        p("Čaj, česnek, citron, studená voda nebo dechová cvičení mohou působit jako rychlé řešení. Klidné dýchání během zajišťování pomoci může zmírnit úzkost, ale neléčí mrtvici, infarkt, plicní edém ani poškození aorty. Bylinné produkty mohou navíc interagovat s léky nebo nemocnými ledvinami."),
        p("Neužívejte cizí captopril, nifedipin ani jiný lék na tlak. Nezdvojujte, neurychlujte ani nekombinujte předepsané dávky, pokud váš vlastní lékař předem nevytvořil jednoznačný individuální plán pro danou situaci. Prudký pokles může zhoršit prokrvení ohrožených orgánů."),
        warn("Přírodní neznamená vhodné pro pohotovost", "Jídlo či čaj mohou patřit do běžného režimu, nenahrazují však 112, osobní vyšetření ani předepsanou léčbu. Nyní jde o rozpoznání akutního poškození, ne o co nejrychlejší změnu čísla."),
      ] },
      { id: "pece-ve-spanelsku", nav: "Další péče", eyebrow: "Po akutní epizodě", h2: "Praktický lékař koordinuje, kardiolog doplňuje", blocks: [
        lead("Stabilní stav obvykle koordinuje praktický lékař; kardiolog pomáhá při obtížné kontrole, obtížích nebo abnormálních srdečně-cévních nálezech."),
        p(`Při <a href="${chronicHref("cs")}">péči o chronická onemocnění ve Španělsku</a> lze zkontrolovat techniku měření, domácí záznam, užívání předepsaných léků, nežádoucí účinky, cukrovku, funkci ledvin, cholesterol i hmotnost. Bez varovných příznaků je to obvyklý první krok.`),
        p(`<a href="${cardioHref("cs")}">Online kardiologická konzultace ve Španělsku</a> může vyložit již dostupné EKG, dlouhodobé monitorování či echokardiografii a pomoci u složitější hypertenze. Nenahrazuje urgentní ani fyzické vyšetření.`),
        p(`Prohlédněte si <a href="${href("cs", "/doctors")}">lékařský tým ve Španělsku</a> nebo <a href="${href("cs", "/contact")}">kontaktujte Global Health Španělsko</a>. Při varovných příznacích však vždy volejte 112.`),
      ] },
    ],
    linksEyebrow: "Global Health Španělsko", linksH2: "Další kroky, nejde-li o emergency", linksLead: "Připravte naměřené hodnoty, časy, příznaky, seznam léků a dostupné zprávy, aby lékař hodnotil celý průběh.",
    links: [{ label: "Praktická péče o chronická onemocnění", href: chronicHref("cs") }, { label: "Kardiologie online ve Španělsku", href: cardioHref("cs") }, { label: "Záznam krevního tlaku", href: toolHref("cs") }, { label: "Lékaři ve Španělsku", href: href("cs", "/doctors") }, { label: "Kontakt Global Health Španělsko", href: href("cs", "/contact") }],
    ctaBox: { h3: "Opakované vysoké hodnoty bez varovných příznaků?", text: "Začněte praktickou péčí, která posoudí celý kontext. Při obtížné kontrole nebo srdečních nálezech může navázat kardiolog.", primary: { label: "Objednat praktickou péči", href: chronicHref("cs") }, secondary: { label: "Kardiologická konzultace", href: cardioHref("cs") } },
    sourcesEyebrow: "Klinické zdroje", sourcesH2: "Zdroje průvodce", sourcesLead: "Třídění vychází z evropských kardiologických doporučení a oficiálních španělských klinických informací.",
    sources: [{ label: "ESC 2024 — zvýšený krevní tlak a hypertenze", href: ESC_2024 }, { label: "Španělská kardiologická společnost — doporučení ESC 2024", href: SEC_ESC_2024 }, { label: "Španělská nadace srdce — hypertenze", href: FEC_HTA }, { label: "Španělská rada lékárníků — urgentní stavy", href: FARMACIA_URGENCIAS }],
    sourcesNote: "Externí zdroje se otevřou na nové kartě. Průvodce nedokáže na dálku diagnostikovat ani léčit akutní stav. Při varovných příznacích volejte 112.", faqEyebrow: "Časté otázky", faqH2: "Otázky o vysokém tlaku a pohotovosti",
    faqs: [
      { q: "Jaké jsou příznaky vysokého krevního tlaku?", a: "Často žádné. Bolest hlavy, závratě, bušení srdce či rozmazané vidění nejsou specifické. Hodnotu ukáže měření; naléhavost určují náhlé obtíže a možné akutní orgánové poškození." },
      { q: "Mám při hodnotě 180/120 volat 112?", a: "Při bolesti na hrudi, dušnosti, neurologických obtížích, zmatenosti, mdlobě, náhlé ztrátě zraku nebo explozivní bolesti hlavy volejte 112. Bez nich jednou správně přeměřte a při přetrvávání zajistěte vyšetření tentýž den." },
      { q: "Mohu si vzít další tabletu?", a: "Pouze podle předem daného individuálního plánu vlastního lékaře. Sami dávku nezdvojujte, neposouvejte ani nekombinujte a neužívejte vypůjčené léky." },
      { q: "Pomůže rychle čaj, česnek nebo citron?", a: "Neřeší akutní orgánové poškození a mohou oddálit pomoc. Některé rostlinné přípravky interagují s léky. Nenahrazují 112 ani lékařské vyšetření." },
      { q: "Lze krizi vyřešit videokonzultací?", a: "Videokonzultace může vyhodnotit stabilní domácí záznam a naplánovat kontrolu, ale nevyšetří akutní poškození. Varovné příznaky patří na 112 či pohotovost; jinak začněte u praktického lékaře." },
    ],
    disclaimerTitle: "Zdravotní upozornění", disclaimer: "Připravil Dr. Fidel Ernesto Mesa Prado, specialista v kardiologii Global Health Španělsko; klinickou kontrolu provedl Dr. Eduardo Daniel Rodríguez Olivas, praktický lékař. Obsah vznikl s podporou AI a před zveřejněním vyžaduje redakční kontrolu rodilým mluvčím a konečné klinické schválení. Nenahrazuje individuální vyšetření. Bez lékařského plánu neměňte léky ani dávky. Při bolesti na hrudi, těžké dušnosti, neurologických příznacích, zmatenosti, bezvědomí nebo náhlé ztrátě zraku volejte 112.",
  } satisfies Article,
};

const ro: LocalePost = {
  locale: "RO",
  slug: "tensiune-mare-simptome-urgente-spania",
  title: "Tensiune mare: simptome și când mergi la urgență în Spania",
  excerpt: "Tensiunea mare este adesea fără simptome. Află când să suni la 112 în Spania și ce să faci fără doze suplimentare sau remedii improvizate.",
  seoTitle: "Tensiune mare: simptome și urgențe în Spania",
  seoDescription: "Semne de alarmă, când suni la 112 în Spania și pași siguri la o tensiune foarte mare, fără doze în plus sau remedii casnice.",
  category: "Cardiologie",
  article: {
    lang: "ro-RO", tagline: "Îngrijire medicală oriunde te afli", categoryLabel: "Cardiologie", categoryHref: href("ro", "/blog"), eyebrow: "Spania · Ghid de siguranță", h1: "Tensiune mare: simptome și urgențe", deck: "Valoarea contează, însă semnele de afectare acută a organelor transformă situația într-o urgență majoră.",
    intro: "<strong>Tensiunea arterială mare nu dă de obicei simptome</strong>. Hipertensiunea nu poate fi confirmată sau exclusă după cum te simți. În Spania, dacă o valoare foarte mare apare împreună cu <strong>durere ori apăsare în piept, lipsă de aer, slăbiciune pe o parte, vorbire dificilă, confuzie, leșin, pierderea bruscă a vederii sau o durere de cap bruscă și neobișnuit de intensă</strong>, sună la <strong>112</strong>. Pot fi semne de afectare acută a inimii, creierului, plămânilor, ochilor sau aortei. Nu aștepta efectul unui ceai și nu lua o doză suplimentară ori medicamentul altei persoane.",
    facts: ["Hipertensiunea este frecvent silențioasă", "Valoare mare plus semne de alarmă: 112", "Nu modifica singur medicația"], primaryCta: { label: "Consultație de medicină generală", href: chronicHref("ro") }, secondaryCta: { label: "Consultație de cardiologie", href: cardioHref("ro") },
    panelChip: "Ce clarifică ghidul", panelParas: ["Ce simptome bruște pot semnala afectarea acută a organelor.", "Cum repeți corect o valoare foarte mare fără să întârzii ajutorul.", "De ce remediile populare și schimbarea medicației fără recomandare cresc riscul.", "Când începi cu medicul generalist în Spania și când este util cardiologul."],
    author: { initials: "FM", name: "Dr. Fidel Ernesto Mesa Prado", line: "Medic specialist cardiologie · Global Health Spania" }, reviewLine: "Revizuit clinic de Dr. Eduardo Daniel Rodríguez Olivas, medic generalist, Global Health Spania.", navLabel: "În acest articol",
    sections: [
      { id: "simptome", nav: "Simptome", eyebrow: "Prima idee", h2: "Ce simptome poate provoca tensiunea mare?", blocks: [lead("Cel mai adesea, niciunul. Doar măsurarea arată cât de mare este tensiunea."), p("Durerea de cap, amețeala, țiuitul în urechi, sângerarea nazală, palpitațiile sau vederea încețoșată pot însoți o creștere, dar nu sunt specifice. Apar și în anxietate, migrenă, febră, durere, deshidratare ori lipsă de somn. Nici starea bună nu oferă siguranță: valorile crescute pot rămâne neobservate ani întregi."), p("Separă diagnosticul de triajul imediat. Hipertensiunea se stabilește prin măsurători repetate și evaluare medicală. Urgența momentului este decisă de debutul brusc, simptome, context — inclusiv sarcină sau perioada după naștere — și posibila afectare acută a organelor."), ul(["O durere de cap obișnuită nu dovedește că tensiunea este cauza.", "Amețeala poate apărea și la tensiune mică.", "Durerea sau panica pot crește temporar valoarea, însă o valoare extremă rămâne importantă.", "Semnele neurologice, respiratorii, vizuale sau toracice apărute brusc schimbă imediat prioritatea."]), cite(`<a href="${FEC_HTA}" rel="nofollow noopener" target="_blank">Fundación Española del Corazón</a> explică faptul că hipertensiunea este de regulă asimptomatică și se depistează prin măsurare.`)] },
      { id: "afectare-acuta", nav: "Urgență majoră", eyebrow: "Diferența esențială", h2: "O valoare foarte mare nu înseamnă întotdeauna aceeași urgență", blocks: [lead("Urgența hipertensivă majoră înseamnă tensiune foarte mare împreună cu afectare acută de organ, nu doar un număr pe aparat."), p("Acasă nu poți exclude în siguranță afectarea creierului, inimii, rinichilor, retinei sau aortei. În spital pot fi necesare consultația, ECG-ul, analizele de sânge și urină, examinarea fundului de ochi ori imagistica. Semnele de alarmă cer evaluare imediată în persoană."), p("O valoare repetată corect, în jur de 180/120 mmHg sau mai mare, este foarte ridicată. Fără semne de alarmă nu demonstrează singură afectare acută, dar necesită evaluare medicală urgentă în aceeași zi. Cu semne de alarmă, nu continua să măsori sperând că scade: sună la 112."), warn("Nu încerca să stabilești singur tipul urgenței", "Lipsa durerii nu exclude afectarea. Nici o valoare sub 180/120 nu exclude un accident vascular cerebral, sindrom coronarian acut sau o problemă a aortei când simptomele sunt bruște."), cite(`Ghidul <a href="${ESC_2024}" rel="nofollow noopener" target="_blank">ESC 2024</a> diferențiază tensiunea marcat crescută de urgența hipertensivă cu afectare acută de organ.`)] },
      { id: "suna-112", nav: "Sună la 112", eyebrow: "Nu aștepta", h2: "Când să suni la 112 în Spania", blocks: [lead("Sună la 112 când valoarea mare este însoțită de simptome bruște care implică pieptul, respirația, sistemul nervos, vederea sau starea de conștiență."), ul(["Durere, apăsare sau arsură în piept, mai ales cu transpirații reci, greață ori iradiere spre braț, spate, gât sau mandibulă.", "Lipsă severă de aer, respirație dificilă în repaus sau spută roz, spumoasă.", "Față asimetrică, slăbiciune ori amorțeală pe o parte, vorbire nou modificată, dificultăți de înțelegere, mers sau coordonare.", "Confuzie nouă, convulsie, leșin sau alterarea stării de conștiență.", "Pierderea bruscă a vederii, vedere dublă nouă sau durere de cap explozivă, diferită de cele obișnuite.", "Durere bruscă, sfâșietoare în piept, spate ori abdomen sau agravare rapidă în sarcină ori după naștere."]), p("Nu conduce dacă ai semne neurologice, durere în piept, dispnee, tulburări vizuale sau leșin. Reține ora debutului, pregătește lista medicamentelor și urmează instrucțiunile operatorului. O consultație video nu înlocuiește 112 în aceste situații."), cite(`Organizația profesională a farmaciștilor din Spania include <a href="${FARMACIA_URGENCIAS}" rel="nofollow noopener" target="_blank">crizele hipertensive printre situațiile care necesită îndrumare urgentă</a>.`)] },
      { id: "masurare-corecta", nav: "Ce faci", eyebrow: "Dacă ești stabil", h2: "Repetă o singură dată, corect, fără să amâni ajutorul", blocks: [lead("Dacă te simți stabil și nu ai semne de alarmă, stai liniștit și repetă măsurarea o dată după câteva minute, folosind tehnica potrivită."), ul(["Sprijină spatele și tălpile, nu încrucișa picioarele și ține brațul la nivelul inimii.", "Folosește o manșetă potrivită direct pe piele și nu vorbi în timpul măsurării.", "Notează ambele valori, ora, simptomele și medicamentele obișnuite.", "Dacă valoarea rămâne în jur de 180/120 mmHg sau mai mare, caută evaluare urgentă în aceeași zi.", "Dacă apare un semn de alarmă în timp ce aștepți, sună imediat la 112."]), p(`Pentru urmărire fără urgență, <a href="${toolHref("ro")}">jurnalul tensiunii arteriale</a> ajută la organizarea valorilor. Nu calculează doze, nu diagnostichează și nu trebuie să întârzie apelul de urgență.`), p("Nu șterge prima valoare dacă a doua scade. Un episod nou, repetat sau însoțit de simptome trebuie evaluat. Telemedicina poate analiza un jurnal stabil, dar nu poate examina afectarea acută de organ.")] },
      { id: "remedii", nav: "Remedii", eyebrow: "Nu adăuga risc", h2: "Ceaiul, usturoiul și o tabletă împrumutată nu tratează o urgență", blocks: [lead("Niciun remediu casnic nu tratează sigur o posibilă afectare acută, iar forțarea unei scăderi rapide poate fi periculoasă."), p("Ceaiul, usturoiul, lămâia, apa rece sau exercițiile de respirație par soluții imediate. Respirația calmă în timp ce ceri ajutor poate reduce anxietatea, însă nu tratează accidentul vascular cerebral, infarctul, edemul pulmonar ori lezarea aortei. Produsele din plante pot interacționa cu medicamentele sau bolile renale."), p("Nu lua captopril, nifedipină sau alt antihipertensiv al altei persoane. Nu dubla, nu devansa și nu combina dozele prescrise decât dacă propriul medic ți-a dat anterior un plan individual clar pentru acea situație. O scădere bruscă poate reduce fluxul de sânge către organele vulnerabile."), warn("Natural nu înseamnă potrivit pentru urgență", "Un aliment sau ceai poate face parte din rutina obișnuită, dar nu înlocuiește 112, evaluarea în persoană sau tratamentul prescris. Acum contează recunoașterea afectării acute, nu cursa cu tensiometrul.")] },
      { id: "ingrijire-spania", nav: "Monitorizare", eyebrow: "După episod", h2: "Medicul generalist coordonează; cardiologul aprofundează", blocks: [lead("Cazurile stabile sunt coordonate de obicei de medicina generală; cardiologia completează evaluarea când controlul este dificil, există simptome sau rezultate cardiovasculare anormale."), p(`Într-o <a href="${chronicHref("ro")}">consultație pentru boli cronice în Spania</a> pot fi revizuite tehnica de măsurare, jurnalul de acasă, respectarea tratamentului prescris, reacțiile adverse, diabetul, funcția renală, colesterolul și greutatea. Fără semne de urgență, acesta este de regulă primul pas.`), p(`O <a href="${cardioHref("ro")}">consultație online de cardiologie în Spania</a> poate interpreta ECG-uri, monitorizări sau ecografii deja efectuate și poate ajuta în cazurile greu controlabile. Nu înlocuiește investigațiile fizice ori urgența.`), p(`Poți vedea <a href="${href("ro", "/doctors")}">echipa medicală din Spania</a> sau <a href="${href("ro", "/contact")}">contacta Global Health Spania</a>. Dacă apare un semn de alarmă, calea corectă rămâne 112.`)] },
    ],
    linksEyebrow: "Global Health Spania", linksH2: "Pașii următori când nu este o urgență majoră", linksLead: "Pregătește valorile, orele, simptomele, lista medicamentelor și documentele disponibile, astfel încât medicul să vadă întregul episod.",
    links: [{ label: "Medicină generală și boli cronice", href: chronicHref("ro") }, { label: "Cardiologie online în Spania", href: cardioHref("ro") }, { label: "Jurnal de tensiune arterială", href: toolHref("ro") }, { label: "Echipa medicală din Spania", href: href("ro", "/doctors") }, { label: "Contact Global Health Spania", href: href("ro", "/contact") }],
    ctaBox: { h3: "Valori mari repetate, fără semne de alarmă?", text: "Începe cu medicul generalist pentru evaluarea întregului context. Cardiologul poate completa dacă tensiunea este greu de controlat ori există rezultate cardiace anormale.", primary: { label: "Programează medicina generală", href: chronicHref("ro") }, secondary: { label: "Discută cu un cardiolog", href: cardioHref("ro") } },
    sourcesEyebrow: "Surse clinice", sourcesH2: "Sursele acestui ghid", sourcesLead: "Triajul se bazează pe recomandări cardiovasculare europene și informații clinice oficiale din Spania.",
    sources: [{ label: "ESC 2024 — tensiune arterială crescută și hipertensiune", href: ESC_2024 }, { label: "Societatea Spaniolă de Cardiologie — ghidul ESC 2024", href: SEC_ESC_2024 }, { label: "Fundația Spaniolă a Inimii — hipertensiune", href: FEC_HTA }, { label: "Consiliul Farmaciștilor din Spania — urgențe", href: FARMACIA_URGENCIAS }],
    sourcesNote: "Sursele externe se deschid într-o filă nouă. Acest ghid nu poate diagnostica sau trata la distanță o urgență. La semne de alarmă, sună la 112.", faqEyebrow: "Întrebări frecvente", faqH2: "Întrebări despre tensiunea mare și urgențe",
    faqs: [
      { q: "Care sunt simptomele tensiunii mari?", a: "Adesea nu există. Durerea de cap, amețeala, palpitațiile ori vederea încețoșată sunt nespecifice. Măsurarea arată valoarea; urgența este dată de simptome bruște și posibila afectare acută de organ." },
      { q: "Trebuie să sun la 112 la o valoare de 180/120?", a: "Sună la 112 dacă ai durere în piept, lipsă de aer, semne neurologice, confuzie, leșin, pierderea bruscă a vederii sau o durere de cap explozivă. Fără acestea, repetă corect o dată și caută evaluare în aceeași zi dacă persistă." },
      { q: "Pot lua o tabletă în plus?", a: "Numai dacă propriul medic ți-a oferit anterior un plan individual explicit. Nu dubla, nu devansa și nu combina doze din proprie inițiativă și nu lua medicamente împrumutate." },
      { q: "Ceaiul, usturoiul sau lămâia scad repede tensiunea?", a: "Nu tratează afectarea acută și pot întârzia ajutorul. Unele produse naturale interacționează cu medicamentele. Nu înlocuiesc niciodată 112 ori evaluarea medicală." },
      { q: "O consultație video poate evalua o criză?", a: "Poate revizui un jurnal stabil și planifica monitorizarea, dar nu poate examina afectarea acută. Semnele de alarmă necesită 112 sau urgență presencială; fără ele, începe de regulă cu medicul generalist." },
    ],
    disclaimerTitle: "Notă medicală", disclaimer: "Redactat de Dr. Fidel Ernesto Mesa Prado, medic specialist cardiologie la Global Health Spania, și revizuit clinic de Dr. Eduardo Daniel Rodríguez Olivas, medic generalist. Conținut realizat cu asistență AI, care necesită revizie editorială de către un vorbitor nativ și aprobare clinică finală înainte de publicare. Nu înlocuiește evaluarea individuală. Nu schimba medicamentele sau dozele fără un plan medical. Pentru durere în piept, lipsă severă de aer, semne neurologice, confuzie, leșin sau pierderea bruscă a vederii, sună la 112.",
  } satisfies Article,
};

export const ES_TENSION_ALTA_URGENCIAS: PostSet = {
  key: "es-tension-alta-urgencias",
  countryCode: "es",
  targetKeyword: "tensión alta",
  searchVolume: 12100,
  keywordDifficulty: 3,
  evidence:
    "OpenSEO / DataForSEO refresh supplied 2026-08-24 for Spain: tensión alta 12,100 monthly searches, KD 3, CPC USD 0.32; síntomas de tensión alta 5,400, KD 9. Intent is symptom recognition and emergency triage, kept separate from the Week 1 normal-range table and the planned evidence-based lowering article.",
  serviceSlug: "enfermedades-cronicas-online",
  authorDoctorId: "cmrdpqvkc000z01rui7z5it57",
  authorDisplayName: "Dr. Fidel Ernesto Mesa Prado",
  reviewerDoctorId: "cmrdpxpi0001v01ruqavjiq79",
  reviewerDisplayName: "Dr. Eduardo Daniel Rodríguez Olivas",
  posts: [es, en, de, pt, cs, ro],
};
