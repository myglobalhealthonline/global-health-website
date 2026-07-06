import "dotenv/config";
import { prisma } from "../src/db/prisma.js";
import fs from "node:fs";

// Usage: node --import tsx scripts/upsert-service-translations.ts <country> <locale> <file.json>
// File shape: { services: [ { slug, fields: {name, summary, seoTitle, seoDescription, heroTitle, heroDescription, detailBody, ctaLabel}, faqs?: [{id, question, answer}] } ] }
async function main() {
  const [country, locale, file] = process.argv.slice(2);
  if (!country || !locale || !file) {
    console.error("Usage: upsert-service-translations.ts <country> <LOCALE> <file.json>");
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  let svcCount = 0;
  let faqCount = 0;
  for (const svc of data.services) {
    const service = await prisma.service.findFirst({
      where: { slug: svc.slug, country: { code: country } },
      select: { id: true },
    });
    if (!service) {
      console.warn(`SKIP: no service found for slug=${svc.slug} country=${country}`);
      continue;
    }
    if (svc.fields) {
      const f = svc.fields;
      await prisma.serviceTranslation.upsert({
        where: { serviceId_locale: { serviceId: service.id, locale: locale as any } },
        create: {
          serviceId: service.id, locale: locale as any,
          name: f.name, summary: f.summary, seoTitle: f.seoTitle, seoDescription: f.seoDescription,
          heroTitle: f.heroTitle, heroDescription: f.heroDescription, detailBody: f.detailBody, ctaLabel: f.ctaLabel,
        },
        update: {
          name: f.name, summary: f.summary, seoTitle: f.seoTitle, seoDescription: f.seoDescription,
          heroTitle: f.heroTitle, heroDescription: f.heroDescription, detailBody: f.detailBody, ctaLabel: f.ctaLabel,
        },
      });
      svcCount++;
    }
    if (svc.faqs) {
      for (const faq of svc.faqs) {
        await prisma.serviceFaqTranslation.upsert({
          where: { serviceFaqId_locale: { serviceFaqId: faq.id, locale: locale as any } },
          create: { serviceFaqId: faq.id, locale: locale as any, question: faq.question, answer: faq.answer },
          update: { question: faq.question, answer: faq.answer },
        });
        faqCount++;
      }
    }
  }
  console.log(`Upserted ${svcCount} ServiceTranslation + ${faqCount} ServiceFaqTranslation rows for ${country}/${locale}`);
}
main().finally(() => prisma.$disconnect());
