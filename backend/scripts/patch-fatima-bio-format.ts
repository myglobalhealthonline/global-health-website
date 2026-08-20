/**
 * Reformat Dr Fatima Ali's English bio: plain text -> structured HTML
 * (paragraphs, section headings, bullet lists) and remove the em dashes.
 *
 *   node --env-file=.env --import tsx scripts/patch-fatima-bio-format.ts           # dry-run
 *   node --env-file=.env --import tsx scripts/patch-fatima-bio-format.ts --apply   # write
 *
 * Writes Doctor.bio, DoctorTranslation(EN) and every DoctorMarketTranslation(EN)
 * for this doctor. Idempotent: re-running when the value already matches is a
 * no-op. Dry-run also dumps the current values to a backup JSON file.
 */
import fs from "node:fs";
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");
const SLUG = "dr-fatima-ali";
const BACKUP = "fatima-bio-backup.json";

const BIO = [
  "<p>Dr Fatima Ali is a Medical Oncology Registrar with over 11 years of post-internship clinical experience in Medical Oncology, one of the most extensively trained oncology clinicians available through online consultation in Ireland.</p>",
  "<p>She holds an MBBS from Zia Uddin Medical University, Karachi, and spent over eight years at Shaukat Khanum Memorial Cancer Hospital, a JCI-accredited cancer centre recognised as one of Asia's leading oncology institutions. There she specialised in managing both solid tumour and haematological malignancies, conducted over 3,000 independent bone marrow biopsies, and led patient education and counselling initiatives. She has also worked in Medical Oncology at Cork University Hospital in Ireland, providing oncology outpatient care, chemotherapy day ward support and clinical research in an Irish healthcare context.</p>",
  "<p>Dr Ali is a published researcher in international oncology journals, has contributed to clinical audits and quality improvement initiatives, and has led structured teaching sessions for junior doctors and healthcare professionals. She is registered with the Irish Medical Council and brings a patient-centred, evidence-based approach to every consultation.</p>",
  "<p>Through Global Health, Dr Ali provides oncology consultations focused on helping patients understand their diagnosis, treatment options, test results and what to expect at each stage of their cancer journey, delivered with the clinical depth of a specialist and the compassion of a clinician who has dedicated her career to oncology care.</p>",
  "<h3>What she offers online</h3>",
  "<ul>",
  "<li><strong>Cancer diagnosis support:</strong> helping patients and families understand a new cancer diagnosis, staging, and what it means in practical terms.</li>",
  "<li><strong>Second opinions:</strong> reviewing oncology reports, pathology summaries, imaging reports and treatment recommendations.</li>",
  "<li><strong>Treatment planning discussion:</strong> explaining treatment options including chemotherapy, immunotherapy, targeted therapy and radiotherapy, what each involves and what to expect.</li>",
  "<li><strong>Side effect management:</strong> advice on managing common treatment side effects and when to seek urgent in-person care.</li>",
  "<li><strong>Haematological malignancy guidance:</strong> leukaemia, lymphoma, myeloma and related conditions.</li>",
  "<li><strong>Solid tumour guidance:</strong> breast, lung, colorectal, prostate and other solid cancers.</li>",
  "<li><strong>Cancer screening advice:</strong> guidance on appropriate screening based on personal and family risk.</li>",
  "<li><strong>Post-treatment follow-up discussion:</strong> reviewing progress, interpreting follow-up scan reports and addressing ongoing concerns.</li>",
  "<li><strong>Patient education and counselling:</strong> helping patients and families navigate the cancer care system with clarity and confidence.</li>",
  "</ul>",
  "<h3>What to expect from your consultation</h3>",
  "<p>Dr Ali will take a full oncology history and review any reports, letters, pathology summaries or imaging reports you share in advance. She will provide a clear clinical explanation of your situation and what it means, answer your questions in plain language, and advise on next steps, whether that is understanding your current treatment plan, seeking a second opinion from a different consultant, or managing side effects at home. At the end of the consultation you will receive a written summary.</p>",
  "<h3>Who this consultation is for</h3>",
  "<ul>",
  "<li>Patients who have recently received a cancer diagnosis and want expert help understanding what it means.</li>",
  "<li>Patients who want a second opinion on a treatment recommendation.</li>",
  "<li>Patients experiencing side effects who need clinical guidance.</li>",
  "<li>Patients with a family history of cancer who want advice on appropriate screening.</li>",
  "<li>Carers and family members supporting someone through cancer treatment who want to understand the clinical picture more clearly.</li>",
  "</ul>",
  "<h3>Her approach</h3>",
  "<p>Dr Ali is known for clear, compassionate communication and a deep commitment to patient education. Her eight years at Shaukat Khanum Memorial Cancer Hospital, where patient counselling and education are central to the clinical model, shaped an approach that prioritises making complex oncology information accessible and actionable for patients and families. She believes that understanding your diagnosis and treatment is itself part of the care.</p>",
  "<h3>Important note</h3>",
  "<p>Online oncology consultations cannot replace in-person oncology care. Dr Ali cannot review imaging or pathology slides directly, prescribe chemotherapy, or make treatment decisions that require in-person assessment. Her online consultations are designed to complement your in-person oncology team, helping you understand, prepare and engage more confidently with your care.</p>",
  "<p><strong>Languages:</strong> English</p>",
].join("");

