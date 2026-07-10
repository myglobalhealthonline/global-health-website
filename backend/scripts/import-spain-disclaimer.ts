/**
 * Create the Spain Clinical & Liability Disclaimer (CountryLegalDocument,
 * MEDICAL_DISCLAIMER, locale "es") from GlobalHealth_Disclaimer_Spain.
 * Served at /spain/es/legal. Idempotent upsert.
 *
 * REGULATORY HOLD: the source document flags that Spain's AEPD (data
 * protection authority) processing-activity registration is still pending —
 * "NO publicar esta página en producción hasta que el registro AEPD esté
 * confirmado." This script therefore writes the row with isPublished: false.
 * Do not flip it to published until AEPD registration is confirmed and the
 * registration number is added to section 13.
 *
 *   node --env-file=.env --import tsx scripts/import-spain-disclaimer.ts          # dry-run
 *   node --env-file=.env --import tsx scripts/import-spain-disclaimer.ts --apply
 */
import { LegalDocumentType } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const COUNTRY_CODE = "es";
const LOCALE = "es";
const APPLY = process.argv.includes("--apply");

const DISCLAIMER_TITLE = "Declaración Clínica y de Responsabilidad";

const DISCLAIMER_HTML = [
  "<p>Esta Declaración Clínica y de Responsabilidad rige todos los servicios clínicos facilitados a través de la plataforma Global Health en España, accesible en myglobalhealth.online. Al reservar una consulta o utilizar cualquier servicio clínico a través de esta plataforma, el usuario reconoce que ha leído, comprendido y aceptado los términos establecidos en este documento.</p>",
  "<p>Este documento se aplica a todos los servicios facilitados en España. Se aplican declaraciones propias a los servicios facilitados en otros mercados — Irlanda, Portugal, República Checa, Rumanía y Brasil — disponibles en las páginas respectivas de cada país de esta plataforma.</p>",
  "<p><em>Última actualización: Julio 2026</em></p>",

  "<h2>⚠ Urgencia médica — Leer primero</h2>",
  "<p><strong>Las videoconsultas NO son adecuadas para urgencias médicas.</strong></p>",
  "<p>Si usted o alguien a su lado experimenta una urgencia médica — incluyendo dolor torácico, dificultad respiratoria, síntomas de ictus, pérdida de consciencia, reacción alérgica grave o cualquier situación que ponga en riesgo la vida — no reserve una consulta online.</p>",
  '<p><strong>Llame al <a href="tel:112">112</a> inmediatamente, o acuda al servicio de urgencias más cercano.</strong></p>',
  "<p>Recursos de salud mental en crisis:</p>",
  "<ul>" +
    '<li>Teléfono de atención a la conducta suicida — <a href="tel:024">024</a> (gratuito, 24 horas)</li>' +
    '<li>Teléfono de la Esperanza — <a href="tel:717003717">717 003 717</a> (24 horas, 7 días)</li>' +
    '<li>Emergencias — <a href="tel:112">112</a></li>' +
    "</ul>",

  "<h2>1. Naturaleza de la plataforma y modelo de responsabilidad</h2>",
  "<p><strong>1.1 Global Health como plataforma de intermediación.</strong> myglobalhealth.online actúa como plataforma de intermediación digital que conecta a pacientes con profesionales sanitarios independientes colegiados en España. Global Health no presta directamente servicios sanitarios. Los servicios médicos y sanitarios son prestados por los profesionales sanitarios independientes que operan a través de la plataforma, cada uno bajo su propio número de colegiación y su propia responsabilidad civil profesional.</p>",
  "<p>Este modelo se encuadra en el Reglamento (UE) 2022/2065 de Servicios Digitales (DSA) como plataforma de intermediación, y en la Ley 34/2002, de 11 de julio, de servicios de la sociedad de la información y de comercio electrónico (LSSICE).</p>",
  "<p><strong>1.2 Responsabilidades de Global Health como plataforma.</strong> Global Health es responsable de:</p>",
  "<ul>" +
    "<li>La verificación de la colegiación de todos los profesionales antes de autorizar su operación en la plataforma — consultando el registro de la Organización Médica Colegial (OMC) o del Colegio Oficial de Psicólogos (COP) correspondiente</li>" +
    "<li>El funcionamiento técnico de la plataforma — incluyendo la seguridad de las videollamadas, el cifrado de datos y la integridad del sistema de documentación clínica</li>" +
    "<li>La gestión del sistema de receta privada electrónica homologado por la OMC y conectado a Nodofarma</li>" +
    "<li>El tratamiento de datos personales conforme al RGPD (UE 2016/679) y la LOPDGDD (Ley Orgánica 3/2018)</li>" +
    "<li>La facturación y gestión administrativa del servicio</li>" +
    "</ul>",
  "<p><strong>1.3 Responsabilidades de los profesionales sanitarios independientes.</strong> Cada profesional sanitario que opera a través de la plataforma es individualmente responsable de:</p>",
  "<ul>" +
    "<li>El acto médico o sanitario prestado — incluyendo la evaluación clínica, el diagnóstico diferencial, las recomendaciones clínicas y la documentación emitida</li>" +
    "<li>El cumplimiento de su código deontológico profesional y de la normativa sanitaria aplicable a su especialidad</li>" +
    "<li>El mantenimiento de su seguro de responsabilidad civil profesional</li>" +
    "<li>El mantenimiento de su colegiación activa en la OMC o en el COP correspondiente</li>" +
    "</ul>",
  "<p>Global Health NO es responsable de los actos médicos individuales prestados por los profesionales independientes que operan a través de la plataforma. La relación clínica se establece directamente entre el paciente y el profesional sanitario.</p>",

  "<h2>2. Marco legal aplicable — España</h2>",
  "<p><strong>Telemedicina y acto médico</strong></p>",
  "<ul>" +
    "<li>Ley 41/2002, de 14 de noviembre, básica reguladora de la autonomía del paciente y de derechos y obligaciones en materia de información y documentación clínica</li>" +
    "<li>Ley 44/2003, de 21 de noviembre, de ordenación de las profesiones sanitarias</li>" +
    "<li>Real Decreto 1718/2010, de 17 de diciembre, sobre receta médica y órdenes de dispensación (receta médica privada electrónica)</li>" +
    "<li>UNE 179011:2023 — Requisitos para la prestación de servicios de teleconsulta sanitaria</li>" +
    "<li>UNE-EN ISO 13131 — Planificación de la calidad en servicios de telesalud</li>" +
    "</ul>",
  "<p><strong>Protección de datos</strong></p>",
  "<ul>" +
    "<li>Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo (RGPD)</li>" +
    "<li>Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD)</li>" +
    "<li>Ley 34/2002 de servicios de la sociedad de la información (LSSICE)</li>" +
    "<li>Reglamento (UE) 2022/2065 de Servicios Digitales (DSA)</li>" +
    "</ul>",
  "<p><strong>Normativa específica aplicada en este documento</strong></p>",
  "<ul>" +
    "<li>Salud reproductiva — Ley Orgánica 2/2010, de 3 de marzo</li>" +
    "<li>Protección del menor — Ley Orgánica 1/1996, de 15 de enero (en su redacción vigente)</li>" +
    "<li>Internamiento psiquiátrico involuntario — Artículo 763 de la Ley 1/2000, de 7 de enero, de Enjuiciamiento Civil</li>" +
    "<li>Psicología clínica — Código Deontológico del Psicólogo (Consejo General de la Psicología de España)</li>" +
    "<li>Deshabituación tabáquica — Financiación ministerial aprobada junio 2024 (Ministerio de Sanidad)</li>" +
    "</ul>",

  "<h2>3. Declaración general — Todos los servicios</h2>",
  "<p>Todos los servicios clínicos facilitados a través de Global Health para el mercado de España se realizan en conformidad con la normativa española de telemedicina y práctica médica, por profesionales sanitarios independientes colegiados en el organismo regulador correspondiente.</p>",
  "<p>Las evaluaciones clínicas realizadas a través de esta plataforma son evaluaciones a distancia. Se realizan con los mismos estándares profesionales que la atención presencial, pero tienen limitaciones inherentes — la exploración física, determinados procedimientos diagnósticos y las intervenciones urgentes no pueden prestarse de forma remota. El profesional clínico informa al paciente de forma clara e inmediata si su presentación requiere evaluación presencial.</p>",
  "<p>Ningún resultado clínico — incluyendo la emisión de receta privada electrónica, derivación, informe médico o cualquier otra documentación clínica — puede confirmarse ni garantizarse antes de la evaluación clínica completa.</p>",
  "<p>Todas las decisiones clínicas son exclusivamente a discreción profesional del médico o profesional sanitario independiente tras evaluación completa.</p>",

  "<h2>4. Servicios de medicina general — Médico de cabecera</h2>",
  "<p>Las consultas de medicina general facilitadas a través de esta plataforma son realizadas por médicos de cabecera independientes colegiados conforme a los requisitos de la Organización Médica Colegial (OMC). El número de colegiado de cada médico es visible en su perfil y verificable en el registro público de la OMC.</p>",
  "<p><strong>Alcance y limitaciones — Medicina general</strong></p>",
  "<ul>" +
    "<li>La exploración física no puede realizarse a distancia. El médico evalúa al paciente a través de la historia clínica y la observación visual durante la videollamada. Cuando la exploración física es clínicamente necesaria, el médico asesora sobre la evaluación presencial apropiada</li>" +
    "<li>Determinadas investigaciones complementarias — incluyendo analíticas de sangre, pruebas de imagen y ECG — requieren presencialidad. El médico puede valorar la necesidad de estas pruebas y coordinar las solicitudes correspondientes</li>" +
    "<li>Los médicos no prescriben de forma rutinaria estupefacientes ni determinadas sustancias de control especial a través de videoconsultas. El médico informa al paciente si su medicación cae en esta categoría</li>" +
    "<li>Las decisiones clínicas — incluyendo la emisión de receta privada electrónica, derivaciones, certificados médicos y cualquier otra documentación clínica — son tomadas exclusivamente a discreción profesional del médico tras evaluación completa</li>" +
    "</ul>",
  "<p><strong>Receta médica privada electrónica — Nodofarma.</strong> Las recetas médicas privadas emitidas por los médicos a través de esta plataforma están reguladas por el Real Decreto 1718/2010 y el sistema de receta privada electrónica homologado por la OMC, conectado a través de Nodofarma a las farmacias del territorio nacional.</p>",
  "<ul>" +
    "<li>Validez general de 10 días naturales para la primera dispensación; hasta 6 meses en tratamientos crónicos con dispensaciones programadas</li>" +
    "<li>El paciente paga el 100% del precio del medicamento en farmacia — la receta privada no está financiada por el Sistema Nacional de Salud</li>" +
    "<li>Los estupefacientes, las benzodiacepinas y determinados medicamentos de control especial tienen requisitos de prescripción específicos en España y no pueden emitirse electrónicamente. El médico informa al paciente si su medicación cae en esta categoría</li>" +
    "<li>Ninguna prescripción puede confirmarse antes de la evaluación clínica completa</li>" +
    "</ul>",
  "<p><strong>Lo que este servicio no puede proporcionar</strong></p>",
  "<ul>" +
    "<li>Derivaciones del Sistema Nacional de Salud — requieren médico contratado con el sistema público</li>" +
    "<li>Partes de baja del SNS (Incapacidad Temporal) — los partes de baja oficiales requieren médico contratado con el SNS</li>" +
    "<li>Vacunación — la administración física de vacunas requiere presencialidad en un centro sanitario autorizado</li>" +
    "<li>Vacunación contra la fiebre amarilla y Certificado Internacional de Vacunación — requiere presencialidad en centro autorizado por la Dirección General de Salud Pública</li>" +
    "<li>Atención de urgencias — para cualquier urgencia médica llame al 112 inmediatamente</li>" +
    "<li>Intervenciones quirúrgicas o procedimientos invasivos — requieren presencialidad hospitalaria</li>" +
    "</ul>",

  "<h2>5. Servicios de medicina especialista</h2>",
  "<p>Las consultas con médicos especialistas facilitadas a través de esta plataforma son realizadas por médicos especialistas independientes colegiados conforme a los requisitos de la Organización Médica Colegial (OMC) y su colegio de especialidad correspondiente, con formación MIR en la especialidad correspondiente.</p>",
  "<p><strong>5.1 Dermatología especialista.</strong> La evaluación dermatológica a través de análisis de imagen de alta resolución permite una valoración especializada de alta calidad — no sustituye a la dermatoscopia presencial de contacto ni a la biopsia para el diagnóstico definitivo de lesiones sospechosas de malignidad. Donde la sospecha clínica es significativa, el dermatólogo coordina derivación presencial urgente el mismo día. Las recomendaciones de tratamiento son exclusivamente a criterio del especialista tras evaluación completa. Ningún tratamiento puede confirmarse antes de la consulta.</p>",
  "<p><strong>5.2 Psiquiatría especialista.</strong> Los psiquiatras que operan a través de esta plataforma son médicos especialistas con formación MIR en psiquiatría, colegiados en la OMC y su colegio de especialidad correspondiente. Las benzodiacepinas y determinados medicamentos psiquiátricos son medicamentos de control especial en España con requisitos de prescripción específicos. El internamiento psiquiátrico involuntario está regulado por el artículo 763 de la Ley de Enjuiciamiento Civil y requiere autorización judicial — no puede iniciarse ni coordinarse a través de este servicio. Los episodios psicóticos agudos requieren valoración presencial urgente. Este servicio no es un servicio de intervención en crisis — si el paciente está en crisis, llamar al 024 o al 112 inmediatamente.</p>",
  "<p><strong>5.3 Psicología clínica.</strong> Los psicólogos clínicos que operan a través de esta plataforma están colegiados en el Colegio Oficial de Psicólogos (COP) correspondiente a su comunidad autónoma — NO en la OMC. Los psicólogos clínicos NO son médicos y NO prescriben medicación en España. Este servicio proporciona psicoterapia e intervención psicológica estructurada — no es un servicio de prescripción farmacológica. La confidencialidad está protegida conforme al Código Deontológico del Psicólogo y el RGPD. Este servicio no es un servicio de intervención en crisis — si el paciente está en crisis, llamar al 024 o al 112 inmediatamente.</p>",
  "<p><strong>5.4 Cardiología especialista.</strong> La interpretación de ECG, ecocardiograma y Holter a través de análisis de imagen y documentos clínicos es una práctica establecida en telecardología. Este servicio proporciona evaluación cardiológica especializada de presentaciones no urgentes — no sustituye la atención de urgencias para síntomas cardiológicos agudos. La cardiología de intervención — cateterismos, implantación de marcapasos o desfibriladores, ablación, cirugía cardíaca — requiere valoración presencial hospitalaria y está fuera del alcance de este servicio. Para cualquier síntoma cardiológico agudo llamar al 112 inmediatamente.</p>",
  "<p><strong>5.5 Neurología especialista.</strong> La interpretación de RMN cerebral y medular, TAC, EEG y electromiograma a través de informes clínicos es una práctica establecida en teleneurología. Determinados elementos de la exploración neurológica requieren presencialidad. La realización de EEG, electromiograma, potenciales evocados y punción lumbar requiere presencialidad y está fuera del alcance de este servicio. Para síntomas neurológicos agudos — cefalea en trueno, focalidad neurológica, crisis epiléptica, pérdida de consciencia — llamar al 112 inmediatamente.</p>",
  "<p><strong>5.6 Pediatría especialista.</strong> Los pediatras especialistas que operan a través de esta plataforma son médicos especialistas con formación MIR en Pediatría, colegiados en la OMC y su colegio de especialidad correspondiente. Debe estar presente un padre, madre o tutor legal durante todas las consultas para menores de 16 años. Para adolescentes de 16 años o más, el pediatra evalúa la capacidad de consentir individualmente — concepto de 'menor maduro'. La fiebre en lactantes menores de 3 meses requiere evaluación presencial urgente inmediata. Los pediatras están sujetos a la obligación de comunicar situaciones de posible desamparo o maltrato al menor conforme a la Ley Orgánica 1/1996 — esta obligación prevalece sobre la confidencialidad.</p>",

  "<h2>6. Salud mental — Declaración específica</h2>",
  "<p>Los servicios de salud mental facilitados a través de esta plataforma — tanto a nivel de medicina general como de psiquiatría especialista y psicología clínica — incluyen las siguientes declaraciones específicas:</p>",
  "<ul>" +
    "<li>Este servicio proporciona evaluación de salud mental — no es un servicio de intervención en crisis, consejería ni psicoterapia a nivel de medicina general</li>" +
    "<li>Este servicio no es adecuado para situaciones de crisis activa de suicidio o autolesión</li>" +
    "<li>El internamiento psiquiátrico involuntario está regulado por el artículo 763 de la Ley de Enjuiciamiento Civil y requiere autorización judicial — no puede iniciarse a través de este servicio</li>" +
    "<li>La confidencialidad puede verse limitada cuando existe un riesgo grave e inmediato para la vida o seguridad del paciente o de terceros — el profesional discute la confidencialidad al inicio de la consulta</li>" +
    "<li>Los datos de salud mental tienen protección reforzada como categoría especial de datos bajo el RGPD</li>" +
    "</ul>",
  "<p><strong>Crisis de salud mental — Recursos inmediatos:</strong></p>",
  "<ul>" +
    '<li>Teléfono de atención a la conducta suicida — <a href="tel:024">024</a> (gratuito, 24 horas, 365 días)</li>' +
    '<li>Teléfono de la Esperanza — <a href="tel:717003717">717 003 717</a> (24 horas, 7 días)</li>' +
    '<li>Emergencias — <a href="tel:112">112</a></li>' +
    "</ul>",

  "<h2>7. Salud femenina — Declaración específica</h2>",
  "<ul>" +
    "<li>La interrupción voluntaria del embarazo (IVE) requiere atención presencial en un centro médico autorizado conforme a la Ley Orgánica 2/2010. No puede gestionarse ni coordinarse a través de este servicio</li>" +
    "<li>La anticoncepción hormonal y la THS pueden ser evaluadas e iniciadas a nivel de medicina general donde sea clínicamente apropiado. Todas las recomendaciones son a discreción exclusiva del médico tras evaluación completa</li>" +
    "<li>La migraña con aura en mujeres que toman anticonceptivos hormonales requiere evaluación específica por las implicaciones de riesgo cardiovascular</li>" +
    "</ul>",

  "<h2>8. Medicina de viaje — Declaración específica</h2>",
  "<ul>" +
    "<li>Este servicio proporciona evaluación clínica de salud de viaje y planificación de vacunación individualizada — no incluye la administración física de vacunas</li>" +
    "<li>La vacunación contra la fiebre amarilla y el Certificado Internacional de Vacunación deben administrarse y emitirse presencialmente en un centro de vacunación autorizado por la Dirección General de Salud Pública correspondiente</li>" +
    "<li>Las recomendaciones de salud de viaje son específicas para el destino y pueden variar — los pacientes deben confirmar los requisitos de entrada vigentes con la embajada o consulado del país de destino antes del viaje</li>" +
    "</ul>",

  "<h2>9. Deshabituación tabáquica — Declaración específica</h2>",
  "<ul>" +
    "<li>Los resultados de los programas de deshabituación tabáquica varían entre individuos y no están garantizados</li>" +
    "<li>Desde junio de 2024, el Ministerio de Sanidad financia determinados medicamentos para la deshabituación tabáquica (vareniclina, bupropión, citisina, citisiniclina) para pacientes que cumplan criterios clínicos específicos. La financiación a través del sistema público requiere prescripción a través de un médico del SNS; el médico de Global Health informa durante la consulta si el paciente podría cumplir los criterios</li>" +
    "<li>Las opciones de tratamiento farmacológico tienen diferentes perfiles de eficacia, tolerabilidad y contraindicaciones. Ningún tratamiento puede confirmarse antes de la evaluación clínica completa</li>" +
    "<li>El tratamiento farmacológico durante el embarazo o la lactancia requiere evaluación específica</li>" +
    "</ul>",

  "<h2>10. Consulta de piel y caída del cabello — Declaración específica</h2>",
  "<ul>" +
    "<li>La evaluación dermatológica a través de análisis de imagen de alta resolución tiene limitaciones inherentes. Las condiciones que requieren dermatoscopia de contacto, biopsia, pruebas epicutáneas o exploración especializada presencial no pueden evaluarse plenamente de forma remota</li>" +
    "<li>El diagnóstico definitivo de cáncer de piel requiere dermatoscopia presencial y biopsia — donde la sospecha clínica es significativa, el médico o dermatólogo coordina derivación presencial urgente el mismo día</li>" +
    "<li>Los resultados del tratamiento de la caída del cabello varían entre individuos y no pueden garantizarse</li>" +
    "<li>La alopecia cicatricial requiere evaluación dermatológica presencial urgente con posible biopsia</li>" +
    "</ul>",

  "<h2>11. Derivaciones y solicitud de pruebas — Declaración específica</h2>",
  "<ul>" +
    "<li>Este servicio proporciona derivaciones a especialistas privados y solicitudes de pruebas para realización en centros privados — no proporciona derivaciones del Sistema Nacional de Salud, que requieren médico contratado con el SNS</li>" +
    "<li>Global Health no garantiza citas con especialistas, disponibilidad de laboratorios ni disponibilidad de pruebas de imagen</li>" +
    "<li>La documentación clínica se emite exclusivamente a criterio del profesional sanitario tras evaluación clínica completa</li>" +
    "</ul>",

  "<h2>12. Menores de edad — Declaración específica</h2>",
  "<p>Las consultas que involucren a menores de edad se rigen por la Ley Orgánica 1/1996 de Protección Jurídica del Menor y la Ley 41/2002 de autonomía del paciente:</p>",
  "<ul>" +
    "<li>Para menores de 16 años: se requiere la presencia y el consentimiento del padre, madre o tutor legal durante toda la consulta</li>" +
    "<li>Para mayores de 16 años: el profesional evalúa la capacidad de consentir individualmente conforme al concepto de 'menor maduro'</li>" +
    "<li>Los profesionales clínicos de Global Health están sujetos a la obligación legal de comunicar situaciones de posible desamparo o maltrato al menor conforme a la Ley Orgánica 1/1996 — esta obligación prevalece sobre la confidencialidad y puede implicar la comunicación a los Servicios de Protección de Menores de la Comunidad Autónoma competente</li>" +
    "<li>La fiebre en lactantes menores de 3 meses es una emergencia médica que requiere evaluación presencial urgente inmediata — no es adecuada para videoconsulta bajo ninguna circunstancia</li>" +
    "</ul>",

  "<h2>13. Protección de datos y confidencialidad</h2>",
  "<p>Todos los datos personales de pacientes recogidos a través de esta plataforma son procesados por Global Guest s.r.o. (IČO: 19071680) en su condición de responsable del tratamiento, en conformidad con el Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD).</p>",
  "<ul>" +
    "<li>Los datos de salud son datos de categoría especial bajo el artículo 9 del RGPD y requieren consentimiento explícito del paciente para su tratamiento</li>" +
    "<li>Los datos de salud mental tienen protección reforzada adicional como categoría especial</li>" +
    "<li>Todas las consultas se realizan a través de videollamada con cifrado extremo a extremo. Los registros clínicos se almacenan de forma segura</li>" +
    "<li>La información del paciente no se comparte con terceros sin consentimiento explícito del paciente, excepto cuando lo exija la ley</li>" +
    '<li>El paciente tiene derecho a acceder, rectificar y solicitar la supresión de sus datos personales. Las solicitudes pueden dirigirse a: <a href="mailto:dpo@myglobalhealth.online">dpo@myglobalhealth.online</a></li>' +
    '<li>El Delegado de Protección de Datos (DPO) es Dr. Ahmed Maklad — <a href="mailto:dpo@myglobalhealth.online">dpo@myglobalhealth.online</a></li>' +
    "</ul>",

  "<h2>14. Verificación de profesionales y registro regulatorio</h2>",
  "<p>Los siguientes organismos reguladores aplican a los profesionales que operan a través de Global Health en España:</p>",
  "<ul>" +
    '<li>Médicos de cabecera y especialistas — colegiados en la OMC. Verificable en <a href="https://colegiomedicos.es">colegiomedicos.es</a></li>' +
    '<li>Psicólogos clínicos — colegiados en el Colegio Oficial de Psicólogos (COP) de su comunidad autónoma</li>' +
    "<li>Receta privada electrónica — sistema Nodofarma homologado por la OMC. Real Decreto 1718/2010</li>" +
    "<li>Telemedicina — regulada por la Ley 41/2002, el Real Decreto 1718/2010 y la UNE 179011:2023</li>" +
    '<li>Protección de datos — supervisada por la AEPD. Verificable en <a href="https://aepd.es">aepd.es</a> (registro pendiente — ver sección 13)</li>' +
    "</ul>",
  "<p>La entidad legal que opera Global Health en España es Global Guest s.r.o. (IČO: 19071680), constituida en la República Checa, prestando servicios de plataforma de intermediación telemédica conforme a la normativa española y europea aplicable, y también en Irlanda, Portugal, República Checa, Rumanía y Brasil.</p>",

  "<h2>15. Limitación de responsabilidad</h2>",
  "<ul>" +
    "<li>Global Health no es responsable de los actos médicos individuales prestados por los profesionales independientes que operan a través de la plataforma, donde esos profesionales actúan bajo su propia responsabilidad civil profesional</li>" +
    "<li>Los profesionales sanitarios independientes no son responsables de resultados clínicos derivados de las limitaciones inherentes de la evaluación a distancia, cuando dichas limitaciones fueron comunicadas claramente y el profesional actuó con diligencia y competencia razonables</li>" +
    "<li>Global Health no es responsable de resultados derivados de la omisión por parte del paciente de información clínica relevante durante la consulta</li>" +
    "<li>Nada en esta declaración limita ni excluye la responsabilidad por muerte o lesiones personales derivadas de negligencia, fraude o cualquier otra responsabilidad que no pueda limitarse ni excluirse conforme al derecho español</li>" +
    "</ul>",

  "<h2>16. Reclamaciones</h2>",
  '<p>Si tiene una reclamación sobre cualquier aspecto del servicio recibido, contáctenos en primera instancia: <a href="mailto:reclamaciones@myglobalhealth.online">reclamaciones@myglobalhealth.online</a>. Confirmamos la recepción de reclamaciones en 5 días hábiles y proporcionamos respuesta escrita completa en 30 días hábiles.</p>',
  "<p>Si no está satisfecho con nuestra respuesta, puede dirigir su reclamación a:</p>",
  "<ul>" +
    '<li>Organización Médica Colegial (OMC) — reclamaciones sobre conducta profesional de un médico colegiado: <a href="https://cgcom.es">cgcom.es</a></li>' +
    '<li>Colegio Oficial de Psicólogos (COP) — reclamaciones sobre psicólogos colegiados: <a href="https://cop.es">cop.es</a></li>' +
    '<li>Agencia Española de Protección de Datos (AEPD) — reclamaciones sobre protección de datos: <a href="https://aepd.es">aepd.es</a></li>' +
    "</ul>",

  "<h2>17. Recursos de urgencias y crisis — España</h2>",
  '<p><strong>Emergencias médicas:</strong> <a href="tel:112">112</a> (gratuito, 24 horas, disponible en múltiples idiomas)</p>',
  "<p><strong>Crisis de salud mental / conducta suicida:</strong></p>",
  "<ul>" +
    '<li>Teléfono de atención a la conducta suicida — <a href="tel:024">024</a></li>' +
    '<li>Teléfono de la Esperanza — <a href="tel:717003717">717 003 717</a></li>' +
    "</ul>",
  '<p><strong>Urgencias neurológicas:</strong> síntomas de ictus (pérdida de fuerza, alteración del habla, cefalea brusca intensa) — <a href="tel:112">112</a> inmediatamente. En neurología, el tiempo es crítico.</p>',
  '<p><strong>Urgencias cardiológicas:</strong> dolor torácico, pérdida de consciencia, dificultad respiratoria grave — <a href="tel:112">112</a> inmediatamente.</p>',
  '<p><strong>Urgencias pediátricas:</strong> fiebre en lactante menor de 3 meses — urgencias inmediatamente. Dificultad respiratoria, erupción que no desaparece al presionar — <a href="tel:112">112</a> inmediatamente.</p>',
  '<p><strong>Protección del menor:</strong> si un menor está en peligro inmediato — <a href="tel:112">112</a> inmediatamente.</p>',

  '<p>Esta declaración se revisa y actualiza periódicamente. La versión publicada en la plataforma en el momento de la consulta es la versión aplicable. Para consultas sobre esta declaración: <a href="mailto:info@myglobalhealth.online">info@myglobalhealth.online</a>.</p>',
  "<p><em>Global Health España | myglobalhealth.online | Global Guest s.r.o. (IČO: 19071680)</em></p>",
].join("");

async function main() {
  const country = await prisma.country.findUnique({
    where: { code: COUNTRY_CODE },
    select: { id: true },
  });
  if (!country) throw new Error(`Country ${COUNTRY_CODE} not found`);

  console.log(
    `DISCLAIMER  /spain/es/legal  "${DISCLAIMER_TITLE}"  (${DISCLAIMER_HTML.length} chars)`,
  );
  if (APPLY) {
    await prisma.countryLegalDocument.upsert({
      where: {
        countryId_type_locale: {
          countryId: country.id,
          type: LegalDocumentType.MEDICAL_DISCLAIMER,
          locale: LOCALE,
        },
      },
      create: {
        countryId: country.id,
        type: LegalDocumentType.MEDICAL_DISCLAIMER,
        title: DISCLAIMER_TITLE,
        content: DISCLAIMER_HTML,
        isPublished: false, // AEPD registration pending — see header note
        locale: LOCALE,
      },
      update: {
        title: DISCLAIMER_TITLE,
        content: DISCLAIMER_HTML,
        version: { increment: 1 },
      },
    });
  }

  console.log("\n────────────");
  console.log(APPLY ? "APPLIED." : "DRY-RUN (no writes). Pass --apply.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
