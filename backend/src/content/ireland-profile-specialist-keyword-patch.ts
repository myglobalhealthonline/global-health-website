export const IRELAND_PROFILE_SPECIALIST_KEYWORD_VERSION =
  "IE-PROFILES-SPECIALISTS-2026-08-26" as const;

export const IRELAND_PROFILE_SPECIALIST_KEYWORD_TRANSACTION_TIMEOUT_MS = 45_000;
export const IRELAND_PROFILE_SPECIALIST_KEYWORD_TRANSACTION_MAX_WAIT_MS = 10_000;

type ApplyAuthorization = Readonly<{
  apply: boolean;
  confirmation: string | undefined;
}>;

type DoctorMarketSnapshot = Readonly<{
  doctorSlug: string;
  doctorActive: boolean;
  countryCode: string;
  marketActive: boolean;
}>;

type UpdatedRow = Readonly<{ id: string; updatedAt: Date }>;

export function assertIrelandProfileSpecialistKeywordApplyAuthorized({
  apply,
  confirmation,
}: ApplyAuthorization): void {
  if (!apply) return;
  if (confirmation !== IRELAND_PROFILE_SPECIALIST_KEYWORD_VERSION) {
    throw new Error(
      `Refusing to write: confirmation must exactly match ${IRELAND_PROFILE_SPECIALIST_KEYWORD_VERSION}.`,
    );
  }
}

export function buildIrelandProfileSpecialistKeywordTransactionOptions<T>(
  isolationLevel: T,
) {
  return {
    isolationLevel,
    maxWait: IRELAND_PROFILE_SPECIALIST_KEYWORD_TRANSACTION_MAX_WAIT_MS,
    timeout: IRELAND_PROFILE_SPECIALIST_KEYWORD_TRANSACTION_TIMEOUT_MS,
  } as const;
}

export function assertIrelandDoctorMarketWritable(snapshot: DoctorMarketSnapshot): void {
  const countryCode = snapshot.countryCode.trim().toUpperCase();
  if (countryCode !== "IE") {
    throw new Error(
      `${snapshot.doctorSlug} is outside the Ireland market (countryCode=${snapshot.countryCode}).`,
    );
  }
  if (!snapshot.doctorActive || !snapshot.marketActive) {
    throw new Error(
      `${snapshot.doctorSlug} must remain active (doctorActive=${snapshot.doctorActive}, marketActive=${snapshot.marketActive}).`,
    );
  }
}

export function buildOptimisticDoctorWhere(snapshot: UpdatedRow) {
  return { id: snapshot.id, updatedAt: snapshot.updatedAt, active: true } as const;
}

export function buildOptimisticDoctorMarketTranslationWhere(snapshot: UpdatedRow) {
  return { id: snapshot.id, updatedAt: snapshot.updatedAt } as const;
}

export function buildOptimisticSpecialistServiceWhere(snapshot: UpdatedRow) {
  return {
    id: snapshot.id,
    updatedAt: snapshot.updatedAt,
    isActive: true,
    kind: "SPECIALIST",
    visibility: "PUBLIC",
  } as const;
}

export function buildOptimisticSpecialistServiceTranslationWhere(snapshot: UpdatedRow) {
  return { id: snapshot.id, updatedAt: snapshot.updatedAt } as const;
}
