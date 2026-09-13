// Exact, reversible content-only patch for the 13 September linking handover.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { connect } from './romania-seo-storage.mjs';

export function hash(value) {
  const canonical = (v, key) => key === 'updatedAt' ? new Date(v).toISOString()
    : Array.isArray(v) ? v.map(item => canonical(item))
    : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k], k)])) : v;
  return createHash('sha256').update(JSON.stringify(canonical(JSON.parse(JSON.stringify(value))))).digest('hex');
}
const origin = 'https://www.myglobalhealth.online';
export function replaceOnce(body, before, after) {
  assert.equal(body.split(before).length - 1, 1, `Expected exactly one source match: ${before.slice(0,100)}`);
  return body.replace(before, after);
}
const link = (path, label) => `<a href="${origin}${path}">${label}</a>`;

export function prepare(snapshot) {
  const changes = [];
  const blog = (slug, country, locale, row, replacements) => {
    const matches = snapshot.posts.filter(p => p.slug === slug && p.locale === locale);
    assert.equal(matches.length, 1, `Ambiguous post ${slug}`);
    const p = matches[0];
    assert.equal(p.status, 'PUBLISHED'); assert.equal(p.isActive, true);
    assert.deepEqual([...new Set([p.country, ...(p.countries ?? [])].filter(Boolean))], [country]);
    // Every other locale must have its own body: a base edit must not change fallback pages.
    for (const other of ['EN','ES','PT','CS','RO','DE'].filter(l => l !== locale)) {
      assert(p.translations?.some(t => t.locale === other && t.content?.trim()), `Fallback exposure ${slug}/${other}`);
    }
    let after = p.body;
    for (const [before, next] of replacements) after = replaceOnce(after, before, next);
    changes.push({rows:[row],table:'BlogPost',field:'body',id:p.id,slug,locale,country,before:p.body,after,updatedAt:p.updatedAt,
      translationsHash:hash(p.translations.slice().sort((a,b)=>a.id.localeCompare(b.id)))});
  };
  blog('diabetes-ticha-nemoc','cz','CS',1,[
    [`<a href="${origin}/cs/czech-republic/diabetologick%C3%A1-konzultace" class="btn-primary">Objednat konzultaci</a>`, `<a href="${origin}/czechia/cs/services/chronicka-onemocneni" class="btn-primary">Konzultace chronického onemocnění</a>`],
  ]);
  blog('diabetes-doenca-silenciosa','br','PT',2,[
    [`<a class="btn-primary" href="${origin}/br/clinica-geral">Agendar consulta</a>`, `<a class="btn-primary" href="${origin}/brazil/pt/services/doencas-cronicas-online">Acompanhamento de doenças crônicas</a>`],
  ]);
  blog('baja-laboral-por-ansiedad-como-funciona','es','ES',5,[
    [`<a class="btn-lime" href="${origin}/spain/es/services/justificante-medico-online">Consulta de salud mental</a>`, `<a class="btn-lime" href="${origin}/spain/es/services/salud-mental-online">Consulta de salud mental</a>`],
  ]);
  const pressure = '<p class="section-lead">Con un tensiómetro de brazo validado y un protocolo de siete días. Una lectura suelta no sirve para decidir nada.</p>';
  blog('como-bajar-la-tension-que-funciona-segun-la-evidencia','es','ES',8,[
    [pressure, pressure + `<p>${link('/spain/es/tools/blood-pressure-chart','Consultar la tabla de tensión arterial')}.</p>`],
  ]);
  const rates = '<p class="intro-support">Rates, waiting days and how long a claim can run are set by the Department and change with the Budget. This guide does not quote them; every figure question here links to the Department\'s own page instead.</p>';
  blog('illness-benefit-ireland-how-to-claim','ie','EN',13,[
    [rates, rates + `<p>${link('/ireland/en/blog/illness-benefit-payment-ireland-rate-tax-timing','Illness Benefit payment rates and timing')}.</p>`],
  ]);
  assert.equal(snapshot.landings.length,1);
  const landing = snapshot.landings[0];
  assert.equal(landing.country,'pt'); assert.equal(landing.slug,'hipertensao'); assert.equal(landing.isPublished,true);
  const pt = landing.translations.find(t=>t.locale==='PT'); assert(pt?.bodyHtml);
  for(const locale of ['EN','ES','CS','RO','DE']) assert(landing.translations.some(t=>t.locale===locale && t.bodyHtml?.trim()), `Landing fallback exposure ${locale}`);
  let after = replaceOnce(pt.bodyHtml, '<p><a href="/portugal/pt/services/hypertension-consultation">Consulta de Hipertensão</a></p>', '');
  after = replaceOnce(after, '/portugal/pt/services/family-and-general-medicine', '/portugal/pt/services/medicina-geral-e-familiar');
  after = replaceOnce(after, '/portugal/pt/services/cardiology-consultation', '/portugal/pt/services/consulta-cardiologia');
  after = replaceOnce(after, '<h2>Marque a sua consulta</h2>', `<p>${link('/portugal/pt/tools/blood-pressure-chart','Tabela de tensão arterial')}.</p><h2>Marque a sua consulta</h2>`);
  changes.push({rows:[3,4,9],table:'SeoLandingPageTranslation',field:'bodyHtml',id:pt.id,slug:landing.slug,locale:'PT',country:'pt',before:pt.bodyHtml,after,updatedAt:pt.updatedAt,landingPageId:landing.id,
    landingHash:hash({template:landing.template,isPublished:landing.isPublished,translations:landing.translations.slice().sort((a,b)=>a.id.localeCompare(b.id))})});
  return {version:1,changes};
}

