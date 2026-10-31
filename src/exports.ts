import{setTimeout as delay}from'node:timers/promises';import{http,dataGovHeaders,ApiError,shutdownSignal}from'./http.js';import{requestContext,recordSource}from'./context.js';import{VERSION}from'./version.js';import type{Row}from'./types.js';
export type ExportState='initiated'|'pending'|'ready'|'failed';
export function normalizeExport(body:Row,action:'initiate'|'poll'){
 const data=body.data as Row|undefined;if(!data)throw new ApiError('Invalid export envelope',undefined,undefined,'INVALID_RESPONSE');
 const status=String(data.status??'');let state:ExportState;
 if(/FAIL|ERROR/i.test(status))state='failed';else if(status==='DOWNLOAD_SUCCESS'||action==='poll'&&!status&&typeof data.url==='string')state='ready';else if(action==='initiate')state='initiated';else if(!status||/PENDING|PROCESS|INITIAT|PROGRESS|WAIT/i.test(status))state='pending';else throw new ApiError('Unrecognised export status',undefined,undefined,'INVALID_RESPONSE');
 if(state==='ready'&&typeof data.url!=='string')throw new ApiError('Ready export is missing its URL',undefined,undefined,'INVALID_RESPONSE');
 return{state,download_url:state==='ready'?data.url as string:undefined,expires_at:data.expiresAt??data.expires_at??null,provider_status:status||null};
}
export async function exportDataset(id:string,action:'initiate'|'poll'){
 const target=`https://api-open.data.gov.sg/v1/public/api/datasets/${id}/${action==='initiate'?'initiate':'poll'}-download`;
 const body=await http.get<Row>(target,{headers:dataGovHeaders(),rateGroup:'downloads'});return{source_url:target,data:normalizeExport(body,action)};
}
export function validateExportUrl(raw:string,id:string):URL{
 const target=new URL(raw);const hosts=['s3.ap-southeast-1.amazonaws.com','table-downloads-ingest.data.gov.sg.s3.ap-southeast-1.amazonaws.com','storage.data.gov.sg'];
 if(!/^d_[a-f0-9]{32}$/.test(id)||target.protocol!=='https:'||target.username||target.password||target.port||!hosts.includes(target.hostname))throw new ApiError('Untrusted dataset export origin',400,undefined,'INVALID_ARGUMENT');
 const path=decodeURIComponent(target.pathname);
 const valid=target.hostname==='s3.ap-southeast-1.amazonaws.com'?(path.startsWith(`/table-downloads-ingest.data.gov.sg/${id}/`)||new RegExp('^/blobs\\.data\\.gov\\.sg/'+id+'\\.(geojson|json|csv)$').test(path)):target.hostname==='storage.data.gov.sg'?path.startsWith(`/datasets/${id}/`)||path.startsWith(`/${id}/`):path.startsWith(`/${id}/`);
 if(!valid||path.split('/').some(p=>p==='..'||p==='.'))throw new ApiError('Export URL does not match requested dataset',400,undefined,'INVALID_ARGUMENT');return target;
}
const MAX_BYTES=64*1024*1024;const cache=new Map<string,{buffer:Buffer;expires:number;fetched:number}>();const pending=new Map<string,Promise<Buffer>>();
export async function readTrustedExport(id:string,readyUrl:string,fetcher:typeof fetch=fetch,maxBytes=MAX_BYTES):Promise<Buffer>{
 const target=validateExportUrl(readyUrl,id);const signal=requestContext.getStore()?.signal;const deadline=AbortSignal.any([shutdownSignal,...(signal?[signal]:[]),AbortSignal.timeout(60000)]);
 try{
 const response=await fetcher(target,{headers:{'User-Agent':`mcp-singapore/${VERSION}`},redirect:'error',signal:deadline});
 if(!response.ok){await response.body?.cancel();throw new ApiError(`Export storage returned HTTP ${response.status}`,response.status);}
 if(Number(response.headers.get('content-length'))>maxBytes){await response.body?.cancel();throw new ApiError('Dataset export exceeds the download byte budget',undefined,undefined,'OUTPUT_TOO_LARGE');}
 const reader=response.body?.getReader();if(!reader)throw new ApiError('Empty dataset export',undefined,undefined,'INVALID_RESPONSE');let size=0;const chunks:Uint8Array[]=[];
 for(;;){deadline.throwIfAborted();const p=await reader.read();if(p.done)break;size+=p.value.byteLength;if(size>maxBytes){await reader.cancel();throw new ApiError('Dataset export exceeds the download byte budget',undefined,undefined,'OUTPUT_TOO_LARGE');}chunks.push(p.value);}return Buffer.concat(chunks);
 }catch(error){if(deadline.aborted)throw new ApiError(signal?.aborted||shutdownSignal.aborted?'Export cancelled':'Export deadline exceeded',undefined,undefined,signal?.aborted||shutdownSignal.aborted?'CANCELLED':'NETWORK_TIMEOUT');throw error;}
}
export async function datasetBuffer(id:string):Promise<Buffer>{
 const now=Date.now();for(const[k,c]of cache)if(c.expires<=now)cache.delete(k);const saved=cache.get(id);
 if(saved){recordSource({source_url:`https://data.gov.sg/datasets/${id}/view`,fetched_at:new Date(saved.fetched).toISOString(),cache_hit:true,age_seconds:(now-saved.fetched)/1000});return saved.buffer;}
 const existing=pending.get(id);if(existing)return existing;if(pending.size>=2)throw new ApiError('Too many concurrent dataset exports',undefined,undefined,'QUEUE_FULL');
 const operation=(async()=>{
   await exportDataset(id,'initiate');let ready:string|undefined;
   for(let i=0;i<3;i++){const result=await exportDataset(id,'poll');if(result.data.state==='failed')throw new ApiError('Dataset export failed',undefined,undefined,'UPSTREAM_ERROR');if(result.data.state==='ready'){ready=result.data.download_url;break;}if(i<2)await delay(1500,undefined,{signal:requestContext.getStore()?.signal});}
   if(!ready)throw new ApiError('Dataset export is still pending; retry later',undefined,5,'EXPORT_PENDING');
   const buffer=await readTrustedExport(id,ready);while([...cache.values()].reduce((s,c)=>s+c.buffer.length,0)+buffer.length>MAX_BYTES&&cache.size)cache.delete(cache.keys().next().value!);
   cache.set(id,{buffer,expires:Date.now()+300000,fetched:Date.now()});recordSource({source_url:`https://data.gov.sg/datasets/${id}/view`,fetched_at:new Date().toISOString(),cache_hit:false,age_seconds:0});return buffer;
 })().finally(()=>pending.delete(id));pending.set(id,operation);return operation;
}
