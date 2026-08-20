/**
 * Dr Renato Sarmento has a bio only in Portuguese, so /brazil/en/ and
 * /brazil/es/ fall back to the PT text. This adds the missing EN and ES
 * translations of that same bio.
 *
 *   node --env-file=.env --import tsx scripts/patch-sarmento-bio-en-es.ts           # dry-run
 *   node --env-file=.env --import tsx scripts/patch-sarmento-bio-en-es.ts --apply   # write
 *
 * Writes DoctorTranslation(EN|ES).bio and DoctorMarketTranslation(br, EN|ES).bio.
 * Only fills values that are currently empty; never overwrites existing copy.
 */
import { prisma } from "../src/db/prisma.js";
import { normalizeBio } from "./lib/normalize-bio.js";

const APPLY = process.argv.includes("--apply");
const SLUG = "dr-renato-sarmento";

const EN = [
  "<p>Dr Renato Ziviani Sarmento is a family and community physician with more than ten years of experience across the Brazilian public and private health systems, with established practice in Primary Health Care, Palliative Care and Telemedicine, a rare combination that makes him one of the most complete clinicians available for online consultation in Brazil.</p>",
  "<p>He graduated in Medicine from Centro Universitário do Estado do Pará and completed his medical residency in Family and Community Medicine at Casa de Saúde Santa Marcelina, a national reference for Family Health in São Paulo. He deepened his training in Palliative Care with a specialisation at Centro Universitário São Camilo and, more recently, completed a Master's degree in Palliative Care at Universidad Pontificia de Salamanca in Spain, a high-level European qualification that brings an international perspective to his practice. He also holds an MBA in Health Management, Innovation and Services from PUC-RS.</p>",
  "<p>He currently works in telemedicine integrated with primary care, with experience in a hybrid Digital Clinic model inside a Family Health Strategy primary care unit in São Paulo, one of the most innovative telemedicine formats in the Brazilian public health system (SUS), alongside experience on digital urgent care platforms for private health plans, treating patients of all ages across every region of Brazil. Consultations through Global Health are provided by Pallium Cuidados Integrados LTDA (CNPJ: 35.020.828/0001-96).</p>",
  "<p>His experience as medical coordinator of the Melhor em Casa home care programme at Hospital Santa Marcelina, supervising multidisciplinary home care teams, leading clinical discussions, managing indicators and integrating care networks, translates into a systemic view of health that goes well beyond the individual consultation. Dr Renato understands care as a longitudinal process rather than a series of isolated appointments.</p>",
  "<p>For patients with chronic illness, complex conditions or end-of-life situations, the combination of Family Medicine and Palliative Care is especially valuable: it means a doctor who knows how to care for the whole person, not only the disease, and who has specific training to accompany the hardest moments of life with clinical competence and humanity.</p>",
  "<h3>What he treats</h3>",
  "<ul>",
  "<li><strong>Family medicine and primary care:</strong> acute illness, chronic disease management, health promotion and prevention</li>",
  "<li><strong>Chronic diseases:</strong> hypertension, diabetes, dyslipidaemia, hypothyroidism, asthma, COPD</li>",
  "<li><strong>Palliative care:</strong> support for patients with advanced disease, symptom control, family support, quality of life</li>",
  "<li><strong>Follow-up of advanced cancer:</strong> palliative support, pain and symptom control</li>",
  "<li><strong>Women's, men's and older people's health:</strong> longitudinal and preventive follow-up</li>",
  "<li><strong>Mental health:</strong> anxiety, depression, stress management and referral to specialists</li>",
  "<li><strong>Post-hospital care and care transitions:</strong> follow-up after discharge, prevention of readmissions</li>",
  "<li><strong>Digital health and teleconsultation:</strong> guidance on using health technology, remote monitoring</li>",
  "<li>Medical certificates, declarations and referrals</li>",
  "<li>Prescription renewals and medication reviews</li>",
  "</ul>",
  "<p><strong>His approach:</strong> Dr Renato practises person-centred medicine, focused not on the isolated diagnosis but on the life context, priorities and values of the person being cared for. His training in Palliative Care deepened that view: whatever the clinical condition, every consultation should end with the patient feeling heard, understanding what is happening to them, and holding a clear plan for the next steps.</p>",
].join("");

