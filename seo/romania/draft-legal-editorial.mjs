// Punctuation-only legal cleanup. No words, obligations, identifiers or URLs change.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const snapshot=JSON.parse(fs.readFileSync('seo/romania/raw/editorial-storage-complete-before-2026-09-13.json')).data;
const changes=[];
for(const row of snapshot.legal.filter(r=>r.isPublished)) {
  const before=row.content;
  if(!before?.includes('—')) continue;
  const after=before.replace(/<(p|li|td|h[1-6])(?: [^>]*)?>[\s\S]*?<\/\1>/g,block=>{
    // Keep exact instructed email subject lines, which may be used for routing.
    const protectedText=[];
    let text=block.replace(/(?:"|„|“|«)[^<>\n]*?—[^<>\n]*?(?:"|”|»)/g,value=>{
      protectedText.push(value); return `EDITORIALQUOTED${protectedText.length-1}END`;
    });
    if((text.match(/—/g)||[]).length===2 && !text.includes('<strong>') && !/DPC\s*—/.test(text)) {
      // The paired legal clauses are nonrestrictive examples/provider lists.
      text=text.replace(/\s*—\s*([^—]+?)\s*—\s*/g,' ($1)');
      text=text.replace(/\)(?=[\p{L}])/gu,') ');
    }
    text=text.replace(/>[^<]*</g,node=>node
      .replace(/\s+—\s*(?=(?:ref\b|Ref\.|réf\b))/gu,', ')
      .replace(/\s+—\s*/g,': '));
    return text.replace(/EDITORIALQUOTED(\d+)END/g,(_,i)=>protectedText[Number(i)]);
  });
  const words=v=>v.replace(/<[^>]*>/g,'').match(/[\p{L}\p{N}]+/gu);
  assert.deepEqual(words(after),words(before),`Legal words changed: ${row.id}`);
  assert.deepEqual(after.match(/<[^>]*>/g),before.match(/<[^>]*>/g),`Legal markup changed: ${row.id}`);
  if(after!==before) changes.push({table:'legal',id:row.id,field:'content',before,after,reason:'Legal wording preserved; explanatory separators use colons, parenthetical clauses use parentheses, and exact quoted email subjects remain unchanged.'});
}
fs.writeFileSync('seo/romania/content-briefs/editorial-legal-changes-2026-09-13.json',JSON.stringify(changes,null,2)+'\n');
console.log(JSON.stringify({rows:changes.length,beforeDashes:changes.reduce((n,c)=>n+c.before.split('—').length-1,0),afterDashes:changes.reduce((n,c)=>n+c.after.split('—').length-1,0)}));
