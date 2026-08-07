import "dotenv/config";

import { Pool } from "pg";

/**
 * Phase-1 membership DDL preflight, for a human at a terminal:
 *
 *   node --env-file=.env.dev --import tsx scripts/membership-ddl-check.ts
 *
 * Proves that migration `20260807120100_membership_plans` actually landed its
 * raw-SQL section — the composite FKs, the §3.3 CHECK invariants and the three
 * partial / expression unique indexes that Prisma cannot express and that
 * therefore have no other test covering them.
 *
 * Existence alone is not enough, so each rule is also exercised with a row that
 * must be rejected. That is how the NULL hole in the original
 * `MembershipBenefit_value_matches_type` was caught: a CHECK only rejects on
 * FALSE, and the first draft evaluated to NULL (which passes) for an ALLOWANCE
 * row with no allowanceCount.
 *
 * SAFETY: this script needs no `--apply` flag because it never keeps a write.
 * Every INSERT runs inside a transaction that ends in ROLLBACK, and the
 * behavioural section refuses to start unless the membership tables are empty.
 * Read-only against any database, including production.
 */

const EXPECTED_CONSTRAINTS = [
  "MembershipLevel_plan_country_fkey",
  "MembershipBenefit_service_country_fkey",
  "MembershipEnrollment_level_country_fkey",
  "MembershipBenefit_target_exactly_one",
  "MembershipBenefit_kind_consultations_only",
  "MembershipBenefit_value_matches_type",
  "MembershipBenefit_fallback_allowance_only",
  "MembershipEnrollment_dependent_has_primary",
  "MembershipEnrollment_term_dates_ordered",
  // Phase 6 (§11.7) — the goodwill override's two invariants.
  "OrderItem_membership_override_needs_benefit",
  "OrderItem_membership_override_spends_no_allowance",
];

const EXPECTED_INDEXES = [
  "MembershipLevel_one_default_per_plan",
  "MembershipEnrollment_plan_email_active_key",
  "MembershipEnrollment_membershipId_lower_key",
];

const MEMBERSHIP_TABLES = [
  "MembershipUsageLedger",
  "MembershipAllowanceBalance",
  "MembershipInviteLog",
  "MembershipEnrollment",
  "MembershipImportBatch",
  "MembershipBenefit",
  "MembershipLevelTranslation",
  "MembershipLevel",
  "MembershipPlanTranslation",
  "MembershipPlan",
];

let failures = 0;

