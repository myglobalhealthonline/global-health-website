/* Local browser regression harness. Bundles real components; Next router/image
 * and consent hooks are adapters. No production requests or reservations. */
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const esbuildDir = fs.readdirSync(path.join(root, 'node_modules/.pnpm')).find(n => n.startsWith('esbuild@'));
const esbuild = require(path.join(root, 'node_modules/.pnpm', esbuildDir, 'node_modules/esbuild'));

(async () => {
  const result = await esbuild.build({
    absWorkingDir: path.join(root, 'frontend'), bundle: true, write: false,
    platform: 'browser', format: 'iife', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"development"', 'process.env.NEXT_PUBLIC_API_URL': '""', 'process.env.NEXT_PUBLIC_MEDIA_ALLOWED_HOSTS': '""' },
    stdin: { resolveDir: path.join(root, 'frontend'), loader: 'tsx', contents: `
      import React from 'react';
      import {createRoot} from 'react-dom/client';
      import {HeroBookingWizard} from './components/sections/HeroBookingWizard';
      import {ElevenLabsConvai} from './components/integrations/ElevenLabsConvai';
      const lang = new URLSearchParams(location.search).get('lang') || 'en';
      window.pending = [];
      window.fetch = (url, options) => new Promise((resolve, reject) => {
        window.pending.push({url, signal: options.signal, resolve, reject});
        if (window.autoAbort) options.signal.addEventListener('abort', () => reject(new DOMException('Aborted','AbortError')), {once:true});
      });
      createRoot(document.getElementById('root')).render(<>
        <HeroBookingWizard countryCode="ie" countrySlug="ireland" lang={lang} bookHref="/ireland/en/book"
          doctors={[{slug:'alpha',name:'Dr Alpha',role:'GP',serviceIds:['one','two']}]}
          services={[{id:'one',slug:'one',name:'Consultation One',durationMinutes:30},
            {id:'two',slug:'two',name:'Consultation Two',durationMinutes:30}]} />
        <ElevenLabsConvai />
      </>);
    ` },
    plugins: [{ name: 'browser-adapters', setup(build) {
      build.onResolve({ filter: /^(next\/(image|navigation|script)|@\/components\/compliance\/use-consent)$/ }, args => ({path:args.path, namespace:'adapters'}));
      build.onLoad({filter:/.*/,namespace:'adapters'}, args => ({ loader:'js', contents:
        args.path === 'next/navigation' ? `export const useRouter=()=>({push:href=>window.lastNavigation=href}); export const useParams=()=>({lang:new URLSearchParams(location.search).get('lang')||'en'});` :
        args.path.endsWith('use-consent') ? `export const useConsent=()=>({consent:{thirdParty:new URLSearchParams(location.search).has('consent')}});` :
        args.path === 'next/script' ? `export default function Script(props){window.loadedScripts ??=[];window.loadedScripts.push(props.src);return null;}` :
        `export default function Image(){return null;}`
      }));
    }}],
  });
  const server = http.createServer((req,res) => {
    res.setHeader('Content-Type', req.url === '/bundle.js' ? 'application/javascript' : 'text/html');
    res.end(req.url === '/bundle.js' ? result.outputFiles[0].text : '<!doctype html><html><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({headless:true});
  const proof = [];
  try {
    for (const width of [1440,390]) {
      const page = await browser.newPage({viewport:{width,height:844}});
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(origin);
      await page.getByRole('button',{name:/Dr Alpha/}).click();
      await page.getByRole('button',{name:/Consultation One/}).click();
      await page.getByText('Finding open times…').last().waitFor();
      await page.evaluate(() => window.pending[0].resolve(new Response('{}',{status:503})));
      await page.getByRole('alert').waitFor();
      assert.match(await page.getByRole('alert').innerText(), /Couldn't load/);
      await page.getByRole('button',{name:'Try again',exact:true}).click();
      await page.evaluate(() => window.pending[1].resolve(Response.json({ok:false})));
      await page.getByRole('alert').waitFor();
      await page.getByRole('button',{name:'Try again',exact:true}).click();
      await page.getByRole('button',{name:'Back',exact:true}).click();
      assert.equal(await page.evaluate(() => window.pending[2].signal.aborted), true);
      await page.getByRole('button',{name:/Consultation Two/}).click();
      await page.evaluate(() => {
        window.pending[3].resolve(Response.json({ok:true,data:{slots:[],clinicTimezone:'UTC'}}));
        window.pending[2].resolve(Response.json({ok:true,data:{slots:[{id:'stale',startAt:'2030-01-01T10:00:00Z'}],clinicTimezone:'UTC'}}));
      });
      await page.getByText('No open times in the next two weeks. Try another doctor.').waitFor();
      assert.equal(await page.getByRole('button',{name:/10:00/}).count(), 0);
      await page.getByRole('button',{name:'Back',exact:true}).click();
      await page.getByRole('button',{name:/Consultation One/}).click();
      await page.evaluate(() => window.pending[4].reject(new DOMException('Deadline exceeded','AbortError')));
      await page.getByRole('alert').waitFor();
      await page.clock.install();
      await page.evaluate(() => { window.autoAbort = true; });
      await page.getByRole('button',{name:'Try again',exact:true}).click();
      await page.clock.fastForward(8001);
      await page.getByRole('alert').waitFor();
      assert.equal(await page.evaluate(() => window.pending.at(-1).signal.aborted), true);
      assert.deepEqual(errors, []);
      proof.push({width,checks:['pending','HTTP failure','malformed envelope','retry','back cancellation','late response ignored','abort failure retryable','eight-second deadline'],pageErrors:errors});
      await page.close();
    }
    const page = await browser.newPage();
    await page.goto(origin+'/?lang=pt&consent=1');
    assert.equal(await page.evaluate(() => (window.loadedScripts||[]).length),0);
    await page.getByRole('button',{name:'Abrir assistente de voz'}).click();
    assert.match(await page.evaluate(() => window.loadedScripts[0]), /convai-widget-embed/);
    await page.getByRole('button',{name:/Dr Alpha/}).click();
    await page.getByRole('button',{name:/Consultation One/}).click();
    await page.evaluate(() => window.pending[0].resolve(new Response('{}',{status:503})));
    await page.getByRole('button',{name:'Tentar novamente',exact:true}).waitFor();
    proof.push({checks:['Portuguese retry','voice script absent before launcher click','voice script mounted on launcher click']});
    await page.goto(origin);
    assert.equal(await page.getByRole('button',{name:'Open voice assistant'}).count(),0);
    proof.push({checks:['voice launcher absent without consent']});
    console.log(JSON.stringify({passed:true,scope:'Real React components with mocked network, Next and consent adapters; not full Next navigation or performance timings.',results:proof},null,2));
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode=1; });
