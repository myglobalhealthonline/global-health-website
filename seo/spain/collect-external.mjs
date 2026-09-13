import fs from 'node:fs/promises';
import {parse} from '../romania/collect-public-inventory.mjs';
const urls = [
 'https://dermatologia-bagazgoitia.com/consulta-online',
 'https://www.saludonnet.com/video-consulta',
 'https://www.unobravo.com/es',
 'https://www.costamedicalservices.com/onlineconsultation/',
 'https://www.boe.es/buscar/act.php?id=BOE-A-2014-7684',
 'https://www.copao.com/index.php/directorio/ao14346',
 'https://www.comunidad.madrid/hospital/atencionprimaria/ciudadanos/atencion-primaria-documentos-sanitarios'
];
const rows = await Promise.all(urls.map(async url => {try { const r=await fetch(url,{signal:AbortSignal.timeout(45000)});const html=await r.text();return {...parse(html,url),status:r.status,checkedAt:new Date().toISOString(),html};}catch(e){return {url,error:e.message};}}));
await fs.writeFile('seo/spain/raw/external-pages-2026-09-13.json',JSON.stringify(rows,null,2));
console.log(JSON.stringify(rows.map(r=>({url:r.url,status:r.status,error:r.error,characters:r.body?.length}))));
