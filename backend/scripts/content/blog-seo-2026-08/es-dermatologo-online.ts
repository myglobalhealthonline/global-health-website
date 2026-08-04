/**
 * Spain — article 2 of 2.
 *
 * Target keyword: "dermatologo online" — 260/mo, KD 0 (OpenSEO / DataForSEO,
 * location 2724, language es, expansion run 2026-08-04).
 * Cluster: dermatología online 170 KD 0 · app dermatología gratis 70 ·
 * dermatologo online españa 30 · dermatólogo online gratis chat 30 ·
 * dermatólogo online españa 30 · consultas dermatológicas gratuitas 20 ·
 * dermatología infantil online 10 · dermatólogo online gratis españa · consulta
 * dermatológica gratis en línea · dermatología cita online (transactional).
 *
 * Target unchanged. This is the smallest cluster in the batch and the
 * expansion confirmed why: the demand splits into a paid transactional head
 * and a long "gratis" tail that no private clinic answers honestly. The
 * article answers it — the free route in Spain runs through the médico de
 * atención primaria and the SNS, and we say so.
 *
 * SERP read (get_serp_results, es/2724, 2026-08-04): page one is individual
 * dermatologists' own consulta-online pages (dermatologia-bagazgoitia.com,
 * madriderma.com, dermanieto.com, drgonzalezcantero.com), aggregators
 * (Doctoralia, DermaPeople) and hospital groups (Quirónsalud
 * teledermatología). Every one of them sells the service. None sets out the
 * boundary of what teledermatology can decide without a dermatoscope, which
 * is the gap this article fills.
 *
 * HONESTY CONSTRAINT. A video or store-and-forward consultation cannot
 * perform dermoscopy, take a biopsy, freeze a lesion or excise anything. For
 * pigmented lesions in particular, a photograph is a triage instrument and not
 * a diagnosis. The article makes that the second section rather than a
 * footnote, and the mole section routes to in-person assessment rather than
 * reassuring anyone.
 *
 * No figures: response times, prices and waiting lists change by provider and
 * by region and none appear here.
 *
 * Copy trap: /\bTODO\b/i in frontend/lib/content/publication-validation.ts
 * matches the ordinary Spanish word "todo". Written around throughout.
 */
import { cite, lead, p, renderArticle, ul, warn, type Article } from "./template.js";
import type { LocalePost, PostSet } from "./types.js";

const AEDV = "https://aedv.es/";
const SANIDAD = "https://www.sanidad.gob.es/";
const CGCOM_REGISTRO = "https://www.cgcom.es/servicios/consulta-publica-de-colegiados";

const href = (lang: string, path: string) => `https://www.myglobalhealth.online/spain/${lang}${path}`;

const es: LocalePost = {
  locale: "ES",
  slug: "dermatologo-online-que-puede-resolver",
  title: "Dermatólogo online: qué puede resolver y qué necesita ser presencial",
  excerpt:
    "La teledermatología resuelve bien el acné, la rosácea, la dermatitis, la psoriasis y la caída del cabello. Los lunares, en cambio, necesitan dermatoscopio. Explicamos dónde está la frontera, cómo hacer las fotos y qué señales no admiten espera.",
  seoTitle: "Dermatólogo online: qué resuelve y qué no",
  seoDescription:
    "Dermatólogo online en España: qué problemas de piel se resuelven por vídeo o fotografía, cuáles exigen consulta presencial y cómo hacer buenas fotos.",
  category: "Dermatología",
  article: {
    lang: "es-ES",
    tagline: "Medicina a cualquier hora, en cualquier lugar",
    categoryLabel: "Dermatología",
    categoryHref: href("es", "/blog"),
    eyebrow: "España · Guía práctica",
    h1: "Dermatólogo online",
    deck: "La piel es la especialidad que mejor se adapta a la consulta a distancia, y también la que más fácilmente se estropea con una mala fotografía.",
    intro:
      "Un <strong>dermatólogo online</strong> puede evaluar, diagnosticar y tratar buena parte de los problemas de piel más frecuentes —<strong>acné, rosácea, dermatitis, psoriasis, urticaria, caída del cabello, onicomicosis</strong>— a partir de una buena historia clínica y de imágenes correctas, y puede emitir receta electrónica cuando está indicado. Lo que no puede es explorar con <strong>dermatoscopio</strong>, tomar una <strong>biopsia</strong> ni tratar una lesión con crioterapia o cirugía. Por eso, ante un <strong>lunar</strong> nuevo o que cambia, la consulta online sirve para decidir con qué urgencia hay que verlo en persona, no para descartar nada. Esa es la frontera, y conviene conocerla antes de reservar.",
    facts: [
      "Buena para acné, eczema y psoriasis",
      "Los lunares necesitan dermatoscopio",
      "La foto decide la calidad de la consulta",
    ],
    primaryCta: { label: "Consulta de dermatología", href: href("es", "/services/dermatologia-especialista-online") },
    secondaryCta: { label: "Academia Española de Dermatología", href: AEDV },
    panelChip: "Qué cubre esta guía",
    panelParas: [
      "Los problemas que se resuelven bien a distancia y los que no, con el motivo clínico de cada caso.",
      "Cómo hacer fotografías que permitan trabajar a un dermatólogo, que es la parte que depende de usted.",
      "Qué hacer ante un lunar que cambia y qué señales obligan a una valoración presencial rápida.",
      "Tiempos de respuesta y precios cambian según el proveedor y la comunidad autónoma; aquí no se citan cifras.",
    ],
    author: {
      initials: "AM",
      name: "Dr. Alfredo del Valle Moreno Montañez",
      line: "Médico Especialista en Dermatología · Global Health España",
    },
    reviewLine:
      "Revisado clínicamente por el Dr. Eduardo Daniel Rodríguez Olivas, médico general, Global Health España.",
    navLabel: "En este artículo",
    sections: [
      {
        id: "que-resuelve",
        nav: "Qué resuelve",
        eyebrow: "Buen encaje",
        h2: "Lo que una consulta de dermatología online resuelve bien",
        blocks: [
          lead("La dermatología es visual, y eso juega a favor de la consulta a distancia más que en ninguna otra especialidad."),
          p("Cuando el problema es una erupción visible, una lesión inflamatoria o un proceso crónico ya conocido, el dermatólogo trabaja con lo mismo que usaría en la consulta presencial: la historia clínica, la distribución de las lesiones, su aspecto y su evolución. Añadir la exploración táctil cambia poco el resultado en la mayoría de estos cuadros."),
          ul([
            "<strong>Acné</strong> — clasificación, elección de tratamiento, ajuste de pauta y seguimiento de la respuesta.",
            "<strong>Rosácea</strong> y dermatitis seborreica — diagnóstico diferencial y control de brotes.",
            "<strong>Dermatitis atópica y eczemas</strong> — pauta de corticoide, emolientes, identificación de desencadenantes.",
            "<strong>Psoriasis</strong> — valoración de extensión, tratamiento tópico y criterios de derivación a tratamiento sistémico.",
            "<strong>Urticaria</strong> — manejo y estudio de causas, cuando procede.",
            "<strong>Caída del cabello</strong> — orientación diagnóstica, analítica dirigida y tratamiento.",
            "<strong>Onicomicosis y micosis cutáneas</strong> — confirmación y tratamiento, con muestra si es necesaria.",
            "<strong>Revisión de un tratamiento en curso</strong> que no está funcionando o que produce efectos adversos.",
          ]),
          p("Hay además una ventaja poco discutida: la consulta a distancia permite <strong>seguimiento frecuente</strong>. En procesos crónicos, revisar la evolución cada pocas semanas con fotografías comparables suele valer más que una consulta presencial semestral."),
        ],
      },
      {
        id: "que-no",
        nav: "Qué no resuelve",
        eyebrow: "Transparencia",
        h2: "Lo que una consulta online no puede hacer",
        blocks: [
          lead("Lo ponemos pronto y sin adornos, porque casi ningún servicio de teledermatología lo escribe."),
          p("Una consulta a distancia <strong>no incluye dermatoscopia</strong>. El dermatoscopio es el instrumento que permite ver estructuras de la lesión que la vista y una fotografía normal no muestran, y es la base de la valoración de lesiones pigmentadas. Ninguna cámara de móvil lo sustituye, por buena que sea la foto."),
          ul([
            "<strong>Dermatoscopia</strong> — imprescindible en lunares y lesiones pigmentadas.",
            "<strong>Biopsia cutánea</strong> — la única forma de obtener un diagnóstico histológico.",
            "<strong>Extirpación quirúrgica</strong> y <strong>crioterapia</strong> — actos presenciales.",
            "<strong>Palpación</strong> de una lesión: su consistencia, si está infiltrada o adherida.",
            "<strong>Exploración completa del cuerpo</strong> en pacientes con muchos nevus o antecedentes de melanoma.",
            "<strong>Lesiones en zonas de difícil fotografía</strong> — cuero cabelludo, pliegues, mucosas, zona genital.",
          ]),
          warn("Una foto normal no descarta un cáncer de piel", "Si una lesión pigmentada es nueva, ha cambiado, es distinta del resto de sus lunares, sangra o no cura, la respuesta correcta de una consulta online es indicarle con qué urgencia debe verla un dermatólogo en persona. Cualquier servicio que le tranquilice a partir de una fotografía le está prometiendo una certeza que la fotografía no da."),
        ],
      },
      {
        id: "fotos",
        nav: "Las fotos",
        eyebrow: "Su parte del trabajo",
        h2: "Cómo hacer fotografías con las que se pueda trabajar",
        blocks: [
          lead("La mayoría de las consultas online que se quedan a medias se quedan a medias por las imágenes, no por la distancia."),
          p("El objetivo es que el dermatólogo vea tres cosas: <strong>dónde está</strong> la lesión, <strong>cómo es</strong> en detalle y <strong>cómo se comporta</strong> en el tiempo. Eso se consigue con una secuencia sencilla que se puede hacer con cualquier teléfono actual."),
          ul([
            "<strong>Luz natural</strong>, de día, cerca de una ventana. Sin flash directo, que aplana el relieve y falsea el color.",
            "<strong>Tres distancias</strong>: una general de la zona del cuerpo, una media y una de cerca enfocando la lesión.",
            "<strong>Enfoque</strong>: toque la pantalla sobre la lesión antes de disparar y compruebe que la foto no ha salido movida.",
            "<strong>Escala</strong>: coloque una regla o una moneda al lado para dar referencia de tamaño.",
            "<strong>Sin filtros</strong>, sin recortes y sin retoques. El color es información clínica.",
            "<strong>Serie</strong>: si el proceso evoluciona, repita la misma toma, con la misma luz y el mismo encuadre.",
          ]),
          p("Añada a las imágenes lo que ninguna foto muestra: <strong>desde cuándo</strong>, si <strong>pica</strong>, duele o quema, si ha cambiado de tamaño o de color, qué se ha aplicado ya y con qué resultado, qué medicación toma y qué alergias tiene. Con eso, la consulta a distancia se parece mucho a la presencial."),
        ],
      },
      {
        id: "lunares",
        nav: "Lunares",
        eyebrow: "Prioridad",
        h2: "Lunares y manchas: cuándo hay que ir en persona",
        blocks: [
          lead("Ninguna guía debería tranquilizarle sobre un lunar. Lo que sí puede hacer es ayudarle a decidir la urgencia."),
          p("La regla más usada para valorar un lunar es el <strong>ABCDE</strong>: <strong>A</strong>simetría, <strong>B</strong>ordes irregulares, <strong>C</strong>olor heterogéneo o cambiante, <strong>D</strong>iámetro que aumenta y <strong>E</strong>volución. A ella se añade el <em>signo del patito feo</em>: un lunar que no se parece a los demás lunares de esa persona merece atención, aunque cumpla pocos criterios."),
          ul([
            "Una lesión pigmentada <strong>nueva</strong> en la edad adulta.",
            "Un lunar que <strong>cambia</strong> de tamaño, forma o color, o que empieza a picar.",
            "Una lesión que <strong>sangra</strong>, se ulcera o no cicatriza.",
            "Una herida o costra que <strong>no cura</strong> en semanas.",
            "Antecedentes personales o familiares de <strong>melanoma</strong>, muchos nevus o quemaduras solares graves en la infancia.",
          ]),
          p("En cualquiera de esos casos, la vía correcta es la valoración presencial con dermatoscopio. Una consulta online bien hecha le dirá exactamente eso, y le ayudará a llegar a ella con el historial ordenado en lugar de esperar meses sin saber si debía preocuparse."),
          cite(`Información divulgativa sobre lesiones cutáneas y prevención: <a href="${AEDV}" rel="nofollow noopener" target="_blank">Academia Española de Dermatología y Venereología</a>.`),
        ],
      },
      {
        id: "gratis",
        nav: "Vía pública",
        eyebrow: "La pregunta incómoda",
        h2: "«Dermatólogo online gratis»: qué existe realmente",
        blocks: [
          lead("Es una de las búsquedas más frecuentes y merece una respuesta honesta en lugar de una página de venta."),
          p("En España, la vía sin coste para el paciente es el <strong>Sistema Nacional de Salud</strong>: se accede a través del <strong>médico de atención primaria</strong>, que valora y deriva a dermatología. Buena parte de las comunidades autónomas emplea además <strong>teledermatología</strong> entre primaria y el servicio de dermatología, precisamente para priorizar las lesiones sospechosas. Si tiene una lesión que le preocupa, ese es el circuito, y usarlo no le impide consultar en privado si además quiere rapidez."),
          ul([
            "Los <strong>chats gratuitos</strong> y las aplicaciones de autodiagnóstico no son una consulta médica y no emiten receta.",
            "Un <strong>informe</strong> firmado por un médico colegiado y una <strong>receta electrónica</strong> solo salen de una consulta real.",
            "Ante una lesión sospechosa, la prioridad es ser visto, no ahorrar tiempo con un chat.",
          ]),
          p(`Puede comprobar la colegiación de cualquier médico en el <a href="${CGCOM_REGISTRO}" rel="nofollow noopener" target="_blank">registro público del CGCOM</a>, con nosotros igual que con cualquier otro.`),
        ],
      },
      {
        id: "senales",
        nav: "No esperar",
        eyebrow: "Seguridad",
        h2: "Señales que no admiten espera",
        blocks: [
          lead("Hay cuadros cutáneos que son urgencias médicas, y conviene reconocerlos."),
          ul([
            "Erupción con <strong>fiebre alta</strong>, afectación de mucosas, ampollas extensas o despegamiento de la piel.",
            "Manchas rojas o moradas que <strong>no desaparecen al presionar</strong>, con fiebre, rigidez de nuca o confusión.",
            "Hinchazón de labios, lengua o garganta, dificultad para respirar o para tragar tras un fármaco o un alimento.",
            "Zona de piel roja, caliente y dolorosa que se extiende con rapidez, con fiebre o malestar general.",
            "Dolor desproporcionado respecto a lo que se ve, en una zona de piel enrojecida.",
          ]),
          p("En estas situaciones llame al <strong>112</strong> o acuda a urgencias. Una consulta programada, sea online o presencial, no es el recurso adecuado."),
        ],
      },
    ],
    linksEyebrow: "Global Health España",
    linksH2: "Siguientes pasos",
    linksLead:
      "Nuestros dermatólogos en España evalúan por vídeo con las imágenes que usted aporte y le dicen con claridad qué se resuelve hoy y qué necesita verse en persona.",
    links: [
      { label: "Consulta de dermatología online", href: href("es", "/services/dermatologia-especialista-online") },
      { label: "Nuestros médicos en España", href: href("es", "/doctors") },
      { label: "Contactar con Global Health España", href: href("es", "/contact") },
    ],
    ctaBox: {
      h3: "¿Tiene una lesión que le preocupa?",
      text: "Prepare las fotografías como se explica arriba y reserve una consulta. Si lo que vemos necesita dermatoscopio, se lo diremos y le indicaremos con qué urgencia debe verlo un dermatólogo en persona.",
      primary: { label: "Reservar consulta", href: href("es", "/services/dermatologia-especialista-online") },
      secondary: { label: "Ver nuestros médicos", href: href("es", "/doctors") },
    },
    sourcesEyebrow: "Fuentes",
    sourcesH2: "Dónde ampliar",
    sourcesLead: "Recursos de referencia sobre dermatología, prevención del cáncer de piel y colegiación médica en España.",
    sources: [
      { label: "Academia Española de Dermatología y Venereología", href: AEDV },
      { label: "Ministerio de Sanidad", href: SANIDAD },
      { label: "Registro de colegiados — CGCOM", href: CGCOM_REGISTRO },
    ],
    sourcesNote:
      "Los enlaces abren en sitios externos. Global Health no realiza dermatoscopia, biopsias ni procedimientos quirúrgicos: cuando el caso los requiere, lo indicamos y derivamos.",
    faqEyebrow: "FAQ",
    faqH2: "Preguntas frecuentes",
    faqs: [
      {
        q: "¿Qué puede diagnosticar un dermatólogo online?",
        a: "Con una buena historia clínica e imágenes correctas se manejan bien el acné, la rosácea, la dermatitis atópica y de contacto, la psoriasis, la urticaria, las micosis, la onicomicosis y la caída del cabello, además del seguimiento de tratamientos en curso.",
      },
      {
        q: "¿Sirve una consulta online para revisar un lunar?",
        a: "Sirve para decidir la urgencia, no para descartar. La valoración de lesiones pigmentadas se basa en la dermatoscopia, que exige consulta presencial. Si un lunar es nuevo, cambia, sangra o se diferencia del resto, la indicación correcta es verlo en persona.",
      },
      {
        q: "¿Un dermatólogo online puede recetarme?",
        a: "Sí, cuando la valoración lo indica. Un médico colegiado puede emitir receta electrónica tras la consulta. Lo que no puede es prescribir sin evaluar, ni comprometer un tratamiento concreto antes de ver el caso.",
      },
      {
        q: "¿Cómo hago buenas fotos para la consulta?",
        a: "Con luz natural y sin flash, tres tomas —general, media y de cerca—, enfocando sobre la lesión, con una regla o moneda como referencia de tamaño, sin filtros ni retoques. Si el proceso evoluciona, repita el mismo encuadre para poder comparar.",
      },
      {
        q: "¿Existe el dermatólogo online gratis en España?",
        a: "La vía sin coste para el paciente es el Sistema Nacional de Salud, a través del médico de atención primaria, que valora y deriva; muchas comunidades usan teledermatología entre primaria y el servicio hospitalario. Los chats y aplicaciones gratuitas de autodiagnóstico no son consultas médicas y no emiten receta.",
      },
      {
        q: "¿Es lo mismo que ir al dermatólogo presencialmente?",
        a: "Para los procesos inflamatorios y crónicos, el resultado es muy similar y el seguimiento suele ser mejor por poder repetirse con más frecuencia. Para lesiones pigmentadas, biopsias, crioterapia o cirugía, la consulta presencial es imprescindible.",
      },
    ],
    disclaimerTitle: "Aviso Médico",
    disclaimer:
      "Escrito por el Dr. Alfredo del Valle Moreno Montañez, médico especialista en Dermatología de Global Health España, y revisado clínicamente por el Dr. Eduardo Daniel Rodríguez Olivas, médico general. Este artículo contiene información general sobre dermatología a distancia y no constituye asesoramiento médico personalizado. Ninguna fotografía permite descartar un cáncer de piel: las lesiones pigmentadas sospechosas requieren valoración presencial con dermatoscopio. Ante una emergencia médica, llame al 112.",
  } satisfies Article,
};

