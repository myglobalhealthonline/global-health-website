import {writeFileSync} from 'node:fs';
import {connect} from './romania-seo-storage.mjs';
import {readCountryClinicalContent} from '../src/content/romania-clinical-review.ts';
export const readBrazil = async client => JSON.parse(JSON.stringify(await readCountryClinicalContent(async(sql,values)=>(await client.query(sql,values)).rows,'br','brazil')));
if(process.argv[1]?.endsWith('brazil-seo-storage.mjs')){
 const output=process.argv[2];if(!output)throw new Error('Supply a new snapshot path');
 const client=await connect();try{
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const data=await readBrazil(client);await client.query('COMMIT');
  writeFileSync(output,JSON.stringify({checkedAt:new Date().toISOString(),data},null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({country:data.country,counts:Object.fromEntries(Object.entries(data).filter(([,v])=>Array.isArray(v)).map(([k,v])=>[k,v.length]))}));
 }finally{await client.end();}
}
