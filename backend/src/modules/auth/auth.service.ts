import bcrypt from "bcryptjs";
import { UserRole, type User } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import type { LoginBody, RegisterBody } from "../../validations/auth.schema.js";

export type SafeUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  emailVerifiedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export class AuthInvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password");
    this.name = "AuthInvalidCredentialsError";
  }
}

export class AuthConflictError extends Error {
  constructor() {
    super("We could not complete registration with those details");
    this.name = "AuthConflictError";
  }
}

function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function registerPatient(input: RegisterBody) {
  const email = input.email.toLowerCase();
  const passwordHash = await bcrypt.hash(input.password, 12);
  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: input.fullName,
        phone: input.phone && input.phone.trim().length > 0 ? input.phone.trim() : null,
        role: UserRole.PATIENT,
      },
    });
    return toSafeUser(user);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && (error as { code?: string }).code === "P2002") {
      throw new AuthConflictError();
    }
    throw normalizeDbError(error, "Authentication is temporarily unavailable");
  }
}

export async function loginUser(input: LoginBody) {
  const email = input.email.toLowerCase();
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      throw new AuthInvalidCredentialsError();
    }
    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) {
      throw new AuthInvalidCredentialsError();
    }
    return toSafeUser(user);
  } catch (error) {
    if (error instanceof AuthInvalidCredentialsError) throw error;
    throw normalizeDbError(error, "Authentication is temporarily unavailable");
  }
}

export async function getSafeUserById(id: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || !user.isActive) return null;
    return toSafeUser(user);
  } catch (error) {
    throw normalizeDbError(error, "Authentication is temporarily unavailable");
  }
}

export type ProfilePatchInput = {
  fullName?: string;
  phone?: string | null;
};

export async function patchUserProfile(id: string, input: ProfilePatchInput) {
  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(input.fullName !== undefined && { fullName: input.fullName }),
        ...(input.phone !== undefined && { phone: input.phone }),
      },
    });
    return toSafeUser(user);
  } catch (error) {
    throw normalizeDbError(error, "Could not update profile");
  }
}
