/** Fixed operation labels only: no URLs, query strings, credentials or records. */
export async function tracePublicRead<T>(operation: string, read: () => Promise<T>): Promise<T> {
  const start = performance.now();
  let ok = false;
  try {
    const value = await read();
    ok = !(value instanceof Response) || value.ok;
    return value;
  } finally {
    const durationMs = Math.round(performance.now() - start);
    if (!ok || durationMs >= 1000 || process.env.PERFORMANCE_TRACE === "1") {
      console.info(JSON.stringify({ event: "public_read", operation, durationMs, ok }));
    }
  }
}
