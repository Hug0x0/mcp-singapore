import{readFile}from'node:fs/promises';import{jsonRequest,schemaDiff}from'./catalog-lib.mjs';
const expected=JSON.parse(await readFile(new URL('../data/schema-expectations.json',import.meta.url),'utf8'));let failed=false;
for(const[id,fields]of Object.entries(expected)){const meta=await jsonRequest(`https://api-production.data.gov.sg/v2/public/api/datasets/${id}/metadata`,{headers:process.env.DATA_GOV_SG_API_KEY?{'x-api-key':process.env.DATA_GOV_SG_API_KEY}:{}});const missing=schemaDiff(fields,meta);if(missing.length){failed=true;console.error(id,'missing:',missing.join(', '));}else console.log('PASS',id);}
if(failed)process.exitCode=1;
