import fs from 'node:fs';
import { connect, readRomania } from './romania-seo-storage.mjs';

export async function readEditorial(client) {
  const clinical = await readRomania(client);
  const id = clinical.country.id;
  const rows = async (sql, values = [id]) => (await client.query(sql, values)).rows;
  const pages = await rows('SELECT * FROM "PageContent" WHERE "countryId"=$1 ORDER BY id');
  const pageTranslations = await rows('SELECT * FROM "PageContentTranslation" WHERE "pageContentId"=ANY($1::text[]) ORDER BY id', [pages.map(p=>p.id)]);
  const posts = await rows('SELECT * FROM "BlogPost" p WHERE "countryId"=$1 OR id IN (SELECT "postId" FROM "BlogPostCountry" WHERE "countryId"=$1) OR (status=\'PUBLISHED\' AND "isActive"=true AND NOT EXISTS (SELECT 1 FROM "BlogPostCountry" b WHERE b."postId"=p.id)) ORDER BY id');
  const postIds = posts.map(p=>p.id);
  const blogTranslations = await rows('SELECT * FROM "BlogTranslation" WHERE "postId"=ANY($1::text[]) ORDER BY id', [postIds]);
  const blogCountries = await rows('SELECT * FROM "BlogPostCountry" WHERE "postId"=ANY($1::text[]) ORDER BY id', [postIds]);
  const legal = await rows('SELECT * FROM "CountryLegalDocument" WHERE "countryId"=$1 ORDER BY id');
  return JSON.parse(JSON.stringify({clinical,pages,pageTranslations,posts,blogTranslations,blogCountries,legal}));
}
if (process.argv[1]?.endsWith('romania-editorial-storage.mjs')) {
  const client = await connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const data = await readEditorial(client);
    await client.query('COMMIT');
    fs.writeFileSync(process.argv[2],JSON.stringify({checkedAt:new Date().toISOString(),data},null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify(Object.fromEntries(Object.entries(data).filter(([,v])=>Array.isArray(v)).map(([k,v])=>[k,v.length]))));
  } finally { await client.end(); }
}
