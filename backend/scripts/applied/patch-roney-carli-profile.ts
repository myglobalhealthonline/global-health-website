/**
 * APPLIED 2026-08-19 — 9 writes; all six Ireland locales expanded. Re-running is a no-op.
 *
 * Roney Carli — full profile copy, supplied by the clinic 2026-08-19.
 *
 * His public bio was an 86-character stub ("Manual therapist providing
 * in-person therapy sessions at Global Health Ireland clinic.") in all six
 * Ireland locales, which is below the 120-char floor in
 * `validatePublicDoctorRecord`, so every locale variant of his profile served
 * `noindex, follow`. He is already flagged `editorialChecklist.nonPhysician`
 * (see patch-ie-non-physician-practitioners.ts), so the bio was the only
 * remaining blocker.
 *
 * Writes the base Doctor row (title, bio, qualifications) plus the per-locale
 * `DoctorMarketTranslation` rows for the Ireland market — EN, PT, ES, CS, RO,
 * DE — so the Spanish, Czech, German, Portuguese and Romanian URLs carry the
 * bio in their own language rather than English text on a translated page.
 * That matches how every other Ireland doctor is stored.
 *
 *   node --env-file=.env --import tsx scripts/applied/patch-roney-carli-profile.ts           # dry-run
 *   node --env-file=.env --import tsx scripts/applied/patch-roney-carli-profile.ts --apply   # write
 *
 * SAFE BY DESIGN: one doctor, one market. A locale row is only overwritten
 * while it still holds the short stub (matched on length, < 200 chars), so a
 * later hand-edit is never clobbered and re-running is a no-op. The dry-run
 * runs inside a transaction that is always rolled back.
 */
import { LocaleCode, Prisma } from "@prisma/client";
import { prisma } from "../../src/db/prisma.js";

const SLUG = "roney-carli";
const COUNTRY_CODE = "ie";
const APPLY = process.argv.includes("--apply");
/** A stored bio at or below this length is still the pre-2026-08-19 stub. */
const STUB_MAX_CHARS = 200;

const log: string[] = [];
const note = (m: string) => {
  log.push(m);
  console.log(m);
};

const QUALIFICATIONS = [
  "Degree in Chiropractic — Brazil",
  "Training in Kinesiology",
  "Neuromuscular Therapy",
  "Manual Therapy",
  "Soft Tissue and Muscle Release Techniques",
  "Sports and Deep Tissue Massage",
  "Joint Mobilisation Techniques",
  "Cupping Therapy",
  "Dry Needling",
  "Ongoing professional development in musculoskeletal health, movement, and pain management",
];

const EN_BIO = [
  "Roney Carli is a chiropractor and manual therapist with a strong passion for helping people move better, understand their bodies, and live with less pain.",
  "He completed his degree in Chiropractic in Brazil and has continued to expand his clinical knowledge through further training in Kinesiology, Neuromuscular Therapy, Manual Therapy, and other complementary approaches to musculoskeletal health and human movement.",
  "Having lived in Ireland for almost five years, Roney has built his professional journey around working with people from different backgrounds, cultures, and lifestyles. This experience has strengthened his belief that every patient is unique and that effective care should never follow a one-size-fits-all approach.",
  "His passion for chiropractic goes beyond simply treating the area where pain is felt. His approach focuses on understanding the individual as a whole, considering movement, muscular function, joint mobility, lifestyle, and the factors that may be contributing to discomfort or limiting physical function.",
  "Through his training in Kinesiology and Neuromuscular Therapy, Roney combines different clinical perspectives to create an individualised approach for each patient. Depending on the person's needs, treatment may incorporate manual therapy, soft tissue techniques, joint mobilisation, chiropractic techniques, neuromuscular approaches, and movement-based strategies.",
  "For Roney, one of the most rewarding aspects of his work is seeing patients regain confidence in their own bodies, whether that means returning to exercise, working without pain, improving mobility, or simply feeling more comfortable in everyday life.",
  "His philosophy is based on continuous learning, evidence-informed practice, and genuine care for every person who walks through the clinic's doors.",
].join("\n\n");

