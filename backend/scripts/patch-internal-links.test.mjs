import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hash, replaceOnce, run } from './patch-internal-links.mjs';

test('hash compares PostgreSQL JSON timestamps and key order without ignoring content changes', () => {
  const a={id:'x',updatedAt:'2026-09-13T00:00:00+00:00',content:'old'};
  assert.equal(hash(a),hash({content:'old',updatedAt:new Date(a.updatedAt),id:'x'}));
  assert.notEqual(hash(a),hash({...a,content:'new'}));
  assert.equal(replaceOnce('<p>A</p>','A','B'),'<p>B</p>');
  assert.throws(()=>replaceOnce('A A','A','B'));
  assert.throws(()=>replaceOnce('B','A','B'));
});

test('already applied is a no-op and source drift rolls the transaction back', async () => {
  const manifest={version:1,changes:[{rows:[1],table:'BlogPost',field:'body',id:'p',slug:'p',before:'old',after:'new'}]};
  const queries=[];
  let body='new';
  const client={query:async(sql)=>{queries.push(sql);return {rows:sql.startsWith('SELECT')?[{value:body}]:[]};}};
  assert.equal((await run(client,manifest,'apply'))[0].status,'already applied');
  assert(!queries.some(q=>q.startsWith('UPDATE')));
  body='someone else edited this';
  await assert.rejects(run(client,manifest,'apply'),/Source drift/);
  assert.equal(queries.at(-1),'ROLLBACK');
});
