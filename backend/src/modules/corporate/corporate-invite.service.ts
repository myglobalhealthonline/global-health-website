import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../../db/prisma.js";
import { registerPatient } from "../auth/auth.service.js";
import { linkMembershipsInBackground } from "../memberships/membership-linking.service.js";
import { sendWhatsAppText } from "../../lib/whatsapp/wasender.js";
import {
  memberInviteText,
  corporateInviteLink,
  sendCorporateMemberInviteEmail,
} from "./corporate-emails.js";
import {
  companyIsLive,
  isBeneficiaryProfileComplete,
  isEmployeeProfileComplete,
} from "./corporate-shared.js";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Mint a fresh invite row + dispatch email/WhatsApp. Previous unused
 * invites for the member are invalidated (deleted) so exactly one link
 * is live at a time. Sends are awaited so we can write back the real
 * INVITE_SENT / INVITE_FAILED status, but a WhatsApp failure alone
 * never fails the invite while the email got through.
 *
 * Returns the resulting member status.
 */
export async function mintAndSendInvite(opts: {
  type: "EMPLOYEE" | "BENEFICIARY";
  memberId: string;
  isReminder?: boolean;
}): Promise<"INVITE_SENT" | "INVITE_FAILED"> {
  const member =
    opts.type === "EMPLOYEE"
      ? await prisma.corporateEmployee.findUnique({
          where: { id: opts.memberId },
          include: { company: true },
        })
      : await prisma.corporateBeneficiary.findUnique({
          where: { id: opts.memberId },
          include: { company: true },
        });
  if (!member) throw new Error("Corporate member not found");

  const token = randomBytes(32).toString("base64url");
  const memberWhere =
    opts.type === "EMPLOYEE" ? { employeeId: member.id } : { beneficiaryId: member.id };
  await prisma.$transaction([
    prisma.corporateInvite.deleteMany({ where: { ...memberWhere, usedAt: null } }),
    prisma.corporateInvite.create({
      data: {
        type: opts.type,
        tokenHash: hashToken(token),
        ...memberWhere,
        email: member.email,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        // Stamp the REMINDER flag on the row this send actually creates.
        // Stamping the previous row was useless — the deleteMany above wipes
        // it — so the cron's `reminderSentAt: null` dedup never matched and
        // it re-reminded the same member every 3 days forever.
        ...(opts.isReminder ? { reminderSentAt: new Date() } : {}),
      },
    }),
  ]);

  let emailOk = false;
  let whatsappOk = false;
  let lastSendError: string | null = null;

  try {
    const result = await sendCorporateMemberInviteEmail({
      to: member.email,
      firstName: member.firstName,
      companyName: member.company.name,
      isBeneficiary: opts.type === "BENEFICIARY",
      token,
      isReminder: opts.isReminder,
    });
    emailOk = (result as { ok?: boolean }).ok !== false;
    if (!emailOk) lastSendError = "email send failed";
  } catch (error) {
    lastSendError = error instanceof Error ? error.message : "email send failed";
  }

  if (member.phone) {
    try {
      const wa = await sendWhatsAppText({
        to: member.phone,
        message: memberInviteText({
          firstName: member.firstName,
          companyName: member.company.name,
          isBeneficiary: opts.type === "BENEFICIARY",
          link: corporateInviteLink(token),
        }),
      });
      whatsappOk = (wa as { ok?: boolean }).ok !== false;
      if (!whatsappOk && !lastSendError) lastSendError = "whatsapp send failed";
    } catch (error) {
      if (!lastSendError) {
        lastSendError = error instanceof Error ? error.message : "whatsapp send failed";
      }
    }
  }

  await prisma.corporateInvite.updateMany({
    where: { ...memberWhere, usedAt: null },
    data: {
      emailSentAt: emailOk ? new Date() : null,
      whatsappSentAt: whatsappOk ? new Date() : null,
      lastSendError,
    },
  });

  // Email is the required channel; WhatsApp is best-effort.
  const status = emailOk ? "INVITE_SENT" : "INVITE_FAILED";
  if (opts.type === "EMPLOYEE") {
    await prisma.corporateEmployee.update({
      where: { id: member.id },
      data: { status },
    });
  } else {
    await prisma.corporateBeneficiary.update({
      where: { id: member.id },
      data: { status },
    });
  }
  return status;
}

