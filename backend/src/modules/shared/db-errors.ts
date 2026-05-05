export class DatabaseUnavailableError extends Error {
  constructor(message = "Database is unavailable") {
    super(message);
    this.name = "DatabaseUnavailableError";
  }
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
