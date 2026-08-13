import { join } from "node:path";
import fs from "node:fs";
import { config as loadEnv } from "dotenv";

loadEnv({ path: join(__dirname, "..", ".env") });

/**
 * One-off: welcome every existing patient onto the new platform over WhatsApp,
 * each with their own single-use set-password link, in the language of the
 * country on their contact record.
 *
 * Two phases, deliberately separate — tokens are issued and reviewed BEFORE a
 * single message leaves the building.
 *
 *   1) prepare — ensure a PATIENT account exists for every CSV row, issue an
 *      invite token, write <out>.csv with ResetLink + Locale + Status.
 *   2) send    — read <out>.csv and deliver, 15 messages per minute, appending
 *      every attempt to <out>.sent.jsonl so a re-run never double-sends.
 *
 * Usage (dry by default — nothing is written or sent without --live):
 *
 *   node --import tsx scripts/patient-platform-invite.ts prepare \
 *     --in  "C:/Users/nauma/Downloads/contacts_simple.csv" \
 *     --out "C:/Users/nauma/Downloads/contacts_invites.csv"
 *   node --import tsx scripts/patient-platform-invite.ts prepare --in … --out … --live
 *
 *   node --import tsx scripts/patient-platform-invite.ts test --live
 *   node --import tsx scripts/patient-platform-invite.ts send --out … --live
 *   node --import tsx scripts/patient-platform-invite.ts send --out … --live --limit 20
 *
 * SAFETY NOTES
 *   - The link IS the credential. Anyone holding it can set that account's
 *     password. <out>.csv is a secrets file: keep it out of the repo, off
 *     shared drives, and delete it once the run is done.
 *   - `test` sends to TEST_PHONE only and uses a placeholder token, so no live
 *     invite ever sits clickable in a staff handset.
 *   - Sends here bypass the shared 6 s WaSender lock in
 *     src/lib/whatsapp/wasender.ts on purpose (account protection is off for
 *     this run) by posting directly. The shared lock is left untouched so
 *     every other caller in the app keeps its 6 s floor.
 */

const TEST_PHONE = "+923008400763";
const SITE_URL = "https://www.myglobalhealth.online";
const LOGIN_URL = `${SITE_URL}/login`;
const SUPPORT_EMAIL = "globalhealth@myglobalhealth.online";
const PLACEHOLDER_TOKEN = "TEST-TOKEN-NOT-A-REAL-INVITE";

/** 15 messages per minute. */
const SEND_GAP_MS = 4000;
/** Long TTL — the link must still work whenever the patient gets round to it. */
const INVITE_TTL_MINUTES = 365 * 24 * 60;

type Locale = "en" | "pt" | "es" | "cs" | "ro";

/**
 * Country (as spelled in the contacts export) → message language.
 * Anything not listed falls back to English, per the brief.
 */
const COUNTRY_LOCALE: Record<string, Locale> = {
  ireland: "en",
  portugal: "pt",
  brazil: "pt",
  angola: "pt",
  "guinea-bissau": "pt",
  "guinea bissau": "pt",
  mozambique: "pt",
  "cape verde": "pt",
  spain: "es",
  chile: "es",
  "costa rica": "es",
  colombia: "es",
  argentina: "es",
  mexico: "es",
  venezuela: "es",
  peru: "es",
  czechia: "cs",
  "czech republic": "cs",
  slovakia: "cs",
  romania: "ro",
  moldova: "ro",
};

/**
 * Country → ISO hint for phone normalization. Only consulted when a number
 * arrives without a "+" prefix; the export is already E.164 for almost every
 * row, so this is a safety net rather than the main path.
 */
const COUNTRY_ISO: Record<string, string> = {
  ireland: "ie",
  portugal: "pt",
  spain: "es",
  czechia: "cz",
  "czech republic": "cz",
  romania: "ro",
  brazil: "br",
  "united kingdom": "uk",
  pakistan: "pk",
  malta: "mt",
};

