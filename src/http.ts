import { setTimeout as delay } from 'node:timers/promises';
import { config, intervalFor } from './config.js';
import { requestContext, recordSource } from './context.js';
import { ApiError } from './errors.js';
import { validateResponse } from './contracts.js';
import { VERSION } from './version.js';
export { ApiError } from './errors.js';
const shutdown=new AbortController();
export const shutdownSignal:AbortSignal=shutdown.signal;
export function abortAllRequests(){shutdown.abort();}
const HOSTS = new Set(['api-production.data.gov.sg','api-open.data.gov.sg','api.data.gov.sg','data.gov.sg','tablebuilder.singstat.gov.sg','datamall2.mytransport.sg','www.onemap.gov.sg','api.worldbank.org']);
interface Options { headers?:Record<string,string>;ttlMs?:number;intervalMs?:number;rateGroup?:string;signal?:AbortSignal }
interface Cached { expires:number;value:unknown;bytes:number;fetched:number }
export function retryDelay(header: string|null, now=Date.now()): number {
  if(!header)return 10;const n=/^\d+$/.test(header)?Number(header):Math.ceil((Date.parse(header)-now)/1000);return Number.isFinite(n)?Math.max(0,n):10;
}
export class HttpClient {
  private cache=new Map<string,Cached>();private pending=new Map<string,Promise<Cached>>();private nextRequest=new Map<string,number>();private signalIds=new WeakMap<AbortSignal,number>();private signalCounter=0;private queued=0;private hits=0;private misses=0;
  constructor(private readonly fetcher:typeof fetch=fetch,private readonly timeoutMs=config.timeoutMs) {}
  clearCache(){this.cache.clear();}
  cacheStats(){this.purge();return{entries:this.cache.size,bytes:[...this.cache.values()].reduce((s,c)=>s+c.bytes,0),hits:this.hits,misses:this.misses};}
  private purge(){for(const[k,v]of this.cache)if(v.expires<=Date.now())this.cache.delete(k);}
  async get<T>(input:URL|string,options:Options={}):Promise<T>{
    const target=new URL(input);if(target.protocol!=='https:'||!HOSTS.has(target.hostname)||target.username||target.password||(target.port&&target.port!=='443'))throw new ApiError('Unsupported API origin',400,undefined,'INVALID_ARGUMENT');
    this.purge();const key=JSON.stringify([target.href,options.headers??{}]);const cached=this.cache.get(key);let entry:Cached;let hit=false;
    if(cached){entry=cached;hit=true;this.hits++;}else{
      const caller=options.signal??requestContext.getStore()?.signal;if(caller&&!this.signalIds.has(caller))this.signalIds.set(caller,++this.signalCounter);const pendingKey=key+(caller?':signal:'+this.signalIds.get(caller):'');
      let operation=this.pending.get(pendingKey);
      if(!operation){this.misses++;operation=this.request(target,options).then(e=>{const ttl=config.cacheTtlMs??options.ttlMs??0;if(ttl>0&&e.bytes<=config.cacheBytes){e.expires=Date.now()+ttl;this.cache.set(key,e);while(this.cache.size>config.cacheEntries||this.cacheStats().bytes>config.cacheBytes)this.cache.delete(this.cache.keys().next().value!);}return e;}).finally(()=>this.pending.delete(pendingKey));this.pending.set(pendingKey,operation);}
      entry=await operation;
    }
    recordSource({source_url:target.href,fetched_at:new Date(entry.fetched).toISOString(),cache_hit:hit,age_seconds:Math.max(0,(Date.now()-entry.fetched)/1000)});return entry.value as T;
  }
  private async request(target:URL,options:Options):Promise<Cached>{
    const caller=options.signal??requestContext.getStore()?.signal;
    const signal=AbortSignal.any([shutdown.signal,...(caller?[caller]:[]),AbortSignal.timeout(this.timeoutMs)]);
    try{
      for(let attempt=0;attempt<3;attempt++){
        signal.throwIfAborted();const interval=options.rateGroup?intervalFor(options.rateGroup):options.intervalMs??0;
        if(interval){if(this.queued>=config.queueLimit)throw new ApiError('HTTP request queue is full',undefined,undefined,'QUEUE_FULL');const now=Date.now();const reserved=Math.max(now,this.nextRequest.get(options.rateGroup??target.hostname)??now);if(reserved-now>config.queueWaitMs)throw new ApiError('HTTP rate-limit wait exceeds configured budget',undefined,undefined,'QUEUE_FULL');this.nextRequest.set(options.rateGroup??target.hostname,reserved+interval);this.queued++;try{if(reserved>now)await delay(reserved-now,undefined,{signal});}finally{this.queued--;}}
        let response:Response;
        try{response=await this.fetcher(target,{headers:{Accept:'application/json','User-Agent':`mcp-singapore/${VERSION}`,...options.headers},redirect:'error',signal});}
        catch(error){if(signal.aborted)throw error;if(attempt<2){await delay(300*(attempt+1),undefined,{signal});continue;}throw new ApiError(`Unable to reach ${target.hostname}`,undefined,undefined,'UPSTREAM_UNAVAILABLE',target.hostname);}
        if(!response.ok){const retry=retryDelay(response.headers.get('retry-after'));await response.body?.cancel();if((response.status===429||response.status>=500)&&attempt<2&&retry<=10){await delay(response.headers.has('retry-after')||response.status===429?retry*1000:400*(attempt+1),undefined,{signal});continue;}throw new ApiError(`Upstream ${target.hostname} returned HTTP ${response.status}`,response.status,retry,undefined,target.hostname);}
        const reader=response.body?.getReader();if(!reader)throw new ApiError('Empty API response',undefined,undefined,'INVALID_RESPONSE',target.hostname);const chunks:Uint8Array[]=[];let size=0;
        for(;;){const p=await reader.read();if(p.done)break;size+=p.value.byteLength;if(size>config.httpBytes){await reader.cancel();throw new ApiError('API response exceeds 8 MiB default budget; use narrower filters or export',undefined,undefined,'OUTPUT_TOO_LARGE',target.hostname);}chunks.push(p.value);}
        let body:unknown;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new ApiError(`Invalid JSON from ${target.hostname}`,undefined,undefined,'INVALID_RESPONSE',target.hostname);}
        validateResponse(target,body);return{value:body,bytes:size,fetched:Date.now(),expires:0};
      }
    }catch(error){if(signal.aborted)throw new ApiError(caller?.aborted?'Request cancelled':'Request deadline exceeded',undefined,undefined,caller?.aborted?'CANCELLED':'NETWORK_TIMEOUT',target.hostname);throw error;}
    throw new ApiError('Request failed');
  }
}
export const http=new HttpClient();
export function url(base:string,params:Record<string,unknown>={}):URL{const result=new URL(base);for(const[k,v]of Object.entries(params))if(v!==undefined&&v!==null&&v!=='')result.searchParams.set(k,typeof v==='object'?JSON.stringify(v):String(v));return result;}
export function dataGovHeaders():Record<string,string>{return process.env.DATA_GOV_SG_API_KEY?{'x-api-key':process.env.DATA_GOV_SG_API_KEY}:{};}
