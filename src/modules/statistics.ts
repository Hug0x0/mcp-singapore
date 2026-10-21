import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { addTool, resourceId, limitSchema, offsetSchema, normalize } from '../tools.js';
import { http, url } from '../http.js';
import { periodKey, periodBounds } from '../periods.js';
import type { Row, SingStatData } from '../types.js';
const BASE = 'https://tablebuilder.singstat.gov.sg/api/table';
export function sliceTable(table:SingStatData,series:string|undefined,seriesOffset:number,seriesLimit:number,periodLimit:number,from?:string,to?:string,order:'asc'|'desc'='asc'){
 const{lower,upper}=periodBounds(from,to);const matching=table.row.filter(r=>!series||normalize(r.rowText).includes(normalize(series)));let unknown=false;
 const rows=matching.slice(seriesOffset,seriesOffset+seriesLimit).map(row=>{const known=row.columns.every(c=>periodKey(c.key)!==null);if(!known)unknown=true;const ordered=known?[...row.columns].sort((a,b)=>periodKey(a.key)!-periodKey(b.key)!):row.columns;const filtered=ordered.filter(c=>{const key=periodKey(c.key);return(lower===null&&upper===null)||(key!==null&&(lower===null||key>=lower)&&(upper===null||key<=upper));});const latest=filtered.slice(-periodLimit);return{...row,total_periods:filtered.length,omitted_periods:Math.max(0,filtered.length-periodLimit),columns:order==='desc'?[...latest].reverse():latest};});
 return{...table,total_matching_series:matching.length,next_series_offset:seriesOffset+seriesLimit<matching.length?seriesOffset+seriesLimit:null,returned:rows.length,has_more:seriesOffset+seriesLimit<matching.length,period_order:order,period_order_warning:unknown?'Unrecognised period labels preserve upstream order; latest cannot be guaranteed.':undefined,row:rows};
}
export function registerStatistics(server: McpServer) {
  addTool(server, 'singapore_search_statistics', 'Search SingStat Table Builder across all official economic, population, labour, trade, health and social tables. Returns resource IDs to use with inspect_statistics/get_statistics. Use English terms.', { query: z.string().min(1).max(200), limit: limitSchema, offset: offsetSchema }, async ({ query, limit, offset }) => {
    const target = url(`${BASE}/resourceid`, { keyword: query, searchOption: 'all' });
    const body = await http.get<{ Data: { total: number; records: Row[] } }>(target, { ttlMs: 3600000 });
    return { source_url: target.href, data: { total: body.Data.total, tables: body.Data.records.slice(offset, offset + limit), next_offset: offset + limit < body.Data.total ? offset + limit : null } };
  });
  addTool(server, 'singapore_inspect_statistics', 'Get SingStat table metadata, frequency, units, definitions, notes, series and coverage before reading observations.', { resource_id: resourceId,series_limit:limitSchema,series_offset:offsetSchema,include_raw:z.boolean().default(false) }, async ({ resource_id,series_limit,series_offset,include_raw }) => {
    const target = `${BASE}/metadata/${resource_id}`;
    const body=await http.get<{Data:Row}>(target,{ttlMs:3600000});const records=(body.Data.records??body.Data)as Row;const rows=Array.isArray(records.row)?records.row:[];return{source_url:target,data:{...records,row:rows.slice(series_offset,series_offset+series_limit),returned:Math.min(series_limit,Math.max(0,rows.length-series_offset)),total_series:rows.length,has_more:series_offset+series_limit<rows.length,next_series_offset:series_offset+series_limit<rows.length?series_offset+series_limit:null,...(include_raw?{raw_metadata:body.Data}:{})}};
  });
  addTool(server, 'singapore_get_statistics', 'Read SingStat time series, retaining unit and footnotes. Fetches table (or one exact upstream period), then filters series locally and keeps the last N upstream periods per series. Values remain strings to preserve missing-value markers. Use series_offset to paginate series.', { resource_id: resourceId, period: z.string().regex(/^[\w .,-]{1,40}$/).optional().describe('Exact upstream period, e.g. 2024; inspect table frequency first'), series_contains: z.string().max(200).optional(), from_period:z.string().max(30).optional(),to_period:z.string().max(30).optional(),order:z.enum(['asc','desc']).default('asc'), series_offset: offsetSchema, series_limit: z.number().int().min(1).max(50).default(10), period_limit: z.number().int().min(1).max(100).default(12) }, async ({ resource_id, period, series_contains, series_offset, series_limit, period_limit,from_period,to_period,order }) => {
    periodBounds(from_period,to_period);
    const target = url(`${BASE}/tabledata/${resource_id}`, { timeFilter: period });
    const body = await http.get<{ Data: SingStatData }>(target, { ttlMs: 3600000 });
    return { source_url: target.href, data: sliceTable(body.Data, series_contains, series_offset, series_limit, period_limit,from_period,to_period,order) };
  });
}