const PT_BIO = [
  "Roney Carli é quiroprático e terapeuta manual, com uma forte vocação para ajudar as pessoas a moverem-se melhor, a compreenderem o próprio corpo e a viverem com menos dor.",
  "Concluiu a licenciatura em Quiropraxia no Brasil e tem continuado a alargar os seus conhecimentos clínicos através de formação complementar em Cinesiologia, Terapia Neuromuscular, Terapia Manual e outras abordagens complementares à saúde musculoesquelética e ao movimento humano.",
  "A viver na Irlanda há quase cinco anos, Roney construiu o seu percurso profissional a trabalhar com pessoas de diferentes origens, culturas e estilos de vida. Esta experiência reforçou a sua convicção de que cada paciente é único e de que um tratamento eficaz nunca deve seguir uma fórmula igual para todos.",
  "O seu interesse pela quiropraxia vai além de tratar apenas a zona onde a dor é sentida. A sua abordagem procura compreender a pessoa como um todo, considerando o movimento, a função muscular, a mobilidade articular, o estilo de vida e os fatores que possam estar a contribuir para o desconforto ou a limitar a função física.",
  "Graças à sua formação em Cinesiologia e Terapia Neuromuscular, Roney combina diferentes perspetivas clínicas para criar uma abordagem individualizada para cada paciente. Consoante as necessidades de cada pessoa, o tratamento pode incluir terapia manual, técnicas de tecidos moles, mobilização articular, técnicas quiropráticas, abordagens neuromusculares e estratégias baseadas no movimento.",
  "Para Roney, um dos aspetos mais gratificantes do seu trabalho é ver os pacientes recuperarem a confiança no próprio corpo, seja isso voltar a praticar exercício, trabalhar sem dor, melhorar a mobilidade ou simplesmente sentir-se mais confortável no dia a dia.",
  "A sua filosofia assenta na aprendizagem contínua, numa prática informada pela evidência e num cuidado genuíno por cada pessoa que entra na clínica.",
].join("\n\n");

const ES_BIO = [
  "Roney Carli es quiropráctico y terapeuta manual, con una fuerte vocación por ayudar a las personas a moverse mejor, entender su cuerpo y vivir con menos dolor.",
  "Se licenció en Quiropráctica en Brasil y desde entonces ha seguido ampliando sus conocimientos clínicos con formación en Kinesiología, Terapia Neuromuscular, Terapia Manual y otros enfoques complementarios de la salud musculoesquelética y del movimiento humano.",
  "Lleva casi cinco años viviendo en Irlanda y ha construido su trayectoria profesional trabajando con personas de distintos orígenes, culturas y estilos de vida. Esa experiencia ha reforzado su convicción de que cada paciente es único y de que un tratamiento eficaz nunca debe seguir una fórmula igual para todos.",
  "Su interés por la quiropráctica va más allá de tratar únicamente la zona donde se siente el dolor. Su enfoque busca entender a la persona en su conjunto, teniendo en cuenta el movimiento, la función muscular, la movilidad articular, el estilo de vida y los factores que puedan estar contribuyendo a la molestia o limitando la función física.",
  "Gracias a su formación en Kinesiología y Terapia Neuromuscular, Roney combina distintas perspectivas clínicas para crear un abordaje individualizado para cada paciente. Según lo que cada persona necesite, el tratamiento puede incluir terapia manual, técnicas de tejidos blandos, movilización articular, técnicas quiroprácticas, enfoques neuromusculares y estrategias basadas en el movimiento.",
  "Para Roney, uno de los aspectos más gratificantes de su trabajo es ver que los pacientes recuperan la confianza en su propio cuerpo, ya sea volviendo a hacer ejercicio, trabajando sin dolor, mejorando la movilidad o simplemente sintiéndose más cómodos en el día a día.",
  "Su filosofía se basa en el aprendizaje continuo, en una práctica informada por la evidencia y en un cuidado genuino por cada persona que entra en la clínica.",
].join("\n\n");

const CS_BIO = [
  "Roney Carli je chiropraktik a manuální terapeut, kterého baví pomáhat lidem lépe se hýbat, rozumět vlastnímu tělu a žít s menší bolestí.",
  "Vystudoval chiropraxi v Brazílii a své klinické znalosti dále rozšiřuje dalším vzděláváním v kineziologii, neuromuskulární terapii, manuální terapii a dalších doplňkových přístupech k muskuloskeletálnímu zdraví a lidskému pohybu.",
  "V Irsku žije téměř pět let a svou profesní dráhu postavil na práci s lidmi z různých prostředí, kultur a životních stylů. Tato zkušenost ho utvrdila v přesvědčení, že každý pacient je jiný a že účinná péče nikdy nemůže být stejná pro všechny.",
  "Jeho zájem o chiropraxi přesahuje pouhé ošetření místa, kde bolest vzniká. Jeho přístup vychází z porozumění člověku jako celku — sleduje pohyb, svalovou funkci, kloubní pohyblivost, životní styl i faktory, které mohou k obtížím přispívat nebo omezovat fyzickou funkci.",
  "Díky vzdělání v kineziologii a neuromuskulární terapii kombinuje Roney různé klinické perspektivy a sestavuje individuální postup pro každého pacienta. Podle potřeb konkrétního člověka může léčba zahrnovat manuální terapii, techniky měkkých tkání, mobilizaci kloubů, chiropraktické techniky, neuromuskulární přístupy a strategie založené na pohybu.",
  "Za jeden z nejcennějších aspektů své práce považuje Roney okamžik, kdy pacient znovu získá důvěru ve vlastní tělo — ať už jde o návrat ke cvičení, práci bez bolesti, lepší pohyblivost, nebo prostě o větší pohodlí v běžném dni.",
  "Jeho filozofie stojí na průběžném vzdělávání, praxi opřené o důkazy a upřímném zájmu o každého člověka, který do kliniky přijde.",
].join("\n\n");

