import { IRELAND_GENERAL_SERVICE_KEYWORD_VERSION } from "./ireland-general-service-keywords.js";

export const IRELAND_GENERAL_SERVICE_KEYWORD_TRANSACTION_TIMEOUT_MS = 30_000;
export const IRELAND_GENERAL_SERVICE_KEYWORD_TRANSACTION_MAX_WAIT_MS = 10_000;

export function buildIrelandGeneralServiceKeywordTransactionOptions<T>(isolationLevel: T) {
  return {
    isolationLevel,
    maxWait: IRELAND_GENERAL_SERVICE_KEYWORD_TRANSACTION_MAX_WAIT_MS,
    timeout: IRELAND_GENERAL_SERVICE_KEYWORD_TRANSACTION_TIMEOUT_MS,
  } as const;
}

type ApplyAuthorization = Readonly<{
  apply: boolean;
  confirmation: string | undefined;
}>;

type ServiceSnapshot = Readonly<{
  id: string;
  updatedAt: Date;
  isActive: boolean;
  kind: "GENERAL" | string;
  visibility: "PUBLIC" | string;
}>;

type TranslationSnapshot = Readonly<{
  id: string;
  updatedAt: Date;
}>;

export function assertIrelandGeneralServiceKeywordApplyAuthorized({
  apply,
  confirmation,
}: ApplyAuthorization): void {
  if (!apply) return;
  if (confirmation !== IRELAND_GENERAL_SERVICE_KEYWORD_VERSION) {
    throw new Error(
      `Apply confirmation must exactly match ${IRELAND_GENERAL_SERVICE_KEYWORD_VERSION}.`,
    );
  }
}

export function buildOptimisticServiceWhere(snapshot: ServiceSnapshot) {
  return {
    id: snapshot.id,
    updatedAt: snapshot.updatedAt,
    isActive: snapshot.isActive,
    kind: snapshot.kind,
    visibility: snapshot.visibility,
  } as const;
}

export function buildOptimisticServiceTranslationWhere(snapshot: TranslationSnapshot) {
  return { id: snapshot.id, updatedAt: snapshot.updatedAt } as const;
}