export type InviteLookup =
  | {
      ok: true;
      type: "EMPLOYEE" | "BENEFICIARY";
      companyName: string;
      firstName: string;
      lastName: string;
      maskedEmail: string;
      /** True when a platform account already exists for the invite email —
       *  the accept UI shows "enter your existing password" instead of
       *  "create a password". */
      existingAccount: boolean;
      prefill: {
        phone: string | null;
        addressLine1: string | null;
        city: string | null;
        postalCode: string | null;
        hasDateOfBirth: boolean;
      };
      expiresAt: string;
    }
  | { ok: false; reason: "not_found" | "expired" | "used" };

function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  const head = local.slice(0, 2);
  return `${head}${"*".repeat(Math.max(1, local.length - 2))}@${domain}`;
}

export async function lookupInvite(token: string): Promise<InviteLookup> {
  const invite = await prisma.corporateInvite.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      employee: { include: { company: true } },
      beneficiary: { include: { company: true } },
    },
  });
  if (!invite) return { ok: false, reason: "not_found" };
  if (invite.usedAt) return { ok: false, reason: "used" };
  if (invite.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
  const member = invite.employee ?? invite.beneficiary;
  if (!member) return { ok: false, reason: "not_found" };
  const existing = await prisma.user.findUnique({
    where: { email: invite.email.toLowerCase() },
    select: { id: true },
  });
  return {
    ok: true,
    type: invite.type,
    companyName: member.company.name,
    firstName: member.firstName,
    lastName: member.lastName,
    maskedEmail: maskEmail(invite.email),
    existingAccount: Boolean(existing),
    prefill: {
      phone: member.phone,
      addressLine1: member.addressLine1,
      city: member.city,
      postalCode: member.postalCode,
      hasDateOfBirth: Boolean(member.dateOfBirth),
    },
    expiresAt: invite.expiresAt.toISOString(),
  };
}

export type AcceptInviteInput = {
  token: string;
  password: string;
  profile: {
    phone?: string;
    dateOfBirth?: string; // ISO date
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    postalCode?: string;
  };
  consents: { terms: boolean; privacy: boolean; dataProcessing: boolean };
};

export type AcceptInviteResult =
  | {
      ok: true;
      userId: string;
      memberType: "EMPLOYEE" | "BENEFICIARY";
      /** The membership row this invite belongs to. The caller must use THIS
       *  id — re-finding "the newest row for this user" activates the wrong
       *  membership when someone is a member of two companies. */
      memberId: string;
      newStatus: string;
    }
  | { ok: false; status: number; message: string };

/** Thrown inside the accept transaction when another request consumed the
 *  invite first — the tx rolls back and the caller answers 410. */
class InviteAlreadyClaimedError extends Error {}

/**
 * Single-use claim: flips `usedAt` only if it is still null. Returning 0 means
 * a concurrent accept won the race, so the whole transaction must roll back.
 */
async function claimInvite(
  tx: { corporateInvite: { updateMany: (args: never) => Promise<{ count: number }> } },
  inviteId: string,
): Promise<void> {
  const claimed = await tx.corporateInvite.updateMany({
    where: { id: inviteId, usedAt: null },
    data: { usedAt: new Date() },
  } as never);
  if (claimed.count === 0) throw new InviteAlreadyClaimedError();
}

/**
 * Consume an invite: create a fresh PATIENT account (or link the
 * existing one after verifying its password), copy profile fields onto
 * the membership row, mark the invite used, and advance the member
 * status. The route mints the session cookie from the returned userId.
 */
