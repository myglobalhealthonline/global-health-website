export function okResponse<T>(data: T, message?: string) {
  return {
    ok: true as const,
    message,
    data,
  };
}

/**
 * Pull the first human-readable issue out of a `ZodError.flatten()` payload.
 * Field errors win over form errors so the caller learns *which* field failed.
 */
function firstZodIssue(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;
  const flat = details as {
    fieldErrors?: Record<string, string[] | undefined>;
    formErrors?: string[];
  };
  if (!flat.fieldErrors && !flat.formErrors) return null;
  for (const [field, messages] of Object.entries(flat.fieldErrors ?? {})) {
    const first = messages?.[0];
    if (first) return `${field}: ${first}`;
  }
  return flat.formErrors?.[0] ?? null;
}

export function errorResponse(message: string, details?: unknown) {
  // Every client we ship renders `message` and ignores `details`, so a bare
  // "Invalid ..." leaves the user with nothing to act on. When the details are
  // a flattened ZodError, fold the first issue into the message.
  const issue = firstZodIssue(details);
  return {
    ok: false as const,
    message: issue ? `${message}: ${issue}` : message,
    details,
  };
}

export function placeholderResponse(message = "Endpoint scaffolded. Business logic not implemented yet.") {
  return okResponse(null, message);
}
