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
  posts: [es],
};
