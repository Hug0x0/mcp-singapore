import test from 'node:test';
import assert from 'node:assert/strict';
import { snapshot } from '../src/clients/datagov.js';
import { curated } from '../src/modules/curated.js';
import { searchCatalog } from '../src/modules/catalog.js';
import { routeQuestion } from '../src/modules/discovery.js';
import { sliceTable } from '../src/modules/statistics.js';
import { distanceKm } from '../src/modules/transport.js';
import { datasetId, dateSchema } from '../src/tools.js';
import type { SingStatData } from '../src/types.js';
test('catalog and curated IDs are unique, valid and traceable', () => {
  assert.ok(snapshot.datasets.length > 4000);
  assert.equal(new Set(snapshot.datasets.map(d => d.dataset_id)).size, snapshot.datasets.length);
  for (const dataset of snapshot.datasets) assert.ok(datasetId.safeParse(dataset.dataset_id).success);
  for (const dataset of curated) { assert.ok(snapshot.datasets.some(d => d.dataset_id === dataset.dataset_id)); assert.equal(dataset.format, 'CSV'); }
  assert.equal(new Set(curated.map(d => d.key)).size, curated.length);
  assert.ok(Number.isFinite(Date.parse(snapshot.retrieved_at)));
});
test('catalog searches all keywords, publisher and format', () => {
  assert.ok(searchCatalog('resale flat prices').some(d => d.dataset_id === 'd_8b84c4ee58e3cfc0ece0d773c8ca6abc'));
  const results = searchCatalog('', 'Education', 'CSV'); assert.ok(results.length > 0);
  assert.ok(results.every(d => d.agency?.includes('Education') && d.format === 'CSV'));
});
test('routes English weather and housing questions', () => {
  assert.ok(routeQuestion('What is the weather in Singapore?').flatMap(r => r.tools).includes('singapore_get_forecast_2h'));
  assert.ok(routeQuestion('Compare HDB resale prices').flatMap(r => r.tools).includes('singapore_query_hdb_resale'));
  assert.equal(routeQuestion('xyzzy').length, 0);
});
test('table slicing retains units, footnotes, null markers and pagination', () => {
  const table: SingStatData = { id:'M1',title:'Test',frequency:'Annual',dataLastUpdated:'01/01/2026', row:[{seriesNo:'1',rowText:'Population',uoM:'Number',footnote:'Residents only',columns:[{key:'2023',value:'12'},{key:'2024',value:'na'},{key:'2025',value:'14'}]},{seriesNo:'2',rowText:'Other',uoM:'%',columns:[]}] };
  const result = sliceTable(table, undefined, 0, 1, 2);
  assert.equal(result.next_series_offset, 1); assert.equal(result.row[0].omitted_periods,1);
  assert.deepEqual(result.row[0].columns,[{key:'2024',value:'na'},{key:'2025',value:'14'}]); assert.equal(result.row[0].footnote,'Residents only');
});
test('distance uses longitude/latitude consistently', () => {
  assert.equal(distanceKm(1.3,103.8,1.3,103.8),0);
  assert.ok(Math.abs(distanceKm(1.3,103.8,1.31,103.8)-1.112)<0.01);
});
test('validates dates and forbids endpoint path injection', () => {
  assert.ok(dateSchema.safeParse('2026-10-21T12:00:00').success);
  assert.equal(dateSchema.safeParse('2026-99-99').success,false);
  assert.equal(dateSchema.safeParse('2026-02-30').success,false);
  assert.equal(datasetId.safeParse('../../secret').success,false);
});
