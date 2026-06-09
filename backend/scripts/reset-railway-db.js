const { Client } = require("pg");

/**
 * DESTRUCTIVE: drops and recreates the `public` schema, deleting ALL data
 * (patients, appointments, payments, documents). There is no undo.
 *
 * Guards:
 *   1. Requires the explicit `--yes-i-mean-it` flag.
 *   2. Prints the target host and requires CONFIRM_DB_HOST to match it,
 *      so you cannot run it against a database you didn't name out loud.
 *
 * Usage:
 *   CONFIRM_DB_HOST=<host> node scripts/reset-railway-db.js --yes-i-mean-it
 */

function hostFromConnectionString(connectionString) {
  try {
    return new URL(connectionString).host;
  } catch {
    return null;
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  if (!process.argv.includes("--yes-i-mean-it")) {
    throw new Error(
      "Refusing to reset: pass --yes-i-mean-it to confirm this DESTRUCTIVE operation.",
    );
  }

  const host = hostFromConnectionString(connectionString);
  if (!host) {
    throw new Error("Could not parse host from DATABASE_URL");
  }

  const confirmHost = process.env.CONFIRM_DB_HOST;
  if (confirmHost !== host) {
    throw new Error(
      `Refusing to reset: set CONFIRM_DB_HOST="${host}" to confirm the target database. ` +
        `(got CONFIRM_DB_HOST="${confirmHost ?? ""}")`,
    );
  }

  console.warn(`\n!! DROPPING ALL DATA on ${host} in 5 seconds. Ctrl-C to abort. !!\n`);
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const client = new Client({ connectionString });
  await client.connect();
  await client.query(
    "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;",
  );
  await client.end();
  console.log(`Database schema reset complete on ${host}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
