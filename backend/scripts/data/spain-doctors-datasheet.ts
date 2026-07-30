/**
 * Spain doctors datasheet — transcribed from the July 2026
 * "GlobalHealth_Spain_DoctorsPage_Brief" + per-doctor SEO docx (14 profiles).
 * Consumed by scripts/applied/patch-spain-doctors-datasheet.ts. Mirrors the shape of
 * scripts/data/ireland-doctors-datasheet.ts.
 */

export type DoctorFaqSheet = { question: string; answer: string };

export type DoctorSheet = {
  /** DB slug to look up (prisma.doctor.findFirst({ where: { slug } })) */
  dbSlug: string;
  /** Correct full name incl. Dr./Dra. prefix (or none, for psychologists) */
  fullName: string;
  specialty: string;
  seoTitle: string;
  seoDescription: string;
  bio: string;
  qualifications: string[];
  languages: string[];
  faqs: DoctorFaqSheet[];
  /** Only set for the 3 psychologists — CGCOM default must be overridden to COP */
  chamber?: "COP";
  registrationUrl?: string;
};

export const SPAIN_DOCTORS: DoctorSheet[] = [

  {
    dbSlug: "dr-alfredo-del-valle",
    fullName: "Dr. Alfredo del Valle Moreno Montañez",
    specialty: "Médico Especialista — Dermatología",
    seoTitle: "Dr. Alfredo del Valle — Dermatólogo | CGCOM 282885136 | Global Health España",
    seoDescription: "Reserve una videoconsulta con Dr. Alfredo del Valle — dermatólogo especialista registrado en CGCOM (nº 282885136). Dermatología médica y estética · Teledermatología · España y Latinoamérica · Español e inglés. Cita el mismo día.",
    bio: `El Dr. Alfredo del Valle Moreno Montañez es médico especialista en Dermatología con doble acreditación internacional — titulación médica por la Universidad de Carabobo (Venezuela) y reconocimiento oficial de la especialidad en Dermatología en España en 2026 — y amplia experiencia clínica en dermatología médica y estética en España y Latinoamérica.

Ha trabajado en servicios de dermatología hospitalaria, clínicas privadas y servicios de teledermatología, desarrollando una práctica clínica que combina el rigor diagnóstico de la dermatología médica con la sensibilidad estética de la medicina estética avanzada. Antes de especializarse en Dermatología, completó una residencia en Medicina Interna — formación que le proporciona una perspectiva clínica más amplia a la hora de evaluar afecciones dermatológicas con componentes sistémicos o autoinmunes.

El Dr. del Valle es activo en investigación académica y ha publicado artículos revisados por pares en el campo de la psicodermatología y el trastorno dismórfico corporal — una especialización inusual que refleja su comprensión de la dimensión psicológica de las enfermedades de la piel, especialmente relevante en dermatología estética.

La consulta online con el Dr. del Valle permite una evaluación dermatológica inicial de calidad — desde el análisis de lesiones cutáneas mediante imágenes hasta la planificación personalizada de tratamientos estéticos — sin necesidad de desplazarse a una clínica presencial como primer paso.

Qué trata:
• Dermatología general — evaluación de lesiones cutáneas, erupciones, eccema, psoriasis, acné, rosácea
• Dermato-oncología — evaluación de lunares sospechosos, lesiones pigmentadas, orientación sobre cáncer de piel
• Enfermedades autoinmunes e inflamatorias de la piel — lupus cutáneo, psoriasis, dermatitis atópica, urticaria
• Hidradenitis supurativa — diagnóstico, manejo y planificación terapéutica
• Psicodermatología — afecciones dermatológicas con componente psicológico, trastorno dismórfico corporal
• Consulta estética online — evaluación y planificación personalizada para tratamientos con rellenos dérmicos, toxina botulínica y rejuvenecimiento cutáneo (los procedimientos se realizan de forma presencial)
• Teledermatología — evaluación de imágenes dermatológicas enviadas por el paciente
• Segunda opinión — sobre diagnósticos dermatológicos, resultados de biopsias o planes de tratamiento
• Seguimiento de tratamientos dermatológicos en curso

Su enfoque:
El Dr. del Valle combina la precisión diagnóstica de un dermatólogo formado en entornos hospitalarios con la comprensión profunda de la estética y la psicología del paciente que caracterizan su investigación en psicodermatología. Cada consulta es individualizada, basada en la evidencia y orientada a proporcionar al paciente un plan claro — no solo un diagnóstico.

Nota importante: Los procedimientos estéticos (rellenos dérmicos, toxina botulínica) requieren cita presencial. La consulta online con el Dr. del Valle es la evaluación médica y la fase de planificación personalizada que debe preceder a cualquier procedimiento estético.

Idiomas: Español · Inglés`,
    qualifications: ["Médico especialista en Dermatología — reconocimiento oficial España (2026)", "Máster en Medicina Estética", "Residencia en Medicina Interna (previa a especialización en Dermatología)", "Titulación médica — Universidad de Carabobo, Venezuela", "Investigador publicado — psicodermatología y trastorno dismórfico corporal", "Experiencia en teledermatología — España y Latinoamérica", "Registrado en CGCOM (nº 282885136)"],
    languages: ["Spanish", "English"],
    faqs: [
      {
        question: "¿Está el Dr. del Valle registrado en el Consejo General de Colegios Oficiales de Médicos?",
        answer: "Sí. El Dr. Alfredo del Valle Moreno Montañez está registrado en el sistema de verificación del CGCOM con el número 282885136. Puede verificar este registro en cgcom.es. El Dr. del Valle obtuvo el reconocimiento oficial de su especialidad en Dermatología en España en 2026 y tiene experiencia clínica en España y Latinoamérica.",
      },
      {
        question: "¿Qué afecciones dermatológicas evalúa el Dr. del Valle online?",
        answer: "El Dr. del Valle ofrece consultas dermatológicas online para: evaluación de lesiones cutáneas y erupciones, eccema, psoriasis, acné y rosácea, dermato-oncología (lunares sospechosos, lesiones pigmentadas, orientación sobre cáncer de piel), enfermedades autoinmunes e inflamatorias de la piel (lupus cutáneo, dermatitis atópica, urticaria), hidradenitis supurativa, psicodermatología, consulta estética (planificación de tratamientos con rellenos y toxina botulínica), teledermatología mediante imágenes y segunda opinión sobre diagnósticos dermatológicos.",
      },
      {
        question: "¿Qué es una consulta estética online con el Dr. del Valle?",
        answer: "La consulta estética online con el Dr. del Valle es una evaluación médica estructurada por videollamada para pacientes que están considerando tratamientos con rellenos dérmicos, toxina botulínica u otros procedimientos de rejuvenecimiento cutáneo. Durante la consulta, el Dr. del Valle realizará un análisis facial y cutáneo, revisará su historial médico para identificar contraindicaciones, discutirá sus objetivos estéticos y elaborará un plan de tratamiento personalizado. Los procedimientos estéticos en sí mismos requieren cita presencial.",
      },
      {
        question: "¿Qué es la psicodermatología y por qué es relevante?",
        answer: "La psicodermatología es la rama de la medicina que estudia la relación entre las enfermedades de la piel y la salud mental. El Dr. del Valle ha publicado investigación revisada por pares específicamente en psicodermatología y trastorno dismórfico corporal — una especialización inusual que le permite abordar las dimensiones psicológicas de afecciones como el acné grave, la psoriasis, la alopecia o las preocupaciones estéticas que afectan significativamente a la calidad de vida del paciente. Para pacientes cuya afección dermatológica tiene un impacto psicológico importante, esta perspectiva integrada marca una diferencia real.",
      },
      {
        question: "¿Cómo reservo una consulta con el Dr. del Valle?",
        answer: "Seleccione un horario disponible en esta página para reservar directamente con el Dr. del Valle. El pago se procesa de forma segura al reservar — la consulta queda confirmada una vez completado el pago. Recibirá inmediatamente una invitación al calendario. Las consultas se realizan por videollamada segura en español o inglés. Para afecciones de la piel, le recomendamos compartir fotografías de calidad de la zona afectada antes de la consulta. Las citas el mismo día suelen estar disponibles.",
      },
      {
        question: "¿Cuáles son las cualificaciones del Dr. del Valle?",
        answer: "El Dr. Alfredo del Valle Moreno Montañez es licenciado en Medicina por la Universidad de Carabobo (Venezuela) y obtuvo el reconocimiento oficial de su especialidad en Dermatología en España en 2026. Completó una residencia previa en Medicina Interna y es titular de un Máster en Medicina Estética. Ha trabajado en servicios de dermatología hospitalaria, clínicas privadas y teledermatología en España y Latinoamérica. Es investigador publicado en psicodermatología y trastorno dismórfico corporal. Está registrado en CGCOM (nº 282885136).",
      },
    ],
  },
  {
    dbSlug: "dr-eduardo-olivas",
    fullName: "Dr. Eduardo Daniel Rodríguez Olivas",
    specialty: "Médico General",
    seoTitle: "Dr. Eduardo Olivas — Médico General | CGCOM 070713200 | Global Health España",
    seoDescription: "Reserve una videoconsulta con Dr. Eduardo Olivas — médico general registrado en CGCOM (nº 070713200). Máster Medicina Interna y Urgencias Psiquiátricas · Medicina Estética · Telemedicina · Medicina del viajero · Español e inglés. Cita el mismo día.",
    bio: `El Dr. Eduardo Daniel Rodríguez Olivas es médico y cirujano con una formación multidisciplinar excepcional y amplia experiencia en telemedicina internacional — uno de los pocos médicos generales disponibles a través de consulta online que combina especialización en urgencias psiquiátricas, medicina estética y atención al viajero en un solo perfil clínico.

Se graduó como Médico Cirujano por la Universidad Autónoma de Guadalajara y ha completado dos maestrías de especialización: una en Medicina Interna y Urgencias Psiquiátricas — que le proporciona herramientas clínicas para evaluar situaciones de crisis de salud mental y emergencias médicas — y otra en Medicina Estética y Tratamientos Faciales. Está colegiado para ejercer en España y es miembro del Colegio Oficial de Médicos de las Islas Baleares (COMIB).

A lo largo de su carrera ha trabajado en servicios de urgencias domiciliarias, atención médica pública y privada, y plataformas internacionales de telemedicina, donde ha ofrecido diagnóstico y seguimiento remoto a pacientes nacionales e internacionales. Su experiencia específica en medicina del viajero le permite atender con precisión las necesidades de pacientes en movimiento — desde consultas pre-viaje hasta evaluaciones durante la estancia en el extranjero.

El Dr. Olivas es conocido por su enfoque crítico y resolutivo en situaciones de crisis, su capacidad para construir una relación médico-paciente cercana y su compromiso con una atención empática y responsable.

Qué trata:
• Medicina general — enfermedades agudas, infecciones respiratorias, fiebre, gripe, dolor de garganta, infecciones de oído
• Infecciones urinarias y salud sexual
• Gestión de enfermedades crónicas — hipertensión, diabetes, dislipemia, hipotiroidismo, asma, EPOC
• Salud mental — ansiedad, depresión, gestión del estrés, urgencias psiquiátricas y derivación a especialista
• Medicina del viajero — consulta pre-viaje, vacunaciones, enfermedades tropicales, atención durante el viaje
• Salud de la mujer y del hombre — anticoncepción, preocupaciones hormonales, salud sexual
• Consulta estética online — evaluación y planificación de tratamientos faciales y procedimientos estéticos (los procedimientos se realizan de forma presencial)
• Atención preventiva — revisiones de salud, consejo sobre estilo de vida, cribados
• Renovación de recetas y revisión de medicación
• Bajas médicas e informes médicos
• Derivaciones para analíticas, pruebas de imagen o consultas especializadas

Su enfoque:
El Dr. Olivas combina la solidez clínica de un médico formado en múltiples especialidades con la agilidad de un profesional con experiencia real en telemedicina internacional. Su formación en urgencias psiquiátricas le proporciona una capacidad de evaluación en situaciones de crisis que pocos médicos generales online pueden ofrecer. Es conocido por su relación cercana con los pacientes y su capacidad para resolver problemas con rapidez y responsabilidad.

Idiomas: Español · Inglés`,
    qualifications: ["Médico Cirujano — Universidad Autónoma de Guadalajara (México)", "Máster en Medicina Interna y Urgencias Psiquiátricas", "Máster en Medicina Estética y Tratamientos Faciales", "Miembro — Colegio Oficial de Médicos de las Islas Baleares (COMIB)", "Experiencia en telemedicina internacional — plataformas digitales nacionales e internacionales", "Experiencia en medicina del viajero", "Experiencia en urgencias domiciliarias", "Registrado en CGCOM (nº 070713200)"],
    languages: ["Spanish", "English"],
    faqs: [
      {
        question: "¿Está el Dr. Olivas registrado en el Consejo General de Colegios Oficiales de Médicos?",
        answer: "Sí. El Dr. Eduardo Daniel Rodríguez Olivas está registrado en el sistema de verificación del CGCOM con el número 070713200. Puede verificar este registro en cgcom.es. El Dr. Olivas es además miembro del Colegio Oficial de Médicos de las Islas Baleares (COMIB) y tiene amplia experiencia en telemedicina internacional.",
      },
      {
        question: "¿Qué trata el Dr. Olivas?",
        answer: "El Dr. Olivas ofrece consultas de medicina general cubriendo enfermedades agudas (infecciones respiratorias, fiebre, gripe, infecciones urinarias), gestión de enfermedades crónicas (hipertensión, diabetes, dislipemia, hipotiroidismo, asma, EPOC), salud mental (ansiedad, depresión, urgencias psiquiátricas), medicina del viajero, salud de la mujer y del hombre, consulta estética online, atención preventiva, renovación de recetas, bajas médicas e informes médicos.",
      },
      {
        question: "¿Qué es la especialización en urgencias psiquiátricas y por qué es relevante para una consulta de medicina general online?",
        answer: "El Dr. Olivas ha completado una Maestría en Medicina Interna y Urgencias Psiquiátricas — una combinación que le permite evaluar situaciones de crisis de salud mental con una profundidad clínica que la mayoría de los médicos generales no tienen. En una consulta online, donde la evaluación de síntomas de ansiedad grave, episodios depresivos agudos o crisis de pánico requiere capacidad de decisión rápida y segura, esta formación es especialmente valiosa. El Dr. Olivas puede evaluar si una situación de salud mental puede gestionarse de forma ambulatoria, requiere derivación urgente o necesita atención presencial inmediata.",
      },
      {
        question: "¿Tiene el Dr. Olivas experiencia en medicina del viajero?",
        answer: "Sí. El Dr. Olivas tiene experiencia específica en medicina del viajero, incluyendo consultas pre-viaje (vacunaciones, profilaxis antipalúdica, consejos para destinos específicos), atención durante el viaje y evaluación de enfermedades adquiridas en el extranjero a la vuelta. Ha colaborado con plataformas internacionales de telemedicina ofreciendo atención médica especializada para viajeros, lo que le proporciona experiencia práctica con pacientes de múltiples países y contextos culturales.",
      },
      {
        question: "¿Cómo reservo una consulta con el Dr. Olivas?",
        answer: "Seleccione un horario disponible en esta página para reservar directamente con el Dr. Olivas. El pago se procesa de forma segura al reservar — la consulta queda confirmada una vez completado el pago. Recibirá inmediatamente una invitación al calendario. Las consultas se realizan por videollamada segura en español o inglés. Las citas el mismo día suelen estar disponibles.",
      },
      {
        question: "¿Cuáles son las cualificaciones del Dr. Olivas?",
        answer: "El Dr. Eduardo Rodríguez Olivas es Médico Cirujano graduado por la Universidad Autónoma de Guadalajara. Ha completado una Maestría en Medicina Interna y Urgencias Psiquiátricas y una Maestría en Medicina Estética y Tratamientos Faciales. Es miembro del Colegio Oficial de Médicos de las Islas Baleares (COMIB) y tiene amplia experiencia en telemedicina internacional, urgencias domiciliarias y medicina del viajero. Está registrado en CGCOM (nº 070713200).",
      },
    ],
  },
  {
    dbSlug: "dr-eszter-szilagyi",
    fullName: "Dra. Eszter Szilágyi",
    specialty: "Médica Especialista — Cirugía Cardiovascular",
    seoTitle: "Dra. Eszter Szilágyi — Cirugía Cardiovascular | CGCOM 292912849 | Global Health España",
    seoDescription: "Reserve una videoconsulta con Dra. Eszter Szilágyi — especialista en Cirugía Cardiovascular registrada en CGCOM (nº 292912849). Universidad Semmelweis · Hospital Vithas Xanit · Helios Heart Center · Español, inglés, alemán y húngaro. Cita el mismo día.",
    bio: `La Dra. Eszter Szilágyi es médica especialista en Cirugía Cardiovascular con formación en la Universidad Semmelweis de Budapest — una de las facultades de medicina más reconocidas de Europa Central — y más de una década de experiencia clínica en hospitales de referencia cardiovascular en Alemania y España.

Ha trabajado en centros especializados de primer nivel en Alemania: el Hospital Central de las Fuerzas Armadas Alemanas (Bundeswehr Zentralkrankenhaus) en Coblenza y el Helios Klinikum Siegburg – Heart Center, donde participó activamente en procedimientos quirúrgicos cardiovasculares complejos y en la atención perioperatoria de pacientes cardíacos. En paralelo, acumuló amplia experiencia en urgencias y atención médica de guardia en el sistema de emergencias de Baja Sajonia (Alemania).

Obtuvo el reconocimiento oficial de su especialidad por el Ministerio de Sanidad español en 2022 y actualmente ejerce como cirujana cardiovascular en el Hospital Vithas Xanit Internacional en España, donde continúa su práctica quirúrgica y clínica cardiovascular.

La Dra. Szilágyi habla alemán y húngaro como lenguas maternas, y domina el inglés y el español con fluidez — lo que la convierte en una de las pocas especialistas cardiovasculares disponibles a través de consulta online que puede atender pacientes en cuatro idiomas, incluyendo a pacientes centroeuropeos y húngaros que residen o viajan a España.

A través de Global Health, la Dra. Szilágyi ofrece consultas online de evaluación cardiovascular y medicina general — aprovechando tanto su profunda formación especializada como su amplia experiencia en urgencias y atención médica integral.

Qué ofrece online:
• Evaluación cardiovascular — valoración de síntomas cardíacos, interpretación de ECG, ecocardiogramas e informes cardiológicos
• Segunda opinión cardiovascular — sobre diagnósticos, resultados de pruebas o planes de tratamiento quirúrgico
• Consultas pre y post-operatorias — preparación para cirugía cardíaca, recuperación y seguimiento post-quirúrgico
• Medicina general — enfermedades agudas, infecciones, gestión de enfermedades crónicas (hipertensión, diabetes, colesterol)
• Urgencias y evaluación de síntomas agudos — evaluación de dolor torácico, palpitaciones, disnea y otros síntomas cardiovasculares que requieren orientación clínica inmediata
• Salud preventiva — evaluación del riesgo cardiovascular, consejo sobre estilo de vida, cribados
• Informe médico y derivaciones a especialistas
• Atención médica para pacientes internacionales y centroeuropeos — especialmente húngaros y germano-hablantes en España

Nota importante: La Dra. Szilágyi no puede realizar procedimientos quirúrgicos a través de videollamada. Las consultas online cubren evaluación clínica, segunda opinión, orientación pre/post-quirúrgica y medicina general. Si está experimentando una emergencia cardíaca — dolor torácico agudo, dificultad para respirar o pérdida de consciencia — llame inmediatamente al 112.

Su enfoque:
La Dra. Szilágyi es reconocida por su rigor profesional, su meticulosidad clínica y su enfoque centrado en el paciente. Su experiencia en entornos quirúrgicos de alta exigencia y en sistemas de urgencias europeos la ha dotado de una capacidad de evaluación clínica precisa y de una toma de decisiones segura bajo presión — cualidades especialmente valiosas en una consulta online donde la evaluación de síntomas cardiovasculares requiere criterio clínico sólido.

Idiomas: Español · Inglés · Alemán · Húngaro`,
    qualifications: ["Médica especialista en Cirugía Cardiovascular — reconocimiento oficial Ministerio de Sanidad España (2022)", "Formación médica — Universidad Semmelweis, Budapest, Hungría", "Cirugía cardiovascular — Hospital Central de las Fuerzas Armadas Alemanas (Bundeswehr Zentralkrankenhaus), Coblenza", "Cirugía cardiovascular — Helios Klinikum Siegburg – Heart Center, Alemania", "Cirujana cardiovascular — Hospital Vithas Xanit Internacional, España", "Procedimientos quirúrgicos dermatológicos — Policlínica San Juan de Alhaurín de la Torre", "Médica de guardia — sistema de urgencias médicas de Baja Sajonia, Alemania", "Registrada en CGCOM (nº 292912849) · Colegio de Médicos de Málaga (29/2912849)"],
    languages: ["Spanish", "English", "Hungarian", "German"],
    faqs: [
      {
        question: "¿Está la Dra. Szilágyi registrada en el Consejo General de Colegios Oficiales de Médicos?",
        answer: "Sí. La Dra. Eszter Szilágyi está registrada en el CGCOM con el número 292912849 y en el Colegio de Médicos de Málaga con el número 29/2912849. Puede verificar este registro en cgcom.es. La Dra. Szilágyi obtuvo el reconocimiento oficial de su especialidad en Cirugía Cardiovascular por el Ministerio de Sanidad español en 2022 y actualmente ejerce en el Hospital Vithas Xanit Internacional.",
      },
      {
        question: "¿Qué consultas cardiovasculares ofrece la Dra. Szilágyi online?",
        answer: "La Dra. Szilágyi ofrece evaluación cardiovascular (valoración de síntomas, interpretación de ECG y ecocardiogramas), segunda opinión sobre diagnósticos o planes de tratamiento quirúrgico, consultas pre y post-operatorias (preparación y seguimiento de cirugía cardíaca), evaluación de síntomas agudos cardiovasculares (dolor torácico, palpitaciones, disnea), valoración del riesgo cardiovascular e informes médicos. Las consultas online no incluyen procedimientos quirúrgicos.",
      },
      {
        question: "¿Qué hace única a la Dra. Szilágyi entre los especialistas cardiovasculares disponibles online?",
        answer: "La Dra. Szilágyi combina tres elementos poco frecuentes en un único perfil online: formación especializada en cirugía cardiovascular en centros de referencia europeos (Universidad Semmelweis, Helios Heart Center, Hospital Vithas Xanit Internacional); capacidad cuatrilingüe real en español, inglés, alemán y húngaro — lo que la hace accesible a pacientes centroeuropeos en España; y amplia experiencia en urgencias médicas en el sistema de emergencias alemán, que le proporciona criterio clínico de alta fiabilidad en la evaluación de síntomas agudos cardiovasculares.",
      },
      {
        question: "¿Puede la Dra. Szilágyi atender a pacientes húngaros o de habla alemana en España?",
        answer: "Sí. La Dra. Szilágyi habla alemán y húngaro como lenguas maternas. Para pacientes húngaros, austriacos, suizos o alemanes que residen o se encuentran de visita en España y necesitan atención médica especializada en su idioma nativo — ya sea evaluación cardiovascular, medicina general o una segunda opinión — la Dra. Szilágyi ofrece una accesibilidad clínica excepcional y prácticamente sin parangón en el contexto de la telemedicina española.",
      },
      {
        question: "¿Cómo reservo una consulta con la Dra. Szilágyi?",
        answer: "Seleccione un horario disponible en esta página para reservar directamente con la Dra. Szilágyi. El pago se procesa de forma segura al reservar — la consulta queda confirmada una vez completado el pago. Recibirá inmediatamente una invitación al calendario. Las consultas se realizan por videollamada segura en español, inglés, alemán o húngaro. Si está experimentando una emergencia cardíaca — dolor torácico agudo, dificultad para respirar o pérdida de consciencia — llame inmediatamente al 112.",
      },
      {
        question: "¿Cuáles son las cualificaciones de la Dra. Szilágyi?",
        answer: "La Dra. Eszter Szilágyi se formó en la Universidad Semmelweis de Budapest y obtuvo el reconocimiento oficial de su especialidad en Cirugía Cardiovascular por el Ministerio de Sanidad español en 2022. Ha trabajado en el Bundeswehr Zentralkrankenhaus de Coblenza y el Helios Klinikum Siegburg – Heart Center en Alemania, y actualmente ejerce en el Hospital Vithas Xanit Internacional en España. Cuenta con experiencia adicional en urgencias médicas en el sistema de emergencias de Baja Sajonia. Está registrada en CGCOM (nº 292912849) y en el Colegio de Médicos de Málaga.",
      },
    ],
  },
  {
    dbSlug: "dr-fabiana-cornejo",
    fullName: "Dra. Mónica Fabiana Cornejo Román",
    specialty: "Psiquiatra Consultora — Neuropsicofarmacología",
    seoTitle: "Dra. Fabiana Cornejo — Psiquiatra | CGCOM 64182 | Global Health España",
    seoDescription: "Reserve una videoconsulta con Dra. Fabiana Cornejo — psiquiatra consultora registrada en CGCOM (nº 64182). Máster Neuropsicofarmacología · Hospital del Mar Barcelona · Miembro APA · Evaluación y tratamiento psiquiátrico online. Cita el mismo día.",
    bio: `La Dra. Mónica Fabiana Cornejo Román es psiquiatra consultora con más de doce años de experiencia clínica en servicios de salud mental hospitalarios y ambulatorios en España y Argentina — una de las psiquiatras con mayor profundidad de formación disponibles a través de consulta online en España.

Se licenció en Medicina por la Universidad Nacional de Tucumán y completó su formación especializada en psiquiatría en el Hospital Borda con el apoyo de la Universidad Maimónides — uno de los centros de referencia históricos en formación psiquiátrica de Argentina. Con su titulación homologada en España, amplió su formación en el Hospital del Mar – Parc de Salut Mar de Barcelona, con rotaciones en psiquiatría aguda y subaguda, urgencias psiquiátricas, psicofarmacología compleja e interconsulta.

Su trayectoria clínica en España incluye trabajo como psiquiatra consultora en la Fundación Vidal y Barraquer, el Hospital Universitari Sagrat Cor, el Centro de Salud Mental de Badalona (BSA) y el Hospital Mare de Déu de la Mercè — cubriendo atención ambulatoria, psiquiatría de enlace, urgencias psiquiátricas, gestión del riesgo de suicidio, tratamiento hospitalario y derivación a programas especializados en depresión resistente, TDAH y trastornos del espectro autista.

Anteriormente ejerció durante más de seis años en Argentina con OSDE, Hospital Santojanni, Medicus SA y el Centro Larrea de Salud Mental, incluyendo guardias de psiquiatría de urgencias de alto volumen y atención hospitalaria compleja.

La Dra. Cornejo es titular de un Máster en Neuropsicofarmacología Clínica, una Especialización en Medicina Legal y una especialización en Evaluación y Tratamiento del Dolor. Ha colaborado en proyectos de investigación clínica con el CIBERSAM del Hospital Sant Pau y ha publicado en el ámbito de la bioética y la psiquiatría. Es miembro titular de la Asociación Americana de Psiquiatría (APA).

La psiquiatría es una especialidad donde el rigor farmacológico y la escucha empática son igualmente esenciales. La Dra. Cornejo es reconocida por ambas: un razonamiento clínico estructurado que permite evaluar situaciones complejas con precisión, y un enfoque compasivo y centrado en el paciente que hace posible que personas con dificultades graves de salud mental se sientan comprendidas y acompañadas.

Qué ofrece online:
• Evaluación psiquiátrica inicial — diagnóstico y evaluación de trastornos del estado de ánimo, ansiedad, psicosis y otras condiciones psiquiátricas
• Trastornos del estado de ánimo — depresión, depresión resistente al tratamiento, trastorno bipolar
• Trastornos de ansiedad — ansiedad generalizada, trastorno de pánico, TOC, TEPT
• Trastornos psicóticos — evaluación, diagnóstico y manejo farmacológico
• TDAH en adultos — evaluación, diagnóstico y planificación terapéutica
• Trastornos del espectro autista — evaluación y orientación
• Adicciones — evaluación y derivación a programas especializados
• Neuropsicofarmacología — revisión, optimización y manejo complejo de medicación psiquiátrica
• Gestión del riesgo de suicidio — evaluación clínica y planificación de seguridad
• Dolor crónico con componente psiquiátrico — evaluación y abordaje integrado
• Segunda opinión psiquiátrica — sobre diagnósticos, planes de tratamiento o medicación
• Informes médico-legales — elaboración de informes psiquiátricos para fines legales o administrativos
• Seguimiento de tratamientos psiquiátricos en curso

Su enfoque:
La Dra. Cornejo practica una psiquiatría basada en la evidencia, estructurada y compasiva. Su doble especialización en neuropsicofarmacología y medicina legal le permite abordar los casos más complejos — desde pacientes con medicación psiquiátrica de difícil manejo hasta situaciones que requieren informe médico-legal — con la misma solidez clínica que aplica en la evaluación empática de la persona que tiene delante.

Nota importante: Si está experimentando una crisis psiquiátrica o pensamientos de autolesión, contacte con los servicios de emergencias llamando al 112 o diríjase a urgencias — no espere a una cita online.

Idiomas: Español`,
    qualifications: ["Psiquiatra Consultora — España (homologación en proceso de finalización)", "Máster en Neuropsicofarmacología Clínica", "Especialización Universitaria en Medicina Legal", "Especialización en Evaluación y Tratamiento del Dolor", "Formación complementaria — Hospital del Mar – Parc de Salut Mar, Barcelona", "Psiquiatra consultora — Fundación Vidal y Barraquer, Hospital Sagrat Cor, BSA Badalona, Hospital Mare de Déu de la Mercè", "Experiencia previa Argentina: Hospital Santojanni, OSDE, Medicus SA, Centro Larrea de Salud Mental", "Colaboración en investigación — CIBERSAM, Hospital Sant Pau", "Publicaciones en bioética y psiquiatría", "Miembro titular — Asociación Americana de Psiquiatría (APA)", "Licenciada en Medicina — Universidad Nacional de Tucumán", "Registrada en CGCOM (nº 64182)"],
    languages: ["Spanish"],
    faqs: [
      {
        question: "¿Está la Dra. Cornejo registrada en el Consejo General de Colegios Oficiales de Médicos?",
        answer: "Sí. La Dra. Mónica Fabiana Cornejo Román está registrada en el CGCOM con el número 64182. Puede verificar este registro en cgcom.es. La Dra. Cornejo es psiquiatra consultora con formación en el Hospital Borda (Argentina), el Hospital del Mar de Barcelona y experiencia como consultora en la Fundación Vidal y Barraquer, el Hospital Sagrat Cor y el Centro de Salud Mental de Badalona.",
      },
      {
        question: "¿Qué afecciones psiquiátricas trata la Dra. Cornejo online?",
        answer: "La Dra. Cornejo ofrece consultas psiquiátricas online para: trastornos del estado de ánimo (depresión, depresión resistente al tratamiento, trastorno bipolar), trastornos de ansiedad (ansiedad generalizada, trastorno de pánico, TOC, TEPT), trastornos psicóticos, TDAH en adultos, trastornos del espectro autista, adicciones, neuropsicofarmacología (revisión y optimización de medicación psiquiátrica compleja), gestión del riesgo de suicidio, dolor crónico con componente psiquiátrico, segunda opinión psiquiátrica e informes médico-legales.",
      },
      {
        question: "¿Qué es la neuropsicofarmacología y por qué es relevante?",
        answer: "La neuropsicofarmacología es la especialización que estudia cómo los fármacos afectan al sistema nervioso central y cómo optimizar su uso clínico en el tratamiento de enfermedades psiquiátricas. La Dra. Cornejo es titular de un Máster en Neuropsicofarmacología Clínica — lo que significa que puede evaluar y gestionar casos de medicación psiquiátrica compleja: pacientes con múltiples fármacos, respuestas atípicas, depresión resistente al tratamiento, o casos en los que la medicación actual no está siendo eficaz. Para pacientes que llevan años tratándose sin resultados satisfactorios, esta especialización puede marcar una diferencia real.",
      },
      {
        question: "¿Puede la Dra. Cornejo elaborar informes médico-legales?",
        answer: "Sí. La Dra. Cornejo cuenta con una Especialización Universitaria en Medicina Legal y experiencia en la elaboración de informes psiquiátricos para fines legales o administrativos. Si necesita un informe psiquiátrico para un procedimiento legal, una prestación por incapacidad, un proceso de divorcio u otro fin administrativo, puede discutir esta necesidad durante la consulta online.",
      },
      {
        question: "¿Cómo reservo una consulta con la Dra. Cornejo?",
        answer: "Seleccione un horario disponible en esta página para reservar directamente con la Dra. Cornejo. El pago se procesa de forma segura al reservar — la consulta queda confirmada una vez completado el pago. Recibirá inmediatamente una invitación al calendario. Las consultas se realizan por videollamada segura en español. Si está experimentando una crisis psiquiátrica o pensamientos de autolesión, llame al 112 o diríjase a urgencias inmediatamente — no espere a una cita.",
      },
      {
        question: "¿Cuáles son las cualificaciones de la Dra. Cornejo?",
        answer: "La Dra. Mónica Fabiana Cornejo Román es licenciada en Medicina por la Universidad Nacional de Tucumán y completó su formación especializada en psiquiatría en el Hospital Borda con el apoyo de la Universidad Maimónides. Ha ampliado su formación en el Hospital del Mar – Parc de Salut Mar de Barcelona. Titula un Máster en Neuropsicofarmacología Clínica, una Especialización en Medicina Legal y una especialización en Dolor. Ha trabajado como consultora en la Fundación Vidal y Barraquer, el Hospital Sagrat Cor y el BSA Badalona. Es miembro titular de la Asociación Americana de Psiquiatría y ha colaborado con el CIBERSAM del Hospital Sant Pau. Registrada en CGCOM (nº 64182).",
      },
    ],
  },
  {
    dbSlug: "dr-fidel-mesa-prado",
    fullName: "Dr. Fidel Ernesto Mesa Prado",
    specialty: "Médico Especialista — Cardiología",
    seoTitle: "Dr. Fidel Mesa Prado — Cardiólogo | CGCOM 292911355 | Global Health España",
    seoDescription: "Reserve una videoconsulta con Dr. Fidel Mesa Prado — cardiólogo especialista registrado en CGCOM (nº 292911355). Hospital Costa del Sol Marbella · 3 Másteres en Cardiología · Ecocardiografía · Resonancia Cardíaca · Español e inglés. Cita el mismo día.",
    bio: `El Dr. Fidel Ernesto Mesa Prado es cardiólogo especialista con una trayectoria clínica y académica excepcional — uno de los pocos cardiólogos disponibles a través de consulta online en España con tres másteres de especialización en cardiología clínica, imagen cardíaca y resonancia magnética cardíaca.

Su formación médica tiene un punto de partida inusual y valioso: antes de licenciarse en Medicina por la Universidad de Málaga, obtuvo un Diploma en Enfermería — una base clínica que le proporciona una comprensión de la atención al paciente desde múltiples perspectivas y una empatía que marca la diferencia en la relación médico-paciente. Completó su residencia en Cardiología en el Hospital Costa del Sol con la calificación máxima de "Sobresaliente".

Actualmente ejerce como Facultativo Especialista de Área (FEA) en Cardiología en el Hospital Universitario Costa del Sol de Marbella y como especialista en Cardiología en Hospiten Estepona — dos de los principales centros hospitalarios de referencia en la Costa del Sol. Es además PhD candidato, con investigación activa en anticoagulación, insuficiencia cardíaca y nuevas terapias hipolipemiantes (inhibidores PCSK9).

Sus tres másteres reflejan una especialización en profundidad en la vertiente diagnóstica de la cardiología: Máster en Cardiología Clínica por la Sociedad Española de Cardiología (SEC), Máster en Imagen Cardíaca por la Universidad Católica de Murcia (UCAM) y Máster en Diagnóstico por Resonancia Magnética Cardíaca — lo que le convierte en uno de los especialistas con mayor capacidad diagnóstica por imagen cardíaca accesibles a través de consulta online.

Qué ofrece online:
• Evaluación cardiológica — valoración de síntomas cardiovasculares, factores de riesgo y orientación clínica
• Interpretación de imagen cardíaca — ecocardiografía transtorácica y transesofágica, resonancia magnética cardíaca, informes de imagen
• Segunda opinión cardiológica — sobre diagnósticos, informes de ecocardiograma, resonancia cardíaca o planes de tratamiento
• Insuficiencia cardíaca — evaluación, manejo, seguimiento y orientación farmacológica
• Síndrome coronario agudo — evaluación de episodios previos, prevención secundaria y seguimiento
• Arritmias complejas — evaluación clínica, interpretación de ECG y Holter, orientación sobre ritmo cardíaco
• Enfermedad coronaria y tromboembolismo — prevención, anticoagulación y seguimiento
• Nuevas terapias hipolipemiantes — asesoría sobre inhibidores PCSK9 y manejo del colesterol de difícil control
• Consultas pre y post-procedimiento — orientación sobre procedimientos cardíacos programados o recuperación
• Valoración de riesgo cardiovascular — evaluación preventiva y plan personalizado de reducción de riesgo
• Segunda opinión sobre medicación cardiológica — revisión de tratamientos, interacciones y optimización farmacológica
• Informe médico y derivaciones

Nota importante: El Dr. Mesa Prado no puede realizar procedimientos invasivos a través de videollamada. Si está experimentando una emergencia cardíaca — dolor torácico agudo, dificultad grave para respirar, pérdida de consciencia o arritmia severa — llame inmediatamente al 112.

Su enfoque:
El Dr. Mesa Prado es reconocido por su liderazgo clínico — habiendo sido representante y coordinador de la formación de residentes en urgencias y soporte vital avanzado — y por una capacidad diagnóstica respaldada por tres másteres en la vertiente de imagen cardíaca. Su formación previa en enfermería le proporciona una perspectiva integral y empática que complementa su rigor científico como investigador activo.

Idiomas: Español · Inglés`,
    qualifications: ["FEA Cardiología — Hospital Universitario Costa del Sol, Marbella", "Especialista en Cardiología — Hospiten Estepona", "Máster en Cardiología Clínica — Sociedad Española de Cardiología (SEC)", "Máster en Imagen Cardíaca — Universidad Católica de Murcia (UCAM)", "Máster en Diagnóstico por Resonancia Magnética Cardíaca", "Experto Universitario — Insuficiencia Cardíaca, Enfermedad Coronaria, Enfermedad Tromboembólica", "PhD candidato — en curso", "Residencia Cardiología — Hospital Costa del Sol (calificación: Sobresaliente)", "Diploma en Enfermería (formación previa a Medicina)", "Licenciado en Medicina — Universidad de Málaga (Calificación: Notable)", "Representante y coordinador de formación de residentes — urgencias y soporte vital avanzado", "Investigación activa: anticoagulación, insuficiencia cardíaca, inhibidores PCSK9", "Registrado en CGCOM (nº 292911355)"],
    languages: ["Spanish", "English"],
    faqs: [
      {
        question: "¿Está el Dr. Mesa Prado registrado en el Consejo General de Colegios Oficiales de Médicos?",
        answer: "Sí. El Dr. Fidel Ernesto Mesa Prado está registrado en el CGCOM con el número 292911355. Puede verificar este registro en cgcom.es. El Dr. Mesa Prado es FEA en Cardiología en el Hospital Universitario Costa del Sol de Marbella y especialista en Cardiología en Hospiten Estepona, con tres másteres de especialización y residencia calificada como Sobresaliente.",
      },
      {
        question: "¿Qué consultas cardiológicas ofrece el Dr. Mesa Prado online?",
        answer: "El Dr. Mesa Prado ofrece evaluación cardiológica (síntomas cardiovasculares, factores de riesgo), interpretación de imagen cardíaca (ecocardiografía, resonancia magnética cardíaca), segunda opinión sobre diagnósticos o planes de tratamiento, insuficiencia cardíaca (evaluación y seguimiento), síndrome coronario agudo (prevención secundaria y seguimiento), arritmias complejas (ECG, Holter), anticoagulación y tromboembolismo, nuevas terapias hipolipemiantes (inhibidores PCSK9), consultas pre y post-procedimiento, valoración de riesgo cardiovascular e informes médicos. No incluye procedimientos invasivos.",
      },
      {
        question: "¿Puede el Dr. Mesa Prado interpretar mi ecocardiograma o resonancia magnética cardíaca?",
        answer: "Sí. El Dr. Mesa Prado tiene titulación específica en imagen cardíaca — un Máster en Imagen Cardíaca por la UCAM y un Máster en Diagnóstico por Resonancia Magnética Cardíaca — lo que le permite interpretar y explicar los resultados de ecocardiografía transtorácica y transesofágica, resonancias cardíacas y otros informes de imagen cardíaca como parte de la consulta online. Si comparte el informe radiológico o el informe de ecocardiograma antes de la cita, el Dr. Mesa Prado podrá ofrecer una evaluación más detallada y personalizada.",
      },
      {
        question: "¿Qué son los inhibidores PCSK9 y cuándo pueden ser relevantes?",
        answer: "Los inhibidores PCSK9 (iPCSK9) son una clase de nuevas terapias hipolipemiantes indicadas para pacientes con colesterol LDL de difícil control que no responden suficientemente a las estatinas convencionales, incluyendo pacientes con hipercolesterolemia familiar o muy alto riesgo cardiovascular. El Dr. Mesa Prado investiga activamente este campo. Si tiene colesterol elevado de difícil manejo o está tomando estatinas con resultados insuficientes, puede discutir esta opciones en una consulta online.",
      },
      {
        question: "¿Cómo reservo una consulta con el Dr. Mesa Prado?",
        answer: "Seleccione un horario disponible en esta página para reservar directamente con el Dr. Mesa Prado. El pago se procesa de forma segura al reservar — la consulta queda confirmada una vez completado el pago. Recibirá inmediatamente una invitación al calendario. Las consultas se realizan por videollamada segura en español o inglés. Si comparte informes previos de ecocardiograma, resonancia cardíaca o analíticas antes de la consulta, el Dr. Mesa Prado podrá preparar una evaluación más específica. Si está experimentando una emergencia cardíaca, llame al 112 inmediatamente.",
      },
      {
        question: "¿Cuáles son las cualificaciones del Dr. Mesa Prado?",
        answer: "El Dr. Fidel Mesa Prado es licenciado en Medicina por la Universidad de Málaga, con formación previa en Enfermería. Completó su residencia en Cardiología en el Hospital Costa del Sol con calificación Sobresaliente. Titula tres másteres: Cardiología Clínica (SEC), Imagen Cardíaca (UCAM) y Resonancia Magnética Cardíaca Diagnóstica. Es Experto Universitario en Insuficiencia Cardíaca, Enfermedad Coronaria y Enfermedad Tromboembólica, y es PhD candidato con investigación activa en anticoagulación, insuficiencia cardíaca e inhibidores PCSK9. Ejerce como FEA Cardiología en el Hospital Universitario Costa del Sol de Marbella. Registrado en CGCOM (nº 292911355).",
      },
    ],
  },
  {
    dbSlug: "dr-irene-galve-moros",
    fullName: "Irene Galve Moros",
    specialty: "Psicóloga General Sanitaria",
    seoTitle: "Irene Galve Moros — Psicóloga General Sanitaria | Nº A-03819 | Global Health España",
    seoDescription: "Reserve una sesión con Irene Galve Moros — Psicóloga General Sanitaria (nº A-03819). Terapia de tercera generación · Adicciones y patología dual · ITA Prisma · Proyecto Hombre · Apoyo psicológico online en español. Cita el mismo día.",
    bio: `Irene Galve Moros es Psicóloga General Sanitaria — nº A-03819 (COP) con formación clínica sólida y experiencia especializada en trastornos de adicción, patología dual y apoyo psicológico en contextos de alta vulnerabilidad — áreas donde la terapia psicológica requiere una combinación de rigor clínico y capacidad de acompañamiento genuino.

Es licenciada en Psicología con especialización en Evaluación e Intervención Clínica y Psicología de la Salud, y titula un Máster en Psicología General Sanitaria — la habilitación oficial en España para el ejercicio de la psicología clínica en el sistema sanitario. Cuenta además con formación avanzada en Terapias Psicológicas de Tercera Generación, un conjunto de enfoques basados en la evidencia que incluye la Terapia de Aceptación y Compromiso (ACT), la Terapia Dialéctico-Conductual (DBT) y las intervenciones basadas en Mindfulness.

Ha desarrollado su carrera en centros especializados de reconocido prestigio: ITA Prisma, Proyecto Hombre y Alis Canarias — entornos de alta exigencia clínica donde ha participado en procesos terapéuticos intensivos, evaluaciones psicosociales, seguimiento continuo e intervención psicológica tanto individual como grupal. Su experiencia abarca salud mental en la infancia y la juventud, la adultez y la tercera edad.

Irene trabaja con personas que buscan apoyo psicológico estructurado — no necesariamente en crisis, sino que quieren entenderse mejor, manejar emociones difíciles, salir de patrones que se repiten o afrontar situaciones vitales complejas. Su enfoque es empático, respetuoso y siempre basado en la evidencia.

Con qué ayuda:
• Ansiedad — ansiedad generalizada, ansiedad social, ataques de pánico, preocupación crónica
• Depresión y estado de ánimo bajo — tristeza persistente, pérdida de motivación, anhedonia
• Estrés y burnout — estrés laboral, agotamiento emocional, dificultad para desconectar
• Trastornos de adicción — alcohol, sustancias, conductas adictivas, apoyo en proceso de deshabituación
• Patología dual — trastornos de salud mental con consumo de sustancias asociado
• Regulación emocional — dificultad para manejar emociones intensas, reactividad emocional
• Autoestima y desarrollo personal — inseguridad, autocrítica, relación con uno mismo
• Relaciones y comunicación — dificultades relacionales, límites, comunicación asertiva
• Duelo y pérdida — pérdida de un ser querido, duelos vitales no resueltos
• Apoyo en infancia, adolescencia y tercera edad — adaptado a cada etapa vital
• Intervención psicoeducativa — aprender a entender y gestionar la propia salud mental

Enfoques terapéuticos:
• Terapias de Tercera Generación — ACT (Terapia de Aceptación y Compromiso), DBT (Terapia Dialéctico-Conductual), Mindfulness
• Evaluación psicosocial — valoración integral del estado psicológico y el contexto vital
• Intervención individual y grupal

Su enfoque:
Irene es conocida por su empatía, su escucha activa y su capacidad para construir una relación terapéutica donde el paciente se siente comprendido sin juicio. Trabaja desde un enfoque centrado en la persona — la terapia se adapta a quien es el paciente y a lo que necesita en este momento de su vida, no al revés. Cada sesión está orientada a generar recursos reales y duraderos, no solo a gestionar el síntoma inmediato.

Nota importante: Si está experimentando una crisis psicológica o pensamientos de autolesión, contacte con los servicios de emergencias llamando al 112 o con el Teléfono de la Esperanza (717 003 717) — no espere a una cita.

Idiomas: Español`,
    qualifications: ["Psicóloga General Sanitaria — nº A-03819", "Máster en Psicología General Sanitaria", "Licenciada en Psicología — especialización en Evaluación e Intervención Clínica y Psicología de la Salud", "Formación avanzada en Terapias Psicológicas de Tercera Generación (ACT, DBT, Mindfulness)", "Experiencia clínica: ITA Prisma, Proyecto Hombre, Alis Canarias"],
    languages: ["Spanish"],
    faqs: [
      {
        question: "¿Está Irene Galve Moros registrada como Psicóloga General Sanitaria en España?",
        answer: "Sí. Irene Galve ejerce como Psicóloga General Sanitaria registrada en el COP con número de registro A-03819. Puede verificar este registro en cop.es. — para psicólogos en España el registro es con el Colegio Oficial de Psicólogos correspondiente. Irene titula un Máster en Psicología General Sanitaria y cuenta con experiencia clínica en ITA Prisma, Proyecto Hombre y Alis Canarias.",
      },
      {
        question: "¿Con qué situaciones puede ayudar Irene online?",
        answer: "Irene ofrece apoyo psicológico online para: ansiedad (generalizada, social, ataques de pánico), depresión y estado de ánimo bajo, estrés y burnout, trastornos de adicción (alcohol, sustancias, conductas adictivas), patología dual (salud mental y consumo de sustancias), regulación emocional, autoestima y desarrollo personal, dificultades relacionales y comunicación, duelo y pérdida, apoyo en infancia, adolescencia y tercera edad, e intervención psicoeducativa.",
      },
      {
        question: "¿Qué son las Terapias de Tercera Generación y por qué son relevantes?",
        answer: "Las Terapias de Tercera Generación son un conjunto de enfoques psicológicos basados en la evidencia que incluyen la Terapia de Aceptación y Compromiso (ACT), la Terapia Dialéctico-Conductual (DBT) y las intervenciones basadas en Mindfulness. A diferencia de enfoques más clásicos que buscan eliminar o modificar pensamientos y emociones difíciles, estas terapias trabajan la relación que tenemos con nuestros propios estados internos — desarrollando flexibilidad psicológica, tolerancia al malestar y valores personales como guía de acción. Irene cuenta con formación avanzada en estos enfoques, especialmente útiles en ansiedad, depresión, adicciones y regulación emocional.",
      },
      {
        question: "¿Tiene Irene experiencia específica en adicciones y patología dual?",
        answer: "Sí. Irene ha desarrollado parte significativa de su carrera en centros especializados en adicciones y patología dual: ITA Prisma, Proyecto Hombre y Alis Canarias — tres de los referentes en España en el tratamiento de trastornos adictivos. Su experiencia incluye procesos terapéuticos intensivos, evaluaciones psicosociales y seguimiento en contextos de alta vulnerabilidad. Para personas que atraviesan un proceso de deshabituación, que tienen una adicción activa o que combinan una condición de salud mental con consumo de sustancias, esta especialización es directamente relevante.",
      },
      {
        question: "¿Cómo reservo una sesión con Irene?",
        answer: "Seleccione un horario disponible en esta página para reservar directamente con Irene. El pago se procesa de forma segura al reservar — la sesión queda confirmada una vez completado el pago. Recibirá inmediatamente una invitación al calendario. Las sesiones se realizan por videollamada segura y confidencial en español. Si está experimentando una crisis psicológica o pensamientos de autolesión, llame al 112 o al Teléfono de la Esperanza (717 003 717) — no espere a una cita.",
      },
      {
        question: "¿Cuáles son las cualificaciones de Irene Galve Moros?",
        answer: "Irene Galve Moros es licenciada en Psicología con especialización en Evaluación e Intervención Clínica y Psicología de la Salud, y titula un Máster en Psicología General Sanitaria. Cuenta con formación avanzada en Terapias Psicológicas de Tercera Generación (ACT, DBT, Mindfulness). Ha desarrollado su carrera clínica en ITA Prisma, Proyecto Hombre y Alis Canarias, con experiencia en adicciones, patología dual, salud mental en todas las etapas vitales e intervención psicológica individual y grupal.",
      },
    ],
    chamber: "COP",
    registrationUrl: "https://www.cop.es/",
  },
  {
    dbSlug: "dr-javier-villarte-betancor",
    fullName: "Javier Villarte Betancor",
    specialty: "Psicólogo General Sanitario",
    seoTitle: "Javier Villarte Betancor — Psicólogo General Sanitario | Nº A014346 | Global Health España",
    seoDescription: "Reserve una sesión con Javier Villarte Betancor — Psicólogo General Sanitario (nº A014346). TCC · ACT · TDC · Enfoque transdiagnóstico · Ansiedad, estado de ánimo, regulación emocional · Apoyo psicológico online en español. Cita el mismo día.",
    bio: `Javier Villarte Betancor es Psicólogo General Sanitario especializado en intervención psicológica con adultos — un profesional con un enfoque terapéutico estructurado, basado en la evidencia y orientado a resultados concretos en el funcionamiento diario y el bienestar emocional.

Su práctica clínica se organiza en torno a un modelo transdiagnóstico basado en procesos — un enfoque contemporáneo que no parte del diagnóstico como punto central, sino de los mecanismos psicológicos específicos que mantienen el malestar: evitación experiencial, fusión cognitiva, inflexibilidad emocional, déficits en regulación. Este marco le permite integrar de forma fluida las terapias con mayor respaldo empírico: la Terapia Cognitivo-Conductual (TCC), la Terapia de Aceptación y Compromiso (ACT) y la Terapia Dialéctica Conductual (TDC), adaptando cada intervención a la persona concreta, no a un protocolo genérico.

Ha desarrollado su carrera clínica en centros especializados y clínicas universitarias, incluyendo el diseño y desarrollo de programas de intervención específicos para el Trastorno Límite de la Personalidad (TLP) — uno de los cuadros más complejos en psicología clínica, que exige formación especializada y experiencia real. Ha participado en congresos internacionales y cuenta con formación avanzada en trauma, duelo, prevención del suicidio y terapias de tercera generación.

Para muchas personas, el mayor obstáculo para iniciar terapia es no saber si lo que sienten "es suficiente" para pedir ayuda. La respuesta de Javier es clara: si algo te está limitando — en tus relaciones, en tu trabajo, en tu bienestar diario — merece atención profesional. No hace falta estar en crisis para beneficiarse de la terapia.

Con qué ayuda:
• Ansiedad — ansiedad generalizada, ansiedad social, ataques de pánico, preocupación crónica
• Estado de ánimo — depresión, distimia, bajo estado de ánimo persistente
• Regulación emocional — dificultad para manejar emociones intensas, reactividad emocional, impulsividad
• Trastorno Límite de la Personalidad (TLP) — evaluación, intervención estructurada y seguimiento
• Trauma y TEPT — procesamiento de experiencias traumáticas, estabilización emocional
• Duelo — pérdida de un ser querido, duelos complicados o no resueltos
• Prevención del suicidio y gestión del riesgo — evaluación y apoyo en situaciones de riesgo
• Habilidades de afrontamiento — desarrollo de estrategias efectivas para gestionar el malestar
• Funcionamiento diario — dificultades en el trabajo, las relaciones o la vida cotidiana
• Autoconocimiento y desarrollo personal — entenderse mejor, patrones que se repiten, toma de decisiones

Enfoques terapéuticos:
• Terapia Cognitivo-Conductual (TCC) — identificación y modificación de pensamientos y conductas disfuncionales
• Terapia de Aceptación y Compromiso (ACT) — flexibilidad psicológica y acción guiada por valores
• Terapia Dialéctica Conductual (TDC) — regulación emocional, tolerancia al malestar, habilidades interpersonales
• Enfoque transdiagnóstico basado en procesos — intervención centrada en los mecanismos que mantienen el malestar

Su enfoque:
Javier trabaja con un estilo empático, estructurado y orientado a objetivos. Cada sesión tiene una dirección clara y cada intervención se adapta a las necesidades reales de la persona, no a un protocolo estándar. Cree que la terapia efectiva combina el rigor científico con una relación terapéutica genuina — y que el paciente debe entender en todo momento qué estamos haciendo y por qué.

Nota importante: Si está experimentando una crisis psicológica o pensamientos de autolesión, contacte con los servicios de emergencias llamando al 112 o con el Teléfono de la Esperanza (717 003 717) — no espere a una cita.

Idiomas: Español`,
    qualifications: ["Psicólogo General Sanitario — nº A014346", "Especialización en intervención psicológica con adultos — enfoque transdiagnóstico basado en procesos", "Formación avanzada en TCC, ACT y TDC", "Experiencia en desarrollo de programas de intervención para TLP", "Formación avanzada en trauma, duelo y prevención del suicidio", "Experiencia clínica en centros especializados y clínicas universitarias", "Participación en congresos internacionales de psicología"],
    languages: ["Spanish"],
    faqs: [
      {
        question: "¿Está Javier Villarte Betancor registrado como Psicólogo General Sanitario en España?",
        answer: "Sí. Javier Villarte Betancor ejerce como Psicólogo General Sanitario registrado en el COP con número de registro A014346. Puede verificar este registro en cop.es — para psicólogos en España el registro es con el Colegio Oficial de Psicólogos correspondiente. Javier cuenta con formación especializada en TCC, ACT, TDC y experiencia clínica en centros especializados y clínicas universitarias.",
      },
      {
        question: "¿Con qué situaciones puede ayudar Javier online?",
        answer: "Javier ofrece apoyo psicológico online para: ansiedad (generalizada, social, ataques de pánico, preocupación crónica), estado de ánimo (depresión, distimia), regulación emocional, Trastorno Límite de la Personalidad (TLP), trauma y TEPT, duelo, prevención del suicidio y gestión del riesgo, desarrollo de habilidades de afrontamiento, dificultades en el funcionamiento diario y autoconocimiento.",
      },
      {
        question: "¿Qué es el enfoque transdiagnóstico basado en procesos?",
        answer: "El enfoque transdiagnóstico basado en procesos es un modelo contemporáneo de intervención psicológica que no parte del diagnóstico como eje central, sino de los mecanismos psicológicos específicos que mantienen el malestar — como la evitación experiencial, la fusión cognitiva o los déficits en regulación emocional. Este enfoque permite integrar de forma flexible las terapias con mayor respaldo empírico (TCC, ACT, TDC) y adaptarlas a la persona concreta, en lugar de seguir un protocolo estándar por diagnóstico. En la práctica, significa que Javier puede trabajar eficazmente con personas con diagnósticos diferentes pero mecanismos de mantenimiento similares, o con personas que no encajan en un diagnóstico claro pero sí experimentan malestar real.",
      },
      {
        question: "¿Tiene Javier experiencia específica con el Trastorno Límite de la Personalidad?",
        answer: "Sí. Javier ha participado en el diseño y desarrollo de programas de intervención específicos para el Trastorno Límite de la Personalidad (TLP) — uno de los cuadros más complejos en psicología clínica. El TLP requiere formación especializada en regulación emocional, tolerancia al malestar, gestión del riesgo y habilidades relacionales, todas ellas áreas en las que Javier cuenta con experiencia y formación avanzada, incluyendo la Terapia Dialéctica Conductual (TDC) — el tratamiento de primera línea para el TLP.",
      },
      {
        question: "¿Cómo reservo una sesión con Javier?",
        answer: "Seleccione un horario disponible en esta página para reservar directamente con Javier. El pago se procesa de forma segura al reservar — la sesión queda confirmada una vez completado el pago. Recibirá inmediatamente una invitación al calendario. Las sesiones se realizan por videollamada segura y confidencial en español. Si está experimentando una crisis psicológica o pensamientos de autolesión, llame al 112 o al Teléfono de la Esperanza (717 003 717) — no espere a una cita.",
      },
      {
        question: "¿Cuáles son las cualificaciones de Javier Villarte Betancor?",
        answer: "Javier Villarte Betancor es Psicólogo General Sanitario (nº A014346) con especialización en intervención psicológica con adultos mediante un enfoque transdiagnóstico. Cuenta con formación avanzada en TCC, ACT y TDC, y experiencia en el desarrollo de programas de intervención para el Trastorno Límite de la Personalidad. Ha completado formación específica en trauma, duelo y prevención del suicidio, y ha participado en congresos internacionales de psicología. Desarrolló su práctica clínica en centros especializados y clínicas universitarias.",
      },
    ],
    chamber: "COP",
    registrationUrl: "https://www.cop.es/",
  },
  {
    dbSlug: "dr-leandro-wang",
    fullName: "Dr. Leandro Wang",
    specialty: "Médico General — Flebología y Salud Vascular",
    seoTitle: "Dr. Leandro Wang — Flebología y Medicina General | CGCOM 464628929 | Global Health España",
    seoDescription: "Reserve una videoconsulta con Dr. Leandro Wang — médico colegiado en flebología y salud vascular (CGCOM nº 464628929). Más de 20 años experiencia internacional · Doppler vascular · Medicina capilar · Medicina general · Valencia y Girona. Cita el mismo día.",
    bio: `El Dr. Leandro Wang es médico con más de dos décadas de práctica clínica internacional en flebología, diagnóstico vascular, medicina capilar y medicina general — un clínico con una combinación de especialización vascular y amplitud de formación en medicina general que le permite ofrecer tanto evaluaciones específicas de enfermedades venosas como atención médica integral.

Está colegiado en el Ilustre Colegio Médico de Valencia y es miembro del Capítulo Español de Flebología — el organismo de referencia en España para la especialidad de enfermedades venosas. Cuenta con certificaciones especializadas en Ultrasonido Doppler Vascular Periférico, Flebología y Linfología, Cicatrización de Heridas y Cirugía Mínimamente Invasiva. Su formación de posgrado incluye un Máster en Medicina Estética y especialización en Medicina Capilar.

Su trayectoria internacional es amplia: comenzó su carrera en Argentina, donde ocupó cargos de liderazgo en servicios de urgencias y unidades médicas militares — entornos de alta exigencia clínica que forjan el tipo de capacidad resolutiva que resulta valiosa en cualquier consulta. Posteriormente trabajó como médico de urgencias en Italia antes de establecerse en España, donde actualmente ejerce en clínicas de Valencia y Girona.

El Dr. Wang ofrece a través de Global Health consultas online para orientación, evaluación y planificación en el ámbito de la salud vascular, enfermedades venosas y medicina general — complementando su práctica presencial en clínica.

Qué ofrece online:
• Evaluación de salud vascular — orientación sobre síntomas venosos y circulatorios: varices, hinchazón de piernas, pesadez, calambres, cambios cutáneos en las extremidades
• Enfermedades venosas — evaluación clínica, interpretación de informes Doppler previos y orientación sobre opciones de tratamiento (escleroterapia, láser endovascular, cirugía mínimamente invasiva)
• Linfología — evaluación de linfedema y orientación sobre manejo
• Cicatrización de heridas — evaluación y orientación sobre heridas crónicas o de difícil cicatrización
• Medicina capilar — evaluación de pérdida de cabello, alopecia, orientación sobre tratamientos de restauración capilar
• Consulta estética online — evaluación y planificación previa a procedimientos estéticos (los procedimientos se realizan de forma presencial)
• Medicina general — enfermedades agudas, gestión de enfermedades crónicas (hipertensión, diabetes, dislipemia), salud preventiva
• Segunda opinión — sobre diagnósticos vasculares, informes Doppler o planes de tratamiento
• Orientación para pacientes antes de procedimientos vasculares — preparación y dudas previas a intervenciones programadas

Nota importante: El diagnóstico definitivo de enfermedades venosas requiere exploración física y ecografía Doppler en persona. La consulta online con el Dr. Wang es una evaluación orientativa de alta calidad — especialmente útil para pacientes que quieren entender sus síntomas, preparar una visita presencial o valorar si necesitan un procedimiento vascular.

Su enfoque:
El Dr. Wang combina la precisión técnica de un especialista en diagnóstico vascular con la amplitud clínica de un médico con veinte años de experiencia en urgencias, cirugía y medicina general en tres países. Es reconocido por su atención personalizada, su comunicación clara y su capacidad para resolver problemas tanto en situaciones de urgencia como en consulta externa. Prioriza que el paciente entienda su situación clínica y sus opciones antes de tomar cualquier decisión.

Idiomas: Español`,
    qualifications: ["Médico colegiado — Ilustre Colegio Médico de Valencia", "Miembro — Capítulo Español de Flebología", "Certificación en Ultrasonido Doppler Vascular Periférico", "Certificación en Flebología y Linfología", "Certificación en Cicatrización de Heridas", "Certificación en Cirugía Mínimamente Invasiva (laparoscopia y toracoscopia)", "Formación de posgrado en Medicina Estética y Medicina Capilar", "Experiencia en urgencias y unidades médicas militares — Argentina", "Médico de urgencias — Italia", "Clínicas de Valencia y Girona, España", "Registrado en CGCOM (nº 464628929)"],
    languages: ["Spanish"],
    faqs: [
      {
        question: "¿Está el Dr. Wang registrado en el Consejo General de Colegios Oficiales de Médicos?",
        answer: "Sí. El Dr. Leandro Wang está registrado en el CGCOM con el número 464628929 y es médico colegiado del Ilustre Colegio Médico de Valencia. Puede verificar este registro en cgcom.es. El Dr. Wang es además miembro del Capítulo Español de Flebología y cuenta con más de dos décadas de práctica clínica internacional en flebología, salud vascular y medicina general.",
      },
      {
        question: "¿Qué consultas vasculares y médicas ofrece el Dr. Wang online?",
        answer: "El Dr. Wang ofrece online: evaluación de síntomas venosos y circulatorios (varices, hinchazón, pesadez de piernas, calambres), orientación sobre opciones de tratamiento vascular, interpretación de informes Doppler previos, evaluación de linfedema, orientación sobre cicatrización de heridas crónicas, evaluación de pérdida de cabello y alopecia, consulta estética online, medicina general (enfermedades agudas, crónicas, salud preventiva) y segunda opinión sobre diagnósticos vasculares. Los procedimientos (Doppler, escleroterapia, cirugía) requieren visita presencial.",
      },
      {
        question: "¿Qué es la flebología y cuándo debería consultar a un flebólogo?",
        answer: "La flebología es la especialidad médica que se ocupa del diagnóstico y tratamiento de las enfermedades del sistema venoso — fundamentalmente varices, insuficiencia venosa crónica, trombosis venosa profunda, linfedema y úlceras vasculares. Debería considerar consultar a un flebólogo si tiene piernas hinchadas o pesadas al final del día, calambres nocturnos frecuentes, varices visibles o molestas, cambios en la coloración o textura de la piel en las piernas, o si tiene antecedentes de trombosis venosa. Una consulta online con el Dr. Wang es una forma eficiente de valorar si sus síntomas requieren evaluación presencial urgente, pueden esperar o son manejables con medidas conservadoras.",
      },
      {
        question: "¿Puede el Dr. Wang interpretar un informe Doppler vascular previo?",
        answer: "Sí. El Dr. Wang cuenta con certificación específica en Ultrasonido Doppler Vascular Periférico y puede revisar e interpretar informes Doppler previos como parte de la consulta online. Si comparte el informe antes de la cita, el Dr. Wang podrá explicar los hallazgos, contextualizarlos clínicamente y orientarle sobre los pasos a seguir — incluyendo si necesita un nuevo Doppler o puede iniciar tratamiento con la información disponible.",
      },
      {
        question: "¿Cómo reservo una consulta con el Dr. Wang?",
        answer: "Seleccione un horario disponible en esta página para reservar directamente con el Dr. Wang. El pago se procesa de forma segura al reservar — la consulta queda confirmada una vez completado el pago. Recibirá inmediatamente una invitación al calendario. Las consultas se realizan por videollamada segura en español. Si tiene informes Doppler previos, fotografías de sus piernas o informes médicos relevantes, le recomendamos compartirlos antes de la consulta. Las citas el mismo día suelen estar disponibles.",
      },
      {
        question: "¿Cuáles son las cualificaciones del Dr. Wang?",
        answer: "El Dr. Leandro Wang es médico colegiado del Ilustre Colegio Médico de Valencia y miembro del Capítulo Español de Flebología. Cuenta con certificaciones en Ultrasonido Doppler Vascular Periférico, Flebología y Linfología, Cicatrización de Heridas y Cirugía Mínimamente Invasiva, y formación de posgrado en Medicina Estética y Medicina Capilar. Su trayectoria incluye más de veinte años de práctica clínica internacional en Argentina (urgencias y unidades médicas militares), Italia (urgencias) y España (Valencia y Girona). Está registrado en CGCOM (nº 464628929).",
      },
    ],
  },
  {
    dbSlug: "dr-luz-marina-zuluaga-rios",
    fullName: "Dra. Luz Marina Zuluaga Ríos",
    specialty: "Médica General — Enfermedad Vascular Periférica y Rehabilitación Cardiopulmonar",
    seoTitle: "Dra. Luz Marina Zuluaga — Vascular y Rehabilitación Cardiopulmonar | CGCOM 202009507 | Global Health España",
    seoDescription: "Reserve una videoconsulta con Dra. Luz Marina Zuluaga — especialista en enfermedad vascular periférica y pie diabético (CGCOM nº 202009507). Becaria UCM · Hospital Italiano Buenos Aires · Rehabilitación cardiopulmonar · Heridas complejas. Cita el mismo día.",
    bio: `La Dra. Luz Marina Zuluaga Ríos es médica y cirujana con más de seis años de experiencia clínica especializada en Angiología y Enfermedad Vascular Periférica, Cirugía del Pie Diabético y Rehabilitación Cardiopulmonar — una combinación de especialidades que refleja su capacidad para acompañar al paciente con enfermedades crónicas complejas desde la evaluación vascular hasta la recuperación funcional.

Es becaria en Cirugía del Pie Diabético en la Universidad Complutense de Madrid — centro de referencia internacional en esta especialidad — y especialista en Angiología y Enfermedad Vascular Periférica en el Hospital Italiano de Buenos Aires, una de las instituciones terciarias de mayor complejidad y prestigio de América Latina. Cuenta además con formación avanzada en Ecografía Vascular Clínica y Rehabilitación Cardíaca y Pulmonar, incluyendo experiencia en unidades de cuidados intensivos.

Su práctica clínica se centra en el tratamiento de heridas complejas, el salvamento de extremidades, el manejo de pacientes críticos y la rehabilitación cardiovascular y respiratoria integral. Es docente universitaria a nivel de pregrado y posgrado, participa activamente en proyectos de investigación y publicaciones internacionales, y asiste regularmente a congresos de educación médica continua.

La Dra. Luz Marina es especialmente valiosa para pacientes diabéticos con complicaciones vasculares o en riesgo de pie diabético — una de las principales causas de amputación en España — y para pacientes en proceso de rehabilitación cardiopulmonar que necesitan orientación clínica precisa y seguimiento continuo.

Qué ofrece online:
• Evaluación de enfermedad vascular periférica — orientación sobre síntomas de insuficiencia vascular periférica, dolor en reposo, claudicación intermitente, cambios en extremidades
• Pie diabético — evaluación de riesgo, orientación sobre cuidado preventivo del pie en pacientes diabéticos, interpretación de informes y segunda opinión sobre tratamiento
• Heridas complejas — evaluación online de heridas crónicas o de difícil cicatrización, orientación sobre manejo y derivación
• Rehabilitación cardiopulmonar — orientación sobre programas de rehabilitación cardíaca y pulmonar, seguimiento de pacientes post-infarto, post-cirugía cardíaca o con EPOC/insuficiencia cardíaca
• Angiología — evaluación de síntomas venosos y arteriales, orientación sobre opciones diagnósticas y terapéuticas
• Ecografía vascular — interpretación de informes de ecografía vascular clínica previos
• Enfermedades crónicas y metabólicas — diabetes, hipertensión, dislipemia, EPOC, insuficiencia cardíaca — evaluación y orientación sobre manejo a largo plazo
• Segunda opinión — sobre diagnósticos vasculares, planes de tratamiento o indicaciones quirúrgicas
• Medicina general — enfermedades agudas, salud preventiva y evaluación general

Nota importante: Los procedimientos quirúrgicos, la exploración física vascular y la ecografía Doppler in situ requieren visita presencial. La consulta online con la Dra. Luz Marina ofrece una evaluación clínica de alta calidad para orientación, planificación, segunda opinión y seguimiento — con especial valor para pacientes con enfermedades crónicas que necesitan continuidad asistencial.

Su enfoque:
La Dra. Luz Marina es reconocida por sus sólidas habilidades de comunicación, su capacidad para trabajar en equipos multiculturales y su enfoque compasivo y centrado en el paciente. Su doble perfil — clínica activa e investigadora universitaria — le permite ofrecer una atención fundamentada en la evidencia más reciente y adaptada a la situación individual de cada paciente.

Idiomas: Español`,
    qualifications: ["Becaria en Cirugía del Pie Diabético — Universidad Complutense de Madrid (UCM)", "Especialista en Angiología y Enfermedad Vascular Periférica — Hospital Italiano de Buenos Aires", "Formación avanzada en Ecografía Vascular Clínica", "Formación avanzada en Rehabilitación Cardíaca y Pulmonar", "Experiencia en Unidades de Cuidados Intensivos", "Docente universitaria — pregrado y posgrado", "Investigadora — publicaciones internacionales", "6+ años experiencia clínica en enfermedades cardiovasculares, pulmonares, metabólicas y crónicas complejas", "Registrada en CGCOM (nº 202009507)"],
    languages: ["Spanish"],
    faqs: [
      {
        question: "¿Está la Dra. Zuluaga registrada en el Consejo General de Colegios Oficiales de Médicos?",
        answer: "Sí. La Dra. Luz Marina Zuluaga Ríos está registrada en el CGCOM con el número 202009507. Puede verificar este registro en cgcom.es. La Dra. Zuluaga es becaria en Cirugía del Pie Diabético en la Universidad Complutense de Madrid y especialista en Angiología y Enfermedad Vascular Periférica en el Hospital Italiano de Buenos Aires.",
      },
      {
        question: "¿Qué consultas vasculares y de rehabilitación ofrece la Dra. Zuluaga online?",
        answer: "La Dra. Zuluaga ofrece: evaluación de enfermedad vascular periférica (claudicación, dolor en reposo, cambios en extremidades), evaluación de riesgo de pie diabético y orientación preventiva, heridas complejas y crónicas, rehabilitación cardiopulmonar (orientación y seguimiento post-infarto, post-cirugía cardíaca, EPOC, insuficiencia cardíaca), angiología, interpretación de informes de ecografía vascular, enfermedades crónicas y metabólicas (diabetes, hipertensión, dislipemia, EPOC), segunda opinión vascular y medicina general.",
      },
      {
        question: "¿Qué es el pie diabético y por qué es importante la evaluación precoz?",
        answer: "El pie diabético es una complicación grave de la diabetes mellitus que resulta de la combinación de neuropatía periférica, insuficiencia vascular y mayor susceptibilidad a infecciones — y es una de las principales causas de amputación no traumática en España. La evaluación precoz del riesgo de pie diabético puede prevenir úlceras, infecciones graves y amputaciones. La Dra. Zuluaga es becaria en Cirugía del Pie Diabético en la Universidad Complutense de Madrid — uno de los centros de referencia internacionales en esta patología. Para pacientes diabéticos con cualquier síntoma en los pies — hormigueo, pérdida de sensibilidad, cambios en la piel o heridas que no cicatrizan — una evaluación online es un primer paso valioso para estratificar el riesgo.",
      },
      {
        question: "¿Puede la Dra. Zuluaga orientar sobre rehabilitación cardíaca y pulmonar?",
        answer: "Sí. La Dra. Zuluaga cuenta con formación avanzada en Rehabilitación Cardíaca y Pulmonar, incluyendo experiencia en unidades de cuidados intensivos. Puede orientar online a pacientes en proceso de rehabilitación después de un infarto, una cirugía cardíaca o con diagnóstico de EPOC o insuficiencia cardíaca — incluyendo pautas de actividad física progresiva, manejo de síntomas, seguimiento de parámetros y coordinación con el equipo de rehabilitación presencial.",
      },
      {
        question: "¿Cómo reservo una consulta con la Dra. Zuluaga?",
        answer: "Seleccione un horario disponible en esta página para reservar directamente con la Dra. Zuluaga. El pago se procesa de forma segura al reservar — la consulta queda confirmada una vez completado el pago. Recibirá inmediatamente una invitación al calendario. Las consultas se realizan por videollamada segura en español. Si tiene informes de ecografía vascular, analíticas recientes o informes médicos previos, le recomendamos compartirlos antes de la consulta para una evaluación más precisa. Las citas el mismo día suelen estar disponibles.",
      },
      {
        question: "¿Cuáles son las cualificaciones de la Dra. Zuluaga?",
        answer: "La Dra. Luz Marina Zuluaga Ríos es médica y cirujana con más de seis años de experiencia clínica. Es becaria en Cirugía del Pie Diabético en la Universidad Complutense de Madrid y especialista en Angiología y Enfermedad Vascular Periférica en el Hospital Italiano de Buenos Aires. Cuenta con formación avanzada en Ecografía Vascular Clínica y Rehabilitación Cardíaca y Pulmonar, experiencia en UCI, y ejerce como docente universitaria e investigadora con publicaciones internacionales. Está registrada en CGCOM (nº 202009507).",
      },
    ],
  },
  {
    dbSlug: "dr-maria-fernanda-ocampo-mora",
    fullName: "Dra. María Fernanda Ocampo Mora",
    specialty: "Médica General — Urgencias y Medicina Estética",
    seoTitle: "Dra. María Fernanda Ocampo — Urgencias y Medicina Estética | CGCOM 291409735 | Global Health España",
    seoDescription: "Reserve una videoconsulta con Dra. María Fernanda Ocampo — médica registrada en CGCOM (nº 291409735). Hospital Quirón Málaga y Marbella · UCI · Máster Medicina Estética · Clínica IOX Marbella · Medicina general. Cita el mismo día.",
    bio: `La Dra. María Fernanda Ocampo Mora es médica con amplia experiencia en medicina de urgencias, medicina general y familiar, y medicina estética — una clínica que combina la solidez de quien ha trabajado en hospitales de alta complejidad con la sensibilidad estética y la precisión de quien ha formado a nivel de maestría en medicina estética avanzada.

Se graduó como médica en la Universidad Libre de Cali y ha desarrollado su carrera en entornos hospitalarios de alto nivel en España y Colombia. En España ha trabajado en el Hospital Quirón Málaga y el Hospital Quirón Marbella — dos de los centros hospitalarios privados de mayor prestigio del país — proporcionando atención médica urgente, diagnóstico rápido y atención multidisciplinar en situaciones críticas. En Colombia acumuló años de experiencia en unidades de cuidados intensivos (UCI) y servicios de urgencias, atendiendo pacientes críticos y casos médicos complejos.

Paralelamente a su práctica hospitalaria, la Dra. Ocampo ha desarrollado una trayectoria sólida en medicina estética, con un Máster en Medicina Estética y un Máster en Tratamientos Faciales con formación académica europea certificada. Actualmente ejerce en Clínica IOX Marbella y Clínica Vasari, donde combina procedimientos mínimamente invasivos, tratamientos faciales y corporales y protocolos de tratamiento personalizados con los más altos estándares de seguridad médica.

Su formación en urgencias y UCI le proporciona un criterio clínico de alta fiabilidad — la capacidad de evaluar rápidamente si un síntoma es banal o requiere atención inmediata — que es especialmente valiosa en una consulta online donde la toma de decisiones en tiempo real marca la diferencia.

Qué ofrece online:
• Medicina general — enfermedades agudas (infecciones respiratorias, fiebre, gripe, infecciones urinarias), gestión de enfermedades crónicas (hipertensión, diabetes, dislipemia, hipotiroidismo)
• Urgencias y evaluación de síntomas agudos — evaluación de síntomas que generan duda sobre su urgencia, orientación sobre si requieren atención presencial inmediata
• Salud de la mujer — anticoncepción, problemas hormonales, salud reproductiva, ginecología preventiva
• Salud preventiva — revisiones de salud, consejo sobre estilo de vida, cribados, medicina preventiva
• Consulta estética online — evaluación y planificación personalizada para tratamientos faciales (toxina botulínica, rellenos dérmicos, tratamientos corporales); los procedimientos se realizan de forma presencial
• Revisión de medicación y renovación de recetas
• Bajas médicas e informes médicos
• Derivaciones a especialistas

Nota importante: Los procedimientos estéticos (toxina botulínica, rellenos, tratamientos corporales) requieren cita presencial en clínica. La consulta estética online con la Dra. Ocampo es la evaluación médica y la fase de planificación personalizada que debe preceder a cualquier procedimiento.

Su enfoque:
La Dra. Ocampo combina la precisión clínica de una médica formada en urgencias y UCI con un enfoque preventivo, holístico y empático. Prioriza la seguridad del paciente, la ética profesional y el desarrollo continuo — y cree que la atención médica de calidad no es incompatible con ser cercana y accesible. Es conocida por su profesionalismo, su empatía y su criterio clínico.

Idiomas: Español`,
    qualifications: ["Médica — Universidad Libre de Cali, Colombia", "Máster en Medicina Estética — formación académica europea certificada", "Máster en Tratamientos Faciales — formación académica europea certificada", "Urgencias hospitalarias — Hospital Quirón Málaga y Hospital Quirón Marbella, España", "UCI y Urgencias — Colombia (varios años)", "Médica estética — Clínica IOX Marbella y Clínica Vasari", "Registrada en CGCOM (nº 291409735)"],
    languages: ["Spanish"],
    faqs: [
      {
        question: "¿Está la Dra. Ocampo registrada en el Consejo General de Colegios Oficiales de Médicos?",
        answer: "Sí. La Dra. María Fernanda Ocampo Mora está registrada en el CGCOM con el número 291409735. Puede verificar este registro en cgcom.es. La Dra. Ocampo ha trabajado en el Hospital Quirón Málaga y el Hospital Quirón Marbella, y actualmente ejerce en Clínica IOX Marbella y Clínica Vasari.",
      },
      {
        question: "¿Qué trata la Dra. Ocampo en consulta online?",
        answer: "La Dra. Ocampo ofrece consultas online de medicina general (enfermedades agudas, crónicas, salud preventiva), evaluación de síntomas agudos y orientación sobre urgencias, salud de la mujer (anticoncepción, problemas hormonales, ginecología preventiva), consulta estética online (planificación de tratamientos faciales y corporales — los procedimientos se realizan presencialmente), revisión de medicación y renovación de recetas, bajas médicas e informes y derivaciones a especialistas.",
      },
      {
        question: "¿Qué aporta la experiencia en urgencias y UCI a una consulta de medicina general online?",
        answer: "La formación en urgencias y UCI desarrolla una capacidad específica: evaluar rápidamente la gravedad de un síntoma y decidir con criterio si requiere atención inmediata, puede esperar o puede gestionarse de forma ambulatoria. En una consulta online — donde no hay exploración física — esta habilidad de triage clínico preciso es especialmente valiosa. La Dra. Ocampo ha trabajado en hospitales de urgencias de alta complejidad en España (Hospital Quirón Málaga y Marbella) y en UCIs en Colombia, lo que le proporciona un nivel de confianza clínica que pocos médicos generales online pueden ofrecer.",
      },
      {
        question: "¿Qué es una consulta estética online con la Dra. Ocampo?",
        answer: "La consulta estética online es una evaluación médica estructurada por videollamada para pacientes que consideran tratamientos con toxina botulínica, rellenos dérmicos u otros procedimientos estéticos faciales o corporales. Durante la consulta, la Dra. Ocampo realizará un análisis facial y cutáneo, revisará su historial médico para identificar contraindicaciones, discutirá sus objetivos y elaborará un plan de tratamiento personalizado. Los procedimientos estéticos en sí requieren cita presencial en clínica.",
      },
      {
        question: "¿Cómo reservo una consulta con la Dra. Ocampo?",
        answer: "Seleccione un horario disponible en esta página para reservar directamente con la Dra. Ocampo. El pago se procesa de forma segura al reservar — la consulta queda confirmada una vez completado el pago. Recibirá inmediatamente una invitación al calendario. Las consultas se realizan por videollamada segura en español. Las citas el mismo día suelen estar disponibles.",
      },
      {
        question: "¿Cuáles son las cualificaciones de la Dra. Ocampo?",
        answer: "La Dra. María Fernanda Ocampo Mora es médica por la Universidad Libre de Cali. Titula un Máster en Medicina Estética y un Máster en Tratamientos Faciales con formación académica europea certificada. Ha trabajado en urgencias en el Hospital Quirón Málaga y el Hospital Quirón Marbella, y en UCI y urgencias en Colombia. Actualmente ejerce en Clínica IOX Marbella y Clínica Vasari. Está registrada en CGCOM (nº 291409735).",
      },
    ],
  },
  {
    dbSlug: "dr-romulo-brito",
    fullName: "Dr. Rómulo Andrés Brito González",
    specialty: "Médico de Urgencias y Emergencias",
    seoTitle: "Dr. Rómulo Brito — Urgencias y Emergencias | CGCOM 070711359 | Global Health España",
    seoDescription: "Reserve una videoconsulta con Dr. Rómulo Brito — especialista en urgencias registrado en CGCOM (nº 070711359). Médico Adjunto Hospital Can Misses Ibiza · Máster Urgencias · IA en Salud · 10+ años experiencia internacional. Cita el mismo día.",
    bio: `El Dr. Rómulo Andrés Brito González es especialista en Medicina de Urgencias y Emergencias con más de una década de experiencia clínica internacional en Venezuela, Ecuador, Chile y España — actualmente Médico Adjunto de Urgencias del Hospital Can Misses de Ibiza, donde además contribuye a la formación clínica de residentes de medicina familiar.

Su formación académica es sólida y actual: titula una Maestría en Medicina de Urgencias y Emergencias y certificaciones especializadas en patología vital urgente y emergencias traumatológicas. A esto se suma algo inusual en la medicina clínica convencional: ha completado un curso universitario en IA Generativa y está cursando una Maestría en Aplicaciones de Inteligencia Artificial en Salud — lo que le sitúa en la intersección entre la práctica médica de urgencias y el futuro tecnológico de la medicina.

Su experiencia clínica abarca el manejo de pacientes críticos en servicios de urgencias y Unidades de Cuidados Intensivos (UCI), incluyendo urgencias médico-quirúrgicas, atención pediátrica y situaciones obstétrico-ginecológicas — un espectro clínico amplio que pocos especialistas en urgencias pueden cubrir con igual profundidad. Ha liderado equipos multidisciplinares en entornos de alta presión, donde la toma de decisiones rápida, clara y segura es la norma.

Para un médico que trabaja en urgencias de un hospital isleño como Ibiza — que atiende una población muy diversa, multilingüe y con alto componente de pacientes internacionales en temporada alta — la capacidad de evaluación precisa de cualquier presentación clínica es parte del día a día.

Qué ofrece online:
• Evaluación de síntomas agudos — evaluación clínica de síntomas de aparición reciente y orientación sobre urgencia real vs. no urgencia
• Medicina general — enfermedades agudas (infecciones respiratorias, fiebre, gripe, infecciones urinarias), gestión de enfermedades crónicas (hipertensión, diabetes, asma, EPOC)
• Urgencias médico-quirúrgicas — orientación sobre síntomas que plantean duda entre urgencia médica, quirúrgica o no urgente
• Pediatría — evaluación de síntomas en niños y orientación a padres sobre urgencia real y manejo en casa
• Traumatología menor — orientación sobre lesiones musculoesqueléticas, torceduras, golpes y cuándo requieren imagen
• Situaciones obstétrico-ginecológicas — orientación sobre síntomas en el embarazo, dudas ginecológicas urgentes
• Evaluación de riesgo cardiopulmonar — dolor torácico atípico, palpitaciones, disnea de causa no clara
• Salud preventiva y medicina general — revisiones, estilo de vida, cribados, vacunación
• Bajas médicas e informes médicos
• Derivaciones urgentes y no urgentes

Su enfoque:
El Dr. Brito trae a la consulta online el tipo de pensamiento clínico que se forma en la urgencia real — rápido, estructurado y centrado en la pregunta clave: ¿qué tiene este paciente y qué necesita ahora? Su formación en IA en Salud añade una dimensión adicional: entiende cómo la tecnología está transformando la práctica médica y aplica este conocimiento al diseño de consultas más eficientes, claras y centradas en el paciente. Es reconocido por su liderazgo y su capacidad de comunicación efectiva.

Idiomas: Español`,
    qualifications: ["Médico Adjunto de Urgencias — Hospital Can Misses, Ibiza, España", "Maestría en Medicina de Urgencias y Emergencias", "Maestría en Aplicaciones de IA en Salud — en curso", "Certificación en Patología Vital Urgente y Emergencias Traumatológicas", "Curso universitario en IA Generativa", "Formador de residentes de medicina familiar — Hospital Can Misses", "Experiencia en UCI y urgencias — Venezuela, Ecuador, Chile, España", "Cirujano cualificado con experiencia pediátrica y obstétrico-ginecológica", "Registrado en CGCOM (nº 070711359)"],
    languages: ["Spanish"],
    faqs: [
      {
        question: "¿Está el Dr. Brito registrado en el Consejo General de Colegios Oficiales de Médicos?",
        answer: "Sí. El Dr. Rómulo Andrés Brito González está registrado en el CGCOM con el número 070711359. Puede verificar este registro en cgcom.es. El Dr. Brito es actualmente Médico Adjunto de Urgencias del Hospital Can Misses de Ibiza y cuenta con más de diez años de experiencia clínica internacional en urgencias y UCI en Venezuela, Ecuador, Chile y España.",
      },
      {
        question: "¿Qué ofrece el Dr. Brito en consulta online?",
        answer: "El Dr. Brito ofrece: evaluación de síntomas agudos y orientación sobre urgencia real, medicina general (enfermedades agudas y crónicas), orientación en urgencias médico-quirúrgicas, pediatría (evaluación de síntomas en niños), traumatología menor (torceduras, golpes, lesiones musculoesqueléticas), situaciones obstétrico-ginecológicas, evaluación de riesgo cardiopulmonar (dolor torácico atípico, palpitaciones, disnea), salud preventiva, bajas médicas e informes y derivaciones.",
      },
      {
        question: "¿Qué aporta la especialización en urgencias a una consulta de medicina general online?",
        answer: "La especialización en urgencias desarrolla una capacidad que es directamente aplicable a la telemedicina: el triage clínico preciso — la habilidad de escuchar un síntoma, hacer las preguntas correctas y determinar con criterio si requiere atención presencial inmediata, puede esperar o puede gestionarse de forma remota. El Dr. Brito ha desarrollado esta capacidad durante más de una década en servicios de urgencias en cuatro países y actualmente como Médico Adjunto en el Hospital Can Misses de Ibiza. En una consulta online, donde no hay exploración física, esta habilidad es la más valiosa que puede tener un médico.",
      },
      {
        question: "¿Qué es la formación en IA en Salud y por qué es relevante para el paciente?",
        answer: "El Dr. Brito está cursando una Maestría en Aplicaciones de Inteligencia Artificial en Salud — una especialización académica en cómo la IA puede mejorar el diagnóstico, la gestión clínica y la atención al paciente. Para el paciente, esto se traduce en un médico que entiende las herramientas tecnológicas que están transformando la medicina y puede aplicarlas para mejorar la eficiencia, la precisión y la personalización de la consulta. Es también un médico que evalúa críticamente estas herramientas — sabe qué pueden hacer y qué no, lo que es igual de importante.",
      },
      {
        question: "¿Cómo reservo una consulta con el Dr. Brito?",
        answer: "Seleccione un horario disponible en esta página para reservar directamente con el Dr. Brito. El pago se procesa de forma segura al reservar — la consulta queda confirmada una vez completado el pago. Recibirá inmediatamente una invitación al calendario. Las consultas se realizan por videollamada segura en español. Si está experimentando una emergencia médica — dolor torácico agudo, dificultad para respirar, pérdida de consciencia — llame al 112 inmediatamente.",
      },
      {
        question: "¿Cuáles son las cualificaciones del Dr. Brito?",
        answer: "El Dr. Rómulo Brito González es Médico Adjunto de Urgencias del Hospital Can Misses de Ibiza y formador de residentes de medicina familiar. Titula una Maestría en Medicina de Urgencias y Emergencias y certificaciones en Patología Vital Urgente y Emergencias Traumatológicas. Está cursando una Maestría en Aplicaciones de IA en Salud. Cuenta con más de diez años de experiencia clínica en urgencias y UCI en Venezuela, Ecuador, Chile y España. Está registrado en CGCOM (nº 070711359).",
      },
    ],
  },
  {
    dbSlug: "dr-silvina-irale",
    fullName: "Dra. María Silvina Irale Tunkiewicz",
    specialty: "Médica — Pediatría y Medicina Estética",
    seoTitle: "Dra. Silvina Irale — Pediatría y Medicina Estética | CGCOM 282889392 | Global Health España",
    seoDescription: "Reserve una videoconsulta con Dra. Silvina Irale — médica especialista en pediatría registrada en CGCOM (nº 282889392). 20+ años experiencia pediátrica · Sanatorio de Niños Rosario · Máster Medicina Estética UCM · Español. Cita el mismo día.",
    bio: `La Dra. María Silvina Irale Tunkiewicz es médica especialista en Pediatría con más de veinte años de práctica clínica en atención primaria pediátrica y urgencias pediátricas — una de las pediatras con mayor experiencia acumulada disponibles a través de consulta online en España.

Se graduó en Medicina por la Universidad Nacional de Rosario y completó su residencia en Pediatría en el Sanatorio de Niños de Rosario, donde obtuvo la especialidad en el año 2000 y continuó ejerciendo durante más de dos décadas — proporcionando atención pediátrica continua, gestionando urgencias y actuando como consultora clínica. Trabajó además como médica de urgencias pediátricas en Urgencias SA, donde desarrolló la capacidad de toma de decisiones clínicas rápidas en situaciones agudas pediátricas. Su título médico fue homologado en España en 2025.

En 2024 completó un Máster en Medicina Estética y Antienvejecimiento por la Universidad Complutense de Madrid — ampliando su práctica hacia la medicina estética con la misma rigorosidad clínica que ha definido su trayectoria pediátrica.

Para los padres, la experiencia de veinte años de la Dra. Irale significa algo concreto: ha visto prácticamente todo en pediatría. La fiebre que genera pánico a las 2 de la mañana, el sarpullido que no se sabe cómo clasificar, el desarrollo que parece ir más despacio de lo esperado. Sabe qué necesita atención inmediata y qué puede esperar — y sabe cómo explicárselo a los padres con claridad y sin alarmar innecesariamente.

Qué ofrece online:
• Pediatría general — evaluación de síntomas en lactantes, niños y adolescentes (fiebre, infecciones respiratorias, gastrointestinales, erupciones cutáneas, otitis, faringitis)
• Urgencias pediátricas — evaluación de síntomas agudos y orientación sobre urgencia real, manejo en casa o necesidad de acudir a urgencias
• Desarrollo infantil — consultas sobre crecimiento, desarrollo psicomotor, alimentación y sueño
• Salud del adolescente — seguimiento, salud mental del adolescente, nutrición, acné y preocupaciones propias de la adolescencia
• Vacunación — orientación sobre calendarios vacunales, dudas sobre vacunas y gestión de efectos secundarios
• Atención preventiva pediátrica — revisiones del niño sano, cribados y consejo sobre estilo de vida familiar
• Consulta estética online — evaluación y planificación de tratamientos estéticos (antienvejecimiento, procedimientos faciales, rejuvenecimiento cutáneo); los procedimientos se realizan presencialmente
• Medicina general — enfermedades agudas y crónicas en adultos, salud preventiva

Nota importante: Los procedimientos estéticos requieren cita presencial. La consulta estética online es la evaluación médica y la fase de planificación que debe preceder a cualquier procedimiento.

Su enfoque:
La Dra. Irale es reconocida por su enfoque compasivo, su sólido criterio clínico y su capacidad para comunicar información médica compleja de forma clara y tranquilizadora — una habilidad especialmente valiosa en pediatría, donde quien necesita entender el diagnóstico y el plan es frecuentemente el padre o la madre, no el paciente. Su compromiso con la medicina basada en la evidencia y la atención personalizada define cada consulta.

Idiomas: Español`,
    qualifications: ["Especialista en Pediatría — Sanatorio de Niños de Rosario (especialidad obtenida 2000)", "Máster en Medicina Estética y Antienvejecimiento — Universidad Complutense de Madrid (UCM, 2024)", "Médica de urgencias pediátricas — Urgencias SA, Argentina", "20+ años práctica clínica pediátrica — Sanatorio de Niños de Rosario", "Consultora clínica pediátrica", "Licenciada en Medicina — Universidad Nacional de Rosario, Argentina", "Homologación título médico en España (2025)", "Registrada en CGCOM (nº 282889392)"],
    languages: ["Spanish"],
    faqs: [
      {
        question: "¿Está la Dra. Irale registrada en el Consejo General de Colegios Oficiales de Médicos?",
        answer: "Sí. La Dra. María Silvina Irale Tunkiewicz está registrada en el CGCOM con el número 282889392. Puede verificar este registro en cgcom.es. La Dra. Irale es especialista en Pediatría con más de veinte años de experiencia clínica en el Sanatorio de Niños de Rosario y urgencias pediátricas, con su título médico homologado en España en 2025.",
      },
      {
        question: "¿Qué consultas pediátricas ofrece la Dra. Irale online?",
        answer: "La Dra. Irale ofrece consultas pediátricas online para: evaluación de síntomas en lactantes, niños y adolescentes (fiebre, infecciones respiratorias y gastrointestinales, erupciones, otitis, faringitis), urgencias pediátricas (evaluación aguda y orientación sobre manejo en casa vs. acudir a urgencias), desarrollo infantil (crecimiento, psicomotricidad, alimentación, sueño), salud del adolescente, vacunación, atención preventiva pediátrica (revisiones del niño sano) y consulta estética online para adultos.",
      },
      {
        question: "¿Qué aportan 20 años de experiencia pediátrica a una consulta online?",
        answer: "Dos décadas en pediatría clínica y urgencias pediátricas generan un tipo de conocimiento que no puede adquirirse en los libros: el reconocimiento de patrones — saber cuándo un niño con fiebre de 39° puede manejarse en casa y cuándo necesita atención inmediata, cuándo un sarpullido es banal y cuándo es una señal de alerta, cuándo el desarrollo está dentro de los rangos normales y cuándo merece evaluación. La Dra. Irale ha visto prácticamente todo en pediatría. Para los padres que buscan orientación fiable y tranquilizadora, esta experiencia acumulada es el activo más valioso de una consulta online.",
      },
      {
        question: "¿Puede la Dra. Irale ofrecer también una consulta estética online?",
        answer: "Sí. La Dra. Irale ha completado un Máster en Medicina Estética y Antienvejecimiento por la Universidad Complutense de Madrid (2024) y ofrece consultas estéticas online para adultos que consideran tratamientos de rejuvenecimiento facial o antienvejecimiento. La consulta online incluye evaluación médica, análisis del estado de la piel, identificación de contraindicaciones y elaboración de un plan de tratamiento personalizado. Los procedimientos estéticos se realizan de forma presencial.",
      },
      {
        question: "¿Cómo reservo una consulta con la Dra. Irale?",
        answer: "Seleccione un horario disponible en esta página para reservar directamente con la Dra. Irale. El pago se procesa de forma segura al reservar — la consulta queda confirmada una vez completado el pago. Recibirá inmediatamente una invitación al calendario. Las consultas se realizan por videollamada segura en español. Para consultas pediátricas, le recomendamos tener al niño disponible durante la consulta donde sea posible. Las citas el mismo día suelen estar disponibles.",
      },
      {
        question: "¿Cuáles son las cualificaciones de la Dra. Irale?",
        answer: "La Dra. María Silvina Irale Tunkiewicz es licenciada en Medicina por la Universidad Nacional de Rosario y especialista en Pediatría (Sanatorio de Niños de Rosario, 2000). Ha ejercido más de veinte años en atención pediátrica hospitalaria, urgencias y consulta ambulatoria, incluyendo el Sanatorio de Niños de Rosario y Urgencias SA. En 2024 completó un Máster en Medicina Estética y Antienvejecimiento por la Universidad Complutense de Madrid. Su título médico fue homologado en España en 2025. Está registrada en CGCOM (nº 282889392).",
      },
    ],
  },
  {
    dbSlug: "dr-syed-tahir",
    fullName: "Dr. Syed Tahir",
    specialty: "Médico General — Epidemiología y Salud Global",
    seoTitle: "Dr. Syed Tahir — Médico General | CGCOM 61323 | Global Health España",
    seoDescription: "Reserve una videoconsulta con Dr. Syed Tahir — médico registrado en CGCOM (nº 61323). Máster Epidemiología Utrecht · Investigador LUMC Leiden · Salud global · Medcare Palma de Mallorca · Español, inglés, hindi, urdu y neerlandés. Cita el mismo día.",
    bio: `El Dr. Syed Tahir es médico con una formación académica y una trayectoria investigadora de primer nivel internacional — una combinación inusual de práctica clínica en medicina general, investigación epidemiológica en uno de los centros académicos más prestigiosos de Europa y experiencia en salud global en contextos muy diversos.

Obtuvo su título de Médico (MD) en la Escuela Latinoamericana de Medicina de Cuba y completó una Maestría en Epidemiología en la Universidad de Utrecht (Países Bajos). Posteriormente trabajó como estudiante de doctorado e investigador médico en el Centro Médico de la Universidad de Leiden (LUMC) — uno de los principales centros académicos médicos de Europa — donde dirigió estudios de cohorte sobre riesgo cardiovascular en personas con VIH, interpretó resultados de laboratorio, gestionó redes de investigación internacionales, supervisó estudiantes de medicina y contribuyó a publicaciones científicas de referencia.

Actualmente ejerce como médico en Medcare Medical Care en Palma de Mallorca, donde ofrece consultas de medicina general tanto en entornos clínicos como online, y presta también atención médica en contextos no clínicos — hoteles y parques acuáticos — lo que le proporciona una experiencia única en la evaluación y manejo de incidentes médicos en entornos variados y con perfiles de pacientes muy diversos.

Su trayectoria internacional abarca Cuba, Países Bajos, Pakistán y España. En Pakistán dirigió campamentos de salud maternoinfantil y coordinó programas de inmunización con ONGs — experiencia que refuerza su perspectiva de salud pública y su comprensión de los determinantes sociales de la salud.

El Dr. Tahir consulta en cinco idiomas: español, inglés, hindi, urdu y neerlandés — lo que le convierte en uno de los médicos con mayor accesibilidad lingüística disponibles a través de consulta online en España, especialmente para pacientes de habla hindi o urdu y para la comunidad neerlandesa en España.

Qué trata:
• Medicina general — enfermedades agudas (infecciones respiratorias, fiebre, gripe, infecciones urinarias), gestión de enfermedades crónicas (hipertensión, diabetes, dislipemia, asma, EPOC)
• Salud cardiovascular — evaluación de riesgo, interpretación de resultados, orientación preventiva; con conocimiento profundo de la intersección entre riesgo cardiovascular y enfermedades crónicas como el VIH
• Epidemiología y enfermedades infecciosas — orientación sobre enfermedades infecciosas, brotes, EPI y enfermedades tropicales
• Medicina del viajero y salud tropical — consultas pre-viaje, enfermedades tropicales, profilaxis y consejos por destino
• Salud global y prevención — vacunación, cribados, medicina preventiva, salud maternoinfantil
• Salud pública — orientación sobre determinantes de salud, intervenciones preventivas y gestión de enfermedades crónicas en contexto poblacional
• VIH y enfermedades infecciosas crónicas — evaluación, seguimiento y orientación (con experiencia investigadora específica)
• Segunda opinión — sobre diagnósticos médicos, resultados de laboratorio o planes de tratamiento
• Bajas médicas e informes médicos
• Derivaciones a especialistas

Su enfoque:
El Dr. Tahir combina el pensamiento epidemiológico de un investigador de LUMC — que evalúa el riesgo a nivel de evidencia poblacional — con la práctica clínica directa de un médico que atiende a pacientes en entornos tan distintos como una consulta privada en Mallorca, un hotel o una iniciativa de salud pública en Pakistán. Este conjunto de experiencias le proporciona una perspectiva clínica inusualmente amplia y una comprensión profunda de los contextos en los que las personas realmente viven y enferman.

Idiomas: Español · Inglés · Hindi · Urdu · Neerlandés`,
    qualifications: ["MD — Escuela Latinoamericana de Medicina (ELAM), Cuba", "MSc en Epidemiología — Universidad de Utrecht, Países Bajos", "Investigador médico (PhD) — Centro Médico Universitario de Leiden (LUMC), Países Bajos", "Publicaciones científicas — riesgo cardiovascular en personas con VIH", "Formación avanzada: Salud Global, Medicina Tropical y de Desastres, Prevención y Control de Infecciones", "Médico — Medcare Medical Care, Palma de Mallorca, España", "Experiencia en salud pública con ONGs — Pakistán (salud maternoinfantil, inmunización)", "Registrado en CGCOM (nº 61323)"],
    languages: ["Spanish", "English", "Hindi", "Urdu", "Dutch"],
    faqs: [
      {
        question: "¿Está el Dr. Tahir registrado en el Consejo General de Colegios Oficiales de Médicos?",
        answer: "Sí. El Dr. Syed Tahir está registrado en el CGCOM con el número 61323. Puede verificar este registro en cgcom.es. El Dr. Tahir es médico con MD de la Escuela Latinoamericana de Medicina de Cuba, MSc en Epidemiología por la Universidad de Utrecht y experiencia investigadora en el Centro Médico de la Universidad de Leiden (LUMC). Actualmente ejerce en Medcare Medical Care en Palma de Mallorca.",
      },
      {
        question: "¿Qué trata el Dr. Tahir en consulta online?",
        answer: "El Dr. Tahir ofrece: medicina general (enfermedades agudas y crónicas), evaluación de riesgo cardiovascular, enfermedades infecciosas y epidemiología, medicina del viajero y salud tropical (consultas pre-viaje, enfermedades tropicales, profilaxis), salud global y preventiva (vacunación, cribados, salud maternoinfantil), orientación sobre VIH y enfermedades infecciosas crónicas, segunda opinión sobre diagnósticos o resultados de laboratorio, bajas médicas e informes y derivaciones a especialistas.",
      },
      {
        question: "¿Qué aporta la formación en epidemiología e investigación clínica a la práctica médica online?",
        answer: "La epidemiología y la investigación clínica desarrollan una capacidad específica: evaluar el riesgo de forma sistemática y basada en la evidencia — no solo el riesgo individual de un paciente, sino el riesgo en el contexto de lo que la evidencia científica sabe sobre su condición. El Dr. Tahir dirigió estudios de cohorte sobre riesgo cardiovascular en personas con VIH en el LUMC de Leiden — uno de los principales centros académicos de Europa. En la práctica clínica, esto se traduce en un médico que interpreta los resultados de laboratorio y los signos clínicos con un nivel de profundidad analítica que va más allá de la consulta estándar de medicina general.",
      },
      {
        question: "¿Puede el Dr. Tahir orientar sobre medicina del viajero y enfermedades tropicales?",
        answer: "Sí. El Dr. Tahir cuenta con formación avanzada en Medicina Tropical y de Desastres y Salud Global. Puede orientar sobre profilaxis antipalúdica, vacunación pre-viaje, riesgos sanitarios por destino, prevención de enfermedades tropicales y evaluación de síntomas a la vuelta de un viaje a zona de riesgo. Su experiencia en salud pública en Pakistán y su formación epidemiológica le proporcionan un contexto real sobre enfermedades en países de ingresos bajos y medios.",
      },
      {
        question: "¿Cómo reservo una consulta con el Dr. Tahir?",
        answer: "Seleccione un horario disponible en esta página para reservar directamente con el Dr. Tahir. El pago se procesa de forma segura al reservar — la consulta queda confirmada una vez completado el pago. Recibirá inmediatamente una invitación al calendario. Las consultas se realizan por videollamada segura en español, inglés, hindi, urdu o neerlandés. Las citas el mismo día suelen estar disponibles.",
      },
      {
        question: "¿Cuáles son las cualificaciones del Dr. Tahir?",
        answer: "El Dr. Syed Tahir es MD por la Escuela Latinoamericana de Medicina de Cuba y MSc en Epidemiología por la Universidad de Utrecht. Trabajó como investigador médico en el Centro Médico de la Universidad de Leiden (LUMC), con publicaciones en riesgo cardiovascular y VIH. Cuenta con formación avanzada en Salud Global, Medicina Tropical y Prevención de Infecciones. Ha trabajado con ONGs en programas de salud maternoinfantil en Pakistán. Actualmente ejerce en Medcare Medical Care en Palma de Mallorca. Registrado en CGCOM (nº 61323). Consulta en español, inglés, hindi, urdu y neerlandés.",
      },
    ],
  },
  {
    dbSlug: "dr-tomas-ruiz-palacios",
    fullName: "Tomás Ruiz Palacios",
    specialty: "Psicólogo General Sanitario",
    seoTitle: "Tomás Ruiz Palacios — Psicólogo General Sanitario | Nº MUO5691 | Global Health España",
    seoDescription: "Reserve una sesión con Tomás Ruiz Palacios — Psicólogo General Sanitario (nº MUO5691). TCC y terapia sistémica relacional · Universidad de Murcia · ITFB Bolonia · Adultos hispanohablantes e italianos · Español e italiano. Cita el mismo día.",
    bio: `Tomás Ruiz Palacios es Psicólogo General Sanitario especializado en terapia cognitivo-conductual (TCC) y terapia sistémica relacional — dos enfoques complementarios que le permiten trabajar tanto con los patrones de pensamiento y conducta del individuo como con las dinámicas relacionales y familiares que los mantienen.

Es licenciado en Psicología por la Universidad de Murcia, titular de un Máster en Mediación y Terapia Sistémica Relacional por el ITFB de Bolonia — institución italiana de referencia en terapia sistémica — y de un Máster en Psicología General Sanitaria por la Universidad Internacional de Valencia. Cuenta con más de tres años de experiencia clínica trabajando con adultos en español e italiano.

La terapia sistémica relacional es una especialización que distingue a Tomás de la mayoría de psicólogos que trabajan exclusivamente con modelos cognitivo-conductuales. Este enfoque considera que el malestar psicológico no surge solo dentro del individuo sino también en las relaciones — de pareja, familiares, laborales — y que trabajar estas dinámicas es tan importante como trabajar los pensamientos y conductas. La combinación de TCC y terapia sistémica le permite adaptarse a lo que cada persona necesita en cada momento del proceso terapéutico.

Su práctica se basa en la evaluación psicológica rigurosa, el diagnóstico clínico preciso y el diseño de tratamientos personalizados — siempre guiados por la evidencia científica y orientados al bienestar emocional real y al desarrollo personal sostenido, no solo a la reducción del síntoma inmediato.

Con qué ayuda:
• Ansiedad — ansiedad generalizada, ansiedad social, ataques de pánico, fobias específicas, preocupación crónica
• Depresión y estado de ánimo — tristeza persistente, apatía, pérdida de motivación, baja autoestima
• Estrés y burnout — estrés laboral, agotamiento emocional, dificultad para desconectar
• Dificultades relacionales — conflictos de pareja, dinámicas familiares, comunicación y límites
• Duelo y pérdida — pérdida de un ser querido, duelos vitales o relacionales no resueltos
• Regulación emocional — dificultad para manejar emociones intensas, reactividad emocional
• Autoestima y desarrollo personal — inseguridad, autocrítica, patrones que se repiten
• Transiciones vitales — cambios de vida importantes, adaptación a nuevas circunstancias
• Habilidades sociales y asertividad — comunicación, límites, relaciones interpersonales

Enfoques terapéuticos:
• Terapia Cognitivo-Conductual (TCC) — identificación y modificación de pensamientos y conductas disfuncionales
• Terapia Sistémica Relacional — abordaje de dinámicas relacionales y familiares que mantienen el malestar
• Mediación — resolución de conflictos en contextos relacionales
• Evaluación psicológica y diagnóstico clínico

Su enfoque:
Tomás trabaja con un estilo cercano, estructurado y orientado al cambio real. Cree que la terapia efectiva combina el rigor científico con una relación terapéutica genuina — y que el paciente debe sentirse comprendido, no juzgado, para que el trabajo terapéutico sea posible. Cada tratamiento está diseñado específicamente para la persona, no adaptado a un protocolo genérico.

Nota importante: Si está experimentando una crisis psicológica o pensamientos de autolesión, contacte con los servicios de emergencias llamando al 112 o con el Teléfono de la Esperanza (717 003 717) — no espere a una cita.

Idiomas: Español · Italiano`,
    qualifications: ["Psicólogo General Sanitario — nº MUO5691", "Máster en Psicología General Sanitaria — Universidad Internacional de Valencia", "Máster en Mediación y Terapia Sistémica Relacional — ITFB, Bolonia, Italia", "Licenciado en Psicología — Universidad de Murcia", "3+ años experiencia clínica con adultos hispanohablantes e italianos"],
    languages: ["Spanish", "Italian"],
    faqs: [
      {
        question: "¿Está Tomás Ruiz Palacios registrado como Psicólogo General Sanitario en España?",
        answer: "Sí. Tomás Ruiz Palacios ejerce como Psicólogo General Sanitario registrado en el COP con número de registro MUO5691. Puede verificar este registro en cop.es — para psicólogos en España el registro es con el Colegio Oficial de Psicólogos correspondiente. Tomás es licenciado en Psicología por la Universidad de Murcia, con másteres en Terapia Sistémica Relacional (ITFB Bolonia) y en Psicología General Sanitaria (UIV).",
      },
      {
        question: "¿Con qué situaciones puede ayudar Tomás online?",
        answer: "Tomás ofrece apoyo psicológico online para: ansiedad (generalizada, social, pánico, fobias), depresión y estado de ánimo bajo, estrés y burnout, dificultades relacionales (conflictos de pareja, dinámicas familiares, comunicación), duelo y pérdida, regulación emocional, autoestima y desarrollo personal, transiciones vitales y habilidades sociales y asertividad.",
      },
      {
        question: "¿Qué es la terapia sistémica relacional y en qué se diferencia de la TCC?",
        answer: "La Terapia Cognitivo-Conductual (TCC) trabaja los pensamientos, emociones y conductas del individuo — identificando patrones disfuncionales y desarrollando alternativas más adaptativas. La terapia sistémica relacional parte de una perspectiva diferente: considera que el malestar psicológico no surge solo dentro del individuo sino también en sus relaciones — de pareja, familiares, sociales, laborales — y trabaja estas dinámicas directamente. Tomás combina ambos enfoques, lo que le permite adaptarse a lo que cada persona necesita: a veces el trabajo individual es central, a veces el foco está en las relaciones que mantienen el malestar, y frecuentemente ambas dimensiones son necesarias.",
      },
      {
        question: "¿Puede Tomás atender a pacientes en italiano?",
        answer: "Sí. Tomás realizó su formación en Terapia Sistémica Relacional en el ITFB de Bolonia (Italia) y ofrece sesiones en italiano para pacientes italianos o de habla italiana. Para italianos que viven en España y buscan apoyo psicológico en su idioma nativo — sin las limitaciones de comunicar estados emocionales complejos en una segunda lengua — Tomás ofrece una accesibilidad psicológica que raramente está disponible a través de telemedicina en España.",
      },
      {
        question: "¿Cómo reservo una sesión con Tomás?",
        answer: "Seleccione un horario disponible en esta página para reservar directamente con Tomás. El pago se procesa de forma segura al reservar — la sesión queda confirmada una vez completado el pago. Recibirá inmediatamente una invitación al calendario. Las sesiones se realizan por videollamada segura y confidencial en español o italiano. Si está experimentando una crisis psicológica o pensamientos de autolesión, llame al 112 o al Teléfono de la Esperanza (717 003 717) — no espere a una cita.",
      },
      {
        question: "¿Cuáles son las cualificaciones de Tomás Ruiz Palacios?",
        answer: "Tomás Ruiz Palacios es licenciado en Psicología por la Universidad de Murcia, titular de un Máster en Mediación y Terapia Sistémica Relacional por el ITFB de Bolonia y de un Máster en Psicología General Sanitaria por la Universidad Internacional de Valencia. Cuenta con más de tres años de experiencia clínica con adultos hispanohablantes e italianos, especializado en TCC y terapia sistémica relacional.",
      },
    ],
    chamber: "COP",
    registrationUrl: "https://www.cop.es/",
  },
];
