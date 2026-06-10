const bcrypt = require("bcryptjs");
const { Client } = require("pg");

async function main() {
  const email = process.argv[2];
  // Password comes from the environment, NOT argv — a CLI arg lands in shell
  // history and the process list (visible to other users via `ps`).
  const password = process.env.ADMIN_INIT_PASSWORD;
  const fullName = process.argv[3] || "Admin User";

  if (!email || !password) {
    throw new Error("Usage: ADMIN_INIT_PASSWORD=<password> node scripts/create-admin-user.js <email> [fullName]");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const result = await client.query(
    `
      INSERT INTO "User" ("id", "email", "passwordHash", "fullName", "role", "isActive", "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, $1, $2, $3, 'ADMIN', true, NOW(), NOW())
      ON CONFLICT ("email")
      DO UPDATE SET
        "passwordHash" = EXCLUDED."passwordHash",
        "fullName" = EXCLUDED."fullName",
        "role" = 'ADMIN',
        "isActive" = true,
        "updatedAt" = NOW()
      RETURNING "id", "email", "role", "isActive";
    `,
    [email.toLowerCase(), passwordHash, fullName],
  );
  await client.end();
  console.log(JSON.stringify(result.rows[0]));
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
