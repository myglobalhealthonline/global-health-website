/**
 * Account provisioning for the migration: create a login User with a KNOWN
 * temporary password + a single-use "set your password" invite link, and append
 * the credentials to a CSV. Never resets an existing real account's password
 * (per the migration decision) — those are reported as "existing-unchanged".
 *
 * The set-password link is <SITE_URL>/reset-password?token=<t>&invite=1 (the
 * app's real invite route). SITE_URL falls back to PUBLIC_SITE_URL, then to a
 * REPLACE_ME placeholder — pass SITE_URL=https://prod-domain to render final
 * links, or find/replace the base in the CSV (the token stays valid).
 */
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../../../src/db/prisma.js";
import { issuePasswordResetToken } from "../../../src/modules/auth/auth.service.js";
import { DRY_RUN } from "./config.js";

// Long invite validity so the link works "until the person sets a password"
// (tokens are single-use — consumed when they set one). ~100 years.
const INVITE_TTL_MINUTES = 100 * 365 * 24 * 60;

function linkBase(): string {
  const raw =
    process.env.SITE_URL?.trim() ||
    process.env.PUBLIC_SITE_URL?.trim() ||
    "https://REPLACE_WITH_PROD_DOMAIN";
  return raw.replace(/\/+$/, "");
}

export function buildSetPasswordLink(token: string): string {
  return `${linkBase()}/reset-password?token=${encodeURIComponent(token)}&invite=1`;
}

/** Readable temp password, >=8 chars, guaranteed upper+lower+digit. */
export function genTempPassword(): string {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O
  const a = "abcdefghijkmnpqrstuvwxyz"; // no l/o
  const d = "23456789"; // no 0/1
  const all = A + a + d;
  const b = randomBytes(10);
  const pick = (set: string, i: number) => set[b[i] % set.length];
  let out = pick(A, 0) + pick(a, 1) + pick(d, 2);
  for (let i = 3; i < 10; i += 1) out += pick(all, i);
  return out;
}

export interface ProvisionResult {
  email: string;
  fullName: string;
  tempPassword: string | null;
  link: string | null;
  token: string | null;
  status: "created" | "existing-unchanged" | "linked-existing-doctor" | "skipped";
  note?: string;
}

/**
 * Ensure a login User for `email`.
 *   - existing User -> keep it + its password (optionally link doctorId), report unchanged.
 *   - no User      -> create with a temp password + invite token, report the creds.
 * Returns null-cred rows for existing accounts (we never expose/reset them).
 */
export async function provisionUser(opts: {
  email: string;
  fullName: string;
  role: "DOCTOR" | "PATIENT";
  doctorId?: string | null;
  linkPatientProfileId?: string | null;
}): Promise<ProvisionResult> {
  const email = opts.email.toLowerCase();
  const base: ProvisionResult = {
    email,
    fullName: opts.fullName,
    tempPassword: null,
    link: null,
    token: null,
    status: "skipped",
  };

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, doctorId: true },
  });

  if (existing) {
    // Keep the real account + password. Only ever attach a doctorId if missing.
    if (opts.role === "DOCTOR" && opts.doctorId && !existing.doctorId && !DRY_RUN) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: "DOCTOR", doctorId: opts.doctorId },
      });
    }
    if (opts.linkPatientProfileId && !DRY_RUN) {
      await prisma.patientProfile
        .update({ where: { id: opts.linkPatientProfileId }, data: { userId: existing.id } })
        .catch(() => {}); // userId unique — ignore if already linked elsewhere
    }
    return { ...base, status: "existing-unchanged", note: "existing account — password unchanged" };
  }

  if (DRY_RUN) {
    return { ...base, tempPassword: "(dry)", link: "(dry)", status: "created" };
  }

  const tempPassword = genTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName: opts.fullName || (opts.role === "DOCTOR" ? "Doctor" : "Patient"),
      role: opts.role,
      doctorId: opts.role === "DOCTOR" ? (opts.doctorId ?? null) : null,
      isActive: true,
      mustChangePassword: true,
      emailVerifiedAt: new Date(),
    },
    select: { id: true },
  });
  if (opts.linkPatientProfileId) {
    await prisma.patientProfile
      .update({ where: { id: opts.linkPatientProfileId }, data: { userId: user.id } })
      .catch(() => {});
  }
  const token = await issuePasswordResetToken(user.id, {
    ttlMinutes: INVITE_TTL_MINUTES,
    isInvite: true,
  });
  return {
    ...base,
    tempPassword,
    token,
    link: buildSetPasswordLink(token),
    status: "created",
  };
}

// ── CSV ──────────────────────────────────────────────────────────────────────

const CSV_HEADER = "name,email,temp_password,set_password_link,status,note\n";

function csvCell(v: string | null): string {
  const s = v ?? "";
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Append-safe: only writes the header when the file doesn't exist yet, so a
 *  resumed run keeps credentials already written by a prior (partial) run. */
export function initCsv(path: string): void {
  if (!fs.existsSync(path)) fs.writeFileSync(path, CSV_HEADER, "utf8");
}

export function appendCsv(path: string, r: ProvisionResult): void {
  const row =
    [
      csvCell(r.fullName),
      csvCell(r.email),
      csvCell(r.tempPassword),
      csvCell(r.link),
      csvCell(r.status),
      csvCell(r.note ?? ""),
    ].join(",") + "\n";
  fs.appendFileSync(path, row, "utf8");
}
