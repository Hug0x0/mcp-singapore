import assert from'node:assert/strict';import{readFile,writeFile}from'node:fs/promises';import{Client}from'@modelcontextprotocol/sdk/client/index.js';import{StdioClientTransport}from'@modelcontextprotocol/sdk/client/stdio.js';import{buildReport}from'./report.mjs';import{safeMessage}from'../dist/errors.js';
const mode=process.argv.find(v=>v.startsWith('--mode='))?.slice(7)??(process.argv.includes('--all')?'all':'core');if(!['core','all','auth'].includes(mode))throw Error('Use --mode=core|all|auth');
const output=process.argv.find(v=>v.startsWith('--report='))?.slice(9);const results=[];const c=new Client({name:'singapore-live-smoke',version:'1'});await c.connect(new StdioClientTransport({command:process.execPath,args:[new URL('../dist/index.js',import.meta.url).pathname],stderr:'inherit'}));
async function check(tool,args={},verify=()=>{},key){if(key&&!process.env[key]){results.push({tool,arguments:args,status:'skipped',reason:`${key} is not configured`});console.log('SKIP',tool);return null;}const start=Date.now();try{const response=await c.callTool({name:tool,arguments:args},undefined,{timeout:120000});assert.notEqual(response.isError,true,JSON.stringify(response.structuredContent??response.content));const body=response.structuredContent??JSON.parse(response.content.find(v=>v.type==='text').text);assert.ok(body.ok);assert.ok(body.data!==undefined);verify(body.data);const status=tool==='singapore_download_dataset'&&args.action==='poll'&&body.data.state!=='ready'?'pending':'pass';results.push({tool,arguments:args,status,export_state:tool==='singapore_download_dataset'?body.data.state:undefined,duration_ms:Date.now()-start});console.log(status.toUpperCase(),tool);return body.data;}catch(error){results.push({tool,arguments:args,status:'fail',error:safeMessage(String(error)),duration_ms:Date.now()-start});console.error('FAIL',tool,safeMessage(String(error)));return null;}}
try{
 const{tools}=await c.listTools();const manifest=JSON.parse(await readFile(new URL('../data/tool-manifest.json',import.meta.url),'utf8'));assert.equal(tools.length,manifest.tools.length);
 if(mode!=='auth'){
 await check('singapore_search_catalog',{query:'HDB'},d=>assert.ok(d.total>0));
 await check('singapore_inspect_dataset',{dataset_id:'d_8b84c4ee58e3cfc0ece0d773c8ca6abc'},d=>assert.ok(d.fields.length));
 await check('singapore_query_hdb_resale',{filters:{town:'ANG MO KIO'},limit:2},d=>assert.ok(d.records.length&&d.records.every(r=>r.town==='ANG MO KIO')));
 await check('singapore_get_air_temperature',{limit:2},d=>assert.ok(d.stations.length&&d.readings.length));
 await check('singapore_get_forecast_2h',{area:'Ang Mo Kio',limit:2},d=>assert.ok(d.items?.length||d.records?.length));
 await check('singapore_search_statistics',{query:'population',limit:2},d=>assert.ok(d.tables.length));
 await check('singapore_get_statistics',{resource_id:'M810001',series_contains:'Total Population',period_limit:2},d=>assert.equal(d.row[0].columns.length,2));
 await check('singapore_get_indicator',{indicator:'population',limit:2},d=>assert.ok(d.observations.length));
 }
 if(mode==='all'){
 const curated=JSON.parse(await readFile(new URL('../data/curated.json',import.meta.url),'utf8'));for(const d of curated)if(d.key!=='hdb_resale')await check(`singapore_query_${d.key}`,{limit:1},d=>assert.ok(Array.isArray(d.records)));
 for(const feed of ['rainfall','relative_humidity','wind_speed','wind_direction','forecast_24h','forecast_4day','psi','pm25','uv_index'])await check(`singapore_get_${feed}`,{limit:2});
 await check('singapore_list_weather_stations',{query:'Ang Mo Kio',limit:2},d=>assert.ok(d.stations.length));
 await check('singapore_get_taxi_availability',{latitude:1.3,longitude:103.8,limit:2});
 await check('singapore_get_carpark_availability',{limit:2});await check('singapore_get_traffic_images',{limit:2});
 await check('singapore_get_collection',{collection_id:189});await check('singapore_list_catalog_page',{page:1});await check('singapore_list_collections',{page:1});
 await check('singapore_search_acra',{partition:'A',name:'ACRA',limit:1});
 const id='d_0b2c034da121ef8efc71949af1694b4d';await check('singapore_download_dataset',{dataset_id:id,action:'initiate'},d=>assert.equal(d.state,'initiated'));await check('singapore_download_dataset',{dataset_id:id,action:'poll'},d=>assert.ok(['pending','ready'].includes(d.state)));
 for(const category of ['carparks','hawker_centres','preschools','parks','sport_facilities'])await check('singapore_find_nearby_facilities',{category,latitude:1.3,longitude:103.8,limit:2},d=>assert.equal(d.complete_export,true));
 await check('singapore_compare_hdb_prices',{towns:['ANG MO KIO','BEDOK'],flat_type:'4 ROOM',from_month:'2026-09',to_month:'2026-10'},d=>assert.ok(d.complete&&d.rows_scanned>100000));
 }
 await check('singapore_get_bus_arrivals',{bus_stop_code:'01012'},()=>{},'LTA_ACCOUNT_KEY');await check('singapore_query_lta',{dataset:'bus_stops',bus_stop_code:'01012',limit:2},()=>{},'LTA_ACCOUNT_KEY');
 await check('singapore_search_address',{query:'018956'},()=>{},'ONEMAP_TOKEN');await check('singapore_reverse_geocode',{latitude:1.3,longitude:103.8},()=>{},'ONEMAP_TOKEN');
}finally{await c.close();}
const report=buildReport(mode,results);await writeFile(output??new URL('../docs/live-verification.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary));if(report.summary.fail||report.summary.pending)process.exitCode=1;
