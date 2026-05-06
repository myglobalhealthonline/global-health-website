const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTDIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

const URLS = [
  { name: 'wix', url: 'https://www.myglobalhealth.online/home' },
  { name: 'hosted', url: 'https://frontend-global-health-website.up.railway.app/home' },
];

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const { name, url } of URLS) {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });
      const page = await context.newPage();
      try {
        console.log(`Capturing ${name} at ${vp.name} (${vp.width}x${vp.height})...`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        // Wait for images/fonts to settle
        await page.waitForTimeout(4000);
        // Scroll to bottom then back to top for lazy-load
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1500);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(500);
        const filename = `${name}-${vp.name}-${vp.width}x${vp.height}.png`;
        const filepath = path.join(OUTDIR, filename);
        await page.screenshot({ path: filepath, fullPage: true });
        const stats = fs.statSync(filepath);
        console.log(`  -> ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);
      } catch (e) {
        console.error(`  FAILED: ${name} ${vp.name}: ${e.message}`);
      } finally {
        await context.close();
      }
    }
  }
  await browser.close();
  console.log('Done. Screenshots in:', OUTDIR);
})();
