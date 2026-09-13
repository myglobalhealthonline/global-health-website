import fs from 'node:fs/promises';
import {parse} from '../romania/collect-public-inventory.mjs';
const urls=[
 'https://drconsulta.com/telemedicina',
 'https://oladoutor.app/',
 'https://www.mybraziliandoctor.com.br/',
 'https://www.consultare.com.br/solicitacao-exames-laboratoriais',
 'https://portal.cfm.org.br/busca-medicos',
 'https://www.cremesp.org.br/?siteAcao=GuiaMedico',
 'https://portal.cfm.org.br/noticias/em-decisao-unanime-tcu-reconhece-a-legalidade-do-atesta-cfm/',
 'https://prescricaoeletronica.cfm.org.br/faq_pacientes/solicitacao-de-exames/',
 'https://prescricaoeletronica.cfm.org.br/faq_pacientes/teste-pacientes-2/',
 'https://www.gov.br/saude/pt-br/composicao/saes/samu-192',
 'https://api.dataforseo.com/v3/dataforseo_labs/locations_and_languages'
];
const rows=[];
for(const url of urls){try{const r=await fetch(url,{signal:AbortSignal.timeout(30000)});const html=await r.text();rows.push({...parse(html,url),status:r.status,checkedAt:new Date().toISOString(),html});}catch(e){rows.push({url,error:e.message,checkedAt:new Date().toISOString()});}}
await fs.writeFile('seo/brazil/raw/external-pages-2026-09-13.json',JSON.stringify(rows,null,2));
console.log(JSON.stringify(rows.map(r=>({url:r.url,status:r.status,error:r.error,characters:r.body?.length}))));
