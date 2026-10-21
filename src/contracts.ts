import { z } from 'zod';
import { ApiError, safeMessage } from './errors.js';
const row=z.record(z.string(),z.unknown());
const observation=z.object({key:z.string(),value:z.string()}).passthrough();
export const contracts = {
  datastore:z.object({success:z.literal(true),result:z.object({resource_id:z.string(),fields:z.array(z.object({id:z.string(),type:z.string()}).passthrough()),records:z.array(row),total:z.number().int().nonnegative()}).passthrough()}).passthrough(),
  weather:z.object({code:z.literal(0),data:row.refine(d=>['readings','items','records'].some(key=>Array.isArray(d[key])&&(d[key]as unknown[]).every(v=>v!==null&&typeof v==='object')),'Missing weather observation groups')}).passthrough(),
  singstat:z.object({Data:row,StatusCode:z.literal(200)}).passthrough(),
  table:z.object({Data:z.object({id:z.string(),title:z.string(),frequency:z.string(),dataLastUpdated:z.string(),row:z.array(z.object({seriesNo:z.string(),rowText:z.string(),uoM:z.string(),columns:z.array(observation)}).passthrough())}).passthrough()}).passthrough(),
  onemap:row,
  lta:row,
  worldbank:z.tuple([row,z.array(row).nullable()]),
};
export function validateResponse(target: URL, body: unknown): void {
  const b=body as Record<string,unknown>|null;
  if(b && typeof b==='object' && !Array.isArray(b) && (b.success===false || typeof b.code==='number'&&b.code!==0 || typeof b.StatusCode==='number'&&b.StatusCode!==200 || b.error)) {
    const detail=safeMessage(b.errorMsg??b.Message??(typeof b.error==='string'?b.error:undefined));
    throw new ApiError(`Upstream ${target.hostname}: ${detail}`,undefined,undefined,target.hostname==='www.onemap.gov.sg'&&/auth|token|credential/i.test(String(b.error))?'AUTH_FAILED':'UPSTREAM_ERROR',target.hostname);
  }
  if(target.hostname==='api.worldbank.org' && Array.isArray(body) && body[0]?.message)throw new ApiError('Invalid World Bank indicator or query',400,undefined,'INVALID_ARGUMENT',target.hostname);
  let schema:z.ZodType|undefined;
  if(target.pathname.endsWith('datastore_search'))schema=contracts.datastore;
  else if(target.hostname==='api-open.data.gov.sg'&&target.pathname.includes('/real-time/'))schema=contracts.weather;
  else if(target.hostname==='tablebuilder.singstat.gov.sg')schema=target.pathname.includes('/tabledata/')?contracts.table:contracts.singstat;
  else if(target.hostname==='api.worldbank.org')schema=contracts.worldbank;
  else if(target.hostname==='www.onemap.gov.sg')schema=contracts.onemap;
  else if(target.hostname==='datamall2.mytransport.sg')schema=contracts.lta;
  else if(target.hostname==='api-production.data.gov.sg')schema=target.pathname.includes('/datasets/')&&target.pathname.endsWith('/metadata')?z.object({code:z.literal(0),data:z.object({datasetId:z.string(),name:z.string(),format:z.string()}).passthrough()}).passthrough():z.object({code:z.literal(0),data:row}).passthrough();
  else if(target.hostname==='api.data.gov.sg')schema=target.pathname.endsWith('taxi-availability')?z.object({features:z.array(z.object({geometry:z.object({coordinates:z.array(z.array(z.number()).length(2))}),properties:row}))}):z.object({items:z.array(row)});
  if(schema && !schema.safeParse(body).success)throw new ApiError(`Unexpected response schema from ${target.hostname}`,undefined,undefined,'INVALID_RESPONSE',target.hostname);
}
