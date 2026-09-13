// Read-only refresh of every public API source behind a draft. Saves new dated copies
// (never overwrites the 13 September evidence) and reports content/availability drift.
import fs from 'node:fs';
const root='seo/spain',day=new Date().toISOString().slice(0,10),dir=`${root}/raw/api-refresh-${day}`;
const drafts=JSON.parse(fs.readFileSync(`${root}/content-briefs/exact-drafts.json`));
fs.mkdirSync(dir,{recursive:true});
const pick=s=>({faqs:(s.faqs??[]).map(f=>[f.id,f.question,f.answer]),assignedDoctorIds:s.assignedDoctorIds,languages:s.languages,active:s.active,bookability:s.bookability?.state,basePriceCents:s.basePriceCents,durationMinutes:s.durationMinutes,slug:s.slug,resolvedLocale:s.resolvedLocale});
const report=[];
for(const source of [...new Set(drafts.map(d=>d.source))]){
 const saved=JSON.parse(fs.readFileSync(`${root}/${source}`)),r=await fetch(`https://api.myglobalhealth.online${saved.endpoint}`,{signal:AbortSignal.timeout(45000)});
 const body=await r.json(),file=`${dir}/${source.split('/').pop()}`;
 fs.writeFileSync(file,JSON.stringify({endpoint:saved.endpoint,checkedAt:new Date().toISOString(),status:r.status,...body},null,2),{flag:'wx'});
 const a=saved.data.service??saved.data.doctor,b=body.data?.service??body.data?.doctor,drift=[];
 for(const d of drafts.filter(d=>d.source===source))for(const k of Object.keys(d.before))if(a[k]!==b?.[k])drift.push(k);
 const pa=pick(a),pb=b?pick(b):{};for(const k of Object.keys(pa))if(JSON.stringify(pa[k])!==JSON.stringify(pb[k]))drift.push(k);
 report.push({source,status:r.status,bookability:pb.bookability,nextAvailableAt:b?.bookability?.nextAvailableAt??null,drift:[...new Set(drift)]});
}
fs.writeFileSync(`${root}/raw/source-refresh-${day}.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({sources:report.length,drifted:report.filter(r=>r.drift.length).map(r=>`${r.source}: ${r.drift.join(',')}`),notBookable:report.filter(r=>r.bookability&&r.bookability!=='BOOKABLE').map(r=>r.source)}));
