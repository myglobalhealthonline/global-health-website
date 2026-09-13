import test from 'node:test';
import assert from 'node:assert/strict';
import { project, writeChanges } from './apply-romania-editorial.mjs';

test('exact editorial changes preserve other fields and reject drift or unauthorized fields',()=>{
  const source={clinical:{},legal:[{id:'legal-1',content:'Before',version:4,isPublished:true}]};
  const change={table:'legal',id:'legal-1',field:'content',before:'Before',after:'After'};
  assert.deepEqual(project(source,[change]).legal,[{id:'legal-1',content:'After',version:4,isPublished:true}]);
  assert.equal(source.legal[0].content,'Before');
  assert.throws(()=>project(source,[{...change,before:'Stale'}]),/Source drift/);
  assert.throws(()=>project(source,[{...change,field:'isPublished'}]),/Unexpected field/);
  assert.throws(()=>project(source,[change,change]),/Duplicate/);
});
test('copy is parameterized and missing rows fail',async()=>{
  const c={table:'legal',id:'legal-1',field:'content',after:"Patients' rights"};
  const queries=[];
  await writeChanges({query:async(sql,values)=>{queries.push({sql,values});return {rowCount:1};}},[c]);
  assert(!queries[0].sql.includes(c.after));
  assert.deepEqual(JSON.parse(queries[0].values[0]),[{id:c.id,content:c.after}]);
  await assert.rejects(writeChanges({query:async()=>({rowCount:0})},[c]),/Missing row/);
});
