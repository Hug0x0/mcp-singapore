import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const all = process.argv.includes('--all');
const client = new Client({name:'singapore-live-smoke',version:'1.0.0'});
const transport = new StdioClientTransport({command:process.execPath,args:[new URL('../dist/index.js',import.meta.url).pathname],stderr:'inherit'});
const results=[];
await client.connect(transport);
async function check(name,args={},verify=()=>{}) {
  const start=Date.now();
  try {
    const response=await client.callTool({name,arguments:args},undefined,{timeout:90000});
    assert.notEqual(response.isError,true,JSON.stringify(response.content));
    const body=JSON.parse(response.content.find(c=>c.type==='text').text);
    assert.ok(body.data !== undefined);verify(body.data);
    results.push({tool:name,status:'pass',duration_ms:Date.now()-start});console.log(`PASS ${name}`);
  }catch(error){results.push({tool:name,status:'fail',error:String(error)});console.error(`FAIL ${name}: ${error}`);}
}
try {
  const {tools}=await client.listTools();assert.equal(tools.length,55);
  await check('singapore_search_catalog',{query:'HDB'},d=>assert.ok(d.total>0));
  await check('singapore_inspect_dataset',{dataset_id:'d_8b84c4ee58e3cfc0ece0d773c8ca6abc'},d=>assert.ok(d.columnMetadata));
  await check('singapore_query_hdb_resale',{filters:{town:'ANG MO KIO'},limit:2},d=>assert.ok(d.records.length && d.records.every(r=>r.town==='ANG MO KIO')));
  await check('singapore_get_air_temperature',{},d=>assert.ok(d.stations.length && d.readings.length));
  await check('singapore_get_forecast_2h',{},d=>assert.ok(d.items?.length || d.records?.length));
  await check('singapore_search_statistics',{query:'population',limit:2},d=>assert.ok(d.tables.length));
  await check('singapore_get_statistics',{resource_id:'M810001',series_contains:'Total Population',period_limit:2},d=>assert.equal(d.row[0].columns.length,2));
  await check('singapore_get_indicator',{indicator:'population',limit:2},d=>assert.ok(d.observations.length));
  if(all) {
    const curated=JSON.parse(await readFile(new URL('../data/curated.json',import.meta.url),'utf8'));
    for(const d of curated) if(d.key !== 'hdb_resale') await check(`singapore_query_${d.key}`,{limit:1},data=>assert.ok(Array.isArray(data.records)));
    for(const name of ['rainfall','relative_humidity','wind_speed','wind_direction','forecast_24h','forecast_4day','psi','pm25','uv_index']) await check(`singapore_get_${name}`);
    await check('singapore_get_taxi_availability',{latitude:1.3,longitude:103.8,limit:2});
    await check('singapore_get_carpark_availability',{limit:2});
    await check('singapore_get_traffic_images',{limit:2});
    await check('singapore_get_collection',{collection_id:189});
    await check('singapore_list_catalog_page',{page:1});
    await check('singapore_download_dataset',{dataset_id:'d_0b2c034da121ef8efc71949af1694b4d',action:'initiate'});
    await check('singapore_download_dataset',{dataset_id:'d_0b2c034da121ef8efc71949af1694b4d',action:'poll'});
  }
} finally {await client.close();}
const report={tested_at:new Date().toISOString(),mode:all?'all-public':'core',results,untested:['LTA DataMall (requires LTA_ACCOUNT_KEY)','OneMap (requires ONEMAP_TOKEN)','Dataset export lifecycle (use initiate then poll)']};
await writeFile(new URL('../docs/live-verification.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
if(results.some(r=>r.status==='fail'))process.exitCode=1;
