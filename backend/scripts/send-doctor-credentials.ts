import "dotenv/config";
import { mkdirSync, readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  COUNTRY_LANGUAGE,
  CREDENTIAL_FREE_VARIANTS,
  LANGUAGE_LABEL,
  PORTAL_URL,
  VARIANT_URL,
  WEBMAIL_URL,
  languageForCountry,
  renderCredentialEmail,
  type CredentialLang,
  type CredentialVariant,
} from "./doctor-credentials-copy.js";

/**
 * Sends each doctor their Global Health credentials, in the language of the
 * country they practise in, using the shared branded email template.
 *
 * Two variants, same roster and same credentials:
 *   --variant=portal        (default) sign in at myglobalhealth.online/login
 *   --variant=webmail                 sign in at webmail.migadu.com
 *   --variant=announcement            launch letter, carries BOTH credential
 *                                     blocks plus the 2FA notice
 *
 * Roster lives in scripts/data/doctor-credentials.json (gitignored — contains
 * plaintext mailbox passwords).
 *
 *   Dry run (default — renders + writes HTML previews, sends nothing):
 *     node --import tsx scripts/send-doctor-credentials.ts --variant=webmail
 *
 *   Single test send to yourself:
 *     node --import tsx scripts/send-doctor-credentials.ts --variant=webmail --send --limit=1 --test-to=you@example.com
 *
 *   Real send:
 *     node --import tsx scripts/send-doctor-credentials.ts --variant=webmail --send
 *
 * The sent-log is keyed per variant, so a completed portal run never blocks the
 * webmail run (and vice versa).
 *
 * Flags:
 *   --variant=NAME     portal (default) or webmail
 *   --send             actually deliver (default is dry run)
 *   --test-to=EMAIL    route every message to this address instead of the doctor
 *   --only=TEXT        only rows whose name or personal email contains TEXT
 *   --country=NAME     only rows for that country
 *   --lang=CODE        only rows resolving to that language
 *   --limit=N          cap the number of rows processed
 *   --from=EMAIL       override the sending mailbox (default: GMAIL_SEND_FROM)
 *   --reply-to=EMAIL   Reply-To header (default: the sending mailbox)
 *   --delay=MS         pause between sends (default 1500)
 *   --resend           ignore the sent-log and send again
 *   --allow-bad-domain send even if the mailbox is not @myglobalhealth.online
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROSTER = join(__dirname, "data", "doctor-credentials.json");
const OUT_DIR = join(__dirname, "out", "doctor-credentials");
const SENT_LOG = join(OUT_DIR, "sent-log.jsonl");

const MAILBOX_DOMAIN = "@myglobalhealth.online";

type RosterRow = {
  name: string;
  personalEmail: string;
  country: string;
  migaduEmail: string | null;
  migaduPassword: string | null;
  skipReason?: string;
};

// ---------------------------------------------------------------- args

const argv = process.argv.slice(2);
function flag(name: string): boolean {
  return argv.includes(`--${name}`);
}
function opt(name: string): string | undefined {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

const variant = (opt("variant") ?? "portal") as CredentialVariant;
if (!(variant in VARIANT_URL)) {
  console.error(`Unknown --variant=${variant}. Use: ${Object.keys(VARIANT_URL).join(", ")}`);
  process.exit(1);
}
const targetUrl = VARIANT_URL[variant];
const credentialFree = CREDENTIAL_FREE_VARIANTS.includes(variant);

const doSend = flag("send");
const testTo = opt("test-to");
const only = opt("only")?.toLowerCase();
const countryFilter = opt("country")?.toLowerCase();
const langFilter = opt("lang") as CredentialLang | undefined;
const limit = opt("limit") ? Number(opt("limit")) : undefined;
const fromOverride = opt("from");
const replyToOpt = opt("reply-to");
const delayMs = opt("delay") ? Number(opt("delay")) : 1500;
const resend = flag("resend");
const allowBadDomain = flag("allow-bad-domain");
const rosterPath = opt("roster") ? resolve(opt("roster")!) : DEFAULT_ROSTER;

// The `from` address is read from env at module-load time by config/env.ts, so
// the override has to be applied before the email modules are imported below.
if (fromOverride) process.env.GMAIL_SEND_FROM = fromOverride;

const fromAddress =
  process.env.GMAIL_SEND_FROM?.trim() || process.env.EMAIL_FROM?.trim() || "(unset)";
const replyTo = replyToOpt ?? (fromAddress !== "(unset)" ? fromAddress : undefined);

// ---------------------------------------------------------------- helpers

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function loadSentSet(): Set<string> {
  const sent = new Set<string>();
  if (!existsSync(SENT_LOG)) return sent;
  for (const line of readFileSync(SENT_LOG, "utf-8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line) as {
        migaduEmail?: string;
        ok?: boolean;
        testRun?: boolean;
        variant?: string;
      };
      // Test runs went to a test inbox, not the doctor — they must never mark
      // a doctor as already-contacted. Entries written before the webmail
      // variant existed carry no `variant` field and are portal sends.
      if (entry.ok && !entry.testRun && entry.migaduEmail) {
        sent.add(`${entry.variant ?? "portal"}:${entry.migaduEmail.toLowerCase()}`);
      }
    } catch {
      /* ignore malformed log lines */
    }
  }
  return sent;
}

