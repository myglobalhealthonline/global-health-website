/**
 * Fetch a same-origin file endpoint and trigger a browser download of the
 * response body. Unlike `window.location.href = url`, this surfaces server
 * errors (404/500/JSON) as a thrown Error instead of silently navigating or
 * doing nothing — so a misconfigured proxy / undeployed route is visible.
 */
export async function fetchDownload(url: string, fallbackName = "download"): Promise<void> {
  const res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
  if (!res.ok) {
    // The backend errors as JSON ({ message }); fall back to status text.
    let message = `Export failed (HTTP ${res.status})`;
    try {
      const json = await res.json();
      if (json?.message) message = json.message;
    } catch {
      // non-JSON body — keep the status message
    }
    throw new Error(message);
  }

  // Prefer the server-provided filename from Content-Disposition.
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="?([^"]+)"?/.exec(disposition);
  const filename = match?.[1] ?? fallbackName;

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