function check(label: string, ok: boolean, detail = ""): void {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

type Client = Awaited<ReturnType<Pool["connect"]>>;

/** Run `sql` inside a savepoint and assert the database refused it. */
async function expectReject(
  client: Client,
  label: string,
  sql: string,
  params: unknown[],
): Promise<void> {
  await client.query("SAVEPOINT s");
  try {
    await client.query(sql, params);
    await client.query("ROLLBACK TO SAVEPOINT s");
    check(label, false, "row was ACCEPTED");
  } catch (error) {
    await client.query("ROLLBACK TO SAVEPOINT s");
    const constraint = (error as { constraint?: string }).constraint;
    check(label, true, `rejected by ${constraint ?? "the database"}`);
  }
}

/**
 * The two §11.7 override CHECKs live on `OrderItem`, not on a membership table,
 * so they are exercised here rather than in the fixture block below — that block
 * bails out the moment ANY membership table holds a row, which is true of every
 * database worth checking. Asserting only their existence, or asserting their
 * behaviour behind that bail-out, would leave them unproven exactly where it
 * matters and let a passing run be cited as evidence they hold.
 *
 * Nothing is inserted: an existing row is UPDATEd inside a savepoint, and the
 * whole block rolls back.
 */
async function checkOverrideConstraints(client: Client): Promise<void> {
  await client.query("BEGIN");
  try {
    const row = await client.query<{ id: string }>(`SELECT id FROM "OrderItem" LIMIT 1`);
    const orderItemId = row.rows[0]?.id;
    if (!orderItemId) throw new Error("no OrderItem row to exercise the override CHECKs against");

    await expectReject(
      client,
      "override reason with no benefit row behind it",
      `UPDATE "OrderItem"
          SET "membershipOverrideReason" = 'ddl-check',
              "membershipBenefitId" = NULL
        WHERE id = $1`,
      [orderItemId],
    );

    await expectReject(
      client,
      "override reason together with a spent allowance unit",
      `UPDATE "OrderItem"
          SET "membershipOverrideReason" = 'ddl-check',
              "membershipBenefitId" = 'ddlchk_benefit',
              "membershipAllowanceUsed" = true
        WHERE id = $1`,
      [orderItemId],
    );

    // …and not so tight that a legitimate override bounces.
    await client.query(
      `UPDATE "OrderItem"
          SET "membershipOverrideReason" = 'ddl-check',
              "membershipBenefitId" = 'ddlchk_benefit',
              "membershipAllowanceUsed" = false
        WHERE id = $1`,
      [orderItemId],
    );
    check("valid override (reason + benefit, no allowance unit) accepted", true);
  } catch (error) {
    check("override CHECK behaviour", false, error instanceof Error ? error.message : String(error));
  } finally {
    await client.query("ROLLBACK");
  }
}

/**
 * The membership-table fixtures. Its own function because the "database already
 * holds memberships" bail-out below is a `return`: while this lived inline in
 * `main`, that return skipped `client.release()` / `pool.end()`, so on any
 * populated database the script hung with an open pool and never printed its
 * own PASS/FAIL summary — the run looked like a timeout rather than a result.
 */
async function checkMembershipFixtures(client: Client): Promise<void> {
  await client.query("BEGIN");
  try {
    // Refuse to write fixtures into a database that already holds real
    // memberships, even though everything below is rolled back.
    for (const table of MEMBERSHIP_TABLES) {
      const count = await client.query<{ n: number }>(`SELECT count(*)::int AS n FROM "${table}"`);
      if (count.rows[0].n !== 0) {
        check(
          "behavioural checks",
          false,
          `skipped: ${table} holds ${count.rows[0].n} row(s); run this against an empty membership schema`,
        );
        return;
      }
    }

    const country = await client.query<{ id: string }>(
      `SELECT id FROM "Country" WHERE code = 'ie' LIMIT 1`,
    );
    const countryId = country.rows[0]?.id;
    if (!countryId) throw new Error("no 'ie' country row to test against");

    const service = await client.query<{ id: string }>(
      `SELECT id FROM "Service" WHERE "countryId" = $1 AND kind = 'GENERAL' LIMIT 1`,
      [countryId],
    );
    const foreignService = await client.query<{ id: string; countryId: string }>(
      `SELECT id, "countryId" FROM "Service" WHERE "countryId" <> $1 AND kind = 'GENERAL' LIMIT 1`,
      [countryId],
    );
    if (!service.rows[0] || !foreignService.rows[0]) {
      throw new Error("need one GENERAL service in 'ie' and one in another country");
    }
    const serviceId = service.rows[0].id;
    const foreignServiceId = foreignService.rows[0].id;
    const foreignCountryId = foreignService.rows[0].countryId;

    const planId = "ddlchk_plan";
    const levelId = "ddlchk_level";
    await client.query(
      `INSERT INTO "MembershipPlan" ("id","countryId","slug","name","updatedAt")
       VALUES ($1,$2,'ddl-check','DDL check',now())`,
      [planId, countryId],
    );
    await client.query(
      `INSERT INTO "MembershipLevel" ("id","planId","countryId","slug","name","isDefault","updatedAt")
       VALUES ($1,$2,$3,'default','Default',true,now())`,
      [levelId, planId, countryId],
    );
    check("baseline plan + default level insert", true);

    await expectReject(
      client,
      "second default level per plan",
      `INSERT INTO "MembershipLevel" ("id","planId","countryId","slug","name","isDefault","updatedAt")
       VALUES ('ddlchk_level2',$1,$2,'second','Second',true,now())`,
      [planId, countryId],
    );

    await expectReject(
      client,
      "level in a different country than its plan",
      `INSERT INTO "MembershipLevel" ("id","planId","countryId","slug","name","updatedAt")
       VALUES ('ddlchk_level3',$1,$2,'wrong-country','Wrong',now())`,
      [planId, foreignCountryId],
    );

    await expectReject(
      client,
      "benefit targeting both a kind and a service",
      `INSERT INTO "MembershipBenefit" ("id","levelId","countryId","serviceKind","serviceId","benefitType","percentOff","updatedAt")
       VALUES ('ddlchk_b1',$1,$2,'GENERAL',$3,'PERCENT',20,now())`,
      [levelId, countryId, serviceId],
    );

    await expectReject(
      client,
      "benefit targeting neither",
      `INSERT INTO "MembershipBenefit" ("id","levelId","countryId","benefitType","percentOff","updatedAt")
       VALUES ('ddlchk_b2',$1,$2,'PERCENT',20,now())`,
      [levelId, countryId],
    );

    await expectReject(
      client,
      "benefit on a non-consultation kind",
      `INSERT INTO "MembershipBenefit" ("id","levelId","countryId","serviceKind","benefitType","percentOff","updatedAt")
       VALUES ('ddlchk_b3',$1,$2,'HEALTH_TEST','PERCENT',20,now())`,
      [levelId, countryId],
    );

    await expectReject(
      client,
      "PERCENT benefit over 100",
      `INSERT INTO "MembershipBenefit" ("id","levelId","countryId","serviceKind","benefitType","percentOff","updatedAt")
       VALUES ('ddlchk_b4',$1,$2,'GENERAL','PERCENT',120,now())`,
      [levelId, countryId],
    );

    await expectReject(
      client,
      "ALLOWANCE benefit with no count",
      `INSERT INTO "MembershipBenefit" ("id","levelId","countryId","serviceKind","benefitType","updatedAt")
       VALUES ('ddlchk_b5',$1,$2,'GENERAL','ALLOWANCE',now())`,
      [levelId, countryId],
    );

    await expectReject(
      client,
      "PERCENT benefit with a NULL percentOff",
      `INSERT INTO "MembershipBenefit" ("id","levelId","countryId","serviceKind","benefitType","updatedAt")
       VALUES ('ddlchk_b6',$1,$2,'GENERAL','PERCENT',now())`,
      [levelId, countryId],
    );

    await expectReject(
      client,
      "ALLOWANCE benefit whose PERCENT fallback has no percent",
      `INSERT INTO "MembershipBenefit" ("id","levelId","countryId","serviceKind","benefitType","allowanceCount","fallbackType","updatedAt")
       VALUES ('ddlchk_b7',$1,$2,'GENERAL','ALLOWANCE',4,'PERCENT',now())`,
      [levelId, countryId],
    );

    await expectReject(
      client,
      "fallback on a PERCENT (non-allowance) benefit",
      `INSERT INTO "MembershipBenefit" ("id","levelId","countryId","serviceKind","benefitType","percentOff","fallbackType","fallbackPercent","updatedAt")
       VALUES ('ddlchk_b8',$1,$2,'GENERAL','PERCENT',20,'PERCENT',10,now())`,
      [levelId, countryId],
    );

    await expectReject(
      client,
      "benefit pinned to another country's service",
      `INSERT INTO "MembershipBenefit" ("id","levelId","countryId","serviceId","benefitType","percentOff","updatedAt")
       VALUES ('ddlchk_b9',$1,$2,$3,'PERCENT',20,now())`,
      [levelId, countryId, foreignServiceId],
    );

    // The constraints must not be so tight that valid configuration bounces.
    await client.query(
      `INSERT INTO "MembershipBenefit" ("id","levelId","countryId","serviceKind","benefitType","allowanceCount","fallbackType","fallbackPercent","updatedAt")
       VALUES ('ddlchk_ok1',$1,$2,'GENERAL','ALLOWANCE',4,'PERCENT',20,now())`,
      [levelId, countryId],
    );
    await client.query(
      `INSERT INTO "MembershipBenefit" ("id","levelId","countryId","serviceId","benefitType","fixedPriceCents","updatedAt")
       VALUES ('ddlchk_ok2',$1,$2,$3,'FIXED',4500,now())`,
      [levelId, countryId, serviceId],
    );
    check("valid allowance-with-fallback + fixed-service benefits accepted", true);

    await client.query(
      `INSERT INTO "MembershipEnrollment"
         ("id","planId","levelId","countryId","membershipId","email","firstName","lastName","startDate","updatedAt")
       VALUES ('ddlchk_e1',$1,$2,$3,'MEM-001','a@example.test','A','One',now(),now())`,
      [planId, levelId, countryId],
    );

    await expectReject(
      client,
      "membership id differing only in case",
      `INSERT INTO "MembershipEnrollment"
         ("id","planId","levelId","countryId","membershipId","email","firstName","lastName","startDate","updatedAt")
       VALUES ('ddlchk_e2',$1,$2,$3,'mem-001','b@example.test','B','Two',now(),now())`,
      [planId, levelId, countryId],
    );

    await expectReject(
      client,
      "same email twice in one plan (case-insensitive)",
      `INSERT INTO "MembershipEnrollment"
         ("id","planId","levelId","countryId","membershipId","email","firstName","lastName","startDate","updatedAt")
       VALUES ('ddlchk_e3',$1,$2,$3,'MEM-002','A@Example.test','A','One',now(),now())`,
      [planId, levelId, countryId],
    );

    await expectReject(
      client,
      "dependent without a primary",
      `INSERT INTO "MembershipEnrollment"
         ("id","planId","levelId","countryId","membershipId","email","firstName","lastName","memberType","startDate","updatedAt")
       VALUES ('ddlchk_e4',$1,$2,$3,'MEM-003','c@example.test','C','Three','DEPENDENT',now(),now())`,
      [planId, levelId, countryId],
    );

    await expectReject(
      client,
      "endDate before startDate",
      `INSERT INTO "MembershipEnrollment"
         ("id","planId","levelId","countryId","membershipId","email","firstName","lastName","startDate","endDate","updatedAt")
       VALUES ('ddlchk_e5',$1,$2,$3,'MEM-004','d@example.test','D','Four',now(),now() - interval '1 day',now())`,
      [planId, levelId, countryId],
    );

    // A soft-deleted row must not block re-adding that person (§8.2 revive).
    await client.query(`UPDATE "MembershipEnrollment" SET status = 'REMOVED' WHERE id = 'ddlchk_e1'`);
    await client.query(
      `INSERT INTO "MembershipEnrollment"
         ("id","planId","levelId","countryId","membershipId","email","firstName","lastName","startDate","updatedAt")
       VALUES ('ddlchk_e6',$1,$2,$3,'MEM-005','a@example.test','A','One',now(),now())`,
      [planId, levelId, countryId],
    );
    check("re-add of an email whose old row is REMOVED", true);
  } catch (error) {
    check("behavioural checks", false, error instanceof Error ? error.message : String(error));
  } finally {
    await client.query("ROLLBACK");
  }
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ connectionString, max: 1 });
  const client = await pool.connect();

  const constraints = await client.query<{ conname: string }>(
    `SELECT conname FROM pg_constraint WHERE conname = ANY($1)`,
    [EXPECTED_CONSTRAINTS],
  );
  const foundConstraints = new Set(constraints.rows.map((row) => row.conname));
  for (const name of EXPECTED_CONSTRAINTS) {
    check(`constraint ${name}`, foundConstraints.has(name));
  }

  const indexes = await client.query<{ indexname: string }>(
    `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname = ANY($1)`,
    [EXPECTED_INDEXES],
  );
  const foundIndexes = new Set(indexes.rows.map((row) => row.indexname));
  for (const name of EXPECTED_INDEXES) {
    check(`index ${name}`, foundIndexes.has(name));
  }

  await checkOverrideConstraints(client);
  await checkMembershipFixtures(client);

  client.release();
  await pool.end();
  console.log(failures === 0 ? "\nALL DDL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