const en: LocalePost = {
  locale: "EN",
  slug: "online-dermatologist-spain",
  title: "Online dermatologist in Spain: what it solves and what must be seen in person",
  excerpt:
    "Teledermatology handles acne, rosacea, dermatitis, psoriasis and hair loss well. Moles are different: they need a dermatoscope. Where the boundary sits, how to take photographs a dermatologist can work from, and which signs cannot wait.",
  seoTitle: "Online dermatologist: what it solves and what not",
  seoDescription:
    "Online dermatologist in Spain: which skin problems are solved by video or photograph, which require an in-person visit, and how to take usable photos.",
  category: "Dermatology",
  article: {
    lang: "en-GB",
    tagline: "Medicine Anytime, Anywhere",
    categoryLabel: "Dermatology",
    categoryHref: href("en", "/blog"),
    eyebrow: "Spain · Practical guide",
    h1: "Online dermatologist",
    deck: "Skin is the specialty that adapts best to remote consultation, and also the one most easily ruined by a bad photograph.",
    intro:
      "An <strong>online dermatologist</strong> can assess, diagnose and treat a large share of the commonest skin problems — <strong>acne, rosacea, dermatitis, psoriasis, urticaria, hair loss, nail fungus</strong> — from a good history and correct images, and can issue an electronic prescription where indicated. What they cannot do is examine with a <strong>dermatoscope</strong>, take a <strong>biopsy</strong>, or treat a lesion with cryotherapy or surgery. So for a <strong>mole</strong> that is new or changing, an online consultation is there to decide how urgently it must be seen in person — not to rule anything out. That is the boundary, and it is worth knowing before you book.",
    facts: [
      "Good for acne, eczema and psoriasis",
      "Moles need a dermatoscope",
      "The photograph decides the consultation",
    ],
    primaryCta: { label: "Dermatology consultation", href: href("en", "/services/dermatologia-especialista-online") },
    secondaryCta: { label: "Spanish Academy of Dermatology", href: AEDV },
    panelChip: "What this guide covers",
    panelParas: [
      "The problems that are handled well remotely and the ones that are not, with the clinical reason in each case.",
      "How to take photographs a dermatologist can work from, which is the part that depends on you.",
      "What to do about a mole that is changing, and which signs force a rapid in-person assessment.",
      "Response times and prices vary by provider and by region; no figures are quoted here.",
    ],
    author: {
      initials: "AM",
      name: "Dr. Alfredo del Valle Moreno Montañez",
      line: "Consultant Dermatologist · Global Health Spain",
    },
    reviewLine:
      "Clinically reviewed by Dr. Eduardo Daniel Rodríguez Olivas, General Practitioner, Global Health Spain.",
    navLabel: "In this article",
    sections: [
      {
        id: "que-resuelve",
        nav: "What it solves",
        eyebrow: "Good fit",
        h2: "What an online dermatology consultation handles well",
        blocks: [
          lead("Dermatology is visual, and that favours remote consultation more than in any other specialty."),
          p("When the problem is a visible rash, an inflammatory lesion or a known chronic process, the dermatologist works from the same material they would use in the clinic: the history, the distribution of the lesions, their appearance and how they have evolved. Adding touch changes the outcome very little in most of these presentations."),
          ul([
            "<strong>Acne</strong> — classification, choice of treatment, dose adjustment and follow-up of the response.",
            "<strong>Rosacea</strong> and seborrhoeic dermatitis — differential diagnosis and control of flares.",
            "<strong>Atopic dermatitis and eczema</strong> — steroid regimen, emollients, identifying triggers.",
            "<strong>Psoriasis</strong> — assessment of extent, topical treatment and criteria for systemic referral.",
            "<strong>Urticaria</strong> — management and investigation of causes where appropriate.",
            "<strong>Hair loss</strong> — diagnostic orientation, targeted blood tests and treatment.",
            "<strong>Nail and skin fungal infections</strong> — confirmation and treatment, with a sample if required.",
            "<strong>Review of a current treatment</strong> that is not working or is causing side effects.",
          ]),
          p("There is also an advantage that is rarely discussed: remote consultation makes <strong>frequent follow-up</strong> practical. In chronic conditions, reviewing progress every few weeks with comparable photographs is usually worth more than one clinic visit every six months."),
        ],
      },
      {
        id: "que-no",
        nav: "What it cannot do",
        eyebrow: "Transparency",
        h2: "What an online consultation cannot do",
        blocks: [
          lead("We put this early and plainly, because almost no teledermatology service writes it down."),
          p("A remote consultation <strong>does not include dermoscopy</strong>. The dermatoscope is the instrument that shows structures within a lesion that the naked eye and an ordinary photograph do not, and it is the basis of assessing pigmented lesions. No phone camera replaces it, however good the photograph."),
          ul([
            "<strong>Dermoscopy</strong> — indispensable for moles and pigmented lesions.",
            "<strong>Skin biopsy</strong> — the only way to obtain a histological diagnosis.",
            "<strong>Surgical excision</strong> and <strong>cryotherapy</strong> — in-person procedures.",
            "<strong>Palpation</strong> of a lesion: its consistency, whether it is infiltrated or fixed.",
            "<strong>Full-body examination</strong> in people with many naevi or a history of melanoma.",
            "<strong>Lesions in places that photograph badly</strong> — scalp, skin folds, mucosa, genital area.",
          ]),
          warn("An ordinary photograph does not rule out skin cancer", "If a pigmented lesion is new, has changed, looks different from your other moles, bleeds or fails to heal, the correct answer from an online consultation is to tell you how urgently a dermatologist must see it in person. Any service that reassures you from a photograph is promising a certainty the photograph cannot give."),
        ],
      },
      {
        id: "fotos",
        nav: "The photographs",
        eyebrow: "Your part of the work",
        h2: "How to take photographs that can be worked from",
        blocks: [
          lead("Most online consultations that stall do so because of the images, not because of the distance."),
          p("The aim is for the dermatologist to see three things: <strong>where</strong> the lesion is, <strong>what it looks like</strong> close up and <strong>how it behaves</strong> over time. A simple sequence achieves that on any current phone."),
          ul([
            "<strong>Natural light</strong>, daytime, near a window. No direct flash, which flattens relief and falsifies colour.",
            "<strong>Three distances</strong>: one wide shot of the body area, one mid-range and one close-up of the lesion.",
            "<strong>Focus</strong>: tap the screen on the lesion before you shoot and check the image is not blurred.",
            "<strong>Scale</strong>: place a ruler or a coin beside it to give a size reference.",
            "<strong>No filters</strong>, no cropping and no retouching. Colour is clinical information.",
            "<strong>A series</strong>: if the problem is evolving, repeat the same shot, same light, same framing.",
          ]),
          p("Add to the images what no photograph shows: <strong>how long</strong> it has been there, whether it <strong>itches</strong>, hurts or burns, whether it has changed in size or colour, what you have already applied and with what result, what medication you take and what allergies you have. With that, a remote consultation looks a great deal like a clinic one."),
        ],
      },
      {
        id: "lunares",
        nav: "Moles",
        eyebrow: "Priority",
        h2: "Moles and marks: when you have to be seen in person",
        blocks: [
          lead("No guide should reassure you about a mole. What it can do is help you decide the urgency."),
          p("The commonest rule for assessing a mole is <strong>ABCDE</strong>: <strong>A</strong>symmetry, irregular <strong>B</strong>orders, <strong>C</strong>olour that is uneven or changing, <strong>D</strong>iameter that is increasing and <strong>E</strong>volution. To that is added the <em>ugly duckling sign</em>: a mole that does not resemble that person's other moles deserves attention even if it meets few criteria."),
          ul([
            "A <strong>new</strong> pigmented lesion appearing in adulthood.",
            "A mole that <strong>changes</strong> in size, shape or colour, or that starts to itch.",
            "A lesion that <strong>bleeds</strong>, ulcerates or does not scar over.",
            "A wound or crust that <strong>does not heal</strong> over a period of weeks.",
            "Personal or family history of <strong>melanoma</strong>, many naevi, or severe sunburn in childhood.",
          ]),
          p("In any of those cases the correct route is in-person assessment with a dermatoscope. A well-run online consultation will tell you exactly that, and will help you arrive with your history in order rather than waiting months not knowing whether to worry."),
          cite(`General information on skin lesions and prevention: <a href="${AEDV}" rel="nofollow noopener" target="_blank">Spanish Academy of Dermatology and Venereology</a>.`),
        ],
      },
      {
        id: "gratis",
        nav: "Public route",
        eyebrow: "The awkward question",
        h2: "«Free online dermatologist»: what actually exists",
        blocks: [
          lead("It is one of the most frequent searches and it deserves an honest answer rather than a sales page."),
          p("In Spain the route at no cost to the patient is the <strong>Sistema Nacional de Salud</strong>: you enter it through your <strong>primary care doctor</strong>, who assesses and refers to dermatology. Most autonomous communities also use <strong>teledermatology</strong> between primary care and the dermatology department, precisely in order to prioritise suspicious lesions. If you have a lesion that worries you, that is the pathway — and using it does not stop you consulting privately as well if you also want speed."),
          ul([
            "<strong>Free chats</strong> and self-diagnosis apps are not a medical consultation and issue no prescription.",
            "A <strong>report</strong> signed by a registered doctor and an <strong>electronic prescription</strong> only come out of a real consultation.",
            "Faced with a suspicious lesion, the priority is being seen, not saving time with a chat.",
          ]),
          p(`You can check any doctor's registration in the <a href="${CGCOM_REGISTRO}" rel="nofollow noopener" target="_blank">CGCOM public register</a> — ours as readily as anyone else's.`),
        ],
      },
      {
        id: "senales",
        nav: "Do not wait",
        eyebrow: "Safety",
        h2: "Signs that cannot wait",
        blocks: [
          lead("Some skin presentations are medical emergencies, and they are worth recognising."),
          ul([
            "A rash with <strong>high fever</strong>, mucosal involvement, extensive blistering or skin peeling away.",
            "Red or purple marks that <strong>do not fade when pressed</strong>, with fever, neck stiffness or confusion.",
            "Swelling of the lips, tongue or throat, difficulty breathing or swallowing after a medicine or a food.",
            "An area of skin that is red, hot and painful and spreading quickly, with fever or feeling unwell.",
            "Pain out of all proportion to what can be seen, in an area of reddened skin.",
          ]),
          p("In these situations call <strong>112</strong> or go to an emergency department. A booked consultation, online or in person, is not the right resource."),
        ],
      },
    ],
    linksEyebrow: "Global Health Spain",
    linksH2: "Next steps",
    linksLead:
      "Our dermatologists in Spain assess by video using the images you provide, and tell you plainly what can be settled today and what needs to be seen in person.",
    links: [
      { label: "Online dermatology consultation", href: href("en", "/services/dermatologia-especialista-online") },
      { label: "Our doctors in Spain", href: href("en", "/doctors") },
      { label: "Contact Global Health Spain", href: href("en", "/contact") },
    ],
    ctaBox: {
      h3: "Have a lesion that worries you?",
      text: "Prepare the photographs as explained above and book a consultation. If what we see needs a dermatoscope, we will say so and tell you how urgently a dermatologist should look at it in person.",
      primary: { label: "Book a consultation", href: href("en", "/services/dermatologia-especialista-online") },
      secondary: { label: "See our doctors", href: href("en", "/doctors") },
    },
    sourcesEyebrow: "Sources",
    sourcesH2: "Where to read more",
    sourcesLead: "Reference resources on dermatology, skin cancer prevention and medical registration in Spain.",
    sources: [
      { label: "Spanish Academy of Dermatology and Venereology", href: AEDV },
      { label: "Ministry of Health", href: SANIDAD },
      { label: "Register of doctors — CGCOM", href: CGCOM_REGISTRO },
    ],
    sourcesNote:
      "Links open on external sites. Global Health does not perform dermoscopy, biopsies or surgical procedures: where a case requires them, we say so and refer.",
    faqEyebrow: "FAQ",
    faqH2: "Common questions",
    faqs: [
      {
        q: "What can an online dermatologist diagnose?",
        a: "With a good history and correct images, acne, rosacea, atopic and contact dermatitis, psoriasis, urticaria, fungal infections, nail fungus and hair loss are all handled well, as is follow-up of treatment already under way.",
      },
      {
        q: "Is an online consultation any use for checking a mole?",
        a: "It is useful for deciding urgency, not for ruling anything out. Assessment of pigmented lesions rests on dermoscopy, which requires an in-person visit. If a mole is new, changing, bleeding or unlike your others, the correct advice is to have it seen in person.",
      },
      {
        q: "Can an online dermatologist prescribe for me?",
        a: "Yes, where the assessment indicates it. A registered doctor can issue an electronic prescription after the consultation. What they cannot do is prescribe without assessing, or promise a particular treatment before seeing the case.",
      },
      {
        q: "How do I take good photographs for the consultation?",
        a: "Natural light and no flash, three shots — wide, mid and close-up — focused on the lesion, with a ruler or coin for scale, no filters or retouching. If the problem is evolving, repeat the same framing so the images can be compared.",
      },
      {
        q: "Does a free online dermatologist exist in Spain?",
        a: "The route at no cost to the patient is the Sistema Nacional de Salud, through your primary care doctor, who assesses and refers; many regions use teledermatology between primary care and the hospital department. Free chats and self-diagnosis apps are not medical consultations and issue no prescription.",
      },
      {
        q: "Is it the same as seeing a dermatologist in person?",
        a: "For inflammatory and chronic conditions the outcome is very similar, and follow-up is often better because it can be repeated more frequently. For pigmented lesions, biopsies, cryotherapy or surgery, an in-person visit is essential.",
      },
    ],
    disclaimerTitle: "Medical Disclaimer",
    disclaimer:
      "Written by Dr. Alfredo del Valle Moreno Montañez, Consultant Dermatologist at Global Health Spain, and clinically reviewed by Dr. Eduardo Daniel Rodríguez Olivas, General Practitioner. This article contains general information about remote dermatology and is not personalised medical advice. No photograph can rule out skin cancer: suspicious pigmented lesions require in-person assessment with a dermatoscope. In a medical emergency, call 112.",
  } satisfies Article,
};

