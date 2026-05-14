/**
 * Wire-format envelopes shared by every endpoint.
 * Both web and mobile clients parse against these types.
 */

export type FieldErrors = Record<string, string[]>;

export type ApiError = {
  /** Stable machine-readable code. Clients can switch on it. */
  code: ApiErrorCode;
  /** Human-readable message — display to the user verbatim only if you trust the source. */
  message: string;
  /** Per-field validation errors. Keys match form field names. */
  fieldErrors?: FieldErrors;
};

export type ApiErrorCode =
  | "VALIDATION_FAILED"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "PAYLOAD_TOO_LARGE"
  | "INTERNAL_ERROR";

export type ApiSuccessRead<T> = {
  ok: true;
  data: T;
};

export type ApiSuccessWrite<T> = {
  ok: true;
  data: T;
  /**
   * Frontend paths the caller should invalidate after acting on this response.
   * Web (Next.js) loops over and calls `revalidatePath`. Mobile ignores.
   */
  revalidate?: string[];
};

export type ApiFailure = {
  ok: false;
  error: ApiError;
};

export type ApiResponse<T> = ApiSuccessRead<T> | ApiSuccessWrite<T> | ApiFailure;

export type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
};