async function main() {
  console.log(APPLY ? "== APPLY ==" : "== DRY-RUN (pass --apply to write) ==");
  if (BIO.includes("—")) throw new Error("new bio still contains an em dash");

  const doctor = await prisma.doctor.findFirst({
    where: { slug: SLUG },
    include: {
      translations: true,
      additionalCountries: { include: { country: true, translations: true } },
    },
  });
  if (!doctor) throw new Error(`doctor ${SLUG} not found`);

  const en = doctor.translations.find((t) => t.locale === "EN");
  const marketEn = doctor.additionalCountries.flatMap((dc) =>
    dc.translations
      .filter((t) => t.locale === "EN")
      .map((t) => ({ countryCode: dc.country.code, row: t })),
  );

  fs.writeFileSync(
    BACKUP,
    JSON.stringify(
      {
        doctorId: doctor.id,
        base: doctor.bio,
        translationEn: en ? { id: en.id, bio: en.bio } : null,
        marketEn: marketEn.map((m) => ({ id: m.row.id, country: m.countryCode, bio: m.row.bio })),
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(`backup written: ${BACKUP}`);

  const before = en?.bio ?? doctor.bio ?? "";
  console.log(
    `before: ${before.length} chars, ${(before.match(/—/g) ?? []).length} em dashes, tags=${/<[a-z]/i.test(before)}`,
  );
  console.log(`after:  ${BIO.length} chars, 0 em dashes, tags=true`);

  if (doctor.bio !== BIO) {
    console.log("Doctor.bio -> new HTML");
    if (APPLY) await prisma.doctor.update({ where: { id: doctor.id }, data: { bio: BIO } });
  } else console.log("Doctor.bio: already current");

  if (en && en.bio !== BIO) {
    console.log("DoctorTranslation EN -> new HTML");
    if (APPLY) await prisma.doctorTranslation.update({ where: { id: en.id }, data: { bio: BIO } });
  } else console.log("DoctorTranslation EN: already current or missing");

  for (const m of marketEn) {
    if (m.row.bio === BIO) {
      console.log(`DoctorMarketTranslation ${m.countryCode}/EN: already current`);
      continue;
    }
    console.log(`DoctorMarketTranslation ${m.countryCode}/EN -> new HTML`);
    if (APPLY)
      await prisma.doctorMarketTranslation.update({ where: { id: m.row.id }, data: { bio: BIO } });
  }

  console.log(APPLY ? "done" : "dry-run complete, nothing written");
}

main().finally(() => prisma.$disconnect());
