import { env } from "../../config/env.js";
import type { SendEmailInput } from "./send-email.js";

function gmailSendRefreshToken(): string | undefined {
  return (
    env.GMAIL_SEND_REFRESH_TOKEN?.trim() ||
    env.GOOGLE_OAUTH_REFRESH_TOKEN?.trim() ||
    undefined
  );
}

export function isGmailConfigured(): boolean {
  return Boolean(
    env.GMAIL_SEND_FROM?.trim() &&
      env.GOOGLE_OAUTH_CLIENT_ID?.trim() &&
      env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() &&
      gmailSendRefreshToken(),
  );
}

async function getGoogleAccessToken(): Promise<string> {
  const refreshToken = gmailSendRefreshToken();
  if (!refreshToken) {
    throw new Error("Gmail send refresh token is not configured");
  }
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = (await response.json()) as {
    access_token?: string;
    error_description?: string;
    error?: string;
  };
  if (!response.ok || !data.access_token) {
    throw new Error(
      `Gmail OAuth failed: ${data.error_description || data.error || `HTTP ${response.status}`}`,
    );
  }
  return data.access_token;
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function escapeHeaderValue(value: string): string {
  return value.replace(/\r?\n/g, " ").trim();
}

/**
 * RFC 2047 "encoded-word" for header values that carry non-ASCII text
 * (accented names, Czech/Portuguese/Romanian subjects). Without this the raw
 * UTF-8 bytes reach the client as mojibake — "Přístupové" renders as
 * "PÅ™Ã­stupovÃ©". ASCII-only values are passed through untouched.
 *
 * Each encoded-word must stay under 76 chars including the `=?UTF-8?B?…?=`
 * wrapper, so the source is chunked at 45 bytes (→ 60 base64 chars). Chunking
 * walks code points, never bytes, so a multi-byte character is never split
 * across two words.
 */
function encodeHeaderValue(value: string): string {
  const clean = escapeHeaderValue(value);
  // eslint-disable-next-line no-control-regex
  if (!/[^\x00-\x7F]/.test(clean)) return clean;

  const MAX_CHUNK_BYTES = 45;
  const chunks: string[] = [];
  let current = "";
  let currentBytes = 0;

  for (const char of clean) {
    const charBytes = Buffer.byteLength(char, "utf-8");
    if (currentBytes + charBytes > MAX_CHUNK_BYTES) {
      chunks.push(current);
      current = "";
      currentBytes = 0;
    }
    current += char;
    currentBytes += charBytes;
  }
  if (current) chunks.push(current);

  // Continuation lines are folded with CRLF + a single space, per RFC 2047.
  return chunks
    .map((chunk) => `=?UTF-8?B?${Buffer.from(chunk, "utf-8").toString("base64")}?=`)
    .join("\r\n ");
}

/** Encode only the display-name half of `Name <addr@host>`; the address itself
 *  must stay literal or the envelope breaks. */
function encodeAddressHeader(value: string): string {
  const clean = escapeHeaderValue(value);
  const match = /^(.*)<([^>]+)>$/.exec(clean);
  if (!match) return clean;
  const name = match[1].trim().replace(/^"(.*)"$/, "$1");
  const address = match[2].trim();
  if (!name) return `<${address}>`;
  return `${encodeHeaderValue(name)} <${address}>`;
}

/** Base64 bodies must be line-folded at 76 chars per RFC 2045. */
function base64Body(value: string): string {
  return (
    Buffer.from(value, "utf-8")
      .toString("base64")
      .match(/.{1,76}/g) ?? []
  ).join("\r\n");
}

function buildMimeMessage(from: string, input: SendEmailInput): string {
  const boundary = `gh_${Date.now().toString(36)}`;
  const altBoundary = `${boundary}_alt`;
  const lines: string[] = [
    `From: ${encodeAddressHeader(from)}`,
    `To: ${encodeAddressHeader(input.to)}`,
    `Subject: ${encodeHeaderValue(input.subject)}`,
    "MIME-Version: 1.0",
  ];
  if (input.replyTo) {
    lines.push(`Reply-To: ${encodeAddressHeader(input.replyTo)}`);
  }

  const hasAttachments = Boolean(input.attachments?.length);

  if (!hasAttachments) {
    lines.push('Content-Type: multipart/alternative; boundary="' + altBoundary + '"');
    lines.push("");
    lines.push(`--${altBoundary}`);
    lines.push("Content-Type: text/plain; charset=UTF-8");
    lines.push("Content-Transfer-Encoding: base64");
    lines.push("");
    lines.push(base64Body(input.text));
    lines.push(`--${altBoundary}`);
    lines.push("Content-Type: text/html; charset=UTF-8");
    lines.push("Content-Transfer-Encoding: base64");
    lines.push("");
    lines.push(base64Body(input.html));
    lines.push(`--${altBoundary}--`);
    return lines.join("\r\n");
  }

  lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  lines.push("");
  lines.push(`--${boundary}`);
  lines.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
  lines.push("");
  lines.push(`--${altBoundary}`);
  lines.push("Content-Type: text/plain; charset=UTF-8");
  lines.push("Content-Transfer-Encoding: 7bit");
  lines.push("");
  lines.push(input.text);
  lines.push(`--${altBoundary}`);
  lines.push("Content-Type: text/html; charset=UTF-8");
  lines.push("Content-Transfer-Encoding: 7bit");
  lines.push("");
  lines.push(input.html);
  lines.push(`--${altBoundary}--`);

  for (const att of input.attachments ?? []) {
    lines.push(`--${boundary}`);
    lines.push(
      `Content-Type: ${att.contentType ?? "application/octet-stream"}; name="${att.filename}"`,
    );
    lines.push(`Content-Disposition: attachment; filename="${att.filename}"`);
    lines.push("Content-Transfer-Encoding: base64");
    lines.push("");
    lines.push(att.content.toString("base64"));
  }

  lines.push(`--${boundary}--`);
  return lines.join("\r\n");
}

export type GmailSendResult =
  | { ok: true; id: string | null }
  | { ok: false; message: string };

export async function sendViaGmail(input: SendEmailInput): Promise<GmailSendResult> {
  const from = env.GMAIL_SEND_FROM!.trim();
  try {
    const token = await getGoogleAccessToken();
    const raw = base64UrlEncode(Buffer.from(buildMimeMessage(from, input), "utf-8"));

    const response = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw }),
      },
    );

    const data = (await response.json()) as {
      id?: string;
      error?: { message?: string };
    };

    if (!response.ok) {
      return {
        ok: false,
        message: data.error?.message ?? `Gmail API HTTP ${response.status}`,
      };
    }

    return { ok: true, id: data.id ?? null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gmail send failed";
    return { ok: false, message };
  }
}
