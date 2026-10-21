import { readFile } from 'node:fs/promises';
import { http, url, dataGovHeaders } from '../http.js';
import type { CatalogSnapshot, DatastoreResult, Row } from '../types.js';
export const CATALOG_BASE = 'https://api-production.data.gov.sg/v2/public/api';
export const snapshot: CatalogSnapshot = JSON.parse(await readFile(new URL('../../data/catalog.json', import.meta.url), 'utf8'));
export interface Query { dataset_id: string; filters?: Record<string, string>; q?: Record<string, string>; fields?: string[]; sort?: string; limit: number; offset: number }
export async function queryDataset(params: Query) {
  const target = url('https://data.gov.sg/api/action/datastore_search', { resource_id: params.dataset_id, filters: params.filters, q: params.q, fields: params.fields?.join(','), sort: params.sort, limit: params.limit, offset: params.offset });
  const body = await http.get<{ success: boolean; result: DatastoreResult }>(target, { headers: dataGovHeaders(), ttlMs: 60000, intervalMs: 2700, rateGroup: 'datastore' });
  const result = body.result;
  if (!result || !Array.isArray(result.records) || !Array.isArray(result.fields)) throw new Error('Invalid datastore response');
  return { source_url: target.href, dataset_url: `https://data.gov.sg/datasets/${params.dataset_id}/view`, data: { dataset_id: params.dataset_id, fields: result.fields, records: result.records, total: result.total, limit: params.limit, offset: params.offset, next_offset: params.offset + result.records.length < result.total ? params.offset + result.records.length : null } };
}
export async function metadata(id: string) {
  const target = `${CATALOG_BASE}/datasets/${id}/metadata`;
  const body = await http.get<{ data: Row }>(target, { headers: dataGovHeaders(), ttlMs: 3600000 });
  return { source_url: target, data: body.data };
}