/** Obvious test/junk rows that must never be contacted. */
const EXCLUDED_EMAILS = new Set([
  "test@example.com",
  "nom@gmail.com",
  "anna234@gmail.com",
  "noah@gina.com",
  "zimewulobo@mailinator.com",
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

// ---------------------------------------------------------------- messages --

type Copy = {
  greeting: (name: string) => string;
  body: string;
  emailLabel: string;
  linkLabel: string;
  loginLabel: string;
};

const COPY: Record<Locale, Copy> = {
  en: {
    greeting: (n) => `Hi ${n}`,
    body: `We're excited to welcome you to the new My Global Health platform:
${SITE_URL}/

Our new platform makes it easier to access healthcare, book online consultations, manage appointments, and securely view your health information, all in one place.

Your account has already been created using the following email address:`,
    emailLabel: "Registered Email",
    linkLabel: `To activate your account and create a secure password, please use the link below:
Set/Reset Password`,
    loginLabel: `Once your password has been created, you can log in here:
Login: ${LOGIN_URL}

Welcome to My Global Health — Medicine Anytime, Anywhere.

Need assistance? Simply reply to this message or contact us at:
${SUPPORT_EMAIL}
Our team will be happy to help.`,
  },
  pt: {
    greeting: (n) => `Olá ${n}`,
    body: `Temos o prazer de lhe dar as boas-vindas à nova plataforma My Global Health:
${SITE_URL}/

A nossa nova plataforma facilita o acesso a cuidados de saúde, a marcação de consultas online, a gestão das suas marcações e a consulta segura da sua informação de saúde, tudo num só lugar.

A sua conta já foi criada com o seguinte endereço de email:`,
    emailLabel: "Email registado",
    linkLabel: `Para ativar a sua conta e criar uma palavra-passe segura, utilize a ligação abaixo:
Definir/Repor palavra-passe`,
    loginLabel: `Depois de criar a palavra-passe, pode iniciar sessão aqui:
Iniciar sessão: ${LOGIN_URL}

Bem-vindo à My Global Health — Medicina a qualquer hora, em qualquer lugar.

Precisa de ajuda? Basta responder a esta mensagem ou contactar-nos através de:
${SUPPORT_EMAIL}
A nossa equipa terá todo o gosto em ajudar.`,
  },
  es: {
    greeting: (n) => `Hola ${n}`,
    body: `Nos complace darle la bienvenida a la nueva plataforma My Global Health:
${SITE_URL}/

Nuestra nueva plataforma facilita el acceso a la atención sanitaria, la reserva de consultas en línea, la gestión de sus citas y la consulta segura de su información de salud, todo en un mismo lugar.

Su cuenta ya ha sido creada con la siguiente dirección de correo electrónico:`,
    emailLabel: "Correo registrado",
    linkLabel: `Para activar su cuenta y crear una contraseña segura, utilice el enlace que aparece a continuación:
Establecer/Restablecer contraseña`,
    loginLabel: `Una vez creada su contraseña, puede iniciar sesión aquí:
Iniciar sesión: ${LOGIN_URL}

Bienvenido a My Global Health — Medicina en cualquier momento y en cualquier lugar.

¿Necesita ayuda? Responda a este mensaje o escríbanos a:
${SUPPORT_EMAIL}
Nuestro equipo estará encantado de ayudarle.`,
  },
  cs: {
    greeting: (n) => `Dobrý den ${n}`,
    body: `S radostí vás vítáme na nové platformě My Global Health:
${SITE_URL}/

Naše nová platforma usnadňuje přístup ke zdravotní péči, objednávání online konzultací, správu termínů a bezpečné zobrazení vašich zdravotních informací — vše na jednom místě.

Váš účet již byl vytvořen s touto e-mailovou adresou:`,
    emailLabel: "Registrovaný e-mail",
    linkLabel: `Pro aktivaci účtu a vytvoření bezpečného hesla použijte prosím odkaz níže:
Nastavit/obnovit heslo`,
    loginLabel: `Jakmile si heslo vytvoříte, můžete se přihlásit zde:
Přihlášení: ${LOGIN_URL}

Vítejte v My Global Health — medicína kdykoli a kdekoli.

Potřebujete pomoc? Stačí odpovědět na tuto zprávu nebo nás kontaktovat na:
${SUPPORT_EMAIL}
Náš tým vám rád pomůže.`,
  },
  ro: {
    greeting: (n) => `Bună ziua ${n}`,
    body: `Ne bucurăm să vă urăm bun venit pe noua platformă My Global Health:
${SITE_URL}/

Noua noastră platformă vă permite să accesați mai ușor serviciile medicale, să programați consultații online, să vă gestionați programările și să vă consultați în siguranță informațiile medicale, totul într-un singur loc.

Contul dumneavoastră a fost deja creat folosind următoarea adresă de e-mail:`,
    emailLabel: "E-mail înregistrat",
    linkLabel: `Pentru a vă activa contul și a crea o parolă sigură, vă rugăm să folosiți linkul de mai jos:
Setare/Resetare parolă`,
    loginLabel: `După ce v-ați creat parola, vă puteți autentifica aici:
Autentificare: ${LOGIN_URL}

Bun venit la My Global Health — Medicină oricând, oriunde.

Aveți nevoie de asistență? Răspundeți la acest mesaj sau contactați-ne la:
${SUPPORT_EMAIL}
Echipa noastră vă stă cu plăcere la dispoziție.`,
  },
};

function buildMessage(locale: Locale, name: string, email: string, link: string): string {
  const c = COPY[locale];
  return `${c.greeting(name)}

${c.body}

${c.emailLabel}: ${email}

${c.linkLabel}: ${link}

${c.loginLabel}`;
}

// -------------------------------------------------------------- csv helpers --

/** Minimal RFC4180 parser — the export has quoted fields with commas in them. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") field += ch;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function writeCsv(path: string, header: string[], rows: string[][]): void {
  const body = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  fs.writeFileSync(path, `\uFEFF${body}\r\n`, "utf8");
}

// ------------------------------------------------------------------- args ---

const argv = process.argv.slice(2);
const command = argv.find((a) => !a.startsWith("--")) ?? "";
const LIVE = argv.includes("--live");

function flag(name: string, fallback = ""): string {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? (argv[i + 1] ?? fallback) : fallback;
}

function numFlag(name: string, fallback: number): number {
  const raw = flag(name);
  const n = Number(raw);
  return raw && Number.isFinite(n) ? n : fallback;
}

const log = (m: string): void => console.log(`[invite] ${m}`);

// ---------------------------------------------------------------- prepare ---

const OUT_HEADER = [
  "Name",
  "Email",
  "Phone",
  "Country",
  "Locale",
  "ResetLink",
  "AccountStatus",
  "Sendable",
  "Note",
] as const;

function localeFor(country: string): Locale {
  return COUNTRY_LOCALE[country.trim().toLowerCase()] ?? "en";
}

async function prepare(): Promise<void> {
  const inPath = flag("in");
  const outPath = flag("out");
  if (!inPath || !outPath) throw new Error("prepare needs --in <csv> and --out <csv>");

  const { prisma } = await import("../src/db/prisma.js");
  const { issuePasswordResetToken } = await import("../src/modules/auth/auth.service.js");
  const { normalizePhoneForWhatsApp, isPlaceholderWhatsAppNumber } = await import(
    "../src/lib/whatsapp/normalize-phone.js"
  );
  const bcrypt = (await import("bcryptjs")).default;
  const { randomBytes } = await import("node:crypto");

  const rows = parseCsv(fs.readFileSync(inPath, "utf8").replace(/^\uFEFF/, ""));
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (n: string): number => header.indexOf(n);
  const iName = col("name");
  const iEmail = col("email");
  const iPhone = col("phone");
  const iCountry = col("country");
  if (iName < 0 || iEmail < 0 || iPhone < 0) {
    throw new Error(`--in must have Name,Email,Phone,Country columns (got: ${header.join(",")})`);
  }

  const out: string[][] = [];
  const seenEmail = new Set<string>();
  const phoneCount = new Map<string, number>();
  const tally = {
    total: 0,
    sendable: 0,
    created: 0,
    existing: 0,
    dupEmail: 0,
    badEmail: 0,
    badPhone: 0,
    excluded: 0,
    notPatient: 0,
    inactive: 0,
    phoneRecovered: 0,
  };

  for (const r of rows.slice(1)) {
    tally.total += 1;
    const name = (r[iName] ?? "").trim();
    const email = (r[iEmail] ?? "").trim().toLowerCase();
    const phoneRaw = (r[iPhone] ?? "").trim();
    const country = (iCountry >= 0 ? (r[iCountry] ?? "") : "").trim();
    const locale = localeFor(country);

    // Set once the number is resolved — the output CSV must carry the number
    // we will actually dial, not the (sometimes empty) one from the export.
    let outPhone = phoneRaw;
    const push = (status: string, link: string, sendable: boolean, note: string): void => {
      out.push([name, email, outPhone, country, locale, link, status, sendable ? "yes" : "no", note]);
      if (sendable) tally.sendable += 1;
    };

    if (!EMAIL_RE.test(email)) {
      tally.badEmail += 1;
      push("skipped", "", false, "invalid email address");
      continue;
    }
    if (EXCLUDED_EMAILS.has(email)) {
      tally.excluded += 1;
      push("skipped", "", false, "test/junk row on the exclusion list");
      continue;
    }
    if (seenEmail.has(email)) {
      tally.dupEmail += 1;
      push("skipped", "", false, "duplicate email — invited on an earlier row");
      continue;
    }
    seenEmail.add(email);

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, isActive: true, phone: true },
    });

    const isoHint = COUNTRY_ISO[country.toLowerCase()] ?? null;
    const usable = (raw: string): string | null => {
      if (!raw.trim()) return null;
      const n = normalizePhoneForWhatsApp(raw, { orderCountryCode: isoHint });
      return n.e164 && !isPlaceholderWhatsAppNumber(n) ? n.e164 : null;
    };

    // The contacts export is missing a phone for a couple of hundred rows.
    // Fall back to the account's own number, then to the most recent booking.
    let e164 = usable(phoneRaw);
    let phoneSource = "csv";
    if (!e164 && existing?.phone) {
      e164 = usable(existing.phone);
      if (e164) phoneSource = "user record";
    }
    if (!e164 && existing) {
      const appt = await prisma.appointment.findFirst({
        where: { userId: existing.id, phone: { not: null } },
        orderBy: { createdAt: "desc" },
        select: { phone: true, countryCode: true },
      });
      if (appt?.phone) {
        const n = normalizePhoneForWhatsApp(appt.phone, {
          orderCountryCode: appt.countryCode ?? isoHint,
        });
        if (n.e164 && !isPlaceholderWhatsAppNumber(n)) {
          e164 = n.e164;
          phoneSource = "appointment";
        }
      }
    }
    if (!e164) {
      tally.badPhone += 1;
      push("skipped", "", false, phoneRaw ? `unusable phone number "${phoneRaw}"` : "no phone number on record");
      continue;
    }
    outPhone = e164;
    if (phoneSource !== "csv") tally.phoneRecovered += 1;
    phoneCount.set(e164, (phoneCount.get(e164) ?? 0) + 1);

    if (existing && existing.role !== "PATIENT") {
      tally.notPatient += 1;
      push("skipped", "", false, `account role is ${existing.role} — not a patient`);
      continue;
    }
    if (existing && !existing.isActive) {
      tally.inactive += 1;
      push("skipped", "", false, "account is deactivated");
      continue;
    }

    if (!LIVE) {
      if (existing) tally.existing += 1;
      else tally.created += 1;
      push(existing ? "existing" : "would-create", "(dry run — no token issued)", true, "");
      continue;
    }

    let userId: string;
    if (existing) {
      userId = existing.id;
      tally.existing += 1;
    } else {
      // Unknown random password: this account is only reachable through the
      // invite link, which is what we are about to send them.
      const passwordHash = await bcrypt.hash(randomBytes(24).toString("base64url"), 12);
      const created = await prisma.user.create({
        data: {
          email,
          passwordHash,
          fullName: name || "Patient",
          role: "PATIENT",
          isActive: true,
          mustChangePassword: true,
          phone: e164,
        },
        select: { id: true },
      });
      userId = created.id;
      tally.created += 1;
    }

    // Two live set-password links for one account means an old one can still
    // take it over after the patient has set their password from the new one.
    await prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = await issuePasswordResetToken(userId, {
      ttlMinutes: INVITE_TTL_MINUTES,
      isInvite: true,
    });
    const link = `${SITE_URL}/reset-password?token=${encodeURIComponent(token)}&invite=1`;
    push(existing ? "existing" : "created", link, true, "");
  }

  writeCsv(outPath, [...OUT_HEADER], out);

  const sharedPhones = [...phoneCount.entries()].filter(([, n]) => n > 1);
  log("");
  log(LIVE ? "PREPARE — LIVE (accounts created, tokens issued)" : "PREPARE — DRY RUN (nothing written to the DB)");
  log(`  rows read        : ${tally.total}`);
  log(`  sendable         : ${tally.sendable}`);
  log(`    existing accts : ${tally.existing}`);
  log(`    new accounts   : ${tally.created}${LIVE ? "" : " (would create)"}`);
  log(`    phone recovered: ${tally.phoneRecovered} (CSV had none — taken from the account/booking)`);
  log(`  skipped          : ${tally.total - tally.sendable}`);
  log(`    duplicate email: ${tally.dupEmail}`);
  log(`    invalid email  : ${tally.badEmail}`);
  log(`    unusable phone : ${tally.badPhone}`);
  log(`    test/junk rows : ${tally.excluded}`);
  log(`    non-patient    : ${tally.notPatient}`);
  log(`    deactivated    : ${tally.inactive}`);
  if (sharedPhones.length > 0) {
    log(`  NOTE: ${sharedPhones.length} phone number(s) are shared by more than one account —`);
    log("        those handsets will receive one message per account:");
    for (const [p, n] of sharedPhones) log(`          ${p} × ${n}`);
  }
  log("");
  log(`  written → ${outPath}`);
  if (LIVE) log("  THIS FILE CONTAINS LIVE CREDENTIALS. Do not commit or share it; delete after the run.");
  log("");
}

// ------------------------------------------------------------------- send ---

type WaResult = { ok: boolean; status?: number; detail?: string };

/**
 * Posts straight to WaSender, skipping the shared 6 s lock in wasender.ts.
 * Pacing for this run is handled by the caller (SEND_GAP_MS).
 */
async function postWhatsApp(digits: string, message: string): Promise<WaResult> {
  const raw = (process.env.WA_AUTH ?? process.env.WASENDER_API_TOKEN ?? "").trim();
  if (!raw) return { ok: false, detail: "WA_AUTH not configured" };
  const auth = raw.toLowerCase().startsWith("bearer ") ? raw : `Bearer ${raw}`;
  const url = (process.env.WA_API_URL ?? "").trim() || "https://wasenderapi.com/api/send-message";

  const attempt = async (): Promise<WaResult> => {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({ to: digits, text: message }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { ok: false, status: res.status, detail: body.trim().slice(0, 300) || `HTTP ${res.status}` };
      }
      return { ok: true, status: res.status };
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      const cause = (e as { cause?: { code?: string } }).cause?.code;
      return { ok: false, detail: cause ? `${e.message} (${cause})` : e.message };
    }
  };

  // "JID does not exist" means the number simply has no WhatsApp account —
  // permanent, so retrying only wastes 20 s per dead number.
  const permanent = (d?: string): boolean =>
    Boolean(d && /does not exist on whatsapp|invalid jid/i.test(d));

  // Transport blips and WaSender's own throttle both show up here; retry with
  // backoff rather than burning the recipient off the list.
  let last = await attempt();
  for (const wait of [5_000, 15_000]) {
    if (last.ok || permanent(last.detail)) return last;
    await sleep(wait);
    const retry = await attempt();
    last = retry.ok ? retry : { ...retry, detail: `${retry.detail} (after retry: ${last.detail})` };
  }
  return last;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function test(): Promise<void> {
  const { normalizePhoneForWhatsApp } = await import("../src/lib/whatsapp/normalize-phone.js");
  const digits = normalizePhoneForWhatsApp(TEST_PHONE, {}).digits;
  if (!digits) throw new Error(`could not normalize TEST_PHONE ${TEST_PHONE}`);

  const link = `${SITE_URL}/reset-password?token=${PLACEHOLDER_TOKEN}&invite=1`;
  const locales: Locale[] = ["en", "pt", "es", "cs", "ro"];

  log(LIVE ? `TEST — sending 5 messages to ${TEST_PHONE}` : "TEST — DRY RUN (nothing sent)");
  log("");
  for (const locale of locales) {
    const msg = buildMessage(locale, "Nauman", "patient@example.com", link);
    if (!LIVE) {
      console.log(`---------- ${locale.toUpperCase()} ----------`);
      console.log(msg);
      console.log("");
      continue;
    }
    const res = await postWhatsApp(digits, msg);
    log(res.ok ? `${locale}  sent` : `${locale}  FAILED — ${res.detail ?? res.status}`);
    await sleep(SEND_GAP_MS);
  }
  log("");
  if (!LIVE) log("dry run complete — add --live to deliver.");
}

async function send(): Promise<void> {
  const outPath = flag("out");
  if (!outPath) throw new Error("send needs --out <csv> (the file prepare produced)");
  const limit = numFlag("limit", Number.POSITIVE_INFINITY);
  const logPath = outPath.replace(/\.csv$/i, "") + ".sent.jsonl";

  const { normalizePhoneForWhatsApp } = await import("../src/lib/whatsapp/normalize-phone.js");

  const rows = parseCsv(fs.readFileSync(outPath, "utf8").replace(/^\uFEFF/, ""));
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (n: string): number => header.indexOf(n.toLowerCase());
  const [iName, iEmail, iPhone, iLocale, iLink, iSendable] = [
    idx("Name"),
    idx("Email"),
    idx("Phone"),
    idx("Locale"),
    idx("ResetLink"),
    idx("Sendable"),
  ];
  if (iLink < 0 || iSendable < 0) throw new Error("--out csv is missing ResetLink/Sendable columns");

  // Resume support: an email already logged as sent is never contacted twice.
  const done = new Set<string>();
  if (fs.existsSync(logPath)) {
    for (const line of fs.readFileSync(logPath, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try {
        const e = JSON.parse(line) as { email?: string; ok?: boolean };
        if (e.ok && e.email) done.add(e.email);
      } catch {
        /* ignore a torn final line */
      }
    }
  }

  const queue = rows
    .slice(1)
    .filter((r) => (r[iSendable] ?? "").trim().toLowerCase() === "yes")
    .filter((r) => !done.has((r[iEmail] ?? "").trim().toLowerCase()));

  const planned = Math.min(queue.length, limit);
  const minutes = Math.ceil((planned * SEND_GAP_MS) / 60_000);

  log("");
  log(LIVE ? "SEND — LIVE" : "SEND — DRY RUN (nothing sent)");
  log(`  queued        : ${planned}${queue.length > planned ? ` of ${queue.length} (--limit)` : ""}`);
  log(`  already sent  : ${done.size}`);
  log(`  rate          : ${Math.round(60_000 / SEND_GAP_MS)}/min → about ${minutes} min`);
  log(`  progress log  : ${logPath}`);
  log("");

  let sent = 0;
  let failed = 0;
  for (const r of queue.slice(0, planned)) {
    const name = (r[iName] ?? "").trim();
    const email = (r[iEmail] ?? "").trim().toLowerCase();
    const phone = (r[iPhone] ?? "").trim();
    const locale = ((r[iLocale] ?? "en").trim() as Locale) || "en";
    const link = (r[iLink] ?? "").trim();

    if (!link || link.startsWith("(")) {
      log(`  SKIP ${email} — no reset link on this row (run prepare --live first)`);
      failed += 1;
      continue;
    }
    const digits = normalizePhoneForWhatsApp(phone, {}).digits;
    if (!digits) {
      log(`  SKIP ${email} — phone "${phone}" will not normalize`);
      failed += 1;
      continue;
    }

    const message = buildMessage(COPY[locale] ? locale : "en", name, email, link);

    if (!LIVE) {
      log(`  would send → ${email}  ${phone}  [${locale}]`);
      continue;
    }

    const res = await postWhatsApp(digits, message);
    fs.appendFileSync(
      logPath,
      `${JSON.stringify({ at: new Date().toISOString(), email, phone, locale, ok: res.ok, detail: res.detail ?? null })}\n`,
      "utf8",
    );
    if (res.ok) {
      sent += 1;
      log(`  ${String(sent + failed).padStart(4)}  sent   → ${email}  [${locale}]`);
    } else {
      failed += 1;
      log(`  ${String(sent + failed).padStart(4)}  FAILED → ${email}  ${res.detail ?? res.status}`);
    }
    await sleep(SEND_GAP_MS);
  }

  log("");
  log(`  done — sent ${sent}, failed ${failed}`);
  if (failed > 0) log("  re-run the same command to retry only the failures (successes are logged).");
  log("");
}

// ------------------------------------------------------------------- main ---

async function main(): Promise<void> {
  switch (command) {
    case "prepare":
      await prepare();
      break;
    case "test":
      await test();
      break;
    case "send":
      await send();
      break;
    default:
      throw new Error("usage: patient-platform-invite.ts <prepare|test|send> [--in x] [--out y] [--live] [--limit N]");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
