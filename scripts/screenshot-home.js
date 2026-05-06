const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const URL = 'http://localhost:3000';
const OUT_DIR = path.join(__dirname, 'screenshots');

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();

  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: vp });
    const page = await context.newPage();
    try {
      await page.goto(`${URL}/home`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1500);
      const fileName = `prod-home-${vp.width}x${vp.height}.png`;
      await page.screenshot({ path: path.join(OUT_DIR, fileName), fullPage: true });
      console.log(`-> ${fileName}`);
    } catch (e) {
      console.error(`FAILED: ${e.message}`);
    }
    await context.close();
  }

  await browser.close();
})();
