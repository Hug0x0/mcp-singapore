# Maintenance

`npm run refresh:catalog` starts a fresh collection of all catalog pages. Changed pagination, duplicate IDs, an empty catalog, a missing specialized dataset, or a removed required field causes failure before replacing the valid index. A dataset-count change above 10% requires review and the explicit `--accept-large-change` option. Temporary errors respect Retry-After up to 60 seconds, with at most three attempts per request. Resume a moving catalog by restarting collection rather than trusting an old page offset.

The script writes a change report, updates specialized dataset metadata, and regenerates documented counts and tools. `npm run check:schema` checks reference fields without changing files. Changes to `data/schema-expectations.json` require reviewing the affected tool mappings.

Catalog refresh and provider verification workflows are manual. Catalog refresh proposes a reviewable pull request without merging it. The repository must allow pull requests created by GitHub Actions. Provider verification supports core/all/auth and stores its report as an artifact. Optional credentials are configured as repository Actions secrets; missing credentials produce an explicit skipped status, not a claim of authenticated verification.

After compiling, `npm run docs:generate` generates the README summary, COVERAGE.md, and data/tool-manifest.json from the actual MCP registrations. It also regenerates the dataset reference library in docs/datasets/. `npm run docs:check` rejects generated-file drift. Repository documentation, generated text, examples, issue templates, and maintainer-authored issue content use English.

Verification reports distinguish pass, fail, skipped, and pending. A pending export does not prove a completed export cycle. Reports retain non-sensitive test arguments; credentials are never tool arguments.

## Dataset reference library

`data/guide-datasets.json` pins 288 dataset IDs. The initial selection contains all specialized datasets, followed by an agency rotation across the bundled catalog to cover all 74 publishers. This is a discovery aid, not a quality ranking. IDs are pinned so catalog refreshes do not silently replace guide subjects.

`npm run docs:datasets` regenerates all guide pages and their agency index from the bundled catalog. Use `npm run docs:datasets -- --dataset d_8b84c4ee58e3cfc0ece0d773c8ca6abc` to regenerate a single guide. `npm run docs:check` checks exact generated content, unexpected files, unique and valid IDs, and every JSON example against the tool manifest input schemas. Generation uses local metadata and makes no live provider requests.

When a selected ID disappears during a catalog refresh, review its official replacement before updating the pinned list. Move obsolete guide files with `trash`, regenerate, and review the resulting diff. Keep missing coverage dates explicit. The refresh workflow stages generated guides alongside the updated snapshot. Descriptions are bounded publisher excerpts; official pages remain the authority for complete footnotes and licensing terms.
