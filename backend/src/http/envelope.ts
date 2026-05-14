import type { ServerResponse } from "node:http";
import type { ApiError, ApiErrorCode, FieldErrors } from "@gh/shared";

export function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.writeHead(status);
  res.end(JSON.stringify(body));
}

export function sendOk<T>(
  res: ServerResponse,
  data: T,
  options: { status?: number; revalidate?: string[] } = {},
) {
  const body: { ok: true; data: T; revalidate?: string[] } = { ok: true, data };
  if (options.revalidate && options.revalidate.length > 0) {
    body.revalidate = options.revalidate;
  }
  sendJson(res, options.status ?? 200, body);
}

export function sendError(
  res: ServerResponse,
  status: number,
  code: ApiErrorCode,
  message: string,
  fieldErrors?: FieldErrors,
) {
  const error: ApiError = { code, message };
  if (fieldErrors && Object.keys(fieldErrors).length > 0) {
    error.fieldErrors = fieldErrors;
  }
  sendJson(res, status, { ok: false, error });
}

export function sendValidation(
  res: ServerResponse,
  fieldErrors: FieldErrors,
  message = "Please review the form fields.",
) {
  sendError(res, 400, "VALIDATION_FAILED", message, fieldErrors);
}

export function sendUnauthenticated(res: ServerResponse) {
  sendError(res, 401, "UNAUTHENTICATED", "Not authenticated");
}

export function sendForbidden(res: ServerResponse, message = "Not authorised") {
  sendError(res, 403, "FORBIDDEN", message);
}

export function sendNotFound(res: ServerResponse, message = "Not found") {
  sendError(res, 404, "NOT_FOUND", message);
}

export function sendConflict(res: ServerResponse, message: string) {
  sendError(res, 409, "CONFLICT", message);
}

export function sendInternal(res: ServerResponse, message = "Internal server error") {
  sendError(res, 500, "INTERNAL_ERROR", message);
}
