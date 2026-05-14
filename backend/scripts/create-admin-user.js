const bcrypt = require("bcryptjs");
const { Client } = require("pg");

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const fullName = process.argv[4] || "Admin User";

  if (!email || !password) {
    throw new Error("Usage: node scripts/create-admin-user.js <email> <password> [fullName]");
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
