export function recruitmentErrorCode(error: unknown): string | undefined {
  if (error === null || typeof error !== "object") return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

export function recruitmentOperationalError(error: unknown) {
  const code = recruitmentErrorCode(error);
  return {
    errorType: error instanceof Error ? error.name : typeof error,
    ...(code ? { errorCode: code } : {}),
  };
}
