import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv';

const root = new URL('../', import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const escapeText = value => String(value ?? '').replace(/\s+/g, ' ').trim().replace(/[\\`*_{}\[\]<>|#]/g, '\\$&');
const jsonBlock = value => '```json\n' + JSON.stringify(value, null, 2) + '\n```';

export async function loadGuides() {
  const [catalog, selection, curated] = await Promise.all([
    readJson('data/catalog.json'), readJson('data/guide-datasets.json'), readJson('data/curated.json'),
  ]);
  const byId = new Map(catalog.datasets.map(dataset => [dataset.dataset_id, dataset]));
  if (new Set(selection.dataset_ids).size !== selection.dataset_ids.length) throw Error('Duplicate guide dataset ID');
  const datasets = selection.dataset_ids.map(id => {
    if (!/^d_[a-f0-9]{32}$/.test(id) || !byId.has(id)) throw Error(`Guide dataset missing from catalog: ${id}`);
    return byId.get(id);
  });
  return { catalog, datasets, curated };
}

export function renderGuide(dataset, catalog, curated) {
  const id = dataset.dataset_id;
  const specialized = curated.find(item => item.dataset_id === id);
  const tabular = dataset.format === 'CSV';
  const lines = [
    `# ${escapeText(dataset.title)}`, '',
    '[Browse dataset guides](README.md) · [Server setup](../../README.md#install-from-source)', '',
    `Official dataset: [data.gov.sg](https://data.gov.sg/datasets/${id}/view).`, '',
    '| Catalog field | Snapshot value |', '|---|---|',
    `| Dataset ID | \`${id}\` |`,
    ...[['Publishing agency', dataset.agency], ['Format', dataset.format], ['Status', dataset.status],
      ['Provider update timestamp', dataset.updated_at], ['Coverage start', dataset.coverage_start],
      ['Coverage end', dataset.coverage_end]].map(([label, value]) => `| ${label} | ${escapeText(value || 'Not supplied')} |`),
    `| Catalog retrieved at | ${escapeText(catalog.retrieved_at)} |`, '',
    'These values describe the bundled catalog snapshot. Inspect live metadata before relying on coverage, availability, field names, or freshness. A recent update timestamp can refer to a revision of historical data.', '',
  ];
  if (dataset.description) {
    const text = dataset.description.replace(/\s+/g, ' ').trim();
    lines.push('## Publisher description', '', escapeText(text.slice(0, 1200)) + (text.length > 1200 ? '…' : ''), '',
      'Description excerpt from the bundled provider metadata; consult the official dataset for complete definitions, footnotes, and terms.', '');
  }
  lines.push('## Inspect before querying', '',
    'MCP tool call (tool name and arguments):', '',
    jsonBlock({ name: 'singapore_inspect_dataset', arguments: { dataset_id: id, fields_limit: 50, fields_offset: 0 } }), '',
    'Read the returned field identifiers, units, missing-value conventions, and coverage. If more fields are available, follow the returned pagination. Use the returned column names when constructing filters or projections.', '');
  if (tabular) {
    lines.push('## Request a small sample', '',
      'For datasets supported by the provider datastore, start with a bounded page:', '',
      jsonBlock({ name: 'singapore_query_dataset', arguments: { dataset_id: id, limit: 5, offset: 0 } }), '',
      'Inspect the response pagination before requesting another page. A sample is not a full dataset summary. CSV format alone does not guarantee datastore availability; use an export if the provider rejects record queries.', '');
  }
  if (specialized) {
    lines.push('## Specialized tool', '',
      `This dataset also has the \`singapore_query_${specialized.key}\` tool in the ${escapeText(specialized.topic)} topic. It accepts the same query options without a dataset ID:`, '',
      jsonBlock({ name: `singapore_query_${specialized.key}`, arguments: { limit: 5, offset: 0 } }), '');
  }
  lines.push('## Export workflow', '',
    ...(tabular ? ['Use an export when the datastore is unavailable or a complete offline analysis is needed.', ''] :
      [`The snapshot advertises ${escapeText(dataset.format || 'an unspecified format')}. Inspect metadata and use the provider export workflow; do not assume tabular query support.`, '']),
    jsonBlock({ name: 'singapore_download_dataset', arguments: { dataset_id: id, action: 'initiate' } }), '',
    'If the result is pending, poll on a later call:', '',
    jsonBlock({ name: 'singapore_download_dataset', arguments: { dataset_id: id, action: 'poll' } }), '',
    'Wait for a ready result before using its download URL. URLs may expire. The tool returns export status and a URL; it does not load the entire exported file into the conversation. Provider availability and quota limits still apply.', '',
    '## Suggested request', '',
    `> Inspect dataset ${id} (${escapeText(dataset.title)}). Explain its coverage, publisher definitions, and available fields.${tabular ? ' Retrieve five sample records if datastore access is supported.' : ' Explain the available export format.'} Cite the source and distinguish historical observations from current conditions.`, '',
    '## Interpretation', '',
    '- Preserve provider units and missing values; do not interpret missing observations as zero.',
    '- Check definitions and population coverage before comparing this dataset with another series.',
    '- Attribute the publishing agency and retain source URLs and observation dates in any analysis.',
    '- This guide contains metadata and request examples. Live record access and export completion have not been verified by generating this page.', '',
  );
  return lines.join('\n');
}

export function renderIndex(datasets, catalog) {
  const groups = new Map();
  for (const dataset of datasets) {
    const agency = dataset.agency || 'Unspecified agency';
    if (!groups.has(agency)) groups.set(agency, []);
    groups.get(agency).push(dataset);
  }
  const lines = ['# Dataset reference library', '',
    `${datasets.length} dataset guides across ${groups.size} publishing agencies. Catalog snapshot: ${catalog.retrieved_at}.`, '',
    'Each guide links to an official dataset, preserves snapshot coverage and publisher notes, and supplies MCP inspection and export examples. CSV guides also explain bounded record queries; specialized tools are identified when available.', '',
    'Use your browser’s find command to search titles or agencies below. This selection includes every specialized dataset and then rotates through agencies to broaden discovery. It is not a ranking of data quality or a claim of complete coverage. Search all datasets with `singapore_search_catalog`.', '',
    'Metadata comes from [the bundled catalog](../../data/catalog.json). Examples require a configured [MCP server](../../README.md#install-from-source). Guides are generated locally; generation does not verify live records or exports.', '',
    '## Agencies', '',
    ...[...groups.keys()].sort().map(agency => `- ${escapeText(agency)} (${groups.get(agency).length})`), '',
  ];
  for (const agency of [...groups.keys()].sort()) {
    lines.push(`## ${escapeText(agency)}`, '', '| Dataset | Format | Coverage end |', '|---|---|---|');
    for (const dataset of groups.get(agency).sort((a, b) => a.title.localeCompare(b.title, 'en') || a.dataset_id.localeCompare(b.dataset_id, 'en'))) {
      lines.push(`| [${escapeText(dataset.title)}](${dataset.dataset_id}.md) | ${escapeText(dataset.format || 'Unknown')} | ${escapeText(dataset.coverage_end || 'Not supplied')} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

export function validateExamples(content, tools) {
  const provider = new AjvJsonSchemaValidator();
  const validators = new Map();
  let count = 0;
  for (const match of content.matchAll(/```json\n([\s\S]*?)\n```/g)) {
    const call = JSON.parse(match[1]);
    const tool = tools.find(item => item.name === call.name);
    if (!tool) throw Error(`Unknown example tool: ${call.name}`);
    if (!validators.has(call.name)) validators.set(call.name, provider.getValidator(tool.inputSchema));
    const result = validators.get(call.name)(call.arguments);
    if (!result.valid) throw Error(`Invalid ${call.name} example: ${result.errorMessage}`);
    count++;
  }
  return count;
}

async function main() {
  const { catalog, datasets, curated } = await loadGuides();
  const { tools } = await readJson('data/tool-manifest.json');
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const idPosition = args.indexOf('--dataset');
  const id = idPosition < 0 ? undefined : args[idPosition + 1];
  if (idPosition >= 0 && (!id || !datasets.some(dataset => dataset.dataset_id === id))) throw Error('Unknown or missing --dataset ID');
  const outputs = datasets.filter(dataset => !id || dataset.dataset_id === id).map(dataset => [
    `${dataset.dataset_id}.md`, renderGuide(dataset, catalog, curated),
  ]);
  if (!id) outputs.push(['README.md', renderIndex(datasets, catalog)]);
  let examples = 0;
  for (const [, content] of outputs) examples += validateExamples(content, tools);
  const folder = new URL('docs/datasets/', root);
  if (!check) await mkdir(folder, { recursive: true });
  for (const [path, content] of outputs) {
    const target = new URL(path, folder);
    if (check) {
      if (await readFile(target, 'utf8') !== content) throw Error(`Dataset guide is stale: ${path}`);
    } else await writeFile(target, content);
  }
  if (check && !id) {
    const expected = new Set(outputs.map(([path]) => path));
    for (const path of await readdir(folder)) if (!expected.has(path)) throw Error(`Unexpected guide file: ${path}; review and use trash if obsolete`);
  }
  console.log(`${check ? 'Checked' : 'Generated'} ${outputs.length} dataset reference files; validated ${examples} MCP examples`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(new URL(process.argv[1], 'file:///'))) {
  await main();
}