const pt: LocalePost = {
  locale: "PT",
  slug: "dermatologista-online-espanha",
  title: "Dermatologista online em Espanha: o que resolve e o que exige consulta presencial",
  excerpt:
    "A teledermatologia resolve bem a acne, a rosácea, a dermatite, a psoríase e a queda de cabelo. Os sinais, esses, precisam de dermatoscópio. Onde está a fronteira, como fazer as fotografias e que sinais de alarme não admitem espera.",
  seoTitle: "Dermatologista online: o que resolve e o que não",
  seoDescription:
    "Dermatologista online em Espanha: que problemas de pele se resolvem por vídeo ou fotografia, quais exigem consulta presencial e como fazer boas fotos.",
  category: "Dermatologia",
  article: {
    lang: "pt-PT",
    tagline: "Medicina a qualquer hora, em qualquer lugar",
    categoryLabel: "Dermatologia",
    categoryHref: href("pt", "/blog"),
    eyebrow: "Espanha · Guia prático",
    h1: "Dermatologista online",
    deck: "A pele é a especialidade que melhor se adapta à consulta à distância e também aquela que mais facilmente se estraga com uma má fotografia.",
    intro:
      "Um <strong>dermatologista online</strong> pode avaliar, diagnosticar e tratar boa parte dos problemas de pele mais frequentes — <strong>acne, rosácea, dermatite, psoríase, urticária, queda de cabelo, onicomicose</strong> — a partir de uma boa história clínica e de imagens corretas, e pode emitir receita eletrónica quando está indicado. O que não pode é observar com <strong>dermatoscópio</strong>, fazer uma <strong>biópsia</strong> nem tratar uma lesão com crioterapia ou cirurgia. Por isso, perante um <strong>sinal</strong> novo ou que muda, a consulta online serve para decidir com que urgência tem de ser visto presencialmente, não para excluir nada. É essa a fronteira, e convém conhecê-la antes de marcar.",
    facts: [
      "Boa para acne, eczema e psoríase",
      "Os sinais precisam de dermatoscópio",
      "A fotografia decide a consulta",
    ],
    primaryCta: { label: "Consulta de dermatologia", href: href("pt", "/services/dermatologia-especialista-online") },
    secondaryCta: { label: "Academia Espanhola de Dermatologia", href: AEDV },
    panelChip: "O que este guia cobre",
    panelParas: [
      "Os problemas que se resolvem bem à distância e os que não, com a razão clínica de cada caso.",
      "Como fazer fotografias com que um dermatologista consiga trabalhar, que é a parte que depende de si.",
      "O que fazer perante um sinal que muda e que sinais de alarme obrigam a avaliação presencial rápida.",
      "Tempos de resposta e preços variam consoante o prestador e a comunidade autónoma; aqui não se citam números.",
    ],
    author: {
      initials: "AM",
      name: "Dr. Alfredo del Valle Moreno Montañez",
      line: "Médico Especialista em Dermatologia · Global Health Espanha",
    },
    reviewLine:
      "Revisto clinicamente pelo Dr. Eduardo Daniel Rodríguez Olivas, médico de clínica geral, Global Health Espanha.",
    navLabel: "Neste artigo",
    sections: [
      {
        id: "que-resuelve",
        nav: "O que resolve",
        eyebrow: "Bom encaixe",
        h2: "O que uma consulta de dermatologia online resolve bem",
        blocks: [
          lead("A dermatologia é visual, e isso joga a favor da consulta à distância mais do que em qualquer outra especialidade."),
          p("Quando o problema é uma erupção visível, uma lesão inflamatória ou um processo crónico já conhecido, o dermatologista trabalha com o mesmo que usaria na consulta presencial: a história clínica, a distribuição das lesões, o seu aspeto e a sua evolução. Acrescentar o exame táctil muda pouco o resultado na maioria destes quadros."),
          ul([
            "<strong>Acne</strong> — classificação, escolha do tratamento, ajuste do esquema e seguimento da resposta.",
            "<strong>Rosácea</strong> e dermatite seborreica — diagnóstico diferencial e controlo dos surtos.",
            "<strong>Dermatite atópica e eczemas</strong> — esquema de corticoide, emolientes, identificação de fatores desencadeantes.",
            "<strong>Psoríase</strong> — avaliação da extensão, tratamento tópico e critérios de referenciação para tratamento sistémico.",
            "<strong>Urticária</strong> — abordagem e estudo de causas, quando se justifica.",
            "<strong>Queda de cabelo</strong> — orientação diagnóstica, análises dirigidas e tratamento.",
            "<strong>Onicomicose e micoses cutâneas</strong> — confirmação e tratamento, com colheita se necessário.",
            "<strong>Revisão de um tratamento em curso</strong> que não está a resultar ou que provoca efeitos adversos.",
          ]),
          p("Há ainda uma vantagem pouco discutida: a consulta à distância permite <strong>seguimento frequente</strong>. Em processos crónicos, rever a evolução de poucas em poucas semanas com fotografias comparáveis vale habitualmente mais do que uma consulta presencial de seis em seis meses."),
        ],
      },
      {
        id: "que-no",
        nav: "O que não resolve",
        eyebrow: "Transparência",
        h2: "O que uma consulta online não pode fazer",
        blocks: [
          lead("Dizemo-lo cedo e sem rodeios, porque quase nenhum serviço de teledermatologia o escreve."),
          p("Uma consulta à distância <strong>não inclui dermatoscopia</strong>. O dermatoscópio é o instrumento que permite ver estruturas da lesão que a vista e uma fotografia normal não mostram, e é a base da avaliação de lesões pigmentadas. Nenhuma câmara de telemóvel o substitui, por melhor que seja a foto."),
          ul([
            "<strong>Dermatoscopia</strong> — imprescindível em sinais e lesões pigmentadas.",
            "<strong>Biópsia cutânea</strong> — a única forma de obter um diagnóstico histológico.",
            "<strong>Excisão cirúrgica</strong> e <strong>crioterapia</strong> — atos presenciais.",
            "<strong>Palpação</strong> de uma lesão: a sua consistência, se está infiltrada ou aderente.",
            "<strong>Observação completa do corpo</strong> em pessoas com muitos nevos ou antecedentes de melanoma.",
            "<strong>Lesões em zonas de difícil fotografia</strong> — couro cabeludo, pregas, mucosas, zona genital.",
          ]),
          warn("Uma foto normal não exclui um cancro da pele", "Se uma lesão pigmentada é nova, mudou, é diferente dos seus outros sinais, sangra ou não cicatriza, a resposta correta de uma consulta online é indicar-lhe com que urgência um dermatologista a deve ver presencialmente. Qualquer serviço que o tranquilize a partir de uma fotografia está a prometer uma certeza que a fotografia não dá."),
        ],
      },
      {
        id: "fotos",
        nav: "As fotografias",
        eyebrow: "A sua parte do trabalho",
        h2: "Como fazer fotografias com que se consiga trabalhar",
        blocks: [
          lead("A maioria das consultas online que ficam a meio fica a meio por causa das imagens, não da distância."),
          p("O objetivo é que o dermatologista veja três coisas: <strong>onde está</strong> a lesão, <strong>como é</strong> ao pormenor e <strong>como se comporta</strong> ao longo do tempo. Isso consegue-se com uma sequência simples, ao alcance de qualquer telemóvel atual."),
          ul([
            "<strong>Luz natural</strong>, de dia, junto a uma janela. Sem flash direto, que achata o relevo e falseia a cor.",
            "<strong>Três distâncias</strong>: uma geral da zona do corpo, uma média e uma de perto focando a lesão.",
            "<strong>Foco</strong>: toque no ecrã sobre a lesão antes de disparar e confirme que a foto não ficou tremida.",
            "<strong>Escala</strong>: coloque uma régua ou uma moeda ao lado para dar referência de tamanho.",
            "<strong>Sem filtros</strong>, sem cortes e sem retoques. A cor é informação clínica.",
            "<strong>Série</strong>: se o processo evolui, repita a mesma imagem, com a mesma luz e o mesmo enquadramento.",
          ]),
          p("Junte às imagens aquilo que nenhuma foto mostra: <strong>desde quando</strong>, se <strong>faz comichão</strong>, dói ou arde, se mudou de tamanho ou de cor, o que já aplicou e com que resultado, que medicação toma e que alergias tem. Com isso, a consulta à distância aproxima-se muito da presencial."),
        ],
      },
      {
        id: "lunares",
        nav: "Sinais",
        eyebrow: "Prioridade",
        h2: "Sinais e manchas: quando é preciso ir presencialmente",
        blocks: [
          lead("Nenhum guia o deve tranquilizar acerca de um sinal. O que pode fazer é ajudá-lo a decidir a urgência."),
          p("A regra mais usada para avaliar um sinal é o <strong>ABCDE</strong>: <strong>A</strong>ssimetria, <strong>B</strong>ordos irregulares, <strong>C</strong>or heterogénea ou que muda, <strong>D</strong>iâmetro que aumenta e <strong>E</strong>volução. A ela junta-se o <em>sinal do patinho feio</em>: um sinal que não se parece com os restantes sinais daquela pessoa merece atenção, mesmo que cumpra poucos critérios."),
          ul([
            "Uma lesão pigmentada <strong>nova</strong> na idade adulta.",
            "Um sinal que <strong>muda</strong> de tamanho, forma ou cor, ou que começa a fazer comichão.",
            "Uma lesão que <strong>sangra</strong>, ulcera ou não cicatriza.",
            "Uma ferida ou crosta que <strong>não sara</strong> ao fim de semanas.",
            "Antecedentes pessoais ou familiares de <strong>melanoma</strong>, muitos nevos ou queimaduras solares graves na infância.",
          ]),
          p("Em qualquer desses casos, a via correta é a avaliação presencial com dermatoscópio. Uma consulta online bem feita dir-lhe-á exatamente isso e ajudá-lo-á a chegar lá com o historial organizado, em vez de esperar meses sem saber se devia preocupar-se."),
          cite(`Informação divulgativa sobre lesões cutâneas e prevenção: <a href="${AEDV}" rel="nofollow noopener" target="_blank">Academia Espanhola de Dermatologia e Venereologia</a>.`),
        ],
      },
      {
        id: "gratis",
        nav: "Via pública",
        eyebrow: "A pergunta incómoda",
        h2: "«Dermatologista online grátis»: o que existe realmente",
        blocks: [
          lead("É uma das pesquisas mais frequentes e merece uma resposta honesta em vez de uma página de venda."),
          p("Em Espanha, a via sem custo para o doente é o <strong>Sistema Nacional de Saúde</strong> espanhol: acede-se através do <strong>médico de cuidados primários</strong>, que avalia e referencia para dermatologia. Boa parte das comunidades autónomas usa ainda <strong>teledermatologia</strong> entre os cuidados primários e o serviço de dermatologia, precisamente para dar prioridade às lesões suspeitas. Se tem uma lesão que o preocupa, é esse o circuito, e usá-lo não o impede de consultar no privado se além disso quiser rapidez."),
          ul([
            "Os <strong>chats gratuitos</strong> e as aplicações de autodiagnóstico não são uma consulta médica e não emitem receita.",
            "Um <strong>relatório</strong> assinado por médico inscrito na ordem e uma <strong>receita eletrónica</strong> só saem de uma consulta real.",
            "Perante uma lesão suspeita, a prioridade é ser visto, não poupar tempo com um chat.",
          ]),
          p(`Pode confirmar a inscrição de qualquer médico no <a href="${CGCOM_REGISTRO}" rel="nofollow noopener" target="_blank">registo público do CGCOM</a>, connosco tal como com qualquer outro.`),
        ],
      },
      {
        id: "senales",
        nav: "Não esperar",
        eyebrow: "Segurança",
        h2: "Sinais de alarme que não admitem espera",
        blocks: [
          lead("Há quadros cutâneos que são urgências médicas, e convém reconhecê-los."),
          ul([
            "Erupção com <strong>febre alta</strong>, atingimento das mucosas, bolhas extensas ou descolamento da pele.",
            "Manchas vermelhas ou roxas que <strong>não desaparecem à pressão</strong>, com febre, rigidez da nuca ou confusão.",
            "Inchaço dos lábios, língua ou garganta, dificuldade em respirar ou engolir após um medicamento ou um alimento.",
            "Zona de pele vermelha, quente e dolorosa que se alastra depressa, com febre ou mal-estar geral.",
            "Dor desproporcionada em relação ao que se vê, numa zona de pele avermelhada.",
          ]),
          p("Nestas situações ligue <strong>112</strong> ou dirija-se ao serviço de urgência. Uma consulta marcada, online ou presencial, não é o recurso adequado."),
        ],
      },
    ],
    linksEyebrow: "Global Health Espanha",
    linksH2: "Passos seguintes",
    linksLead:
      "Os nossos dermatologistas em Espanha avaliam por vídeo com as imagens que nos enviar e dizem-lhe com clareza o que se resolve hoje e o que precisa de ser visto presencialmente.",
    links: [
      { label: "Consulta de dermatologia online", href: href("pt", "/services/dermatologia-especialista-online") },
      { label: "Os nossos médicos em Espanha", href: href("pt", "/doctors") },
      { label: "Contactar a Global Health Espanha", href: href("pt", "/contact") },
    ],
    ctaBox: {
      h3: "Tem uma lesão que o preocupa?",
      text: "Prepare as fotografias como se explica acima e marque uma consulta. Se o que virmos precisar de dermatoscópio, dizemos-lho e indicamos com que urgência um dermatologista o deve ver presencialmente.",
      primary: { label: "Marcar consulta", href: href("pt", "/services/dermatologia-especialista-online") },
      secondary: { label: "Ver os nossos médicos", href: href("pt", "/doctors") },
    },
    sourcesEyebrow: "Fontes",
    sourcesH2: "Onde saber mais",
    sourcesLead: "Recursos de referência sobre dermatologia, prevenção do cancro da pele e inscrição médica em Espanha.",
    sources: [
      { label: "Academia Espanhola de Dermatologia e Venereologia", href: AEDV },
      { label: "Ministério da Saúde de Espanha", href: SANIDAD },
      { label: "Registo de médicos — CGCOM", href: CGCOM_REGISTRO },
    ],
    sourcesNote:
      "As ligações abrem em sítios externos. A Global Health não realiza dermatoscopia, biópsias nem procedimentos cirúrgicos: quando o caso os exige, indicamo-lo e referenciamos.",
    faqEyebrow: "FAQ",
    faqH2: "Perguntas frequentes",
    faqs: [
      {
        q: "O que pode diagnosticar um dermatologista online?",
        a: "Com uma boa história clínica e imagens corretas tratam-se bem a acne, a rosácea, a dermatite atópica e de contacto, a psoríase, a urticária, as micoses, a onicomicose e a queda de cabelo, além do seguimento de tratamentos em curso.",
      },
      {
        q: "Uma consulta online serve para ver um sinal?",
        a: "Serve para decidir a urgência, não para excluir. A avaliação de lesões pigmentadas assenta na dermatoscopia, que exige consulta presencial. Se um sinal é novo, muda, sangra ou é diferente dos restantes, a indicação correta é vê-lo presencialmente.",
      },
      {
        q: "Um dermatologista online pode receitar?",
        a: "Sim, quando a avaliação o indica. Um médico inscrito na ordem pode emitir receita eletrónica após a consulta. O que não pode é prescrever sem avaliar, nem comprometer-se com um tratamento concreto antes de ver o caso.",
      },
      {
        q: "Como faço boas fotografias para a consulta?",
        a: "Com luz natural e sem flash, três imagens — geral, média e de perto —, focando a lesão, com uma régua ou moeda como referência de tamanho, sem filtros nem retoques. Se o processo evolui, repita o mesmo enquadramento para poder comparar.",
      },
      {
        q: "Existe dermatologista online grátis em Espanha?",
        a: "A via sem custo para o doente é o Sistema Nacional de Saúde espanhol, através do médico de cuidados primários, que avalia e referencia; muitas comunidades usam teledermatologia entre os cuidados primários e o hospital. Os chats e aplicações gratuitas de autodiagnóstico não são consultas médicas e não emitem receita.",
      },
      {
        q: "É o mesmo que ir ao dermatologista presencialmente?",
        a: "Para os processos inflamatórios e crónicos, o resultado é muito semelhante e o seguimento costuma ser melhor por poder repetir-se com mais frequência. Para lesões pigmentadas, biópsias, crioterapia ou cirurgia, a consulta presencial é imprescindível.",
      },
    ],
    disclaimerTitle: "Aviso Médico",
    disclaimer:
      "Escrito pelo Dr. Alfredo del Valle Moreno Montañez, médico especialista em Dermatologia da Global Health Espanha, e revisto clinicamente pelo Dr. Eduardo Daniel Rodríguez Olivas, médico de clínica geral. Este artigo contém informação geral sobre dermatologia à distância e não constitui aconselhamento médico personalizado. Nenhuma fotografia permite excluir um cancro da pele: as lesões pigmentadas suspeitas exigem avaliação presencial com dermatoscópio. Perante uma emergência médica, ligue 112.",
  } satisfies Article,
};

