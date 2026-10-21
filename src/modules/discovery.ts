import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { addTool, normalize, limitSchema } from '../tools.js';
import { sources } from '../sources.js';
import { VERSION } from '../version.js';
import { config } from '../config.js';
import { http } from '../http.js';
import { snapshot } from '../clients/datagov.js';
import { searchCatalog } from './catalog.js';
const routes = [
  { words: ['meteo','weather','pluie','rain','temperature','vent','humidite'], tools: ['singapore_get_forecast_2h','singapore_get_forecast_24h','singapore_get_air_temperature','singapore_get_rainfall'], search: 'weather' },
  { words: ['pollution','air','psi','pm2','uv'], tools: ['singapore_get_psi','singapore_get_pm25','singapore_get_uv_index'], search: 'air quality' },
  { words: ['logement','immobilier','hdb','appartement','flat','loyer','rental','resale'], tools: ['singapore_query_hdb_resale','singapore_query_hdb_rentals','singapore_query_hdb_median_rent','singapore_query_private_property_prices'], search: 'resale flat prices' },
  { words: ['transport','bus','mrt','metro','trafic','traffic','taxi','parking','carpark','flood','inondation'], tools: ['singapore_get_bus_arrivals','singapore_query_lta','singapore_get_taxi_availability','singapore_get_carpark_availability','singapore_get_traffic_images'], search: 'transport' },
  { words: ['ecole','school','education','universite'], tools: ['singapore_query_schools'], search: 'school' },
  { words: ['entreprise','societe','business','company','acra','uen'], tools: ['singapore_query_businesses','singapore_get_collection'], search: 'ACRA' },
  { words: ['sante','health','dengue','maladie','disease','hospital'], tools: ['singapore_query_infectious_diseases','singapore_query_healthcare_schemes'], search: 'health' },
  { words: ['restaurant','hawker','food','manger'], tools: ['singapore_query_hawker_centres','singapore_query_hawker_closures'], search: 'hawker' },
  { words: ['touris','hotel','visiteur','visitor'], tools: ['singapore_query_visitor_arrivals','singapore_query_hotel_statistics'], search: 'tourism' },
  { words: ['population','demographie','habitant'], tools: ['singapore_search_statistics','singapore_get_statistics','singapore_get_indicator'], search: 'population' },
{ words: ['pib','gdp','economie','economy'], tools: ['singapore_search_statistics','singapore_get_statistics','singapore_get_indicator'], search: 'gross domestic product' },
{ words: ['inflation','prix','price'], tools: ['singapore_search_statistics','singapore_get_statistics','singapore_get_indicator'], search: 'consumer price' },
{ words: ['emploi','employment','chomage','unemployment'], tools: ['singapore_search_statistics','singapore_get_statistics','singapore_get_indicator'], search: 'unemployment' },
{ words: ['revenu','revenus','income','salaire','wage'], tools: ['singapore_search_statistics','singapore_get_statistics','singapore_get_indicator'], search: 'income' },
{ words: ['commerce','trade','export','import'], tools: ['singapore_search_statistics','singapore_get_statistics','singapore_get_indicator'], search: 'trade' },
{ words: ['statistic','statistique'], tools: ['singapore_search_statistics','singapore_get_statistics','singapore_get_indicator'], search: 'indicators' },
  { words: ['environnement','environment','energie','energy','eau','water','dechet','waste','recycl','carbone','carbon'], tools: ['singapore_query_recycling_rates','singapore_query_greenhouse_emissions','singapore_search_statistics'], search: 'environment' },
  { words: ['adresse','address','postal','geograph','carte','map','quartier','planning area'], tools: ['singapore_search_address','singapore_reverse_geocode','singapore_search_catalog'], search: 'planning area' },
  { words: ['culture','musee','museum','bibliotheque','library','sport'], tools: ['singapore_query_museum_visitors','singapore_query_sport_facilities'], search: 'museum' },
];
export function routeQuestion(question: string) {
  const text = normalize(question);
  const tokens=text.split(/[^a-z0-9]+/).filter(Boolean);
  const has=(word:string)=>word.includes(' ')?text.includes(word):tokens.some(token=>word.length<=4?token===word:token.startsWith(word));
  return routes.map(r => ({ ...r, score: r.words.filter(w => has(w)).length })).filter(r => r.score > 0).sort((a,b) => b.score - a.score);
}
export function registerDiscovery(server: McpServer) {
  addTool(server, 'singapore_get_capabilities', 'Local configuration and source availability. Reports only whether credentials are configured, never their values. No network requests.', {}, () => ({data:{version:VERSION,transport:'stdio',catalog:{datasets:snapshot.datasets.length,snapshot_at:snapshot.retrieved_at},credentials:{data_gov_sg:Boolean(process.env.DATA_GOV_SG_API_KEY),lta:Boolean(process.env.LTA_ACCOUNT_KEY),onemap:Boolean(process.env.ONEMAP_TOKEN)},limits:config,cache:http.cacheStats()}}));
  addTool(server, 'singapore_get_sources', 'List connected official data sources, documentation and API key requirements. This server reads public information; no account mutation tools.', {}, () => ({ data: sources }));
  addTool(server, 'singapore_find_relevant_tools', 'Route a question in French or English to tools and datasets. Deterministic keyword matching; suggestions are not evidence or computed facts. Search catalog with English keywords.', { question: z.string().min(1).max(1000), limit: limitSchema }, ({ question, limit }) => {
    const matches = routeQuestion(question);
    const tools = [...new Set(matches.flatMap(m => m.tools))];
    const datasets = [...new Map(matches.flatMap(m => searchCatalog(m.search).slice(0,3)).map(d => [d.dataset_id,d])).values()];
    return { data: { tools: (tools.length ? tools : ['singapore_search_catalog','singapore_search_statistics']).slice(0,limit), suggested_catalog_queries: [...new Set(matches.map(m => m.search))], datasets: datasets.slice(0,limit), workflow: ['Discover a dataset or statistics table', 'Inspect metadata, field names, dates and units', 'Query with filters and pagination', 'Cite source_url and upstream update/observation dates'] } };
  });
}
