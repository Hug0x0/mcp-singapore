import { readFile } from 'node:fs/promises';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { addTool, normalize } from '../tools.js';
import { queryDataset, snapshot } from '../clients/datagov.js';
import { queryShape } from './catalog.js';
import { ApiError } from '../http.js';
import type { Dataset } from '../types.js';
export const curated: (Dataset & { key: string; topic: string })[] = JSON.parse(await readFile(new URL('../../data/curated.json', import.meta.url), 'utf8'));
const topicAliases:Record<string,string>={logement:'housing',immobilier:'housing',education:'education',alimentation:'food',sante:'health',economie:'economy',emploi:'employment',environnement:'environment',tourisme:'tourism',geographie:'geography'};
export function resolveTopic(topic?:string){if(!topic)return undefined;const value=topicAliases[normalize(topic)]??normalize(topic);if(!curated.some(d=>d.topic===value))throw new ApiError('Unknown topic; consult singapore://topics or omit topic for the list',400,undefined,'INVALID_ARGUMENT');return value;}
export function registerCurated(server: McpServer) {
  addTool(server, 'singapore_list_curated_datasets', 'Browse curated datasets and tool names by topic. Includes coverage dates: some series are historical. The full catalog is searchable separately.', { topic: z.string().max(100).optional() }, ({ topic }) => ({ source_url: snapshot.source, catalog_snapshot_at: snapshot.retrieved_at, data: curated.filter(d => !topic || d.topic===resolveTopic(topic)).map(d => ({ ...d, tool: `singapore_query_${d.key}` })) }));
  for (const dataset of curated) {
    const { dataset_id: unused, ...shape } = queryShape;
    addTool(server, `singapore_query_${dataset.key}`, `Query ${dataset.title} (${dataset.agency}). Topic: ${dataset.topic}. Inspect dataset ${dataset.dataset_id} first for filter fields. Supports exact filters, column text search, fields, sort and pagination. Returns source coverage from the bundled catalog; fetch metadata for current coverage.`, shape, async (args) => ({ ...await queryDataset({ ...args, dataset_id: dataset.dataset_id }), catalog_metadata: dataset }));
  }
}