const ES = [
  "<p>El Dr. Renato Ziviani Sarmento es médico de familia y comunidad con más de diez años de experiencia en los sistemas público y privado de salud de Brasil, con una práctica consolidada en Atención Primaria de Salud, Cuidados Paliativos y Telemedicina, una combinación poco frecuente que lo sitúa entre los profesionales más completos disponibles para consulta en línea en Brasil.</p>",
  "<p>Se licenció en Medicina por el Centro Universitário do Estado do Pará y completó su residencia médica en Medicina de Familia y Comunidad en la Casa de Saúde Santa Marcelina, referencia nacional en Salud de la Familia en São Paulo. Profundizó su formación en Cuidados Paliativos con una especialización en el Centro Universitário São Camilo y, más recientemente, concluyó un Máster en Cuidados Paliativos por la Universidad Pontificia de Salamanca (España), una formación europea de alto nivel que aporta una perspectiva internacional a su práctica. Cuenta además con un MBA en Gestión, Innovación y Servicios de Salud por la PUC-RS.</p>",
  "<p>Actualmente trabaja en telemedicina integrada a la atención primaria, con experiencia en un modelo híbrido de Consultorio Digital dentro de una unidad básica de salud de la Estrategia Salud de la Familia en São Paulo, uno de los formatos de telemedicina más innovadores del sistema público brasileño (SUS), además de experiencia en plataformas de atención de urgencias digital para la salud privada, atendiendo a pacientes de todas las edades y de todas las regiones de Brasil. Las consultas a través de Global Health se realizan por medio de Pallium Cuidados Integrados LTDA (CNPJ: 35.020.828/0001-96).</p>",
  "<p>Su experiencia como coordinador médico del programa Melhor em Casa del Hospital Santa Marcelina, supervisando equipos multiprofesionales de atención domiciliaria, dirigiendo discusiones clínicas, gestionando indicadores e integrando redes de cuidado, se traduce en una visión sistémica de la salud que va mucho más allá de la consulta individual. El Dr. Renato entiende el cuidado como un proceso longitudinal y no como una serie de consultas aisladas.</p>",
  "<p>Para pacientes con enfermedades crónicas, condiciones complejas o que enfrentan situaciones de final de vida, la combinación de Medicina de Familia y Cuidados Paliativos resulta especialmente valiosa: significa un médico que sabe cuidar a la persona entera, no solo la enfermedad, y que tiene formación específica para acompañar los momentos más difíciles de la vida con competencia clínica y humanidad.</p>",
  "<h3>Qué trata</h3>",
  "<ul>",
  "<li><strong>Medicina de familia y atención primaria:</strong> enfermedades agudas, manejo de condiciones crónicas, promoción y prevención de la salud</li>",
  "<li><strong>Enfermedades crónicas:</strong> hipertensión, diabetes, dislipidemia, hipotiroidismo, asma, EPOC</li>",
  "<li><strong>Cuidados paliativos:</strong> apoyo a pacientes con enfermedades avanzadas, control de síntomas, apoyo a la familia, calidad de vida</li>",
  "<li><strong>Seguimiento de enfermedades oncológicas avanzadas:</strong> apoyo paliativo, control del dolor y de los síntomas</li>",
  "<li><strong>Salud de la mujer, del hombre y de la persona mayor:</strong> seguimiento longitudinal y preventivo</li>",
  "<li><strong>Salud mental:</strong> ansiedad, depresión, manejo del estrés y derivación a especialistas</li>",
  "<li><strong>Posthospitalización y transición de cuidados:</strong> seguimiento tras el alta hospitalaria, prevención de reingresos</li>",
  "<li><strong>Salud digital y teleconsulta:</strong> orientación sobre el uso de tecnologías de salud, monitorización remota</li>",
  "<li>Certificados médicos, declaraciones y derivaciones</li>",
  "<li>Renovación de recetas y revisión de la medicación</li>",
  "</ul>",
  "<p><strong>Su enfoque:</strong> El Dr. Renato practica una medicina centrada en la persona, no en el diagnóstico aislado, sino en el contexto de vida, las prioridades y los valores de quien recibe el cuidado. Su formación en Cuidados Paliativos profundizó esa mirada: sea cual sea la condición clínica, toda consulta debe terminar con el paciente sintiendo que fue escuchado, que entendió lo que le está pasando y que tiene un plan claro para los próximos pasos.</p>",
].join("");

const BIOS: Record<string, string> = { EN, ES };

async function main() {
  console.log(APPLY ? "== APPLY ==" : "== DRY-RUN (pass --apply to write) ==");
  for (const [locale, bio] of Object.entries(BIOS)) {
    if (/[—–]/.test(bio)) throw new Error(`${locale} bio contains a dash`);
    if (normalizeBio(bio) !== bio) throw new Error(`${locale} bio is not in normalized form`);
  }

  const d = await prisma.doctor.findFirst({
    where: { slug: SLUG },
    include: {
      translations: true,
      additionalCountries: { include: { country: true, translations: true } },
    },
  });
  if (!d) throw new Error(`doctor ${SLUG} not found`);

  for (const [locale, bio] of Object.entries(BIOS)) {
    const t = d.translations.find((x) => x.locale === locale);
    if (!t) {
      console.log(`  DoctorTranslation ${locale}: MISSING ROW, skipped`);
    } else if (t.bio?.trim()) {
      console.log(`  DoctorTranslation ${locale}: already has a bio, left alone`);
    } else {
      console.log(`  DoctorTranslation ${locale}: empty -> ${bio.length} chars`);
      if (APPLY)
        await prisma.doctorTranslation.update({ where: { id: t.id }, data: { bio } });
    }

    for (const dc of d.additionalCountries) {
      const m = dc.translations.find((x) => x.locale === locale);
      if (!m) continue;
      if (m.bio?.trim()) {
        console.log(`  Market ${dc.country.code}/${locale}: already has a bio, left alone`);
        continue;
      }
      console.log(`  Market ${dc.country.code}/${locale}: empty -> ${bio.length} chars`);
      if (APPLY)
        await prisma.doctorMarketTranslation.update({ where: { id: m.id }, data: { bio } });
    }
  }

  console.log(APPLY ? "done" : "dry-run complete, nothing written");
}

main().finally(() => prisma.$disconnect());