const RO_BIO = [
  "Roney Carli este chiropractician și terapeut manual, cu o pasiune reală pentru a-i ajuta pe oameni să se miște mai bine, să își înțeleagă corpul și să trăiască cu mai puțină durere.",
  "A absolvit studiile de Chiropractică în Brazilia și și-a extins continuu cunoștințele clinice prin formare suplimentară în Kinesiologie, Terapie Neuromusculară, Terapie Manuală și alte abordări complementare ale sănătății musculo-scheletice și ale mișcării umane.",
  "Locuiește în Irlanda de aproape cinci ani și și-a construit parcursul profesional lucrând cu oameni din medii, culturi și stiluri de viață diferite. Această experiență i-a întărit convingerea că fiecare pacient este unic și că un tratament eficient nu poate fi niciodată la fel pentru toți.",
  "Interesul său pentru chiropractică depășește simpla tratare a zonei în care apare durerea. Abordarea sa pornește de la înțelegerea persoanei în ansamblu, luând în calcul mișcarea, funcția musculară, mobilitatea articulară, stilul de viață și factorii care pot contribui la disconfort sau pot limita funcția fizică.",
  "Prin formarea în Kinesiologie și Terapie Neuromusculară, Roney combină perspective clinice diferite pentru a construi o abordare individualizată pentru fiecare pacient. În funcție de nevoile fiecăruia, tratamentul poate include terapie manuală, tehnici pentru țesuturile moi, mobilizare articulară, tehnici chiropractice, abordări neuromusculare și strategii bazate pe mișcare.",
  "Pentru Roney, unul dintre cele mai valoroase aspecte ale muncii sale este să vadă pacienții recăpătându-și încrederea în propriul corp — fie că înseamnă revenirea la sport, munca fără durere, o mobilitate mai bună sau pur și simplu un confort mai mare în viața de zi cu zi.",
  "Filozofia sa se bazează pe învățare continuă, pe o practică fundamentată pe dovezi și pe grijă autentică față de fiecare persoană care intră în clinică.",
].join("\n\n");

const DE_BIO = [
  "Roney Carli ist Chiropraktiker und Manualtherapeut. Sein Anliegen ist es, Menschen dabei zu helfen, sich besser zu bewegen, ihren Körper zu verstehen und mit weniger Schmerzen zu leben.",
  "Sein Chiropraktik-Studium hat er in Brasilien abgeschlossen und sein klinisches Wissen seither durch Weiterbildungen in Kinesiologie, neuromuskulärer Therapie, Manualtherapie und weiteren ergänzenden Ansätzen zu muskuloskelettaler Gesundheit und menschlicher Bewegung erweitert.",
  "Er lebt seit fast fünf Jahren in Irland und hat seinen beruflichen Weg in der Arbeit mit Menschen unterschiedlicher Herkunft, Kultur und Lebensweise aufgebaut. Diese Erfahrung hat ihn darin bestärkt, dass jede Patientin und jeder Patient einzigartig ist und eine wirksame Behandlung nie nach Schema F verlaufen darf.",
  "Sein Interesse an der Chiropraktik geht über die Behandlung der schmerzenden Stelle hinaus. Sein Ansatz betrachtet den Menschen als Ganzes: Bewegung, Muskelfunktion, Gelenkbeweglichkeit, Lebensstil und die Faktoren, die zu Beschwerden beitragen oder die körperliche Funktion einschränken können.",
  "Durch seine Ausbildung in Kinesiologie und neuromuskulärer Therapie verbindet Roney verschiedene klinische Perspektiven zu einem individuellen Vorgehen für jede Patientin und jeden Patienten. Je nach Bedarf kann die Behandlung Manualtherapie, Weichteiltechniken, Gelenkmobilisation, chiropraktische Techniken, neuromuskuläre Ansätze und bewegungsbasierte Strategien umfassen.",
  "Zu den schönsten Seiten seiner Arbeit zählt für Roney der Moment, in dem Patientinnen und Patienten wieder Vertrauen in den eigenen Körper fassen — sei es die Rückkehr zum Sport, schmerzfreies Arbeiten, mehr Beweglichkeit oder einfach mehr Wohlbefinden im Alltag.",
  "Seine Haltung beruht auf kontinuierlichem Lernen, evidenzinformierter Praxis und echtem Interesse an jedem Menschen, der die Praxis betritt.",
].join("\n\n");

