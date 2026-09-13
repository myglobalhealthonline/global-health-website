import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(`${process.cwd()}/node_modules/.pnpm/playwright@1.62.1/node_modules/playwright/package.json`);
const { chromium } = require('playwright');
const dir='docs/audits/seo/internal-linking-2026-09-13/implementation';
const proposals=JSON.parse(await fs.readFile(`${dir}/../proposed-links.json`,'utf8'));
const browser=await chromium.launch({channel:'chrome',headless:true});
const checks=[];
try {
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
    const context=await browser.newContext({viewport});
    const page=await context.newPage();
    for(const row of [6,7,10,11,12]) {
      const p=proposals[row-1],path=new URL(p.source).pathname;
      const response=await page.goto(`http://localhost:3013${path}`,{waitUntil:'domcontentloaded',timeout:120000});
      assert.equal(response.status(),200,`Source ${path}`);
      const reject=page.getByRole('button',{name:/^(Refuz|Rechazar|Recusar|Odmítnout|Reject)$/});
      if(row===6) await reject.waitFor({state:'visible',timeout:15000});
      if(await reject.isVisible()) await reject.click();
      const anchor=page.locator(`main a[href="${new URL(p.destination).pathname}"]`).filter({hasText:p.anchor});
      await anchor.waitFor({state:'visible'});
      assert.equal(await anchor.count(),1,`Duplicate contextual link row ${row}`);
      await anchor.scrollIntoViewIfNeeded();
      await anchor.focus();
      // Wait for the page's smooth scrolling/lazy sections to settle before capture.
      for(let attempt=0;attempt<5;attempt++) {
        await anchor.evaluate(el=>el.scrollIntoView({block:'center'}));
        await page.waitForTimeout(700);
        const position=await anchor.boundingBox();
        if(position && position.y>=0 && position.y+position.height<=viewport.height) break;
      }
      assert(await anchor.evaluate(el=>document.activeElement===el),'Keyboard focus');
      const box=await anchor.boundingBox();
      assert(box && box.x>=0 && box.x+box.width<=viewport.width+1,'Link overflows viewport');
      assert(box.y>=0 && box.y+box.height<=viewport.height,`Link outside visible viewport row ${row}: ${JSON.stringify(box)}`);
      await page.screenshot({path:`backups/internal-linking-2026-09-13/row-${row}-${viewport.width}.png`});
      checks.push({row,viewport,status:response.status(),anchor:await anchor.innerText(),keyboardFocus:true,noOverflow:true});
    }
    await context.close();
  }
  await fs.writeFile(`${dir}/preview-proof.json`,JSON.stringify({checkedAt:new Date().toISOString(),checks},null,2));
  console.log(JSON.stringify(checks));
} finally {await browser.close();}
