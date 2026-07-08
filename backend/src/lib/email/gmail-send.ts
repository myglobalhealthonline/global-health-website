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

function buildMimeMessage(from: string, input: SendEmailInput): string {
  const boundary = `gh_${Date.now().toString(36)}`;
  const altBoundary = `${boundary}_alt`;
  const lines: string[] = [
    `From: ${escapeHeaderValue(from)}`,
    `To: ${escapeHeaderValue(input.to)}`,
    `Subject: ${escapeHeaderValue(input.subject)}`,
    "MIME-Version: 1.0",
  ];
  if (input.replyTo) {
    lines.push(`Reply-To: ${escapeHeaderValue(input.replyTo)}`);
  }

  const hasAttachments = Boolean(input.attachments?.length);

  if (!hasAttachments) {
    lines.push('Content-Type: multipart/alternative; boundary="' + altBoundary + '"');
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