const cs: LocalePost = {
  locale: "CS",
  slug: "dermatolog-online-spanelsko",
  title: "Dermatolog online ve Španělsku: co vyřeší a co vyžaduje osobní vyšetření",
  excerpt:
    "Teledermatologie dobře zvládá akné, růžovku, ekzém, lupénku i vypadávání vlasů. Znaménka jsou jiný případ: potřebují dermatoskop. Kde vede hranice, jak fotografovat a které příznaky nesnesou odklad.",
  seoTitle: "Dermatolog online: co vyřeší a co ne",
  seoDescription:
    "Dermatolog online ve Španělsku: které kožní potíže lze řešit přes video nebo fotografie, co vyžaduje osobní vyšetření a jak pořídit použitelné fotky.",
  category: "Dermatologie",
  article: {
    lang: "cs-CZ",
    tagline: "Medicína kdykoli a kdekoli",
    categoryLabel: "Dermatologie",
    categoryHref: href("cs", "/blog"),
    eyebrow: "Španělsko · Praktický průvodce",
    h1: "Dermatolog online",
    deck: "Kůže je obor, který se konzultaci na dálku přizpůsobuje nejlépe — a zároveň ten, který nejsnáze pokazí špatná fotografie.",
    intro:
      "<strong>Dermatolog online</strong> dokáže posoudit, diagnostikovat a léčit velkou část nejčastějších kožních potíží — <strong>akné, růžovku, ekzém, lupénku, kopřivku, vypadávání vlasů, plísně nehtů</strong> — na základě dobré anamnézy a správných snímků a v indikovaných případech může vystavit elektronický recept. Co udělat nemůže, je vyšetření <strong>dermatoskopem</strong>, <strong>biopsie</strong> ani ošetření léze kryoterapií nebo chirurgicky. U <strong>znaménka</strong>, které je nové nebo se mění, proto online konzultace slouží k rozhodnutí, jak naléhavě je třeba vidět je osobně — ne k vyloučení čehokoli. To je ta hranice a vyplatí se ji znát dřív, než se objednáte.",
    facts: [
      "Vhodné pro akné, ekzém a lupénku",
      "Znaménka potřebují dermatoskop",
      "O kvalitě konzultace rozhoduje fotografie",
    ],
    primaryCta: { label: "Dermatologická konzultace", href: href("cs", "/services/dermatologia-especialista-online") },
    secondaryCta: { label: "Španělská dermatologická akademie", href: AEDV },
    panelChip: "Co tento průvodce pokrývá",
    panelParas: [
      "Potíže, které se na dálku řeší dobře, a ty, které ne — s klinickým důvodem u každé z nich.",
      "Jak pořídit fotografie, se kterými dermatolog dokáže pracovat; to je část, která závisí na vás.",
      "Co dělat se znaménkem, které se mění, a které příznaky vyžadují rychlé osobní vyšetření.",
      "Doba odezvy a ceny se liší podle poskytovatele a regionu; žádná čísla zde neuvádíme.",
    ],
    author: {
      initials: "AM",
      name: "Dr. Alfredo del Valle Moreno Montañez",
      line: "Lékař specialista na dermatologii · Global Health Španělsko",
    },
    reviewLine:
      "Klinicky revidoval Dr. Eduardo Daniel Rodríguez Olivas, praktický lékař, Global Health Španělsko.",
    navLabel: "Obsah článku",
    sections: [
      {
        id: "que-resuelve",
        nav: "Co vyřeší",
        eyebrow: "Dobrá shoda",
        h2: "Co dermatologická konzultace online zvládá dobře",
        blocks: [
          lead("Dermatologie je vizuální obor, a to hraje ve prospěch konzultace na dálku víc než u kterékoli jiné specializace."),
          p("Když je problémem viditelná vyrážka, zánětlivá léze nebo již známé chronické onemocnění, pracuje dermatolog se stejným materiálem jako v ordinaci: s anamnézou, rozložením lézí, jejich vzhledem a vývojem. Doplnit pohmatové vyšetření mění u většiny těchto stavů výsledek jen málo."),
          ul([
            "<strong>Akné</strong> — klasifikace, volba léčby, úprava dávkování a sledování odpovědi.",
            "<strong>Růžovka</strong> a seboroická dermatitida — diferenciální diagnostika a zvládání vzplanutí.",
            "<strong>Atopická dermatitida a ekzémy</strong> — režim kortikoidů, emoliencia, hledání spouštěčů.",
            "<strong>Lupénka</strong> — posouzení rozsahu, lokální léčba a kritéria pro převedení na systémovou léčbu.",
            "<strong>Kopřivka</strong> — léčba a pátrání po příčinách, je-li namístě.",
            "<strong>Vypadávání vlasů</strong> — diagnostické směřování, cílené odběry a léčba.",
            "<strong>Onychomykóza a kožní mykózy</strong> — potvrzení a léčba, v případě potřeby s odběrem vzorku.",
            "<strong>Revize probíhající léčby</strong>, která nefunguje nebo působí nežádoucí účinky.",
          ]),
          p("Je tu ještě jedna málo zmiňovaná výhoda: konzultace na dálku umožňuje <strong>časté sledování</strong>. U chronických onemocnění bývá kontrola vývoje po několika týdnech se srovnatelnými fotografiemi cennější než jedna osobní návštěva za půl roku."),
        ],
      },
      {
        id: "que-no",
        nav: "Co nevyřeší",
        eyebrow: "Otevřeně",
        h2: "Co online konzultace udělat nemůže",
        blocks: [
          lead("Píšeme to hned a bez příkras, protože téměř žádná teledermatologická služba to neuvádí."),
          p("Konzultace na dálku <strong>nezahrnuje dermatoskopii</strong>. Dermatoskop je přístroj, který ukáže struktury uvnitř léze, jež pouhé oko ani běžná fotografie nezobrazí, a je základem hodnocení pigmentových lézí. Žádný fotoaparát v telefonu jej nenahradí, ať je snímek jakkoli dobrý."),
          ul([
            "<strong>Dermatoskopie</strong> — nezbytná u znamének a pigmentových lézí.",
            "<strong>Kožní biopsie</strong> — jediný způsob, jak získat histologickou diagnózu.",
            "<strong>Chirurgické odstranění</strong> a <strong>kryoterapie</strong> — výkony vyžadující osobní návštěvu.",
            "<strong>Pohmat</strong> léze: její konzistence, zda je infiltrovaná nebo fixovaná ke spodině.",
            "<strong>Prohlídka celého těla</strong> u lidí s velkým počtem névů nebo s melanomem v anamnéze.",
            "<strong>Léze v obtížně fotografovatelných místech</strong> — vlasatá část hlavy, kožní záhyby, sliznice, genitál.",
          ]),
          warn("Běžná fotografie nevylučuje rakovinu kůže", "Pokud je pigmentová léze nová, změnila se, liší se od ostatních znamének, krvácí nebo se nehojí, správnou odpovědí online konzultace je sdělit vám, jak naléhavě ji musí osobně vidět dermatolog. Každá služba, která vás uklidní na základě fotografie, slibuje jistotu, kterou fotografie nedává."),
        ],
      },
      {
        id: "fotos",
        nav: "Fotografie",
        eyebrow: "Vaše část práce",
        h2: "Jak pořídit fotografie, se kterými se dá pracovat",
        blocks: [
          lead("Většina online konzultací, které skončí na půli cesty, na tom ztroskotá kvůli snímkům, ne kvůli vzdálenosti."),
          p("Cílem je, aby dermatolog viděl tři věci: <strong>kde</strong> léze je, <strong>jak vypadá</strong> zblízka a <strong>jak se chová</strong> v čase. Toho dosáhnete jednoduchým postupem s libovolným současným telefonem."),
          ul([
            "<strong>Denní světlo</strong>, ve dne, u okna. Bez přímého blesku, který srovnává reliéf a zkresluje barvu.",
            "<strong>Tři vzdálenosti</strong>: celkový snímek dané části těla, střední záběr a detail léze.",
            "<strong>Zaostření</strong>: klepněte na displeji na lézi a před odesláním zkontrolujte, že snímek není rozmazaný.",
            "<strong>Měřítko</strong>: přiložte pravítko nebo minci, aby byla patrná velikost.",
            "<strong>Bez filtrů</strong>, bez ořezů a bez retuší. Barva je klinická informace.",
            "<strong>Série</strong>: pokud se stav vyvíjí, opakujte stejný záběr při stejném světle a ve stejné kompozici.",
          ]),
          p("Ke snímkům přidejte to, co žádná fotografie neukáže: <strong>jak dlouho</strong> potíž trvá, zda <strong>svědí</strong>, bolí nebo pálí, zda se změnila velikost či barva, co jste už použili a s jakým výsledkem, jaké léky užíváte a jaké máte alergie. S tím se konzultace na dálku velmi blíží té osobní."),
        ],
      },
      {
        id: "lunares",
        nav: "Znaménka",
        eyebrow: "Priorita",
        h2: "Znaménka a skvrny: kdy je nutné osobní vyšetření",
        blocks: [
          lead("Žádný průvodce by vás ohledně znaménka neměl uklidňovat. Může vám ale pomoci rozhodnout o naléhavosti."),
          p("Nejpoužívanějším pravidlem pro hodnocení znaménka je <strong>ABCDE</strong>: <strong>A</strong>symetrie, nepravidelné okraje (<strong>B</strong>order), nestejnoměrná nebo měnící se barva (<strong>C</strong>olor), rostoucí průměr (<strong>D</strong>iameter) a vývoj (<strong>E</strong>volution). K tomu se přidává <em>příznak ošklivého káčátka</em>: znaménko, které se nepodobá ostatním znaménkům téhož člověka, si zaslouží pozornost, i když splňuje jen málo kritérií."),
          ul([
            "<strong>Nová</strong> pigmentová léze vzniklá v dospělosti.",
            "Znaménko, které <strong>mění</strong> velikost, tvar nebo barvu, případně začne svědit.",
            "Léze, která <strong>krvácí</strong>, zvředovatí nebo se nezhojí.",
            "Ranka nebo strup, který se <strong>nehojí</strong> po řadu týdnů.",
            "Osobní nebo rodinná anamnéza <strong>melanomu</strong>, velký počet névů nebo těžké spáleniny v dětství.",
          ]),
          p("V každém z těchto případů je správnou cestou osobní vyšetření dermatoskopem. Dobře vedená online konzultace vám přesně to řekne a pomůže vám k němu dorazit se srovnanou dokumentací, místo abyste měsíce čekali s nejistotou, zda se máte znepokojovat."),
          cite(`Osvětové informace o kožních lézích a prevenci: <a href="${AEDV}" rel="nofollow noopener" target="_blank">Španělská akademie dermatologie a venerologie</a>.`),
        ],
      },
      {
        id: "gratis",
        nav: "Veřejná cesta",
        eyebrow: "Nepříjemná otázka",
        h2: "„Dermatolog online zdarma“: co skutečně existuje",
        blocks: [
          lead("Je to jeden z nejčastějších dotazů a zaslouží si poctivou odpověď místo prodejní stránky."),
          p("Ve Španělsku vede cesta bez nákladů pro pacienta přes <strong>Sistema Nacional de Salud</strong>: vstupuje se do ní u <strong>praktického lékaře primární péče</strong>, který stav posoudí a odešle na dermatologii. Většina autonomních společenství navíc používá <strong>teledermatologii</strong> mezi primární péčí a dermatologickým oddělením, právě aby upřednostnila podezřelé léze. Pokud máte lézi, která vás znepokojuje, je tohle ta cesta — a její využití vám nebrání konzultovat i soukromě, chcete-li navíc rychlost."),
          ul([
            "<strong>Bezplatné chaty</strong> a aplikace pro sebediagnostiku nejsou lékařskou konzultací a nevystavují recept.",
            "<strong>Zpráva</strong> podepsaná registrovaným lékařem a <strong>elektronický recept</strong> vzejdou jen ze skutečné konzultace.",
            "U podezřelé léze je prioritou být vyšetřen, ne ušetřit čas chatem.",
          ]),
          p(`Registraci kteréhokoli lékaře si můžete ověřit ve <a href="${CGCOM_REGISTRO}" rel="nofollow noopener" target="_blank">veřejném registru CGCOM</a> — u nás stejně jako u kohokoli jiného.`),
        ],
      },
      {
        id: "senales",
        nav: "Bez odkladu",
        eyebrow: "Bezpečnost",
        h2: "Příznaky, které nesnesou odklad",
        blocks: [
          lead("Některé kožní stavy jsou akutní stavy vyžadující neodkladnou péči a je dobré je poznat."),
          ul([
            "Vyrážka s <strong>vysokou horečkou</strong>, postižením sliznic, rozsáhlými puchýři nebo odlučováním kůže.",
            "Červené či fialové skvrny, které <strong>nemizí při zatlačení</strong>, spolu s horečkou, ztuhlou šíjí nebo zmateností.",
            "Otok rtů, jazyka nebo hrdla, dušnost či potíže s polykáním po léku nebo potravině.",
            "Zarudlá, teplá a bolestivá kožní plocha, která se rychle šíří, s horečkou nebo celkovou nevolností.",
            "Bolest neúměrná tomu, co je vidět, v zarudlé oblasti kůže.",
          ]),
          p("V těchto situacích volejte <strong>112</strong> nebo vyhledejte pohotovost. Objednaná konzultace, ať online, nebo osobní, není vhodným řešením."),
        ],
      },
    ],
    linksEyebrow: "Global Health Španělsko",
    linksH2: "Kam dál",
    linksLead:
      "Naši dermatologové ve Španělsku posoudí případ přes video na základě snímků, které dodáte, a jasně řeknou, co lze vyřešit dnes a co je nutné vidět osobně.",
    links: [
      { label: "Dermatologická konzultace online", href: href("cs", "/services/dermatologia-especialista-online") },
      { label: "Naši lékaři ve Španělsku", href: href("cs", "/doctors") },
      { label: "Kontakt na Global Health Španělsko", href: href("cs", "/contact") },
    ],
    ctaBox: {
      h3: "Máte lézi, která vás znepokojuje?",
      text: "Připravte fotografie podle návodu výše a objednejte se ke konzultaci. Pokud to, co uvidíme, vyžaduje dermatoskop, řekneme vám to a uvedeme, jak naléhavě to má dermatolog vidět osobně.",
      primary: { label: "Objednat konzultaci", href: href("cs", "/services/dermatologia-especialista-online") },
      secondary: { label: "Zobrazit naše lékaře", href: href("cs", "/doctors") },
    },
    sourcesEyebrow: "Zdroje",
    sourcesH2: "Kde se dozvíte víc",
    sourcesLead: "Referenční zdroje o dermatologii, prevenci rakoviny kůže a registraci lékařů ve Španělsku.",
    sources: [
      { label: "Španělská akademie dermatologie a venerologie", href: AEDV },
      { label: "Španělské ministerstvo zdravotnictví", href: SANIDAD },
      { label: "Registr lékařů — CGCOM", href: CGCOM_REGISTRO },
    ],
    sourcesNote:
      "Odkazy vedou na externí weby. Global Health neprovádí dermatoskopii, biopsie ani chirurgické výkony: pokud je případ vyžaduje, upozorníme na to a odešleme vás dál.",
    faqEyebrow: "FAQ",
    faqH2: "Časté dotazy",
    faqs: [
      {
        q: "Co dokáže dermatolog online diagnostikovat?",
        a: "S dobrou anamnézou a správnými snímky se dobře zvládá akné, růžovka, atopická i kontaktní dermatitida, lupénka, kopřivka, mykózy, onychomykóza a vypadávání vlasů, stejně jako sledování již probíhající léčby.",
      },
      {
        q: "Hodí se online konzultace na kontrolu znaménka?",
        a: "Hodí se k rozhodnutí o naléhavosti, ne k vyloučení. Hodnocení pigmentových lézí stojí na dermatoskopii, která vyžaduje osobní vyšetření. Pokud je znaménko nové, mění se, krvácí nebo se liší od ostatních, správným doporučením je osobní prohlídka.",
      },
      {
        q: "Může mi dermatolog online předepsat lék?",
        a: "Ano, pokud to posouzení odůvodní. Registrovaný lékař může po konzultaci vystavit elektronický recept. Nemůže ale předepisovat bez posouzení ani slíbit konkrétní léčbu dřív, než případ uvidí.",
      },
      {
        q: "Jak pořídím dobré fotografie pro konzultaci?",
        a: "Za denního světla a bez blesku, tři snímky — celkový, střední a detail —, se zaostřením na lézi, s pravítkem nebo mincí jako měřítkem, bez filtrů a retuší. Pokud se stav vyvíjí, opakujte stejnou kompozici, aby šly snímky porovnat.",
      },
      {
        q: "Existuje ve Španělsku dermatolog online zdarma?",
        a: "Cestou bez nákladů pro pacienta je Sistema Nacional de Salud přes lékaře primární péče, který stav posoudí a odešle dál; řada regionů používá teledermatologii mezi primární péčí a nemocničním oddělením. Bezplatné chaty a aplikace pro sebediagnostiku nejsou lékařskou konzultací a nevystavují recept.",
      },
      {
        q: "Je to totéž jako jít k dermatologovi osobně?",
        a: "U zánětlivých a chronických stavů je výsledek velmi podobný a sledování bývá lepší, protože se dá opakovat častěji. U pigmentových lézí, biopsií, kryoterapie nebo chirurgie je osobní vyšetření nezbytné.",
      },
    ],
    disclaimerTitle: "Lékařské upozornění",
    disclaimer:
      "Napsal Dr. Alfredo del Valle Moreno Montañez, lékař specialista na dermatologii Global Health Španělsko, klinicky revidoval Dr. Eduardo Daniel Rodríguez Olivas, praktický lékař. Tento článek obsahuje obecné informace o dermatologii na dálku a nepředstavuje individuální lékařskou radu. Žádná fotografie nevyloučí rakovinu kůže: podezřelé pigmentové léze vyžadují osobní vyšetření dermatoskopem. V případě naléhavého ohrožení zdraví volejte 112.",
  } satisfies Article,
};