export async function acceptInvite(input: AcceptInviteInput): Promise<AcceptInviteResult> {
  if (!input.consents.terms || !input.consents.privacy || !input.consents.dataProcessing) {
    return { ok: false, status: 400, message: "All consents are required" };
  }
  const invite = await prisma.corporateInvite.findUnique({
    where: { tokenHash: hashToken(input.token) },
    include: {
      employee: { include: { company: true } },
      beneficiary: { include: { company: true } },
    },
  });
  if (!invite || invite.usedAt || invite.expiresAt.getTime() < Date.now()) {
    return { ok: false, status: 410, message: "This invitation link is no longer valid" };
  }
  const member = invite.employee ?? invite.beneficiary;
  if (!member) return { ok: false, status: 410, message: "This invitation link is no longer valid" };
  if (["REMOVED", "SUSPENDED"].includes(member.status)) {
    return { ok: false, status: 410, message: "This membership is no longer active" };
  }
  // The member row can be fine while the company behind it is suspended or its
  // contract has lapsed — accepting then would create an account and a
  // membership that confer nothing.
  if (!companyIsLive(member.company)) {
    return {
      ok: false,
      status: 410,
      message: "This company's corporate plan is not active — contact your employer",
    };
  }

  const email = invite.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });

  let userId: string;
  if (existing) {
    // Link path — the invitee proves ownership of the existing account
    // with its password. Never silently attach a membership to an
    // account the clicker can't log into.
    const match = await bcrypt.compare(input.password, existing.passwordHash);
    if (!match) {
      return { ok: false, status: 401, message: "That account exists — the password is incorrect" };
    }
    if (existing.role !== "PATIENT") {
      return { ok: false, status: 409, message: "This email belongs to a staff account. Contact support." };
    }
    userId = existing.id;
  } else {
    if (input.password.length < 8) {
      return { ok: false, status: 400, message: "Password must be at least 8 characters" };
    }
    const registerResult = await registerPatient({
      fullName: `${member.firstName} ${member.lastName}`.trim(),
      email,
      password: input.password,
      phone: input.profile.phone ?? member.phone ?? undefined,
    } as Parameters<typeof registerPatient>[0]);
    // The `existing` lookup above already handles the normal case; this
    // only fires on a genuine create-vs-create race.
    if (registerResult.kind === "exists") {
      return {
        ok: false,
        status: 409,
        message: "That email is already registered — try signing in instead",
      };
    }
    userId = registerResult.user.id;
    // The click proved control of the inbox.
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });
    // Every place that sets emailVerifiedAt is a membership link trigger
    // (§5.2) — this account may also hold a private membership enrollment.
    linkMembershipsInBackground(userId);
  }

  const dob = input.profile.dateOfBirth ? new Date(input.profile.dateOfBirth) : null;
  if (dob && Number.isNaN(dob.getTime())) {
    return { ok: false, status: 400, message: "Invalid date of birth" };
  }
  if (dob) {
    await prisma.user.update({ where: { id: userId }, data: { dateOfBirth: dob } });
  }

  const profilePatch = {
    phone: input.profile.phone?.trim() || member.phone,
    addressLine1: input.profile.addressLine1?.trim() || member.addressLine1,
    city: input.profile.city?.trim() || member.city,
    postalCode: input.profile.postalCode?.trim() || member.postalCode,
    dateOfBirth: dob ?? member.dateOfBirth,
  };

  try {
    if (invite.type === "EMPLOYEE" && invite.employee) {
      const employeeId = invite.employee.id;
      const complete = isEmployeeProfileComplete(profilePatch);
      const newStatus = complete ? "PREASSESSMENT_PENDING" : "PROFILE_INCOMPLETE";
      await prisma.$transaction(async (tx) => {
        await claimInvite(tx, invite.id);
        await tx.corporateEmployee.update({
          where: { id: employeeId },
          data: {
            userId,
            ...profilePatch,
            ...(input.profile.addressLine2?.trim()
              ? { addressLine2: input.profile.addressLine2.trim() }
              : {}),
            status: newStatus,
          },
        });
      });
      return { ok: true, userId, memberType: "EMPLOYEE", memberId: employeeId, newStatus };
    }

    if (invite.type === "BENEFICIARY" && invite.beneficiary) {
      const beneficiaryId = invite.beneficiary.id;
      const complete = isBeneficiaryProfileComplete(profilePatch);
      // Beneficiaries have no pre-assessment gate — profile complete ⇒ ACTIVE.
      const newStatus = complete ? "ACTIVE" : "PROFILE_INCOMPLETE";
      await prisma.$transaction(async (tx) => {
        await claimInvite(tx, invite.id);
        await tx.corporateBeneficiary.update({
          where: { id: beneficiaryId },
          data: { userId, ...profilePatch, status: newStatus },
        });
      });
      return { ok: true, userId, memberType: "BENEFICIARY", memberId: beneficiaryId, newStatus };
    }
  } catch (error) {
    if (error instanceof InviteAlreadyClaimedError) {
      return { ok: false, status: 410, message: "This invitation link is no longer valid" };
    }
    throw error;
  }

  return { ok: false, status: 410, message: "This invitation link is no longer valid" };
}
