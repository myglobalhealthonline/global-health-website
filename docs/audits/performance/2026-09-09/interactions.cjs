const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const origin='https://www.myglobalhealth.online';
(async()=>{
 const browser=await chromium.launch({headless:true});const results=[];
 try{
 for(const variant of ['desktop-denied','mobile-slow-denied','mobile-accepted']){
  const mobile=variant.startsWith('mobile');
  const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
  const accepted=variant.endsWith('accepted');
  await ctx.addCookies([{name:'gh-consent',value:encodeURIComponent(JSON.stringify({v:4,ts:Date.now(),marketing:accepted,analytics:accepted,thirdParty:accepted})),url:origin}]);
  const page=await ctx.newPage();const requests=[];const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{requests.push({url:r.url(),status:r.status(),type:r.request().resourceType(),method:r.request().method()});});
  const cdp=await ctx.newCDPSession(page);
  if(variant==='mobile-slow-denied'){
   await cdp.send('Network.enable');
   await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750});
   await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  }
  await page.addInitScript(()=>{
   window.__perf={lcp:[],longTasks:[],events:[]};
   new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__perf.lcp.push({start:e.startTime,url:e.url,element:e.element?.tagName}))).observe({type:'largest-contentful-paint',buffered:true});
   new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__perf.longTasks.push({start:e.startTime,duration:e.duration}))).observe({type:'longtask',buffered:true});
   new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__perf.events.push({name:e.name,duration:e.duration,processing:e.processingEnd-e.processingStart}))).observe({type:'event',durationThreshold:16,buffered:true});
  });
  const row={variant};
  try{
   await page.goto(origin+'/ireland/en',{waitUntil:'load',timeout:60000});await page.waitForTimeout(6000);
   row.initial=await page.evaluate(()=>({perf:window.__perf,nav:performance.getEntriesByType('navigation').map(e=>e.toJSON()),resources:performance.getEntriesByType('resource').map(e=>e.toJSON()),cookieBanner:!![...document.querySelectorAll('button')].find(b=>b.textContent==='Accept all')}));
   const navTypeBefore=await page.evaluate(()=>performance.timeOrigin);
   let t=Date.now();
   await page.locator('a[href="/ireland/en/book"]:visible').first().click();
   await page.waitForURL('**/ireland/en/book',{timeout:45000});
   await page.getByRole('button',{name:'Continue',exact:true}).first().waitFor({state:'visible',timeout:45000});
   row.homeToBook={ms:Date.now()-t,fullReload:(await page.evaluate(()=>performance.timeOrigin))!==navTypeBefore};
   const reqStart=requests.length;t=Date.now();
   await page.getByRole('button',{name:'Continue',exact:true}).first().click();
   await page.waitForURL(u=>u.searchParams.has('service')||u.searchParams.has('serviceId'),{timeout:45000});
   await page.waitForTimeout(400);
   row.selectService={ms:Date.now()-t,url:page.url(),text:(await page.locator('main').innerText()).slice(0,1200),requests:requests.slice(reqStart)};
   row.final=await page.evaluate(()=>({perf:window.__perf,resources:performance.getEntriesByType('resource').map(e=>e.toJSON()),nav:performance.getEntriesByType('navigation').map(e=>e.toJSON())}));
  }catch(e){row.error=e.message;}
  row.requests=requests;row.errors=errors;results.push(row);
  console.log(JSON.stringify({variant,initial:row.initial?{ttfb:row.initial.nav[0]?.responseStart,lcp:row.initial.perf.lcp.at(-1),longTasks:row.initial.perf.longTasks,resources:row.initial.resources.length,transfer:row.initial.resources.reduce((s,r)=>s+r.transferSize,0),decoded:row.initial.resources.reduce((s,r)=>s+r.decodedBodySize,0),cookieBanner:row.initial.cookieBanner}:null,homeToBook:row.homeToBook,selectService:row.selectService?{ms:row.selectService.ms,url:row.selectService.url}:null,error:row.error,errors}));
  await ctx.close();
 }
 }finally{fs.writeFileSync(path.join(__dirname,'interactions.json'),JSON.stringify(results,null,2));await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