const roPost: LocalePost = {
  locale: "RO",
  slug: "dermatolog-online-spania",
  title: "Dermatolog online în Spania: ce rezolvă și ce necesită consult fizic",
  excerpt:
    "Teledermatologia rezolvă bine acneea, rozaceea, dermatita, psoriazisul și căderea părului. Alunițele, în schimb, au nevoie de dermatoscop. Unde este granița, cum faceți fotografiile și ce semne nu suportă amânare.",
  seoTitle: "Dermatolog online: ce rezolvă și ce nu",
  seoDescription:
    "Dermatolog online în Spania: ce probleme ale pielii se rezolvă prin video sau fotografii, ce necesită consult fizic și cum faceți fotografii utile.",
  category: "Dermatologie",
  article: {
    lang: "ro-RO",
    tagline: "Îngrijire medicală oricând, oriunde",
    categoryLabel: "Dermatologie",
    categoryHref: href("ro", "/blog"),
    eyebrow: "Spania · Ghid practic",
    h1: "Dermatolog online",
    deck: "Pielea este specialitatea care se potrivește cel mai bine consultației la distanță și, în același timp, cea pe care o strică cel mai ușor o fotografie proastă.",
    intro:
      "Un <strong>dermatolog online</strong> poate evalua, diagnostica și trata o bună parte dintre cele mai frecvente probleme ale pielii — <strong>acnee, rozacee, dermatită, psoriazis, urticarie, cădere a părului, onicomicoză</strong> — pornind de la o anamneză bună și de la imagini corecte, iar acolo unde este indicat poate elibera rețetă electronică. Ce nu poate face este să examineze cu <strong>dermatoscopul</strong>, să preleveze o <strong>biopsie</strong> sau să trateze o leziune prin crioterapie ori chirurgical. De aceea, în fața unei <strong>alunițe</strong> noi sau care se schimbă, consultația online servește la a decide cu ce urgență trebuie văzută fizic, nu la a exclude ceva. Aceasta este granița și merită cunoscută înainte de programare.",
    facts: [
      "Bună pentru acnee, eczemă și psoriazis",
      "Alunițele au nevoie de dermatoscop",
      "Fotografia decide calitatea consultației",
    ],
    primaryCta: { label: "Consultație de dermatologie", href: href("ro", "/services/dermatologia-especialista-online") },
    secondaryCta: { label: "Academia Spaniolă de Dermatologie", href: AEDV },
    panelChip: "Ce acoperă acest ghid",
    panelParas: [
      "Problemele care se rezolvă bine la distanță și cele care nu, cu motivul clinic în fiecare caz.",
      "Cum faceți fotografii cu care un dermatolog poate lucra — partea care depinde de dumneavoastră.",
      "Ce faceți cu o aluniță care se schimbă și ce semne impun o evaluare fizică rapidă.",
      "Timpii de răspuns și prețurile diferă în funcție de furnizor și de comunitatea autonomă; aici nu apar cifre.",
    ],
    author: {
      initials: "AM",
      name: "Dr. Alfredo del Valle Moreno Montañez",
      line: "Medic specialist dermatolog · Global Health Spania",
    },
    reviewLine:
      "Revizuit clinic de Dr. Eduardo Daniel Rodríguez Olivas, medic de medicină generală, Global Health Spania.",
    navLabel: "În acest articol",
    sections: [
      {
        id: "que-resuelve",
        nav: "Ce rezolvă",
        eyebrow: "Potrivire bună",
        h2: "Ce rezolvă bine o consultație de dermatologie online",
        blocks: [
          lead("Dermatologia este vizuală, iar asta avantajează consultația la distanță mai mult decât în oricare altă specialitate."),
          p("Când problema este o erupție vizibilă, o leziune inflamatorie sau un proces cronic deja cunoscut, dermatologul lucrează cu aceleași elemente pe care le-ar folosi în cabinet: anamneza, distribuția leziunilor, aspectul și evoluția lor. Adăugarea examinării prin palpare schimbă puțin rezultatul în majoritatea acestor tablouri."),
          ul([
            "<strong>Acnee</strong> — clasificare, alegerea tratamentului, ajustarea schemei și urmărirea răspunsului.",
            "<strong>Rozacee</strong> și dermatită seboreică — diagnostic diferențial și controlul puseelor.",
            "<strong>Dermatită atopică și eczeme</strong> — schema de corticoid, emoliente, identificarea factorilor declanșatori.",
            "<strong>Psoriazis</strong> — evaluarea extinderii, tratament topic și criterii de trimitere către tratament sistemic.",
            "<strong>Urticarie</strong> — conduită și investigarea cauzelor, când este cazul.",
            "<strong>Căderea părului</strong> — orientare diagnostică, analize țintite și tratament.",
            "<strong>Onicomicoză și micoze cutanate</strong> — confirmare și tratament, cu prelevare de probă dacă este necesar.",
            "<strong>Revizuirea unui tratament în curs</strong> care nu funcționează sau produce efecte adverse.",
          ]),
          p("Există și un avantaj discutat rar: consultația la distanță permite <strong>urmărire frecventă</strong>. În bolile cronice, revederea evoluției la câteva săptămâni, cu fotografii comparabile, valorează de obicei mai mult decât o consultație fizică o dată la șase luni."),
        ],
      },
      {
        id: "que-no",
        nav: "Ce nu rezolvă",
        eyebrow: "Transparență",
        h2: "Ce nu poate face o consultație online",
        blocks: [
          lead("O spunem devreme și fără ocolișuri, pentru că aproape niciun serviciu de teledermatologie nu o scrie."),
          p("O consultație la distanță <strong>nu include dermatoscopie</strong>. Dermatoscopul este instrumentul care arată structuri ale leziunii pe care ochiul liber și o fotografie obișnuită nu le redau și stă la baza evaluării leziunilor pigmentare. Nicio cameră de telefon nu îl înlocuiește, oricât de bună ar fi fotografia."),
          ul([
            "<strong>Dermatoscopia</strong> — indispensabilă la alunițe și leziuni pigmentare.",
            "<strong>Biopsia cutanată</strong> — singura cale de a obține un diagnostic histologic.",
            "<strong>Excizia chirurgicală</strong> și <strong>crioterapia</strong> — acte care se fac fizic.",
            "<strong>Palparea</strong> unei leziuni: consistența ei, dacă este infiltrată sau aderentă.",
            "<strong>Examinarea completă a corpului</strong> la persoane cu mulți nevi sau cu antecedente de melanom.",
            "<strong>Leziuni în zone greu de fotografiat</strong> — scalp, pliuri, mucoase, zona genitală.",
          ]),
          warn("O fotografie obișnuită nu exclude un cancer de piele", "Dacă o leziune pigmentară este nouă, s-a schimbat, arată diferit față de celelalte alunițe, sângerează sau nu se vindecă, răspunsul corect al unei consultații online este să vă spună cu ce urgență trebuie văzută fizic de un dermatolog. Orice serviciu care vă liniștește pornind de la o fotografie vă promite o certitudine pe care fotografia nu o dă."),
        ],
      },
      {
        id: "fotos",
        nav: "Fotografiile",
        eyebrow: "Partea dumneavoastră",
        h2: "Cum faceți fotografii cu care se poate lucra",
        blocks: [
          lead("Majoritatea consultațiilor online care rămân la jumătate rămân așa din cauza imaginilor, nu a distanței."),
          p("Scopul este ca dermatologul să vadă trei lucruri: <strong>unde</strong> este leziunea, <strong>cum arată</strong> în detaliu și <strong>cum se comportă</strong> în timp. Se obține printr-o secvență simplă, la îndemâna oricărui telefon actual."),
          ul([
            "<strong>Lumină naturală</strong>, ziua, lângă o fereastră. Fără blitz direct, care aplatizează relieful și falsifică culoarea.",
            "<strong>Trei distanțe</strong>: una generală a zonei corpului, una medie și una de aproape, pe leziune.",
            "<strong>Focalizare</strong>: atingeți ecranul pe leziune înainte de a fotografia și verificați că imaginea nu este mișcată.",
            "<strong>Scară</strong>: puneți alături o riglă sau o monedă, ca reper de mărime.",
            "<strong>Fără filtre</strong>, fără decupaje și fără retușuri. Culoarea este informație clinică.",
            "<strong>Serie</strong>: dacă procesul evoluează, repetați aceeași imagine, cu aceeași lumină și același cadru.",
          ]),
          p("Adăugați la imagini ceea ce nicio fotografie nu arată: <strong>de când</strong> există, dacă <strong>mănâncă</strong>, doare sau arde, dacă și-a schimbat mărimea sau culoarea, ce ați aplicat deja și cu ce rezultat, ce medicamente luați și ce alergii aveți. Cu acestea, consultația la distanță se apropie mult de cea fizică."),
        ],
      },
      {
        id: "lunares",
        nav: "Alunițe",
        eyebrow: "Prioritate",
        h2: "Alunițe și pete: când trebuie mers fizic",
        blocks: [
          lead("Niciun ghid nu ar trebui să vă liniștească în privința unei alunițe. Ce poate face este să vă ajute să decideți urgența."),
          p("Regula cea mai folosită pentru evaluarea unei alunițe este <strong>ABCDE</strong>: <strong>A</strong>simetrie, margini neregulate (<strong>B</strong>order), culoare neomogenă sau care se schimbă (<strong>C</strong>olor), <strong>D</strong>iametru care crește și <strong>E</strong>voluție. La ele se adaugă <em>semnul rățuștei urâte</em>: o aluniță care nu seamănă cu celelalte alunițe ale persoanei merită atenție, chiar dacă îndeplinește puține criterii."),
          ul([
            "O leziune pigmentară <strong>nouă</strong> apărută la vârsta adultă.",
            "O aluniță care <strong>își schimbă</strong> mărimea, forma sau culoarea ori începe să mănânce.",
            "O leziune care <strong>sângerează</strong>, se ulcerează sau nu se cicatrizează.",
            "O rană sau o crustă care <strong>nu se vindecă</strong> în câteva săptămâni.",
            "Antecedente personale sau familiale de <strong>melanom</strong>, mulți nevi sau arsuri solare grave în copilărie.",
          ]),
          p("În oricare dintre aceste cazuri, calea corectă este evaluarea fizică cu dermatoscop. O consultație online făcută bine vă va spune exact asta și vă va ajuta să ajungeți acolo cu istoricul pus în ordine, în loc să așteptați luni de zile fără să știți dacă aveați motiv de îngrijorare."),
          cite(`Informații de popularizare despre leziunile cutanate și prevenție: <a href="${AEDV}" rel="nofollow noopener" target="_blank">Academia Spaniolă de Dermatologie și Venerologie</a>.`),
        ],
      },
      {
        id: "gratis",
        nav: "Calea publică",
        eyebrow: "Întrebarea incomodă",
        h2: "„Dermatolog online gratuit”: ce există cu adevărat",
        blocks: [
          lead("Este una dintre cele mai frecvente căutări și merită un răspuns onest, nu o pagină de vânzare."),
          p("În Spania, calea fără cost pentru pacient este <strong>Sistema Nacional de Salud</strong>: se intră prin <strong>medicul de asistență primară</strong>, care evaluează și trimite la dermatologie. O bună parte dintre comunitățile autonome folosesc în plus <strong>teledermatologia</strong> între asistența primară și serviciul de dermatologie, tocmai pentru a prioritiza leziunile suspecte. Dacă aveți o leziune care vă îngrijorează, acesta este circuitul, iar folosirea lui nu vă împiedică să consultați și în privat dacă vreți în plus rapiditate."),
          ul([
            "<strong>Chaturile gratuite</strong> și aplicațiile de autodiagnostic nu sunt o consultație medicală și nu eliberează rețetă.",
            "Un <strong>raport</strong> semnat de un medic înscris în colegiu și o <strong>rețetă electronică</strong> ies doar dintr-o consultație reală.",
            "În fața unei leziuni suspecte, prioritatea este să fiți văzut, nu să economisiți timp cu un chat.",
          ]),
          p(`Puteți verifica înscrierea oricărui medic în <a href="${CGCOM_REGISTRO}" rel="nofollow noopener" target="_blank">registrul public CGCOM</a>, la noi la fel ca la oricare altul.`),
        ],
      },
      {
        id: "senales",
        nav: "Fără amânare",
        eyebrow: "Siguranță",
        h2: "Semne care nu suportă amânare",
        blocks: [
          lead("Există tablouri cutanate care sunt urgențe medicale și merită recunoscute."),
          ul([
            "Erupție cu <strong>febră mare</strong>, afectarea mucoaselor, bule extinse sau desprinderea pielii.",
            "Pete roșii sau vineții care <strong>nu dispar la apăsare</strong>, cu febră, redoare de ceafă sau confuzie.",
            "Umflarea buzelor, limbii sau gâtului, dificultăți de respirație ori de înghițire după un medicament sau un aliment.",
            "Zonă de piele roșie, caldă și dureroasă care se extinde rapid, cu febră sau stare generală alterată.",
            "Durere disproporționată față de ceea ce se vede, într-o zonă de piele înroșită.",
          ]),
          p("În aceste situații sunați la <strong>112</strong> sau mergeți la urgențe. O consultație programată, online sau fizică, nu este resursa potrivită."),
        ],
      },
    ],
    linksEyebrow: "Global Health Spania",
    linksH2: "Pașii următori",
    linksLead:
      "Dermatologii noștri din Spania evaluează prin video, pe baza imaginilor pe care le trimiteți, și vă spun clar ce se rezolvă azi și ce trebuie văzut fizic.",
    links: [
      { label: "Consultație de dermatologie online", href: href("ro", "/services/dermatologia-especialista-online") },
      { label: "Medicii noștri din Spania", href: href("ro", "/doctors") },
      { label: "Contactați Global Health Spania", href: href("ro", "/contact") },
    ],
    ctaBox: {
      h3: "Aveți o leziune care vă îngrijorează?",
      text: "Pregătiți fotografiile așa cum se explică mai sus și programați o consultație. Dacă ceea ce vedem are nevoie de dermatoscop, vă spunem și vă indicăm cu ce urgență trebuie să o vadă fizic un dermatolog.",
      primary: { label: "Programați o consultație", href: href("ro", "/services/dermatologia-especialista-online") },
      secondary: { label: "Vedeți medicii noștri", href: href("ro", "/doctors") },
    },
    sourcesEyebrow: "Surse",
    sourcesH2: "Unde aflați mai mult",
    sourcesLead: "Resurse de referință despre dermatologie, prevenirea cancerului de piele și înscrierea medicilor în Spania.",
    sources: [
      { label: "Academia Spaniolă de Dermatologie și Venerologie", href: AEDV },
      { label: "Ministerul Sănătății din Spania", href: SANIDAD },
      { label: "Registrul medicilor — CGCOM", href: CGCOM_REGISTRO },
    ],
    sourcesNote:
      "Linkurile se deschid pe site-uri externe. Global Health nu efectuează dermatoscopie, biopsii sau proceduri chirurgicale: când cazul le cere, o spunem și trimitem mai departe.",
    faqEyebrow: "Întrebări frecvente",
    faqH2: "Întrebări frecvente",
    faqs: [
      {
        q: "Ce poate diagnostica un dermatolog online?",
        a: "Cu o anamneză bună și imagini corecte se conduc bine acneea, rozaceea, dermatita atopică și de contact, psoriazisul, urticaria, micozele, onicomicoza și căderea părului, plus urmărirea tratamentelor în curs.",
      },
      {
        q: "Este utilă o consultație online pentru o aluniță?",
        a: "Este utilă pentru a decide urgența, nu pentru a exclude. Evaluarea leziunilor pigmentare se bazează pe dermatoscopie, care cere consult fizic. Dacă o aluniță este nouă, se schimbă, sângerează sau diferă de restul, indicația corectă este să fie văzută fizic.",
      },
      {
        q: "Un dermatolog online îmi poate prescrie tratament?",
        a: "Da, când evaluarea o indică. Un medic înscris în colegiu poate elibera rețetă electronică după consultație. Ce nu poate face este să prescrie fără să evalueze sau să promită un tratament anume înainte de a vedea cazul.",
      },
      {
        q: "Cum fac fotografii bune pentru consultație?",
        a: "Cu lumină naturală și fără blitz, trei cadre — general, mediu și de aproape —, focalizate pe leziune, cu o riglă sau o monedă ca reper de mărime, fără filtre și fără retușuri. Dacă procesul evoluează, repetați același cadru pentru a putea compara.",
      },
      {
        q: "Există dermatolog online gratuit în Spania?",
        a: "Calea fără cost pentru pacient este Sistema Nacional de Salud, prin medicul de asistență primară, care evaluează și trimite mai departe; multe comunități folosesc teledermatologia între asistența primară și spital. Chaturile și aplicațiile gratuite de autodiagnostic nu sunt consultații medicale și nu eliberează rețetă.",
      },
      {
        q: "Este la fel cu mersul fizic la dermatolog?",
        a: "Pentru procesele inflamatorii și cronice, rezultatul este foarte asemănător, iar urmărirea este de obicei mai bună fiindcă se poate repeta mai des. Pentru leziuni pigmentare, biopsii, crioterapie sau chirurgie, consultul fizic este indispensabil.",
      },
    ],
    disclaimerTitle: "Aviz medical",
    disclaimer:
      "Scris de Dr. Alfredo del Valle Moreno Montañez, medic specialist dermatolog la Global Health Spania, și revizuit clinic de Dr. Eduardo Daniel Rodríguez Olivas, medic de medicină generală. Acest articol conține informații generale despre dermatologia la distanță și nu constituie sfat medical personalizat. Nicio fotografie nu exclude un cancer de piele: leziunile pigmentare suspecte cer evaluare fizică cu dermatoscop. În caz de urgență medicală, sunați la 112.",
  } satisfies Article,
};

