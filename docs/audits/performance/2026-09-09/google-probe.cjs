const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
// Read the configured Google API credential without printing or persisting it.
const key=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.config/claude-seo/google-api.json'),'utf8')).api_key;
(async()=>{
  const results=await Promise.all([
    (async()=>{const r=await fetch('https://chromeuxreport.googleapis.com/v1/records:queryRecord',{method:'POST',headers:{'content-type':'application/json','X-Goog-Api-Key':key},body:JSON.stringify({origin:'https://www.myglobalhealth.online',formFactor:'PHONE'}),signal:AbortSignal.timeout(30000)});const data=await r.json();fs.writeFileSync(path.join(__dirname,'crux-mobile.json'),JSON.stringify(data,null,2));return {type:'crux',status:r.status,data};})(),
    (async()=>{const u=new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');u.searchParams.set('url','https://www.myglobalhealth.online/ireland/en');u.searchParams.set('strategy','mobile');u.searchParams.set('category','performance');const r=await fetch(u,{headers:{'X-Goog-Api-Key':key},signal:AbortSignal.timeout(180000)});const data=await r.json();fs.writeFileSync(path.join(__dirname,'pagespeed-mobile.json'),JSON.stringify(data,null,2));const l=data.lighthouseResult;return {type:'pagespeed',status:r.status,error:data.error,score:l?.categories?.performance?.score,audits:l?Object.fromEntries(Object.entries(l.audits).filter(([k,v])=>v.score!==1&&(v.numericValue||v.details?.overallSavingsMs)).map(([k,v])=>[k,{title:v.title,score:v.score,display:v.displayValue,value:v.numericValue,details:v.details}])):null};})()
  ]);for(const r of results)console.log(JSON.stringify(r));
})().catch(e=>{console.error(e.name+': '+e.message);process.exitCode=1;});
