import "dotenv/config";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { DRIVE_SCOPE } from "../src/lib/google-drive/drive.constants.js";

/**
 * Mint the GOOGLE_DRIVE_REFRESH_TOKEN for the invoice archive.
 *
 * The organisation enforces `iam.disableServiceAccountKeyCreation`, so the
 * archive authenticates as a real Google account instead. This runs the
 * loopback OAuth flow once: it opens a consent URL, catches the redirect on
 * 127.0.0.1, exchanges the code, and prints the refresh token to paste into
 * Railway. The token is long-lived — this is a one-off.
 *
 * Prerequisites in Google Cloud (same project as the Meet/Calendar client):
 *   1. Enable the Google Drive API.
 *   2. OAuth consent screen → User type INTERNAL. Internal skips Google's
 *      verification review for the restricted `.../auth/drive` scope AND stops
 *      refresh tokens expiring after 7 days, which is what a "Testing" external
 *      app does.
 *   3. Credentials → OAuth client ID → type "Web application", with
 *      http://127.0.0.1:53682/oauth2callback as an authorised redirect URI.
 *
 * Sign in as the account that should OWN the archived files — ideally the one
 * that is a Content manager of the Shared Drive holding the "Invoice" folder.
 *
 *   pnpm tsx scripts/mint-google-drive-token.ts
 *   pnpm tsx scripts/mint-google-drive-token.ts --port=53682
 */

const args = process.argv.slice(2);
const port = Number(args.find((a) => a.startsWith("--port="))?.split("=")[1] ?? "53682");
const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;

// process.env directly, NOT config/env.ts: that module validates the whole file
// at import and throws on any unrelated blank variable. Minting a credential
// must work in an environment that is not yet fully configured — which is
// precisely the situation this script exists for.
const clientId = (process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID)?.trim();
const clientSecret = (
  process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET
)?.trim();

if (!clientId || !clientSecret) {
  console.error(
    "No OAuth client. Set GOOGLE_DRIVE_CLIENT_ID + GOOGLE_DRIVE_CLIENT_SECRET " +
      "(or reuse GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET) in backend/.env first.",
  );
  process.exit(1);
}

const state = randomBytes(16).toString("hex");

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", clientId);
authUrl.searchParams.set("redirect_uri", redirectUri);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", DRIVE_SCOPE);
// consent + offline together are what actually returns a refresh_token: without
// `prompt=consent` Google reuses a previous grant and omits it.
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent");
authUrl.searchParams.set("state", state);

async function exchangeCode(code: string): Promise<void> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId!,
      client_secret: clientSecret!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const data = (await response.json()) as {
    refresh_token?: string;
    scope?: string;
    error?: string;
    error_description?: string;
  };
  if (!response.ok || !data.refresh_token) {
    throw new Error(
      `Token exchange failed: ${data.error_description || data.error || `HTTP ${response.status}`}`,
    );
  }
  console.log("\nGranted scope:", data.scope);
  console.log("\nGOOGLE_DRIVE_REFRESH_TOKEN=" + data.refresh_token + "\n");
  console.log("Paste that into backend/.env and the Railway backend service.");
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
  if (url.pathname !== "/oauth2callback") {
    res.writeHead(404).end("not found");
    return;
  }

  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  // The state check is what stops a stray request on the loopback port from
  // feeding this script somebody else's authorisation code.
  if (url.searchParams.get("state") !== state) {
    res.writeHead(400).end("state mismatch — start the script again");
    server.close();
    process.exitCode = 1;
    return;
  }

  if (error || !code) {
    res.writeHead(400).end(`authorisation failed: ${error ?? "no code returned"}`);
    server.close();
    process.exitCode = 1;
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain" }).end(
    "Done — the refresh token was printed in your terminal. You can close this tab.",
  );

  exchangeCode(code)
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => server.close());
});

server.listen(port, "127.0.0.1", () => {
  console.log("Waiting for the Google consent redirect on", redirectUri);
  console.log("\nOpen this URL, signed in as the account that should own the archive:\n");
  console.log(authUrl.toString(), "\n");
});
