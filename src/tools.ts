import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ApiError } from './errors.js';
import { requestContext } from './context.js';
import { config } from './config.js';
export interface Payload { source_url?:string;data:unknown;warnings?:string[];[key:string]:unknown }
export interface ToolInfo { name:string;description:string }
export const toolRegistry=new WeakMap<McpServer,ToolInfo[]>();
const outputShape={ok:z.boolean(),served_at:z.string(),data:z.unknown().optional(),sources:z.array(z.object({source_url:z.string(),fetched_at:z.string(),cache_hit:z.boolean(),age_seconds:z.number()})),error:z.string().optional(),error_code:z.string().optional(),source_url:z.string().optional(),dataset_url:z.string().optional(),catalog_snapshot_at:z.string().optional(),catalog_metadata:z.unknown().optional(),warnings:z.array(z.string()).optional(),metadata:z.unknown().optional(),status:z.number().optional(),retry_after_seconds:z.number().optional(),provider:z.string().optional()};
export function addTool<S extends z.ZodRawShape>(server:McpServer,name:string,description:string,shape:S,run:(args:z.infer<z.ZodObject<S>>,signal?:AbortSignal)=>Promise<Payload>|Payload):void{
  const list=toolRegistry.get(server)??[];list.push({name,description});toolRegistry.set(server,list);
  server.registerTool(name,{description,inputSchema:shape as z.ZodRawShape,outputSchema:outputShape,annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:name!=='singapore_download_dataset',openWorldHint:true}},async(args,extra)=>requestContext.run({signal:extra.signal,sources:[]},async()=>{
    let body:Record<string,unknown>;let failed=false;
    try{const result=await run(args as z.infer<z.ZodObject<S>>,extra.signal);body={...result,ok:true,served_at:new Date().toISOString(),sources:requestContext.getStore()!.sources};if(Buffer.byteLength(JSON.stringify(body))>config.outputBytes)throw new ApiError('MCP output exceeds configured budget. Reduce limit/fields, add filters, or use dataset export. No records were silently truncated.',undefined,undefined,'OUTPUT_TOO_LARGE');}
    catch(error){failed=true;const e=error instanceof ApiError?error:new ApiError('Unable to process upstream data',undefined,undefined,'INVALID_RESPONSE');body={ok:false,served_at:new Date().toISOString(),sources:requestContext.getStore()!.sources.slice(0,20),error:e.message,error_code:e.code,status:e.status,retry_after_seconds:e.retryAfterSeconds,provider:e.provider};}
    return{...(failed?{isError:true}:{}),structuredContent:body,content:[{type:'text' as const,text:JSON.stringify(body)}]};
  }));
}
export const datasetId=z.string().regex(/^d_[a-f0-9]{32}$/);
export const resourceId=z.string().regex(/^[A-Za-z0-9]{1,24}$/);
export const limitSchema=z.number().int().min(1).max(100).default(20);
export const offsetSchema=z.number().int().min(0).max(10000000).default(0);
export const dateSchema=z.string().regex(/^\d{4}-\d{2}-\d{2}(?:T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:[+]08:00)?)?$/).refine(v=>{const d=new Date(v.slice(0,10)+'T00:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===v.slice(0,10);},'Invalid calendar date').optional().describe('Singapore local time UTC+08:00: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss');
export const normalize=(s:string):string=>s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
export function pagination(total:number,offset:number,returned:number){const next=returned>0&&offset+returned<total?offset+returned:null;return{returned,has_more:next!==null,next_offset:next};}
