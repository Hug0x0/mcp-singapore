import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { snapshot, queryDataset, metadata, CATALOG_BASE } from '../clients/datagov.js';
import { http, url, dataGovHeaders } from '../http.js';
import { addTool, datasetId, limitSchema, offsetSchema, normalize } from '../tools.js';
import type { Row } from '../types.js';
export const queryShape = {
  dataset_id: datasetId, filters: z.record(z.string(), z.string()).optional().describe('Exact equality by field name, e.g. {"town":"ANG MO KIO"}'),
  q: z.record(z.string(), z.string()).optional().describe('Search text by column, e.g. {"school_name":"RAFFLES"}'),
  fields: z.array(z.string().min(1).max(120)).max(50).optional(), sort: z.string().max(500).optional().describe('e.g. month desc, resale_price desc; inspect fields first'),
  limit: limitSchema, offset: offsetSchema,
};
export function searchCatalog(query = '', agency = '', format = '') {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return snapshot.datasets.filter(d => terms.every(t => normalize(`${d.title} ${d.description ?? ''} ${d.agency ?? ''}`).includes(t)) && normalize(d.agency ?? '').includes(normalize(agency)) && (!format || normalize(d.format ?? '') === normalize(format)));
}
export function registerCatalog(server: McpServer) {
  addTool(server, 'singapore_search_catalog', 'Search the bundled full data.gov.sg catalog by English keywords, agency and format. No network needed. Results include snapshot date. Use inspect_dataset then query_dataset; non-tabular datasets may require download. Use list_catalog_page for updates since the snapshot.', { query: z.string().max(300).default(''), agency: z.string().max(200).default(''), format: z.string().max(30).default(''), limit: limitSchema, offset: offsetSchema }, ({ query, agency, format, limit, offset }) => {
    const matches = searchCatalog(query, agency, format);
    return { source_url: snapshot.source, catalog_snapshot_at: snapshot.retrieved_at, data: { total: matches.length, catalog_size: snapshot.datasets.length, datasets: matches.slice(offset, offset + limit), next_offset: offset + limit < matches.length ? offset + limit : null } };
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
    const target = `https://api-open.data.gov.sg/v1/public/api/datasets/${dataset_id}/${action === 'initiate' ? 'initiate' : 'poll'}-download`;
    return { source_url: target, data: await http.get<Row>(target, { headers: dataGovHeaders(), intervalMs: 5500, rateGroup: 'downloads' }), warnings: ['Download links can expire. A pending export is not an error; poll again later.'] };
  });
  addTool(server, 'singapore_catalog_summary', 'List dataset counts by publishing agency and file format, with catalog snapshot date.', {}, () => {
    const agencies: Record<string, number> = {}; const formats: Record<string, number> = {};
    for (const d of snapshot.datasets) { agencies[d.agency ?? 'Unknown'] = (agencies[d.agency ?? 'Unknown'] ?? 0) + 1; formats[d.format ?? 'Unknown'] = (formats[d.format ?? 'Unknown'] ?? 0) + 1; }
    return { source_url: snapshot.source, data: { total: snapshot.datasets.length, snapshot_at: snapshot.retrieved_at, agencies, formats } };
  });
}
