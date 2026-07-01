#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const DEFAULT_WIDTHS = [320, 390, 430, 768, 1024, 1280, 1440, 1920];
const PORTAL_HOME = {
  Admin: "/admin",
  Doctor: "/doctor",
  Patient: "/account",
};
const CREDENTIAL_KEYS = {
  Admin: ["PORTAL_SCREENSHOT_ADMIN_EMAIL", "PORTAL_SCREENSHOT_ADMIN_PASSWORD"],
  Doctor: ["PORTAL_SCREENSHOT_DOCTOR_EMAIL", "PORTAL_SCREENSHOT_DOCTOR_PASSWORD"],
  Patient: ["PORTAL_SCREENSHOT_PATIENT_EMAIL", "PORTAL_SCREENSHOT_PATIENT_PASSWORD"],
};

function parseArgs(argv) {
  const args = {
    portals: [],
    routes: [],
    widths: DEFAULT_WIDTHS,
    checklist: "docs/portal-redesign/screenshot-checklist.md",
    outDir: "docs/portal-redesign/authenticated-screenshots",
    siteUrl: process.env.PORTAL_SCREENSHOT_SITE_URL ?? "http://localhost:3000",
    apiUrl: process.env.PORTAL_SCREENSHOT_API_URL ?? "http://127.0.0.1:4000",
    cookieName: process.env.PORTAL_SCREENSHOT_COOKIE_NAME ?? "gh_auth",
    chromePath:
      process.env.PORTAL_SCREENSHOT_CHROME ??
      "C:\\Users\\kingh\\Downloads\\chrome-win\\chrome.exe",
    routeMapJson: process.env.PORTAL_SCREENSHOT_ROUTE_MAP_JSON ?? "{}",
    routeOffset: 0,
    routeLimit: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];
    if (current === "--portal" && next) {
      args.portals.push(normalizePortal(next));
      index += 1;
    } else if (current === "--route" && next) {
      args.routes.push(next);
      index += 1;
    } else if (current === "--widths" && next) {
      args.widths = next
        .split(",")
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isFinite(value) && value > 0);
      index += 1;
    } else if (current === "--checklist" && next) {
      args.checklist = next;
      index += 1;
    } else if (current === "--out-dir" && next) {
      args.outDir = next;
      index += 1;
    } else if (current === "--site-url" && next) {
      args.siteUrl = next;
      index += 1;
    } else if (current === "--api-url" && next) {
      args.apiUrl = next;
      index += 1;
    } else if (current === "--chrome" && next) {
      args.chromePath = next;
      index += 1;
    } else if (current === "--route-offset" && next) {
      args.routeOffset = Number.parseInt(next, 10);
      index += 1;
    } else if (current === "--route-limit" && next) {
      args.routeLimit = Number.parseInt(next, 10);
      index += 1;
    }
  }

  if (args.portals.length === 0) args.portals = ["Admin", "Doctor", "Patient"];
  if (!Number.isFinite(args.routeOffset) || args.routeOffset < 0) args.routeOffset = 0;
  if (!Number.isFinite(args.routeLimit) || args.routeLimit <= 0) args.routeLimit = null;
  return args;
}

function normalizePortal(value) {
  const key = value.toLowerCase();
  if (key === "admin") return "Admin";
  if (key === "doctor") return "Doctor";
  if (key === "patient" || key === "account") return "Patient";
  throw new Error(`Unknown portal "${value}". Use admin, doctor, or patient.`);
}

function parseChecklist(markdown) {
  return markdown
    .split(/\r?\n/)
    .filter((line) => line.startsWith("| ") && !line.includes("---"))
    .map((line) => line.split("|").map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 8 && cells[2] && cells[3])
    .map((cells) => ({
      portal: cells[2],
      route: cells[3],
    }))
    .filter((entry) => PORTAL_HOME[entry.portal]);
}

function routeContainsPlaceholder(route) {
  return /\[[^\]]+\]/.test(route);
}

function resolveRoute(route, routeMap) {
  return routeMap[route] ?? route;
}

function safeName(value) {
  return value
    .replace(/^\/+/, "")
    .replace(/\[[^\]]+\]/g, "dynamic")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseCookieValue(setCookieHeader, cookieName) {
  if (!setCookieHeader) return null;
  const cookieParts = setCookieHeader.split(/,(?=\s*[^;,]+=)/);
  for (const part of cookieParts) {
    const [pair] = part.trim().split(";");
    const equals = pair.indexOf("=");
    if (equals === -1) continue;
    const name = pair.slice(0, equals);
    const value = pair.slice(equals + 1);
    if (name === cookieName) return value;
  }
  return null;
}

