import { chromium } from "playwright";
import fs from "node:fs";

const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3100";

/** Per tool: [country, lang], then two input states expected to land in different bands. */
const CASES = [
  {
    tool: "bmi-calculator",
    market: ["ireland", "en"],
    a: { text: ["170", "62"] },
    b: { text: ["170", "115"] },
  },
  {
    tool: "blood-pressure-chart",
    market: ["spain", "es"],
    a: { text: ["115", "72"] },
    b: { text: ["168", "104"] },
  },
  {
    tool: "calorie-calculator",
    market: ["ireland", "en"],
    a: { text: ["30", "175", "70"], select: [0] },
    b: { text: ["45", "175", "70"], select: [4] },
  },
  {
    tool: "due-date-calculator",
    market: ["brazil", "pt"],
    a: { date: ["2026-03-01"], text: ["28"] },
    b: { date: ["2025-11-05"], text: ["28"] },
  },
  {
    tool: "ovulation-calculator",
    market: ["romania", "ro"],
    a: { date: ["2026-07-20"], text: ["28"] },
    b: { date: ["2026-08-04"], text: ["35"] },
  },
  {
    tool: "adhd-test",
    market: ["czechia", "cs"],
    a: { select: [0, 0, 0, 0, 0, 0] },
    b: { select: [4, 4, 4, 4, 4, 4] },
  },
];

const browser = await chromium.launch({ args: ["--disable-gpu", "--no-sandbox"] });

const readout = async (page) =>
  page.evaluate(() => {
    const el = document.querySelector('[aria-live="polite"]');
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      text: el.innerText.replace(/\s+/g, " ").trim().slice(0, 220),
      bg: cs.backgroundImage.slice(0, 60) + "|" + cs.backgroundColor,
      border: cs.borderColor,
    };
  });

async function apply(page, state) {
  const panel = page.locator('[aria-live="polite"]').first();
  await panel.waitFor();
  const scope = page.locator("aside, form, div").first();
  void scope;
  if (state.text) {
    const inputs = page.locator('input[inputmode="decimal"], input[inputmode="numeric"]');
    for (let i = 0; i < state.text.length; i++) {
      await inputs.nth(i).fill(state.text[i]);
    }
  }
  if (state.date) {
    const dates = page.locator('input[type="date"]');
    for (let i = 0; i < state.date.length; i++) await dates.nth(i).fill(state.date[i]);
  }
  if (state.select) {
    const sels = page.locator("select");
    for (let i = 0; i < state.select.length; i++) {
      const opts = await sels.nth(i).locator("option").all();
      const idx = Math.min(state.select[i], opts.length - 1);
      await sels.nth(i).selectOption({ index: idx });
    }
  }
  await page.waitForTimeout(350);
}

for (const c of CASES.filter((x) => !process.argv[3] || process.argv[3].split(',').some((t) => x.tool.startsWith(t)))) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto(`${BASE}/${c.market[0]}/${c.market[1]}/tools/${c.tool}`, {
    waitUntil: "networkidle",
  });
  const empty = await readout(page);
  await apply(page, c.a);
  const A = await readout(page);
  await apply(page, c.b);
  const B = await readout(page);

  const holes = (await page.evaluate(() => document.body.innerText)).match(
    /\{(country|kg|lb|count|total|weeks|days|date)\}/g,
  );

  await page
    .locator('[aria-live="polite"]')
    .first()
    .screenshot({ path: `${OUT}/${c.tool}-readout-B.png` })
    .catch(() => {});

  console.log(`\n### ${c.tool} (${c.market.join("/")})`);
  console.log(`  empty : ${empty?.text}`);
  console.log(`  A     : ${A?.text}`);
  console.log(`          border=${A?.border}`);
  console.log(`  B     : ${B?.text}`);
  console.log(`          border=${B?.border}`);
  console.log(
    `  VERDICT: calculates=${A?.text !== empty?.text ? "yes" : "NO"} changes=${A?.text !== B?.text ? "yes" : "NO"} bandColourChanges=${A?.border !== B?.border ? "yes" : "NO"} placeholders=${holes ? holes.join(",") : "none"} jsErrors=${errs.length}`,
  );
  await ctx.close();
}

await browser.close();
