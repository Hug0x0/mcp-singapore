import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { addTool, resourceId, limitSchema, offsetSchema, normalize } from '../tools.js';
import { http, url } from '../http.js';
import type { Row, SingStatData } from '../types.js';
const BASE = 'https://tablebuilder.singstat.gov.sg/api/table';
export function sliceTable(table: SingStatData, series: string | undefined, seriesOffset: number, seriesLimit: number, periodLimit: number) {
  const matching = table.row.filter(r => !series || normalize(r.rowText).includes(normalize(series)));
  return { ...table, total_matching_series: matching.length, next_series_offset: seriesOffset + seriesLimit < matching.length ? seriesOffset + seriesLimit : null, row: matching.slice(seriesOffset, seriesOffset + seriesLimit).map(row => ({ ...row, total_periods: row.columns.length, omitted_periods: Math.max(0, row.columns.length - periodLimit), columns: row.columns.slice(-periodLimit) })) };
}
export function registerStatistics(server: McpServer) {
  addTool(server, 'singapore_search_statistics', 'Search SingStat Table Builder across all official economic, population, labour, trade, health and social tables. Returns resource IDs to use with inspect_statistics/get_statistics. Use English terms.', { query: z.string().min(1).max(200), limit: limitSchema, offset: offsetSchema }, async ({ query, limit, offset }) => {
    const target = url(`${BASE}/resourceid`, { keyword: query, searchOption: 'all' });
    const body = await http.get<{ Data: { total: number; records: Row[] } }>(target, { ttlMs: 3600000 });
    return { source_url: target.href, data: { total: body.Data.total, tables: body.Data.records.slice(offset, offset + limit), next_offset: offset + limit < body.Data.total ? offset + limit : null } };
  });
  addTool(server, 'singapore_inspect_statistics', 'Get SingStat table metadata, frequency, units, definitions, notes, series and coverage before reading observations.', { resource_id: resourceId }, async ({ resource_id }) => {
    const target = `${BASE}/metadata/${resource_id}`;
    return { source_url: target, data: (await http.get<{ Data: unknown }>(target, { ttlMs: 3600000 })).Data };
  });
  addTool(server, 'singapore_get_statistics', 'Read SingStat time series, retaining unit and footnotes. Fetches table (or one exact upstream period), then filters series locally and keeps the last N upstream periods per series. Values remain strings to preserve missing-value markers. Use series_offset to paginate series.', { resource_id: resourceId, period: z.string().regex(/^[\w .,-]{1,40}$/).optional().describe('Exact upstream period, e.g. 2024; inspect table frequency first'), series_contains: z.string().max(200).optional(), series_offset: offsetSchema, series_limit: z.number().int().min(1).max(50).default(10), period_limit: z.number().int().min(1).max(100).default(12) }, async ({ resource_id, period, series_contains, series_offset, series_limit, period_limit }) => {
    const target = url(`${BASE}/tabledata/${resource_id}`, { timeFilter: period });
    const body = await http.get<{ Data: SingStatData }>(target, { ttlMs: 3600000 });
    return { source_url: target.href, data: sliceTable(body.Data, series_contains, series_offset, series_limit, period_limit) };
  });
}
