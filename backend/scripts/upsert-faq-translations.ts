import "dotenv/config";
import { prisma } from "../src/db/prisma.js";
import fs from "node:fs";

// Usage: node --import tsx scripts/upsert-faq-translations.ts <locale> <file1.json> [file2.json ...]
// Each file shape: { services: [ { slug, faqs: [{id, question, answer}] } ] }
async function main() {
  const [locale, ...files] = process.argv.slice(2);
  if (!locale || !files.length) {
    console.error("Usage: upsert-faq-translations.ts <LOCALE> <file...>");
    process.exit(1);
  }
  let upserted = 0;
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const svc of data.services) {
      for (const faq of svc.faqs) {
        await prisma.serviceFaqTranslation.upsert({
          where: { serviceFaqId_locale: { serviceFaqId: faq.id, locale: locale as any } },
          create: { serviceFaqId: faq.id, locale: locale as any, question: faq.question, answer: faq.answer },
          update: { question: faq.question, answer: faq.answer },
        });
        upserted++;
      }
    }
  }
  console.log(`Upserted ${upserted} ServiceFaqTranslation rows for locale ${locale}`);
}
main().finally(() => prisma.$disconnect());
