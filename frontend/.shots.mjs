import { chromium } from "playwright";
import fs from "node:fs";

const OUT = process.argv[2] || "shots";
fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3100";

const PAGES = [
  ["bmi-calculator", "ireland", "en"],
  ["calorie-calculator", "ireland", "en"],
  ["blood-pressure-chart", "spain", "es"],
  ["due-date-calculator", "brazil", "pt"],
  ["ovulation-calculator", "romania", "ro"],
  ["adhd-test", "czechia", "cs"],
];

const browser = await chromium.launch({ args: ["--disable-gpu", "--no-sandbox"] });

async function shoot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
}

for (const [tool, country, lang] of PAGES) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${BASE}/${country}/${lang}/tools/${tool}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await shoot(page, `${tool}-${country}-desktop`);

  // horizontal overflow at 375
  await page.setViewportSize({ width: 375, height: 800 });
  await page.waitForTimeout(500);
  const scroll = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    win: window.innerWidth,
    // any element wider than the viewport
    wide: [...document.querySelectorAll("body *")]
      .filter((el) => el.getBoundingClientRect().width > window.innerWidth + 1)
      .slice(0, 5)
      .map((el) => `${el.tagName}.${(el.className || "").toString().slice(0, 60)}`),
    // is the desktop <table> hidden and the stacked cards shown?
    tableVisible: [...document.querySelectorAll("table")].some(
      (t) => t.getBoundingClientRect().width > 0,
    ),
  }));
  await shoot(page, `${tool}-${country}-375`);
  console.log(
    `${tool}/${country}: 375 scrollWidth=${scroll.doc} inner=${scroll.win} tableVisible=${scroll.tableVisible} wide=[${scroll.wide.join(" | ")}] errors=${errors.length ? errors.slice(0, 2).join(" || ") : "none"}`,
  );
  await ctx.close();
}

await browser.close();
