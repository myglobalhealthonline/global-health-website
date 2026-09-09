// Run against a production Next build on 3018 and public-performance-proxy.cjs on 4018.
// Public navigation only. Never selects a slot or submits booking details.
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
(async () => {
  const browser = await chromium.launch({headless:true});
  const results = [];
  try {
    for (const {width,accepted} of [{width:1440,accepted:false},{width:390,accepted:false},{width:390,accepted:true}]) {
      const context = await browser.newContext({viewport:{width,height:844}});
      const voiceRequests = [];
      await context.route('**/*', route => {
        if (route.request().url().includes('convai-widget-embed')) voiceRequests.push(route.request().url());
        return new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort();
      });
      await context.addCookies([{name:'gh-consent',url:'http://127.0.0.1:3018',value:encodeURIComponent(JSON.stringify({v:4,ts:Date.now(),marketing:accepted,analytics:accepted,thirdParty:accepted}))}]);
      const page = await context.newPage();
      await fetch('http://127.0.0.1:4018/__verification?mode=normal');
      await page.goto('http://127.0.0.1:3018/ireland/en/book',{waitUntil:'domcontentloaded',timeout:180000});
      await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent === 'Continue' && Object.keys(button).some(key => key.startsWith('__reactProps$') && typeof button[key]?.onClick === 'function')), null, {timeout:60000});
      const overflow = await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
      assert.ok(overflow <= 1, `horizontal overflow ${overflow}`);
      assert.equal(voiceRequests.length,0);
      if (accepted) {
        await page.getByRole('button',{name:'Open voice assistant',exact:true}).click();
        await page.waitForFunction(() => !!document.querySelector('script[src*="convai-widget-embed"]'));
      } else assert.equal(await page.getByRole('button',{name:'Open voice assistant',exact:true}).count(),0);
      const catalogueHistory = await page.evaluate(() => history.state?.__PRIVATE_NEXTJS_INTERNALS_TREE);
      assert.ok(catalogueHistory?.tree, 'initial catalogue has a router history tree');
      assert.equal(catalogueHistory.renderedSearch, '', 'initial history describes the catalogue');
      await fetch('http://127.0.0.1:4018/__verification?mode=error');
      await page.getByRole('button',{name:'Continue',exact:true}).first().click();
      await page.getByRole('heading',{name:'Booking is temporarily unavailable',exact:true}).waitFor({timeout:120000});
      // A failed retry must leave the boundary usable for another attempt.
      await Promise.all([
        page.waitForResponse(response => response.url().includes('/book?service=') && response.url().includes('_rsc='), {timeout:60000}),
        page.getByRole('button',{name:'Try again',exact:true}).click(),
      ]);
      await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent?.trim() === 'Try again' && !button.disabled), null, {timeout:60000});
      await page.getByRole('heading',{name:'Booking is temporarily unavailable',exact:true}).waitFor();
      await fetch('http://127.0.0.1:4018/__verification?mode=normal');
      const selectedUrl = page.url();
      const selectedHistoryLength = await page.evaluate(() => history.length);
      const documentTimeOrigin = await page.evaluate(() => performance.timeOrigin);
      await page.getByRole('button',{name:'Try again',exact:true}).click();
      await page.getByRole('heading',{name:'Booking is temporarily unavailable',exact:true}).waitFor({state:'hidden',timeout:120000});
      await page.getByRole('heading',{name:'Pick a time',exact:true}).waitFor({timeout:60000});
      const recovered = (await page.locator('main').innerText()).slice(0,1800);
      assert.ok(!recovered.includes('Booking is temporarily unavailable'));
      assert.equal(page.url(), selectedUrl, 'retry preserves the selected service');
      assert.equal(await page.evaluate(() => performance.timeOrigin), documentTimeOrigin, 'retry keeps the current document');
      assert.equal(await page.evaluate(() => history.length), selectedHistoryLength, 'retry adds no history entry');
      // Verify a harmless date interaction before traversing history; no slot
      // is selected and no reservation or patient details are submitted.
      await page.waitForFunction(() => [...document.querySelectorAll('button[role="tab"]')].some(button => Object.keys(button).some(key => key.startsWith('__reactProps$') && typeof button[key]?.onClick === 'function')), null, {timeout:60000});
      await page.getByRole('tab').nth(1).click();
      await page.waitForFunction(() => document.querySelectorAll('button[role="tab"]')[1]?.getAttribute('aria-selected') === 'true');
      await page.goBack({waitUntil:'domcontentloaded'});
      assert.equal(page.url(), 'http://127.0.0.1:3018/ireland/en/book', 'Back returns to the service catalogue');
      assert.equal(await page.evaluate(() => history.state?.__PRIVATE_NEXTJS_INTERNALS_TREE?.renderedSearch), '', 'restored history describes the catalogue');
      await page.getByRole('heading',{name:'Choose what you need',exact:true}).waitFor({timeout:60000});
      await page.getByRole('button',{name:'Continue',exact:true}).first().waitFor({timeout:60000});
      await fetch('http://127.0.0.1:4018/__verification?mode=delay');
      await page.getByRole('button',{name:'Continue',exact:true}).nth(1).click();
      await page.locator('[aria-busy="true"]').first().waitFor({timeout:30000});
      results.push({width,accepted,overflow,errorBoundary:true,failedRetryRecoverable:true,retryRecovered:true,backNavigation:true,pendingFeedback:true,voiceConsentGate:true,recoveredText:recovered});
      await context.close();
    }
    console.log(JSON.stringify({passed:true,scope:'Local production Next build, CSP enforced, snapshotted anonymous public content/availability and injected failures/delays. External tracker/script loads blocked; proxy images excluded. Not production latency or field CWV.',results},null,2));
  } finally {
    await fetch('http://127.0.0.1:4018/__verification?mode=normal');
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
