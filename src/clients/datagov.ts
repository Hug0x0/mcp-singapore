import {readFile}from'node:fs/promises';
import{http,url,dataGovHeaders,ApiError}from'../http.js';
import{config}from'../config.js';import{staleWarning}from'../data-utils.js';
import type{CatalogSnapshot,DatastoreResult,Row}from'../types.js';
export const CATALOG_BASE='https://api-production.data.gov.sg/v2/public/api';
export const snapshot:CatalogSnapshot=JSON.parse(await readFile(new URL('../../data/catalog.json',import.meta.url),'utf8'));
export interface Query{dataset_id:string;filters?:Record<string,string>;q?:Record<string,string>;fields?:string[];sort?:string;limit:number;offset:number}
export function normalizeFields(meta:Row){const columns=meta.columnMetadata as{order?:string[];map?:Record<string,string>;metaMapping?:Record<string,Row>}|undefined;return(columns?.order??Object.keys(columns?.map??{})).map(id=>({id,name:columns?.map?.[id]??String(columns?.metaMapping?.[id]?.name??id),label:columns?.metaMapping?.[id]?.columnTitle,type:columns?.metaMapping?.[id]?.dataType}));}
export async function metadata(id:string){const target=`${CATALOG_BASE}/datasets/${id}/metadata`;const body=await http.get<{data:Row}>(target,{headers:dataGovHeaders(),ttlMs:3600000});return{source_url:target,data:{...body.data,fields:normalizeFields(body.data)} as Row & {fields:ReturnType<typeof normalizeFields>},warnings:staleWarning(body.data.lastUpdatedAt,config.staleDays)};}
export function validateColumns(params:Query,names:string[]){const allowed=new Set([...names,'_id']);const used=[...Object.keys(params.filters??{}),...Object.keys(params.q??{}),...(params.fields??[])];
  if(params.sort)for(const part of params.sort.split(',')){const m=part.trim().match(/^([A-Za-z_][\w ]*?)(?:\s+(asc|desc))?$/i);if(!m)throw new ApiError('Invalid sort syntax; use field asc/desc',400,undefined,'INVALID_ARGUMENT');used.push(m[1]);}
  const unknown=[...new Set(used.filter(n=>!allowed.has(n)))];if(unknown.length)throw new ApiError(`Unknown dataset fields: ${unknown.join(', ').slice(0,200)}. Inspect dataset first.`,400,undefined,'INVALID_ARGUMENT');}
export function datastorePage(result:DatastoreResult,params:Query){const count=result.records.length;const stalled=count===0&&params.offset<result.total;return{dataset_id:params.dataset_id,fields:result.fields,records:result.records,total:result.total,limit:params.limit,offset:params.offset,returned:count,has_more:!stalled&&params.offset+count<result.total,next_offset:count>0&&params.offset+count<result.total?params.offset+count:null,pagination_warning:stalled?'Upstream returned no rows before total was reached; continuation stopped to avoid a loop.':undefined};}
export async function queryDataset(params:Query){
  const meta=await metadata(params.dataset_id);if(meta.data.format&&meta.data.format!=='CSV')throw new ApiError('Dataset is not tabular CSV; inspect metadata and use export or the dedicated API tool.',400,undefined,'INVALID_ARGUMENT');
  validateColumns(params,meta.data.fields.map(f=>f.name));
  const target=url('https://data.gov.sg/api/action/datastore_search',{resource_id:params.dataset_id,filters:params.filters,q:params.q,fields:params.fields?.join(','),sort:params.sort,limit:params.limit,offset:params.offset});
  const body=await http.get<{success:boolean;result:DatastoreResult}>(target,{headers:dataGovHeaders(),ttlMs:60000,rateGroup:'datastore'});
  return{source_url:target.href,dataset_url:`https://data.gov.sg/datasets/${params.dataset_id}/view`,data:datastorePage(body.result,params),metadata:{source_updated_at:meta.data.lastUpdatedAt,coverage_start:meta.data.coverageStart,coverage_end:meta.data.coverageEnd},warnings:meta.warnings};
}
