export const IRELAND_PROFILE_SPECIALIST_FAQ_PATCH_VERSION =
  "IE-PROFILE-SPECIALIST-FAQ-2026-08-26" as const;

const TRANSACTION_MAX_WAIT_MS = 10_000;
const TRANSACTION_TIMEOUT_MS = 45_000;

type ApplyAuthorization = Readonly<{
  apply: boolean;
  confirmation: string | undefined;
}>;

type DoctorFaqTargetSnapshot = Readonly<{
  slug: string;
  countryCode: string;
  doctorActive: boolean;
  marketActive: boolean;
  activeFaqCount: number;
  expectedActiveFaqCount: number;
  totalFaqCount: number;
  expectedTotalFaqCount: number;
  targetQuestionExists: boolean;
}>;

type SpecialistFaqTargetSnapshot = Readonly<{
  slug: string;
  countryCode: string;
  isActive: boolean;
  visibility: string;
  kind: string;
  visibleFaqCount: number;
  expectedVisibleFaqCount: number;
  targetQuestionExists: boolean;
}>;

function normalizeFaqQuestion(question: string): string {
  return question.trim().toLocaleLowerCase("en").replace(/\s+/g, " ");
}

export function hasIrelandFaqQuestionOverlap(
  existingQuestions: readonly string[],
  targetQuestions: readonly string[],
): boolean {
  const existing = new Set(existingQuestions.map(normalizeFaqQuestion));
  return targetQuestions.some((question) => existing.has(normalizeFaqQuestion(question)));
}

export function assertIrelandProfileSpecialistFaqApplyAuthorized({
  apply,
  confirmation,
}: ApplyAuthorization): void {
  if (!apply) return;
  if (confirmation !== IRELAND_PROFILE_SPECIALIST_FAQ_PATCH_VERSION) {
    throw new Error(
      `Refusing to write: confirmation must exactly match ${IRELAND_PROFILE_SPECIALIST_FAQ_PATCH_VERSION}.`,
    );
  }
}

export function buildIrelandProfileSpecialistFaqTransactionOptions<T>(
  isolationLevel: T,
) {
  return {
    isolationLevel,
    maxWait: TRANSACTION_MAX_WAIT_MS,
    timeout: TRANSACTION_TIMEOUT_MS,
  } as const;
}

export function assertIrelandDoctorFaqTargetWritable(
  snapshot: DoctorFaqTargetSnapshot,
): void {
  if (snapshot.countryCode.trim().toUpperCase() !== "IE") {
    throw new Error(`${snapshot.slug} is outside the Ireland market.`);
  }
  if (!snapshot.doctorActive || !snapshot.marketActive) {
    throw new Error(`${snapshot.slug} must remain active in Ireland.`);
  }
  if (snapshot.activeFaqCount !== snapshot.expectedActiveFaqCount) {
    throw new Error(
      `${snapshot.slug} FAQ count drifted from ${snapshot.expectedActiveFaqCount} to ${snapshot.activeFaqCount}.`,
    );
  }
  if (snapshot.totalFaqCount !== snapshot.expectedTotalFaqCount) {
    throw new Error(
      `${snapshot.slug} total FAQ count drifted from ${snapshot.expectedTotalFaqCount} to ${snapshot.totalFaqCount}.`,
    );
  }
  if (snapshot.targetQuestionExists) {
    throw new Error(`${snapshot.slug} target FAQ already exists.`);
  }
}

export function assertIrelandSpecialistFaqTargetWritable(
  snapshot: SpecialistFaqTargetSnapshot,
): void {
  const isIreland = snapshot.countryCode.trim().toUpperCase() === "IE";
  const isPublishable =
    snapshot.isActive &&
    snapshot.visibility === "PUBLIC" &&
    snapshot.kind === "SPECIALIST";
  if (!isIreland || !isPublishable) {
    throw new Error(`${snapshot.slug} must remain an active public specialist service in Ireland.`);
  }
  if (snapshot.visibleFaqCount !== snapshot.expectedVisibleFaqCount) {
    throw new Error(
      `${snapshot.slug} FAQ count drifted from ${snapshot.expectedVisibleFaqCount} to ${snapshot.visibleFaqCount}.`,
    );
  }
  if (snapshot.targetQuestionExists) {
    throw new Error(`${snapshot.slug} target FAQ already exists.`);
  }
}
