const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'screenshots');

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

async function waitForServer(url, maxWait = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    try {
      const res = await fetch(url);
      if (res.status === 200) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  // Start server
  console.log('Starting server...');
  const server = spawn('pnpm', ['--filter', 'frontend', 'start', '-p', '3001'], {
    cwd: path.join(__dirname, '..'),
    shell: true,
    stdio: 'pipe',
  });

  server.stdout.on('data', d => process.stdout.write(d));
  server.stderr.on('data', d => process.stderr.write(d));

  const ready = await waitForServer('http://localhost:3001/home');
  if (!ready) {
    console.error('Server did not start');
    server.kill();
    process.exit(1);
  }
  console.log('Server ready');

  const browser = await chromium.launch();

  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: vp });
    const page = await context.newPage();
    try {
      await page.goto(`http://localhost:3001/home`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1500);
      const fileName = `fixed-home-${vp.width}x${vp.height}.png`;
      await page.screenshot({ path: path.join(OUT_DIR, fileName), fullPage: true });
      console.log(`-> ${fileName}`);
    } catch (e) {
      console.error(`FAILED: ${e.message}`);
    }
    await context.close();
  }

  await browser.close();
  server.kill();
  console.log('Done');
})();