export async function run(client, manifest, mode) {
  assert.equal(manifest.version,1); assert(['dry-run','apply','rollback'].includes(mode));
  const results=[];
  await client.query(mode==='dry-run' ? 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY' : 'BEGIN ISOLATION LEVEL SERIALIZABLE');
  try {
    for(const c of manifest.changes) {
      assert((c.table==='BlogPost' && c.field==='body') || (c.table==='SeoLandingPageTranslation' && c.field==='bodyHtml'));
      const from=mode==='rollback'?c.after:c.before, to=mode==='rollback'?c.before:c.after;
      const {rows}=await client.query(`SELECT "${c.field}" AS value,"updatedAt" FROM "${c.table}" WHERE id=$1${mode==='dry-run'?'':' FOR UPDATE'}`,[c.id]);
      assert.equal(rows.length,1); const current=rows[0];
      if(current.value===to) {results.push({rows:c.rows,status:'already applied'});continue;}
      assert.equal(current.value,from,`Source drift ${c.slug}`);
      if(mode!=='rollback') {
        assert.equal(new Date(current.updatedAt).toISOString(),new Date(c.updatedAt).toISOString(),`Metadata drift ${c.slug}`);
        if(c.table==='BlogPost') {
          const scope=(await client.query(`SELECT p.locale,p.status,p."isActive",c.code AS country,
            (SELECT jsonb_agg(c2.code) FROM "BlogPostCountry" pc JOIN "Country" c2 ON c2.id=pc."countryId" WHERE pc."postId"=p.id) AS countries
            FROM "BlogPost" p LEFT JOIN "Country" c ON c.id=p."countryId" WHERE p.id=$1 AND p.slug=$2`,[c.id,c.slug])).rows[0];
          assert(scope && scope.locale===c.locale && scope.status==='PUBLISHED' && scope.isActive,`Post scope drift ${c.slug}`);
          assert.deepEqual([...new Set([scope.country,...(scope.countries??[])].filter(Boolean))],[c.country],`Country scope drift ${c.slug}`);
          const translations=(await client.query(`SELECT id,locale,slug,content,"updatedAt" FROM "BlogTranslation" WHERE "postId"=$1 ORDER BY id`,[c.id])).rows;
          assert.equal(hash(translations),c.translationsHash,`Translation drift ${c.slug}`);
        } else {
          const parent=(await client.query(`SELECT p.template,p."isPublished" FROM "SeoLandingPage" p JOIN "Country" c ON c.id=p."countryId" WHERE p.id=$1 AND p.slug=$2 AND c.code=$3`,[c.landingPageId,c.slug,c.country])).rows[0];
          assert(parent,`Landing scope drift ${c.slug}`);
          const translations=(await client.query(`SELECT id,locale,"bodyHtml","updatedAt" FROM "SeoLandingPageTranslation" WHERE "landingPageId"=$1 ORDER BY id`,[c.landingPageId])).rows;
          assert.equal(hash({...parent,translations}),c.landingHash,`Landing drift ${c.slug}`);
        }
      }
      if(mode!=='dry-run') {
        const r=await client.query(`UPDATE "${c.table}" SET "${c.field}"=$1,"updatedAt"=CURRENT_TIMESTAMP WHERE id=$2 AND "${c.field}"=$3`,[to,c.id,from]);
        assert.equal(r.rowCount,1,`Concurrent change ${c.slug}`);
      }
      results.push({rows:c.rows,status:mode==='dry-run'?'ready':mode});
    }
    await client.query('COMMIT'); return results;
  } catch(e) {await client.query('ROLLBACK');throw e;}
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const [mode,input,outputOrHash]=process.argv.slice(2);
  if(mode==='prepare') {
    const manifest=prepare(JSON.parse(fs.readFileSync(input,'utf8')));
    fs.writeFileSync(outputOrHash,JSON.stringify(manifest,null,2),{flag:'wx',mode:0o600});
    console.log(JSON.stringify({sha256:hash(manifest),records:manifest.changes.length,rows:manifest.changes.flatMap(c=>c.rows)}));
  } else {
    const manifest=JSON.parse(fs.readFileSync(input,'utf8'));
    if(mode!=='dry-run') assert.equal(outputOrHash,hash(manifest),'Apply/rollback requires the exact reviewed manifest SHA-256');
    const client=await connect();
    try {console.log(JSON.stringify({mode,sha256:hash(manifest),results:await run(client,manifest,mode)}));}
    finally {await client.end();}
  }
}