async function loginForPortal(context, page, args, portal) {
  const [emailKey, passwordKey] = CREDENTIAL_KEYS[portal];
  const email = process.env[emailKey];
  const password = process.env[passwordKey];
  if (!email || !password) {
    return {
      ok: false,
      reason: `Missing ${emailKey} or ${passwordKey}`,
    };
  }

  const apiUrl = args.apiUrl.replace(/\/+$/, "");
  const authResponse = await fetch(`${apiUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!authResponse.ok) {
    return {
      ok: false,
      reason: `Backend login failed for ${portal} with status ${authResponse.status}`,
    };
  }
  const setCookieHeader =
    authResponse.headers.get("set-cookie") ??
    (typeof authResponse.headers.getSetCookie === "function"
      ? authResponse.headers.getSetCookie().join(", ")
      : "");
  const cookieValue = parseCookieValue(setCookieHeader, args.cookieName);
  if (!cookieValue) {
    return {
      ok: false,
      reason: `Backend login did not return ${args.cookieName}`,
    };
  }

  const site = new URL(args.siteUrl);
  await context.addCookies([
    {
      name: args.cookieName,
      value: cookieValue,
      domain: site.hostname,
      path: "/",
      httpOnly: true,
      secure: site.protocol === "https:",
      sameSite: "Lax",
    },
  ]);
  await page.goto(new URL(PORTAL_HOME[portal], args.siteUrl).toString(), {
    waitUntil: "domcontentloaded",
  });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(500);
  if (new URL(page.url()).pathname === "/login") {
    return {
      ok: false,
      reason: `Backend cookie was injected but ${portal} still redirected to /login`,
    };
  }

  return { ok: true };
}

async function collectLayoutDiagnostics(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const viewportWidth = window.innerWidth;
    const scrollWidth = Math.max(doc.scrollWidth, body?.scrollWidth ?? 0);
    const horizontalOverflowPx = Math.max(0, Math.round(scrollWidth - viewportWidth));
    const offscreenElements = Array.from(document.body.querySelectorAll("*"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) return null;
        if (rect.right <= viewportWidth + 1 && rect.left >= -1) return null;
        const className =
          typeof element.className === "string" && element.className.trim()
            ? `.${element.className.trim().split(/\s+/).slice(0, 4).join(".")}`
            : "";
        return {
          tag: element.tagName.toLowerCase(),
          id: element.id ? `#${element.id}` : "",
          className,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      })
      .filter(Boolean)
      .slice(0, 8);

    return {
      viewportWidth,
      scrollWidth,
      horizontalOverflowPx,
      hasHorizontalOverflow: horizontalOverflowPx > 1,
      offscreenElements,
    };
  });
}

async function dismissCookieNotice(page) {
  const noticeButton = page.getByRole("button", { name: /^got it$/i }).first();
  try {
    if (await noticeButton.isVisible({ timeout: 800 })) {
      await noticeButton.click({ timeout: 2_000 });
      await page.waitForTimeout(150);
    }
  } catch {
    // Some routes do not show the banner; screenshots should continue.
  }
}

async function screenshotRoute(page, siteUrl, outDir, portal, route, width) {
  await page.setViewportSize({ width, height: 1000 });
  const url = new URL(route, siteUrl).toString();
  const response = await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(400);
  await dismissCookieNotice(page);

  const finalUrl = page.url();
  const finalPath = new URL(finalUrl).pathname;
  const layout = await collectLayoutDiagnostics(page);
  const fileName = `${portal.toLowerCase()}-${safeName(route || "home")}-${width}.png`;
  const screenshotPath = path.join(outDir, "images", portal.toLowerCase(), `${width}`, fileName);
  await mkdir(path.dirname(screenshotPath), { recursive: true });
  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
    scale: "css",
    timeout: 90_000,
  });

  return {
    portal,
    route,
    width,
    status: response?.status() ?? null,
    finalPath,
    redirectedToLogin: finalPath === "/login",
    layout,
    screenshotPath: screenshotPath.replaceAll("\\", "/"),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const checklist = await readFile(args.checklist, "utf8");
  const routeMap = JSON.parse(args.routeMapJson);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(args.outDir, timestamp);
  const resultPath = path.join(outDir, "results.json");
  await mkdir(outDir, { recursive: true });

  let allEntries = parseChecklist(checklist)
    .filter((entry) => args.portals.includes(entry.portal))
    .filter((entry) => args.routes.length === 0 || args.routes.includes(entry.route));
  if (args.routeOffset || args.routeLimit) {
    allEntries = allEntries.slice(
      args.routeOffset,
      args.routeLimit ? args.routeOffset + args.routeLimit : undefined,
    );
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: args.chromePath,
  });
  const results = [];

  async function writeSummary() {
    const summary = {
      checkedAt: new Date().toISOString(),
      siteUrl: args.siteUrl,
      apiUrl: args.apiUrl,
      chromePath: args.chromePath,
      checklist: args.checklist,
      portals: args.portals,
      widths: args.widths,
      routeOffset: args.routeOffset,
      routeLimit: args.routeLimit,
      selectedRoutes: allEntries.length,
      totals: results.reduce((acc, result) => {
        const key = result.status ?? (result.redirectedToLogin ? "redirected" : "captured");
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {}),
      results,
    };
    await writeFile(resultPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
    return summary;
  }

  try {
    for (const portal of args.portals) {
      const context = await browser.newContext();
      const page = await context.newPage();
      const login = await loginForPortal(context, page, args, portal);
      if (!login.ok) {
        results.push({ portal, status: "auth-skipped", reason: login.reason });
        await writeSummary();
        await context.close();
        continue;
      }

      const portalEntries = allEntries.filter((entry) => entry.portal === portal);
      for (const entry of portalEntries) {
        const resolvedRoute = resolveRoute(entry.route, routeMap);
        if (routeContainsPlaceholder(resolvedRoute)) {
          results.push({
            portal,
            route: entry.route,
            status: "route-skipped",
            reason: "Dynamic route requires PORTAL_SCREENSHOT_ROUTE_MAP_JSON replacement",
          });
          await writeSummary();
          continue;
        }

        for (const width of args.widths) {
          try {
            results.push(await screenshotRoute(page, args.siteUrl, outDir, portal, resolvedRoute, width));
          } catch (error) {
            results.push({
              portal,
              route: entry.route,
              width,
              status: "error",
              reason: error instanceof Error ? error.message : String(error),
            });
          }
          await writeSummary();
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }

  const summary = await writeSummary();
  console.log(JSON.stringify({ resultPath: resultPath.replaceAll("\\", "/"), totals: summary.totals }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
