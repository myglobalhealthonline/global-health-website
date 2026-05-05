export function okResponse<T>(data: T, message?: string) {
  return {
    ok: true as const,
    message,
    data,
  };
}

export function errorResponse(message: string, details?: unknown) {
  return {
    ok: false as const,
    message,
    details,
  };
}

export function placeholderResponse(message = "Endpoint scaffolded. Business logic not implemented yet.") {
  return okResponse(null, message);
}
