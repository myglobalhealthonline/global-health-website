const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTDIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    try {
      console.log(`Capturing hosted at ${vp.name}...`);
      await page.goto('https://frontend-global-health-website.up.railway.app/home', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(4000);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1500);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
      const filename = `hosted-after-${vp.name}-${vp.width}x${vp.height}.png`;
      const filepath = path.join(OUTDIR, filename);
      await page.screenshot({ path: filepath, fullPage: true });
      const stats = fs.statSync(filepath);
      console.log(`  -> ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);
    } catch (e) {
      console.error(`  FAILED: ${e.message}`);
    } finally {
      await context.close();
    }
  }
  await browser.close();
})();
