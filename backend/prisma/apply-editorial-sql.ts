import { config as loadEnv } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const prismaDir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(prismaDir, "..", ".env") });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const sql = `
ALTER TABLE "Doctor"
ADD COLUMN IF NOT EXISTS "seoTitle" TEXT,
ADD COLUMN IF NOT EXISTS "seoDescription" TEXT,
ADD COLUMN IF NOT EXISTS "editorialChecklist" JSONB;

ALTER TABLE "Service"
ADD COLUMN IF NOT EXISTS "seoTitle" TEXT,
ADD COLUMN IF NOT EXISTS "seoDescription" TEXT,
ADD COLUMN IF NOT EXISTS "editorialChecklist" JSONB;

ALTER TABLE "BlogPost"
ADD COLUMN IF NOT EXISTS "reviewerDisplayName" TEXT,
ADD COLUMN IF NOT EXISTS "lastReviewedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "editorialChecklist" JSONB;

ALTER TABLE "ContentPage"
ADD COLUMN IF NOT EXISTS "editorialChecklist" JSONB;
`;

async function main() {
  await pool.query(sql);
  console.log("[editorial-sql] Editorial columns ensured.");
}

main()
  .then(async () => {
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
