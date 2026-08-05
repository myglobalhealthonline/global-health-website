import { chromium } from "playwright";

const OUT = process.argv[2];
const browser = await chromium.launch({ args: ["--disable-gpu", "--no-sandbox"] });

// 375px: the chart section, stacked
const m = await browser.newContext({ viewport: { width: 375, height: 900 } });
const p = await m.newPage();
await p.goto("http://localhost:3100/spain/es/tools/blood-pressure-chart", {
  waitUntil: "networkidle",
});
await p.locator("#chart").screenshot({ path: `${OUT}/bp-chart-375-stacked.png` });
await p.goto("http://localhost:3100/ireland/en/tools/bmi-calculator", { waitUntil: "networkidle" });
await p.locator("#categories").screenshot({ path: `${OUT}/bmi-chart-375-stacked.png` });
await m.close();

// desktop: hero + widget, and the chart table
const d = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const q = await d.newPage();
await q.goto("http://localhost:3100/brazil/pt/tools/due-date-calculator", {
  waitUntil: "networkidle",
});
await q.waitForTimeout(300);
await q.screenshot({ path: `${OUT}/due-date-brazil-hero.png` });
await q.locator("#timeline").screenshot({ path: `${OUT}/due-date-brazil-chart.png` });
await q.goto("http://localhost:3100/czechia/cs/tools/adhd-test", { waitUntil: "networkidle" });
await q.locator('[aria-live="polite"]').first().scrollIntoViewIfNeeded();
await q.screenshot({ path: `${OUT}/adhd-czechia-hero.png` });
await d.close();

await browser.close();
