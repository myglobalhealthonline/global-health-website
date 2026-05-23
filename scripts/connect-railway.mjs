#!/usr/bin/env node
/**
 * Connect local repo to Railway. Uses Node (already required for this project)
 * so we avoid Windows PowerShell treating Railway stderr as fatal errors.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(repoRoot);

function runRailway(args, { inherit = false } = {}) {
  const result = spawnSync("railway", args, {
    cwd: repoRoot,
    stdio: inherit ? "inherit" : "pipe",
    shell: process.platform === "win32",
    encoding: "utf8",
  });

  const stdout = (result.stdout ?? "").trim();
  const stderr = (result.stderr ?? "").trim();
  const output = [stdout, stderr].filter(Boolean).join("\n");

  return {
    ok: result.status === 0,
    status: result.status ?? 1,
    output,
  };
}

function ensureCli() {
  const which = runRailway(["--version"]);
  if (which.ok) return;

  console.log("Installing @railway/cli globally...");
  const install = spawnSync("npm", ["install", "-g", "@railway/cli"], {
    stdio: "inherit",
    shell: true,
  });
  if ((install.status ?? 1) !== 0) {
    console.error("Could not install Railway CLI. Run: npm install -g @railway/cli");
    process.exit(1);
  }
}

function isAuthed() {
  return runRailway(["whoami"]).ok;
}

function step(title) {
  console.log("");
  console.log(title);
}

ensureCli();

console.log("");
console.log("Global Health Website -> Railway connect");
console.log(`Repo: ${repoRoot}`);

if (!isAuthed()) {
  step("Step 1/3: Sign in to Railway (browser should open)");
  const login = runRailway(["login"], { inherit: true });
  if (!login.ok || !isAuthed()) {
    console.error("");
    console.error("Login did not complete.");
    console.error("Try manually in this folder:");
    console.error("  railway login");
    console.error("");
    console.error("Or create a token at https://railway.com/account/tokens and run:");
    console.error('  setx RAILWAY_TOKEN "your-token-here"');
    console.error("Then open a new terminal and run: pnpm railway:connect");
    process.exit(1);
  }
  console.log("Signed in.");
}

step("Step 2/3: Link this folder to your Railway project");
console.log("Pick workspace/team, then Global-Health-Website, environment production.");
const link = runRailway(["link"], { inherit: true });
if (!link.ok) {
  console.error("");
  console.error("Linking failed. Try manually:");
  console.error(`  cd "${repoRoot}"`);
  console.error("  railway link");
  process.exit(1);
}

step("Step 3/3: Verify link");
runRailway(["status"], { inherit: true });

console.log("");
console.log("Service root directories (Railway dashboard -> Service -> Settings):");
console.log("  Backend  -> Root Directory = backend");
console.log("  Frontend -> Root Directory = frontend");
console.log("");
console.log("Live URLs:");
console.log("  Backend : https://backend-global-health-website.up.railway.app");
console.log("  Frontend: https://frontend-global-health-website.up.railway.app");
console.log("");
console.log("Useful commands: railway status | railway logs | railway open");

if (existsSync(join(repoRoot, ".railway"))) {
  console.log("");
  console.log("Linked successfully (.railway folder created).");
}