const TITLES: Record<LocaleCode, string> = {
  EN: "Chiropractor & Manual Therapist",
  PT: "Quiroprático e Terapeuta Manual",
  ES: "Quiropráctico y Terapeuta Manual",
  CS: "Chiropraktik a manuální terapeut",
  RO: "Chiropractician și terapeut manual",
  DE: "Chiropraktiker und Manualtherapeut",
};

const BIOS: Record<LocaleCode, string> = {
  EN: EN_BIO,
  PT: PT_BIO,
  ES: ES_BIO,
  CS: CS_BIO,
  RO: RO_BIO,
  DE: DE_BIO,
};

/** Sentinel used to roll the dry-run transaction back. */
class ROLLBACK extends Error {}

async function main() {
  for (const [locale, bio] of Object.entries(BIOS)) {
    if (bio.trim().length < 120) throw new Error(`${locale} bio is below the 120-char floor`);
  }

  await prisma
    .$transaction(
      async (tx) => {
        const doctor = await tx.doctor.findFirst({
          where: { slug: SLUG, country: { code: COUNTRY_CODE } },
          select: { id: true, fullName: true, title: true, bio: true, qualifications: true },
        });
        if (!doctor) throw new Error(`Doctor ${SLUG} not found in ${COUNTRY_CODE}`);

        // ── base Doctor row (English — Ireland's default locale) ──
        const base: Prisma.DoctorUpdateInput = {};
        if ((doctor.bio ?? "").trim().length <= STUB_MAX_CHARS) {
          base.bio = EN_BIO;
          note(`base bio: ${(doctor.bio ?? "").trim().length} -> ${EN_BIO.length} chars`);
        } else {
          note("base bio already expanded — left as-is.");
        }
        if (doctor.title !== TITLES.EN) {
          base.title = TITLES.EN;
          note(`base title: "${doctor.title}" -> "${TITLES.EN}"`);
        }
        if (doctor.qualifications.length === 0) {
          base.qualifications = QUALIFICATIONS;
          note(`base qualifications: 0 -> ${QUALIFICATIONS.length} entries`);
        } else {
          note(`base qualifications already set (${doctor.qualifications.length}) — left as-is.`);
        }
        if (Object.keys(base).length && APPLY) {
          await tx.doctor.update({ where: { id: doctor.id }, data: base });
        }

        // ── per-locale Ireland market translations ──
        const link = await tx.doctorCountry.findFirst({
          where: { doctorId: doctor.id, country: { code: COUNTRY_CODE } },
          select: { id: true },
        });
        if (!link) {
          note(`⚠ no DoctorCountry row for ${SLUG}/${COUNTRY_CODE} — locale variants left untouched.`);
        } else {
          for (const locale of Object.keys(BIOS) as LocaleCode[]) {
            const existing = await tx.doctorMarketTranslation.findUnique({
              where: { doctorCountryId_locale: { doctorCountryId: link.id, locale } },
              select: { id: true, title: true, bio: true },
            });
            const data = { title: TITLES[locale], bio: BIOS[locale] };
            if (!existing) {
              note(`${locale}: no translation row — creating (${BIOS[locale].length} chars)`);
              if (APPLY) {
                await tx.doctorMarketTranslation.create({
                  data: { doctorCountryId: link.id, locale, ...data },
                });
              }
              continue;
            }
            if ((existing.bio ?? "").trim().length > STUB_MAX_CHARS) {
              note(`${locale}: bio already expanded (${(existing.bio ?? "").length} chars) — left as-is.`);
              continue;
            }
            note(
              `${locale}: bio ${(existing.bio ?? "").trim().length} -> ${BIOS[locale].length} chars, ` +
                `title "${existing.title ?? "∅"}" -> "${TITLES[locale]}"`,
            );
            if (APPLY) {
              await tx.doctorMarketTranslation.update({ where: { id: existing.id }, data });
            }
          }
        }

        if (!APPLY) throw new ROLLBACK();
      },
      { timeout: 30_000 },
    )
    .catch((e) => {
      if (e instanceof ROLLBACK) return; // dry-run: intentional rollback
      throw e;
    });

  console.log("\n────────────");
  console.log(
    APPLY
      ? `APPLIED: ${log.length} change line(s) written for ${SLUG}.`
      : `DRY-RUN: ${log.length} change line(s) would be written. Pass --apply to persist.`,
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