const de: LocalePost = {
  locale: "DE",
  slug: "hautarzt-online-spanien",
  title: "Hautarzt online in Spanien: was sich klären lässt und was in die Praxis gehört",
  excerpt:
    "Teledermatologie eignet sich gut für Akne, Rosazea, Ekzeme, Schuppenflechte und Haarausfall. Muttermale dagegen brauchen ein Dermatoskop. Wo die Grenze liegt, wie Sie fotografieren und welche Zeichen keinen Aufschub dulden.",
  seoTitle: "Hautarzt online: was geht und was nicht",
  seoDescription:
    "Hautarzt online in Spanien: welche Hautprobleme sich per Video oder Foto klären lassen, was einen Praxisbesuch braucht und wie gute Fotos gelingen.",
  category: "Dermatologie",
  article: {
    lang: "de-DE",
    tagline: "Medizin jederzeit und überall",
    categoryLabel: "Dermatologie",
    categoryHref: href("de", "/blog"),
    eyebrow: "Spanien · Praxisratgeber",
    h1: "Hautarzt online",
    deck: "Die Haut ist das Fachgebiet, das sich der Fernbehandlung am besten fügt — und zugleich das, was ein schlechtes Foto am schnellsten zunichtemacht.",
    intro:
      "Ein <strong>Hautarzt online</strong> kann einen großen Teil der häufigsten Hautprobleme beurteilen, diagnostizieren und behandeln — <strong>Akne, Rosazea, Ekzeme, Schuppenflechte, Nesselsucht, Haarausfall, Nagelpilz</strong> — auf Grundlage einer guten Anamnese und richtiger Bilder, und kann bei entsprechender Indikation ein elektronisches Rezept ausstellen. Nicht möglich sind die Untersuchung mit dem <strong>Dermatoskop</strong>, eine <strong>Biopsie</strong> sowie die Behandlung einer Läsion mit Kryotherapie oder Chirurgie. Bei einem <strong>Muttermal</strong>, das neu ist oder sich verändert, dient die Online-Sprechstunde deshalb dazu zu entscheiden, wie dringend es persönlich gesehen werden muss — nicht dazu, etwas auszuschließen. Das ist die Grenze, und man sollte sie vor der Buchung kennen.",
    facts: [
      "Gut bei Akne, Ekzem und Schuppenflechte",
      "Muttermale brauchen ein Dermatoskop",
      "Das Foto entscheidet über die Sprechstunde",
    ],
    primaryCta: { label: "Dermatologische Sprechstunde", href: href("de", "/services/dermatologia-especialista-online") },
    secondaryCta: { label: "Spanische Akademie für Dermatologie", href: AEDV },
    panelChip: "Was dieser Ratgeber abdeckt",
    panelParas: [
      "Welche Probleme sich aus der Ferne gut klären lassen und welche nicht — mit dem klinischen Grund im Einzelfall.",
      "Wie Sie Fotos machen, mit denen eine Hautärztin oder ein Hautarzt arbeiten kann; das ist der Teil, der bei Ihnen liegt.",
      "Was bei einem Muttermal zu tun ist, das sich verändert, und welche Zeichen eine rasche Untersuchung vor Ort erfordern.",
      "Reaktionszeiten und Preise unterscheiden sich je nach Anbieter und autonomer Region; Zahlen nennen wir hier nicht.",
    ],
    author: {
      initials: "AM",
      name: "Dr. Alfredo del Valle Moreno Montañez",
      line: "Facharzt für Dermatologie · Global Health Spanien",
    },
    reviewLine:
      "Klinisch geprüft von Dr. Eduardo Daniel Rodríguez Olivas, Allgemeinmediziner, Global Health Spanien.",
    navLabel: "In diesem Artikel",
    sections: [
      {
        id: "que-resuelve",
        nav: "Was geht",
        eyebrow: "Gute Eignung",
        h2: "Was eine dermatologische Online-Sprechstunde gut löst",
        blocks: [
          lead("Dermatologie ist ein visuelles Fach, und das spricht mehr als in jedem anderen Gebiet für die Behandlung aus der Ferne."),
          p("Wenn das Problem ein sichtbarer Ausschlag, eine entzündliche Läsion oder ein bereits bekanntes chronisches Leiden ist, arbeitet der Hautarzt mit demselben Material wie in der Praxis: der Anamnese, der Verteilung der Läsionen, ihrem Aussehen und ihrem Verlauf. Das Tasten hinzuzunehmen verändert das Ergebnis bei den meisten dieser Bilder nur wenig."),
          ul([
            "<strong>Akne</strong> — Einteilung, Wahl der Behandlung, Anpassung des Schemas und Verlaufskontrolle.",
            "<strong>Rosazea</strong> und seborrhoisches Ekzem — Differenzialdiagnose und Kontrolle von Schüben.",
            "<strong>Atopische Dermatitis und Ekzeme</strong> — Kortison-Schema, Basispflege, Auslöser erkennen.",
            "<strong>Schuppenflechte</strong> — Beurteilung der Ausdehnung, topische Therapie und Kriterien für eine systemische Behandlung.",
            "<strong>Nesselsucht</strong> — Behandlung und, wo angezeigt, Ursachensuche.",
            "<strong>Haarausfall</strong> — diagnostische Einordnung, gezielte Laborwerte und Therapie.",
            "<strong>Nagelpilz und Hautpilz</strong> — Bestätigung und Behandlung, bei Bedarf mit Probenentnahme.",
            "<strong>Überprüfung einer laufenden Therapie</strong>, die nicht wirkt oder Nebenwirkungen macht.",
          ]),
          p("Hinzu kommt ein selten diskutierter Vorteil: Die Ferne macht <strong>häufige Verlaufskontrollen</strong> praktikabel. Bei chronischen Verläufen ist eine Kontrolle alle paar Wochen mit vergleichbaren Fotos meist mehr wert als ein Praxisbesuch alle sechs Monate."),
        ],
      },
      {
        id: "que-no",
        nav: "Was nicht geht",
        eyebrow: "Transparenz",
        h2: "Was eine Online-Sprechstunde nicht leisten kann",
        blocks: [
          lead("Wir schreiben es früh und ohne Beschönigung, weil es fast kein teledermatologischer Anbieter tut."),
          p("Eine Sprechstunde aus der Ferne <strong>umfasst keine Dermatoskopie</strong>. Das Dermatoskop zeigt Strukturen innerhalb einer Läsion, die das bloße Auge und ein normales Foto nicht abbilden, und ist die Grundlage der Beurteilung pigmentierter Läsionen. Keine Handykamera ersetzt es, so gut das Foto auch sein mag."),
          ul([
            "<strong>Dermatoskopie</strong> — unverzichtbar bei Muttermalen und pigmentierten Läsionen.",
            "<strong>Hautbiopsie</strong> — der einzige Weg zu einer histologischen Diagnose.",
            "<strong>Operative Entfernung</strong> und <strong>Kryotherapie</strong> — Eingriffe vor Ort.",
            "<strong>Tasten</strong> einer Läsion: ihre Konsistenz, ob sie infiltriert oder verschieblich ist.",
            "<strong>Ganzkörperuntersuchung</strong> bei Menschen mit vielen Nävi oder Melanom in der Vorgeschichte.",
            "<strong>Läsionen an schwer zu fotografierenden Stellen</strong> — Kopfhaut, Hautfalten, Schleimhäute, Genitalbereich.",
          ]),
          warn("Ein normales Foto schließt Hautkrebs nicht aus", "Wenn eine pigmentierte Läsion neu ist, sich verändert hat, sich von Ihren anderen Muttermalen unterscheidet, blutet oder nicht abheilt, ist die richtige Antwort einer Online-Sprechstunde, Ihnen zu sagen, wie dringend ein Hautarzt sie persönlich ansehen muss. Wer Sie anhand eines Fotos beruhigt, verspricht eine Sicherheit, die das Foto nicht hergibt."),
        ],
      },
      {
        id: "fotos",
        nav: "Die Fotos",
        eyebrow: "Ihr Teil der Arbeit",
        h2: "Wie Sie Fotos machen, mit denen sich arbeiten lässt",
        blocks: [
          lead("Die meisten Online-Sprechstunden, die auf halber Strecke stecken bleiben, scheitern an den Bildern, nicht an der Entfernung."),
          p("Ziel ist, dass die Ärztin oder der Arzt drei Dinge sieht: <strong>wo</strong> die Läsion sitzt, <strong>wie sie aussieht</strong> im Detail und <strong>wie sie sich verhält</strong> im Verlauf. Das gelingt mit einer einfachen Folge von Aufnahmen mit jedem aktuellen Telefon."),
          ul([
            "<strong>Tageslicht</strong>, am Fenster. Kein direkter Blitz — er glättet das Relief und verfälscht die Farbe.",
            "<strong>Drei Abstände</strong>: eine Übersicht der Körperregion, eine mittlere und eine Nahaufnahme der Läsion.",
            "<strong>Schärfe</strong>: Tippen Sie vor dem Auslösen auf die Läsion und prüfen Sie, dass das Bild nicht verwackelt ist.",
            "<strong>Maßstab</strong>: Legen Sie ein Lineal oder eine Münze daneben, damit die Größe erkennbar ist.",
            "<strong>Keine Filter</strong>, keine Zuschnitte, keine Retusche. Farbe ist klinische Information.",
            "<strong>Serie</strong>: Verändert sich der Befund, wiederholen Sie dieselbe Aufnahme bei gleichem Licht und gleichem Bildausschnitt.",
          ]),
          p("Ergänzen Sie, was kein Foto zeigt: <strong>seit wann</strong> es besteht, ob es <strong>juckt</strong>, schmerzt oder brennt, ob sich Größe oder Farbe verändert haben, was Sie bereits aufgetragen haben und mit welchem Ergebnis, welche Medikamente Sie nehmen und welche Allergien bestehen. Damit kommt die Sprechstunde aus der Ferne der Praxis sehr nahe."),
        ],
      },
      {
        id: "lunares",
        nav: "Muttermale",
        eyebrow: "Vorrang",
        h2: "Muttermale und Flecken: wann Sie persönlich hingehen müssen",
        blocks: [
          lead("Kein Ratgeber sollte Sie bei einem Muttermal beruhigen. Was er kann, ist Ihnen bei der Dringlichkeit helfen."),
          p("Die gebräuchlichste Regel zur Beurteilung eines Muttermals ist <strong>ABCDE</strong>: <strong>A</strong>symmetrie, unregelmäßige Begrenzung (<strong>B</strong>order), ungleichmäßige oder wechselnde Farbe (<strong>C</strong>olour), zunehmender <strong>D</strong>urchmesser und <strong>E</strong>ntwicklung. Dazu kommt das <em>Zeichen des hässlichen Entleins</em>: Ein Mal, das den übrigen Malen dieser Person nicht ähnelt, verdient Aufmerksamkeit, auch wenn es nur wenige Kriterien erfüllt."),
          ul([
            "Eine <strong>neue</strong> pigmentierte Läsion im Erwachsenenalter.",
            "Ein Mal, das Größe, Form oder Farbe <strong>verändert</strong> oder zu jucken beginnt.",
            "Eine Läsion, die <strong>blutet</strong>, sich ulzeriert oder nicht vernarbt.",
            "Eine Wunde oder Kruste, die über Wochen <strong>nicht heilt</strong>.",
            "Eigene oder familiäre <strong>Melanom</strong>-Vorgeschichte, viele Nävi oder schwere Sonnenbrände in der Kindheit.",
          ]),
          p("In all diesen Fällen ist der richtige Weg die Untersuchung vor Ort mit dem Dermatoskop. Eine gut geführte Online-Sprechstunde sagt Ihnen genau das und hilft Ihnen, mit geordneter Vorgeschichte dorthin zu kommen, statt monatelang im Unklaren zu bleiben, ob Sie sich Sorgen machen sollten."),
          cite(`Allgemeinverständliche Informationen zu Hautveränderungen und Vorbeugung: <a href="${AEDV}" rel="nofollow noopener" target="_blank">Spanische Akademie für Dermatologie und Venerologie</a>.`),
        ],
      },
      {
        id: "gratis",
        nav: "Öffentlicher Weg",
        eyebrow: "Die unbequeme Frage",
        h2: "„Hautarzt online kostenlos“: was es wirklich gibt",
        blocks: [
          lead("Es ist eine der häufigsten Suchanfragen und verdient eine ehrliche Antwort statt einer Verkaufsseite."),
          p("In Spanien führt der für Patientinnen und Patienten kostenfreie Weg über das <strong>Sistema Nacional de Salud</strong>: Zugang gibt es über die <strong>Primärversorgung</strong>, die beurteilt und an die Dermatologie überweist. Viele autonome Regionen nutzen zusätzlich <strong>Teledermatologie</strong> zwischen Primärversorgung und Hautabteilung, gerade um verdächtige Läsionen vorzuziehen. Wenn Sie eine Hautveränderung beunruhigt, ist das der Weg — und ihn zu nutzen hindert Sie nicht daran, zusätzlich privat zu konsultieren, wenn es schnell gehen soll."),
          ul([
            "<strong>Kostenlose Chats</strong> und Apps zur Selbstdiagnose sind keine ärztliche Sprechstunde und stellen kein Rezept aus.",
            "Ein <strong>Bericht</strong> mit der Unterschrift einer registrierten Ärztin oder eines registrierten Arztes und ein <strong>elektronisches Rezept</strong> entstehen nur aus einer echten Sprechstunde.",
            "Bei einer verdächtigen Läsion ist die Priorität, gesehen zu werden — nicht, mit einem Chat Zeit zu sparen.",
          ]),
          p(`Die Registrierung jeder Ärztin und jedes Arztes können Sie im <a href="${CGCOM_REGISTRO}" rel="nofollow noopener" target="_blank">öffentlichen Register des CGCOM</a> prüfen — bei uns genauso wie bei allen anderen.`),
        ],
      },
      {
        id: "senales",
        nav: "Nicht warten",
        eyebrow: "Sicherheit",
        h2: "Zeichen, die keinen Aufschub dulden",
        blocks: [
          lead("Manche Hautbilder sind medizinische Notfälle, und es lohnt sich, sie zu erkennen."),
          ul([
            "Ausschlag mit <strong>hohem Fieber</strong>, Befall der Schleimhäute, ausgedehnter Blasenbildung oder Ablösung der Haut.",
            "Rote oder violette Flecken, die sich <strong>nicht wegdrücken lassen</strong>, mit Fieber, Nackensteife oder Verwirrtheit.",
            "Schwellung von Lippen, Zunge oder Rachen, Atem- oder Schluckbeschwerden nach einem Medikament oder Lebensmittel.",
            "Ein geröteter, überwärmter und schmerzhafter Hautbezirk, der sich rasch ausbreitet, mit Fieber oder Krankheitsgefühl.",
            "Schmerz, der in keinem Verhältnis zum sichtbaren Befund steht, in einem geröteten Hautbereich.",
          ]),
          p("Rufen Sie in diesen Situationen <strong>112</strong> an oder gehen Sie in die Notaufnahme. Ein geplanter Termin, online oder vor Ort, ist dafür nicht der richtige Weg."),
        ],
      },
    ],
    linksEyebrow: "Global Health Spanien",
    linksH2: "Nächste Schritte",
    linksLead:
      "Unsere Dermatologen in Spanien beurteilen per Video anhand der Bilder, die Sie mitbringen, und sagen klar, was sich heute klären lässt und was vor Ort gesehen werden muss.",
    links: [
      { label: "Dermatologische Online-Sprechstunde", href: href("de", "/services/dermatologia-especialista-online") },
      { label: "Unsere Ärzte in Spanien", href: href("de", "/doctors") },
      { label: "Global Health Spanien kontaktieren", href: href("de", "/contact") },
    ],
    ctaBox: {
      h3: "Beunruhigt Sie eine Hautveränderung?",
      text: "Bereiten Sie die Fotos wie oben beschrieben vor und buchen Sie eine Sprechstunde. Braucht das, was wir sehen, ein Dermatoskop, sagen wir es Ihnen und nennen die Dringlichkeit für den Praxisbesuch.",
      primary: { label: "Termin buchen", href: href("de", "/services/dermatologia-especialista-online") },
      secondary: { label: "Unsere Ärzte ansehen", href: href("de", "/doctors") },
    },
    sourcesEyebrow: "Quellen",
    sourcesH2: "Wo Sie weiterlesen",
    sourcesLead: "Referenzen zu Dermatologie, Hautkrebsvorsorge und ärztlicher Registrierung in Spanien.",
    sources: [
      { label: "Spanische Akademie für Dermatologie und Venerologie", href: AEDV },
      { label: "Spanisches Gesundheitsministerium", href: SANIDAD },
      { label: "Ärzteregister — CGCOM", href: CGCOM_REGISTRO },
    ],
    sourcesNote:
      "Die Links öffnen externe Websites. Global Health führt keine Dermatoskopie, keine Biopsien und keine operativen Eingriffe durch: Wo ein Fall sie erfordert, sagen wir das und überweisen.",
    faqEyebrow: "FAQ",
    faqH2: "Häufige Fragen",
    faqs: [
      {
        q: "Was kann ein Hautarzt online diagnostizieren?",
        a: "Mit guter Anamnese und richtigen Bildern lassen sich Akne, Rosazea, atopisches und Kontaktekzem, Schuppenflechte, Nesselsucht, Pilzinfektionen, Nagelpilz und Haarausfall gut behandeln, ebenso die Verlaufskontrolle laufender Therapien.",
      },
      {
        q: "Taugt eine Online-Sprechstunde zur Kontrolle eines Muttermals?",
        a: "Sie taugt zur Einschätzung der Dringlichkeit, nicht zum Ausschluss. Die Beurteilung pigmentierter Läsionen beruht auf der Dermatoskopie und erfordert einen Praxisbesuch. Ist ein Mal neu, verändert es sich, blutet es oder unterscheidet es sich von den übrigen, gehört es vor Ort untersucht.",
      },
      {
        q: "Darf ein Hautarzt online mir etwas verschreiben?",
        a: "Ja, wenn die Beurteilung es hergibt. Eine registrierte Ärztin oder ein registrierter Arzt kann nach der Sprechstunde ein elektronisches Rezept ausstellen. Nicht möglich ist eine Verordnung ohne Beurteilung oder die Zusage einer bestimmten Therapie, bevor der Fall gesehen wurde.",
      },
      {
        q: "Wie mache ich gute Fotos für die Sprechstunde?",
        a: "Bei Tageslicht und ohne Blitz, drei Aufnahmen — Übersicht, mittlere Distanz und Nahaufnahme —, scharf auf die Läsion, mit Lineal oder Münze als Größenreferenz, ohne Filter und Retusche. Verändert sich der Befund, wiederholen Sie denselben Bildausschnitt, damit sich vergleichen lässt.",
      },
      {
        q: "Gibt es in Spanien einen kostenlosen Hautarzt online?",
        a: "Der für Patienten kostenfreie Weg ist das Sistema Nacional de Salud über die Primärversorgung, die beurteilt und überweist; viele Regionen nutzen Teledermatologie zwischen Primärversorgung und Klinik. Kostenlose Chats und Selbstdiagnose-Apps sind keine ärztlichen Sprechstunden und stellen kein Rezept aus.",
      },
      {
        q: "Ist das dasselbe wie ein Besuch beim Hautarzt?",
        a: "Bei entzündlichen und chronischen Verläufen ist das Ergebnis sehr ähnlich, und die Verlaufskontrolle ist oft besser, weil sie häufiger stattfinden kann. Bei pigmentierten Läsionen, Biopsien, Kryotherapie oder Chirurgie ist der Praxisbesuch unverzichtbar.",
      },
    ],
    disclaimerTitle: "Medizinischer Hinweis",
    disclaimer:
      "Verfasst von Dr. Alfredo del Valle Moreno Montañez, Facharzt für Dermatologie bei Global Health Spanien, klinisch geprüft von Dr. Eduardo Daniel Rodríguez Olivas, Allgemeinmediziner. Dieser Artikel enthält allgemeine Informationen zur Dermatologie aus der Ferne und ist keine persönliche medizinische Beratung. Kein Foto schließt Hautkrebs aus: Verdächtige pigmentierte Läsionen erfordern eine Untersuchung vor Ort mit dem Dermatoskop. Wählen Sie im medizinischen Notfall 112.",
  } satisfies Article,
};