function safeSlug(email: string): string {
  return email.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}

// ---------------------------------------------------------------- main

async function main() {
  // Imported lazily so the `--from` override above lands in process.env before
  // config/env.ts parses it at module-load time.
  const { sendEmail, isEmailConfigured } = await import("../src/lib/email/send-email.js");
  const { wrapHtml } = await import("../src/lib/email/templates.js");

  const roster = JSON.parse(readFileSync(rosterPath, "utf-8")) as RosterRow[];
  mkdirSync(OUT_DIR, { recursive: true });

  const unknownCountries = [
    ...new Set(roster.map((r) => r.country).filter((c) => !(c in COUNTRY_LANGUAGE))),
  ];

  const skipped: Array<{ name: string; reason: string }> = [];
  const queue: Array<{
    row: RosterRow;
    lang: CredentialLang;
    migaduEmail: string;
    migaduPassword: string;
    /** Sent-log identity. Falls back to the personal address for rows that
     *  have no mailbox (only reachable on credential-free variants). */
    logKey: string;
  }> = [];

  const seenPersonal = new Map<string, string>();
  const duplicatePersonal: string[] = [];

  for (const row of roster) {
    if (row.skipReason) {
      skipped.push({ name: row.name, reason: row.skipReason });
      continue;
    }
    if (!row.personalEmail?.includes("@")) {
      skipped.push({ name: row.name, reason: "Missing/invalid personal email" });
      continue;
    }
    // A notice that carries no password is still deliverable to a doctor whose
    // mailbox was never provisioned — the credential variants are not.
    if (!credentialFree) {
      if (!row.migaduEmail || !row.migaduPassword) {
        skipped.push({ name: row.name, reason: "Missing mailbox or password" });
        continue;
      }
      if (!row.migaduEmail.toLowerCase().endsWith(MAILBOX_DOMAIN) && !allowBadDomain) {
        skipped.push({
          name: row.name,
          reason: `Mailbox domain looks wrong: ${row.migaduEmail} (expected ${MAILBOX_DOMAIN})`,
        });
        continue;
      }
    }

    const prev = seenPersonal.get(row.personalEmail.toLowerCase());
    if (prev) duplicatePersonal.push(`${row.personalEmail} — ${prev} & ${row.name}`);
    else seenPersonal.set(row.personalEmail.toLowerCase(), row.name);

    const lang = languageForCountry(row.country);

    if (only && !`${row.name} ${row.personalEmail}`.toLowerCase().includes(only)) continue;
    if (countryFilter && row.country.toLowerCase() !== countryFilter) continue;
    if (langFilter && lang !== langFilter) continue;

    queue.push({
      row,
      lang,
      migaduEmail: row.migaduEmail ?? "",
      migaduPassword: row.migaduPassword ?? "",
      logKey: (row.migaduEmail ?? row.personalEmail).toLowerCase(),
    });
  }

  const alreadySent = resend ? new Set<string>() : loadSentSet();
  const pending = queue.filter((q) => !alreadySent.has(`${variant}:${q.logKey}`));
  const skippedAsSent = queue.length - pending.length;
  const batch = limit ? pending.slice(0, limit) : pending;

  // ------------------------------------------------------------ preflight

  console.log("");
  console.log("  Global Health — doctor credentials mailout");
  console.log("  ------------------------------------------------------------");
  console.log(`  roster        : ${rosterPath}`);
  console.log(`  variant       : ${variant}`);
  console.log(`  mode          : ${doSend ? "SEND (live)" : "DRY RUN (nothing sent)"}`);
  console.log(`  from          : ${fromAddress}`);
  console.log(`  reply-to      : ${replyTo ?? "(none)"}`);
  console.log(`  transport     : ${isEmailConfigured() ? "configured" : "NOT CONFIGURED — would only log"}`);
  console.log(`  target url    : ${targetUrl}`);
  if (testTo) console.log(`  test-to       : ${testTo}  (doctors will NOT receive anything)`);
  console.log(`  rows in file  : ${roster.length}`);
  console.log(`  to send now   : ${batch.length}${skippedAsSent ? ` (${skippedAsSent} already sent this variant)` : ""}`);
  console.log("");

  if (unknownCountries.length) {
    console.log(`  ! country without a language mapping → falls back to English: ${unknownCountries.join(", ")}`);
  }
  if (duplicatePersonal.length) {
    console.log("  ! duplicate personal email addresses (each gets one email per row):");
    for (const d of duplicatePersonal) console.log(`      ${d}`);
  }
  if (skipped.length) {
    console.log(`  ! skipped ${skipped.length} row(s):`);
    for (const s of skipped) console.log(`      ${s.name} — ${s.reason}`);
  }
  console.log("");

  const byLang = new Map<CredentialLang, number>();
  for (const q of batch) byLang.set(q.lang, (byLang.get(q.lang) ?? 0) + 1);
  console.log("  language breakdown:");
  for (const [lang, count] of [...byLang.entries()].sort()) {
    console.log(`      ${LANGUAGE_LABEL[lang].padEnd(20)} ${String(count).padStart(3)}`);
  }
  console.log("");

  // ------------------------------------------------------------ render + send

  let sentOk = 0;
  let failed = 0;

  for (const [index, item] of batch.entries()) {
    const rendered = renderCredentialEmail({
      name: item.row.name,
      lang: item.lang,
      variant,
      loginEmail: item.migaduEmail,
      loginPassword: item.migaduPassword,
      url: targetUrl,
      portalUrl: PORTAL_URL,
      webmailUrl: WEBMAIL_URL,
      country: item.row.country,
    });
    const html = wrapHtml(rendered.title, rendered.bodyHtml);
    const recipient = testTo ?? item.row.personalEmail;
    const position = `${String(index + 1).padStart(3)}/${batch.length}`;

    if (!doSend) {
      const previewPath = join(
        OUT_DIR,
        `${variant}-${item.lang}-${safeSlug(item.logKey)}.html`,
      );
      writeFileSync(previewPath, html, "utf-8");
      console.log(`  ${position}  [dry] ${item.lang.padEnd(5)} → ${recipient}  (${item.row.name})`);
      continue;
    }

    const result = await sendEmail({
      to: recipient,
      subject: rendered.subject,
      html,
      text: rendered.text,
      ...(replyTo ? { replyTo } : {}),
    });

    const ok = result.ok === true;
    if (ok) sentOk += 1;
    else failed += 1;

    const detail = ok
      ? `mode=${(result as { mode: string }).mode}`
      : `ERROR: ${(result as { message: string }).message}`;
    console.log(`  ${position}  ${ok ? "sent" : "FAIL"} ${item.lang.padEnd(5)} → ${recipient}  (${item.row.name})  ${detail}`);

    appendFileSync(
      SENT_LOG,
      JSON.stringify({
        at: new Date().toISOString(),
        variant,
        name: item.row.name,
        country: item.row.country,
        lang: item.lang,
        to: recipient,
        migaduEmail: item.logKey,
        testRun: Boolean(testTo),
        ok,
        detail,
      }) + "\n",
      "utf-8",
    );

    if (index < batch.length - 1 && delayMs > 0) await sleep(delayMs);
  }

  console.log("");
  if (doSend) {
    console.log(`  done — ${sentOk} sent, ${failed} failed. Log: ${SENT_LOG}`);
  } else {
    console.log(`  dry run complete — ${batch.length} previews written to ${OUT_DIR}`);
    console.log("  add --send to deliver for real.");
  }
  console.log("");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
