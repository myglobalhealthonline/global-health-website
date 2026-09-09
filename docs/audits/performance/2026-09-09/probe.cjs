const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const out = __dirname;
const origin = 'https://www.myglobalhealth.online';
const routes = ['/', '/ireland/en', '/czechia/cs', '/portugal/pt', '/spain/es', '/romania/ro', '/brazil/pt', '/ireland/en/services', '/ireland/en/doctors', '/ireland/en/blog', '/ireland/en/book'];
const results = { measuredAt: new Date().toISOString(), environment: 'Unthrottled Chromium on audit workstation; anonymous public requests only', http: [], browser: [] };
(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    for (const route of routes) {
      for(let repeat=0;repeat<2;repeat++) {
        const t=performance.now();
        try {
          const r=await fetch(origin+route,{signal:AbortSignal.timeout(30000)});
          const headersMs=performance.now()-t;
          const body=await r.text();
          const row={route,repeat,status:r.status,url:r.url,headersMs:Math.round(headersMs),totalMs:Math.round(performance.now()-t),htmlBytes:Buffer.byteLength(body),cache:r.headers.get('cache-control'),nextCache:r.headers.get('x-nextjs-cache'),age:r.headers.get('age'),edge:r.headers.get('x-railway-edge')};
          results.http.push(row); console.log(JSON.stringify(row));
        } catch(e){results.http.push({route,repeat,error:e.message});}
      }
    }
    for (const route of ['/ireland/en','/czechia/cs','/ireland/en/doctors','/ireland/en/book']) {
      const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
      const page=await context.newPage();
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(()=>{
        window.__audit={lcp:[],longTasks:[],cls:0};
        new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__audit.lcp.push({start:e.startTime,size:e.size,url:e.url,element:e.element?.outerHTML.slice(0,500)}))).observe({type:'largest-contentful-paint',buffered:true});
        new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__audit.longTasks.push({start:e.startTime,duration:e.duration}))).observe({type:'longtask',buffered:true});
        new PerformanceObserver(l=>l.getEntries().forEach(e=>{if(!e.hadRecentInput)window.__audit.cls+=e.value;})).observe({type:'layout-shift',buffered:true});
      });
      try {
        await page.goto(origin+route,{waitUntil:'load',timeout:45000});
        await page.waitForTimeout(4000);
        const data=await page.evaluate(()=>({url:location.href,title:document.title,h1:document.querySelector('h1')?.textContent,audit:window.__audit,navigation:performance.getEntriesByType('navigation').map(x=>x.toJSON()),resources:performance.getEntriesByType('resource').map(x=>x.toJSON()),links:[...document.querySelectorAll('a[href]')].slice(0,65).map(a=>({text:a.textContent.trim().slice(0,80),href:a.getAttribute('href')})),buttons:[...document.querySelectorAll('button')].map(b=>({text:b.textContent.trim().slice(0,70),label:b.getAttribute('aria-label')})),images:[...document.images].map(i=>({src:i.currentSrc,width:i.width,height:i.height,naturalWidth:i.naturalWidth,loading:i.loading})),domNodes:document.querySelectorAll('*').length}));
        const row={route,errors,...data};results.browser.push(row);
        console.log(JSON.stringify({browser:route,ttfb:data.navigation[0]?.responseStart,lcp:data.audit.lcp.at(-1),longTasks:data.audit.longTasks.length,cls:data.audit.cls,requests:data.resources.length,transfer:data.resources.reduce((a,b)=>a+b.transferSize,0),errors}));
        await page.screenshot({path:path.join(out,route.replaceAll('/','_')+'.png')});
      } catch(e){results.browser.push({route,error:e.message});}
      await context.close();
    }
  } finally {await browser.close();fs.writeFileSync(path.join(out,'baseline.json'),JSON.stringify(results,null,2));}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
