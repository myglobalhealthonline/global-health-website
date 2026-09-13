// Read-only content snapshot for the exact internal-linking handover cohort.
import fs from 'node:fs';
import { connect } from './romania-seo-storage.mjs';
const slugs = ['diabetes-ticha-nemoc', 'diabetes-doenca-silenciosa', 'baja-laboral-por-ansiedad-como-funciona', 'como-bajar-la-tension-que-funciona-segun-la-evidencia', 'illness-benefit-ireland-how-to-claim'];
const output = process.argv[2];
if (!output) throw new Error('Provide a new private snapshot path');
const client = await connect();
try {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const posts = (await client.query(`SELECT p.id,p.slug,p.locale,p.body,p.status,p."isActive",p."countryId",p."ctaServiceId",p."updatedAt",c.code AS country,
    (SELECT jsonb_agg(jsonb_build_object('id',t.id,'locale',t.locale,'slug',t.slug,'content',t.content,'updatedAt',t."updatedAt")) FROM "BlogTranslation" t WHERE t."postId"=p.id) AS translations,
    (SELECT jsonb_agg(c2.code) FROM "BlogPostCountry" pc JOIN "Country" c2 ON c2.id=pc."countryId" WHERE pc."postId"=p.id) AS countries
    FROM "BlogPost" p LEFT JOIN "Country" c ON c.id=p."countryId"
    WHERE p.slug=ANY($1::text[]) OR EXISTS (SELECT 1 FROM "BlogTranslation" t WHERE t."postId"=p.id AND t.slug=ANY($1::text[]))`, [slugs])).rows;
  const landings = (await client.query(`SELECT p.id,p.slug,p.template,p."isPublished",p."updatedAt",c.code AS country,
    (SELECT jsonb_agg(jsonb_build_object('id',t.id,'locale',t.locale,'bodyHtml',t."bodyHtml",'updatedAt',t."updatedAt")) FROM "SeoLandingPageTranslation" t WHERE t."landingPageId"=p.id) AS translations
    FROM "SeoLandingPage" p JOIN "Country" c ON c.id=p."countryId" WHERE c.code='pt' AND p.slug='hipertensao'`)).rows;
  await client.query('COMMIT');
  fs.writeFileSync(output, JSON.stringify({checkedAt:new Date().toISOString(),posts,landings},null,2), {flag:'wx', mode:0o600});
  console.log(JSON.stringify({posts:posts.map(p=>({slug:p.slug,country:p.country,locale:p.locale,countries:p.countries,translations:p.translations?.map(t=>({locale:t.locale,hasBody:!!t.content}))})),landings:landings.map(p=>({slug:p.slug,country:p.country,template:p.template,locales:p.translations?.map(t=>t.locale)}))}));
} finally { await client.end(); }
