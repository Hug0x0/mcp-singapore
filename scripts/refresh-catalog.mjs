import { writeFile, rename } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
const target = new URL('../data/catalog.json', import.meta.url);
const datasets = new Map();
let pages = 1;
for (let page = 1; page <= pages; page++) {
  const url = `https://api-production.data.gov.sg/v2/public/api/datasets?page=${page}`;
  let body;
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, { headers: process.env.DATA_GOV_SG_API_KEY ? { 'x-api-key': process.env.DATA_GOV_SG_API_KEY } : {}, signal: AbortSignal.timeout(30000) });
    if ((response.status === 429 || response.status >= 500) && attempt < 2) { await delay(10000); continue; }
    if (!response.ok) throw new Error(`Catalog page ${page}: HTTP ${response.status}`);
    body = await response.json();
    if (body.code !== 0 || !Array.isArray(body.data?.datasets)) throw new Error(`Invalid catalog response on page ${page}`);
    break;
  }
  pages = body.data.pages;
  for (const d of body.data.datasets) datasets.set(d.datasetId, { dataset_id: d.datasetId, title: d.name, description: d.description, agency: d.managedByAgencyName, format: d.format, updated_at: d.lastUpdatedAt, coverage_start: d.coverageStart, coverage_end: d.coverageEnd, status: d.status });
  if (page % 50 === 0 || page === pages) console.error(`Catalog: ${page}/${pages} pages, ${datasets.size} datasets`);
  if (page < pages) await delay(250);
}
const snapshot = { retrieved_at: new Date().toISOString(), source: 'https://api-production.data.gov.sg/v2/public/api/datasets', pages, datasets: [...datasets.values()] };
await writeFile(new URL('catalog.json.tmp', target), JSON.stringify(snapshot, null, 2) + '\n');
await rename(new URL('catalog.json.tmp', target), target);
console.error(`Saved ${datasets.size} datasets to ${target.pathname}`);