export const ES_DERMATOLOGO_ONLINE: PostSet = {
  key: "es-dermatologo-online",
  countryCode: "es",
  targetKeyword: "dermatologo online",
  searchVolume: 260,
  keywordDifficulty: 0,
  evidence:
    "es/2724 expansion 2026-08-04. Head term 260 KD 0, unchanged. Cluster: dermatología online 170 KD 0, app dermatología gratis 70, dermatologo online españa 30, dermatólogo online gratis chat 30, dermatólogo online españa 30, consultas dermatológicas gratuitas 20, dermatología infantil online 10, plus dermatólogo online gratis españa, consulta dermatológica gratis en línea and dermatología cita online (transactional). The smallest cluster in the batch; the expansion showed the demand splits into a paid transactional head and a 'gratis' tail nobody answers honestly, so the article answers it via the SNS route. SERP 2026-08-04: individual dermatologists' consulta-online pages (dermatologia-bagazgoitia, madriderma, dermanieto, drgonzalezcantero), aggregators (Doctoralia, DermaPeople) and Quirónsalud teledermatología. All sell the service; none sets out what teledermatology can decide without a dermatoscope.",
  serviceSlug: "dermatologia-especialista-online",
  authorDoctorId: "cmrdppjf5000u01ru1ayu78k0",
  authorDisplayName: "Dr. Alfredo del Valle Moreno Montañez",
  reviewerDoctorId: "cmrdpxpi0001v01ruqavjiq79",
  reviewerDisplayName: "Dr. Eduardo Daniel Rodríguez Olivas",
  posts: [es, en, pt, cs, roPost, de],
};
