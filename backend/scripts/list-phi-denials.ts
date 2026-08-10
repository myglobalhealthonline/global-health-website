/**
 * PHI Access Recovery Plan (docs/plans/security/phi-access-recovery-plan-2026-07-17.md)
 * Task 6 — preview would-be denials across the system before flipping
 * `MEDICAL_ACCESS_ENFORCE` from shadow to enforce.
 *
 * `guardMedicalRead` never blocks in shadow mode (the default) — a deny
 * decision is logged as `MedicalAccessLog.isAbnormal=true` with
 * `abnormalReason=<denyReason>` and the caller proceeds anyway. This script
 * lists those rows, grouped by `abnormalReason`, so the owner can see what
 * WOULD start 403'ing once enforcement is turned on, before anyone is
 * actually locked out.
 *
 * Task D (alerting) — 193 DOCTOR_NO_VALID_ACCESS_PATH denials accumulated
 * silently since 2026-07-17. Pass --alert-only to run this as a scheduled
 * check: it suppresses the full per-row dump and instead prints one summary
 * line, exiting non-zero when any DOCTOR_NO_VALID_ACCESS_PATH denial falls
 * inside the window. Wire into `mcp__scheduled-tasks` or a cron/schtask
 * runner; a non-zero exit is the signal, this script does not send
 * notifications itself.
 *
 * Read-only. Never writes.
 *
 *   pnpm --filter backend exec tsx scripts/list-phi-denials.ts                    # last 7 days, default
 *   pnpm --filter backend exec tsx scripts/list-phi-denials.ts --days=30
 *   pnpm --filter backend exec tsx scripts/list-phi-denials.ts --role=DOCTOR
 *   pnpm --filter backend exec tsx scripts/list-phi-denials.ts --limit=20         # rows printed per reason group
 *   pnpm --filter backend exec tsx scripts/list-phi-denials.ts --alert-only --days=1   # scheduled check
 *
 * Run with --env-file=.env (P1000 gotcha — Prisma needs DATABASE_URL loaded
 * explicitly outside a few entrypoints).
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

function argNum(flag: string, fallback: number): number {
  const raw = process.argv.find((a) => a.startsWith(`--${flag}=`));
  if (!raw) return fallback;
  const n = Number(raw.slice(flag.length + 3));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
function argStr(flag: string): string | undefined {
  const raw = process.argv.find((a) => a.startsWith(`--${flag}=`));
  return raw ? raw.slice(flag.length + 3) : undefined;
}

const DAYS = argNum("days", 7);
const PER_REASON_LIMIT = argNum("limit", 10);
const ROLE_FILTER = argStr("role"); // DOCTOR | ADMIN | SUPER_ADMIN | LOCAL_ADMIN | STAFF
const ALERT_ONLY = process.argv.includes("--alert-only");
// The one reason this alert exists for: a doctor failing every access path
// is the silent-lockout signature from the 2026-07-17 incident. Other deny
// reasons (2FA required, confidentiality pending, etc.) are expected noise
// during rollout and don't need to page anyone.
const ALERT_REASON = "DOCTOR_NO_VALID_ACCESS_PATH";

async function main() {
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);

  const rows = await prisma.medicalAccessLog.findMany({
    where: {
      // A denial is any row carrying a deny reason — the guard does not
      // always set isAbnormal=true alongside it (observed live: break-glass
      // denials log abnormalReason with isAbnormal=false), so filter on the
      // reason, not the flag.
      abnormalReason: { not: null },
      createdAt: { gte: since },
      ...(ROLE_FILTER ? { accessedByRole: ROLE_FILTER } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      accessedByName: true,
      accessedByRole: true,
      accessedResourceType: true,
      accessAction: true,
      abnormalReason: true,
      globalHealthNumber: true,
      patientCountryFolder: true,
      createdAt: true,
    },
  });

  const byReason = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = row.abnormalReason ?? "(no reason recorded)";
    const list = byReason.get(key) ?? [];
    list.push(row);
    byReason.set(key, list);
  }

  if (ALERT_ONLY) {
    const flagged = byReason.get(ALERT_REASON) ?? [];
    if (flagged.length > 0) {
      console.error(
        `[list-phi-denials] ALERT: ${flagged.length} ${ALERT_REASON} denial(s) in the last ${DAYS}d` +
          `${ROLE_FILTER ? ` (role=${ROLE_FILTER})` : ""} — a doctor is failing every access path. ` +
          `Investigate via: pnpm --filter backend exec tsx scripts/list-phi-denials.ts --days=${DAYS} --role=DOCTOR`,
      );
      process.exitCode = 1;
    } else {
      console.log(
        `[list-phi-denials] OK: no ${ALERT_REASON} denials in the last ${DAYS}d${ROLE_FILTER ? ` (role=${ROLE_FILTER})` : ""}.`,
      );
    }
    return;
  }

  console.log(
    `[list-phi-denials] window=last ${DAYS}d${ROLE_FILTER ? ` role=${ROLE_FILTER}` : ""} total=${rows.length}\n`,
  );

  const sortedReasons = [...byReason.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [reason, group] of sortedReasons) {
    console.log(`- ${reason}: ${group.length}`);
    for (const row of group.slice(0, PER_REASON_LIMIT)) {
      console.log(
        `    ${row.createdAt.toISOString()}  ${row.accessedByRole.padEnd(11)} ${row.accessedByName ?? "?"}  ` +
          `${row.accessedResourceType}/${row.accessAction}  GHN=${row.globalHealthNumber ?? "-"}  folder=${row.patientCountryFolder ?? "-"}`,
      );
    }
    if (group.length > PER_REASON_LIMIT) {
      console.log(`    …and ${group.length - PER_REASON_LIMIT} more`);
    }
  }

  if (rows.length === 0) {
    console.log("No would-be denials in this window — safe to preview enforcement with no surprises found here.");
  }
}

main()
  .catch((err) => {
    console.error("[list-phi-denials] failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
