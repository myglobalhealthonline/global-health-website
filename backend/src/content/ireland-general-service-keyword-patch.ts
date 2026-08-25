import { IRELAND_GENERAL_SERVICE_KEYWORD_VERSION } from "./ireland-general-service-keywords.js";

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
