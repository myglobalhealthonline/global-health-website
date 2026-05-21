import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { UserRole } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";

export async function upsertPatientProfileByEmail(input: {
  email: string;
  fullName?: string | null;
  phone?: string | null;
  dateOfBirth?: Date | null;
}) {
  const email = input.email.trim().toLowerCase();
  try {
    let user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true },
    });
    if (!user) {
      const placeholderHash = await bcrypt.hash(
        randomBytes(32).toString("hex"),
        12,
      );
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: placeholderHash,
          fullName: input.fullName?.trim() || email,
          phone: input.phone?.trim() || null,
          dateOfBirth: input.dateOfBirth ?? null,
          role: UserRole.PATIENT,
        },
        select: { id: true, role: true },
      });
    } else if (user.role === UserRole.PATIENT) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          ...(input.fullName ? { fullName: input.fullName.trim() } : {}),
          ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
          ...(input.dateOfBirth !== undefined ? { dateOfBirth: input.dateOfBirth } : {}),
        },
      });
    }

    const profile = await prisma.patientProfile.upsert({
      where: { email },
      create: {
        email,
        userId: user.role === UserRole.PATIENT ? user.id : null,
        fullName: input.fullName?.trim() || null,
        phone: input.phone?.trim() || null,
        dateOfBirth: input.dateOfBirth ?? null,
      },
      update: {
        userId: user.role === UserRole.PATIENT ? user.id : undefined,
        ...(input.fullName !== undefined ? { fullName: input.fullName?.trim() || null } : {}),
        ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
        ...(input.dateOfBirth !== undefined ? { dateOfBirth: input.dateOfBirth } : {}),
      },
    });

    await prisma.appointment.updateMany({
      where: { email: { equals: email, mode: "insensitive" }, userId: null },
      data: { userId: user.role === UserRole.PATIENT ? user.id : undefined },
    });

    return { profile, userId: user.role === UserRole.PATIENT ? user.id : null };
  } catch (error) {
    throw normalizeDbError(error, "Patient profile is temporarily unavailable");
  }
}
