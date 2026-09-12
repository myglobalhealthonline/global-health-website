import fs from 'node:fs/promises';
const dir='seo/romania/raw/api'; await fs.mkdir(dir,{recursive:true});
const pages=JSON.parse(await fs.readFile('seo/romania/raw/public-inventory-2026-09-13.json','utf8'));
const jobs=[];
for(const locale of ['RO','EN','CS','DE','ES','PT']){
 jobs.push({name:`doctors-${locale}`,path:`/api/countries/ro/doctors?locale=${locale}`});
 jobs.push({name:`services-${locale}`,path:`/api/countries/ro/services?locale=${locale}`});
}
for(const p of pages){const parts=new URL(p.url).pathname.split('/');if(parts.length!==5||!['services','doctors'].includes(parts[3]))continue;const locale=parts[2].toUpperCase(),slug=parts[4];jobs.push({name:`${parts[3]}-${slug}-${locale}`,path:parts[3]==='services'?`/api/services/${slug}?countryCode=ro&locale=${locale}`:`/api/countries/ro/doctors/${slug}?locale=${locale}`});}
let next=0;const outcomes=[];
await Promise.all(Array.from({length:3},async()=>{while(next<jobs.length){const job=jobs[next++];const file=`${dir}/${job.name}.json`;try{try{const r=JSON.parse(await fs.readFile(file,'utf8'));if(r.ok){outcomes.push({name:job.name,ok:true});continue}}catch{}const r=await fetch(`https://api.myglobalhealth.online${job.path}`,{signal:AbortSignal.timeout(45000)});const json=await r.json();await fs.writeFile(file,JSON.stringify({checkedAt:new Date().toISOString(),endpoint:job.path,status:r.status,...json},null,2));outcomes.push({name:job.name,ok:r.ok&&json.ok});}catch(e){outcomes.push({name:job.name,error:e.message})}}}));
await fs.writeFile(`${dir}/collection-status.json`,JSON.stringify(outcomes,null,2));console.log(JSON.stringify({jobs:jobs.length,failures:outcomes.filter(x=>!x.ok)}));
