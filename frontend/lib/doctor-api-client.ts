/** Parse JSON from doctor API routes; avoids crashing on HTML error pages. */
export async function parseDoctorApiJson<T>(res: Response): Promise<T | null> {
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    return null;
  }
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function doctorApiErrorMessage(
  res: Response,
  json: { message?: string } | null,
  fallback: string,
): string {
  if (json?.message) return json.message;
  if (res.status === 401) return "Please sign in again as a doctor.";
  if (res.status === 404) return "API route not found — restart the dev server.";
  if (res.status >= 500) return "Server error — try again shortly.";
  return fallback;
}
