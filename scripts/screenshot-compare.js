const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const LOCAL_URL = 'http://localhost:3000';
const WIX_URL = 'https://www.myglobalhealth.online/';
const OUT_DIR = path.join(__dirname, 'screenshots');

const pages = [
  { name: 'root', path: '/' },
  { name: 'home', path: '/home' },
  { name: 'book-online', path: '/book-online' },
];

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

async function screenshotPage(browser, url, pagePath, viewport, suffix) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  try {
    await page.goto(`${url}${pagePath}`, { waitUntil: 'networkidle', timeout: 30000 });
    // Wait a bit for any animations
    await page.waitForTimeout(2000);
    const fileName = `${suffix}-${pagePath.replace(/\//g, '') || 'root'}-${viewport.width}x${viewport.height}.png`;
    const filePath = path.join(OUT_DIR, fileName);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`  -> ${fileName}`);
    return filePath;
  } catch (e) {
    console.error(`  FAILED: ${suffix} ${pagePath} @ ${viewport.width}x${viewport.height}: ${e.message}`);
    return null;
  } finally {
    await context.close();
  }
}

(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();

  for (const p of pages) {
    console.log(`\nCapturing ${p.path}...`);
    for (const vp of viewports) {
      await screenshotPage(browser, LOCAL_URL, p.path, vp, 'local');
      await screenshotPage(browser, WIX_URL, p.path, vp, 'wix');
    }
  }

  await browser.close();
  console.log(`\nDone. Screenshots in ${OUT_DIR}`);
})();
