import { config as loadEnv } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const prismaDir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(prismaDir, "..", ".env") });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main(): Promise<void> {
  const [users, tokens, countries, services, specialties, doctors, pricingPlans, assets, contentPages, faqs, blogPosts] = await Promise.all([
    prisma.user.count(),
    prisma.passwordResetToken.count(),
    prisma.country.count(),
    prisma.service.count(),
    prisma.specialty.count(),
    prisma.doctor.count(),
    prisma.pricingPlan.count(),
    prisma.asset.count(),
    prisma.contentPage.count(),
    prisma.faq.count(),
    prisma.blogPost.count(),
  ]);

  console.log(
    JSON.stringify(
      { users, tokens, countries, services, specialties, doctors, pricingPlans, assets, contentPages, faqs, blogPosts },
      null,
      2,
    ),
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });

