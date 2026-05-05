export class DatabaseUnavailableError extends Error {
  constructor(message = "Database is unavailable") {
    super(message);
    this.name = "DatabaseUnavailableError";
  }
}

/**
 * Safe, non-secret classification for diagnostics (`GET /health?db=1`).
 * Does not include connection strings, hostnames, or passwords.
 */
export function classifyDatabaseConnectivityError(error: unknown): string {
  if (!error || typeof error !== "object") return "UNKNOWN";

  const e = error as NodeJS.ErrnoException & { code?: string; cause?: unknown };

  if (typeof e.code === "string" && e.code.length > 0) {
    if (["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "EAI_AGAIN"].includes(e.code)) {
      return e.code;
    }
  }

  const msg = typeof e.message === "string" ? e.message.toLowerCase() : "";
  if (msg.includes("password authentication failed")) return "AUTH_FAILED";
  if (msg.includes("relation") && msg.includes("does not exist")) return "SCHEMA_NOT_MIGRATED";
  if (msg.includes("database") && msg.includes("does not exist")) return "DATABASE_MISSING";
  if (msg.includes("econnrefused") || msg.includes("connection refused")) return "ECONNREFUSED";
  if (msg.includes("getaddrinfo") || msg.includes("enotfound")) return "ENOTFOUND";
  if (msg.includes("timeout") || msg.includes("timed out")) return "ETIMEDOUT";
  if (msg.includes("can't reach database") || msg.includes("cannot reach database")) return "UNREACHABLE";

  const cause = e.cause;
  if (cause && typeof cause === "object") {
    const c = cause as NodeJS.ErrnoException;
    if (typeof c.code === "string" && ["ECONNREFUSED", "ENOTFOUND"].includes(c.code)) {
      return c.code;
    }
  }

  return "UNKNOWN";
}

export function normalizeDbError(error: unknown, fallbackMessage: string) {
  if (error instanceof DatabaseUnavailableError) {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes("can't reach database") ||
      message.includes("database") ||
      message.includes("connect") ||
      message.includes("table") ||
      message.includes("relation")
    ) {
      return new DatabaseUnavailableError(fallbackMessage);
    }
  }

  return error;
}
