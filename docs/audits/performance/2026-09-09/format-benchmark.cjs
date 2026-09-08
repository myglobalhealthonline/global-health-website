const fs=require('node:fs');const path=require('node:path');const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{const ctx=await browser.newContext();const page=await ctx.newPage();const cdp=await ctx.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 const data=await(await fetch('https://www.myglobalhealth.online/api/public/gp-availability?country=ie&language=english&days=7',{signal:AbortSignal.timeout(30000)})).json();
 const result=await page.evaluate(({slots,zone})=>{const values=slots.map(s=>s.startAt);const rows=[];for(let i=0;i<3;i++){let t=performance.now();const a=values.map(v=>new Intl.DateTimeFormat('en-IE',{dateStyle:'medium',timeZone:zone}).format(new Date(v)));const uncached=performance.now()-t;t=performance.now();const f=new Intl.DateTimeFormat('en-IE',{dateStyle:'medium',timeZone:zone});const b=values.map(v=>f.format(new Date(v)));const reuse=performance.now()-t;rows.push({constructPerSlotMs:uncached,reuseMs:reuse,equal:JSON.stringify(a)===JSON.stringify(b)});}return{slotCount:values.length,zone,rows};},{slots:data.data.slots,zone:data.data.clinicTimezone});
 fs.writeFileSync(path.join(__dirname,'format-benchmark.json'),JSON.stringify({method:'Isolated Chromium microbenchmark; 4x CPU slowdown; same live public slot dates and locale/timezone; not whole-page speedup',...result},null,2));console.log(JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
