import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { snapshot, queryDataset, metadata, CATALOG_BASE } from '../clients/datagov.js';
import { http, url, dataGovHeaders } from '../http.js';
import { addTool, datasetId, limitSchema, offsetSchema, normalize, pagination } from '../tools.js';
import {exportDataset}from'../exports.js';
import type { Row } from '../types.js';
export const queryShape = {
  dataset_id: datasetId, filters: z.record(z.string(), z.string()).optional().describe('Exact equality by field name, e.g. {"town":"ANG MO KIO"}'),
  q: z.record(z.string(), z.string()).optional().describe('Search text by column, e.g. {"school_name":"RAFFLES"}'),
  fields: z.array(z.string().min(1).max(120)).max(50).optional(), sort: z.string().max(500).optional().describe('e.g. month desc, resale_price desc; inspect fields first'),
  limit: limitSchema, offset: offsetSchema,
};
const translations:Record<string,string>={ecole:'school',ecoles:'school',logement:'housing',loyer:'rent',loyers:'rent',entreprise:'ACRA',entreprises:'ACRA',sante:'health',tourisme:'tourism',dechets:'waste',eau:'water',energie:'energy',population:'population',pib:'gross domestic product',chomage:'unemployment',revenus:'income',revenu:'income',inflation:'consumer price',musees:'museum',bibliotheque:'library'};
export function translatedQuery(query:string){return normalize(query).split(/\s+/).map(t=>translations[t]??t).join(' ');}
export interface CatalogFilters{status?:string;coverage_year?:number;updated_since?:string;include_unknown_coverage?:boolean}
export function searchCatalog(query='',agency='',format='',filters:CatalogFilters={}){
  const terms=translatedQuery(query).split(/\s+/).filter(Boolean);
  return snapshot.datasets.filter(d=>{
    const combined=normalize(`${d.title} ${d.description??''} ${d.agency??''}`);
    const unknown=!d.coverage_start||!d.coverage_end;
    return terms.every(t=>combined.includes(t))&&normalize(d.agency??'').includes(normalize(agency))&&(!format||normalize(d.format??'')===normalize(format))&&(!filters.status||d.status===filters.status)&&(!filters.updated_since||Boolean(d.updated_at&&d.updated_at>=filters.updated_since))&&(filters.coverage_year===undefined||(unknown?filters.include_unknown_coverage===true:Number(d.coverage_start!.slice(0,4))<=filters.coverage_year&&Number(d.coverage_end!.slice(0,4))>=filters.coverage_year));
  }).map(d=>({d,score:terms.reduce((s,t)=>s+(normalize(d.title).includes(t)?10:normalize(d.agency??'').includes(t)?3:1),0)})).sort((a,b)=>b.score-a.score||a.d.title.localeCompare(b.d.title)||a.d.dataset_id.localeCompare(b.d.dataset_id)).map(x=>x.d);
}
export function registerCatalog(server: McpServer) {
  addTool(server,'singapore_lookup_dataset','Resolve an exact dataset ID in the bundled snapshot. No network; a missing entry may exist in the live catalog.',{dataset_id:datasetId},({dataset_id})=>({source_url:snapshot.source,catalog_snapshot_at:snapshot.retrieved_at,data:{found:snapshot.datasets.some(d=>d.dataset_id===dataset_id),dataset:snapshot.datasets.find(d=>d.dataset_id===dataset_id)??null}}));
  addTool(server,'singapore_list_collections','List a live page of data.gov.sg collections and their child dataset IDs. Page size is controlled by the provider.',{page:z.number().int().min(1).max(10000).default(1)},async({page})=>{const target=url(`${CATALOG_BASE}/collections`,{page});const body=await http.get<{data:{collections:Row[];pages:number}}>(target,{headers:dataGovHeaders(),ttlMs:300000});return{source_url:target.href,data:{...body.data,page,returned:body.data.collections.length,has_more:page<body.data.pages,next_page:page<body.data.pages?page+1:null}};});
  addTool(server, 'singapore_search_catalog', 'Search the bundled full data.gov.sg catalog by English keywords, agency and format. No network needed. Results include snapshot date. Use inspect_dataset then query_dataset; non-tabular datasets may require download. Use list_catalog_page for updates since the snapshot.', { query: z.string().max(300).default(''), agency: z.string().max(200).default(''), format: z.string().max(30).default(''), status:z.string().max(30).optional(),coverage_year:z.number().int().min(1800).max(2100).optional(),updated_since:z.string().date().optional(),include_unknown_coverage:z.boolean().default(false),limit: limitSchema, offset: offsetSchema }, ({ query, agency, format, limit, offset,...filters }) => {
    const matches = searchCatalog(query, agency, format,filters);
    return { source_url: snapshot.source, catalog_snapshot_at: snapshot.retrieved_at, data: { total: matches.length, catalog_size: snapshot.datasets.length, datasets: matches.slice(offset, offset + limit), ...pagination(matches.length,offset,Math.min(limit,Math.max(0,matches.length-offset))) } };
  });
  addTool(server, 'singapore_list_catalog_page', 'List a current live page of data.gov.sg catalog (upstream page size). Use search_catalog for fast search of the bundled snapshot.', { page: z.number().int().min(1).max(10000).default(1) }, async ({ page }) => {
    const target = url(`${CATALOG_BASE}/datasets`, { page });
    return { source_url: target.href, data: (await http.get<{ data: unknown }>(target, { headers: dataGovHeaders(), ttlMs: 300000 })).data };
  });
  addTool(server, 'singapore_inspect_dataset', 'Get live dataset metadata, schema, format, coverage and last update. Field IDs may be internal: use columnMetadata.map/metaMapping names for datastore filters.', { dataset_id: datasetId }, ({ dataset_id }) => metadata(dataset_id));
  addTool(server, 'singapore_query_dataset', 'Query any tabular data.gov.sg dataset. Exact filters, column text search, projection, sorting and pagination. Preserve upstream values/units; no SQL. Non-tabular or unsupported datasets can be downloaded instead.', queryShape, queryDataset);
  addTool(server, 'singapore_get_collection', 'Get a collection and its child dataset metadata to discover related historical series or ACRA partitions.', { collection_id: z.number().int().min(1) }, async ({ collection_id }) => {
    const target = url(`${CATALOG_BASE}/collections/${collection_id}/metadata`, { withDatasetMetadata: true });
    return { source_url: target.href, data: (await http.get<{ data: unknown }>(target, { headers: dataGovHeaders(), ttlMs: 3600000 })).data };
  });
  addTool(server, 'singapore_download_dataset', 'Start or poll a dataset export. Call initiate once, then poll on later calls. Returns provider download URL (may expire), never downloads large files into the conversation. Suitable for CSV/GeoJSON/KML and datasets without datastore support.', { dataset_id: datasetId, action: z.enum(['initiate', 'poll']).default('initiate') }, async ({ dataset_id, action }) => {
    return exportDataset(dataset_id,action);
  });
  addTool(server, 'singapore_catalog_summary', 'List dataset counts by publishing agency and file format, with catalog snapshot date.', {}, () => {
    const agencies: Record<string, number> = {}; const formats: Record<string, number> = {};
    for (const d of snapshot.datasets) { agencies[d.agency ?? 'Unknown'] = (agencies[d.agency ?? 'Unknown'] ?? 0) + 1; formats[d.format ?? 'Unknown'] = (formats[d.format ?? 'Unknown'] ?? 0) + 1; }
    return { source_url: snapshot.source, data: { total: snapshot.datasets.length, snapshot_at: snapshot.retrieved_at, agencies, formats } };
  });
}
