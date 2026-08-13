import fs from "node:fs";
import path from "node:path";
import Handlebars from "handlebars";
import type { GeneratedDocumentType } from "@prisma/client";
import { TEMPLATE_FILE_BY_TYPE } from "./document-template-utils.js";
import { pdfLogoDataUrl } from "../../lib/pdf/brand.js";
import { labelsForPrefix } from "./docx-template-labels.js";
import { labelPrefixForCountry } from "./docx-template-profiles.js";
import { clinicAddressLines } from "../../lib/clinic-addresses.js";

function resolveTemplatesRoot(): string {
  const candidates = [
    path.join(process.cwd(), "assets", "document-templates"),
  ];
  for (const root of candidates) {
    if (fs.existsSync(path.join(root, "_default"))) return root;
  }
  return path.join(process.cwd(), "assets", "document-templates");
}

export const TEMPLATES_ROOT = resolveTemplatesRoot();

let cachedStyles: string | null = null;

function loadSharedStyles(): string {
  if (cachedStyles) return cachedStyles;
  const stylesPath = path.join(TEMPLATES_ROOT, "_default", "partials", "styles.html");
  cachedStyles = fs.existsSync(stylesPath) ? fs.readFileSync(stylesPath, "utf8") : "";
  return cachedStyles;
}

function resolveTemplatePath(countryCode: string, templateFile: string): string {
  const code = countryCode.toLowerCase().trim();
  // Guard against path traversal. `code` currently comes from a constrained
  // DB country field, but validate defensively so a future caller that
  // forwards a request value can't escape TEMPLATES_ROOT via "../".
  if (/^[a-z]{2,8}$/.test(code)) {
    const countryPath = path.join(TEMPLATES_ROOT, code, templateFile);
    if (fs.existsSync(countryPath)) return countryPath;
  }
  return path.join(TEMPLATES_ROOT, "_default", templateFile);
}

export function resolveTemplateFile(countryCode: string, documentType: GeneratedDocumentType): string {
  return resolveTemplatePath(countryCode, TEMPLATE_FILE_BY_TYPE[documentType]);
}

const compileCache = new Map<string, HandlebarsTemplateDelegate>();

export function renderDocumentHtml(
  countryCode: string,
  documentType: GeneratedDocumentType,
  context: Record<string, unknown>,
): string {
  const templatePath = resolveTemplatePath(countryCode, TEMPLATE_FILE_BY_TYPE[documentType]);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Document template not found: ${templatePath}`);
  }

  let compiled = compileCache.get(templatePath);
  if (!compiled) {
    const source = fs.readFileSync(templatePath, "utf8");
    compiled = Handlebars.compile(source);
    compileCache.set(templatePath, compiled);
  }

  return compiled({
    logoDataUrl: pdfLogoDataUrl(),
    L: labelsForPrefix(labelPrefixForCountry(countryCode)),
    clinicAddressLines: clinicAddressLines(countryCode),
    ...context,
    styles: loadSharedStyles(),
  });
}

let browserPromise: Promise<import("playwright").Browser> | null = null;

async function getBrowser(): Promise<import("playwright").Browser> {
  if (!browserPromise) {
    const { chromium } = await import("playwright");
    browserPromise = chromium
      .launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      })
      .then((browser) => {
        // Self-heal: if the browser crashes or is closed, clear the cached
        // promise so the next render relaunches instead of forever failing
        // against a dead singleton (previously required a process restart).
        browser.on("disconnected", () => {
          browserPromise = null;
        });
        // NOTE: an idle browser keeps the owning process alive, which in tests
        // reads as a hang rather than a leak — every assertion passes and then
        // the worker sits until the runner's timeout. There is no `unref`
        // escape hatch here: Playwright, unlike Puppeteer, does not expose the
        // browser's child process. `closeSharedBrowser()` in an `after` hook is
        // the only mechanism, which is why §24.3 makes it mandatory for any
        // test that transitively renders.
        return browser;
      })
      .catch((err) => {
        // Don't cache a rejected launch — allow the next call to retry.
        browserPromise = null;
        throw err;
      });
  }
  return browserPromise;
}

/**
 * Close the shared Chromium instance. Tests MUST call this in an `after`
 * hook when they (transitively) render a PDF — the browser child process
 * otherwise keeps the node:test worker alive until the runner's timeout.
 * Safe to call when no browser was ever launched.
 */
export async function closeSharedBrowser(): Promise<void> {
  const pending = browserPromise;
  browserPromise = null;
  if (pending) {
    await pending.then(
      (browser) => browser.close(),
      () => undefined,
    );
  }
}

export async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    // "load" not "networkidle": these templates fetch no network resources
    // (styles are inlined, the QR is a data URL), so waiting for network
    // idle only adds a fixed ~500ms of dead time per render.
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

export async function closePdfBrowser(): Promise<void> {
  if (browserPromise) {
    const b = await browserPromise;
    await b.close();
    browserPromise = null;
  }
}

export async function renderDocumentPdf(
  countryCode: string,
  documentType: GeneratedDocumentType,
  context: Record<string, unknown>,
): Promise<Buffer> {
  const html = renderDocumentHtml(countryCode, documentType, context);
  return htmlToPdfBuffer(html);
}
