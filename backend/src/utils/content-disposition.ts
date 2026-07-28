/**
 * Build a `Content-Disposition` header value that cannot crash the response.
 *
 * Node rejects any header value containing a character outside Latin-1 with
 * `ERR_INVALID_CHAR` — thrown at send time, so the request dies with a 500 and
 * the browser just reports a failed download. Every clinical file whose name
 * came from a human hits this: an em dash, a Czech "ř", a Polish "ł", an emoji
 * in an uploaded filename. Percent-encoding the whole name avoids the crash but
 * shows the patient `Relat%C3%B3rio%20final.pdf` as the saved filename.
 *
 * RFC 6266/5987 answers both: a sanitised ASCII `filename` for old clients and
 * a UTF-8 `filename*` that every current browser prefers.
 */
export function contentDisposition(
  fileName: string,
  type: "attachment" | "inline" = "attachment",
): string {
  // Quotes, backslashes and CR/LF would break out of the quoted-string (and
  // CR/LF is header injection) — strip before anything else.
  const clean = fileName.replace(/[\r\n"\\]/g, " ").replace(/\s+/g, " ").trim() || "document";
  // Legacy fallback: printable ASCII only.
  const ascii = clean.replace(/[^\x20-\x7E]/g, "_");
  // RFC 5987 attr-char excludes ' ( ) * , which encodeURIComponent leaves bare.
  const encoded = encodeURIComponent(clean).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
